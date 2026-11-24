# Open Items — Prompt Whisperer

## Status

| # | Item | Status |
|---|---|---|
| 1 | Host privacy policy for Web Store listing | Open — waiting on your choice |
| 2 | Outdated default Anthropic model | Waiting on your approval |
| 3 | Unused `storage.updateCategory` | Waiting on your approval |
| 4–7 | Known limitations | Accepted |

## VERIFY
None.

## WATCH
None.

## DECIDE
1. Web Store listing needs a public privacy-policy URL. `webstore/privacy-policy.html` isn't hosted anywhere (no GitHub Pages). Options: enable Pages on the public repo, or host elsewhere.
2. `DEFAULT_ANTHROPIC_MODEL` in `services/optimizer.js` (and the README) is still `claude-haiku-4-5-20251001`; update to a current model?
3. `updateCategory` in `services/storage.js` has no callers since `renameCategory` replaced it; remove?

## BLOCKED
None.

## ACCEPTED
4. API key stored in plain text in `chrome.storage.local`; no spend cap or proxy.
5. Insertion can't reach `chrome://` pages, cross-origin iframe composers or closed shadow-DOM editors.
6. OpenAI/Gemini can't be added as direct browser providers (CORS); would need a local companion process.
7. No automated tests; verification is manual in Chrome.

## Git Actions Outstanding
None.
