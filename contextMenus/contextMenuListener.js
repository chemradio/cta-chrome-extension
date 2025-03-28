import { emulateAndCapture } from "../screenshots/emulatedScreenshotCapture.js";

export const addContextMenusListener = async () => {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        console.log("click");
        console.log("context menu triggered");
        console.log(info);
        const contextMenudId = info.menuItemId;
        const pageUrl = info.pageUrl;

        console.log(contextMenudId);
        console.log(pageUrl);
        emulateAndCapture(tab.id).then(() => console.log("OK"));
        //     emulateAndCapture(tab.id)
        //         .then(() => console.log("Capture complete"))
        //         .catch((error) => console.error("Error capturing:", error));
        //     //     // parse tab domain name like "facebook", "google", "youtube"
        //     //     if (info.menuItemId && tab.id) {
        //     //         // element screenshot
        //     //         if (info.menuItemId === "elmentScreenshot") {
        //     //             chrome.scripting.executeScript({
        //     //                 target: { tabId: tab.id },
        //     //                 files: ["content.js"],
        //     //             });
        //     //             return;
        //     //         }
        //     //         // full page screenshot
        //     //         console.log(`Emulating ${info.menuItemId} on tab ${tab.id}`);
        //     //         console.log(emulationOptions[info.menuItemId]);
        //     //         emulateAndCapture(tab.id, emulationOptions[info.menuItemId]);
        //     //     }
    });
};
