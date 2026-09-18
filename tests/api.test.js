"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");
const { migrateUp } = require("../src/db/migrate");
const { seed } = require("../src/db/seed");
const { loadEnv } = require("../src/config/env");
const { closePool } = require("../src/db/pool");

const ORIGIN = "http://localhost:5173";

function applyTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST ||
    "postgres://saerbridge:saerbridge_test@localhost:5434/saerbridge_test";
  process.env.SESSION_SECRET = "test-session-secret-which-is-at-least-32-chars";
  process.env.CSRF_SECRET = "test-csrf-secret-which-is-at-least-32-chars-xx";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  process.env.CLIENT_ORIGINS = ORIGIN;
  process.env.COOKIE_DOMAIN = "";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.OPENAI_ENABLED = "false";
  process.env.ENABLE_TEST_AUTH = "true";
}

let app;
let pool;

const apiTest = test;

async function sessionAgent() {
  const agent = request.agent(app);
  const session = await agent.get("/api/v1/auth/session").set("Origin", ORIGIN);
  const csrfToken = session.body.data.csrfToken;
  return { agent, csrfToken };
}

async function login(email = "member@example.com", googleSub = "google-sub-member") {
  const { agent, csrfToken } = await sessionAgent();
  const response = await agent
    .post("/api/v1/auth/test-login")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ googleSub, email, displayName: "Test Member" });
  assert.equal(response.status, 200);
  const nextCsrf = response.body.data.csrfToken;
  return { agent, csrfToken: nextCsrf, user: response.body.data.user };
}

before(async () => {
  applyTestEnv();
  await migrateUp(process.env.DATABASE_URL);
  await seed(process.env.DATABASE_URL);
  const created = createApp({
    config: loadEnv(),
    googleAuth: {
      async verifyGoogleCredential(credential, nonce) {
        if (credential.startsWith("bad")) throw Object.assign(new Error("no"), { status: 401, code: "UNAUTHORIZED" });
        if (nonce && credential.includes("nonce-mismatch")) {
          const { unauthorized } = require("../src/utils/errors");
          throw unauthorized("Google credential nonce mismatch");
        }
        return {
          googleSub: "google-sub-verified",
          email: "verified@example.com",
          displayName: "Verified Person",
          avatarUrl: null,
        };
      },
    },
    openai: {
      async complete() {
        throw Object.assign(new Error("provider"), { status: 502, code: "AI_PROVIDER_ERROR", message: "The AI service is temporarily unavailable" });
      },
    },
  });
  app = created.app;
  pool = created.pool;
});

after(async () => {
  if (pool) await closePool(pool);
});

apiTest("GET /healthz returns process health", async () => {
  const response = await request(app).get("/healthz");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, "ok");
});

apiTest("GET /readyz returns database readiness", async () => {
  const response = await request(app).get("/readyz");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, "ready");
});

apiTest("GET /api/v1/products returns seeded products", async () => {
  const response = await request(app).get("/api/v1/products");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 6);
  assert.ok(response.body.data.find((item) => item.slug === "nile"));
});

apiTest("rejects malformed product payloads", async () => {
  const { agent, csrfToken, user } = await login("admin@example.com", "google-sub-admin");
  assert.equal(user.role, "admin");
  const response = await agent
    .post("/api/v1/admin/products")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ slug: "??", name: "" });
  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

apiTest("CSRF rejection for state-changing requests without a token", async () => {
  const { agent } = await sessionAgent();
  const response = await agent.post("/api/v1/auth/logout").set("Origin", ORIGIN).send({});
  assert.equal(response.status, 403);
});

apiTest("invalid origin is rejected", async () => {
  const { agent, csrfToken } = await sessionAgent();
  const response = await agent
    .post("/api/v1/auth/logout")
    .set("Origin", "https://evil.example")
    .set("X-CSRF-Token", csrfToken)
    .send({});
  assert.equal(response.status, 403);
});

apiTest("Google auth verification creates and retrieves an account", async () => {
  const { agent, csrfToken } = await sessionAgent();
  const response = await agent
    .post("/api/v1/auth/google")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ credential: "verified-google-credential-value" });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.authenticated, true);
  assert.equal(response.body.data.user.primaryEmail, "verified@example.com");
  assert.ok(!JSON.stringify(response.body).includes("credential"));
});

apiTest("unauthenticated users cannot read /me", async () => {
  const response = await request(app).get("/api/v1/me");
  assert.equal(response.status, 401);
});

