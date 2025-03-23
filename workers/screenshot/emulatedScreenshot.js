import { enableEmulation, disableEmulation } from "./helpers/emulation.js";
import { captureScreenshot } from "./helpers/capture_download.js";

export function emulateAndCapture(tabId, emulationProps, clipOptions = {}) {
    chrome.debugger.attach({ tabId: tabId }, "1.3", () => {
        enableEmulation(tabId, emulationProps);

        // how to wait .5 seconds? before proceeding?

        setTimeout(() => {
            console.log("starting capture");
            captureScreenshot(tabId, "node_screenshot", clipOptions);
            setTimeout(() => {
                console.log("disabling emulation");

                disableEmulation(tabId);
                setTimeout(() => {
                    console.log("detaching debugger");
                    chrome.debugger.detach({ tabId: tabId });
                }, 500);
            }, 500);
        }, 2000);
    });
}
