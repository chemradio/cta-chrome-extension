import { emulationOptions } from "../screenshots/emulation/emulationOptions.js";

export function createContextMenus() {
    chrome.contextMenus.create({
        id: "elementScreenshot",
        title: "Element Screenshot",
        contexts: ["all"],
    });

    for (const emulationName of Object.keys(emulationOptions)) {
        chrome.contextMenus.create({
            id: emulationName,
            title: `Screenshot: ${emulationName}`,
            contexts: ["all"],
        });
    }
}
