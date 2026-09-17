"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { profilePatchBody, productCreateBody, onboardingBody } = require("../src/modules/schemas");

test("profile patch rejects role and google subject fields", () => {
  const result = profilePatchBody.safeParse({ displayName: "Ada", role: "admin", googleSub: "x" });
  assert.equal(result.success, false);
});

test("profile patch accepts a display name", () => {
  const result = profilePatchBody.parse({ displayName: "Ada Lovelace" });
  assert.equal(result.displayName, "Ada Lovelace");
});

test("product create rejects malformed slugs and unknown fields", () => {
  const result = productCreateBody.safeParse({
    slug: "??",
    name: "X",
    shortDescription: "short",
    longDescription: "long enough",
    subdomainUrl: "not-a-url",
    productStatus: "available",
    displayOrder: 1,
    extra: true,
  });
  assert.equal(result.success, false);
});

test("onboarding requires explicit adult confirmation and terms version", () => {
  const rejected = onboardingBody.safeParse({
    acceptedTermsVersion: "2026.09.1",
    acknowledgedPrivacyVersion: "2026.09.1",
    ageConfirmed: false,
  });
  assert.equal(rejected.success, false);
  const accepted = onboardingBody.parse({
    acceptedTermsVersion: "2026.09.1",
    acknowledgedPrivacyVersion: "2026.09.1",
    ageConfirmed: true,
    locale: "en-ZA",
  });
  assert.equal(accepted.ageConfirmed, true);
});
