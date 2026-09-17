"use strict";

const pino = require("pino");

const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers.Authorization",
  'req.headers["x-csrf-token"]',
  'req.headers["x-goog-authuser"]',
  "res.headers['set-cookie']",
  "credential",
  "OPENAI_API_KEY",
  "idToken",
  "id_token",
  "access_token",
  "refresh_token",
  "apiKey",
  "api_key",
  "openaiApiKey",
  "prompt",
  "*.cookie",
  "*.cookies",
  "*.authorization",
  "*.credential",
  "*.idToken",
  "*.id_token",
  "*.access_token",
  "*.refresh_token",
  "*.session",
  "*.sessionID",
  "*.sessionId",
  "*.password",
  "*.apiKey",
  "*.api_key",
  "*.OPENAI_API_KEY",
  "*.openaiApiKey",
  "*.prompt",
  "*.messages",
  "*.input",
];

function createLogger(level = "info") {
  return pino({
    level,
    redact: {
      paths: REDACT_PATHS,
      censor: "[Redacted]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

module.exports = { createLogger, REDACT_PATHS };
