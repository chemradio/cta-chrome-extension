import { greeting } from "./temp.js";
import { createContextMenus } from "./contextMenus/createContextMenus.js";
import { addContextMenusListener } from "./contextMenus/contextMenuListener.js";

createContextMenus();
addContextMenusListener();

chrome.runtime.onInstalled.addListener(() => {
    console.log(greeting);
});
