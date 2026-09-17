# AI governance

Saerbridge is **not** ISO/IEC 42001 certified. This document records intended practice.

## Approved (central site)

- Optional, authenticated generation that the user explicitly requests.
- Reusable server-side OpenAI client with validation, timeouts, rate limits.
- Labelling generated text as AI output.

## Prohibited

- Chatbot bolted on for demonstration.
- Covert political persuasion or candidate ranking.
- Sending email, Google `sub`, or profile fields to OpenAI automatically.
- Storing prompts/outputs by default.
- Presenting AI inference as verified government data.

## OpenAI

Provider: OpenAI. Key: `OPENAI_API_KEY` on the server only. Flag: `OPENAI_ENABLED`.

Human oversight: AI routes require a signed-in user and an acknowledgement of the AI processing notice. Output is labelled. Users should not submit unnecessary sensitive information.

## Reliability and hallucination

Treat output as assistive and possibly wrong. Civic products must keep inference visually distinct from verified records.

## Fairness and evaluation

When product teams add AI features they must record the intended population, known failure modes, and a review date. Cadence: at least annually, and on model/provider change.

## Incidents

Report suspected AI misuse or leakage to we@saerbridge.com. Do not auto-notify the Information Regulator without human review.
