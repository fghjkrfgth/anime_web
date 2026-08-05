// -------------------------------------------------------------------------
// APPLICATION INITIALIZATION & EVENT LISTENERS
// -------------------------------------------------------------------------

let currentQueryText = '';

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function getSelectedFilters() {
    return {
        genre: document.getElementById('filter-genre')?.value || null,
        status: document.getElementById('filter-status')?.value || null,
        format: document.getElementById('filter-format')?.value || null,
        year: document.getElementById('filter-year')?.value || null,
        sort: document.getElementById('filter-sort')?.value || null
    };
}

function resetFiltersToDefault() {
    const selectGenre = document.getElementById('filter-genre');
    const selectStatus = document.getElementById('filter-status');
    const selectFormat = document.getElementById('filter-format');
    const selectYear = document.getElementById('filter-year');
    const selectSort = document.getElementById('filter-sort');

    if (selectGenre) selectGenre.value = '';
    if (selectStatus) selectStatus.value = '';
    if (selectFormat) selectFormat.value = '';
    if (selectYear) selectYear.value = '';
    if (selectSort) selectSort.value = '';
}

function populateYearDropdown() {
    const selectYear = document.getElementById('filter-year');
    if (!selectYear) return;
    const currentYear = new Date().getFullYear();
    let optionsHtml = '<option value="">Any Year</option>';
    for (let y = currentYear; y >= 1990; y--) {
        optionsHtml += `<option value="${y}">${y}</option>`;
    }
    selectYear.innerHTML = optionsHtml;
}

