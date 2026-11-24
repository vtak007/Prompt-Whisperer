# Prompt Whisperer

A Chrome extension for creating, organizing, searching, importing/exporting, and reusing AI prompts from a persistent side panel.

## Features

- **Library** — browse prompts by category, tag, or favorites; rename or delete categories and tags in place from the sidebar (deleting a tag removes it from all prompts without deleting the prompts). Categories, tags, and favorites are each sorted alphabetically (favorites by prompt title) and shown in a collapsible section (collapsed by default on open). Nothing is selected by default, so the prompt list starts blank with a hint to pick a category/tag/favorite or use Search; the resulting prompt cards are sorted alphabetically by title too, and collapsing a section clears its selection so the list goes blank again.
- **Create / Edit** — save prompts with a title, category, tags, content, and optional notes.
- **Search** — combined keyword + category + tag filtering, with a `/` quick-search shortcut.
- **Optimize Prompt** — rewrite a prompt against a chosen goal (Clarity, Coding, Research, etc.). Ships with a built-in offline mock optimizer by default; switch **Settings → AI Provider** to "Anthropic (Claude)" and paste in your own Anthropic API key to get live results from Claude instead. The `optimizePrompt()` abstraction in `services/optimizer.js` supports both and can take further providers (OpenAI, Google, a local endpoint) later without touching the UI.
- **Import / Export** — back up or transfer your library as JSON, with duplicate detection (Skip / Replace / Keep Both) on import.
- **Insert into active tab** — insert a prompt's text into the focused text field on whatever page you're on (ChatGPT, Claude, Gemini, or any `<textarea>`/`<input>`/`contenteditable`), without auto-submitting.
- **Settings** — appearance, default startup view, prompt click behavior, import/export preferences, and a "Reset to sample data" action. Appearance defaults to **Light**, which shows the brushed-chrome treatment as designed; Dark renders the same panel through an inversion filter, and System follows the host.

## Installing (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Click the toolbar icon to open the side panel.

## Tech

Plain HTML/CSS/JS (ES modules), no build step, no framework. Manifest V3 with the Chrome Side Panel API. Data is stored in `chrome.storage.local`. The UI is a brushed-chrome/cyan theme built entirely from CSS gradients and shadows plus an inline SVG icon set — no image assets, no icon font. See `CLAUDE.md` for the file map.

## Using a live AI provider for Optimize Prompt

1. Get an API key from the [Anthropic Console](https://console.anthropic.com/).
2. In the extension, go to **Settings → Optimization Settings**, set **AI Provider** to "Anthropic (Claude)", and paste your key into **API Key**.
3. Click the ⟳ button next to **Model** to fetch the current list of Claude models from Anthropic's API, then click into the Model field to pick one from the dropdown (or leave it blank to use the default, `claude-haiku-5-5`, or type any model ID directly).
4. The key is stored in `chrome.storage.local` (plain text, like most browser extensions) and is only ever sent directly from your browser to Anthropic's API when you click Optimize — never logged to the console, never sent anywhere else. Anyone with access to this Chrome profile could read it via DevTools, so treat it like any other locally-stored secret.

## Known limitations (by design, for this release)

- Optimize Prompt's live mode only supports Anthropic; other providers (OpenAI, Google, a local endpoint) aren't wired up yet, though the abstraction supports adding them. Anthropic is currently the only one of the three that permits direct browser-origin API calls — OpenAI and Gemini both block them via CORS, so adding those needs a local companion process rather than another provider function (see `Prompt Whisperer Features.md` §33).
- There's no server-side proxy or spend cap — a live API key is used directly and unmetered by the extension; standard Anthropic rate limits apply.
- Insertion cannot reach cross-origin iframe composers or closed shadow-DOM editors, and never works on internal `chrome://` pages (Chrome blocks script injection there for all extensions).
- No "undockable" floating window (like Bitwarden's pop-out) yet — deferred as a future enhancement.
