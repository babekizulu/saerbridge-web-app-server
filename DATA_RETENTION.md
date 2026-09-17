# Data retention

Configurable via environment. Avoid “keep forever because storage is cheap”.

| Record | Period | Mechanism |
| --- | --- | --- |
| Active sessions | Idle `SESSION_IDLE_MS` (default 14 days, rolling) | Cookie maxAge + store prune |
| Expired session rows | Immediate once `expire` passed | `npm run maintenance` and connect-pg-simple prune |
| Security audit events | `SECURITY_AUDIT_RETENTION_DAYS` (default 365) | maintenance |
| Completed data-rights requests | `COMPLETED_DATA_RIGHTS_RETENTION_DAYS` (default 730) | maintenance |
| Active account PII | While the account is active | User deletion |
| Deleted accounts | Personal fields overwritten immediately; internal UUID may remain | `DELETE /api/v1/me` |
| Legal acceptances | Retained on the anonymised user row only as version metadata | No extra PII added |
| AI prompts/outputs | Not persisted by default | Diagnostic flag only |

Child/minor processing is out of scope for v1 and needs a dedicated legal review before any change.
