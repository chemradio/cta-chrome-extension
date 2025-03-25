import { emulationOptions } from "../screenshots/emulation/emulationOptions.js";

export function createContextMenus() {
    chrome.contextMenus.create({
        id: "elmentScreenshot",
        title: "Element Screenshot",
        contexts: ["all"],
    });

    for (const [emulationName, _] of Object.entries(emulationOptions)) {
        chrome.contextMenus.create({
            id: emulationName,
            title: emulationName,
            contexts: ["all"],
        });
    }
}
