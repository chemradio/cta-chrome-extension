import {
    attachDebugger,
    detachDebugger,
} from "../support/debugerAttachment.js";
import { enableEmulation, clearEmulation } from "./emulation/emulationEnabler.js";
import {
    injectMutationWatcher,
    waitForMutationSettle,
} from "../support/mutationObserver.js";

const SCROLLBAR_STYLE_ID = "__no-scroll";

const hideScrollbars = (tabId) =>
    chrome.scripting.executeScript({
        target: { tabId },
        func: (id) => {
            if (document.getElementById(id)) return;
            const s = document.createElement("style");
            s.id = id;
            s.textContent =
                "*::-webkit-scrollbar { display: none !important; }";
            document.head.appendChild(s);
        },
        args: [SCROLLBAR_STYLE_ID],
    });

const restoreScrollbars = (tabId) =>
    chrome.scripting
        .executeScript({
            target: { tabId },
            func: (id) => document.getElementById(id)?.remove(),
            args: [SCROLLBAR_STYLE_ID],
        })
        .catch(() => {});

// Run `body` inside an emulated-viewport debugger session. Handles attach,
// scrollbar hide, mutation watcher injection (BEFORE emulation so it catches
// the reflow), emulation, settle wait, then teardown. Errors propagate.
export const withEmulatedCapture = async (tabId, deviceMetrics, body) => {
    await attachDebugger(tabId);
    try {
        await hideScrollbars(tabId);
        await injectMutationWatcher(tabId);
        await enableEmulation(tabId, deviceMetrics);
        await waitForMutationSettle(tabId);
        return await body();
    } finally {
        await restoreScrollbars(tabId);
        await clearEmulation(tabId);
        await detachDebugger(tabId);
    }
};
