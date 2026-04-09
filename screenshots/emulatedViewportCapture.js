import {
    attachDebugger,
    detachDebugger,
} from "../support/debugerAttachment.js";
import { enableEmulation } from "./emulation/emulationEnabler.js";
import {
    injectMutationWatcher,
    waitForMutationSettle,
} from "../support/mutationObserver.js";
import { takeScreenshotClip } from "./capture/captureScreenshot.js";
import { downloadScreenshot } from "./capture/downloadScreenshot.js";

export const emulateCaptureViewport = async (
    tabId,
    deviceMetrics = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false,
    },
    screenshotSuffix = ""
) => {
    try {
        await attachDebugger(tabId);

        // Hide scrollbars before emulation to avoid layout shift
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                if (document.getElementById("__cta-no-scroll")) return;
                const s = document.createElement("style");
                s.id = "__cta-no-scroll";
                s.textContent =
                    "*::-webkit-scrollbar { display: none !important; }";
                document.head.appendChild(s);
            },
        });

        // Inject mutation watcher BEFORE emulation so it catches the reflow
        await injectMutationWatcher(tabId);

        await enableEmulation(tabId, deviceMetrics);

        // Wait for page to settle after emulation-triggered reflow
        await waitForMutationSettle();

        const screenshot = await takeScreenshotClip(tabId);
        downloadScreenshot(screenshot, `page-${screenshotSuffix}`);
    } catch (error) {
        console.error("Page capture failed:", error);
    } finally {
        chrome.scripting
            .executeScript({
                target: { tabId },
                func: () =>
                    document.getElementById("__cta-no-scroll")?.remove(),
            })
            .catch(() => {});

        detachDebugger(tabId);
    }
};
