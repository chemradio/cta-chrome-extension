import { enableEmulation } from "../emulation/emulationEnabler.js";
import {
    attachDebugger,
    detachDebugger,
} from "../../support/debugerAttachment.js";
import { takeScreenshotClip } from "../capture/captureScreenshot.js";
import { downloadScreenshot } from "../capture/downloadScreenshot.js";
export const addElementClickedListener = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "elementClicked") {
            const elementSignature = request.elementSignature;

            attachDebugger(sender.tab.id).then(() => {
                enableEmulation(sender.tab.id, request.deviceMetrics).then(
                    () => {
                        console.log("Emulation enabled for element click.");

                        // ✅ Send response back to content script
                        sendResponse({
                            action: "getElementRect",
                            elementSignature: elementSignature,
                        });
                    }
                );
            });

            return true; // ✅ Keep sendResponse alive for async
        } else if (request.action === "captureCropScreenshot") {
            console.log("capture crop init!!!!!!!!!!!.");
            console.log(request.cropRect);
            (async () => {
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
    });
};
