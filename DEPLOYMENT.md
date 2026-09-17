# Deployment — Saerbridge API (Railway)

## Custom domain (required for SSO)

Central authentication uses a cookie on `.saerbridge.com`.

The Railway-generated `*.railway.app` hostname **cannot** issue a `.saerbridge.com` cookie.

1. Deploy this service on Railway.
2. Attach the custom domain **`api.saerbridge.com`**.
3. Point DNS (CNAME or ALIAS) at the Railway domain Railway provides for that service.
4. Set `COOKIE_DOMAIN=.saerbridge.com`.
5. Set `CLIENT_ORIGINS` to the real HTTPS origins only.

Example:

```
CLIENT_ORIGINS=https://saerbridge.com,https://www.saerbridge.com,https://nile.saerbridge.com,https://andromeda.saerbridge.com,https://percival.saerbridge.com,https://source.saerbridge.com,https://thoth.saerbridge.com,https://alethea.saerbridge.com
```

## Railway variables

Set at least:

- `NODE_ENV=production`
- `PORT` — Railway injects this; do not hard-code 3000
- `DATABASE_URL` — Railway PostgreSQL plugin
- `SESSION_SECRET`
- `CSRF_SECRET`
- `GOOGLE_CLIENT_ID`
- `CLIENT_ORIGINS`
- `COOKIE_DOMAIN=.saerbridge.com`
- `ADMIN_EMAILS`
- `OPENAI_ENABLED` / `OPENAI_API_KEY` if AI is on

Optional legal fields: `COMPANY_REGISTRATION_NUMBER`, `INFORMATION_OFFICER_NAME`, `INFORMATION_OFFICER_EMAIL`, `INFORMATION_OFFICER_PHONE`, `REGISTERED_ADDRESS`. Leave blank rather than inventing values.

## Release commands

After first deploy, run:

```
npm run migrate
npm run seed
```

Configure a Railway cron or scheduled job:

```
npm run maintenance
```

Health check path: `/healthz`.

## Proxy

Production sets `trust proxy = 1` so secure cookies and rate limits see `X-Forwarded-*` from Railway.

## Google Cloud

Authorised JavaScript origins must include production frontends. Authorised redirect URIs are not used for the GIS ID-token popup flow, but the client ID must match the frontend `VITE_GOOGLE_CLIENT_ID`.
