// Auto Mode orchestrator.
//
// Pipeline:
//   1. Run AdRemover (lazy-refresh filters, inject adRemover.js).
//   2. Pick a site module by hostname.
//   3. If a module matches, inject _xpath.js + the site script and await
//      window.__ctaAutoCapturePending — site modules resolve this with
//      { mode: "element", xpath } or { mode: "page" }.
//   4. Dispatch to element capture (existing pipeline) or full-page capture.
//
// Unknown hosts (or modules that return { mode: "page" }) fall through to
// Full Page @ user-selected scale. Per CLAUDE.md the documented fallback is
// 2× — honoring the popup's scale lets the user override that without
// editing code.

import { emulateCaptureViewport } from "./emulatedViewportCapture.js";
import { captureElement } from "./elementSelect/elementClickListener.js";
import { refreshIfStale } from "../adRemover/refreshFilters.js";

// hostname → site module file (under contentScripts/sites/<name>.js)
const SITE_MODULES = {
    "www.facebook.com": "facebook",
    "facebook.com": "facebook",
    "m.facebook.com": "facebook",
    "www.instagram.com": "instagram",
    "instagram.com": "instagram",
    "t.me": "telegram",
    "x.com": "x",
    "www.x.com": "x",
    "twitter.com": "x",
    "www.twitter.com": "x",
    "vk.com": "vk",
    "www.vk.com": "vk",
    "m.vk.com": "vk",
};

const FULL_PAGE_HEIGHT_CAP = 16000; // CDP cap is 16384; leave headroom

function pickModule(hostname) {
    return SITE_MODULES[hostname] ?? null;
}

function measurePageHeight(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                func: () =>
                    Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.offsetHeight,
                        document.body.clientHeight,
                        document.documentElement.clientHeight
                    ),
            },
            (results) => {
                if (chrome.runtime.lastError)
                    return reject(new Error(chrome.runtime.lastError.message));
                resolve(results?.[0]?.result ?? 9999);
            }
        );
    });
}

async function runAdRemover(tabId) {
    try {
        await refreshIfStale();
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["contentScripts/adRemover.js"],
        });
    } catch (e) {
        // Ad removal is best-effort. A failure here shouldn't block capture.
        console.warn("[CTA] Auto: ad removal step failed:", e);
    }
}

async function loadSiteModule(tabId, moduleName) {
    await chrome.scripting.executeScript({
        target: { tabId },
        files: [
            "contentScripts/sites/_xpath.js",
            `contentScripts/sites/${moduleName}.js`,
        ],
    });

    const [{ result: plan }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.__ctaAutoCapturePending,
    });
    return plan;
}

async function captureFullPage(tabId, scale, screenshotSuffix) {
    const pageHeight = await measurePageHeight(tabId);
    await emulateCaptureViewport(
        tabId,
        {
            width: 1920,
            height: Math.min(pageHeight, FULL_PAGE_HEIGHT_CAP),
            deviceScaleFactor: scale,
            mobile: false,
        },
        screenshotSuffix
    );
}

export async function runAutoCapture({ tabId, url, settings, screenshotSuffix }) {
    const scale = settings.deviceScaleFactor || 2;

    await runAdRemover(tabId);

    const host = new URL(url).hostname;
    const moduleName = pickModule(host);

    if (!moduleName) {
        console.log(`[CTA] Auto: no module for ${host} — full page @ ${scale}×`);
        await captureFullPage(tabId, scale, `auto-${screenshotSuffix}`);
        return { mode: "page-fallback", host };
    }

    console.log(`[CTA] Auto: ${host} → module ${moduleName}`);
    const plan = await loadSiteModule(tabId, moduleName);

    if (plan?.mode === "element" && plan.xpath) {
        await captureElement({
            tabId,
            xpath: plan.xpath,
            // 1920×7000 viewport gives most posts room without expansion;
            // the element pipeline auto-expands up to 16384px if needed.
            deviceMetrics: {
                width: 1920,
                height: 7000,
                deviceScaleFactor: scale,
                mobile: false,
            },
            screenshotSuffix: `auto-${moduleName}-${screenshotSuffix}`,
        });
        return { mode: "element", module: moduleName };
    }

    await captureFullPage(tabId, scale, `auto-${moduleName}-${screenshotSuffix}`);
    return { mode: "page", module: moduleName };
}
