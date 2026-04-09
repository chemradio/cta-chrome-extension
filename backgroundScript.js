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
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!tabs.length) return reject(new Error("No active tab found."));
            resolve(tabs[0]);
        });
    });
}

function buildTimestampSuffix(url) {
    const domain = new URL(url).hostname;
    const ts = new Date()
        .toISOString()
        .replace(/T/, "-")
        .replace(/:/g, "-")
        .split(".")[0];
    return `${domain}-${ts}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            const tab = await getActiveTab();
            const settings = request.settings ?? {};

            const deviceMetrics = {
                width: settings.width || 1920,
                height: settings.height || 1080,
                deviceScaleFactor: settings.deviceScaleFactor || 1,
                mobile: settings.mobile || false,
            };

            const screenshotSuffix = buildTimestampSuffix(tab.url);

            switch (request.action) {
                case "getPageHeight":
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tab.id },
                            func: () => {
                                document.body.style.zoom = "";
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
                            sendResponse({ pageHeight: results[0].result });
                        }
                    );
                    break;

                case "capturePage":
                    // Run cleanup before capture if the option is enabled
                    if (settings.cleanup) {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ["contentScripts/cleanup.js"],
                        });
                    }
                    await emulateCaptureViewport(
                        tab.id,
                        deviceMetrics,
                        screenshotSuffix
                    );
                    break;

                case "captureElement":
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["contentScripts/elementHighlighter.js"],
                    });
                    // Send device metrics to the content script so it can attach
                    // them to the elementClicked message when the user clicks
                    chrome.tabs.sendMessage(tab.id, {
                        action: "sendDeviceMetrics",
                        deviceMetrics,
                        screenshotSuffix,
                    });
                    break;

                case "manualCleanup":
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["contentScripts/cleanup.js"],
                    });
                    break;

                default:
                    // elementClicked / captureCropScreenshot / MUTATIONS_FINISHED
                    // are handled by their own dedicated listeners
                    break;
            }
        } catch (error) {
            console.error("Background message handler error:", error);
        }
    })();

    return true;
});
