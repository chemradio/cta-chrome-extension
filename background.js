import { enableEmulation, disableEmulation } from "./workers/emulation.js";
import { captureScreenshot } from "./workers/screenshot.js";

function attachDebugger(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId: tabId }, "1.3", () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Wrapper for detach
function detachDebugger(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.detach({ tabId: tabId }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "emulateAndCapture",
        title: "Emulate 1920x5000 & Capture",
        contexts: ["all"],
    });
});

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "emulateAndCapture" && tab.id) {
//         chrome.debugger.attach({ tabId: tab.id }, "1.3", () => {
//             enableEmulation(tab.id, 1920, 5000, 2);

//             setTimeout(() => {
//                 // Provide the screenshot name dynamically (optional)
//                 captureScreenshot(tab.id, "node_screenshot"); // example screenshot name
//                 disableEmulation(tab.id);
//                 // refresh the page
//             }, 1000);
//             chrome.debugger.detach({ tabId: tab.id });
//         });
//     }
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "emulateAndCapture" && tab.id) {
//         attachDebugger(tab.id)
//             .then(() => {
//                 // Enable emulation
//                 enableEmulation(tab.id, 1920, 5000, 1);

//                 // Wait for emulation and take screenshot
//                 setTimeout(() => {
//                     captureScreenshot(tab.id, "node_screenshot"); // Screenshot name
//                     disableEmulation(tab.id)
//                         .then(() => {
//                             // Detach debugger after disabling emulation
//                             return detachDebugger(tab.id);
//                         })
//                         .then(() => {
//                             console.log("Debugger detached successfully.");
//                         })
//                         .catch((error) => {
//                             console.error("Error detaching debugger:", error);
//                         });
//                 }, 1000); // Wait a bit to make sure emulation is applied
//             })
//             .catch((error) => {
//                 console.error("Error attaching debugger:", error);
//             });
//     }
// });

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "emulateAndCapture" && tab.id) {
        chrome.debugger.attach({ tabId: tab.id }, "1.3", () => {
            // Enable emulation with vertical orientation (height > width)
            enableEmulation(tab.id, 1920, 5000, 1); // 5000px height, 1920px width

            // Wait for emulation to apply and take screenshot
            setTimeout(() => {
                captureScreenshot(tab.id, "node_screenshot"); // Screenshot name

                // After taking the screenshot, turn off emulation
                // disableEmulation(tab.id);
            }, 1000); // Wait a bit to make sure emulation is applied
        });
    }
});
