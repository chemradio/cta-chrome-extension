function findElementBySignature(signature) {
    if (!signature) return null;

    if (signature.id) {
        let el = document.getElementById(signature.id);
        if (el) return el;
    }

    if (signature.xpath) {
        let result = document.evaluate(
            signature.xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        if (result.singleNodeValue) return result.singleNodeValue;
    }

    // Fallback search using other attributes
    let candidates = [...document.querySelectorAll(signature.tag)];
    candidates = candidates.filter((el) =>
        signature.classes.every((cls) => el.classList.contains(cls))
    );
    candidates = candidates.filter((el) =>
        Object.entries(signature.dataAttrs).every(
            ([key, value]) => el.getAttribute(key) === value
        )
    );

    if (signature.text) {
        candidates = candidates.filter((el) =>
            el.innerText?.trim().includes(signature.text)
        );
    }

    if (signature.siblingsIndex !== undefined && signature.siblingsIndex >= 0) {
        candidates = candidates.filter(
            (el) =>
                Array.from(el.parentNode?.children || []).indexOf(el) ===
                signature.siblingsIndex
        );
    }

    return candidates.length > 0 ? candidates[0] : null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendDeviceMetrics") {
        deviceMetrics = message.deviceMetrics;
    }
});
