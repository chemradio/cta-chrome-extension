export const addContextMenusListener = () => {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        console.log("context menu triggered");

        //     // parse tab domain name like "facebook", "google", "youtube"
        //     if (info.menuItemId && tab.id) {
        //         // element screenshot
        //         if (info.menuItemId === "elmentScreenshot") {
        //             chrome.scripting.executeScript({
        //                 target: { tabId: tab.id },
        //                 files: ["content.js"],
        //             });
        //             return;
        //         }
        //         // full page screenshot
        //         console.log(`Emulating ${info.menuItemId} on tab ${tab.id}`);
        //         console.log(emulationOptions[info.menuItemId]);
        //         emulateAndCapture(tab.id, emulationOptions[info.menuItemId]);
        //     }
    });
};