async function executeSearch(queryText = '') {
    currentQueryText = (queryText || '').trim();

    const genre = document.getElementById('filter-genre')?.value || null;
    const status = document.getElementById('filter-status')?.value || null;
    const format = document.getElementById('filter-format')?.value || null;
    const seasonYear = document.getElementById('filter-year')?.value ? parseInt(document.getElementById('filter-year').value, 10) : null;

    if (!currentQueryText && !genre && !status && !format && !seasonYear) {
        clearSearch();
        return;
    }

    const homepageWrapper = document.getElementById('homepage-sections-wrapper');
    if (homepageWrapper) {
        homepageWrapper.classList.add('hidden');
    }

    const searchResultsLayout = document.getElementById('search-results-layout');
    if (searchResultsLayout) {
        searchResultsLayout.classList.remove('hidden');
    }

    const resultsHeader = document.getElementById('search-overlay-results-header');
    if (resultsHeader) resultsHeader.classList.remove('hidden');

    const resultsGrid = document.getElementById('search-results-grid');
    if (resultsGrid) {
        resultsGrid.innerHTML = `
            <div class="col-span-full flex justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00f5ff]"></div>
            </div>
        `;
    }

    const payload = {
        query: `
          query ($search: String, $genre: String, $status: MediaStatus, $format: MediaFormat, $seasonYear: Int, $sort: [MediaSort]) {
            Page (page: 1, perPage: 100) {
              media (search: $search, genre: $genre, status: $status, format: $format, seasonYear: $seasonYear, sort: $sort, type: ANIME) {
                id
                title {
                  romaji
                  english
                  native
                  userPreferred
                }
                coverImage {
                  large
                }
                episodes
                nextAiringEpisode {
                  episode
                }
              }
            }
          }
        `,
        variables: {
            search: currentQueryText || undefined,
            genre: genre || undefined,
            status: status || undefined,
            format: format || undefined,
            seasonYear: seasonYear || undefined,
            sort: document.getElementById('filter-sort')?.value ? [document.getElementById('filter-sort').value] : ["POPULARITY_DESC"]
        }
    };

    try {
        let json = await fetchAniListGraphQL(payload);
        let mediaList = json.data?.Page?.media || [];

        // Fallback 1: If search results are zero and filters were selected, reload query relaxing the filters
        if (mediaList.length === 0 && currentQueryText && (genre || status || format || seasonYear)) {
            console.log('[Search Fallback] Relaxing active filters to find sound-alikes for:', currentQueryText);
            const fallbackPayload = {
                query: payload.query,
                variables: {
                    search: currentQueryText,
                    sort: ['POPULARITY_DESC']
                }
            };
            try {
                const fbJson = await fetchAniListGraphQL(fallbackPayload);
                const fbMedia = fbJson.data?.Page?.media || [];
                if (fbMedia.length > 0) {
                    mediaList = fbMedia;
                }
            } catch (e) {
                console.error('[Search Fallback 1] Failed:', e);
            }
        }

        // Fallback 2: If still empty, try substring match (first 4 characters if query is longer)
        if (mediaList.length === 0 && currentQueryText.length > 4) {
            const sliceQuery = currentQueryText.slice(0, 4);
            console.log('[Search Fallback] Trying substring search:', sliceQuery);
            const fallbackPayload = {
                query: payload.query,
                variables: {
                    search: sliceQuery,
                    sort: ['POPULARITY_DESC']
                }
            };
            try {
                const fbJson = await fetchAniListGraphQL(fallbackPayload);
                const fbMedia = fbJson.data?.Page?.media || [];
                if (fbMedia.length > 0) {
                    mediaList = fbMedia;
                }
            } catch (e) {
                console.error('[Search Fallback 2] Failed:', e);
            }
        }

        if (mediaList.length === 0) {
            const criteriaParts = [];
            if (currentQueryText) criteriaParts.push(`"${currentQueryText}"`);
            if (genre) criteriaParts.push(`Genre: ${genre}`);
            if (status) criteriaParts.push(`Status: ${status}`);
            if (format) criteriaParts.push(`Format: ${format}`);
            if (seasonYear) criteriaParts.push(`Year: ${seasonYear}`);
            const criteriaStr = criteriaParts.join(' + ');

            if (resultsGrid) {
                resultsGrid.innerHTML = `
                    <div class="col-span-full text-center py-6 text-[#a0a5b5]">
                        No anime found matching criteria: ${criteriaStr}
                    </div>
                    <div class="col-span-full border-t border-white/5 pt-6 mt-4">
                        <h3 class="text-sm font-bold tracking-widest text-white uppercase mb-4 pl-3 border-l-4 border-[#00f5ff]">Trending Now</h3>
                    </div>
                    ${(window.trendingCache || []).map(show => createCardHTML(show)).join('')}
                `;
            }
            return;
        }

        if (resultsGrid) {
            resultsGrid.innerHTML = mediaList.map(show => createCardHTML(show)).join('');
        }

    } catch (err) {
        console.error('[Search] GraphQL request failed:', err);
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-themeCrimson font-semibold">
                    Network query failed. Check your internet connection or the AniList service.
                </div>
            `;
        }
    }
}

function clearSearch() {
    document.getElementById('filter-genre').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-format').value = "";
    document.getElementById('filter-year').value = "";
    document.getElementById('filter-sort').value = "";

    window.history.pushState(null, '', '/home');

    const searchResultsLayout = document.getElementById('search-results-layout');
    if (searchResultsLayout) {
        searchResultsLayout.classList.add('hidden');
    }

    const homepageWrapper = document.getElementById('homepage-sections-wrapper');
    if (homepageWrapper) {
        homepageWrapper.classList.remove('hidden');
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    const resultsGrid = document.getElementById('search-results-grid');
    if (resultsGrid) {
        resultsGrid.innerHTML = '';
    }

    const resultsHeader = document.getElementById('search-overlay-results-header');
    if (resultsHeader) {
        resultsHeader.classList.add('hidden');
    }

    handleSpaRouting();
}

function searchGenre(genreName) {
    const url = new URL(window.location.href);
    url.searchParams.set('search', '');
    url.searchParams.set('genre', genreName);
    window.history.pushState({}, '', url.toString());
    checkUrlParamsAndSearch();
}

function syncUrlAndExecuteSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.trim() : '';

    const genreVal = document.getElementById('filter-genre')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';
    const formatVal = document.getElementById('filter-format')?.value || '';
    const yearVal = document.getElementById('filter-year')?.value || '';
    const sortVal = document.getElementById('filter-sort')?.value || '';

    const params = new URLSearchParams();
    params.set('search', query);
    if (genreVal) params.set('genre', genreVal);
    if (statusVal) params.set('status', statusVal);
    if (formatVal) params.set('format', formatVal);
    if (yearVal) params.set('year', yearVal);
    if (sortVal) params.set('sort', sortVal);

    window.history.pushState(null, '', window.location.origin + '/home?' + params.toString());

    if (query !== '') {
        executeSearch(query);
    } else {
        const resultsGrid = document.getElementById('search-results-grid');
        if (resultsGrid) resultsGrid.innerHTML = '';
    }
}

function checkUrlParamsAndSearch() {
    const resultsLayout = document.getElementById('search-results-layout');
    const homeWrapper = document.getElementById('homepage-sections-wrapper');
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');

    const hasSearchParam = window.location.search.includes('?search=') || window.location.search.includes('&search=');

    if (hasSearchParam || searchVal !== null) {
        if (homeWrapper) homeWrapper.classList.add('hidden');
        if (resultsLayout) resultsLayout.classList.remove('hidden');

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchVal || '';
        }

        const filterGenre = document.getElementById('filter-genre');
        if (filterGenre) filterGenre.value = params.get('genre') || '';

        const filterStatus = document.getElementById('filter-status');
        if (filterStatus) filterStatus.value = params.get('status') || '';

        const filterFormat = document.getElementById('filter-format');
        if (filterFormat) filterFormat.value = params.get('format') || '';

        const filterYear = document.getElementById('filter-year');
        if (filterYear) filterYear.value = params.get('year') || '';

        const filterSort = document.getElementById('filter-sort');
        if (filterSort) filterSort.value = params.get('sort') || '';

        const resultsGrid = document.getElementById('search-results-grid');

        if (!searchVal || searchVal.trim() === '') {
            if (resultsGrid) resultsGrid.innerHTML = '';
            if (searchInput) {
                searchInput.focus();
            }
        } else {
            executeSearch(searchVal);
        }
    } else {
        if (resultsLayout) resultsLayout.classList.add('hidden');
        if (homeWrapper) homeWrapper.classList.remove('hidden');

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        const resultsGrid = document.getElementById('search-results-grid');
        if (resultsGrid) resultsGrid.innerHTML = '';
    }
}

function setupDropdownListeners() {
    const selectIds = ['filter-genre', 'filter-status', 'filter-format', 'filter-year', 'filter-sort'];
    selectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                syncUrlAndExecuteSearch();
            });
        }
    });
}

window.homeCatalogFetched = false;

async function initApp() {
    populateYearDropdown();
    setupDropdownListeners();
    setupLanguageListeners();
    updateLanguageSelectionUI();

    window.addEventListener('popstate', () => {
        handleSpaRouting();
    });

    // Intercept clicks on links starting with /home or /watch/ to keep SPA routing pure
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && (href.startsWith('/home') || href.startsWith('/watch/'))) {
                e.preventDefault();
                window.history.pushState(null, '', href);
                handleSpaRouting();
            }
        }
    });

    // Run the routing handler
    await handleSpaRouting();
}

async function handleSpaRouting() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        window.history.replaceState(null, '', '/home' + window.location.search);
    }

    const isWatch = window.location.pathname.startsWith('/watch/');
    
    if (isWatch) {
        await renderWatchView();
    } else {
        // Toggle views
        const watch = document.getElementById('watch-page-layout');
        if (watch) watch.classList.add('hidden');
        
        const homepageWrapper = document.getElementById('homepage-sections-wrapper');
        if (homepageWrapper) homepageWrapper.classList.remove('hidden');
        
        checkUrlParamsAndSearch();
        
        // Fetch home catalog if not already loaded
        if (!window.homeCatalogFetched) {
            window.homeCatalogFetched = true;
            await loadHomeCatalog();
        } else {
            renderContinueWatching();
        }
    }
}

async function loadHomeCatalog() {
    try {
        const json = await fetchHomeCatalog();
        if (!json || !json.data) throw new Error("Empty homepage catalog data");

        const trendingList = json.data.trending?.media || [];
        const popularList = json.data.popular?.media || [];

        window.trendingCache = trendingList;

        renderSpotlight(trendingList);
        renderThumbnailRow('trending-container', trendingList);
        renderThumbnailRow('popular-container', popularList);
        renderThumbnailRow('recent-container', popularList.slice(6) || []);

        fetchClusterNode({ action: 'schedule' })
            .then(schedData => {
                renderAiringSchedule(schedData || []);
            })
            .catch(err => {
                console.error('Failed to load schedule from cluster:', err);
                const columns = document.getElementById('airing-broadcast-columns');
                if (columns) {
                    columns.innerHTML = `
                        <div class="w-full text-center py-8 text-themeCrimson font-semibold">
                            Failed to retrieve live broadcast schedule.
                        </div>
                    `;
                }
            });

        renderThumbnailRow('action-extremes-container', trendingList.slice(4, 10) || []);
        renderThumbnailRow('drama-container', popularList.slice(0, 6) || []);
        renderThumbnailRow('hidden-gems-container', trendingList.slice(8, 12) || []);

    } catch (err) {
        console.error('[App Launch] Initialization failed:', err);
        const errHTML = `
            <div class="w-full text-center py-12 text-themeCrimson font-semibold">
                Failed to connect to cluster nodes. Check gateway server configuration.
            </div>
        `;
        const spotlightTitle = document.getElementById('spotlight-title');
        if (spotlightTitle) {
            spotlightTitle.innerText = "Connection Failed";
            document.getElementById('spotlight-desc').innerText = "Unable to connect to the cluster server.";
        }
        const trendingContainer = document.getElementById('trending-container');
        if (trendingContainer) trendingContainer.innerHTML = errHTML;
        const popularContainer = document.getElementById('popular-container');
        if (popularContainer) popularContainer.innerHTML = errHTML;
        const recentContainer = document.getElementById('recent-container');
        if (recentContainer) recentContainer.innerHTML = errHTML;
        const scheduleColumns = document.getElementById('airing-broadcast-columns');
        if (scheduleColumns) scheduleColumns.innerHTML = errHTML;
        const extremesContainer = document.getElementById('action-extremes-container');
        if (extremesContainer) extremesContainer.innerHTML = errHTML;
        const dramaContainer = document.getElementById('drama-container');
        if (dramaContainer) dramaContainer.innerHTML = errHTML;
        const gemsContainer = document.getElementById('hidden-gems-container');
        if (gemsContainer) gemsContainer.innerHTML = errHTML;
    }
}

async function renderWatchView() {
    // Hide other views
    const homepageWrapper = document.getElementById('homepage-sections-wrapper');
    if (homepageWrapper) homepageWrapper.classList.add('hidden');
    
    const searchResultsLayout = document.getElementById('search-results-layout');
    if (searchResultsLayout) searchResultsLayout.classList.add('hidden');

    // Resolve/create watch layout container
    let watchLayout = document.getElementById('watch-page-layout');
    if (!watchLayout) {
        watchLayout = document.createElement('div');
        watchLayout.id = 'watch-page-layout';
        watchLayout.className = 'w-full relative';
        document.getElementById('main-content').appendChild(watchLayout);
    }
    watchLayout.classList.remove('hidden');

    // Inject Watch HTML template
    watchLayout.innerHTML = `
        <div id="banner-backdrop"
            class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06] blur-2xl pointer-events-none z-0"></div>
        <div class="flex-grow max-w-7xl mx-auto w-full py-6 z-10 grid grid-cols-12 gap-6 relative">
            <div class="col-span-12 lg:col-span-9 flex flex-col gap-6">
                <div class="relative w-full aspect-video rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl group">
                    <video id="main-video-player" class="w-full h-full object-contain" controls playsinline></video>
                    <div id="autoplay-handshake-overlay" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-30 transition-opacity duration-500">
                        <div class="glass-panel p-6 md:p-10 rounded-2xl border border-white/10 max-w-md text-center flex flex-col items-center gap-6 shadow-2xl">
                            <div class="w-16 h-16 rounded-full border-2 border-themeCyan flex items-center justify-center animate-pulse">
                                <svg class="w-8 h-8 text-themeCyan fill-current translate-x-0.5" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 class="text-lg md:text-xl font-extrabold tracking-wider text-white uppercase">BlackLeg Cinema System</h2>
                                <p class="text-steelGray text-xs md:text-sm font-light mt-2 leading-relaxed">
                                    Desktop browsers require an interactive trigger to permit unmuted playback.
                                </p>
                            </div>
                            <button onclick="initializeCinemaMatrix()" class="px-6 py-3 bg-themeCyan hover:bg-themeCyan/80 text-themeBlack font-bold text-sm tracking-widest rounded-lg shadow-lg hover:shadow-themeCyan/30 transition-all duration-300 transform hover:scale-105 active:scale-95 uppercase">
                                Initialize Cinema Matrix
                            </button>
                        </div>
                    </div>
                    <div id="skip-buttons-container" style="display: none !important;" class="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
                        <button id="skip-intro-btn" class="px-4 py-2 bg-[#121218]/80 backdrop-blur-md border border-themeCyan/30 text-themeCyan text-xs md:text-sm font-bold tracking-widest uppercase rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 transform hover:scale-105 active:scale-95" style="display: none !important;">
                            Skip Intro &rarr;
                        </button>
                        <button id="skip-outro-btn" class="px-4 py-2 bg-[#121218]/80 backdrop-blur-md border border-themeCyan/30 text-themeCyan text-xs md:text-sm font-bold tracking-widest uppercase rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 transform hover:scale-105 active:scale-95" style="display: none !important;">
                            Skip Outro &rarr;
                        </button>
                    </div>
                    <div id="player-loading-spinner" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 hidden">
                        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-themeCyan"></div>
                    </div>
                </div>
                <div class="glass-panel p-5 md:p-8 rounded-2xl border border-white/5 flex flex-col gap-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 id="show-title" class="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Loading Title...</h1>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span id="badge-episodes" class="px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wider text-themeCyan bg-themeCyan/10 border border-themeCyan/20 rounded-md">-- Episodes</span>
                            <span id="badge-rating" class="px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wider text-white bg-slate-900/60 border border-white/10 rounded-md">★ N/A</span>
                            <span id="badge-language" class="px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wider text-white bg-slate-900/60 border border-white/10 rounded-md uppercase">SUB</span>
                        </div>
                    </div>
                    <hr class="border-white/5 my-1">
                    <div class="flex flex-col gap-2 relative">
                        <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Synopsis</h3>
                        <div id="synopsis-wrapper" class="text-steelGray text-xs md:text-sm font-light leading-relaxed max-h-12 overflow-hidden transition-all duration-500 ease-in-out">
                            <p id="show-synopsis">Loading show details...</p>
                        </div>
                        <button id="read-more-btn" onclick="toggleSynopsis()" class="text-themeCyan hover:text-white text-xs font-bold tracking-wider mt-1 transition-all duration-300 self-start uppercase">+ Read More</button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div>
                            <span class="text-steelGray text-[10px] uppercase tracking-wider block">Format</span>
                            <span id="meta-format" class="text-white text-xs md:text-sm font-semibold">N/A</span>
                        </div>
                        <div>
                            <span class="text-steelGray text-[10px] uppercase tracking-wider block">Status</span>
                            <span id="meta-status" class="text-white text-xs md:text-sm font-semibold uppercase">N/A</span>
                        </div>
                        <div>
                            <span class="text-steelGray text-[10px] uppercase tracking-wider block">Aired Season</span>
                            <span id="meta-season" class="text-white text-xs md:text-sm font-semibold uppercase">N/A</span>
                        </div>
                        <div>
                            <span class="text-steelGray text-[10px] uppercase tracking-wider block">Studio</span>
                            <span id="meta-studio" class="text-white text-xs md:text-sm font-semibold">N/A</span>
                        </div>
                    </div>
                    <div id="related-section" class="mt-4 flex flex-col gap-3 hidden">
                        <h3 class="text-sm font-semibold text-white uppercase tracking-wider border-l-4 border-themeCyan pl-2.5">Related Adaptations</h3>
                        <div id="related-row" class="flex gap-4 overflow-x-auto pb-3 scrollbar-thin"></div>
                    </div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-3 flex flex-col gap-6">
                <div class="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-5 h-fit lg:max-h-[600px]">
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm md:text-base font-bold tracking-widest text-white uppercase border-l-4 border-themeCyan pl-2.5">Episodes</h2>
                        <button id="lang-toggle-btn" onclick="toggleLanguage()" class="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-md text-themeCyan tracking-widest uppercase transition-all duration-300">Language: SUB</button>
                    </div>
                    <hr class="border-white/5">
                    <select id="batch-selector" class="hidden w-full bg-[#121218] text-white border border-white/10 px-3 py-2 rounded-lg text-xs font-bold tracking-wide focus:outline-none cyan-glow-focus transition-all duration-300"></select>
                    <div id="episodes-grid" class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 overflow-y-auto pr-1 max-h-[420px] scrollbar-thin"></div>
                </div>
            </div>
        </div>
    `;

    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const epNum = parseInt(urlParams.get('ep') || '1', 10);
    const match = pathname.match(/\/watch\/anime\/([a-z0-9\-]+)-(\d+)/i);
    let anilistId = null;

    if (match) {
        anilistId = parseInt(match[2], 10);
    } else {
        anilistId = parseInt(urlParams.get('anilist_id') || urlParams.get('id'), 10);
    }

    if (!anilistId) {
        window.history.replaceState(null, '', '/home');
        handleSpaRouting();
        return;
    }

    window.currentEp = epNum;
    window.currentLang = localStorage.getItem(`lang_${anilistId}`) || 'sub';

    let showData = null;
    try {
        showData = JSON.parse(localStorage.getItem('activeShowData'));
    } catch (e) {}

    setupWatchGlobalFunctions();

    if (showData && parseInt(showData.id, 10) === anilistId) {
        window.showData = showData;
        hydrateWatchUI();
    } else {
        document.getElementById('player-loading-spinner').classList.remove('hidden');
        try {
            const query = `
              query ($id: Int) {
                Media(id: $id, type: ANIME) {
                  id
                  title { romaji english native userPreferred }
                  coverImage { large extraLarge }
                  bannerImage
                  description
                  meanScore
                  format
                  status
                  episodes
                  season
                  seasonYear
                  studios(isMain: true) {
                    nodes { name }
                  }
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        title { romaji english native userPreferred }
                        coverImage { large }
                        type
                        status
                      }
                    }
                  }
                }
              }
            `;
            const json = await fetchAniListGraphQL({ query, variables: { id: anilistId } });
            if (json && json.data && json.data.Media) {
                window.showData = json.data.Media;
                localStorage.setItem('activeShowData', JSON.stringify(window.showData));
                hydrateWatchUI();
            } else {
                throw new Error("Show not found in AniList");
            }
        } catch (err) {
            console.error("Failed to fetch show details directly:", err);
            alert("Failed to load show details. Redirecting to home.");
            window.history.pushState(null, '', '/home');
            handleSpaRouting();
            return;
        }
    }

    window.loadEpisodeStream(window.currentEp);
}

window.renderWatchView = renderWatchView;

function hydrateWatchUI() {
    const showData = window.showData;
    const spinner = document.getElementById('player-loading-spinner');
    if (spinner) spinner.classList.add('hidden');
    
    const bannerUrl = showData.bannerImage || showData.banner || showData.coverImage?.extraLarge || showData.coverImage?.large || '';
    const bannerBackdrop = document.getElementById('banner-backdrop');
    if (bannerBackdrop) {
        bannerBackdrop.style.backgroundImage = `url('${bannerUrl}')`;
    }

    const pref = localStorage.getItem('userLanguagePref') || 'romaji';
    let title = showData.title.romaji || showData.title.english || showData.title.userPreferred;
    if (pref === 'english') {
        title = showData.title.english || showData.title.romaji || showData.title.userPreferred;
    } else if (pref === 'native') {
        title = showData.title.native || showData.title.romaji || showData.title.userPreferred;
    }
    
    const showTitleEl = document.getElementById('show-title');
    if (showTitleEl) showTitleEl.innerText = title;
    
    const synopsisEl = document.getElementById('show-synopsis');
    if (synopsisEl) synopsisEl.innerHTML = showData.description || 'No description available.';
    
    const badgeEpisodesEl = document.getElementById('badge-episodes');
    if (badgeEpisodesEl) badgeEpisodesEl.innerText = `${showData.episodes || 'Ongoing'} Episodes`;
    
    const badgeRatingEl = document.getElementById('badge-rating');
    if (badgeRatingEl) badgeRatingEl.innerText = `★ ${showData.meanScore || 'N/A'}%`;

    const formatEl = document.getElementById('meta-format');
    if (formatEl) formatEl.innerText = showData.format || 'TV';
    
    const statusEl = document.getElementById('meta-status');
    if (statusEl) statusEl.innerText = showData.status || 'FINISHED';

    const seasonStr = showData.season ? `${showData.season} ${showData.seasonYear || ''}` : 'N/A';
    const seasonEl = document.getElementById('meta-season');
    if (seasonEl) seasonEl.innerText = seasonStr;

    const studio = showData.studios?.nodes?.[0]?.name || 'N/A';
    const studioEl = document.getElementById('meta-studio');
    if (studioEl) studioEl.innerText = studio;

    updateLanguageDisplay();
    renderEpisodePicker();
    renderRelatedAdaptations();
}

function setupWatchGlobalFunctions() {
    const video = document.getElementById('main-video-player');
    const skipIntroBtn = document.getElementById('skip-intro-btn');
    const skipOutroBtn = document.getElementById('skip-outro-btn');
    const skipBtnsContainer = document.getElementById('skip-buttons-container');

    window.introTimes = null;
    window.outroTimes = null;
    window.lastSavedTime = 0;
    window.hlsInstance = null;

    window.updateLanguageDisplay = function() {
        const badgeLanguage = document.getElementById('badge-language');
        const langToggleBtn = document.getElementById('lang-toggle-btn');
        if (badgeLanguage) badgeLanguage.innerText = window.currentLang;
        if (langToggleBtn) langToggleBtn.innerText = `Language: ${window.currentLang.toUpperCase()}`;
    };

    window.toggleLanguage = function() {
        window.currentLang = window.currentLang === 'sub' ? 'dub' : 'sub';
        localStorage.setItem(`lang_${window.showData.id}`, window.currentLang);
        window.updateLanguageDisplay();
        window.loadEpisodeStream(window.currentEp);
    };

    window.toggleSynopsis = function() {
        const wrapper = document.getElementById('synopsis-wrapper');
        const btn = document.getElementById('read-more-btn');
        if (!wrapper || !btn) return;

        if (wrapper.classList.contains('max-h-12')) {
            wrapper.classList.remove('max-h-12');
            wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
            btn.innerText = "- Show Less";
        } else {
            wrapper.style.maxHeight = '3rem';
            wrapper.classList.add('max-h-12');
            btn.innerText = "+ Read More";
        }
    };

    window.changeEpisode = function(epNum) {
        if (epNum === window.currentEp) return;
        window.currentEp = epNum;

        const slug = slugify(window.showData.title.english || window.showData.title.romaji || window.showData.title.userPreferred);
        window.history.pushState(null, '', `/watch/anime/${slug}-${window.showData.id}?ep=${epNum}`);

        window.renderEpisodePicker();
        window.loadEpisodeStream(epNum);
    };

    window.renderEpisodePicker = function() {
        const selector = document.getElementById('batch-selector');
        const totalEps = window.showData.episodes || 12;

        const batchSize = 100;
        const numBatches = Math.ceil(totalEps / batchSize);

        if (!selector) return;

        if (numBatches > 1) {
            selector.classList.remove('hidden');
            let selectorHtml = '';
            for (let b = 0; b < numBatches; b++) {
                const start = b * batchSize + 1;
                const end = Math.min((b + 1) * batchSize, totalEps);
                selectorHtml += `<option value="${b}">Episodes ${start} - ${end}</option>`;
            }
            selector.innerHTML = selectorHtml;

            const currentBatch = Math.floor((window.currentEp - 1) / batchSize);
            selector.value = currentBatch;

            selector.onchange = (e) => {
                const selectedBatch = parseInt(e.target.value, 10);
                window.renderEpisodesGridForBatch(selectedBatch, totalEps);
            };

            window.renderEpisodesGridForBatch(currentBatch, totalEps);
        } else {
            selector.classList.add('hidden');
            window.renderEpisodesGridForBatch(0, totalEps);
        }
    };

    window.renderEpisodesGridForBatch = function(batchIdx, totalEps) {
        const container = document.getElementById('episodes-grid');
        if (!container) return;

        const batchSize = 100;
        const start = batchIdx * batchSize + 1;
        const end = Math.min((batchIdx + 1) * batchSize, totalEps);

        let html = '';
        for (let i = start; i <= end; i++) {
            const isWatched = localStorage.getItem(`watched_${window.showData.id}_${i}`) === 'true';
            const isActive = (i === window.currentEp);

            let btnClasses = "episode-btn glass-panel aspect-square rounded-lg flex items-center justify-center font-bold text-xs md:text-sm cursor-pointer ";

            if (isActive) {
                btnClasses += "bg-themeCyan text-themeBlack shadow-[0_0_12px_rgba(0,255,204,0.5)] border-themeCyan ";
            } else if (isWatched) {
                btnClasses += "text-themeCyan hover:text-white border border-themeCyan/30 bg-[#121218]/70 ";
            } else {
                btnClasses += "text-steelGray hover:text-white border border-white/5 hover:border-white/20 bg-[#121218]/40 ";
            }

            html += `
                <button class="${btnClasses}" onclick="changeEpisode(${i})">
                    ${i}
                </button>
            `;
        }
        container.innerHTML = html;
    };

    window.renderRelatedAdaptations = function() {
        const relations = window.showData.relations?.edges || [];
        const row = document.getElementById('related-row');
        const section = document.getElementById('related-section');

        if (!row || !section) return;

        if (!relations || relations.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        let html = '';

        relations.forEach(item => {
            const node = item.node;
            if (!node || !node.id) return;

            const rTitle = node.title?.english || node.title?.romaji || node.title?.userPreferred || 'Related';
            const rCover = node.coverImage?.large || '';
            const relationType = item.relationType || 'Alternative';

            html += `
                <div class="flex-shrink-0 w-28 md:w-32 group cursor-pointer" onclick="viewRelatedShow(${node.id})">
                    <div class="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/5 group-hover:border-themeCyan/40 transition-all duration-300">
                        <img src="${rCover}" alt="${rTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500">
                        <span class="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-black/70 border border-white/10 rounded uppercase text-themeCyan">
                            ${relationType}
                        </span>
                    </div>
                    <h4 class="text-white text-[11px] md:text-xs font-semibold truncate mt-1.5 group-hover:text-themeCyan transition-all duration-300">
                        ${rTitle}
                    </h4>
                    <span class="text-steelGray text-[10px] block">
                        ${node.type || 'ANIME'} • ${node.status || 'FINISHED'}
                    </span>
                </div>
            `;
        });

        row.innerHTML = html;
    };

    window.viewRelatedShow = async function(relatedId) {
        const spinner = document.getElementById('player-loading-spinner');
        if (spinner) spinner.classList.remove('hidden');
        try {
            const query = `
              query ($id: Int) {
                Media(id: $id, type: ANIME) {
                  id
                  title { romaji english native userPreferred }
                  coverImage { large extraLarge }
                  bannerImage
                  description
                  meanScore
                  format
                  status
                  episodes
                  season
                  seasonYear
                  studios(isMain: true) {
                    nodes { name }
                  }
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        title { romaji english native userPreferred }
                        coverImage { large }
                        type
                        status
                      }
                    }
                  }
                }
              }
            `;
            const json = await fetchAniListGraphQL({ query, variables: { id: relatedId } });
            if (json && json.data && json.data.Media) {
                const data = json.data.Media;
                localStorage.setItem('activeShowData', JSON.stringify(data));
                
                const slug = slugify(data.title.english || data.title.romaji || data.title.userPreferred);
                window.history.pushState(null, '', `/watch/anime/${slug}-${data.id}?ep=1`);
                
                renderWatchView();
            } else {
                throw new Error("Media not found");
            }
        } catch (err) {
            console.error("Failed to load related show:", err);
            alert("Could not load details for this related show.");
            if (spinner) spinner.classList.add('hidden');
        }
    };

    window.loadEpisodeStream = async function(epNum) {
        const spinner = document.getElementById('player-loading-spinner');
        if (spinner) spinner.classList.remove('hidden');

        localStorage.setItem(`watched_${window.showData.id}_${epNum}`, 'true');
        window.renderEpisodePicker();

        window.introTimes = null;
        window.outroTimes = null;
        if (skipIntroBtn) skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
        if (skipOutroBtn) skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');

        try {
            const data = await fetchClusterNode({
                anilist_id: window.showData.id,
                ep_num: epNum,
                language: window.currentLang
            });

            if (!data || !data.success || !data.manifest) {
                throw new Error(data ? data.error : "Unknown streams response error");
            }

            window.introTimes = data.intro;
            window.outroTimes = data.outro;

            await loadSubtitles(data.subtitles || []);

            const manifestText = data.manifest;
            const blob = new Blob([manifestText], { type: 'application/x-mpegURL' });
            const manifestBlobUrl = URL.createObjectURL(blob);

            if (window.hlsInstance) {
                window.hlsInstance.destroy();
            }

            if (Hls.isSupported()) {
                window.hlsInstance = new Hls({
                    maxBufferLength: 10,
                    maxMaxBufferLength: 15,
                    maxBufferSize: 5 * 1024 * 1024,
                    enableWorker: true,
                    lowLatencyMode: true
                });
                window.hlsInstance.loadSource(manifestBlobUrl);
                window.hlsInstance.attachMedia(video);

                window.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (spinner) spinner.classList.add('hidden');
                    window.showCinemaHandshake();
                });

                window.hlsInstance.on(Hls.Events.ERROR, (event, errorData) => {
                    if (errorData.fatal) {
                        switch (errorData.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.warn("Network HLS error, attempting to recover...");
                                window.hlsInstance.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn("Media HLS error, attempting to recover...");
                                window.hlsInstance.recoverMediaError();
                                break;
                            default:
                                console.error("Fatal HLS playback crash. Re-initiating stream.");
                                window.loadEpisodeStream(epNum);
                                break;
                        }
                    }
                });
            } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = manifestBlobUrl;
                video.addEventListener('loadedmetadata', () => {
                    if (spinner) spinner.classList.add('hidden');
                    window.showCinemaHandshake();
                });
            } else {
                alert("This browser does not support HLS streaming.");
            }

        } catch (err) {
            console.error('[Stream Launch] Failed to load stream:', err);
            if (spinner) spinner.classList.add('hidden');
            alert(`Playback Error: Failed to resolve streaming source. (${err.message})`);
        }
    };

    async function loadSubtitles(trackList) {
        if (!video) return;
        const existingTracks = video.querySelectorAll('track');
        existingTracks.forEach(t => t.remove());

        if (!trackList || trackList.length === 0) return;

        const activeUrl = decodeRegistryUrl(NODE_REGISTRY[0]);

        for (let track of trackList) {
            if (!track.file && !track.content) continue;

            try {
                let vttText;
                if (track.content) {
                    vttText = track.content;
                } else {
                    const proxyUrl = `${activeUrl}/?src=${encodeURIComponent(track.file)}&action=proxy_caption&vtt_url=${encodeURIComponent(track.file)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error("Sandbox load error");
                    vttText = await response.text();
                }

                const base64Vtt = btoa(unescape(encodeURIComponent(vttText)));
                const dataUrl = 'data:text/vtt;base64,' + base64Vtt;

                const trackEl = document.createElement('track');
                trackEl.kind = track.kind || 'captions';
                trackEl.label = track.label || 'Subtitles';
                trackEl.srclang = track.label ? track.label.toLowerCase().slice(0, 2) : 'en';
                trackEl.src = dataUrl;

                if (track.default || trackEl.label.toLowerCase().includes('eng') || trackEl.label.toLowerCase().includes('en')) {
                    trackEl.default = true;
                }

                video.appendChild(trackEl);
            } catch (err) {
                console.warn(`[Subtitles Fallback] CORS track fetch failure: ${track.label}. Loading via proxy directly.`);
                const proxyUrl = track.file ? `${activeUrl}/?src=${encodeURIComponent(track.file)}&action=proxy_caption&vtt_url=${encodeURIComponent(track.file)}` : '';
                const trackEl = document.createElement('track');
                trackEl.kind = track.kind || 'captions';
                trackEl.label = track.label || 'Subtitles';
                trackEl.srclang = 'en';
                trackEl.src = proxyUrl;
                video.appendChild(trackEl);
            }
        }

        enableDefaultTextTrack();
    }

    function enableDefaultTextTrack() {
        setTimeout(() => {
            if (!video) return;
            const textTracks = video.textTracks;
            if (!textTracks || textTracks.length === 0) return;

            let defaultIndex = -1;
            for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];
                if (track.language.includes('en') || track.label.toLowerCase().includes('eng') || track.label.toLowerCase().includes('en')) {
                    defaultIndex = i;
                    break;
                }
            }

            if (defaultIndex !== -1) {
                for (let i = 0; i < textTracks.length; i++) {
                    if (i === defaultIndex) {
                        textTracks[i].mode = 'showing';
                    } else {
                        textTracks[i].mode = 'hidden';
                    }
                }
            }
        }, 100);
    }

    window.showCinemaHandshake = function() {
        const overlay = document.getElementById('autoplay-handshake-overlay');
        if (overlay) {
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            overlay.classList.add('opacity-100');
        }
    };

    window.initializeCinemaMatrix = function() {
        const overlay = document.getElementById('autoplay-handshake-overlay');
        if (overlay) {
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');
        }

        if (video) {
            video.play()
                .then(() => {
                    console.log("[Autoplay Matrix] Playback launched unmuted successfully.");
                })
                .catch(err => {
                    console.warn("[Autoplay Matrix] Playback blocked, trying muted...", err);
                    video.muted = true;
                    video.play();
                });
        }
    };

    if (video) {
        video.addEventListener('timeupdate', () => {
            const currentTime = video.currentTime;

            if (video.duration && Math.abs(currentTime - window.lastSavedTime) > 8) {
                const percentage = (currentTime / video.duration) * 100;
                updateContinueWatchingHistory(percentage);
                window.lastSavedTime = currentTime;
            }

            if (!video.paused && video.duration > 0 && currentTime > 0) {
                if (skipBtnsContainer) {
                    skipBtnsContainer.style.setProperty('display', 'flex', 'important');
                }

                if (window.introTimes && window.introTimes.start > 0 && currentTime >= window.introTimes.start && currentTime <= window.introTimes.end) {
                    if (skipIntroBtn) {
                        skipIntroBtn.style.setProperty('display', 'block', 'important');
                        setTimeout(() => {
                            skipIntroBtn.classList.remove('opacity-0', 'pointer-events-none');
                            skipIntroBtn.classList.add('opacity-100');
                        }, 10);
                    }
                } else {
                    if (skipIntroBtn) {
                        skipIntroBtn.classList.remove('opacity-100');
                        skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
                        setTimeout(() => {
                            if (skipIntroBtn.classList.contains('opacity-0')) {
                                skipIntroBtn.style.setProperty('display', 'none', 'important');
                            }
                        }, 300);
                    }
                }

                if (window.outroTimes && window.outroTimes.start > 0 && currentTime >= window.outroTimes.start && currentTime <= window.outroTimes.end) {
                    if (skipOutroBtn) {
                        skipOutroBtn.style.setProperty('display', 'block', 'important');
                        setTimeout(() => {
                            skipOutroBtn.classList.remove('opacity-0', 'pointer-events-none');
                            skipOutroBtn.classList.add('opacity-100');
                        }, 10);
                    }
                } else {
                    if (skipOutroBtn) {
                        skipOutroBtn.classList.remove('opacity-100');
                        skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');
                        setTimeout(() => {
                            if (skipOutroBtn.classList.contains('opacity-0')) {
                                skipOutroBtn.style.setProperty('display', 'none', 'important');
                            }
                        }, 300);
                    }
                }
            } else {
                if (skipBtnsContainer) {
                    skipBtnsContainer.style.setProperty('display', 'none', 'important');
                }
                if (skipIntroBtn) {
                    skipIntroBtn.classList.remove('opacity-100');
                    skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
                    skipIntroBtn.style.setProperty('display', 'none', 'important');
                }
                if (skipOutroBtn) {
                    skipOutroBtn.classList.remove('opacity-100');
                    skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');
                    skipOutroBtn.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    if (skipIntroBtn) {
        skipIntroBtn.addEventListener('click', () => {
            if (window.introTimes && video) {
                video.currentTime = window.introTimes.end;
                skipIntroBtn.classList.remove('opacity-100');
                skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
                skipIntroBtn.style.setProperty('display', 'none', 'important');
            }
        });
    }

    if (skipOutroBtn) {
        skipOutroBtn.addEventListener('click', () => {
            if (window.outroTimes && video) {
                video.currentTime = window.outroTimes.end;
                skipOutroBtn.classList.remove('opacity-100');
                skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');
                skipOutroBtn.style.setProperty('display', 'none', 'important');
            }
        });
    }

    function updateContinueWatchingHistory(percentage) {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('continueWatching')) || [];
        } catch (e) {
            history = [];
        }

        history = history.filter(item => item && item.show && item.show.id !== window.showData.id);

        history.unshift({
            show: window.showData,
            epNum: window.currentEp,
            percentage: percentage
        });

        history = history.slice(0, 10);
        localStorage.setItem('continueWatching', JSON.stringify(history));
    }
}

// Event Listeners setup
const searchInputEl = document.getElementById('search-input');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const drawerFilterTrigger = document.getElementById('drawer-filter-trigger');
const dockFilterBtn = document.getElementById('dock-filter-btn');

if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState(null, '', '/home?search=');
        handleSpaRouting();
    });
}

