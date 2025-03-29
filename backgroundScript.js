import { greeting } from "./temp.js";
import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";

createContextMenus();
addContextMenusListener();

chrome.runtime.onInstalled.addListener(() => {});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request);
    console.log("Sender:", sender);
});
