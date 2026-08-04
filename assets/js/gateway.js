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
