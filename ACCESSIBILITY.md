# Accessibility (API and shared policy)

The **website** target is WCAG 2.2 AA. This API supports that by returning understandable JSON errors (no stack traces), stable field names, and no colour-only meaning.

## Frontend release checklist

See the client `ACCESSIBILITY.md` for keyboard procedure, RTL, reduced motion and axe/Playwright checks.

## API considerations

- Error `message` strings are plain language.
- `requestId` is returned for unexpected failures.
- Rate-limit responses use 429 with a clear code.

Known limitation: Google’s own sign-in button is third-party UI.
