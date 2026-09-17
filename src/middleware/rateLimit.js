"use strict";

const rateLimit = require("express-rate-limit");

function skipHealth(req) {
  return req.path === "/healthz" || req.path === "/readyz";
}

function createRateLimiters() {
  const windowMs = 15 * 60 * 1000;
  return {
    global: rateLimit({
      windowMs,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      skip: skipHealth,
    }),
    auth: rateLimit({
      windowMs,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    ai: rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    admin: rateLimit({
      windowMs,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    destructive: rateLimit({
      windowMs,
      limit: 8,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  };
}

module.exports = { createRateLimiters };
