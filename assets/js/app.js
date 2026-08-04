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

    renderContinueWatching();
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

async function initApp() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        window.history.replaceState(null, '', '/home' + window.location.search);
    }

    populateYearDropdown();
    setupDropdownListeners();
    setupLanguageListeners();
    updateLanguageSelectionUI();
    renderContinueWatching();
    renderGenreSpotlight();

    checkUrlParamsAndSearch();

    window.addEventListener('popstate', () => {
        checkUrlParamsAndSearch();
    });

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

// Event Listeners setup
const searchInputEl = document.getElementById('search-input');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const drawerFilterTrigger = document.getElementById('drawer-filter-trigger');
const dockFilterBtn = document.getElementById('dock-filter-btn');

if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = window.location.origin + '/home?search=';
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
        if (url.searchParams.get('search') === null) {
            url.searchParams.set('search', '');
        }
        window.history.pushState({}, '', url.toString());
        checkUrlParamsAndSearch();
    });
}

if (dockFilterBtn) {
    dockFilterBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('search') === null) {
            url.searchParams.set('search', '');
        }
        window.history.pushState({}, '', url.toString());
        checkUrlParamsAndSearch();
    });
}

function toggleClusterModeDebug() {
    alert(`Cluster Mode Status: ${CLUSTER_MODE ? "ENABLED (Decentralized Node Shuffling)" : "DISABLED (Primary Worker Proxy)"}\nActive Server: ${currentHost}`);
}

window.addEventListener('DOMContentLoaded', initApp);
