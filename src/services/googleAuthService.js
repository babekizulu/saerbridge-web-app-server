"use strict";

const { OAuth2Client } = require("google-auth-library");
const { unauthorized } = require("../utils/errors");

function createGoogleAuthService({ clientId, clientSecret, verifyIdTokenImpl }) {
  const client = new OAuth2Client(clientId, clientSecret || undefined);

  async function defaultVerify(credential) {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    return ticket.getPayload();
  }

  const verifyIdToken = verifyIdTokenImpl || defaultVerify;

  async function verifyGoogleCredential(credential, expectedNonce) {
    if (!credential || typeof credential !== "string") {
      throw unauthorized("Missing Google credential");
    }

    let payload;
    try {
      payload = await verifyIdToken(credential, clientId);
    } catch {
      throw unauthorized("Google credential could not be verified");
    }

    if (!payload || !payload.sub) {
      throw unauthorized("Google credential is incomplete");
    }
    if (payload.aud !== clientId) {
      throw unauthorized("Google credential audience mismatch");
    }
    if (expectedNonce && payload.nonce !== expectedNonce) {
      throw unauthorized("Google credential nonce mismatch");
    }
    if (payload.email && payload.email_verified === false) {
      throw unauthorized("Google email is not verified");
    }

    return {
      googleSub: payload.sub,
      email: payload.email ? String(payload.email).trim().toLowerCase() : null,
      displayName: payload.name ? String(payload.name).slice(0, 120) : "Saerbridge member",
      avatarUrl: payload.picture ? String(payload.picture).slice(0, 500) : null,
    };
  }

  return { verifyGoogleCredential };
}

module.exports = { createGoogleAuthService };
