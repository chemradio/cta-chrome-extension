import { fetchEasylist } from "./filterSource.js";
import { parseEasylist } from "./parseEasylist.js";
import { loadFilters, saveFilters } from "./filterStorage.js";

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function refreshFilters() {
    const text = await fetchEasylist();
    const { global, domains, skipped } = parseEasylist(text);
    const ruleCount =
        global.length +
        Object.values(domains).reduce((n, list) => n + list.length, 0);
    const payload = {
        global,
        domains,
        fetchedAt: Date.now(),
        ruleCount,
        skipped,
    };
    await saveFilters(payload);
    console.log(
        `AdRemover filters refreshed: ${ruleCount} rules ` +
            `(${skipped} extended-syntax rules skipped)`
    );
    return payload;
}

// Refresh only if missing or older than STALE_AFTER_MS. Used to lazily
// hydrate filters on first "Remove ADs" click when the user hasn't
// restarted Chrome since install.
export async function refreshIfStale() {
    const existing = await loadFilters();
    if (
        existing &&
        typeof existing.fetchedAt === "number" &&
        Date.now() - existing.fetchedAt < STALE_AFTER_MS
    ) {
        return existing;
    }
    return refreshFilters();
}
