// Instagram Auto Mode module.
//
// Post pages target the post <article>. Story pages click through "View
// story" if needed, pause playback, then target the story card. Profile
// pages remove the right-side panel and let the orchestrator fall through
// to a full-page capture of the centered main column.

(() => {
    const POST_DETECTORS = [
        "article",
        ".x6s0dn4.x78zum5.xdt5ytf.xdj266r.xkrivgy.xat24cr.x1gryazu.x1n2onr6.xh8yej3",
    ];
    const STORY_DETECTORS = [
        ".xyzq4qe .xgqcy7u .x1lq5wgf .x5yr21d .x6ikm8r .x10wlt62 .x1n2onr6 .x87ps6o .xh8yej3 .x1ja2u2z",
        '[aria-label="Pause"]',
        '[aria-label="Play"]',
    ];
    const PROFILE_DETECTORS = [
        '[role="tablist"]',
        '[aria-label="Link icon"]',
    ];

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
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
        if ((s = firstMatch(POST_DETECTORS)))    { detectorHit = s; return "post"; }
        if ((s = firstMatch(STORY_DETECTORS)))   { detectorHit = s; return "story"; }
        if ((s = firstMatch(PROFILE_DETECTORS))) { detectorHit = s; return "profile"; }
        return "unknown";
    };

    const removeObscuring = () => {
        const matches = document.querySelectorAll('[class="x1n2onr6 xzkaem6"]');
        matches.forEach((el) => el.remove());
        return matches.length;
    };

    const getPostElement = () => {
        for (const selector of POST_DETECTORS) {
            try {
                const post = document.querySelector(selector);
                if (post) {
                    targetSelector = selector;
                    post.style.border = "0px";
                    if (post.firstElementChild) {
                        post.firstElementChild.style.border = "0px";
                    }
                    // Strip the "Comment as" composer that hangs off the post
                    post.querySelector(
                        'section[class*="x1roi4f4"], section[class*="x5ur3kl"]'
                    )?.remove();
                    return post;
                }
            } catch {
                // skip invalid selector
            }
        }
        return null;
    };

    const getStoryElement = async () => {
        const viewBtn = Array.from(
            document.querySelectorAll('div[role="button"]')
        ).find((d) => d.innerHTML.trim() === "View story");
        viewBtn?.click();
        await delay(1000);
        document.querySelector('[aria-label="Pause"]')?.parentElement?.click();

        const storySelectors = [
            ".x5yr21d .x1n2onr6 .xh8yej3",
            '[referrerpolicy="origin-when-cross-origin"]',
        ];
        for (const selector of storySelectors) {
            const el = document.querySelector(selector);
            if (el) { targetSelector = selector; return el; }
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

    window.__ctaAutoCapturePending = (async () => {
        try {
            document.body.style.fontFamily = "'Roboto', sans-serif";
            const obscuring = removeObscuring();
            const pageType = getPageType();
            console.log(
                `[CTA Auto/instagram] page=${pageType} via=${detectorHit ?? "none"}`
            );
            console.log(`[CTA Auto/instagram] cleanup: OBSCURING=${obscuring}`);

            if (pageType === "post") {
                const el = getPostElement();
                console.log(`[CTA Auto/instagram] target=${el ? `post via=${targetSelector}` : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }
            if (pageType === "story") {
                const el = await getStoryElement();
                console.log(`[CTA Auto/instagram] target=${el ? `story via=${targetSelector}` : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }
            if (pageType === "profile") {
                prepareProfile();
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/instagram]", e);
            return { mode: "page" };
        }
    })();
})();
