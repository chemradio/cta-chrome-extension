// EasyList cosmetic-rule grammar (subset we parse):
//
//   ##selector                  global rule, applies on every site
//   domain1,domain2##selector   applies on these domains (and subdomains)
//   ~domain##selector           per-domain exclude — we drop the excluded entry
//   domain#@#selector           exception that *un-blocks* a selector on a
//                               specific domain. Rare and adds complexity for
//                               little gain; we ignore exceptions entirely.
//
// We also reject uBlock/ABP procedural pseudo-classes that aren't valid CSS,
// otherwise the whole querySelectorAll batch they appear in would throw.

const EXTENDED_PSEUDO =
    /:has-text\(|:matches-css|:-abp-|:matches-path|:upward\(|:remove\(|:style\(|:watch-attrs\(|:nth-ancestor\(|:matches-attr|:matches-property|:min-text-length|:-ext-|:others\(|:if\(|:if-not\(/;

function isProceduralPrefix(selector) {
    // uBO HTML filtering (^) and scriptlet injection (+js(...)) are not CSS.
    const first = selector[0];
    return first === "^" || first === "+";
}

export function parseEasylist(text) {
    const global = [];
    const domains = new Map();
    let skipped = 0;

    const lines = text.split("\n");
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line[0] === "!" || line[0] === "[") continue;

        // Exception rules un-block; we don't process them.
        if (line.includes("#@#")) continue;

        const sep = line.indexOf("##");
        if (sep === -1) continue;

        const domainsPart = line.slice(0, sep);
        const selector = line.slice(sep + 2).trim();
        if (!selector) continue;
        if (isProceduralPrefix(selector) || EXTENDED_PSEUDO.test(selector)) {
            skipped++;
            continue;
        }

        if (!domainsPart) {
            global.push(selector);
            continue;
        }

        for (const d of domainsPart.split(",")) {
            // ~domain excludes the rule from that domain; since we're not
            // resolving exclusions across a global rule set, skip it.
            if (!d || d[0] === "~") continue;
            const dom = d.toLowerCase();
            if (!domains.has(dom)) domains.set(dom, []);
            domains.get(dom).push(selector);
        }
    }

    const domainsObj = {};
    for (const [k, v] of domains) domainsObj[k] = v;

    return { global, domains: domainsObj, skipped };
}
