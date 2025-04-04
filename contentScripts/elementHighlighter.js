let deviceMetrics;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendDeviceMetrics") {
        deviceMetrics = message.deviceMetrics;
    }
});

const style = document.createElement("style");
style.textContent = `
  @keyframes glowingBorder {
    0% { box-shadow: 0 0 5px 2px  #0ECAE3; }
    50% { box-shadow: 0 0 15px 5px  #0ECAE3; }
    100% { box-shadow: 0 0 5px 2px  #0ECAE3; }
  }
  .animated-highlight {
    outline: 2px solid #0ECAE3 !important;
    animation: glowingBorder 1s infinite;
  }
`;
document.head.appendChild(style);

function getXPath(element) {
    if (element.id) {
        return '//*[@id="' + element.id + '"]';
    }
    if (element === document.body) {
        return "/html/body";
    }

    let ix = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
            const path = getXPath(element.parentNode);
            return (
                path +
                "/" +
                element.tagName.toLowerCase() +
                "[" +
                (ix + 1) +
                "]"
            );
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
}

function getElementSignature(element) {
    if (!element) return null;

    return {
        xpath: getXPath(element),
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        classes: Array.from(element.classList),
        dataAttrs: Object.fromEntries(
            [...element.attributes]
                .filter((attr) => attr.name.startsWith("data-"))
                .map((attr) => [attr.name, attr.value])
        ),
        text: element.innerText?.trim().slice(0, 100), // First 100 chars
        siblingsIndex: Array.from(element.parentNode?.children || []).indexOf(
            element
        ),
    };
}

function getElementRect(xpath) {
    const el = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
    };
}

let currentElement = null;

function highlight(el) {
    if (currentElement) currentElement.classList.remove("animated-highlight");
    currentElement = el;
    if (currentElement) currentElement.classList.add("animated-highlight");
}

function wheelHandler(e) {
    e.preventDefault();
    if (!currentElement) return;

    if (e.deltaY < 0) {
        // Scroll up - parent
        if (currentElement.parentElement) {
            highlight(currentElement.parentElement);
        }
    } else {
        // Scroll down - first child
        const firstChild = Array.from(currentElement.children)[0];
        if (firstChild) {
            highlight(firstChild);
        }
    }
}

function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    highlight(currentElement);
    const elementSignature = getElementSignature(currentElement);
    const m = {
        action: "elementClicked",
        elementSignature: elementSignature,
        deviceMetrics: deviceMetrics,
    };
    alert("sending message: " + JSON.stringify(m));
    chrome.runtime.sendMessage(m);
    location.reload();
}

function cleanup() {
    document.querySelectorAll("*").forEach((el) => {
        el.removeEventListener("mouseover", highlightElement);
        el.removeEventListener("mouseout", removeHighlight);
        el.removeEventListener("click", handleClick);
        el.classList.remove("animated-highlight");
    });
    document.removeEventListener("wheel", wheelHandler);
}

function highlightElement(e) {
    highlight(e.target);
}

function removeHighlight(e) {
    if (e.target !== currentElement) {
        e.target.classList.remove("animated-highlight");
    }
}

document.querySelectorAll("*").forEach((el) => {
    el.addEventListener("mouseover", highlightElement);
    el.addEventListener("mouseout", removeHighlight);
    el.addEventListener("click", handleClick);
});

document.addEventListener("wheel", wheelHandler, { passive: false });
