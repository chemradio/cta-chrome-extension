export const injectMutationWatcher = (tabId) => {
    return chrome.scripting
        .executeScript({
            target: { tabId },
            files: ["contentScripts/mutationWatcher.js"],
        })
        .then(() => {
            console.log("Mutation observer injected on tab:", tabId);
        });
};

export const waitForMutationSettle = () => {
    return new Promise((resolve) => {
        const listener = (message, sender) => {
            if (message.type === "MUTATIONS_FINISHED") {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(sender.tab.id);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
    });
};
