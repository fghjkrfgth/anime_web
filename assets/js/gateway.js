// -------------------------------------------------------------------------
// NETWORK GATEWAY ENGINE & ANILIST GRAPHQL CLIENT
// -------------------------------------------------------------------------

// Thread-Safe Shuffler and Silent Failover Engine
async function fetchClusterNode(syncParams = {}, bodyPayload = null) {
    const urlParams = new URLSearchParams(syncParams).toString();

    let targetDataUrl = "https://graphql.anilist.co";
    if (syncParams.action === 'schedule') {
        targetDataUrl = "https://anikototv.to";
    }

    const isPost = !!bodyPayload;

    const fetchOptions = {
        method: isPost ? 'POST' : 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };
    if (isPost) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(bodyPayload);
    }

    // Do not append any query params to GraphQL POST requests
    const queryConnector = (urlParams && !isPost) ? `&${urlParams}` : '';

    // If CLUSTER_MODE is false: exclusively route requests through NODE_REGISTRY[0]
    if (!CLUSTER_MODE) {
        const activeWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[0]);
        currentHost = new URL(activeWorkerUrl).hostname;
        updateActiveNodeDisplay();

        const targetUrl = `${activeWorkerUrl}/?src=${encodeURIComponent(targetDataUrl)}${queryConnector}`;
        const response = await fetch(targetUrl, fetchOptions);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    let attempts = 0;
    const maxAttempts = NODE_REGISTRY.length;

    while (attempts < maxAttempts) {
        // Reset blacklist index pool if all are depleted
        if (blacklistedIndices.size >= NODE_REGISTRY.length) {
            blacklistedIndices.clear();
        }

        // Pick random index
        const idx = Math.floor(Math.random() * NODE_REGISTRY.length);
        if (blacklistedIndices.has(idx)) {
            continue;
        }

        const activeWorkerUrl = decodeRegistryUrl(NODE_REGISTRY[idx]);
        const targetUrl = `${activeWorkerUrl}/?src=${encodeURIComponent(targetDataUrl)}${queryConnector}`;

        attempts++;
        currentHost = new URL(activeWorkerUrl).hostname;
        updateActiveNodeDisplay();

        try {
            // Set timeout controller for 3 seconds
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
            console.warn(`[Node Failover] Fail node ${idx} (${activeWorkerUrl}) - ${err.message}. Fetching next...`);
            blacklistedIndices.add(idx);
        }
    }

    // Last-resort fallback to the primary worker node
    console.error('[Node Failover] All nodes failed. Defaulting to primary node.');
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

async function fetchAniListGraphQL(payload) {
    // Send GraphQL requests through the worker gateway proxy via POST request with a JSON body
    return await fetchClusterNode({}, payload);
}

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
