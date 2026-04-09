import { enableEmulation } from "../emulation/emulationEnabler.js";
import {
    attachDebugger,
    detachDebugger,
} from "../../support/debugerAttachment.js";
import { takeScreenshotClip } from "../capture/captureScreenshot.js";
import { downloadScreenshot } from "../capture/downloadScreenshot.js";
import {
    injectMutationWatcher,
    waitForMutationSettle,
} from "../../support/mutationObserver.js";

// ─── Canvas crop ─────────────────────────────────────────────────────────────
//
// We take a FULL viewport screenshot and crop here in the service worker.
// This avoids CDP clip coordinate ambiguity (page-absolute vs viewport-relative
// differs on sites with custom scroll containers, CSS zoom, or transforms).
// viewport-relative getBoundingClientRect() is always exactly what's on screen.
// ---------------------------------------------------------------------------

async function cropScreenshot(base64, rect, dpr) {
    const x = Math.round(rect.left * dpr);
    const y = Math.round(rect.top * dpr);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    const maxW = Math.round(rect.viewportWidth * dpr);
    const maxH = Math.round(rect.viewportHeight * dpr);

    const cx = Math.max(0, Math.min(x, maxW - 1));
    const cy = Math.max(0, Math.min(y, maxH - 1));
    const cw = Math.max(1, Math.min(w, maxW - cx));
    const ch = Math.max(1, Math.min(h, maxH - cy));

    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob, cx, cy, cw, ch);

    const canvas = new OffscreenCanvas(cw, ch);
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();

    const outBlob = await canvas.convertToBlob({ type: "image/png" });
    const buf = await outBlob.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // Chunked btoa to avoid call-stack overflow on large images
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

// ─── Listener ─────────────────────────────────────────────────────────────────

export const addElementClickedListener = () => {
    chrome.runtime.onMessage.addListener((request, sender) => {
        if (request.action !== "elementClicked") return false;

        const tabId = sender.tab.id;
        const dpr = request.deviceMetrics?.deviceScaleFactor ?? 1;

        (async () => {
            try {
                await attachDebugger(tabId);

                // Watcher BEFORE emulation — catches the layout reflow it triggers
                await injectMutationWatcher(tabId);
                await enableEmulation(tabId, request.deviceMetrics);

                // Hide scrollbars so they don't show up in the element crop
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        if (document.getElementById("__cta-no-scroll")) return;
                        const s = document.createElement("style");
                        s.id = "__cta-no-scroll";
                        s.textContent =
                            "*::-webkit-scrollbar{display:none!important}";
                        document.head.appendChild(s);
                    },
                });

                await waitForMutationSettle();

                // ── Measure element ────────────────────────────────────────────
                //
                // IMPORTANT: NO requestAnimationFrame wait here.
                // scrollIntoView(instant) is synchronous and getBoundingClientRect
                // forces a layout flush — we have an accurate measurement without
                // waiting for compositing.
                //
                // Waiting rAFs lets the page's scroll-restoration JS fire (e.g.
                // Facebook resets scroll on every rAF), which shifts the viewport
                // between our measurement and the screenshot.  Zero rAF wait
                // means the screenshot is dispatched before the next frame runs.
                // ──────────────────────────────────────────────────────────────
                const [{ result: viewportRect }] =
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (xpath, fallback) => {
                            try {
                                const el = document.evaluate(
                                    xpath,
                                    document,
                                    null,
                                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                                    null
                                ).singleNodeValue;
                                if (!el) return fallback;

                                // Synchronous scroll — no rAF, no async gap
                                el.scrollIntoView({
                                    block: "center",
                                    inline: "center",
                                    behavior: "instant",
                                });

                                // getBoundingClientRect forces layout sync
                                const rect = el.getBoundingClientRect();

                                return {
                                    left: rect.left,
                                    top: rect.top,
                                    width: rect.width,
                                    height: rect.height,
                                    viewportWidth: window.innerWidth,
                                    viewportHeight: window.innerHeight,
                                };
                            } catch (e) {
                                return fallback;
                            }
                        },
                        args: [request.xpath, request.elementRect],
                    });

                console.log(
                    "[CTA] viewport rect after emulation:",
                    JSON.stringify(viewportRect),
                    "dpr:", dpr
                );

                if (
                    !viewportRect ||
                    viewportRect.width <= 0 ||
                    viewportRect.height <= 0
                ) {
                    throw new Error("Could not locate element after emulation");
                }

                // Take screenshot IMMEDIATELY — minimum gap before page can scroll
                const fullshot = await takeScreenshotClip(tabId);

                console.log(
                    "[CTA] crop px:",
                    Math.round(viewportRect.left * dpr),
                    Math.round(viewportRect.top * dpr),
                    Math.round(viewportRect.width * dpr),
                    "×",
                    Math.round(viewportRect.height * dpr)
                );

                const cropped = await cropScreenshot(fullshot, viewportRect, dpr);
                downloadScreenshot(
                    cropped,
                    `element-${request.screenshotSuffix}`
                );
            } catch (error) {
                console.error("[CTA] Element capture failed:", error);
            } finally {
                chrome.scripting
                    .executeScript({
                        target: { tabId },
                        func: () =>
                            document
                                .getElementById("__cta-no-scroll")
                                ?.remove(),
                    })
                    .catch(() => {});

                detachDebugger(tabId);
            }
        })();

        return true;
    });
};
