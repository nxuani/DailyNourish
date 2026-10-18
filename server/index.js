// FatSecret proxy — a tiny zero-dependency Node server.
//
// Why this exists: FatSecret only accepts requests from whitelisted IPs, and
// the client secret must never ship inside the mobile app. So the app talks to
// THIS proxy, and the proxy (running on a host with a whitelisted IP) is the
// only thing that holds the secret and talks to FatSecret.
//
// Flow:  app  ->  this proxy (holds secret, whitelisted IP)  ->  FatSecret
//
// Requires Node 18+ (uses the built-in global `fetch`). No npm install needed.

const http = require('http');

// --- Config from environment (set these in Render, NOT in code) -------------
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const SCOPE = process.env.FATSECRET_SCOPE || 'premier';
// Optional shared secret: if set, callers must send it as the `x-proxy-token`
// header. Leave unset while first getting things working, then set it to stop
// strangers from spending your FatSecret quota.
const PROXY_TOKEN = process.env.PROXY_TOKEN || '';

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const SEARCH_URL = 'https://platform.fatsecret.com/rest/foods/search/v1';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
        'Missing FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET env vars.'
    );
    process.exit(1);
}

// --- OAuth2 token, cached in memory until shortly before it expires ----------
let cachedToken = null; // { value: string, expiresAt: number (ms) }

async function getAccessToken() {
    const now = Date.now();
    if (cachedToken && now < cachedToken.expiresAt) {
        return cachedToken.value;
    }

    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
        'base64'
    );
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        // invalid_client here almost always means the host IP isn't whitelisted
        // in the FatSecret console, or the client id/secret are wrong.
        const err = new Error(
            `Token request failed (${res.status}): ${
                data.error || 'unknown'
            }`
        );
        err.status = res.status;
        throw err;
    }

    // Refresh 60s early to avoid using a token that expires mid-request.
    const ttlMs = (Number(data.expires_in) || 86400) * 1000;
    cachedToken = { value: data.access_token, expiresAt: now + ttlMs - 60000 };
    return cachedToken.value;
}

// --- Turn FatSecret's description string into real numbers -------------------
// e.g. "Per 1 serving - Calories: 300kcal | Fat: 13.00g | Carbs: 32.00g | Protein: 15.00g"
function parseDescription(desc = '') {
    const num = (re) => {
        const m = desc.match(re);
        return m ? Number(m[1]) : null;
    };
    const servingMatch = desc.match(/^Per\s+(.+?)\s*-/i);
    return {
        serving: servingMatch ? servingMatch[1].trim() : null,
        calories: num(/Calories:\s*([\d.]+)\s*kcal/i),
        fat: num(/Fat:\s*([\d.]+)\s*g/i),
        carbs: num(/Carbs:\s*([\d.]+)\s*g/i),
        protein: num(/Protein:\s*([\d.]+)\s*g/i),
    };
}

// Shape the proxy returns to the app — stable regardless of FatSecret quirks.
function normalizeFood(food) {
    const n = parseDescription(food.food_description);
    return {
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name || null,
        type: food.food_type || null,
        url: food.food_url || null,
        description: food.food_description || null,
        ...n,
    };
}

async function searchFoods(query, maxResults, pageNumber) {
    const token = await getAccessToken();
    const params = new URLSearchParams({
        search_expression: query,
        format: 'json',
        max_results: String(maxResults),
        page_number: String(pageNumber),
    });

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(`Search failed (${res.status})`);
        err.status = res.status;
        err.body = data;
        throw err;
    }

    // `foods.food` is a single object when there's one result, an array when
    // there are many, and absent when there are none.
    const raw = data.foods && data.foods.food;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return {
        query,
        total: data.foods ? Number(data.foods.total_results) || 0 : 0,
        page: data.foods ? Number(data.foods.page_number) || 0 : 0,
        results: list.map(normalizeFood),
    };
}

// --- HTTP server -------------------------------------------------------------
function sendJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Health check — handy to confirm the service is awake.
    if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/search') {
        // Optional shared-secret gate.
        if (PROXY_TOKEN && req.headers['x-proxy-token'] !== PROXY_TOKEN) {
            return sendJson(res, 401, { error: 'unauthorized' });
        }

        const query = (url.searchParams.get('q') || '').trim();
        if (!query) {
            return sendJson(res, 400, { error: 'missing query param "q"' });
        }
        const maxResults = Math.min(
            Math.max(Number(url.searchParams.get('max')) || 20, 1),
            50
        );
        const pageNumber = Math.max(
            Number(url.searchParams.get('page')) || 0,
            0
        );

        try {
            const out = await searchFoods(query, maxResults, pageNumber);
            return sendJson(res, 200, out);
        } catch (e) {
            console.error('search error:', e.status, e.message, e.body || '');
            return sendJson(res, e.status || 500, {
                error: e.message || 'proxy error',
            });
        }
    }

    sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
    console.log(`FatSecret proxy listening on port ${PORT} (scope=${SCOPE})`);
});
