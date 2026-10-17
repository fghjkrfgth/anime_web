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
    const isMobile = window.innerWidth < 768;
    const trendingLimit = isMobile ? 50 : 20;
    const query = `
      query {
        trending: Page(page: 1, perPage: ${trendingLimit}) {
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
        popular: Page(page: 1, perPage: 20) {
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

async function fetchTrendingExplore() {
    const query = `
      query {
        Page(page: 1, perPage: 50) {
          media(sort: TRENDING_DESC, type: ANIME) {
            id
            title { romaji english native userPreferred }
            coverImage { large extraLarge }
            bannerImage
            description
            meanScore
            format
            status
            genres
            episodes
            nextAiringEpisode { episode }
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
        cleanedParams.tz = syncParams.tz || (typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Calcutta') || 'Asia/Calcutta';
        if (syncParams.week !== undefined && syncParams.week !== null) cleanedParams.week = String(syncParams.week);
        cleanedParams.days = '14';
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
        if (!response.ok) {
            let errorJson = null;
            try {
                errorJson = await response.json();
            } catch (e) {}
            if (errorJson && typeof errorJson === 'object') {
                return errorJson;
            }
            throw new Error(`Gateway HTTP error! status: ${response.status}`);
        }
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
                let errorJson = null;
                try {
                    errorJson = await response.json();
                } catch (e) {}
                if (errorJson && typeof errorJson === 'object') {
                    return errorJson;
                }
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
    if (!fallbackResponse.ok) {
        let errorJson = null;
        try {
            errorJson = await fallbackResponse.json();
        } catch (e) {}
        if (errorJson && typeof errorJson === 'object') {
            return errorJson;
        }
        throw new Error(`Gateway failed: ${fallbackResponse.status}`);
    }
    return await fallbackResponse.json();
}

function updateActiveNodeDisplay() {
    const el = document.getElementById('active-node-display');
    if (el) {
        el.innerText = currentHost;
    }
}

// 3.5 FLIXCLOUD EPISODE SERVERS FETCHER
async function fetchEpisodeServers(anilistId, epNum) {
    try {
        const activeWorkerUrl = (typeof decodeRegistryUrl === 'function' && typeof NODE_REGISTRY !== 'undefined' && Array.isArray(NODE_REGISTRY) && NODE_REGISTRY[0])
            ? decodeRegistryUrl(NODE_REGISTRY[0])
            : window.location.origin;
        const res = await fetch(`${activeWorkerUrl}/api/servers?id=${encodeURIComponent(anilistId)}&e=${encodeURIComponent(epNum)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.servers || [];
    } catch (err) {
        console.warn("[Servers Gateway] Failed to fetch episode servers:", err);
        return [];
    }
}
window.fetchEpisodeServers = fetchEpisodeServers;

// 4. FILLER EPISODE DATA FETCHING & CACHING (TARGETED BATCH FETCHING)
const fillerCache = new Map();

async function fetchFillerEpisodes(anilistId, malId = null, targetBatchIdx = 0) {
    if (!anilistId) return new Set();

    const batchIdx = Math.max(0, parseInt(targetBatchIdx || 0, 10) || 0);
    const sessionKey = `fillers_${anilistId}_batch_${batchIdx}`;

    // 1. Check in-memory cache first
    if (fillerCache.has(sessionKey)) {
        return fillerCache.get(sessionKey);
    }

    // 2. Check sessionStorage cache
    try {
        const stored = sessionStorage.getItem(sessionKey);
        if (stored) {
            const arr = JSON.parse(stored);
            const cachedSet = new Set(arr);
            fillerCache.set(sessionKey, cachedSet);
            return cachedSet;
        }
    } catch (e) {}

    const fillerSet = new Set();
    const targetMalId = malId || (window.showData && (window.showData.idMal || window.showData.malId)) || anilistId;
    const page = batchIdx + 1;

    try {
        const timeoutSignal = (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function')
            ? AbortSignal.timeout(3000)
            : (() => {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 3000);
                return controller.signal;
            })();

        const res = await fetch(`https://api.jikan.moe/v4/anime/${targetMalId}/episodes?page=${page}`, {
            signal: timeoutSignal
        });
        if (!res.ok) {
            console.warn(`[Jikan Filler API] Non-200 response (${res.status}) for batch ${batchIdx}`);
            return fillerSet;
        }

        const data = await res.json().catch(() => null);
        if (data && Array.isArray(data.data)) {
            data.data.forEach((item, idx) => {
                if (item && item.filler === true) {
                    const epNum = item.mal_id || item.episode_id || (idx + 1 + batchIdx * 100);
                    if (epNum) fillerSet.add(parseInt(epNum, 10));
                }
            });
        }

        // Cache results in sessionStorage and memory
        try {
            sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(fillerSet)));
        } catch (e) {}

        fillerCache.set(sessionKey, fillerSet);
        return fillerSet;
    } catch (err) {
        console.warn(`[Jikan Filler API] Non-blocking timeout/error for batch ${batchIdx}:`, err?.message || err);
        return fillerSet;
    }
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

    const now = Date.now();
    let maxConfirmedEp = Infinity;
    if (window.showData) {
        maxConfirmedEp = typeof getActualEpisodeCount === 'function' ? getActualEpisodeCount(window.showData) : (window.showData.episodes || Infinity);
    }

    try {
        const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.episodes) {
                const validKeys = Object.keys(data.episodes).map(k => {
                    const ep = data.episodes[k];
                    const num = parseInt(k, 10);
                    return { num, ep };
                }).filter(({ num, ep }) => {
                    if (isNaN(num) || num <= 0) return false;
                    if (num > maxConfirmedEp) return false;
                    if (ep && ep.airDateUtc && new Date(ep.airDateUtc).getTime() > now) return false;
                    return true;
                });

                subEps = validKeys.map(k => k.num).sort((a, b) => a - b);
                subCount = subEps.length;

                const dubbedKeys = validKeys.filter(({ ep }) => {
                    return ep.hasDub === true || ep.dub === true || ep.dubbed === true;
                }).map(k => k.num).sort((a, b) => a - b);

                dubEps = dubbedKeys;
                dubCount = dubEps.length;
            }
        }
    } catch (e) {
        console.warn("[SubDub API] Warning fetching sub/dub info:", e);
    }

    if (subCount === 0) {
        let totalEps = 0;
        if (window.showData) {
            totalEps = typeof getActualEpisodeCount === 'function' ? getActualEpisodeCount(window.showData) : 0;
        }
        if (totalEps > 0) {
            subCount = totalEps;
            subEps = Array.from({ length: subCount }, (_, i) => i + 1);
            dubCount = subCount;
            dubEps = [...subEps];
        } else {
            subCount = 0;
            subEps = [];
            dubCount = 0;
            dubEps = [];
        }
    } else if (dubCount === 0 && subCount > 0) {
        dubCount = subCount;
        dubEps = [...subEps];
    }

    const result = { subCount, dubCount, subEps, dubEps };
    subDubCache.set(anilistId, result);
    return result;
}

