"use strict";

require("dotenv").config();

const { z } = require("zod");

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  CLIENT_ORIGINS: z.string().min(1, "CLIENT_ORIGINS is required"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),
  OPENAI_ENABLED: z.string().optional(),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().optional().default("gpt-4.1-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  OPENAI_DIAGNOSTIC_LOG_PROMPTS: z.string().optional(),
  SESSION_IDLE_MS: z.coerce.number().int().positive().default(14 * 24 * 60 * 60 * 1000),
  SECURITY_AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  COMPLETED_DATA_RIGHTS_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
  ENABLE_TEST_AUTH: z.string().optional(),
  COMPANY_REGISTRATION_NUMBER: z.string().optional().default(""),
  INFORMATION_OFFICER_NAME: z.string().optional().default(""),
  INFORMATION_OFFICER_EMAIL: z.string().optional().default("we@saerbridge.com"),
  INFORMATION_OFFICER_PHONE: z.string().optional().default(""),
  REGISTERED_ADDRESS: z.string().optional().default(""),
  LOG_LEVEL: z.string().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;
  const isProduction = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test";
  const openaiEnabled = parseBoolean(env.OPENAI_ENABLED, false);
  const enableTestAuth = parseBoolean(env.ENABLE_TEST_AUTH, false);

  if (isProduction && enableTestAuth) {
    throw new Error("ENABLE_TEST_AUTH is refused in production");
  }

  if (isProduction && !env.COOKIE_DOMAIN) {
    throw new Error("COOKIE_DOMAIN is required in production (use .saerbridge.com)");
  }

  if (openaiEnabled && !env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when OPENAI_ENABLED=true");
  }

  const clientOrigins = parseList(env.CLIENT_ORIGINS);
  if (isProduction) {
    const unexpected = clientOrigins.filter((origin) => !origin.startsWith("https://"));
    if (unexpected.length) {
      throw new Error("Production CLIENT_ORIGINS must be https origins");
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    isTest,
    isDevelopment: env.NODE_ENV === "development",
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    sessionSecret: env.SESSION_SECRET,
    csrfSecret: env.CSRF_SECRET,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || "",
    clientOrigins,
    cookieDomain: env.COOKIE_DOMAIN || null,
    adminEmails: parseList(env.ADMIN_EMAILS).map((email) => email.toLowerCase()),
    openai: {
      enabled: openaiEnabled,
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      timeoutMs: env.OPENAI_TIMEOUT_MS,
      diagnosticLogPrompts: parseBoolean(env.OPENAI_DIAGNOSTIC_LOG_PROMPTS, false),
    },
    sessionIdleMs: env.SESSION_IDLE_MS,
    retention: {
      securityAuditDays: env.SECURITY_AUDIT_RETENTION_DAYS,
      completedDataRightsDays: env.COMPLETED_DATA_RIGHTS_RETENTION_DAYS,
    },
    enableTestAuth,
    logLevel: env.LOG_LEVEL || (isProduction ? "info" : isTest ? "silent" : "debug"),
    legal: {
      companyRegistrationNumber: env.COMPANY_REGISTRATION_NUMBER || null,
      informationOfficerName: env.INFORMATION_OFFICER_NAME || null,
      informationOfficerEmail: env.INFORMATION_OFFICER_EMAIL || "we@saerbridge.com",
      informationOfficerPhone: env.INFORMATION_OFFICER_PHONE || null,
      registeredAddress: env.REGISTERED_ADDRESS || null,
    },
  };
}

module.exports = { loadEnv, parseBoolean, parseList };
