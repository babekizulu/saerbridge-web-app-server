# SSO integration contract

Every Saerbridge product (Nile, Andromeda, Percival, Source, Thoth, Alethea) uses **one** central account.

1. Call **`https://api.saerbridge.com`** — not the Railway `*.railway.app` host — so the session cookie can be set for `.saerbridge.com`.
2. Browser requests use credentials (`fetch(..., { credentials: 'include' })` or Axios `withCredentials: true`).
3. The session cookie is HttpOnly and, in production, named `__Secure-saerbridge.sid` with domain `.saerbridge.com`.
4. On load, the product calls `GET /api/v1/auth/session`. If `authenticated` is false, send the user to `https://saerbridge.com` to sign in (or embed GIS against the same Google client ID and `POST /api/v1/auth/google` with CSRF).
5. Products never create passwords or SMTP verification.
6. The shared identity key is `data.user.id` (Saerbridge UUID), not email.
7. Product databases store that UUID as a foreign key. They do not copy Google tokens.
8. Products never persist Google ID tokens.
9. Each product enforces its own resource permissions. Being signed in is not authorisation to see another user’s product data.
10. `POST /api/v1/auth/logout` destroys the central session. Product-local caches must drop.

## CSRF

Read `csrfToken` from `/api/v1/auth/session` (or `/api/v1/auth/csrf`) and send `X-CSRF-Token` on POST/PUT/PATCH/DELETE.

## Local development

- Cookie domain is omitted so `localhost` works.
- `CLIENT_ORIGINS` must include `http://localhost:5173` (and the product’s own origin).
- Do not point local apps at production `api.saerbridge.com` while testing cookies on localhost.

## Cross-product privacy

Do not automatically join product datasets because the UUID is shared. Linking data across products needs a documented purpose and disclosure.
