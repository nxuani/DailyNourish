// App-side client for food search.
//
// The app NEVER talks to FatSecret directly (that would leak the secret and get
// blocked by FatSecret's IP allowlist). It talks only to our proxy — see
// server/README.md for how the proxy is deployed. The proxy URL is not secret,
// so it's fine as an EXPO_PUBLIC value.

const PROXY_URL = process.env.EXPO_PUBLIC_FATSECRET_PROXY_URL;

// Optional shared token. NOTE: anything EXPO_PUBLIC ships inside the app bundle,
// so this only deters casual abuse — it is NOT strong protection. The stronger
// approach (later) is verifying the user's Supabase JWT inside the proxy.
const PROXY_TOKEN = process.env.EXPO_PUBLIC_FATSECRET_PROXY_TOKEN;

// One normalized search result, as the proxy returns it.
export type FoodSearchItem = {
    id: string;
    name: string;
    brand: string | null;
    type: string | null;
    url: string | null;
    description: string | null;
    serving: string | null;
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
};

export type FoodSearchResponse = {
    query: string;
    total: number;
    page: number;
    results: FoodSearchItem[];
};

export type SearchOptions = {
    page?: number;
    maxResults?: number; // 1–50
};

export async function searchFoods(
    query: string,
    { page = 0, maxResults = 20 }: SearchOptions = {}
): Promise<FoodSearchResponse> {
    if (!PROXY_URL) {
        throw new Error(
            'EXPO_PUBLIC_FATSECRET_PROXY_URL is not set — deploy the proxy (see server/README.md) and add its URL to .env'
        );
    }

    const params = new URLSearchParams({
        q: query,
        page: String(page),
        max: String(maxResults),
    });

    const res = await fetch(`${PROXY_URL}/search?${params.toString()}`, {
        headers: PROXY_TOKEN ? { 'x-proxy-token': PROXY_TOKEN } : undefined,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error || `Food search failed (${res.status})`);
    }

    return (await res.json()) as FoodSearchResponse;
}
