"use strict";

class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
  }
}

function badRequest(message, details) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

function unauthorized(message = "Authentication required") {
  return new AppError(401, "UNAUTHORIZED", message);
}

function forbidden(message = "You do not have permission to perform this action") {
  return new AppError(403, "FORBIDDEN", message);
}

function notFound(message = "Resource not found") {
  return new AppError(404, "NOT_FOUND", message);
}

function conflict(message, details) {
  return new AppError(409, "CONFLICT", message, details);
}

function tooMany(message = "Too many requests") {
  return new AppError(429, "RATE_LIMITED", message);
}

function unprocessable(message, details) {
  return new AppError(422, "VALIDATION_ERROR", message, details);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooMany,
  unprocessable,
};
