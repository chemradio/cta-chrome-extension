(function () {
    const debounceDelay = 1500;
    const maxWaitTime = 3000;
    let mutationTimeout;
    let maxWaitTimeout;

    const observer = new MutationObserver(() => {
        clearTimeout(mutationTimeout);

        mutationTimeout = setTimeout(() => {
            console.log("Mutations settled, notifying background script");

            chrome.runtime.sendMessage({ type: "MUTATIONS_FINISHED" });

            observer.disconnect();
            clearTimeout(maxWaitTimeout);
        }, debounceDelay);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });

    maxWaitTimeout = setTimeout(() => {
        console.log("Max wait time reached, notifying background script");

        chrome.runtime.sendMessage({ type: "MUTATIONS_FINISHED" });

        observer.disconnect();
        clearTimeout(mutationTimeout);
    }, maxWaitTime);
})();
