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

// 3. WORKER PROXY ENGINE (STEALTH COMMUNITY ROUTES)
async function fetchClusterNode(syncParams = {}, bodyPayload = null) {
    const isPost = !!bodyPayload;
    const fetchOptions = {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Accept': 'application/json' }
    };

    if (isPost) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(bodyPayload);
    }

    let routePath = "/rating";
    const cleanedParams = {};

    if (syncParams.route === 'comment' || syncParams.action === 'comment' || syncParams.s || syncParams.slug) {
        routePath = "/comment";
        cleanedParams.s = syncParams.s || syncParams.slug || "";
        cleanedParams.id = syncParams.id || syncParams.anilistId || syncParams.anilist_id || "";
    } else if (syncParams.action === 'schedule' || syncParams.route === 'schedule') {
        routePath = "/schedule";
        if (syncParams.action) cleanedParams.action = syncParams.action;
    } else {
        routePath = "/rating";
        cleanedParams.id = syncParams.id || syncParams.anilist_id || syncParams.anilistId || "";
        cleanedParams.e = syncParams.e || syncParams.ep_num || syncParams.ep || syncParams.episodeId || "1";
        cleanedParams.lang = syncParams.lang || syncParams.language || syncParams.provider || "sub";
    }

    const queryStr = new URLSearchParams(cleanedParams).toString();
    const queryConnector = (queryStr && !isPost) ? `?${queryStr}` : '';

    if (!CLUSTER_MODE) {
        const activeWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[0]);
        currentHost = new URL(activeWorkerUrl).hostname;
        updateActiveNodeDisplay();

        const targetUrl = `${activeWorkerUrl}${routePath}${queryConnector}`;
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
        const targetUrl = `${activeWorkerUrl}${routePath}${queryConnector}`;

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
    const fallbackUrl = `${primaryWorkerUrl}${routePath}${queryConnector}`;
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

// 4. FILLER EPISODE DATA FETCHING & CACHING (STRICT JIKAN PAGINATION)
const fillerCache = new Map();

async function fetchFillerEpisodes(anilistId, malId = null) {
    if (!anilistId) return new Set();

    const sessionKey = `fillers_${anilistId}`;
    try {
        const stored = sessionStorage.getItem(sessionKey);
        if (stored) {
            const arr = JSON.parse(stored);
            const cachedSet = new Set(arr);
            fillerCache.set(anilistId, cachedSet);
            return cachedSet;
        }
    } catch (e) {}

    if (fillerCache.has(anilistId)) return fillerCache.get(anilistId);

    const fillerSet = new Set();
    const targetMalId = malId || anilistId;

    try {
        let page = 1;
        let hasNextPage = true;
        while (hasNextPage && page <= 50) {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${targetMalId}/episodes?page=${page}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.data)) {
                    data.data.forEach((item, idx) => {
                        if (item.filler === true) {
                            const epNum = item.mal_id || item.episode_id || (idx + 1 + (page - 1) * 100);
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
        console.warn("[Filler API] Jikan paginated fetch error:", err);
    }

    try {
        sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(fillerSet)));
    } catch (e) {}

    fillerCache.set(anilistId, fillerSet);
    return fillerSet;
}

window.fetchFillerEpisodes = fetchFillerEpisodes;

// 5. FRANCHISE TREE FETCHING (VIA WORKER PROXY)
const franchiseCache = new Map();

async function fetchFranchiseTree(slug, anilistId) {
    if (!slug || !anilistId) return [];
    const key = `${slug}-${anilistId}`;
    if (franchiseCache.has(key)) return franchiseCache.get(key);

    try {
        const data = await fetchClusterNode({
            route: 'comment',
            s: slug,
            id: anilistId
        });

        if (data && Array.isArray(data.seasons)) {
            franchiseCache.set(key, data.seasons);
            return data.seasons;
        }
    } catch (err) {
        console.warn("[Franchise Tree] Worker fetch error:", err);
    }

    franchiseCache.set(key, []);
    return [];
}

window.fetchFranchiseTree = fetchFranchiseTree;
window.fetchAnimexFranchiseData = fetchFranchiseTree;

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
