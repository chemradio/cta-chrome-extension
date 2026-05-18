// Instagram Auto Mode module.
//
// Post pages target the post <article>. Story pages click through "View
// story" if needed, pause playback, then target the story card. Profile
// pages remove the right-side panel and let the orchestrator fall through
// to a full-page capture of the centered main column.

(() => {
    // Detection order: STORY -> POST -> PROFILE. Stories first because
    // x5yr21d is the most distinctive marker; posts second because
    // xdt5ytf / xyzq4qe rule out profile pages; profile last as fallback.
    const STORY_DETECTORS = [".xoqlrxr.xtijo5x", ".x1ned7t2.x78zum5"];
    const POST_DETECTORS = [
        ".xdt5ytf.x11t971q.xat24cr",
        ".x1yvgwvq.x1ixjvfu",
        ".xyzq4qe.x1tjbqro",
    ];
    const PROFILE_DETECTORS = [
        "header.x1yztbdb.x1qe1wrf",
        "section.xlo4toe.x2wt2w",
        "section.x98rzlu.xeuugli",
        '[role="tablist"]',
    ];

    const POST_TARGET_SELECTORS = [".xdt5ytf.x11t971q.xat24cr", ".x1yvgwvq.x1ixjvfu"];
    // Story card candidates, ordered last -> first per the observed DOM
    // tree (innermost listed last). getStoryElement tries them in this
    // order and walks up the tree if a selector misses. Note: three nodes
    // in the tree share the .x5yr21d.x1n2onr6.xh8yej3 class set, so that
    // selector resolves to the first (outermost) such node.
    const STORY_TARGET_SELECTORS = [
        ".x5yr21d.x1n2onr6.xh8yej3",
        ".x1lliihq.x5yr21d.x1n2onr6.xh8yej3.x1ja2u2z",
        ".x5yr21d.xmz0i5r.x193iq5w.xh8yej3",
        ".x6s0dn4.x78zum5.xdt5ytf.x5yr21d.xl56j7k.x6ikm8r.x10wlt62.x1n2onr6.xh8yej3.x1obq294.x5a5i1n.xde0f50.x15x8krk",
    ];
    const COMMENT_AS_SELECTOR = ".x1ys307a.xyqm7xq";

    const firstMatch = (selectors) => {
        for (const s of selectors) {
            try {
                if (document.querySelector(s)) return s;
            } catch {}
        }
        return null;
    };

    let detectorHit = null;
    let targetSelector = null;
    let targetIndex = 0;
    const getPageType = () => {
        // Stories are detected by URL. Instagram's story DOM is heavily
        // obfuscated and the class-hash selectors churn between releases,
        // so /stories/ in the path is the only stable signal.
        if (/^\/stories\//.test(location.pathname)) {
            detectorHit = "url:/stories/";
            return "story";
        }
        let s;
        if ((s = firstMatch(STORY_DETECTORS))) {
            detectorHit = s;
            return "story";
        }
        if ((s = firstMatch(POST_DETECTORS))) {
            detectorHit = s;
            return "post";
        }
        if ((s = firstMatch(PROFILE_DETECTORS))) {
            detectorHit = s;
            return "profile";
        }
        return "unknown";
    };

    const removeObscuring = () => {
        // const matches = document.querySelectorAll('[class="x1n2onr6 xzkaem6"]');
        // matches.forEach((el) => el.remove());
        // return matches.length;
    };

    const getPostElement = () => {
        for (const selector of POST_TARGET_SELECTORS) {
            try {
                const post = document.querySelector(selector);
                if (post) {
                    targetSelector = selector;
                    post.style.border = "0px";
                    if (post.firstElementChild) {
                        post.firstElementChild.style.border = "0px";
                    }
                    post.querySelector(COMMENT_AS_SELECTOR)?.remove();
                    return post;
                }
            } catch {
                // skip invalid selector
            }
        }
        return null;
    };

    // Pick the ACTIVE story card.
    //
    // The story viewer is a carousel: Instagram renders the previous,
    // current and next stories side by side. The active story is the one
    // centered in the viewport; the others are scaled-down previews off to
    // the sides. Picking the first/last match grabs an adjacent story, not
    // the one the user is watching — so we choose the match whose horizontal
    // center is nearest the viewport center. Among equally-centered nodes
    // (the active story's nested same-class wrappers) we keep the last
    // (innermost) one — that's the tight story card, not the backdrop.
    //
    // Zero-size matches are skipped (display:contents wrappers, off-screen
    // carousel slides) since the capture pipeline rejects 0×0 elements.
    //
    // targetIndex records the chosen node's 1-based position in the match
    // list so storyXPath can address exactly this element.
    const getStoryElement = () => {
        const vpCenter = window.innerWidth / 2;
        for (const selector of STORY_TARGET_SELECTORS) {
            try {
                const matches = [...document.querySelectorAll(selector)];
                let best = null;
                matches.forEach((el, idx) => {
                    const r = el.getBoundingClientRect();
                    if (r.width <= 0 || r.height <= 0) return;
                    const dist = Math.abs(r.left + r.width / 2 - vpCenter);
                    // more centered wins; ties (same story's wrappers) keep
                    // the later/innermost node.
                    if (
                        !best ||
                        dist < best.dist - 2 ||
                        (Math.abs(dist - best.dist) <= 2 && idx >= best.idx)
                    ) {
                        best = { el, idx, dist };
                    }
                });
                if (best) {
                    targetSelector = selector;
                    targetIndex = best.idx + 1; // 1-based for XPath
                    return best.el;
                }
            } catch {}
        }
        return null;
    };

    // Build a CLASS-based XPath for the story card instead of a positional
    // one. The capture pipeline re-locates the element after emulating new
    // device metrics (1920×7000), and that resize makes Instagram's story
    // React tree re-render — shifting every positional index and causing
    // "xpath-miss". Class hashes survive a re-layout, so an XPath keyed on
    // the matched class set resolves reliably post-emulation. The [index]
    // is the document-order position getStoryElement chose (the active,
    // centered story) — document order is stable across the re-layout even
    // though geometry is not.
    const storyXPath = (cssSelector, index) => {
        const classes = cssSelector.split(".").filter(Boolean);
        const preds = classes
            .map(
                (c) =>
                    `contains(concat(" ",normalize-space(@class)," ")," ${c} ")`,
            )
            .join(" and ");
        return `(//*[${preds}])[${index}]`;
    };

    const prepareProfile = () => {
        // Side panel hides next to a .x1qughib inside a .xvbhtw8 wrapper
        for (const wrapper of document.querySelectorAll(".xvbhtw8")) {
            const side = wrapper.querySelector(".x1qughib");
            if (side) {
                side.remove();
                break;
            }
        }
        const main = document.querySelector('[role="main"]');
        if (main?.parentElement?.parentElement) {
            main.parentElement.parentElement.style.margin = "0px";
            main.parentElement.parentElement.parentElement.style.justifyContent =
                "center";
        }
    };

    window.__AutoCapturePending = (async () => {
        try {
            if (window.__SiteOptions?.detectOnly) {
                const pageType = getPageType();
                console.log(
                    `[Auto/instagram] detect: page=${pageType} via=${detectorHit ?? "none"}`,
                );
                return { mode: "detect", pageType };
            }
            document.body.style.fontFamily = "'Roboto', sans-serif";
            const obscuring = removeObscuring();
            const pageType = getPageType();
            console.log(
                `[Auto/instagram] page=${pageType} via=${detectorHit ?? "none"}`,
            );
            console.log(`[Auto/instagram] cleanup: OBSCURING=${obscuring}`);

            if (pageType === "post") {
                const el = getPostElement();
                console.log(
                    `[Auto/instagram] target=${el ? `post via=${targetSelector}` : "MISS"}`,
                );
                console.log(el);
                if (el)
                    return {
                        mode: "element",
                        xpath: window.__BuildXPath(el),
                    };
            }
            if (pageType === "story") {
                const el = getStoryElement();
                const xpath = el ? storyXPath(targetSelector, targetIndex) : null;
                console.log(
                    `[Auto/instagram] target=${el ? `story via=${targetSelector}[${targetIndex}] xpath=${xpath}` : "MISS"}`,
                );
                if (el)
                    return {
                        mode: "element",
                        xpath,
                        // A story is a fixed ~9:16 card. The default
                        // 1920×7000 capture viewport makes Instagram render
                        // it enormous (2000×3600, ~13 MB) with the story
                        // chrome tiny inside.
                        //
                        // Story media is natively 1080×1920, but the desktop
                        // DOM card renders to fit the window, not at 1920.
                        // The story viewer eats a fixed ~341 px of vertical
                        // chrome: at a 1080-tall window the card came out
                        // ~739 CSS px. To land a ~2000 px capture at 2× the
                        // card needs ~1000 CSS px, so window ≈ 1000 + 341.
                        viewport: {
                            width: 1200,
                            height: 1341,
                            deviceScaleFactor: 2,
                        },
                    };
            }
            if (pageType === "profile") {
                prepareProfile();
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[Auto/instagram]", e);
            return { mode: "page" };
        }
    })();
})();
