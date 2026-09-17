# Incident response

This is a human process. **Do not auto-notify the Information Regulator.**

1. **Detect** — logs, rate-limit spikes, user reports to we@saerbridge.com, Railway alerts.
2. **Contain** — rotate `SESSION_SECRET` / `CSRF_SECRET` / `OPENAI_API_KEY` / Google client secret if relevant; disable `OPENAI_ENABLED`; take a compromised admin off `ADMIN_EMAILS`; invalidate sessions via maintenance or SQL `DELETE FROM sessions`.
3. **Assess** — what data, which users, whether POPIA-notifiable (reasonable likelihood of serious harm).
4. **Preserve evidence** — export relevant `security_audit_events` (they must not contain tokens or prompts). Snapshot logs before rotation.
5. **Escalate internally** — founder / Information Officer (when named).
6. **Communicate to affected users** — only after assessment; use email we already hold; do not ask them to send more sensitive data.
7. **Regulator** — if legally required, a person submits a notification to the Information Regulator. No automated filing.

Contact: we@saerbridge.com.
