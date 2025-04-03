export const injectElementFinder = (tabId) => {
    return chrome.scripting
        .executeScript({
            target: { tabId },
            files: ["contentScripts/elementSignatureFinder.js"],
        })
        .then(() => {
            console.log("Element finder injected to tab: ", tabId);
        });
};
