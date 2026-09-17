"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Writable } = require("node:stream");
const pino = require("pino");
const { REDACT_PATHS } = require("../src/utils/logger");

test("logger redacts credentials, cookies and API keys", async () => {
  let output = "";
  const stream = new Writable({
    write(chunk, _enc, cb) {
      output += chunk.toString();
      cb();
    },
  });
  const logger = pino({ level: "info", redact: { paths: REDACT_PATHS, censor: "[Redacted]" } }, stream);
  logger.info({
    credential: "google-id-token-value",
    OPENAI_API_KEY: "sk-secret-should-not-appear",
    req: { headers: { cookie: "saerbridge.sid=abc", authorization: "Bearer xyz" } },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.doesNotMatch(output, /google-id-token-value/);
  assert.doesNotMatch(output, /sk-secret-should-not-appear/);
  assert.doesNotMatch(output, /saerbridge\.sid=abc/);
  assert.doesNotMatch(output, /Bearer xyz/);
  assert.match(output, /Redacted/);
});
