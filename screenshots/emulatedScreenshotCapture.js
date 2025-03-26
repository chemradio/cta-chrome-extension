import {
    attachDebugger,
    detachDebugger,
} from "../support/debugerAttachment.js";
import { enableEmulation } from "./emulation/emulationEnabler.js";
import {
    injectMutationWatcher,
    waitForMutationSettle,
} from "../support/mutationObserver.js";
// import { takeScreenshotClip } from "./capture/captureScreenshot";
// import { downloadScreenshot } from "./capture/downloadScreenshot";

export const emulateAndCapture = async (tabId) => {
    // try {
    //     await attachDebugger(tabId);
    //     await enableEmulation(tabId, {
    //         width: 375,
    //         height: 667,
    //         deviceScaleFactor: 1,
    //         mobile: false,
    //     });
    //     await injectMutationWatcher(tabId);
    //     console.log("Waiting for mutations to settle...");
    //     await waitForMutationSettle();
    //     const screenshot = await takeScreenshotClip(tabId);
    //     downloadScreenshot(screenshot, "final-screenshot.png");
    // } catch (error) {
    //     console.error("Error:", error);
    // } finally {
    //     detachDebugger(tabId);
    // }
};
