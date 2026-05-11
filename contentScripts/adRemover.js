(async () => {
    if (window.__ctaAdRemoverRunning) return;
    window.__ctaAdRemoverRunning = true;

    try {
        const { adFilters } = await chrome.storage.local.get("adFilters");
        if (!adFilters) {
            console.warn(
                "[CTA] AdRemover: no filters in storage yet. Background " +
                    "should have hydrated them — reopen the popup and retry."
            );
            return;
        }

        const hostname = location.hostname.toLowerCase();
        const matchedDomainKeys = Object.keys(adFilters.domains).filter((d) =>
            domainMatches(hostname, d)
        );
        const selectors = [
            ...adFilters.global,
            ...matchedDomainKeys.flatMap((k) => adFilters.domains[k]),
        ];

        const removed = applySelectors(selectors);
        console.log(
            `[CTA] AdRemover: removed ${removed} node(s) using ` +
                `${selectors.length} selectors ` +
                `(${matchedDomainKeys.length} domain-scoped lists matched)`
        );
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
