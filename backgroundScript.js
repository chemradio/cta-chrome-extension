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
                width: request.settings?.width || 1920,
                height: request.settings?.height || 1080,
                deviceScaleFactor: request.settings?.deviceScaleFactor || 1,
                mobile: request.settings?.mobile || false,
            };
            const domainName = new URL(targetTab.url).hostname;
            const currentDate = new Date();
            const timestamp = currentDate
                .toISOString()
                .replace(/T/, "-")
                .replace(/:/g, "-")
                .split(".")[0];
            const screenshotSuffix = `${domainName}-${timestamp}`;

            switch (request.action) {
                case "getPageHeight":
                    // Send a message to the content script to get the page height
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: targetTab.id },
                            func: () => {
                                document.body.style.zoom = "100%";
                                return Math.max(
                                    document.body.scrollHeight,
                                    document.documentElement.scrollHeight,
                                    document.body.offsetHeight,
                                    document.documentElement.offsetHeight,
                                    document.body.clientHeight,
                                    document.documentElement.clientHeight
                                );
                            },
                        },
                        (results) => {
                            if (chrome.runtime.lastError) {
                                console.error(chrome.runtime.lastError);
                                return;
                            }
                            const pageHeight = results[0].result;
                            sendResponse({ pageHeight });
                        }
                    );
                    break;
                case "capturePage":
                    await emulateCaptureViewport(
                        targetTab.id,
                        deviceMetrics,
                        screenshotSuffix
                    );
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
                                screenshotSuffix,
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
