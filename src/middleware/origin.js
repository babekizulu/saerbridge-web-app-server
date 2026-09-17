"use strict";

const { forbidden } = require("../utils/errors");

function originGuard(allowedOrigins) {
  const allow = new Set(allowedOrigins);
  return function validateOrigin(req, res, next) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }
    const origin = req.headers.origin;
    if (!origin || !allow.has(origin)) {
      return next(forbidden("Request origin is not allowed"));
    }
    return next();
  };
}

function corsOptions(allowedOrigins) {
  const allow = new Set(allowedOrigins);
  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, false);
      }
      if (allow.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    maxAge: 600,
  };
}

module.exports = { originGuard, corsOptions };
