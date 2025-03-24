import { createContextMenus } from "./contextMenus/createContextMenus";
import { addContextMenusListener } from "./contextMenus/contextMenuListener";

chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
    addContextMenusListener();
});

async function emulateAndCapture(tabId) {
    try {
        await attachDebugger(tabId);

        await enableEmulation(tabId, {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true,
        });

        await injectMutationWatcher(tabId);

        console.log("Waiting for mutations to settle...");
        await waitForMutationSettle();

        const screenshot = await takeScreenshot(tabId);
        downloadScreenshot(screenshot, "final-screenshot.png");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        detachDebugger(tabId);
    }
}
