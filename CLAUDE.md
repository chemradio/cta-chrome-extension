# CTA Screenshot Helper — Claude Context

Chrome MV3 extension for high-resolution page and element screenshots. Used for MotionGFX / CTA asset creation.

## Architecture

**Entry points:**
- `backgroundScript.js` — service worker, routes all messages
- `popup.html` / `popup.js` — extension UI
- `contentScripts/elementHighlighter.js` — injected on demand for element selection
- `contentScripts/cleanup.js` — injected on demand to strip ads/UI chrome
- `contentScripts/mutationWatcher.js` — injected to detect page settle after emulation

**Screenshot pipeline:**

Full page:
```
popup → background → [cleanup.js?] → emulatedViewportCapture.js
  → attachDebugger → injectMutationWatcher → enableEmulation → waitForMutationSettle
  → Page.captureScreenshot → download → detachDebugger
```

Element:
```
popup → background → injects elementHighlighter.js → sendDeviceMetrics
  → user clicks element → elementClicked message (xpath + rect)
  → elementClickListener.js:
      attachDebugger → injectMutationWatcher → enableEmulation → waitForMutationSettle
      → executeScript(re-measure element by xpath) → Page.captureScreenshot(clip) → download
      → detachDebugger
```

## Key design decisions

- **No DOM manipulation during element capture.** The element is measured in-place and the screenshot is cropped in the service worker. Earlier approach of cloning/removing DOM was unreliable.
- **Element capture uses viewport screenshot + canvas crop, not CDP clip.** After emulation, the element is scrolled to the centre of the viewport (`scrollIntoView({ block:'center', behavior:'instant' })`), a full viewport screenshot is taken, then `createImageBitmap(blob, x, y, w, h)` crops it in the service worker using `OffscreenCanvas`. This is immune to custom scroll containers (e.g. Facebook), CSS zoom, and CSS transforms — all of which cause `getBoundingClientRect + scrollX/Y` to drift from CDP's page-coordinate system.
- **Mutation watcher injected BEFORE `enableEmulation`** so it catches the reflow triggered by the viewport change (not after, when reflow may already be done).
- **`elementHighlighter.js` is wrapped in an IIFE.** Chrome re-injects the file into the same isolated world context on each `executeScript` call. Top-level `let` declarations throw "Cannot redeclare" on the second injection. The IIFE creates a fresh scope each time. `window.__ctaHighlighterDestroy` on the shared `window` handles cross-injection cleanup.
- **`deviceScaleFactor` from emulation handles resolution** (2x, 4x). Crop coordinates are scaled by `dpr` to get physical pixel offsets into the screenshot.

## File map

| File | Role |
|------|------|
| `manifest.json` | MV3 config, permissions: debugger, downloads, tabs, scripting, contextMenus |
| `backgroundScript.js` | Message router, capturePage / captureElement / manualCleanup / getPageHeight |
| `popup.js` / `popup.html` / `popup.css` | UI: layout presets, scale factor, cleanup toggle |
| `contentScripts/elementHighlighter.js` | Element selection UI (mouseover glow, wheel to traverse DOM, click to capture) |
| `contentScripts/cleanup.js` | Site-specific DOM cleanup: Facebook, Instagram, Telegram, X, VK |
| `contentScripts/mutationWatcher.js` | MutationObserver IIFE; sends `MUTATIONS_FINISHED` after 800ms debounce or 5s max |
| `screenshots/emulatedViewportCapture.js` | Full-page capture orchestrator |
| `screenshots/elementSelect/elementClickListener.js` | Element capture handler (background side) |
| `screenshots/capture/captureScreenshot.js` | CDP `Page.captureScreenshot` wrapper |
| `screenshots/capture/downloadScreenshot.js` | `chrome.downloads.download` wrapper |
| `screenshots/emulation/emulationEnabler.js` | CDP `Emulation.setDeviceMetricsOverride` wrapper |
| `screenshots/emulation/emulationOptions.js` | Named presets: FullHD, Vertical 5k/7k, Maps 4k |
| `support/debugerAttachment.js` | `attachDebugger` / `detachDebugger` wrappers |
| `support/mutationObserver.js` | `injectMutationWatcher` + `waitForMutationSettle` (background side) |
| `contextMenus/createContextMenus.js` | Registers right-click menu items |
| `contextMenus/contextMenuListener.js` | Handles right-click: element capture or preset page capture |
| `legacy/` | Old code — do not use or revive |

## Permissions
- `debugger` — required for CDP (`Page.captureScreenshot`, `Emulation.setDeviceMetricsOverride`)
- `downloads` — save PNG files
- `scripting` — inject content scripts
- `activeTab` / `tabs` — get the active tab
- `contextMenus` — right-click menu

## Cleanup DB (cleanup.js)
Keyed by `window.location.hostname`. Each entry has `static` (CSS selectors to remove) and `funcs` (custom DOM manipulation functions). Wrapped in try/catch so individual failures don't abort cleanup.
