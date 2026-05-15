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
    const STORY_TARGET_SELECTORS = [".x78zum5.xl56j7k", ".x5yr21d"];
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
    const getPageType = () => {
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

    const getStoryElement = () => {
        for (const selector of STORY_TARGET_SELECTORS) {
            try {
                const el = document.querySelector(selector);
                if (el) {
                    targetSelector = selector;
                    return el;
                }
            } catch {}
        }
        return null;
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
                console.log(
                    `[Auto/instagram] target=${el ? `story via=${targetSelector}` : "MISS"}`,
                );
                if (el)
                    return {
                        mode: "element",
                        xpath: window.__BuildXPath(el),
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
