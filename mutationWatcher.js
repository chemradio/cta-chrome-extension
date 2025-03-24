let mutationTimeout;
const debounceDelay = 500;

const observer = new MutationObserver(() => {
    clearTimeout(mutationTimeout);

    mutationTimeout = setTimeout(() => {
        console.log("Mutations settled, notifying background script");

        chrome.runtime.sendMessage({
            type: "MUTATIONS_FINISHED",
        });

        observer.disconnect(); // Optional: stop watching once done
    }, debounceDelay);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
});
