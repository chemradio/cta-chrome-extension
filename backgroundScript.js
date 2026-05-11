import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";
import { emulateCaptureViewport } from "./screenshots/emulatedViewportCapture.js";
import { addElementClickedListener } from "./screenshots/elementSelect/elementClickListener.js";
import { refreshFilters, refreshIfStale } from "./adRemover/refreshFilters.js";
import { runAutoCapture } from "./screenshots/autoCapture.js";

addElementClickedListener();
createContextMenus();
addContextMenusListener();

// Hydrate adblock filters on browser start and on install/update. These
// are the two events that fire predictably across a service-worker lifetime;
// "Remove ADs" itself lazily refreshes via refreshIfStale() as a fallback.
const logRefreshFailure = (where) => (e) =>
    console.error(`[CTA] filter refresh on ${where} failed:`, e);

chrome.runtime.onStartup.addListener(() => {
    refreshFilters().catch(logRefreshFailure("startup"));
});
chrome.runtime.onInstalled.addListener(() => {
    refreshFilters().catch(logRefreshFailure("install"));
});

async function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!tabs.length) return reject(new Error("No active tab found."));
            resolve(tabs[0]);
        });
    });
}

function buildTimestampSuffix(url) {
    const domain = new URL(url).hostname;
    const ts = new Date()
        .toISOString()
        .replace(/T/, "-")
        .replace(/:/g, "-")
        .split(".")[0];
    return `${domain}-${ts}`;
}

function getPageHeight(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                func: () => {
                    document.body.style.zoom = "";
                    return Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.offsetHeight,
                        document.body.clientHeight,
                        document.documentElement.clientHeight
                    );
                },
            },
            (results) => {
                if (chrome.runtime.lastError)
                    return reject(new Error(chrome.runtime.lastError.message));
                resolve(results?.[0]?.result);
            }
        );
    });
}

async function handleAction(request) {
    const tab = await getActiveTab();
    const settings = request.settings ?? {};

    const deviceMetrics = {
        width: settings.width || 1920,
        height: settings.height || 1080,
        deviceScaleFactor: settings.deviceScaleFactor || 1,
        mobile: settings.mobile || false,
    };
    const screenshotSuffix = buildTimestampSuffix(tab.url);

    switch (request.action) {
        case "getPageHeight": {
            const pageHeight = await getPageHeight(tab.id);
            return { pageHeight };
        }

        case "capturePage": {
            if (settings.cleanup) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["contentScripts/cleanup.js"],
                });
            }
            await emulateCaptureViewport(
                tab.id,
                deviceMetrics,
                screenshotSuffix
            );
            return {};
        }

        case "captureElement": {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["contentScripts/elementHighlighter.js"],
            });
            await chrome.tabs.sendMessage(tab.id, {
                action: "sendDeviceMetrics",
                deviceMetrics,
                screenshotSuffix,
            });
            return {};
        }

        case "manualCleanup": {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["contentScripts/cleanup.js"],
            });
            return {};
        }

        case "autoCapture": {
            const result = await runAutoCapture({
                tabId: tab.id,
                url: tab.url,
                settings,
                screenshotSuffix,
            });
            return result;
        }

        case "removeAds": {
            // Lazy hydrate covers the install→first-click window where
            // onInstalled's fetch may still be in flight, or the user
            // hasn't restarted Chrome since enabling the extension.
            await refreshIfStale();
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["contentScripts/adRemover.js"],
            });
            return {};
        }

        default:
            // elementClicked is handled by its own dedicated listener
            return null;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle the action set this listener owns. Returning false leaves
    // other listeners (elementClickListener) free to handle their messages
    // without channel-conflict warnings.
    const owned = new Set([
        "getPageHeight",
        "capturePage",
        "captureElement",
        "manualCleanup",
        "removeAds",
        "autoCapture",
    ]);
    if (!owned.has(request?.action)) return false;

    handleAction(request)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => {
            console.error(
                `Background ${request.action} failed:`,
                error
            );
            sendResponse({
                ok: false,
                error: error?.message ?? String(error),
            });
        });

    return true; // async response
});
