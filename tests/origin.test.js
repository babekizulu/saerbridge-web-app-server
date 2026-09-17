"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { originGuard, corsOptions } = require("../src/middleware/origin");

const ALLOWED = ["http://localhost:5173", "https://saerbridge.com"];

test("origin guard allows listed origins on state-changing requests", () => {
  const middleware = originGuard(ALLOWED);
  let called = false;
  middleware(
    { method: "POST", headers: { origin: "http://localhost:5173" } },
    {},
    (err) => {
      assert.equal(err, undefined);
      called = true;
    }
  );
  assert.equal(called, true);
});

test("origin guard rejects unknown origins", () => {
  const middleware = originGuard(ALLOWED);
  middleware({ method: "PATCH", headers: { origin: "https://evil.example" } }, {}, (err) => {
    assert.equal(err.status, 403);
    assert.equal(err.code, "FORBIDDEN");
  });
});

test("origin guard ignores safe methods", () => {
  const middleware = originGuard(ALLOWED);
  let called = false;
  middleware({ method: "GET", headers: {} }, {}, () => {
    called = true;
  });
  assert.equal(called, true);
});

test("CORS callback refuses unlisted origins and never uses wildcard credentials", () => {
  const options = corsOptions(ALLOWED);
  options.origin("https://evil.example", (error, allow) => {
    assert.ok(error);
    assert.equal(allow, undefined);
  });
  options.origin("https://saerbridge.com", (error, allow) => {
    assert.equal(error, null);
    assert.equal(allow, true);
  });
  assert.equal(options.credentials, true);
});
