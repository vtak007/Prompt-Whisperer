# Open Items — Prompt Whisperer

## Status

| # | Item | Status |
|---|---|---|
| 1 | Host privacy policy for Web Store listing | Deferred 2026-11-23 — until the Web Store listing |
| 2 | Unused `storage.updateCategory` | Waiting on your approval |
| 3–6 | Known limitations | Accepted |

## VERIFY
None.

## WATCH
None.

## DECIDE
1. Web Store listing needs a public privacy-policy URL. `webstore/privacy-policy.html` isn't hosted anywhere (no GitHub Pages). Recommended: GitHub Pages using a small Actions workflow that publishes only `webstore/` (URL `https://vtak007.github.io/Prompt-Whisperer/privacy-policy.html`). Publishing the whole `main` root also works, but it turns every repo `.md` file into a web page too. Keep repo issues enabled, since the policy links to them for contact.
2. `updateCategory` in `services/storage.js` has no callers since `renameCategory` replaced it; remove?

## BLOCKED
None.

## ACCEPTED
3. API key stored in plain text in `chrome.storage.local`; no spend cap or proxy.
4. Insertion can't reach `chrome://` pages, cross-origin iframe composers or closed shadow-DOM editors.
5. OpenAI/Gemini can't be added as direct browser providers (CORS); would need a local companion process.
6. No automated tests; verification is manual in Chrome.

## Git Actions Outstanding
None.
