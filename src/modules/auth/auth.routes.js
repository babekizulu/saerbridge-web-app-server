"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { validate } = require("../../middleware/validate");
const { sendOk } = require("../../utils/http");
const { unauthorized } = require("../../utils/errors");
const { publicUser } = require("../users/usersRepo");
const { googleAuthBody, testLoginBody } = require("../schemas");
const { randomToken } = require("../../utils/crypto");

function createAuthRouter({
  config,
  usersRepo,
  googleAuth,
  audit,
  issueCsrfToken,
  rateLimiters,
}) {
  const router = Router();

  function publicSession(req) {
    const csrfToken = issueCsrfToken(req);
    if (!req.session.googleNonce) {
      req.session.googleNonce = randomToken(16);
    }
    return {
      authenticated: Boolean(req.currentUser && req.currentUser.account_status === "active"),
      user: publicUser(req.currentUser),
      csrfToken,
      googleNonce: req.session.googleNonce,
      googleClientId: config.googleClientId,
    };
  }

  async function establishAuthenticatedSession(req, userId) {
    const googleNonce = randomToken(16);
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.userId = userId;
        req.session.googleNonce = googleNonce;
        req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
      });
    });
  }

  router.get(
    "/session",
    wrap(async (req, res) => {
      sendOk(res, publicSession(req));
    })
  );

  router.get(
    "/csrf",
    wrap(async (req, res) => {
      sendOk(res, { csrfToken: issueCsrfToken(req) });
    })
  );

  router.post(
    "/google",
    rateLimiters.auth,
    validate({ body: googleAuthBody }),
    wrap(async (req, res) => {
      const identity = await googleAuth.verifyGoogleCredential(
        req.body.credential,
        req.session.googleNonce
      );
      if (!identity.email) {
        throw unauthorized("A verified Google email is required");
      }

      const isAdmin = config.adminEmails.includes(identity.email);
      let user = await usersRepo.findByGoogleSub(identity.googleSub);
      let created = false;

      if (!user) {
        user = await usersRepo.createFromGoogle({
          googleSub: identity.googleSub,
          email: identity.email,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          role: isAdmin ? "admin" : "member",
        });
        created = true;
      } else {
        const role = isAdmin ? "admin" : user.role === "admin" ? "admin" : "member";
        user = await usersRepo.touchLogin(user.id, {
          email: identity.email,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          role,
        });
      }

      await establishAuthenticatedSession(req, user.id);
      req.currentUser = await usersRepo.findById(user.id);
      await audit.record(req, created ? "auth.google.register" : "auth.google.login", {
        created,
      });
      sendOk(res, publicSession(req));
    })
  );

  router.post(
    "/logout",
    wrap(async (req, res) => {
      const userId = req.session?.userId || null;
      await audit.record(req, "auth.logout", { userId });
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
      res.clearCookie(config.isProduction ? "__Secure-saerbridge.sid" : "saerbridge.sid", {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "lax",
        domain: config.cookieDomain || undefined,
        path: "/",
      });
      sendOk(res, { authenticated: false, user: null });
    })
  );

  if (config.enableTestAuth) {
    router.post(
      "/test-login",
      validate({ body: testLoginBody }),
      wrap(async (req, res) => {
        const email = req.body.email.toLowerCase();
        const isAdmin = config.adminEmails.includes(email);
        let user = await usersRepo.findByGoogleSub(req.body.googleSub);
        if (!user) {
          user = await usersRepo.createFromGoogle({
            googleSub: req.body.googleSub,
            email,
            displayName: req.body.displayName || "Test member",
            avatarUrl: null,
            role: isAdmin ? "admin" : "member",
          });
        } else {
          user = await usersRepo.touchLogin(user.id, {
            email,
            displayName: req.body.displayName || user.display_name,
            avatarUrl: user.avatar_url,
            role: isAdmin ? "admin" : user.role,
          });
        }
        await establishAuthenticatedSession(req, user.id);
        req.currentUser = await usersRepo.findById(user.id);
        sendOk(res, publicSession(req));
      })
    );
  }

  return router;
}

module.exports = { createAuthRouter };
