import { enableEmulation } from "../emulation/emulationEnabler.js";
import { attachDebugger } from "../../support/debugerAttachment.js";

export const addElementClickedListener = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "elementClicked") {
            console.log("Element clicked:", request);
            console.log("Sender:", sender);
            const elementSignature = request.elementSignature;

            attachDebugger(sender.tab.id).then(() => {
                enableEmulation(sender.tab.id, request.deviceMetrics).then(
                    () => {
                        console.log("Emulation enabled for element click.");
                    }
                );
            });

            // const element = document.querySelector(request.selector);
            // if (element) {
            //     element.click();
            //     sendResponse({ success: true });
            // } else {
            //     sendResponse({ success: false, error: "Element not found" });
            // }
        }
    });
};
