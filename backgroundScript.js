import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";
import { emulateCaptureViewport } from "./screenshots/emulatedViewportCapture.js";

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
    console.log("Received message:", request);
    console.log("Sender:", sender);

    (async () => {
        try {
            const targetTab = await getActiveTab();
            console.log("Target tab:", targetTab);
            console.log("URL:", targetTab.url);
            console.log("Tab ID:", targetTab.id);

            switch (request.action) {
                case "capturePage":
                    const deviceMetrics = {
                        width: request.settings.width || 1920,
                        height: request.settings.height || 1080,
                        deviceScaleFactor:
                            request.settings.deviceScaleFactor || 1,
                        mobile: request.settings.mobile || false,
                    };
                    await emulateCaptureViewport(targetTab.id, deviceMetrics);
                    break;
                case "captureElement":
                    console.log("Capture Element action received.");
                    break;
                case "manualCleanup":
                    console.log("Manual Cleanup action received.");
                    break;
                default:
                    console.log(`Unknown action: ${request.action}`);
            }
        } catch (error) {
            console.error("Error fetching active tab:", error);
        }
    })();

    return true; // Ensures `sendResponse` stays valid for async execution
});
