"use strict";

function sendOk(res, data = null, extraMeta = {}, status = 200) {
  const requestId = res.req?.requestId;
  return res.status(status).json({
    ok: true,
    data,
    meta: { requestId, ...extraMeta },
  });
}

function sendCreated(res, data, extraMeta = {}) {
  return sendOk(res, data, extraMeta, 201);
}

function sendNoContent(res) {
  return res.status(204).send();
}

module.exports = { sendOk, sendCreated, sendNoContent };
