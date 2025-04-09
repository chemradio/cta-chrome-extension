import { enableEmulation } from "../emulation/emulationEnabler.js";
import {
    attachDebugger,
    detachDebugger,
} from "../../support/debugerAttachment.js";
import { takeScreenshotClip } from "../capture/captureScreenshot.js";
import { downloadScreenshot } from "../capture/downloadScreenshot.js";
import { injectMutationWatcher } from "../../support/mutationObserver.js";
import { waitForMutationSettle } from "../../support/mutationObserver.js";

export const addElementClickedListener = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "elementClicked") {
            const elementSignature = request.elementSignature;

            (async () => {
                await attachDebugger(sender.tab.id);
                await enableEmulation(sender.tab.id, request.deviceMetrics);
                await injectMutationWatcher(sender.tab.id);
                await waitForMutationSettle();

                sendResponse({
                    action: "getElementRect",
                    elementSignature: elementSignature,
                });
            })();

            // attachDebugger(sender.tab.id).then(() => {
            //     enableEmulation(sender.tab.id, request.deviceMetrics).then(
            //          () => {
            //             console.log("Emulation enabled for element click.");
            //             await injectMutationWatcher(tabId);
            //             console.log("Waiting for mutations to settle...");
            //             await waitForMutationSettle();

            //             // ✅ Send response back to content script
            //             sendResponse({
            //                 action: "getElementRect",
            //                 elementSignature: elementSignature,
            //             });
            //         }
            //     );
            // });
        } else if (request.action === "captureCropScreenshot") {
            console.log("capture crop init!!!!!!!!!!!.");
            console.log(request.cropRect);
            (async () => {
                // await new Promise((resolve) => setTimeout(resolve, 5000));
                console.log("Taking screenshot...");
                const screenshot = await takeScreenshotClip(
                    sender.tab.id,
                    request.cropRect
                );
                console.log("Screenshot taken, downloading...");
                downloadScreenshot(screenshot, "element-screenshot");
                console.log("Screenshot downloaded.");
                detachDebugger(sender.tab.id);
            })();
            // Capture the screenshot of the specified element
            // Perform any cleanup actions here if needed
        }
        return true; // Keep the message channel open for sendResponse
    });
};
