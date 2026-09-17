"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const pinoHttp = require("pino-http");
const connectPgSimple = require("connect-pg-simple");

const { loadEnv } = require("./config/env");
const { createLogger } = require("./utils/logger");
const { createPool } = require("./db/pool");
const { requestIdMiddleware } = require("./middleware/requestId");
const { originGuard, corsOptions } = require("./middleware/origin");
const { createCsrf } = require("./middleware/csrf");
const { createRateLimiters } = require("./middleware/rateLimit");
const { attachUser } = require("./middleware/auth");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { forbidden } = require("./utils/errors");
const { createUsersRepo } = require("./modules/users/usersRepo");
const { createProductsRepo } = require("./modules/products/productsRepo");
const { createDataRightsRepo } = require("./modules/dataRights/dataRightsRepo");
const { createGoogleAuthService } = require("./services/googleAuthService");
const { createOpenAiService } = require("./services/openaiService");
const { createAuditService } = require("./services/auditService");
const { createAuthRouter } = require("./modules/auth/auth.routes");
const { createMeRouter } = require("./modules/users/me.routes");
const { createProductsRouter } = require("./modules/products/products.routes");
const { createDataRightsRouter } = require("./modules/dataRights/dataRights.routes");
const { createAdminRouter } = require("./modules/admin/admin.routes");
const { createAiRouter } = require("./modules/ai/ai.routes");
const { createLegalRouter } = require("./modules/legal/legal.routes");
const { wrap } = require("./middleware/errorHandler");
const { sendOk } = require("./utils/http");

function createApp(overrides = {}) {
  const config = overrides.config || loadEnv();
  const logger = overrides.logger || createLogger(config.logLevel);
  const pool = overrides.pool || createPool(config.databaseUrl);
  const usersRepo = overrides.usersRepo || createUsersRepo(pool);
  const productsRepo = overrides.productsRepo || createProductsRepo(pool);
  const dataRightsRepo = overrides.dataRightsRepo || createDataRightsRepo(pool);
  const googleAuth =
    overrides.googleAuth ||
    createGoogleAuthService({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    });
  const openai = overrides.openai || createOpenAiService({ config, logger });
  const audit = overrides.audit || createAuditService({ pool, config });
  const rateLimiters = createRateLimiters();
  const { csrfProtection, issueCsrfToken } = createCsrf(config);

  const app = express();
  app.disable("x-powered-by");
  if (config.isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId,
      autoLogging: {
        ignore: (req) => req.path === "/healthz" || req.path === "/readyz",
      },
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            requestId: request.requestId,
          };
        },
        res(response) {
          return { statusCode: response.statusCode };
        },
      },
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      hsts: config.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "32kb" }));
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  app.use(hpp());

  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store:
        overrides.sessionStore ||
        new PgStore({
          pool,
          tableName: "sessions",
          createTableIfMissing: false,
          pruneSessionInterval: 15 * 60,
        }),
      name: config.isProduction ? "__Secure-saerbridge.sid" : "saerbridge.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: config.isProduction,
      cookie: {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "lax",
        domain: config.cookieDomain || undefined,
        maxAge: config.sessionIdleMs,
        path: "/",
      },
    })
  );

  app.use((req, res, next) => {
    cors(corsOptions(config.clientOrigins))(req, res, (err) => {
      if (err) return next(forbidden("Request origin is not allowed"));
      next();
    });
  });
  app.use(originGuard(config.clientOrigins));
  app.use(attachUser(usersRepo));
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    return csrfProtection(req, res, next);
  });

  app.get("/healthz", (req, res) => {
    sendOk(res, { status: "ok" });
  });

  app.get(
    "/readyz",
    wrap(async (_req, res) => {
      await pool.query("SELECT 1");
      sendOk(res, { status: "ready" });
    })
  );

  const api = express.Router();
  api.use(rateLimiters.global);
  api.use(
    "/auth",
    createAuthRouter({
      config,
      usersRepo,
      googleAuth,
      audit,
      issueCsrfToken,
      rateLimiters,
    })
  );
  api.use("/me", createMeRouter({ usersRepo, audit, rateLimiters }));
  api.use("/products", createProductsRouter({ productsRepo }));
  api.use("/data-rights-requests", createDataRightsRouter({ dataRightsRepo, audit }));
  api.use("/admin", createAdminRouter({ productsRepo, dataRightsRepo, pool, audit, rateLimiters }));
  api.use("/ai", createAiRouter({ openai, usersRepo, audit, rateLimiters }));
  api.use("/legal", createLegalRouter({ config, pool }));
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return { app, pool, config, logger, usersRepo, productsRepo };
}

module.exports = { createApp };
