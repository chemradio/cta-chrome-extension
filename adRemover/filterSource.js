// EasyList master list. We consume only the cosmetic-filter subset (rules
// containing "##") — network-blocking rules ("||...") would need
// declarativeNetRequest and aren't useful for pre-screenshot DOM cleanup.
export const EASYLIST_URL = "https://easylist.to/easylist/easylist.txt";

export async function fetchEasylist() {
    const res = await fetch(EASYLIST_URL, { cache: "no-cache" });
    if (!res.ok) {
        throw new Error(
            `EasyList fetch failed: ${res.status} ${res.statusText}`
        );
    }
    return res.text();
}
