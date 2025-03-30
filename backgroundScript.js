import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";
import { emulateCaptureViewport } from "./screenshots/emulatedViewportCapture.js";

createContextMenus();
addContextMenusListener();

chrome.runtime.onInstalled.addListener(() => {});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request);
    console.log("Sender:", sender);

    let targetTab;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            console.log("Tabs:", tabs);
            targetTab = tabs[0];
        }
    });
    console.log("Target tab:", targetTab);
    console.log("url:", targetTab.url);
    console.log("tabId:", targetTab.id);

    return;
    const requestAction = request.action;
    if (!requestAction) {
        console.log("No action specified in the request.");
        return;
    }

    switch (requestAction) {
        case "capturePage":
            // Handle capturePage action
            emulateCaptureViewport(targetTab.id);
            break;
        case "captureElement":
            // Handle captureElement action
            console.log("Capture Element action received.");
            break;
        case "manualCleanup":
            // Handle manualCleanup action
            console.log("Manual Cleanup action received.");
            break;
        default:
            console.log(`Unknown action: ${requestAction}`);
    }
});
