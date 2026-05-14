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
    loadBundledFilters().catch((e) =>
        console.error("[CTA] bundled-filter load failed:", e)
    );
});

// Pull the in-repo curated filter list into storage so adRemover can read it
// alongside EasyList + userFilters. Runs on install AND every extension update
// — that's how new versions of the bundled list propagate to users.
async function loadBundledFilters() {
    const url = chrome.runtime.getURL("filters/bundledFilters.json");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
    const data = await res.json();
    const bundledFilters = {
        global: Array.isArray(data.global) ? data.global : [],
        domains: data.domains && typeof data.domains === "object" ? data.domains : {},
    };
    await chrome.storage.local.set({ bundledFilters });
    const hostCount = Object.keys(bundledFilters.domains).length;
    console.log(
        `[CTA] bundled filters loaded: ${bundledFilters.global.length} global, ` +
            `${hostCount} domain entries`
    );
}

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

// chrome://, edge://, chrome-extension://, the Web Store, view-source:, file: (when
// "Allow access to file URLs" is off), etc. — chrome.scripting.executeScript fails
// on all of these. Detect upfront so we don't surface scary-looking errors for
// expected restrictions.
function isRestrictedUrl(url) {
    if (!url) return true;
    return /^(chrome|edge|about|chrome-extension|chrome-search|chrome-untrusted|devtools|view-source):/i.test(url)
        || /^https?:\/\/chromewebstore\.google\.com\//i.test(url)
        || /^https?:\/\/chrome\.google\.com\/webstore\//i.test(url);
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

// Unified cleanup: EasyList ad selectors + per-host hand-curated cleanup +
// user-collected DOM-killer selectors. Used by the popup's "Manual" button
// and the "Cleanup before capture" checkbox.
async function runCleanup(tabId) {
    // Lazy-hydrate filters in case onInstalled/onStartup fetch hasn't landed.
    await refreshIfStale().catch((e) =>
        console.warn("[CTA] refreshIfStale failed:", e)
    );
    const adResults = await chrome.scripting.executeScript({
        target: { tabId },
        files: ["contentScripts/adRemover.js"],
    });
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["contentScripts/cleanup.js"],
    });
    return adResults?.[0]?.result ?? null;
}

async function readUserFilters() {
    const { userFilters, userGlobalFilters } =
        await chrome.storage.local.get(["userFilters", "userGlobalFilters"]);
    return {
        map: userFilters ?? {},
        global: Array.isArray(userGlobalFilters) ? userGlobalFilters : [],
    };
}

// Dump userFilters as a downloadable JSON in the same shape as
// filters/bundledFilters.json — so the dev can merge promising entries
// straight into the bundled file for the next extension release.
async function exportUserFilters() {
    const { map: domains, global } = await readUserFilters();
    const hostCount     = Object.keys(domains).length;
    const selectorCount = global.length + Object.values(domains)
        .reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);

    if (selectorCount === 0) {
        return { selectorCount: 0, hostCount: 0 };
    }

    const payload = {
        _exportedAt: new Date().toISOString(),
        _shape: "matches filters/bundledFilters.json — drop entries from `global` / `domains` into the bundled file",
        global,
        domains,
    };
    const json = JSON.stringify(payload, null, 4);
    const dataUrl =
        "data:application/json;charset=utf-8;base64," +
        btoa(unescape(encodeURIComponent(json)));
    const stamp = new Date()
        .toISOString()
        .replace(/T/, "-")
        .replace(/:/g, "-")
        .split(".")[0];

    await chrome.downloads.download({
        url: dataUrl,
        filename: `cta-userFilters-${stamp}.json`,
        saveAs: true,
    });

    return { selectorCount, hostCount };
}

async function listUserFilters(host) {
    const { map, global } = await readUserFilters();
    return {
        host,
        selectors:       map[host] ?? [],
        globalSelectors: global,
    };
}

async function addUserFilter(host, selector, scope) {
    const sel = (selector ?? "").trim();
    if (!sel) throw new Error("Empty selector");
    const { map, global } = await readUserFilters();

    if (scope === "global") {
        const added = !global.includes(sel);
        if (added) {
            global.push(sel);
            await chrome.storage.local.set({ userGlobalFilters: global });
        }
        return { host, selectors: map[host] ?? [], globalSelectors: global, added };
    }

    if (!host) throw new Error("No host");
    const list = map[host] ?? [];
    const added = !list.includes(sel);
    if (added) {
        list.push(sel);
        map[host] = list;
        await chrome.storage.local.set({ userFilters: map });
    }
    return { host, selectors: list, globalSelectors: global, added };
}

async function removeUserFilter(host, selector, scope) {
    const { map, global } = await readUserFilters();

    if (scope === "global") {
        const next = global.filter((s) => s !== selector);
        await chrome.storage.local.set({ userGlobalFilters: next });
        return { host, selectors: map[host] ?? [], globalSelectors: next };
    }

    const list = (map[host] ?? []).filter((s) => s !== selector);
    if (list.length === 0) delete map[host];
    else map[host] = list;
    await chrome.storage.local.set({ userFilters: map });
    return { host, selectors: list, globalSelectors: global };
}

async function clearDomainFilters() {
    const { map } = await readUserFilters();
    const hostCount = Object.keys(map).length;
    const selectorCount = Object.values(map)
        .reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    await chrome.storage.local.set({ userFilters: {} });
    return { selectorCount, hostCount };
}

async function clearGlobalFilters() {
    const { global } = await readUserFilters();
    const selectorCount = global.length;
    await chrome.storage.local.set({ userGlobalFilters: [] });
    return { selectorCount };
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
            if (isRestrictedUrl(tab.url)) return { pageHeight: null };
            const pageHeight = await getPageHeight(tab.id);
            return { pageHeight };
        }

        case "capturePage": {
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
            const stats = await runCleanup(tab.id);
            return { stats };
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

        case "domKiller": {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["contentScripts/domKiller.js"],
            });
            return {};
        }

        case "exportFilters": {
            return await exportUserFilters();
        }

        case "clearDomainFilters": {
            return await clearDomainFilters();
        }

        case "clearGlobalFilters": {
            return await clearGlobalFilters();
        }

        case "listUserFilters": {
            const host = new URL(tab.url).hostname.toLowerCase();
            return await listUserFilters(host);
        }

        case "addUserFilter": {
            const host = new URL(tab.url).hostname.toLowerCase();
            return await addUserFilter(host, request.selector, request.scope);
        }

        case "removeUserFilter": {
            const host = new URL(tab.url).hostname.toLowerCase();
            return await removeUserFilter(host, request.selector, request.scope);
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
        "autoCapture",
        "exportFilters",
        "clearDomainFilters",
        "clearGlobalFilters",
        "listUserFilters",
        "addUserFilter",
        "removeUserFilter",
        "domKiller",
        "domKillerEnded",
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