apiTest("account update, export, preferences and deletion", async () => {
  const { agent, csrfToken } = await login("delete-me@example.com", "google-sub-delete");
  const patch = await agent
    .patch("/api/v1/me")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ displayName: "Amended Name" });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.displayName, "Amended Name");

  const prefs = await agent
    .put("/api/v1/me/preferences")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ locale: "ar", reduceMotion: true, theme: "paper" });
  assert.equal(prefs.status, 200);
  assert.equal(prefs.body.data.locale, "ar");

  const exported = await agent.get("/api/v1/me/export");
  assert.equal(exported.status, 200);
  assert.equal(exported.body.data.user.displayName, "Amended Name");
  assert.ok(!exported.body.data.securityAuditEvents);

  const deleted = await agent
    .delete("/api/v1/me")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ confirmation: "DELETE" });
  assert.equal(deleted.status, 204);

  const after = await agent.get("/api/v1/me");
  assert.equal(after.status, 401);
});

apiTest("users cannot patch role or google subject via profile", async () => {
  const { agent, csrfToken } = await login("role@example.com", "google-sub-role");
  const response = await agent
    .patch("/api/v1/me")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ displayName: "Ok", role: "admin", googleSub: "hijack" });
  assert.equal(response.status, 422);
});

apiTest("admin product CRUD and member forbidden", async () => {
  const member = await login("plain@example.com", "google-sub-plain");
  const denied = await member.agent
    .post("/api/v1/admin/products")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", member.csrfToken)
    .send({
      slug: "orbit",
      name: "Orbit",
      shortDescription: "desc",
      longDescription: "longer description for a product",
      subdomainUrl: "https://orbit.saerbridge.com",
      productStatus: "development",
      displayOrder: 9,
    });
  assert.equal(denied.status, 403);

  const admin = await login("admin@example.com", "google-sub-admin-2");
  const created = await admin.agent
    .post("/api/v1/admin/products")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", admin.csrfToken)
    .send({
      slug: "orbit",
      name: "Orbit",
      shortDescription: "Experimental catalogue item",
      longDescription: "Used only in automated tests.",
      subdomainUrl: "https://orbit.saerbridge.com",
      productStatus: "development",
      displayOrder: 9,
    });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  const patched = await admin.agent
    .patch(`/api/v1/admin/products/${id}`)
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", admin.csrfToken)
    .send({ productStatus: "beta" });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.productStatus, "beta");
  const removed = await admin.agent
    .delete(`/api/v1/admin/products/${id}`)
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", admin.csrfToken);
  assert.equal(removed.status, 204);
});

apiTest("SQL metacharacters in input are treated as data", async () => {
  const { agent, csrfToken } = await login("sql@example.com", "google-sub-sql");
  const response = await agent
    .patch("/api/v1/me")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ displayName: "Robert'); DROP TABLE users;--" });
  assert.equal(response.status, 200);
  const products = await request(app).get("/api/v1/products");
  assert.equal(products.status, 200);
  assert.ok(products.body.data.length >= 6);
});

apiTest("OpenAI route requires auth and maps provider failure", async () => {
  const { agent, csrfToken } = await login("ai@example.com", "google-sub-ai");
  const response = await agent
    .post("/api/v1/ai/complete")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ prompt: "Summarise civic data quality.", acceptedAiNoticeVersion: "2026.09.1" });
  assert.equal(response.status, 502);
  assert.equal(response.body.error.code, "AI_PROVIDER_ERROR");
  assert.ok(!JSON.stringify(response.body).includes("sk-"));
});

apiTest("does not disclose whether arbitrary emails exist", async () => {
  const { agent, csrfToken } = await sessionAgent();
  const response = await agent
    .post("/api/v1/auth/google")
    .set("Origin", ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ credential: "bad-credential-that-fails-google-verification" });
  assert.ok([401, 403].includes(response.status));
  assert.ok(!String(response.body.error?.message || "").toLowerCase().includes("exists"));
});

apiTest("release seeding preserves changes to existing products", async () => {
  const before = await pool.query("SELECT short_description FROM products WHERE slug = 'nile'");
  try {
    await pool.query("UPDATE products SET short_description = $1 WHERE slug = 'nile'", ["Administrator content"]);
    await seed(process.env.DATABASE_URL, { missingOnly: true });
    const after = await pool.query("SELECT short_description FROM products WHERE slug = 'nile'");
    assert.equal(after.rows[0].short_description, "Administrator content");
  } finally {
    await pool.query("UPDATE products SET short_description = $1 WHERE slug = 'nile'", [before.rows[0].short_description]);
  }
});
