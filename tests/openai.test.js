"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createOpenAiService } = require("../src/services/openaiService");
const { createLogger } = require("../src/utils/logger");

test("OpenAI service fails closed when disabled", async () => {
  const openai = createOpenAiService({
    config: {
      openai: { enabled: false, apiKey: "", model: "gpt-4.1-mini", timeoutMs: 1000, diagnosticLogPrompts: false },
    },
    logger: createLogger("silent"),
  });
  await assert.rejects(() => openai.complete({ prompt: "hello", requestId: "r1" }), {
    code: "AI_DISABLED",
  });
});

test("OpenAI service maps provider failures without leaking prompts", async () => {
  const messages = [];
  const openai = createOpenAiService({
    config: {
      openai: {
        enabled: true,
        apiKey: "sk-test",
        model: "gpt-4.1-mini",
        timeoutMs: 1000,
        diagnosticLogPrompts: false,
      },
    },
    logger: {
      info() {},
      error(payload) {
        messages.push(payload);
      },
    },
  });
  openai.client = undefined;
  await assert.rejects(
    () =>
      createOpenAiService({
        config: {
          openai: {
            enabled: true,
            apiKey: "sk-test",
            model: "gpt-4.1-mini",
            timeoutMs: 50,
            diagnosticLogPrompts: false,
          },
        },
        logger: {
          info() {},
          error(payload) {
            messages.push(JSON.stringify(payload));
          },
        },
      }).complete({ prompt: "super-secret-prompt-text", requestId: "r2" }),
    { code: "AI_PROVIDER_ERROR" }
  );
  assert.ok(!messages.join(" ").includes("super-secret-prompt-text"));
});
