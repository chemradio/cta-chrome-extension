import { emulateCaptureViewport } from "../screenshots/emulatedViewportCapture.js";
import { emulationOptions } from "../screenshots/emulation/emulationOptions.js";

function buildTimestampSuffix(url) {
    try {
        const domain = new URL(url).hostname;
        const ts = new Date()
            .toISOString()
            .replace(/T/, "-")
            .replace(/:/g, "-")
            .split(".")[0];
        return `${domain}-${ts}`;
    } catch {
        return `screenshot-${Date.now()}`;
    }
}

export const addContextMenusListener = () => {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        const id = info.menuItemId;
        const suffix = buildTimestampSuffix(info.pageUrl);

        if (id === "elementScreenshot") {
            // Inject element highlighter with default 1920×1080 @ 2x
            const deviceMetrics = {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 2,
                mobile: false,
            };
            chrome.scripting
                .executeScript({
                    target: { tabId: tab.id },
                    files: ["contentScripts/elementHighlighter.js"],
                })
                .then(() => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: "sendDeviceMetrics",
                        deviceMetrics,
                        screenshotSuffix: suffix,
                    });
                });
            return;
        }

        const preset = emulationOptions[id];
        if (preset) {
            emulateCaptureViewport(tab.id, preset, suffix);
        }
    });
};
