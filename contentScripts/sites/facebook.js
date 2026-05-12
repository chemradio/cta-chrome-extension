// Facebook Auto Mode module.
//
// Returns a capture plan on window.__ctaAutoCapturePending:
//   { mode: "element", xpath } — capture a specific post / story / group post
//   { mode: "page" }           — fall through to full-page capture
//
// Logged-out state is detected via the email/pass inputs. Logged-in flows
// prefer the role="dialog" overlay post, then video permalink, then group
// post article. Profile pages target document.body with a small zoom bump.

(() => {
    const SEE_MORE_SELECTORS = [
        '[class="x1ey2m1c xds687c x17qophe xixxii4 x13vifvy x1h0vfkc"]',
        '[class="__fb-light-mode x1qjc9v5 x9f619 x78zum5 xdt5ytf xl56j7k x1c4vz4f xg6iff7"]',
        '[class="x1cy8zhl x9f619 x78zum5 xl56j7k x2lwn1j xeuugli x47corl x1x97wu9 xbr3nou xurb0ha x1sxyh0 x3v4vwv x1dzdb2q"]',
    ];

    const GROUP_POST_DETECTORS = [
        'div[data-pagelet="GroupInlineComposer"]',
        'div[data-pagelet="GroupFeed"]',
    ];
    const POST_DETECTORS = [
        '[data-ad-preview="message"]',
        '[data-ad-comet-preview="message"]',
        '[data-ad-rendering-role="story_message"]',
        '[data-pagelet="WatchPermalinkVideo"]',
    ];
    const STORY_DETECTORS = [
        '[data-pagelet="StoriesContentPane"]',
        '[data-pagelet="StoriesCardMedia"]',
    ];
    const PROFILE_DETECTORS = [
        '[data-pagelet="ProfileTilesFeed_1"]',
        '[data-pagelet="ProfileTabs"]',
        '[data-pagelet="ProfileActions"]',
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

    const isLoggedIn = () =>
        !document.querySelector('input[name="email"]') &&
        !document.querySelector('input[name="pass"]');

    let detectorHit = null;
    const getPageType = () => {
        let s;
        if ((s = firstMatch(GROUP_POST_DETECTORS))) { detectorHit = s; return "groupPost"; }
        if ((s = firstMatch(PROFILE_DETECTORS)))    { detectorHit = s; return "profile"; }
        if ((s = firstMatch(STORY_DETECTORS)))      { detectorHit = s; return "story"; }
        if ((s = firstMatch(POST_DETECTORS)))       { detectorHit = s; return "post"; }
        return "unknown";
    };

    const removeBySelectors = (selectors) => {
        let n = 0;
        for (const selector of selectors) {
            const matches = document.querySelectorAll(selector);
            n += matches.length;
            matches.forEach((el) => el.remove());
        }
        return n;
    };
    const removeSeeMore = () => removeBySelectors(SEE_MORE_SELECTORS);

    // Comment-As toolbar: walk up 8 levels from the "Available Voices" anchor
    // to the wrapper section. The legacy depth was 8 parents and the section
    // structure hasn't changed.
    const removeCommentAs = () => {
        const anchors = document.querySelectorAll('[aria-label="Available Voices"]');
        anchors.forEach((el) => {
            let ancestor = el;
            for (let i = 0; i < 8 && ancestor.parentElement; i++) {
                ancestor = ancestor.parentElement;
            }
            ancestor.remove();
        });
        return anchors.length;
    };

    const removeBanner = () => {
        const banner = document.querySelector('[role="banner"]');
        banner?.remove();
        const main = document.querySelector('[role="main"]');
        if (!main) return banner ? 1 : 0;
        let el = main;
        for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement;
        el.style.position = "relative";
        el.style.top = "0px";
        return banner ? 1 : 0;
    };

    const getDialogPostLogged = () => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const d of dialogs) {
            const article = d.querySelector('[role="article"]');
            if (article) return article;
        }
        return null;
    };

    const getDialogPostUnlogged = () => {
        const selectors = [
            '[class="html-div xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x4uap5 x18d9i69 xkhd6sd"]',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    };

    const getVideoPost = () =>
        document.querySelector('[data-pagelet="WatchPermalinkVideo"]')
            ?.parentElement?.parentElement ?? null;

    const getGroupPost = () => document.querySelector('div[role="article"]');

    // Story playback is paused before capture. The pause button only exists
    // once the story is playing, so we click "View story" first (if shown),
    // wait ~1s for the player to come up, then pause.
    const getStoryElement = async () => {
        const pane = document.querySelector('[data-pagelet="StoriesContentPane"]');
        if (pane) {
            const viewBtn = pane.querySelector('[role="button"]');
            viewBtn?.click();
            await delay(1000);
            const pauseBtn = pane.querySelector('[aria-label="Pause"]');
            pauseBtn?.click();
        }
        return document.querySelector('[data-pagelet="StoriesCardMedia"]');
    };

    window.__ctaAutoCapturePending = (async () => {
        try {
            document.body.style.fontFamily = "'Roboto', sans-serif";
            const pageType = getPageType();
            const logged = isLoggedIn();
            console.log(
                `[CTA Auto/facebook] page=${pageType} via=${detectorHit ?? "none"} logged=${logged}`
            );

            if (pageType === "groupPost") {
                const commentAs = removeCommentAs();
                const seeMore = removeSeeMore();
                console.log(`[CTA Auto/facebook] cleanup: COMMENT_AS=${commentAs} SEE_MORE=${seeMore}`);
                const el = getGroupPost();
                console.log(`[CTA Auto/facebook] target=${el ? "groupPost" : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }

            if (pageType === "story") {
                const el = await getStoryElement();
                console.log(`[CTA Auto/facebook] target=${el ? "story" : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }

            if (pageType === "post") {
                const seeMore = removeSeeMore();
                if (logged) {
                    const commentAs = removeCommentAs();
                    console.log(`[CTA Auto/facebook] cleanup: COMMENT_AS=${commentAs} SEE_MORE=${seeMore}`);
                    let el = getDialogPostLogged();
                    let strat = el ? "dialogLogged" : null;
                    if (!el) { el = getVideoPost(); if (el) strat = "video"; }
                    if (!el) { el = getGroupPost(); if (el) strat = "groupPost"; }
                    console.log(`[CTA Auto/facebook] target=${strat ?? "MISS"}`);
                    if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
                } else {
                    console.log(`[CTA Auto/facebook] cleanup: SEE_MORE=${seeMore}`);
                    const el = getDialogPostUnlogged();
                    console.log(`[CTA Auto/facebook] target=${el ? "dialogUnlogged" : "MISS"}`);
                    if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
                }
            }

            if (pageType === "profile") {
                const banner = removeBanner();
                const commentAs = removeCommentAs();
                const seeMore = removeSeeMore();
                console.log(`[CTA Auto/facebook] cleanup: BANNER=${banner} COMMENT_AS=${commentAs} SEE_MORE=${seeMore}`);
                document.body.style.zoom = "120%";
                return { mode: "page" };
            }

            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/facebook]", e);
            return { mode: "page" };
        }
    })();
})();
