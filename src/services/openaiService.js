"use strict";

const OpenAI = require("openai");
const { AppError } = require("../utils/errors");

function createOpenAiService({ config, logger }) {
  const client = config.openai.enabled && config.openai.apiKey
    ? new OpenAI({ apiKey: config.openai.apiKey, timeout: config.openai.timeoutMs })
    : null;

  async function complete({ prompt, requestId, model }) {
    if (!config.openai.enabled || !client) {
      throw new AppError(503, "AI_DISABLED", "AI features are not enabled on this server");
    }
    if (!prompt || typeof prompt !== "string") {
      throw new AppError(400, "BAD_REQUEST", "A prompt is required");
    }

    const started = Date.now();
    const selectedModel = model || config.openai.model;
    try {
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.4,
      });
      const latencyMs = Date.now() - started;
      logger.info(
        {
          requestId,
          model: selectedModel,
          latencyMs,
          usage: response.usage || null,
          status: "success",
          promptChars: prompt.length,
        },
        "openai.complete"
      );
      if (config.openai.diagnosticLogPrompts) {
        logger.warn({ requestId, diagnostic: true }, "openai.diagnostic_logging_enabled");
      }
      return {
        text: response.choices?.[0]?.message?.content || "",
        model: response.model || selectedModel,
        generated: true,
      };
    } catch (error) {
      logger.error(
        {
          requestId,
          model: selectedModel,
          latencyMs: Date.now() - started,
          status: "failure",
          errName: error?.name,
          errCode: error?.code,
        },
        "openai.complete"
      );
      throw new AppError(502, "AI_PROVIDER_ERROR", "The AI service is temporarily unavailable");
    }
  }

  return { complete };
}

module.exports = { createOpenAiService };
