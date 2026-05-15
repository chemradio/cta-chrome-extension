// Shared XPath builder for Auto Mode site modules. Mirrors the algorithm in
// contentScripts/elementHighlighter.js so the XPath produced here resolves to
// the same node via the same XPath evaluator used by element capture.
//
// Exposed as window.__BuildXPath in the isolated world. Site modules read it
// after this file is injected first by the orchestrator.

(() => {
    if (window.__BuildXPath) return;

    window.__BuildXPath = function buildXPath(element) {
        if (!element) return null;
        if (element.id) {
            const id = element.id;
            if (!id.includes('"')) return `//*[@id="${id}"]`;
            if (!id.includes("'")) return `//*[@id='${id}']`;
        }
        if (element === document.body) return "/html/body";
        if (element === document.documentElement) return "/html";
        if (!element.parentNode) return null;

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                const parentPath = buildXPath(element.parentNode);
                if (!parentPath) return null;
                return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
        return null;
    };
})();
