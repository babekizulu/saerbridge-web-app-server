# Threat model (central Saerbridge)

Residual risk remains. This is a living document, not a guarantee.

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Account takeover via fake Google identity | Server verifies GIS ID tokens; `sub` is the key; email is not trusted from the browser | Stolen Google accounts; GIS configuration errors |
| Login CSRF | Session nonce bound into GIS token verification; CSRF on POST; Origin allowlist | Misconfigured origins |
| Session theft | HttpOnly, Secure, SameSite=Lax cookie; rolling idle expiry; regenerate after login | XSS on a Saerbridge origin; malware on the user device |
| Cross-subdomain session | Cookie domain `.saerbridge.com` only in production on `api.saerbridge.com` | A compromised product subdomain can send credentialed API calls as the user |
| Malicious subdomain | Product apps must be treated as high-trust; lock DNS and deploy access | New subdomain takeover |
| XSS | CSP on Netlify; React escaping; no `unsafe-eval` | Third-party GIS UI; future markdown/HTML |
| CSRF | csrf-sync + SameSite + Origin | Token leakage via XSS |
| SQL injection | Parameterised `pg` queries | Future raw-query mistakes |
| Privilege escalation | Roles set server-side from `ADMIN_EMAILS` after verified login; clients cannot patch `role` | Stale allowlist vs DB role |
| API abuse | Global and tighter auth/AI/admin/destructive rate limits | Distributed low-and-slow |
| AI abuse | Auth, size limits, rate limits, no auto-PII in prompts | Users pasting sensitive text |
| Secret leakage | `.gitignore` for `.env`; no `VITE_` secrets; log redaction | Operator screenshots; mis-set Netlify env |
| Location data (future products) | Central site does not request geolocation | Product apps must implement their own permission model |
| Civic-data integrity | Policy: label inference; distinguish reports vs verified data | Human process still required |
| Admin compromise | Small admin surface; no env dump | Phished admin Google account |
| Dependency compromise | Dependabot; `npm audit` in CI | Supply-chain lag |

**Do not** store Google ID tokens, OpenAI keys, or session IDs in logs or localStorage.
