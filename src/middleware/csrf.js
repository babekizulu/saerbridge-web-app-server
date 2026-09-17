"use strict";

const { csrfSync } = require("csrf-sync");

function createCsrf(config) {
  const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) => req.headers["x-csrf-token"] || req.body?._csrf,
    getTokenFromState: (req) => req.session?.csrfToken,
    storeTokenInState: (req, token) => {
      if (req.session) req.session.csrfToken = token;
    },
    size: 32,
    skipCsrfProtection: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
  });

  function issueCsrfToken(req) {
    return generateToken(req, true);
  }

  return {
    csrfProtection: csrfSynchronisedProtection,
    issueCsrfToken,
    ignored: config.isTest,
  };
}

module.exports = { createCsrf };
