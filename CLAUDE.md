# Screenshot Helper

Chrome MV3 extension for high-resolution page and element screenshots. Used for MotionGFX, archiving, and general purpose. All capture uses the Chrome DevTools Protocol (CDP) via `chrome.debugger` for device emulation + `Page.captureScreenshot`.

This document describes the current implementation. Aspirational features are split into a "Planned" section at the end; do not assume they exist.

---

## Entry points

Two ways to trigger a capture:

1. **Toolbar popup** ([popup.html](popup.html) / [popup.js](popup.js)) — main UI with resolution, scale, cleanup options, and three action buttons: **Capture Page**, **Capture Element**, and **Auto**.
2. **Right-click context menu** ([contextMenus/](contextMenus/)) — quick presets defined in [screenshots/emulation/emulationOptions.js](screenshots/emulation/emulationOptions.js) plus an "Element Screenshot" entry. Skips the popup; uses hard-coded device metrics.

---

## Capture modes

### Emulated viewport capture (Capture Page)

User picks a resolution preset and scale factor. The extension attaches the debugger, emulates the chosen device metrics, waits for the page to settle (MutationObserver-based), captures, and detaches.

Resolution presets in the popup ([popup.js:6-11](popup.js#L6-L11)):

| Preset    | Width | Height                            |
|-----------|-------|-----------------------------------|
| Horizontal | 1920 | 1080                              |
| Vertical   | 1920 | 7000                              |
| Full Page  | 1920 | measured from the live document   |
| Custom     | user-editable | user-editable             |

Editing either resolution input auto-switches the radio to **Custom**.

Scale factor (`deviceScaleFactor`): 1× / 2× / 3× / 4×. Default **2×**.

### DOM element capture (Capture Element)

User clicks the button, then hovers elements on the page. A cyan glow indicates the current target. **Scroll wheel** walks the DOM tree:
- **Wheel up** → parent element
- **Wheel down** → first child element

Click commits the selection. The extension then:
1. Attaches the debugger and emulates the same device metrics the popup had set.
2. Locates the element via XPath (built at click time in [contentScripts/elementHighlighter.js](contentScripts/elementHighlighter.js)).
3. `scrollIntoView({block:"center", inline:"center", behavior:"instant"})` inside a CDP `Runtime.evaluate` call (same channel as the screenshot — minimizes the measure→capture gap so scroll-restoration handlers can't run between the two).
4. If the element exceeds the emulated viewport, expands emulation up to 16384 px (CDP cap) with 64 px padding, re-injects the mutation watcher, re-emulates, settles, re-measures.
5. Takes a viewport screenshot and crops it in JS via `OffscreenCanvas` + `createImageBitmap`.

**Why crop in JS instead of using CDP's `clip` parameter:** CDP page-absolute coordinates drift on sites with custom scroll containers (Facebook), CSS zoom, or CSS transforms. Viewport-relative `getBoundingClientRect` always matches what's on screen. See [screenshots/elementSelect/elementClickListener.js](screenshots/elementSelect/elementClickListener.js) header comment.

### Auto Mode

One-shot per-site capture. The popup's **Auto** button dispatches to [screenshots/autoCapture.js](screenshots/autoCapture.js) which:

1. Runs AdRemover (lazy-refreshes filter cache, injects `contentScripts/adRemover.js`).
2. Picks a site module from hostname (see `SITE_MODULES` in [screenshots/autoCapture.js](screenshots/autoCapture.js)). Currently: Facebook, Instagram, Telegram (t.me), X / Twitter, VK.
3. Injects [contentScripts/sites/_xpath.js](contentScripts/sites/_xpath.js) + the matching `contentScripts/sites/<name>.js`. Each site module is a self-contained IIFE that:
   - Detects the page type (post / story / profile / unknown) from selector matches.
   - Applies in-place DOM cleanup specific to that page type (remove comment-as toolbars, see-more buttons, sidebar panels; set `font-family`; bump `zoom` for profile pages).
   - Resolves `window.__ctaAutoCapturePending` with either `{ mode: "element", xpath }` to target a specific node, or `{ mode: "page" }` to fall through to full-page.
4. Awaits the plan via a second `chrome.scripting.executeScript({func})` call.
5. Dispatches to `captureElement()` (1920×7000 @ user scale, auto-expands per element pipeline) or to `emulateCaptureViewport()` with measured page height.

Unknown hosts (or modules that return `mode: "page"`) capture full-page at the user-selected scale; the documented fallback is 2×.

Site modules are intentionally independent files so adding a host = drop a new file under [contentScripts/sites/](contentScripts/sites/) and add one line to `SITE_MODULES`.

---

## Cleanup

A `cleanup.js` content script is injected before capture when the popup checkbox is on, or on demand via the **Manual** button. Holds a small hand-curated set of per-host selectors and functions (Facebook, Instagram, X, t.me, …) in [contentScripts/cleanup.js](contentScripts/cleanup.js). Scope is hosts where capture quality benefits from a few targeted removals; this is the "DOM-tweak before screenshot" hook.

## AdRemover

EasyList-backed cosmetic-filter remover. The **Remove ADs** button in the popup injects [contentScripts/adRemover.js](contentScripts/adRemover.js), which reads parsed filters from `chrome.storage.local` and removes matching DOM nodes.

Pipeline:
1. **Fetch** ([adRemover/filterSource.js](adRemover/filterSource.js)) — `chrome.runtime.onStartup` and `chrome.runtime.onInstalled` trigger a refresh from `https://easylist.to/easylist/easylist.txt`. Service worker only; no remote JS is fetched.
2. **Parse** ([adRemover/parseEasylist.js](adRemover/parseEasylist.js)) — extracts cosmetic rules (`##selector`, `domain##selector`). Drops exception rules (`#@#`), excluded-domain entries (`~domain##…`), and uBO/ABP procedural pseudo-classes (`:has-text`, `:matches-css`, `:-abp-`, `+js(…)`, etc.) that aren't valid CSS. Output: `{global: string[], domains: {[host]: string[]}}`.
3. **Store** ([adRemover/filterStorage.js](adRemover/filterStorage.js)) — `chrome.storage.local` so filters survive service-worker sleeps.
4. **Lazy refresh** ([adRemover/refreshFilters.js](adRemover/refreshFilters.js)) — `refreshIfStale()` re-fetches if the cached copy is missing or older than 7 days. Called by the `removeAds` action so first use after install works even before the startup fetch finishes.
5. **Apply** ([contentScripts/adRemover.js](contentScripts/adRemover.js)) — matches the current hostname against domain-scoped rule lists (suffix match, so `news.example.com` picks up `example.com` rules), unions with global rules, applies in batches of 500 via `document.querySelectorAll(chunk.join(","))`. If a batch throws (one invalid selector), falls back to one-at-a-time within that batch — fast path stays fast.

Why it stays MV3-safe: the network fetches return *text*, never JS. Parsing happens in the bundled-with-the-extension parser; only CSS selectors are evaluated, and `querySelectorAll` is not code execution. No `eval`, no `Function()`, no remotely-hosted script tags.

Cleanup vs. AdRemover: Cleanup is a small per-host hand-curated list for screenshot framing (hide nav banners, comment sidebars, story bubble tails). AdRemover is generic ad/tracker removal across all sites. They're independent; the user can run both.

---

## Architecture notes

- **Service worker:** [backgroundScript.js](backgroundScript.js). Owns a specific set of message actions (`getPageHeight`, `capturePage`, `captureElement`, `manualCleanup`, `removeAds`, `autoCapture`) and always responds with `{ok: true, ...}` or `{ok: false, error}`. Other listeners (the element-click handler in [screenshots/elementSelect/elementClickListener.js](screenshots/elementSelect/elementClickListener.js)) own their own actions to avoid channel conflicts.
- **Debugger lifecycle:** [support/debugerAttachment.js](support/debugerAttachment.js). Idempotent attach/detach tracked in a `Set`. Auto-recovers from "already attached" via detach+retry. Hooks `chrome.debugger.onDetach` to clear stale state.
- **Mutation settle:** [support/mutationObserver.js](support/mutationObserver.js) + [contentScripts/mutationWatcher.js](contentScripts/mutationWatcher.js). Watcher disconnects any prior watcher via `window.__ctaMutationCleanup` so re-injection doesn't leak observers. The waiter is tab-filtered and has an 8 s timeout fallback — never hangs the worker forever.
- **Shared capture flow:** [screenshots/captureSession.js](screenshots/captureSession.js) exposes `withEmulatedCapture(tabId, deviceMetrics, body)` which handles attach → hide scrollbars → inject watcher → emulate → settle → run body → restore → detach. Used by both page and element capture. The `finally` guarantees teardown even on error.
- **Element highlighter cleanup:** [contentScripts/elementHighlighter.js](contentScripts/elementHighlighter.js) is an IIFE that exposes `window.__ctaHighlighterDestroy` so re-injection cleans up the previous instance instead of double-binding handlers.

---

## Constraints to keep in mind

- **MV3 forbids remote code execution.** Any "external script" feature has to mean *bundled-in-extension* JS files selected at runtime — not code fetched from a URL and `eval`ed. Adblock-style features can fetch *filter lists* (CSS selectors / URL patterns) at runtime and apply them locally; they cannot fetch JS.
- **`chrome.debugger` attach shows the yellow banner** on the target tab while a capture is in flight. Keep capture sessions short and always detach.
- **`Page.captureScreenshot` has a max dimension of 16384 px** per side. The element-capture viewport expansion clamps to this.

---

## Planned (not implemented)

These were in the original spec but do not exist in the codebase. Listed here so future work has a clear target.

### 4K horizontal preset
A 3840×2160 preset for the popup. One-line addition to `presets` in [popup.js:6-11](popup.js#L6-L11) plus a matching radio in [popup.html](popup.html).

### Personal & sensitive data remover
Hides the logged-in user's avatar and name in comment sections on social sites. Per-site selectors; bundled, not remote.

### DOM-killer
Manual-targeting subhelper: click-to-remove specific DOM nodes before capture. Sister to the element highlighter but action = remove instead of action = capture.

### Personal Data Remover step in Auto Mode
Auto Mode currently runs AdRemover + site module only. The planned Personal Data Remover step (hide the logged-in user's own avatar/name in comment sections) hasn't been wired in yet — once it exists it'll slot between steps 1 and 2 in [screenshots/autoCapture.js](screenshots/autoCapture.js).
