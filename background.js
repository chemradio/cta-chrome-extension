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
    // parse tab domain name like "facebook", "google", "youtube"

    if (info.menuItemId && tab.id) {
        console.log(`Emulating ${info.menuItemId} on tab ${tab.id}`);
        console.log(emulationOptions[info.menuItemId]);
        emulateAndCapture(tab.id, emulationOptions[info.menuItemId]);
    }
});

// chrome.tabs.onClicked.addListener((tab) => {
//     const tabDomain = tab.url
//         .match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/gim)[0]
//         .split(".")[1];
//     console.log(`Tab domain: ${tabDomain}`);
// });

const getCurrentURL = (tabId) => {
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            func: () => document.location.href,
        },
        (results) => {
            if (results && results[0] && results[0].result) {
                console.log(results[0].result);
                return results[0].result;
            }
        }
    );
};

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const url = getCurrentURL(activeInfo.tabId);
    console.log(url);
    // console.log(await chrome.tabs.get(activeInfo.tabId));
    // const tab = chrome.tabs.get(activeInfo.tabId, (tab) => {
    //     const tabDomain = tab.url
    //         .match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/gim)[0]
    //         .split(".")[1];
    //     console.log(`Tab domain: ${tabDomain}`);
    // });
});

async function moveToFirstPosition(activeInfo) {
    try {
        await chrome.tabs.move(activeInfo.tabId, { index: 0 });
        console.log("Success.");
    } catch (error) {
        if (
            error ==
            "Error: Tabs cannot be edited right now (user may be dragging a tab)."
        ) {
            setTimeout(() => moveToFirstPosition(activeInfo), 50);
        } else {
            console.error(error);
        }
    }
}
