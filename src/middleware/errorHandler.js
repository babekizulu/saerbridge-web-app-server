"use strict";

const { AppError } = require("../utils/errors");

function errorHandler(logger) {
  return function handleError(err, req, res, _next) {
    if (res.headersSent) return;

    if (err.code === "EBADCSRFTOKEN" || err.code === "CSRF") {
      return res.status(403).json({
        ok: false,
        error: {
          code: "CSRF_REJECTED",
          message: "The request could not be verified. Reload the page and try again.",
        },
        meta: { requestId: req.requestId },
      });
    }

    const status = err.status || err.statusCode || 500;
    const expose = status < 500;
    const payload = {
      ok: false,
      error: {
        code: err.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
        message: expose && err.message ? err.message : "An unexpected error occurred.",
        details: expose ? err.details : undefined,
      },
      meta: { requestId: req.requestId },
    };

    logger[status >= 500 ? "error" : "warn"](
      {
        requestId: req.requestId,
        status,
        code: payload.error.code,
        method: req.method,
        path: req.path,
        errName: err.name,
      },
      "request.error"
    );

    res.status(status).json(payload);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Endpoint not found" },
    meta: { requestId: req.requestId },
  });
}

function wrap(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, wrap, AppError };
