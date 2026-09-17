"use strict";

const crypto = require("node:crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hmacSha256(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashIp(ip, secret) {
  if (!ip) return null;
  return hmacSha256(ip, `ip:${secret}`);
}

function coarseUserAgent(userAgent) {
  if (!userAgent) return null;
  return String(userAgent).slice(0, 180);
}

module.exports = { sha256, hmacSha256, randomToken, hashIp, coarseUserAgent };
