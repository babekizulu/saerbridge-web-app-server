"use strict";

const { randomUUID } = require("node:crypto");

function requestIdMiddleware(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId = typeof incoming === "string" && incoming.length < 80 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

module.exports = { requestIdMiddleware };
