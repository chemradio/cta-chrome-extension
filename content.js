const style = document.createElement("style");
style.textContent = `
  @keyframes glowingBorder {
    0% { box-shadow: 0 0 5px 2px  #0ECAE3; }
    50% { box-shadow: 0 0 15px 5px  #0ECAE3; }
    100% { box-shadow: 0 0 5px 2px  #0ECAE3; }
  }
  .animated-highlight {
    outline: 2px solid red !important;
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

    const xpath = getXPath(currentElement);
    const rect = getElementRect(xpath);

    alert(xpath);
    alert(rect);
    chrome.runtime.sendMessage({
        type: "CAPTURE_ELEMENT",
        xpath: xpath,
        rect: rect,
    });
    cleanup();
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
