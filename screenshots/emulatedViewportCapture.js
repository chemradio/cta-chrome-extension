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

export const emulateCaptureViewport = async (tabId, deviceMetrics = {}) => {
    // return;
    try {
        console.log("emulate and capture");
        console.log("Attaching debugger...");
        await attachDebugger(tabId);
        console.log("Debugger attached, enabling emulation...");
        await enableEmulation(tabId, deviceMetrics);
        console.log("Emulation enabled, waiting for mutations...");
        await injectMutationWatcher(tabId);
        console.log("Waiting for mutations to settle...");
        await waitForMutationSettle();
        console.log("Mutations settled, taking screenshot...");
        const screenshot = await takeScreenshotClip(tabId);
        console.log("Screenshot taken, downloading...");
        downloadScreenshot(screenshot, "final-screenshot");
        console.log("Screenshot downloaded.");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        detachDebugger(tabId);
    }
};
