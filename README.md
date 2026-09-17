# Saerbridge API

Central API, authentication gateway and shared services for **Saerbridge (Pty) Ltd.** (`saerbridge.`).

This service is the account system for Nile, Andromeda, Percival, Source, Thoth and Alethea. Product applications must not create separate password databases.

## Stack

Node.js, Express, PostgreSQL, server-side sessions, Google Identity Services verification, OpenAI Node SDK (server-only).

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL. Docker Compose is provided on ports **5433** (dev) and **5434** (test) so it does not collide with a local Postgres on 5432:

```bash
docker compose up -d
```

Alternatively set `DATABASE_URL` to your own database.

On some Windows Docker Desktop setups, host TCP auth to port 5433 can fail while the container is healthy. If `npm run migrate` reports `28P01`, apply SQL through the container socket (`docker exec -i saerbridge-db psql -U saerbridge -d saerbridge < migrations/001_initial.sql`) or use the Compose test database on **5434**, which the test suite uses successfully.

3. Install and migrate:

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

The API listens on `PORT` (default 8080). Health: `GET /healthz`. Readiness: `GET /readyz`.

## Environment

See `.env.example`. Production-critical values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session HMAC (32+ characters) |
| `CSRF_SECRET` | CSRF token secret |
| `GOOGLE_CLIENT_ID` | Google Identity Services client ID |
| `CLIENT_ORIGINS` | Comma-separated browser origins |
| `COOKIE_DOMAIN` | Production: `.saerbridge.com` |
| `ADMIN_EMAILS` | Allowlist used **after** verified Google sign-in |
| `OPENAI_API_KEY` | Server-only. Never a `VITE_*` variable |
| `OPENAI_ENABLED` | Feature flag |

Boot fails if production is missing `COOKIE_DOMAIN`, if `ENABLE_TEST_AUTH` is true in production, or if OpenAI is enabled without a key.

## Google OAuth

Create an OAuth client of type **Web** in Google Cloud. Authorised JavaScript origins must include `https://saerbridge.com` and local Vite origins. The ID token is verified on this server with `google-auth-library`. The browser never decides who the user is.

## OpenAI

Install is already declared. Keep `OPENAI_API_KEY` on Railway only. Example integration endpoint: `POST /api/v1/ai/complete` (authenticated, rate-limited, notice recorded). Prompts are not logged unless `OPENAI_DIAGNOSTIC_LOG_PROMPTS=true`.

If an OpenAI key was ever present in a client project or a committed file, **rotate it**.

## Scripts

- `npm run dev` — watch mode
- `npm start` — production
- `npm run lint`
- `npm test`
- `npm run migrate` / `npm run migrate:rollback`
- `npm run seed`
- `npm run maintenance` — prune expired sessions and retained operational rows (safe for a Railway cron)

## Tests

Tests expect `DATABASE_URL` pointing at an empty-able database (Compose service `db_test` on 5434). They enable `ENABLE_TEST_AUTH` only when `NODE_ENV=test`.

## Security notes

- Sessions live in PostgreSQL (`connect-pg-simple`). Cookie `__Secure-saerbridge.sid` in production.
- CSRF via `csrf-sync` plus Origin allowlisting.
- CORS is an explicit allowlist with credentials.
- Parameterised SQL only.
- Structured logs redact cookies, tokens and API keys.

See `SECURITY.md`, `THREAT_MODEL.md`, `SSO_INTEGRATION.md` and `DEPLOYMENT.md`.
