// EasyList master list. We consume only the cosmetic-filter subset (rules
// containing "##") — network-blocking rules ("||...") would need
// declarativeNetRequest and aren't useful for pre-screenshot DOM cleanup.
export const EASYLIST_URL = "https://easylist.to/easylist/easylist.txt";

// Mirrors tried in order if the primary host is blocked (corp proxy / SSL
// inspection often blocks easylist.to specifically but lets GitHub through).
const EASYLIST_MIRRORS = [
    EASYLIST_URL,
    "https://raw.githubusercontent.com/easylist/easylist/master/easylist.txt",
    "https://cdn.jsdelivr.net/gh/easylist/easylist@master/easylist.txt",
];

const RETRY_DELAYS_MS = [0, 1000, 3000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
        throw new Error(`${url} → ${res.status} ${res.statusText}`);
    }
    return res.text();
}

export async function fetchEasylist() {
    const errors = [];
    for (const url of EASYLIST_MIRRORS) {
        for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
            if (RETRY_DELAYS_MS[attempt]) await sleep(RETRY_DELAYS_MS[attempt]);
            try {
                return await fetchOnce(url);
            } catch (e) {
                errors.push(`${url} attempt ${attempt + 1}: ${e.message || e}`);
            }
        }
    }
    throw new Error(`EasyList fetch failed across all mirrors:\n${errors.join("\n")}`);
}
