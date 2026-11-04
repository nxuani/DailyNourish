// App-side client for food & recipe search.
//
// The app NEVER talks to FatSecret directly (that would leak the secret and get
// blocked by FatSecret's IP allowlist). It talks only to our proxy — see the
// dailynourish-proxy repo. The proxy URL is not secret, so it's fine as an
// EXPO_PUBLIC value.

const PROXY_URL = process.env.EXPO_PUBLIC_FATSECRET_PROXY_URL;

// Optional shared token. NOTE: anything EXPO_PUBLIC ships inside the app bundle,
// so this only deters casual abuse — it is NOT strong protection. The stronger
// approach (later) is verifying the user's Supabase JWT inside the proxy.
const PROXY_TOKEN = process.env.EXPO_PUBLIC_FATSECRET_PROXY_TOKEN;

type QueryParams = Record<string, string | number | undefined>;

async function proxyGet<T>(path: string, params: QueryParams): Promise<T> {
    if (!PROXY_URL) {
        throw new Error(
            'EXPO_PUBLIC_FATSECRET_PROXY_URL is not set — add the proxy URL to .env'
        );
    }

    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') qs.set(key, String(value));
    }
    const url = `${PROXY_URL}${path}${qs.toString() ? `?${qs.toString()}` : ''}`;

    const res = await fetch(url, {
        headers: PROXY_TOKEN ? { 'x-proxy-token': PROXY_TOKEN } : undefined,
    });
    if (!res.ok) {
        const body = (await res
            .json()
            .catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
}

// ---- Foods (the nutrition/ingredient database) -----------------------------

export type FoodSearchItem = {
    id: string;
    name: string;
    brand: string | null;
    type: string | null;
    url: string | null;
    image: string | null; // food photo URL (null unless Premier images are enabled)
    serving: string | null; // e.g. "240g", "1 serving"
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    diets: string[]; // dietary preferences present, e.g. ["Vegan","Vegetarian"]
    allergens: string[]; // allergens present, e.g. ["Soy"]
    subCategories: string[]; // food categories, e.g. ["Cakes"] (icon fallback)
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
    foodType?: 'generic' | 'brand'; // 'generic' = ingredients; omit for all foods
};

export function searchFoods(
    query: string,
    { page = 0, maxResults = 20, foodType }: SearchOptions = {}
): Promise<FoodSearchResponse> {
    return proxyGet<FoodSearchResponse>('/search', {
        q: query,
        page,
        max: maxResults,
        food_type: foodType,
    });
}

// ---- Recipes (a SEPARATE FatSecret dataset) --------------------------------

export type RecipeItem = {
    id: string;
    name: string;
    description: string | null;
    image: string | null; // recipe photo (included by default, no offering needed)
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    types: string[]; // recipe categories, e.g. ["Main Dishes"]
};

export type RecipeSearchResponse = {
    query: string;
    total: number;
    page: number;
    results: RecipeItem[];
};

export type RecipeSearchOptions = {
    page?: number;
    maxResults?: number;
    recipeTypes?: string; // comma-separated recipe type names (meal type)
    prepTimeFrom?: number; // minutes
    prepTimeTo?: number; // minutes
    sortBy?: string; // newest | oldest | caloriesPerServingAscending | caloriesPerServingDescending
};

export function searchRecipes(
    query: string,
    {
        page = 0,
        maxResults = 20,
        recipeTypes,
        prepTimeFrom,
        prepTimeTo,
        sortBy,
    }: RecipeSearchOptions = {}
): Promise<RecipeSearchResponse> {
    return proxyGet<RecipeSearchResponse>('/recipes', {
        q: query,
        page,
        max: maxResults,
        recipe_types: recipeTypes,
        prep_time_from: prepTimeFrom,
        prep_time_to: prepTimeTo,
        sort_by: sortBy,
    });
}

// The list of meal-type / category names, to populate the "Meal type" filter.
export async function getRecipeTypes(): Promise<string[]> {
    const data = await proxyGet<{ types: string[] }>('/recipe-types', {});
    return data.types ?? [];
}

// Batch stock-image lookup by keyword — used to put a real photo on each
// curated ingredient (the emoji icon stays as the fallback). Returns a map of
// name -> image URL (or null when no photo was found). Chunks the request so a
// large catalog stays within the proxy's per-call cap.
export async function getStockImages(
    names: string[]
): Promise<Record<string, string | null>> {
    const unique = [...new Set(names.filter(Boolean))];
    const out: Record<string, string | null> = {};
    const CHUNK = 40;
    for (let i = 0; i < unique.length; i += CHUNK) {
        const batch = unique.slice(i, i + CHUNK);
        const data = await proxyGet<{
            images: Record<string, string | null>;
        }>('/images', { q: batch.join(',') });
        Object.assign(out, data.images ?? {});
    }
    return out;
}

// Retrieve a saved pantry food through our proxy.
// This requires the new /food route on the deployed proxy.
export async function getFoodById(id: string): Promise<FoodSearchItem> {
    if (!/^[0-9]+$/.test(id)) {
        throw new Error('Invalid food ID.');
    }

    const food = await proxyGet<FoodSearchItem>('/food', { id });

    if (String(food.id) !== id || typeof food.name !== 'string') {
        throw new Error('Unexpected food details returned.');
    }

    return food;
}
