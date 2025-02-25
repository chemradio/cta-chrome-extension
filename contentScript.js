chrome.runtime.sendMessage(
    {
        greeting: "Hello",
    },
    function (response) {
        console.log(response.farewell);
    }
);
