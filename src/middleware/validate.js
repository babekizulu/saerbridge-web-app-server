"use strict";

const { unprocessable } = require("../utils/errors");

function formatZod(error) {
  const issues = error.issues || error.errors || [];
  return issues.map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path || ""),
    message: issue.message,
  }));
}

function validate({ body, query, params } = {}) {
  return function validateRequest(req, _res, next) {
    try {
      if (params) {
        const parsed = params.safeParse(req.params);
        if (!parsed.success) return next(unprocessable("Invalid route parameters", formatZod(parsed.error)));
        req.params = parsed.data;
      }
      if (query) {
        const parsed = query.safeParse(req.query);
        if (!parsed.success) return next(unprocessable("Invalid query parameters", formatZod(parsed.error)));
        req.query = parsed.data;
      }
      if (body) {
        const parsed = body.safeParse(req.body);
        if (!parsed.success) return next(unprocessable("Invalid request body", formatZod(parsed.error)));
        req.body = parsed.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { validate, formatZod };
