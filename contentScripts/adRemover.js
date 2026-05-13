// IIFE result is awaited by chrome.scripting.executeScript and returned as
// results[0].result — we use that to surface a removed-node count back to
// the popup status bar.
(async () => {
    if (window.__ctaAdRemoverRunning) return { removed: 0, selectors: 0, skipped: true };
    window.__ctaAdRemoverRunning = true;

    try {
        const {
            adFilters,
            bundledFilters,
            userFilters,
            userGlobalFilters,
            bundledFiltersDisabled,
        } = await chrome.storage.local.get([
            "adFilters",
            "bundledFilters",
            "userFilters",
            "userGlobalFilters",
            "bundledFiltersDisabled",
        ]);
        if (!adFilters) {
            console.warn(
                "[CTA] AdRemover: no EasyList in storage yet. Background " +
                    "should have hydrated it — reopen the popup and retry."
            );
        }

        const hostname = location.hostname.toLowerCase();

        const bundledOn      = !bundledFiltersDisabled;
        const adDomains      = adFilters?.domains ?? {};
        const bundledDomains = bundledOn ? (bundledFilters?.domains ?? {}) : {};
        const bundledGlobal  = bundledOn ? (bundledFilters?.global  ?? []) : [];
        const userMap        = userFilters ?? {};
        const userGlobal     = Array.isArray(userGlobalFilters) ? userGlobalFilters : [];

        const matchedAd      = Object.keys(adDomains).filter((d) => domainMatches(hostname, d));
        const matchedBundled = Object.keys(bundledDomains).filter((d) => domainMatches(hostname, d));
        const matchedUser    = Object.keys(userMap).filter((d) => domainMatches(hostname, d));

        // Dedupe so a selector that exists in both bundled and user lists is
        // only applied once (user said: "duplicates handled once").
        const selectors = Array.from(new Set([
            ...(adFilters?.global ?? []),
            ...bundledGlobal,
            ...userGlobal,
            ...matchedAd.flatMap((k) => adDomains[k]),
            ...matchedBundled.flatMap((k) => bundledDomains[k]),
            ...matchedUser.flatMap((k) => userMap[k]),
        ]));

        const removed = applySelectors(selectors);
        console.log(
            `[CTA] AdRemover: removed ${removed} node(s) using ` +
                `${selectors.length} selectors ` +
                `(easylist:${matchedAd.length} bundled:${matchedBundled.length} ` +
                `user:${matchedUser.length} user-global:${userGlobal.length})`
        );
        return {
            removed,
            selectors: selectors.length,
            sources: {
                easylist:    matchedAd.length,
                bundled:     matchedBundled.length,
                user:        matchedUser.length,
                userGlobal:  userGlobal.length,
            },
        };
    } finally {
        delete window.__ctaAdRemoverRunning;
    }

    function domainMatches(host, ruleDomain) {
        return host === ruleDomain || host.endsWith("." + ruleDomain);
    }

    // Batched application. One bad selector in a batch makes
    // querySelectorAll throw for the whole batch, so we fall back to
    // one-at-a-time only within the offending batch — fast path stays fast.
    function applySelectors(selectors) {
        if (!selectors.length) return 0;
        const BATCH = 500;
        let removed = 0;
        for (let i = 0; i < selectors.length; i += BATCH) {
            const chunk = selectors.slice(i, i + BATCH);
            removed += applyChunk(chunk);
        }
        return removed;
    }

    function applyChunk(chunk) {
        let removed = 0;
        try {
            document.querySelectorAll(chunk.join(",")).forEach((n) => {
                n.remove();
                removed++;
            });
            return removed;
        } catch {
            for (const sel of chunk) {
                try {
                    document.querySelectorAll(sel).forEach((n) => {
                        n.remove();
                        removed++;
                    });
                } catch {
                    /* invalid selector — skip */
                }
            }
            return removed;
        }
    }
})();
