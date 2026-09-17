"use strict";

const { z } = require("zod");
const { LOCALES } = require("./users/usersRepo");

const googleAuthBody = z
  .object({
    credential: z.string().min(20).max(10000),
  })
  .strict();

const profilePatchBody = z
  .object({
    displayName: z.string().trim().min(1).max(120),
  })
  .strict();

const preferencesBody = z
  .object({
    locale: z.enum(LOCALES),
    reduceMotion: z.boolean(),
    theme: z.enum(["system", "paper", "ink"]),
  })
  .strict();

const onboardingBody = z
  .object({
    acceptedTermsVersion: z.string().min(1).max(32),
    acknowledgedPrivacyVersion: z.string().min(1).max(32),
    ageConfirmed: z.literal(true),
    locale: z.enum(LOCALES).optional(),
  })
  .strict();

const deleteAccountBody = z
  .object({
    confirmation: z.literal("DELETE"),
  })
  .strict();

const dataRightsBody = z
  .object({
    requestType: z.enum(["access", "correction", "export", "deletion", "objection", "enquiry"]),
  })
  .strict();

const productCreateBody = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]{2,40}$/),
    name: z.string().trim().min(1).max(80),
    shortDescription: z.string().trim().min(1).max(280),
    longDescription: z.string().trim().min(1).max(4000),
    subdomainUrl: z.string().url().max(200),
    productStatus: z.enum(["available", "beta", "development"]),
    displayOrder: z.number().int().min(0).max(1000),
  })
  .strict();

const productPatchBody = productCreateBody.partial().strict();

const productSlugParams = z
  .object({
    slug: z.string().min(1).max(40),
  })
  .strict();

const productIdParams = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const aiCompleteBody = z
  .object({
    prompt: z.string().trim().min(1).max(4000),
    acceptedAiNoticeVersion: z.string().min(1).max(32),
  })
  .strict();

const adminRequestStatusBody = z
  .object({
    requestStatus: z.enum(["received", "in_progress", "completed", "rejected"]),
  })
  .strict();

const testLoginBody = z
  .object({
    googleSub: z.string().min(3).max(255),
    email: z.string().email().max(320),
    displayName: z.string().min(1).max(120).optional(),
  })
  .strict();

module.exports = {
  googleAuthBody,
  profilePatchBody,
  preferencesBody,
  onboardingBody,
  deleteAccountBody,
  dataRightsBody,
  productCreateBody,
  productPatchBody,
  productSlugParams,
  productIdParams,
  aiCompleteBody,
  adminRequestStatusBody,
  testLoginBody,
};
