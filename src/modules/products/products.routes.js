"use strict";

const { Router } = require("express");
const { wrap } = require("../../middleware/errorHandler");
const { validate } = require("../../middleware/validate");
const { sendOk } = require("../../utils/http");
const { notFound } = require("../../utils/errors");
const { productSlugParams } = require("../schemas");

function createProductsRouter({ productsRepo }) {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      sendOk(res, await productsRepo.list());
    })
  );

  router.get(
    "/:slug",
    validate({ params: productSlugParams }),
    wrap(async (req, res) => {
      const product = await productsRepo.findBySlug(req.params.slug);
      if (!product) throw notFound("Product not found");
      sendOk(res, product);
    })
  );

  return router;
}

module.exports = { createProductsRouter };
