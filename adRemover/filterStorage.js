// chrome.storage.local survives service-worker sleeps; module-level vars
// don't, which is why filters live here instead of in memory.

const KEY = "adFilters";

export async function loadFilters() {
    const all = await chrome.storage.local.get(KEY);
    return all[KEY] ?? null;
}

export async function saveFilters(data) {
    await chrome.storage.local.set({ [KEY]: data });
}
