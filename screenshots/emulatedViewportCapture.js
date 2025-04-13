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
        console.log("emulate and capture");
        console.log("Attaching debugger...");
        await attachDebugger(tabId);
        console.log("Debugger attached, enabling emulation...");
        await enableEmulation(tabId, deviceMetrics);
        console.log("Emulation enabled, removing scrollbars...");
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const style = document.createElement("style");
                style.id = "hide-scrollbar-style";
                style.innerHTML = `*::-webkit-scrollbar { display: none !important; }`;
                document.head.appendChild(style);
            },
        });
        console.log("Scrollbars removed, injecting mutation watcher...");
        await injectMutationWatcher(tabId);
        console.log("Waiting for mutations to settle...");
        await waitForMutationSettle();
        console.log("Mutations settled, taking screenshot...");
        const screenshot = await takeScreenshotClip(tabId);
        console.log("Screenshot taken, downloading...");
        downloadScreenshot(screenshot, `page-${screenshotSuffix}`);
        console.log("Screenshot downloaded.");
        console.log("Restoring scrollbars");
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const style = document.getElementById("hide-scrollbar-style");
                if (style) style.remove();
            },
        });
    } catch (error) {
        console.error("Error:", error);
    } finally {
        detachDebugger(tabId);
    }
};
