# Privacy engineering

Central Saerbridge account inventory. Product applications must keep their own inventories.

| Data element | Purpose | Source | Location | Recipients | Retention | Deletion | Sensitivity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users.id` | Internal account key shared with products | Generated | `users` | Product DBs as FK only | While account exists; retained as anonymised row after delete | Anonymise on delete | Internal |
| `google_sub` | Stable Google identity | Google ID token | `users` | None | Until delete (replaced with marker) | Overwritten | High |
| `primary_email` | Contact, admin bootstrap | Google (verified) | `users` | Operators if handling a request | Until delete | Overwritten | High |
| `display_name` | Address the person | Google / user | `users` | Browser (self) | Until delete | Overwritten | Medium |
| `avatar_url` | Optional portrait | Google | `users` | Browser (self); Google CDN | Until delete | Cleared | Medium |
| `role` | Authorisation | Server (`ADMIN_EMAILS`) | `users` | Browser (self) | Until delete | Reset to member | Medium |
| Locale / motion / theme | UI | User | `user_preferences` | Browser | Until delete | Row deleted | Low |
| Legal acceptances | Record contract/acknowledgement versions | User action | `legal_acceptances` | Internal | Account life + limited legal need | Kept without extra PII; user_id remains for audit of the anonymised account | Medium |
| Data-rights requests | POPIA request handling | User | `data_rights_requests` | Admins | Configurable after completion | Maintenance job | Medium |
| Session row | Authentication | Server | `sessions` | None | Idle timeout | Logout / delete / maintenance | High |
| Security audit | Incident detection | Server | `security_audit_events` | Operators | `SECURITY_AUDIT_RETENTION_DAYS` | Maintenance job | Medium (hashed IP, no tokens) |
| AI prompts | Generate a result the user asked for | User, only if they use an AI feature | Not stored by default | OpenAI | Provider policy | N/A (not persisted here) | Variable |

Not collected on the central site: date of birth, address, gender, race, political preference, religion, health, precise location.

## Cross-product principle

Identity is shared. Datasets are not. Source places, Thoth opinions, Andromeda financial notes and Alethea reports must not silently enrich unrelated profiles.
