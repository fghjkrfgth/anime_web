// -------------------------------------------------------------------------
// NETWORK GATEWAY ENGINE
// -------------------------------------------------------------------------

// 1. DIRECT BROWSER CLIENT FOR ANILIST GRAPHQL
async function fetchAniListGraphQL(payload) {
    const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`AniList Direct Fetch HTTP Error: ${response.status}`);
    }

    return await response.json();
}

// 2. HOMEPAGE CATALOG QUERY (DIRECT FROM BROWSER)
async function fetchHomeCatalog() {
    const query = `
      query {
        trending: Page(page: 1, perPage: 12) {
          media(sort: TRENDING_DESC, type: ANIME) {
            id
            title { romaji english native userPreferred }
            coverImage { large extraLarge }
            bannerImage
            description
            meanScore
            format
            status
            nextAiringEpisode { episode }
          }
        }
        popular: Page(page: 1, perPage: 12) {
          media(sort: POPULARITY_DESC, type: ANIME) {
            id
            title { romaji english native userPreferred }
            coverImage { large extraLarge }
            bannerImage
            description
            meanScore
            format
            status
          }
        }
      }
    `;
    return await fetchAniListGraphQL({ query });
}

// 3. WORKER PROXY ENGINE (RESERVED ONLY FOR THIRD-PARTY SCRAPING / SCHEDULE)
async function fetchClusterNode(syncParams = {}, bodyPayload = null) {
    const urlParams = new URLSearchParams(syncParams).toString();

    // Default target MUST be the schedule scraper or target domain, NOT AniList
    let targetDataUrl = "https://anikototv.to";
    if (syncParams.target) {
        targetDataUrl = syncParams.target;
    }

    const isPost = !!bodyPayload;
    const fetchOptions = {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Accept': 'application/json' }
    };

    if (isPost) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(bodyPayload);
    }

    const queryConnector = (urlParams && !isPost) ? `&${urlParams}` : '';

    if (!CLUSTER_MODE) {
        const activeWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[0]);
        currentHost = new URL(activeWorkerUrl).hostname;
        updateActiveNodeDisplay();

        const targetUrl = `${activeWorkerUrl}/?src=${encodeURIComponent(targetDataUrl)}${queryConnector}`;
        const response = await fetch(targetUrl, fetchOptions);
        if (!response.ok) throw new Error(`Gateway HTTP error! status: ${response.status}`);
        return await response.json();
    }

    let attempts = 0;
    const maxAttempts = NODE_REGISTRY.length;

    while (attempts < maxAttempts) {
        if (blacklistedIndices.size >= NODE_REGISTRY.length) {
            blacklistedIndices.clear();
        }

        const idx = Math.floor(Math.random() * NODE_REGISTRY.length);
        if (blacklistedIndices.has(idx)) continue;

        const activeWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[idx]);
        const targetUrl = `${activeWorkerUrl}/?src=${encodeURIComponent(targetDataUrl)}${queryConnector}`;

        attempts++;
        currentHost = new URL(activeWorkerUrl).hostname;
        updateActiveNodeDisplay();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(targetUrl, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok || response.status >= 400) {
                throw new Error(`Status Code ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.warn(`[Node Failover] Node ${idx} (${activeWorkerUrl}) failed: ${err.message}. Retrying...`);
            blacklistedIndices.add(idx);
        }
    }

    const primaryWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[0]);
    currentHost = new URL(primaryWorkerUrl).hostname + " (Fallback)";
    updateActiveNodeDisplay();
    const fallbackUrl = `${primaryWorkerUrl}/?src=${encodeURIComponent(targetDataUrl)}${queryConnector}`;
    const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
    if (!fallbackResponse.ok) throw new Error(`Gateway failed: ${fallbackResponse.status}`);
    return await fallbackResponse.json();
}

function updateActiveNodeDisplay() {
    const el = document.getElementById('active-node-display');
    if (el) {
        el.innerText = currentHost;
    }
}

// 4. FILLER EPISODE DATA FETCHING & CACHING (JIKAN PAGINATED)
const fillerCache = new Map();

async function fetchFillerEpisodes(malId) {
    if (!malId) return new Set();

    const sessionKey = `fillers_${malId}`;
    try {
        const stored = sessionStorage.getItem(sessionKey);
        if (stored) {
            const arr = JSON.parse(stored);
            const cachedSet = new Set(arr);
            fillerCache.set(malId, cachedSet);
            return cachedSet;
        }
    } catch (e) {}

    if (fillerCache.has(malId)) return fillerCache.get(malId);

    const fillerSet = new Set();

    try {
        let page = 1;
        let hasNextPage = true;
        while (hasNextPage && page <= 25) {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        if (item.filler === true) {
                            const epNum = item.mal_id || item.episode_id;
                            if (epNum) fillerSet.add(parseInt(epNum, 10));
                        }
                    });
                }
                hasNextPage = data?.pagination?.has_next_page || false;
                page++;
            } else {
                break;
            }
        }
    } catch (err) {
        console.warn("[Filler API] Warning fetching filler info from Jikan (Paginated):", err);
    }

    try {
        sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(fillerSet)));
    } catch (e) {}

    fillerCache.set(malId, fillerSet);
    return fillerSet;
}

window.fetchFillerEpisodes = fetchFillerEpisodes;

// 5. ACCURATE SUB / DUB EPISODE COUNTS & METADATA FETCHING
const subDubCache = new Map();

async function fetchSubDubCounts(anilistId) {
    if (!anilistId) return { subCount: 0, dubCount: 0, subEps: [], dubEps: [] };
    if (subDubCache.has(anilistId)) return subDubCache.get(anilistId);

    let subCount = 0;
    let dubCount = 0;
    let subEps = [];
    let dubEps = [];

    try {
        const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.episodes) {
                const allEps = Object.keys(data.episodes).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
                subCount = allEps.length;
                subEps = allEps.sort((a, b) => a - b);

                const dubbedKeys = Object.keys(data.episodes).filter(k => {
                    const ep = data.episodes[k];
                    return ep.hasDub === true || ep.dub === true || ep.dubbed === true;
                }).map(k => parseInt(k, 10)).filter(n => !isNaN(n));

                dubCount = dubbedKeys.length;
                dubEps = dubbedKeys.sort((a, b) => a - b);
            }
        }
    } catch (e) {
        console.warn("[SubDub API] Warning fetching sub/dub info:", e);
    }

    if (subCount === 0) {
        let totalEps = 12;
        if (window.showData) {
            totalEps = typeof getActualEpisodeCount === 'function' ? getActualEpisodeCount(window.showData) : (window.showData.episodes || 12);
        }
        subCount = totalEps;
        subEps = Array.from({ length: subCount }, (_, i) => i + 1);
        dubCount = subCount;
        dubEps = [...subEps];
    } else if (dubCount === 0 && subCount > 0) {
        dubCount = subCount;
        dubEps = [...subEps];
    }

    const result = { subCount, dubCount, subEps, dubEps };
    subDubCache.set(anilistId, result);
    return result;
}

window.fetchSubDubCounts = fetchSubDubCounts;
