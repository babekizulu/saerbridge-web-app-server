"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadEnv } = require("../src/config/env");

function withEnv(vars, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://saerbridge:saerbridge_test@localhost:5434/saerbridge_test",
  SESSION_SECRET: "test-session-secret-which-is-at-least-32-chars",
  CSRF_SECRET: "test-csrf-secret-which-is-at-least-32-chars-xx",
  GOOGLE_CLIENT_ID: "test-google-client-id.apps.googleusercontent.com",
  CLIENT_ORIGINS: "http://localhost:5173",
  ENABLE_TEST_AUTH: "true",
};

test("loadEnv accepts a valid test configuration", () => {
  withEnv(base, () => {
    const config = loadEnv();
    assert.equal(config.isTest, true);
    assert.equal(config.enableTestAuth, true);
    assert.deepEqual(config.clientOrigins, ["http://localhost:5173"]);
  });
});

test("loadEnv refuses ENABLE_TEST_AUTH in production", () => {
  withEnv(
    {
      ...base,
      NODE_ENV: "production",
      COOKIE_DOMAIN: ".saerbridge.com",
      CLIENT_ORIGINS: "https://saerbridge.com",
      ENABLE_TEST_AUTH: "true",
    },
    () => {
      assert.throws(() => loadEnv(), /ENABLE_TEST_AUTH/);
    }
  );
});

test("loadEnv requires OPENAI_API_KEY when OpenAI is enabled", () => {
  withEnv({ ...base, OPENAI_ENABLED: "true", OPENAI_API_KEY: "" }, () => {
    assert.throws(() => loadEnv(), /OPENAI_API_KEY/);
  });
});
