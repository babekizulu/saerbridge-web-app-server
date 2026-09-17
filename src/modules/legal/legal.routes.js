"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { sendOk } = require("../../utils/http");
const { publicLegalConfig } = require("../../config/legal");

function createLegalRouter({ config, pool }) {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      sendOk(res, publicLegalConfig(config.legal));
    })
  );

  router.get(
    "/documents",
    wrap(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT document_type, version, title, is_current, effective_at
         FROM legal_documents
         WHERE is_current = TRUE
         ORDER BY document_type`
      );
      sendOk(res, rows);
    })
  );

  return router;
}

module.exports = { createLegalRouter };
