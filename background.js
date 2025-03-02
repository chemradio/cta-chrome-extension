import { emulateAndCapture } from "./workers/screenshot/emulatedScreenshot.js";
import { emulationOptions } from "./workers/screenshot/emultaionOptions.js";

chrome.runtime.onInstalled.addListener(() => {
    for (const [emulationName, _] of Object.entries(emulationOptions)) {
        chrome.contextMenus.create({
            id: emulationName,
            title: emulationName,
            contexts: ["all"],
        });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId && tab.id) {
        console.log(`Emulating ${info.menuItemId} on tab ${tab.id}`);
        console.log(emulationOptions[info.menuItemId]);
        emulateAndCapture(tab.id, emulationOptions[info.menuItemId]);
    }
});