window.fetchSubDubCounts = fetchSubDubCounts;

// -------------------------------------------------------------------------
// 6. VERIFIED EPISODE LIST FETCHER & STATE DEDUPLICATION
// -------------------------------------------------------------------------
const episodeListCache = new Map();

async function fetchEpisodeList(animeSlug, seasonId = null) {
    if (!animeSlug) return [];
    const cacheKey = `${animeSlug}_${seasonId || 'default'}`;
    if (episodeListCache.has(cacheKey)) {
        return episodeListCache.get(cacheKey);
    }

    let episodes = [];
    try {
        const seasonParam = seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : '';
        const res = await fetch(`/api/episodes?id=${encodeURIComponent(animeSlug)}${seasonParam}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.episodes)) {
                episodes = data.episodes;
            }
        }
    } catch (err) {
        console.warn("[Gateway] Failed to fetch verified episode list from /api/episodes:", err);
    }

    // Deduplicate entries by episode_number, keeping only the one with verified playable server ID
    const dedupMap = new Map();
    for (const ep of episodes) {
        if (!ep || typeof ep !== 'object') continue;
        const epNum = Number(ep.episode_number || ep.episode || ep.num);
        if (isNaN(epNum) || epNum <= 0) continue;

        const epId = ep.id || ep.episode_id || ep.episodeId;
        const isAvailable = ep.is_available !== false && ep.playable !== false && Boolean(epId);

        if (!dedupMap.has(epNum)) {
            dedupMap.set(epNum, {
                episode_number: epNum,
                id: epId || `ep-${epNum}`,
                title: ep.title || `Episode ${epNum}`,
                is_available: isAvailable,
                thumbnail: ep.thumbnail || '',
                is_filler: Boolean(ep.is_filler)
            });
        } else {
            const existing = dedupMap.get(epNum);
            // If existing doesn't have a real server ID, replace with one that does
            if ((!existing.id || existing.id.startsWith('ep-')) && epId && !epId.startsWith('ep-')) {
                dedupMap.set(epNum, {
                    ...existing,
                    id: epId,
                    is_available: isAvailable
                });
            }
        }
    }

    // Sort episodes strictly in numerical order
    const sorted = Array.from(dedupMap.values()).sort((a, b) => a.episode_number - b.episode_number);

    // Reject phantom gaps: do not synthesize placeholders for missing numbers unless explicitly handling an ongoing hiatus or special OVA flag.
    episodeListCache.set(cacheKey, sorted);
    return sorted;
}

window.fetchEpisodeList = fetchEpisodeList;

