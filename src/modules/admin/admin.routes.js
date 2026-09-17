"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { validate } = require("../../middleware/validate");
const { requireAdmin } = require("../../middleware/auth");
const { sendOk, sendCreated, sendNoContent } = require("../../utils/http");
const { notFound } = require("../../utils/errors");
const {
  productCreateBody,
  productPatchBody,
  productIdParams,
  adminRequestStatusBody,
} = require("../schemas");

function createAdminRouter({ productsRepo, dataRightsRepo, pool, audit, rateLimiters }) {
  const router = Router();
  router.use(rateLimiters.admin);
  router.use(requireAdmin);

  router.get(
    "/health",
    wrap(async (_req, res) => {
      const { rows } = await pool.query("SELECT now() AS now");
      sendOk(res, {
        status: "ok",
        database: "reachable",
        serverTime: rows[0].now,
      });
    })
  );

  router.get(
    "/products",
    wrap(async (_req, res) => {
      sendOk(res, await productsRepo.list());
    })
  );

  router.post(
    "/products",
    validate({ body: productCreateBody }),
    wrap(async (req, res) => {
      const product = await productsRepo.create(req.body);
      await audit.record(req, "admin.product.create", { slug: product.slug });
      sendCreated(res, product);
    })
  );

  router.patch(
    "/products/:id",
    validate({ params: productIdParams, body: productPatchBody }),
    wrap(async (req, res) => {
      const product = await productsRepo.update(req.params.id, req.body);
      if (!product) throw notFound("Product not found");
      await audit.record(req, "admin.product.update", { id: req.params.id });
      sendOk(res, product);
    })
  );

  router.delete(
    "/products/:id",
    validate({ params: productIdParams }),
    wrap(async (req, res) => {
      const removed = await productsRepo.remove(req.params.id);
      if (!removed) throw notFound("Product not found");
      await audit.record(req, "admin.product.delete", { id: req.params.id });
      sendNoContent(res);
    })
  );

  router.get(
    "/data-rights-requests",
    wrap(async (_req, res) => {
      const rows = await dataRightsRepo.listAll();
      sendOk(
        res,
        rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          requestType: row.request_type,
          requestStatus: row.request_status,
          requestedAt: row.requested_at,
          completedAt: row.completed_at,
          primaryEmail: row.primary_email,
        }))
      );
    })
  );

  router.patch(
    "/data-rights-requests/:id",
    validate({
      params: productIdParams,
      body: adminRequestStatusBody,
    }),
    wrap(async (req, res) => {
      const updated = await dataRightsRepo.updateStatus(req.params.id, req.body);
      if (!updated) throw notFound("Request not found");
      await audit.record(req, "admin.data_rights.update", { id: req.params.id });
      sendOk(res, {
        id: updated.id,
        requestType: updated.request_type,
        requestStatus: updated.request_status,
        requestedAt: updated.requested_at,
        completedAt: updated.completed_at,
      });
    })
  );

  router.get(
    "/legal-documents",
    wrap(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT id, document_type, version, title, is_current, effective_at, created_at
         FROM legal_documents
         ORDER BY document_type, effective_at DESC`
      );
      sendOk(res, rows);
    })
  );

  return router;
}

module.exports = { createAdminRouter };
