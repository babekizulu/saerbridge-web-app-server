"use strict";

const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
const additions = {
  NODE_ENV: "development",
  PORT: "8080",
  DATABASE_URL: "postgres://saerbridge:saerbridge_dev@localhost:5433/saerbridge",
  SESSION_SECRET: "local-dev-session-secret-rotate-before-production-use",
  CSRF_SECRET: "local-dev-csrf-secret-rotate-before-production-use32",
  GOOGLE_CLIENT_ID: "replace-with-google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "replace-with-google-client-secret",
  CLIENT_ORIGINS: "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
  COOKIE_DOMAIN: "",
  ADMIN_EMAILS: "",
  OPENAI_ENABLED: "false",
  OPENAI_MODEL: "gpt-4.1-mini",
  ENABLE_TEST_AUTH: "false",
};

let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
if (!text.endsWith("\n") && text.length) text += "\n";

const added = [];
for (const [key, value] of Object.entries(additions)) {
  const pattern = new RegExp(`^${key}=`, "m");
  if (!pattern.test(text)) {
    text += `${key}=${value}\n`;
    added.push(key);
  }
}

fs.writeFileSync(envPath, text);
process.stdout.write(`env keys present; added: ${added.join(", ") || "(none)"}\n`);
