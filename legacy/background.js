import { emulateAndCapture } from "./workers/screenshot/emulatedScreenshot.js";
import { emulationOptions } from "./workers/screenshot/emultaionOptions.js";

chrome.runtime.onInstalled.addListener(() => {
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
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    // parse tab domain name like "facebook", "google", "youtube"

    if (info.menuItemId && tab.id) {
        // element screenshot
        if (info.menuItemId === "elmentScreenshot") {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"],
            });
            return;
        }
        // full page screenshot
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CAPTURE_ELEMENT") {
        const tabId = sender.tab.id;
        const rect = message.rect;

        if (!rect) {
            console.error("No element rect found!");
            return;
        }
        const emulationOpts = emulationOptions["Vertical 7k x2"];
        emulateAndCapture(
            tabId,
            emulationOpts
            //      {
            //     x: rect.x * emulationOpts.scaleFactor,
            //     y: rect.y * emulationOpts.scaleFactor,
            //     width: rect.width * emulationOpts.scaleFactor,
            //     height: rect.height * emulationOpts.scaleFactor,
            //     scale: 1,
            // }
        );

        sendResponse({ status: "screenshot triggered" });
    }
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "MUTATIONS_FINISHED") {
        const tabId = sender.tab.id;

        console.log("Mutations finished, taking screenshot...");

        captureScreenshot(tabId, "emulated-device-screenshot");
    }
});
