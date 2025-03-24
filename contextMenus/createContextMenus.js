import { emulationOptions } from "../config/emulationOptions";

export const createContextMenus = () => {
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
};
