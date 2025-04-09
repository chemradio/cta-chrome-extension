import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";
import { emulateCaptureViewport } from "./screenshots/emulatedViewportCapture.js";
import { addElementClickedListener } from "./screenshots/elementSelect/elementClickListener.js";

addElementClickedListener();
createContextMenus();
addContextMenusListener();

chrome.runtime.onInstalled.addListener(() => {});

async function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            if (tabs.length === 0) {
                return reject(new Error("No active tab found."));
            }
            resolve(tabs[0]);
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("Received message:", request);
    // console.log("Sender:", sender);

    (async () => {
        try {
            const targetTab = await getActiveTab();
            const deviceMetrics = {
                width: request.settings.width || 1920,
                height: request.settings.height || 1080,
                deviceScaleFactor: request.settings.deviceScaleFactor || 1,
                mobile: request.settings.mobile || false,
            };

            switch (request.action) {
                case "capturePage":
                    await emulateCaptureViewport(targetTab.id, deviceMetrics);
                    break;
                case "captureElement":
                    // inject the content script to capture a specific element
                    chrome.scripting
                        .executeScript({
                            target: { tabId: targetTab.id },
                            files: ["contentScripts/elementHighlighter.js"],
                        })
                        .then(() => {
                            console.log("Element highlighter script injected.");
                        })
                        .then(() => {
                            chrome.tabs.sendMessage(targetTab.id, {
                                action: "sendDeviceMetrics",
                                deviceMetrics,
                            });
                        });
                    break;
                case "manualCleanup":
                    console.log("Manual Cleanup action received.");
                    break;
                default:
                    console.log(
                        `Unknown action in main bg script: ${request.action}`
                    );
            }
        } catch (error) {
            console.log(
                "Error fetching active tab, probably another listener took care:",
                error
            );
        }
    })();

    return true; // Ensures `sendResponse` stays valid for async execution
});