if (searchInputEl) {
    searchInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            syncUrlAndExecuteSearch();
        }
    });

    searchInputEl.addEventListener('input', debounce((e) => {
        syncUrlAndExecuteSearch();
    }, 500));
}

const searchOverlayClear = document.getElementById('search-overlay-clear');
if (searchOverlayClear) {
    searchOverlayClear.addEventListener('click', () => {
        clearSearch();
    });
}

const drawer = document.getElementById('mobile-drawer');
const overlay = document.getElementById('mobile-drawer-overlay');
const drawerToggle = document.getElementById('mobile-drawer-toggle');
const drawerClose = document.getElementById('mobile-drawer-close');

function toggleDrawer(open) {
    if (!drawer || !overlay) return;
    if (open) {
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

if (drawerToggle) drawerToggle.addEventListener('click', () => toggleDrawer(true));
if (drawerClose) drawerClose.addEventListener('click', () => toggleDrawer(false));
if (overlay) overlay.addEventListener('click', () => toggleDrawer(false));

if (drawerFilterTrigger) {
    drawerFilterTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDrawer(false);
        const url = new URL(window.location.href);
        url.pathname = '/home';
        if (url.searchParams.get('search') === null) {
            url.searchParams.set('search', '');
        }
        window.history.pushState({}, '', url.toString());
        handleSpaRouting();
    });
}

if (dockFilterBtn) {
    dockFilterBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.pathname = '/home';
        if (url.searchParams.get('search') === null) {
            url.searchParams.set('search', '');
        }
        window.history.pushState({}, '', url.toString());
        handleSpaRouting();
    });
}

function toggleClusterModeDebug() {
    alert(`Cluster Mode Status: ${CLUSTER_MODE ? "ENABLED (Decentralized Node Shuffling)" : "DISABLED (Primary Worker Proxy)"}\nActive Server: ${currentHost}`);
}

window.addEventListener('DOMContentLoaded', initApp);
