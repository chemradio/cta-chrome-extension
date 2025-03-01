// chrome.runtime.sendMessage(
//     {
//         greeting: "Hello",
//     },
//     function (response) {
//         console.log(response.farewell);
//     }
// );

chrome.storage.local.set({ name: "Rudra" }).then(() => {
    console.log("Value is set to " + "Rudra");
});

chrome.storage.local.get(["name"], function (result) {
    console.log("Value currently is " + JSON.stringify(result));
    console.log(result);
});
