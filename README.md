# CTA Screenshot Helper

Chrome extension for capturing high-resolution, clean screenshots of web pages and individual elements. Built for MotionGFX / CTA asset creation.

## Features

- **Full page screenshots** — captures the entire page at any resolution with configurable device scale (1x–4x)
- **Element screenshots** — interactively select any DOM element; hover to highlight, scroll wheel to traverse the tree, click to capture
- **Page cleanup** — removes ads, navigation bars, popups, and UI chrome before capture (Facebook, Instagram, Telegram, X, VK)
- **Device emulation** — sets exact viewport dimensions via Chrome DevTools Protocol so the page renders at precisely the resolution you need
- **Context menu** — right-click shortcuts for common presets

## Installation

1. Clone or download this repo
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** and select the extension folder

## Usage

### Popup controls

**Layout & Resolution**
- `Horizontal` — 1920×1080
- `Vertical` — 1920×7000
- `Full Page` — 1920 × auto-detected page height (up to 9999px)
- `Custom` — enter any dimensions (300–9999px)

**Scale Factor** — 1x / 2x / 3x / 4x maps to `deviceScaleFactor` in Chrome emulation. 2x is standard "retina" quality.

**Cleanup** — when checked, runs site-specific cleanup (removes nav bars, sidebars, comment UI, etc.) before the screenshot is taken.

### Capture Page
Takes a full-page screenshot at the configured resolution and scale. Downloads as `page-{domain}-{timestamp}.png`.

### Capture Single Element
1. Click **Capture Single Element** — the cursor changes and elements glow cyan on hover
2. Hover over the element you want
3. Use the **scroll wheel** to move up (parent) or down (first child) in the DOM tree
4. **Click** to capture — downloads as `element-{domain}-{timestamp}.png`

### Manual Cleanup
Runs the cleanup script for the current site without taking a screenshot. Useful for previewing what gets removed.

### Context menu
Right-click anywhere on a page:
- **Element Screenshot** — starts element selection (same as popup button, uses 1920×1080 @ 2x)
- **Screenshot: FullHD x2** — full page at 1920×1080 @ 2x
- **Screenshot: Vertical 5k x2 / x4** — full page at 1920×5000
- **Screenshot: Vertical 7k x2** — full page at 1920×7000
- **Screenshot: Maps 4k_4k x2** — full page at 4000×4000 @ 2x

## Supported cleanup sites

| Site | What's removed |
|------|---------------|
| facebook.com | Top navigation banner, sticky wrappers, voice comment toolbar |
| instagram.com | Comment sidebar panel, "comment as" section |
| t.me (Telegram) | Avatar, bubble tail, border/padding from message widget |
| x.com | Trending sidebar, account menu, floating sidebar panels |

## How it works

The extension uses Chrome's DevTools Protocol (CDP) via `chrome.debugger`:

1. Attach debugger to the active tab
2. Set viewport with `Emulation.setDeviceMetricsOverride` (width, height, deviceScaleFactor)
3. Wait for the page to re-render and settle (MutationObserver with 800ms debounce)
4. Capture with `Page.captureScreenshot`
5. Detach debugger and download the PNG

For element captures, the element's position is re-measured after emulation (viewport change shifts layout), then passed as a clip region to `Page.captureScreenshot`.
