"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { validate } = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const { sendCreated, sendOk } = require("../../utils/http");
const { dataRightsBody } = require("../schemas");

function mapRequest(row) {
  return {
    id: row.id,
    requestType: row.request_type,
    requestStatus: row.request_status,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
  };
}

function createDataRightsRouter({ dataRightsRepo, audit }) {
  const router = Router();

  router.post(
    "/",
    requireAuth,
    validate({ body: dataRightsBody }),
    wrap(async (req, res) => {
      const created = await dataRightsRepo.create(req.currentUser.id, {
        requestType: req.body.requestType,
        metadata: {},
      });
      await audit.record(req, "data_rights.create", { requestType: req.body.requestType });
      sendCreated(res, mapRequest(created));
    })
  );

  router.get(
    "/mine",
    requireAuth,
    wrap(async (req, res) => {
      const rows = await dataRightsRepo.listMine(req.currentUser.id);
      sendOk(res, rows.map(mapRequest));
    })
  );

  return router;
}

module.exports = { createDataRightsRouter };
