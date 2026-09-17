"use strict";

const { unauthorized, forbidden } = require("../utils/errors");

function requireAuth(req, _res, next) {
  if (!req.session?.userId) {
    return next(unauthorized());
  }
  if (!req.currentUser || req.currentUser.account_status !== "active") {
    return next(unauthorized("This account is not active"));
  }
  return next();
}

function requireAdmin(req, _res, next) {
  if (!req.session?.userId) {
    return next(unauthorized());
  }
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return next(forbidden("Administrator access required"));
  }
  return next();
}

function attachUser(usersRepo) {
  return async function attachCurrentUser(req, _res, next) {
    try {
      if (!req.session?.userId) {
        req.currentUser = null;
        return next();
      }
      const user = await usersRepo.findById(req.session.userId);
      if (!user || user.account_status === "deleted") {
        req.session.destroy(() => {});
        req.currentUser = null;
        return next();
      }
      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requireAuth, requireAdmin, attachUser };
