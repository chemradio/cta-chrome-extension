// console.log("i am from background script!");
// console.log(this);

// chrome.runtime.onInstalled.addListener(() => {
//     chrome.tabs.create({ url: "https://www.google.com" });
// });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received from contentScript.js");
    console.log(request);
    console.log(sender);
    console.log(sendResponse);
    sendResponse({ farewell: "Goodbye" });
});
