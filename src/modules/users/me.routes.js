"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { validate } = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const { sendOk, sendNoContent } = require("../../utils/http");
const { notFound } = require("../../utils/errors");
const { publicUser } = require("./usersRepo");
const { legalConfig } = require("../../config/legal");
const {
  profilePatchBody,
  preferencesBody,
  onboardingBody,
  deleteAccountBody,
} = require("../schemas");

function createMeRouter({ usersRepo, audit, rateLimiters }) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    wrap(async (req, res) => {
      sendOk(res, publicUser(req.currentUser));
    })
  );

  router.patch(
    "/",
    requireAuth,
    validate({ body: profilePatchBody }),
    wrap(async (req, res) => {
      const user = await usersRepo.updateProfile(req.currentUser.id, {
        displayName: req.body.displayName,
      });
      await audit.record(req, "account.profile.update");
      sendOk(res, publicUser(user));
    })
  );

  router.get(
    "/export",
    requireAuth,
    wrap(async (req, res) => {
      const data = await usersRepo.exportAccount(req.currentUser.id);
      await audit.record(req, "account.export");
      sendOk(res, data);
    })
  );

  router.delete(
    "/",
    requireAuth,
    rateLimiters.destructive,
    validate({ body: deleteAccountBody }),
    wrap(async (req, res) => {
      await usersRepo.deleteAccount(req.currentUser.id);
      await audit.record(req, "account.delete");
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
      sendNoContent(res);
    })
  );

  router.get(
    "/preferences",
    requireAuth,
    wrap(async (req, res) => {
      const preferences = await usersRepo.getPreferences(req.currentUser.id);
      if (!preferences) throw notFound("Preferences not found");
      sendOk(res, {
        locale: preferences.locale,
        reduceMotion: preferences.reduce_motion,
        theme: preferences.theme,
        updatedAt: preferences.updated_at,
      });
    })
  );

  router.put(
    "/preferences",
    requireAuth,
    validate({ body: preferencesBody }),
    wrap(async (req, res) => {
      const preferences = await usersRepo.upsertPreferences(req.currentUser.id, {
        locale: req.body.locale,
        reduceMotion: req.body.reduceMotion,
        theme: req.body.theme,
      });
      await audit.record(req, "account.preferences.update", { locale: req.body.locale });
      sendOk(res, {
        locale: preferences.locale,
        reduceMotion: preferences.reduce_motion,
        theme: preferences.theme,
        updatedAt: preferences.updated_at,
      });
    })
  );

  router.get(
    "/acceptances",
    requireAuth,
    wrap(async (req, res) => {
      const acceptances = await usersRepo.listAcceptances(req.currentUser.id);
      sendOk(res, acceptances);
    })
  );

  router.post(
    "/onboarding",
    requireAuth,
    validate({ body: onboardingBody }),
    wrap(async (req, res) => {
      await usersRepo.recordAcceptance(req.currentUser.id, {
        documentType: "terms",
        documentVersion: req.body.acceptedTermsVersion,
        acceptanceKind: "contract",
      });
      await usersRepo.recordAcceptance(req.currentUser.id, {
        documentType: "privacy",
        documentVersion: req.body.acknowledgedPrivacyVersion,
        acceptanceKind: "acknowledgement",
      });
      await usersRepo.recordAcceptance(req.currentUser.id, {
        documentType: "age_confirmation",
        documentVersion: "v1-18plus",
        acceptanceKind: "acknowledgement",
      });
      const user = await usersRepo.completeOnboarding(req.currentUser.id, {
        locale: req.body.locale,
      });
      await audit.record(req, "account.onboarding.complete", {
        terms: req.body.acceptedTermsVersion,
        privacy: req.body.acknowledgedPrivacyVersion,
      });
      sendOk(res, {
        user: publicUser(user),
        requiredVersions: {
          terms: legalConfig.termsVersion,
          privacy: legalConfig.privacyPolicyVersion,
        },
      });
    })
  );

  return router;
}

module.exports = { createMeRouter };
