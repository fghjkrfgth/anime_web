// -------------------------------------------------------------------------
// APPLICATION INITIALIZATION & EVENT LISTENERS
// -------------------------------------------------------------------------

let currentQueryText = '';

const FULL_SHOW_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native userPreferred }
      coverImage { color large extraLarge }
      bannerImage
      description
      duration
      averageScore
      meanScore
      popularity
      favourites
      source
      status
      episodes
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      season
      seasonYear
      genres
      studios(isMain: true) {
        nodes { name }
      }
      tags {
        name
        rank
        category
      }
      trailer {
        site
        id
      }
      characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
        edges {
          role
          voiceActors(language: JAPANESE) {
            id
            name { full }
            image { large }
          }
          node {
            id
            name { full userPreferred }
            image { large }
          }
        }
      }
      staff(perPage: 8) {
        edges {
          role
          node {
            id
            name { full }
            image { large }
          }
        }
      }
      stats {
        scoreDistribution {
          score
          amount
        }
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
      reviews(perPage: 5) {
        nodes {
          id
          summary
          score
          body
          user {
            name
            avatar { large }
          }
        }
      }
      recommendations(perPage: 10) {
        edges {
          node {
            mediaRecommendation {
              id
              title { romaji english native userPreferred }
              coverImage { large }
              type
              status
              format
            }
          }
        }
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
            format
          }
        }
      }
    }
  }
`;

function getActualEpisodeCount(media) {
    if (!media) return 12;
    if (media.episodes) return media.episodes;
    if (media.nextAiringEpisode && media.nextAiringEpisode.episode) {
        return media.nextAiringEpisode.episode - 1;
    }
    if (media.id === 21) return 1120; // One Piece safe current count
    if (media.status === 'RELEASING') return 24;
    return 12;
}

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

function setupMobileBottomNav() {
    const searchBtn = document.getElementById('mobile-nav-search-btn');
    if (searchBtn) {
        searchBtn.onclick = () => {
            const url = new URL(window.location.href);
            if (url.pathname !== '/home' && url.pathname !== '/') {
                window.history.pushState({}, '', '/home');
                handleSpaRouting();
            }
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    }

    const filterBtn = document.getElementById('dock-filter-btn');
    if (filterBtn) {
        filterBtn.onclick = () => {
            const filterContainer = document.getElementById('filter-dropdowns-container');
            if (filterContainer) {
                filterContainer.classList.toggle('hidden');
                filterContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    }
}

async function initApp() {
    console.log('[BlackLeg Init] Initializing SPA router...');

    try {
        if (!localStorage.getItem('userLanguagePref')) {
            localStorage.setItem('userLanguagePref', 'en');
        }

        if (typeof populateYearDropdown === 'function') populateYearDropdown();
        if (typeof setupDropdownListeners === 'function') setupDropdownListeners();

        if (typeof window.setupLanguageListeners === 'function') {
            window.setupLanguageListeners();
        } else if (typeof setupLanguageListeners === 'function') {
            setupLanguageListeners();
        } else {
            console.warn('[Init] setupLanguageListeners not yet defined on window context.');
        }

        if (typeof setupMobileBottomNav === 'function') setupMobileBottomNav();
        if (typeof updateLanguageSelectionUI === 'function') updateLanguageSelectionUI();
    } catch (err) {
        console.error('[Init Error] Non-fatal listener init error:', err);
    }

    window.addEventListener('popstate', () => {
        handleSpaRouting();
    });
    window.addEventListener('hashchange', () => {
        handleSpaRouting();
    });

    // Run the routing handler
    try {
        await handleSpaRouting();
    } catch (err) {
        console.error('[Init] Error during SPA routing execution:', err);
    }
}

async function handleSpaRouting() {
    console.log('[BlackLeg Router] Current path:', window.location.pathname, 'hash:', window.location.hash);

    const pathname = window.location.pathname;
    const hash = window.location.hash;

    const isLanding = (pathname === '/' || pathname === '' || pathname.endsWith('/index.html')) && (!hash || hash === '#');
    const isWatch = pathname.startsWith('/watch/');
    const isDetails = pathname.startsWith('/anime/');
    const isExplore = pathname.startsWith('/explore') || hash === '#trending-section' || hash === '#/trending-section';
    const isSchedule = pathname.startsWith('/schedule') || hash === '#airing-broadcast-section' || hash === '#/airing-broadcast-section';
    const isContact = pathname.startsWith('/contact');
    const isDmca = pathname.startsWith('/dmca');
    const isTerms = pathname.startsWith('/terms');

    // Toggle views
    const landing = document.getElementById('landing-page-layout');
    const watch = document.getElementById('watch-page-layout');
    const details = document.getElementById('anime-details-layout');
    const trendingExplore = document.getElementById('trending-explore-layout');
    const dedicatedSchedule = document.getElementById('dedicated-schedule-layout');
    const contact = document.getElementById('contact-page-layout');
    const dmca = document.getElementById('dmca-page-layout');
    const terms = document.getElementById('terms-page-layout');
    const homepageWrapper = document.getElementById('homepage-sections-wrapper');
    const searchResultsLayout = document.getElementById('search-results-layout');

    if (landing) landing.classList.toggle('hidden', !isLanding);
    if (watch) watch.classList.toggle('hidden', !isWatch);
    if (details) details.classList.toggle('hidden', !isDetails);
    if (trendingExplore) trendingExplore.classList.toggle('hidden', !isExplore);
    if (dedicatedSchedule) dedicatedSchedule.classList.toggle('hidden', !isSchedule);
    if (contact) contact.classList.toggle('hidden', !isContact);
    if (dmca) dmca.classList.toggle('hidden', !isDmca);
    if (terms) terms.classList.toggle('hidden', !isTerms);

    // Stop background spotlight auto-rotator when leaving home view
    const isHomeView = (!isLanding && !isWatch && !isDetails && !isExplore && !isSchedule && !isContact && !isDmca && !isTerms);
    if (!isHomeView && window.spotlightInterval) {
        clearInterval(window.spotlightInterval);
        window.spotlightInterval = null;
    }

    // Pause video player if leaving watch view to free main thread CPU/GPU resources
    if (!isWatch) {
        const videoPlayer = document.getElementById('main-video-player');
        if (videoPlayer && !videoPlayer.paused) {
            videoPlayer.pause();
        }
    }

    if (isLanding) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        if (typeof window.renderLandingView === 'function') {
            window.renderLandingView();
        }
    } else if (isWatch) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        await renderWatchView();
    } else if (isDetails) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        await renderAnimeDetailsView();
    } else if (isExplore) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        if (typeof window.renderTrendingExploreView === 'function') {
            await window.renderTrendingExploreView();
        }
    } else if (isSchedule) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        if (typeof window.renderDedicatedScheduleView === 'function') {
            await window.renderDedicatedScheduleView();
        }
    } else if (isContact) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        renderContactView();
    } else if (isDmca) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        renderDmcaView();
    } else if (isTerms) {
        if (homepageWrapper) homepageWrapper.classList.add('hidden');
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        renderTermsView();
    } else {
        if (homepageWrapper) {
            homepageWrapper.classList.remove('hidden');
            homepageWrapper.classList.add('animate-crystal-in');
        }
        if (searchResultsLayout) searchResultsLayout.classList.add('hidden');
        
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
        }
        const spotlightDesc = document.getElementById('spotlight-desc');
        if (spotlightDesc) {
            spotlightDesc.innerText = "Unable to connect to the cluster server.";
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
            <!-- 1. Video Player & 2. Player Controls / Sub-Dub Toggle / Auto Skip Bar -->
            <div class="col-span-12 lg:col-span-8 flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
                <div id="player-container" class="relative w-full aspect-video rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl group">
                    <video id="main-video-player" class="w-full h-full object-contain" playsinline></video>
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

                <!-- Player Control Panel & Automated Feature Toggles -->
                <div class="glass-panel p-4 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <button id="prev-ep-btn" onclick="changeEpisode(window.currentEp - 1)" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-lg transition-all duration-300 flex items-center gap-1.5 uppercase">
                            &larr; Prev
                        </button>
                        <button id="next-ep-btn" onclick="changeEpisode(window.currentEp + 1)" class="px-3.5 py-2 bg-[var(--anime-accent-color,#f59e0b)] hover:opacity-90 text-[#08080c] font-extrabold text-xs rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-md shadow-[var(--anime-accent-color,#f59e0b)]/20 uppercase">
                            Next &rarr;
                        </button>
                        <div class="flex items-center gap-1.5 p-1 rounded-xl bg-[#121218] border border-white/10 select-none">
                            <button id="btn-sub-toggle" onclick="setAudioLanguage('sub')" class="px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-300">
                                💬 SUB
                            </button>
                            <button id="btn-dub-toggle" onclick="setAudioLanguage('dub')" class="px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-300">
                                🎙️ DUB
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 flex-wrap">
                        <label class="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                            <input type="checkbox" id="toggle-auto-skip-intro" onchange="toggleUserPreference('autoSkipIntro', this.checked)" class="w-4 h-4 rounded border-white/10 bg-white/5 text-[var(--anime-accent-color,#f59e0b)] focus:ring-0">
                            <span class="text-steelGray">Auto Skip Intro</span>
                        </label>
                        <label class="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                            <input type="checkbox" id="toggle-auto-skip-outro" onchange="toggleUserPreference('autoSkipOutro', this.checked)" class="w-4 h-4 rounded border-white/10 bg-white/5 text-[var(--anime-accent-color,#f59e0b)] focus:ring-0">
                            <span class="text-steelGray">Auto Skip Outro</span>
                        </label>
                        <label class="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                            <input type="checkbox" id="toggle-auto-next" onchange="toggleUserPreference('autoNext', this.checked)" class="w-4 h-4 rounded border-white/10 bg-white/5 text-[var(--anime-accent-color,#f59e0b)] focus:ring-0">
                            <span class="text-steelGray">Auto Next</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 3. Episode Selector & Grid Container (Sits directly under controls on mobile, right column on desktop) -->
            <div class="col-span-12 lg:col-span-4 flex flex-col gap-6 lg:col-start-9 lg:row-start-1 lg:row-span-3">
                <div class="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm md:text-base font-bold tracking-widest text-white uppercase border-l-4 pl-2.5" style="border-color: var(--anime-accent-color,#f59e0b);">Episodes</h2>
                    </div>
                    <hr class="border-white/5">
                    <select id="batch-selector" class="hidden w-full bg-[#121218] text-white border border-white/10 px-3 py-2 rounded-lg text-xs font-bold tracking-wide focus:outline-none transition-all duration-300"></select>
                    <div id="episodes-grid" class="grid grid-cols-4 gap-2 pr-1"></div>
                </div>
            </div>

            <!-- 4. Details & Synopsis Block -->
            <div class="col-span-12 lg:col-span-8 flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
                <div class="glass-panel p-5 md:p-8 rounded-2xl border border-white/5 flex flex-col gap-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 id="show-title" class="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Loading Title...</h1>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span id="badge-rating" class="px-2.5 py-1 text-[10px] md:text-xs font-bold tracking-wider rounded-md" style="background: rgba(var(--anime-accent-rgb,245,158,11),0.15); border: 1px solid rgba(var(--anime-accent-rgb,245,158,11),0.3); color: var(--anime-accent-color,#f59e0b);">★ N/A</span>
                            <span id="badge-episodes" class="px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wider text-white bg-slate-900/60 border border-white/10 rounded-md">-- EPISODES</span>
                        </div>
                    </div>
                    <hr class="border-white/5 my-1">
                    <div class="flex flex-col gap-2 relative">
                        <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Synopsis</h3>
                        <div id="synopsis-wrapper" class="text-steelGray text-xs md:text-sm font-light leading-relaxed max-h-12 overflow-hidden transition-all duration-500 ease-in-out">
                            <p id="show-synopsis">Loading show details...</p>
                        </div>
                        <button id="read-more-btn" onclick="toggleSynopsis()" class="text-xs font-bold tracking-wider mt-1 transition-all duration-300 self-start uppercase" style="color: var(--anime-accent-color,#f59e0b);">+ Read More</button>
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
                </div>
            </div>

            <!-- 5. Related Adaptations Container -->
            <div id="watch-related-container" class="col-span-12 lg:col-span-8 flex flex-col gap-6 hidden lg:col-start-1 lg:row-start-3"></div>
        </div>
    `;

    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const hasExplicitEp = urlParams.has('ep');
    let epNum = parseInt(urlParams.get('ep') || '1', 10);
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

    if (!hasExplicitEp && typeof getLastWatchedEpisode === 'function') {
        const lastEp = getLastWatchedEpisode(anilistId);
        if (lastEp > 1) {
            epNum = lastEp;
        }
    }

    window.currentEp = epNum;
    window.currentLang = localStorage.getItem(`lang_${anilistId}`) || 'sub';

    let showData = null;
    try {
        showData = JSON.parse(localStorage.getItem('activeShowData'));
    } catch (e) {}

    setupWatchGlobalFunctions();

    if (showData && parseInt(showData.id, 10) === anilistId && showData.characters) {
        window.showData = showData;
        hydrateWatchUI();
    } else {
        document.getElementById('player-loading-spinner').classList.remove('hidden');
        try {
            const json = await fetchAniListGraphQL({ query: FULL_SHOW_QUERY, variables: { id: anilistId } });
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

async function hydrateWatchUI() {
    const showData = window.showData;
    const spinner = document.getElementById('player-loading-spinner');
    if (spinner) spinner.classList.add('hidden');

    const accentColor = showData.coverImage?.color || showData.color || '#f59e0b';
    applyAnimeThemeColor(accentColor);

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

    const totalEps = getActualEpisodeCount(showData);
    const badgeEpisodesEl = document.getElementById('badge-episodes');
    if (badgeEpisodesEl) badgeEpisodesEl.innerText = `${totalEps} EPISODES`;

    const badgeRatingEl = document.getElementById('badge-rating');
    if (badgeRatingEl) badgeRatingEl.innerText = `★ ${showData.averageScore || showData.meanScore || 'N/A'}%`;

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

    updateSubDubButtonsUI();
    if (typeof window.initPlayerControls === 'function') {
        window.initPlayerControls();
    }
    renderStreamPreRollOverlay(window.currentEp);
    renderEpisodePicker();
    renderRelatedAdaptations();
}

function getUserPreferences() {
    try {
        const stored = localStorage.getItem('anime_user_preferences');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
        autoSkipIntro: false,
        autoSkipOutro: false,
        autoNext: true,
        preferredLang: 'sub'
    };
}

function toggleUserPreference(key, value) {
    const prefs = getUserPreferences();
    prefs[key] = value;
    localStorage.setItem('anime_user_preferences', JSON.stringify(prefs));
}
window.getUserPreferences = getUserPreferences;
window.toggleUserPreference = toggleUserPreference;

function setupWatchGlobalFunctions() {
    const video = document.getElementById('main-video-player');
    const skipIntroBtn = document.getElementById('skip-intro-btn');
    const skipOutroBtn = document.getElementById('skip-outro-btn');

    window.introTimes = null;
    window.outroTimes = null;
    window.lastSavedTime = 0;
    window.hlsInstance = null;

    const prefs = getUserPreferences();
    const autoSkipIntroEl = document.getElementById('toggle-auto-skip-intro');
    if (autoSkipIntroEl) autoSkipIntroEl.checked = !!prefs.autoSkipIntro;
    const autoSkipOutroEl = document.getElementById('toggle-auto-skip-outro');
    if (autoSkipOutroEl) autoSkipOutroEl.checked = !!prefs.autoSkipOutro;
    const autoNextEl = document.getElementById('toggle-auto-next');
    if (autoNextEl) autoNextEl.checked = !!prefs.autoNext;

    if (video) {
        video.ontimeupdate = () => {
            const currentPrefs = getUserPreferences();
            const currTime = video.currentTime;

            if (currentPrefs.autoSkipIntro && window.introTimes && window.introTimes.end > 0) {
                if (currTime >= window.introTimes.start && currTime < window.introTimes.end - 0.5) {
                    video.currentTime = window.introTimes.end;
                }
            }

            if (currentPrefs.autoSkipOutro && window.outroTimes && window.outroTimes.end > 0) {
                if (currTime >= window.outroTimes.start && currTime < window.outroTimes.end - 0.5) {
                    video.currentTime = window.outroTimes.end;
                }
            }
        };

        video.onended = () => {
            const currentPrefs = getUserPreferences();
            if (currentPrefs.autoNext) {
                const totalEps = getActualEpisodeCount(window.showData);
                if (window.currentEp < totalEps) {
                    window.changeEpisode(window.currentEp + 1);
                }
            }
        };
    }

    window.updateSubDubButtonsUI = function() {
        const subBtn = document.getElementById('btn-sub-toggle');
        const dubBtn = document.getElementById('btn-dub-toggle');
        if (!subBtn || !dubBtn) return;

        if (window.currentLang === 'dub') {
            dubBtn.className = "px-3.5 py-1.5 text-xs font-extrabold rounded-lg uppercase tracking-wider transition-all duration-300 bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] shadow-[0_0_10px_var(--anime-accent-color,#f59e0b)]";
            dubBtn.innerHTML = "🎙️ DUB";
            subBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-300 text-steelGray hover:text-white bg-transparent";
            subBtn.innerHTML = "💬 SUB";
        } else {
            subBtn.className = "px-3.5 py-1.5 text-xs font-extrabold rounded-lg uppercase tracking-wider transition-all duration-300 bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] shadow-[0_0_10px_var(--anime-accent-color,#f59e0b)]";
            subBtn.innerHTML = "💬 SUB";
            dubBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-300 text-steelGray hover:text-white bg-transparent";
            dubBtn.innerHTML = "🎙️ DUB";
        }

        if (window.dubUnavailable) {
            dubBtn.disabled = true;
            dubBtn.title = `Dub unavailable for Episode ${window.currentEp || 1}`;
            dubBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all duration-300 opacity-50 cursor-not-allowed text-steelGray/50 bg-transparent";
            dubBtn.innerHTML = "🎙️ DUB (Unavailable)";
        } else {
            dubBtn.disabled = false;
            dubBtn.removeAttribute('title');
        }
    };

    window.setAudioLanguage = function(lang) {
        if (lang === 'dub' && window.dubUnavailable) return;
        window.currentLang = lang;
        if (window.showData?.id) {
            localStorage.setItem(`lang_${window.showData.id}`, lang);
        }
        toggleUserPreference('preferredLang', lang);
        window.updateSubDubButtonsUI();
        window.renderEpisodePicker();
        window.loadEpisodeStream(window.currentEp);
    };

    window.renderStreamPreRollOverlay = function(epNum) {
        const video = document.getElementById('main-video-player');
        const container = video?.parentElement;
        if (!container) return;

        const legacyOverlay = document.getElementById('autoplay-handshake-overlay');
        if (legacyOverlay) legacyOverlay.remove();

        let posterOverlay = document.getElementById('player-poster-overlay');
        const posterUrl = window.showData?.bannerImage || window.showData?.coverImage?.extraLarge || window.showData?.coverImage?.large || '';

        if (!posterOverlay) {
            posterOverlay = document.createElement('div');
            posterOverlay.id = 'player-poster-overlay';
            container.appendChild(posterOverlay);
        }

        posterOverlay.className = "absolute inset-0 z-30 flex items-center justify-center bg-cover bg-center cursor-pointer group transition-all duration-500";
        posterOverlay.style.backgroundImage = `url('${posterUrl}')`;
        posterOverlay.onclick = function() {
            posterOverlay.classList.add('hidden');
            if (typeof window.playVastPreRoll === 'function' && window.VAST_TAG_URL) {
                window.playVastPreRoll(video, window.VAST_TAG_URL, () => {
                    if (video) video.play().catch(() => {});
                });
            } else if (video) {
                video.play().catch(() => {});
            }
        };

        posterOverlay.innerHTML = `
            <div class="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors"></div>
            <div class="relative z-10 w-20 h-20 rounded-full bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] flex items-center justify-center shadow-[0_0_30px_var(--anime-accent-color,#f59e0b)] group-hover:scale-110 transition-all duration-300">
                <svg class="w-10 h-10 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div class="absolute bottom-6 left-6 z-10 text-white font-bold text-sm md:text-base drop-shadow-md flex items-center gap-2">
                <span class="px-2.5 py-1 rounded bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] text-xs uppercase font-extrabold">Episode ${epNum}</span>
                <span>Click to Play</span>
            </div>
        `;
        posterOverlay.classList.remove('hidden');
    };

    window.showFillerWarningModal = function(epNum) {
        const video = document.getElementById('main-video-player');
        const container = video?.parentElement || document.getElementById('player-container') || document.body;

        if (video && !video.paused) {
            video.pause();
        }

        let modal = document.getElementById('filler-warning-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'filler-warning-modal';
            container.appendChild(modal);
        } else if (modal.parentElement !== container) {
            container.appendChild(modal);
        }

        modal.className = 'absolute inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 p-4 select-none';
        modal.innerHTML = `
            <div class="glass-panel p-6 md:p-8 rounded-2xl max-w-md w-full border border-amber-500/40 flex flex-col gap-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-[#08080c]/90">
                <div class="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/50 animate-pulse">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                    <h3 class="text-lg md:text-xl font-extrabold text-white mb-2 tracking-wide uppercase">Filler Episode Warning</h3>
                    <p class="text-steelGray text-xs md:text-sm">Warning: Episode <span class="text-amber-400 font-bold">${epNum}</span> is a Filler Episode.</p>
                </div>
                <div class="flex gap-3 justify-center">
                    <button onclick="continueFillerEpisode(${epNum})" class="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs tracking-wider uppercase transition-all duration-200">
                        Continue Episode
                    </button>
                    <button onclick="skipFillerEpisode(${epNum})" class="px-5 py-2.5 rounded-xl bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] font-bold text-xs tracking-wider uppercase shadow-[0_0_15px_var(--anime-accent-color,#f59e0b)] hover:opacity-90 transition-all duration-200">
                        Skip Filler &rarr;
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.continueFillerEpisode = function(epNum) {
        const modal = document.getElementById('filler-warning-modal');
        if (modal) modal.classList.add('hidden');
        window.changeEpisode(epNum, true);
    };

    window.skipFillerEpisode = async function(currentEp) {
        const modal = document.getElementById('filler-warning-modal');
        if (modal) modal.classList.add('hidden');

        const totalEps = getActualEpisodeCount(window.showData);
        const fillerSet = await fetchFillerEpisodes(window.showData.id);

        let nextCanonEp = currentEp + 1;
        while (nextCanonEp <= totalEps && fillerSet.has(nextCanonEp)) {
            nextCanonEp++;
        }

        if (nextCanonEp <= totalEps) {
            window.changeEpisode(nextCanonEp, false);
        } else {
            window.changeEpisode(currentEp, true);
        }
    };
}

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

    window.changeEpisode = async function(epNum, bypassFillerCheck = false) {
        const totalEps = getActualEpisodeCount(window.showData);
        if (epNum < 1 || epNum > totalEps) return;

        if (!bypassFillerCheck) {
            const fillerSet = await fetchFillerEpisodes(window.showData.id);
            if (fillerSet.has(epNum)) {
                window.showFillerWarningModal(epNum);
                return;
            }
        }

        window.currentEp = epNum;

        const slug = slugify(window.showData.title.english || window.showData.title.romaji || window.showData.title.userPreferred);
        window.location.href = `/watch/anime/${slug}-${window.showData.id}?ep=${epNum}`;
    };

    window.renderEpisodePicker = function() {
        const selector = document.getElementById('batch-selector');
        const totalEps = getActualEpisodeCount(window.showData);

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

    window.renderEpisodesGridForBatch = async function(batchIdx, totalEps) {
        const container = document.getElementById('episodes-grid');
        if (!container) return;

        const fillerSet = await fetchFillerEpisodes(window.showData.id);
        const subDubData = await fetchSubDubCounts(window.showData.id);

        const isDub = (window.currentLang === 'dub');
        const validEps = isDub ? (subDubData.dubEps.length > 0 ? subDubData.dubEps : Array.from({ length: subDubData.dubCount }, (_, i) => i + 1))
                              : (subDubData.subEps.length > 0 ? subDubData.subEps : Array.from({ length: subDubData.subCount }, (_, i) => i + 1));

        const totalValidEps = validEps.length;
        const batchSize = 100;
        const startIdx = batchIdx * batchSize;
        const endIdx = Math.min((batchIdx + 1) * batchSize, totalValidEps);

        let html = '';
        for (let idx = startIdx; idx < endIdx; idx++) {
            const i = validEps[idx];
            const isWatched = localStorage.getItem(`watched_${window.showData.id}_${i}`) === 'true';
            const isActive = (i === window.currentEp);
            const isFiller = fillerSet.has(i);

            const btnClasses = getWatchEpisodeBtnClasses(isActive, isFiller, isWatched);
            const titleAttr = isFiller ? `Episode ${i} (Filler)` : `Episode ${i}`;

            html += `
                <button class="${btnClasses}" title="${titleAttr}" onclick="changeEpisode(${i})">
                    ${i}
                </button>
            `;
        }
        container.innerHTML = html;
    };

    window.renderRelatedAdaptations = async function() {
        const showData = window.showData;
        const relatedContainer = document.getElementById('watch-related-container');
        if (!relatedContainer) return;

        const slug = slugify(showData.title.english || showData.title.romaji || showData.title.userPreferred);
        const franchiseSeasons = await fetchFranchiseTree(slug, showData.id);
        const fallbackRelations = showData.relations?.edges || [];

        const categories = categorizeFranchiseItems(franchiseSeasons, fallbackRelations);
        const html = renderFranchiseSectionsHTML(categories);

        if (!html) {
            relatedContainer.classList.add('hidden');
            return;
        }

        relatedContainer.classList.remove('hidden');
        relatedContainer.innerHTML = html;
    };

    window.viewRelatedShow = async function(relatedId) {
        const spinner = document.getElementById('player-loading-spinner');
        if (spinner) spinner.classList.remove('hidden');
        try {
            const json = await fetchAniListGraphQL({ query: FULL_SHOW_QUERY, variables: { id: relatedId } });
            if (json && json.data && json.data.Media) {
                const data = json.data.Media;
                localStorage.setItem('activeShowData', JSON.stringify(data));
                
                const slug = slugify(data.title.english || data.title.romaji || data.title.userPreferred);
                window.history.pushState(null, '', `/anime/${slug}-${data.id}`);
                handleSpaRouting();
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
        if (typeof updateContinueWatchingHistory === 'function') {
            updateContinueWatchingHistory(0);
        }
        window.renderEpisodePicker();

        window.introTimes = null;
        window.outroTimes = null;
        if (skipIntroBtn) skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
        if (skipOutroBtn) skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');

        try {
            // Dual parallel probe for Sub and Dub stream availability
            const [subResult, dubResult] = await Promise.allSettled([
                fetchClusterNode({ route: 'rating', id: window.showData.id, e: epNum, lang: 'sub' }),
                fetchClusterNode({ route: 'rating', id: window.showData.id, e: epNum, lang: 'dub' })
            ]);

            const subData = (subResult.status === 'fulfilled' && subResult.value && subResult.value.success && subResult.value.manifest) ? subResult.value : null;
            const dubData = (dubResult.status === 'fulfilled' && dubResult.value && dubResult.value.success && dubResult.value.manifest) ? dubResult.value : null;

            const playerSubdubToggle = document.getElementById('player-subdub-toggle');
            const langToggleBtn = document.getElementById('lang-toggle-btn');

            let activeData = null;

            if (window.currentLang === 'dub') {
                if (dubData) {
                    activeData = dubData;
                    window.dubUnavailable = false;
                } else if (subData) {
                    // Fallback to Sub if Dub is unavailable for this episode
                    activeData = subData;
                    window.currentLang = 'sub';
                    window.dubUnavailable = true;
                    if (window.showData?.id) {
                        localStorage.setItem(`lang_${window.showData.id}`, 'sub');
                    }
                    toggleUserPreference('preferredLang', 'sub');
                }
            } else {
                // User requested Sub
                if (subData) {
                    activeData = subData;
                    window.dubUnavailable = !dubData;
                } else if (dubData) {
                    // Fallback to Dub if Sub is unavailable
                    activeData = dubData;
                    window.currentLang = 'dub';
                    window.dubUnavailable = false;
                    if (window.showData?.id) {
                        localStorage.setItem(`lang_${window.showData.id}`, 'dub');
                    }
                    toggleUserPreference('preferredLang', 'dub');
                }
            }

            if (window.updateSubDubButtonsUI) {
                window.updateSubDubButtonsUI();
            }

            if (!activeData) {
                throw new Error("Neither Sub nor Dub stream source could be resolved for this episode.");
            }

            const video = document.querySelector('#player-container video') || document.querySelector('#main-video-player') || document.querySelector('video');

            const data = activeData;
            window.introTimes = data.intro;
            window.outroTimes = data.outro;

            console.log('[HLS Engine] Active Worker Proxy URL:', data.proxy || (typeof NODE_REGISTRY !== 'undefined' ? NODE_REGISTRY[0] : window.location.origin));

            // Synchronized Subtitle track injection BEFORE HLS segment attachment
            await loadSubtitles(data.subtitles || [], video);

            const manifestText = data.manifest;
            const blob = new Blob([manifestText], { type: 'application/x-mpegURL' });
            const manifestBlobUrl = URL.createObjectURL(blob);
            console.log('[HLS Engine] Manifest Blob URL:', manifestBlobUrl);

            if (window.hlsInstance) {
                window.hlsInstance.destroy();
            }

            if (Hls.isSupported()) {
                window.hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    maxBufferSize: 30 * 1024 * 1024,
                    backBufferLength: 10,
                    xhrSetup: function(xhr, url) {
                        xhr.withCredentials = false;
                    }
                });
                window.hlsInstance.loadSource(manifestBlobUrl);
                if (video) window.hlsInstance.attachMedia(video);

                window.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('[HLS Engine] Manifest parsed successfully. Segment streaming ready.');
                    if (spinner) spinner.classList.add('hidden');
                    if (typeof window.showCinemaHandshake === 'function') window.showCinemaHandshake();
                    if (typeof window.initPlayerControls === 'function') {
                        window.initPlayerControls();
                    }
                });

                window.hlsInstance.on(Hls.Events.ERROR, (event, errorData) => {
                    console.error('[HLS Error]', errorData);
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
                                console.error("Fatal HLS playback crash.");
                                break;
                        }
                    }
                });
            } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = manifestBlobUrl;
                video.addEventListener('loadedmetadata', () => {
                    if (spinner) spinner.classList.add('hidden');
                    if (typeof window.showCinemaHandshake === 'function') window.showCinemaHandshake();
                    if (typeof window.initPlayerControls === 'function') {
                        window.initPlayerControls();
                    }
                });
            } else {
                alert("This browser does not support HLS streaming.");
            }

        } catch (err) {
            console.error('[Stream Launch] Failed to load stream:', err);
            if (spinner) spinner.classList.add('hidden');
            if (typeof window.renderEmptyStreamFallback === 'function') {
                window.renderEmptyStreamFallback(epNum);
            }
        }
    };

    async function loadSubtitles(trackList, targetVideo) {
        const videoEl = targetVideo || document.querySelector('#player-container video') || document.querySelector('#main-video-player') || document.querySelector('video');
        if (!videoEl) return;

        const existingTracks = videoEl.querySelectorAll('track');
        existingTracks.forEach(t => t.remove());

        if (!trackList || trackList.length === 0) return;

        const activeUrl = typeof decodeRegistryUrl === 'function' ? decodeRegistryUrl(NODE_REGISTRY[0]) : (typeof NODE_REGISTRY !== 'undefined' ? NODE_REGISTRY[0] : window.location.origin);

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

                videoEl.appendChild(trackEl);
            } catch (err) {
                console.warn(`[Subtitles Fallback] CORS track fetch failure: ${track.label}. Loading via proxy directly.`);
                const proxyUrl = track.file ? `${activeUrl}/?src=${encodeURIComponent(track.file)}&action=proxy_caption&vtt_url=${encodeURIComponent(track.file)}` : '';
                const trackEl = document.createElement('track');
                trackEl.kind = track.kind || 'captions';
                trackEl.label = track.label || 'Subtitles';
                trackEl.srclang = 'en';
                trackEl.src = proxyUrl;
                videoEl.appendChild(trackEl);
            }
        }

        enableDefaultTextTrack(videoEl);
    }

    function enableDefaultTextTrack(videoEl) {
        setTimeout(() => {
            if (!videoEl) return;
            const textTracks = videoEl.textTracks;
            if (!textTracks || textTracks.length === 0) return;

            let defaultIndex = -1;
            for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];
                if ((track.language && track.language.includes('en')) || (track.label && (track.label.toLowerCase().includes('eng') || track.label.toLowerCase().includes('en')))) {
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

        const video = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
        if (video) {
            video.play()
                .then(() => {
                    console.log("[Autoplay Matrix] Playback launched unmuted successfully.");
                })
                .catch(err => {
                    console.warn("[Autoplay Matrix] Playback blocked, trying muted...", err);
                    video.muted = true;
                    video.play().catch(() => {});
                });
        }
    };

    const video = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
    const skipBtnsContainer = document.getElementById('skip-buttons-container');
    const skipIntroBtn = document.getElementById('skip-intro-btn');
    const skipOutroBtn = document.getElementById('skip-outro-btn');

    if (video) {
        video.addEventListener('timeupdate', () => {
            const currentTime = video.currentTime;

            if (video.duration && Math.abs(currentTime - window.lastSavedTime) > 8) {
                const percentage = (currentTime / video.duration) * 100;
                updateContinueWatchingHistory(percentage);
                window.lastSavedTime = currentTime;
            }

            // MANUAL SKIP BUTTONS VISIBILITY SYNC
            if (!video.paused && video.duration > 0 && currentTime > 0) {
                if (skipBtnsContainer) {
                    skipBtnsContainer.style.setProperty('display', 'flex', 'important');
                }

                // Intro Skip Button
                if (window.introTimes && window.introTimes.start > 0 && window.introTimes.end > 0 &&
                    currentTime >= window.introTimes.start && currentTime < (window.introTimes.end - 0.5)) {
                    if (skipIntroBtn) {
                        skipIntroBtn.style.setProperty('display', 'block', 'important');
                        skipIntroBtn.classList.remove('opacity-0', 'pointer-events-none');
                        skipIntroBtn.classList.add('opacity-100');
                    }
                } else if (skipIntroBtn) {
                    skipIntroBtn.classList.remove('opacity-100');
                    skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
                    skipIntroBtn.style.setProperty('display', 'none', 'important');
                }

                // Outro Skip Button
                if (window.outroTimes && window.outroTimes.start > 0 && window.outroTimes.end > 0 &&
                    currentTime >= window.outroTimes.start && currentTime < (window.outroTimes.end - 0.5)) {
                    if (skipOutroBtn) {
                        skipOutroBtn.style.setProperty('display', 'block', 'important');
                        skipOutroBtn.classList.remove('opacity-0', 'pointer-events-none');
                        skipOutroBtn.classList.add('opacity-100');
                    }
                } else if (skipOutroBtn) {
                    skipOutroBtn.classList.remove('opacity-100');
                    skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');
                    skipOutroBtn.style.setProperty('display', 'none', 'important');
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
            const v = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
            if (window.introTimes && v) {
                v.currentTime = window.introTimes.end;
                skipIntroBtn.classList.remove('opacity-100');
                skipIntroBtn.classList.add('opacity-0', 'pointer-events-none');
                skipIntroBtn.style.setProperty('display', 'none', 'important');
            }
        });
    }

    if (skipOutroBtn) {
        skipOutroBtn.addEventListener('click', () => {
            const v = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
            if (window.outroTimes && v) {
                v.currentTime = window.outroTimes.end;
                skipOutroBtn.classList.remove('opacity-100');
                skipOutroBtn.classList.add('opacity-0', 'pointer-events-none');
                skipOutroBtn.style.setProperty('display', 'none', 'important');
            }
        });
    }

// -------------------------------------------------------------------------
// PERSISTENT WATCH VAULT & EPISODE TRACKING ENGINE
// -------------------------------------------------------------------------
function getWatchVault() {
    try {
        const data = localStorage.getItem('anime_watch_vault');
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error('[Watch Vault] Storage read error:', e);
    }
    return {};
}

function saveWatchVault(vault) {
    try {
        localStorage.setItem('anime_watch_vault', JSON.stringify(vault));
    } catch (e) {
        console.error('[Watch Vault] Storage write error:', e);
    }
}

function updateContinueWatchingHistory(percentage, currentTime = 0, duration = 0) {
    if (!window.showData || !window.showData.id) return;

    const show = window.showData;
    const showId = String(show.id);
    const epNum = Number(window.currentEp) || 1;

    // 1. Update persistent watch vault
    const vault = getWatchVault();
    const existing = vault[showId] || {
        id: show.id,
        title: show.title,
        coverImage: show.coverImage,
        bannerImage: show.banner || show.bannerImage || (show.coverImage && (show.coverImage.extraLarge || show.coverImage.large)),
        format: show.format,
        rating: show.meanScore,
        watchedEpisodes: [],
        lastEpNum: epNum,
        percentage: 0,
        currentTime: 0,
        duration: 0,
        updatedAt: Date.now()
    };

    existing.title = show.title;
    existing.coverImage = show.coverImage;
    existing.bannerImage = show.banner || show.bannerImage || (show.coverImage && (show.coverImage.extraLarge || show.coverImage.large));
    existing.format = show.format;
    existing.rating = show.meanScore;
    existing.lastEpNum = epNum;
    existing.percentage = Math.round(percentage);
    existing.currentTime = currentTime;
    existing.duration = duration;
    existing.updatedAt = Date.now();

    if (!Array.isArray(existing.watchedEpisodes)) {
        existing.watchedEpisodes = [];
    }
    if (!existing.watchedEpisodes.includes(epNum)) {
        existing.watchedEpisodes.push(epNum);
    }

    vault[showId] = existing;
    saveWatchVault(vault);

    // Synchronize legacy continueWatching key (ceiling of 15 entries)
    let historyList = [];
    try {
        historyList = JSON.parse(localStorage.getItem('continueWatching')) || [];
    } catch (e) {
        historyList = [];
    }
    historyList = historyList.filter(item => item && item.show && String(item.show.id) !== showId);
    historyList.unshift({
        show: window.showData,
        epNum: epNum,
        percentage: Math.round(percentage)
    });
    historyList = historyList.slice(0, 15);
    localStorage.setItem('continueWatching', JSON.stringify(historyList));

    if (typeof window.renderContinueWatching === 'function') {
        window.renderContinueWatching();
    }
}
window.updateContinueWatchingHistory = updateContinueWatchingHistory;

function getLastWatchedEpisode(showId) {
    if (!showId) return 1;
    const vault = getWatchVault();
    const entry = vault[String(showId)];
    if (entry && entry.lastEpNum) {
        return Number(entry.lastEpNum);
    }
    return 1;
}
window.getLastWatchedEpisode = getLastWatchedEpisode;

function isEpisodeWatched(showId, epNum) {
    if (!showId) return false;
    const vault = getWatchVault();
    const entry = vault[String(showId)];
    if (entry && Array.isArray(entry.watchedEpisodes)) {
        if (entry.watchedEpisodes.includes(Number(epNum))) return true;
    }
    return localStorage.getItem(`watched_${showId}_${epNum}`) === 'true';
}
window.isEpisodeWatched = isEpisodeWatched;

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

async function renderAnimeDetailsView() {
    const homepageWrapper = document.getElementById('homepage-sections-wrapper');
    if (homepageWrapper) homepageWrapper.classList.add('hidden');
    
    const searchResultsLayout = document.getElementById('search-results-layout');
    if (searchResultsLayout) searchResultsLayout.classList.add('hidden');

    const watchLayout = document.getElementById('watch-page-layout');
    if (watchLayout) watchLayout.classList.add('hidden');

    let detailsLayout = document.getElementById('anime-details-layout');
    if (!detailsLayout) {
        detailsLayout = document.createElement('div');
        detailsLayout.id = 'anime-details-layout';
        detailsLayout.className = 'w-full relative py-6 min-h-screen';
        document.getElementById('main-content').appendChild(detailsLayout);
    }
    detailsLayout.classList.remove('hidden');

    const pathname = window.location.pathname;
    const match = pathname.match(/\/anime\/([a-z0-9\-]+)-(\d+)/i);
    let anilistId = null;

    if (match) {
        anilistId = parseInt(match[2], 10);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        anilistId = parseInt(urlParams.get('anilist_id') || urlParams.get('id'), 10);
    }

    if (!anilistId) {
        window.history.replaceState(null, '', '/home');
        handleSpaRouting();
        return;
    }

    detailsLayout.innerHTML = `
        <div class="w-full flex items-center justify-center py-24">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-themeCyan"></div>
        </div>
    `;

    let showData = null;
    try {
        const cached = JSON.parse(localStorage.getItem('activeShowData'));
        if (cached && parseInt(cached.id, 10) === anilistId && cached.characters) {
            showData = cached;
        }
    } catch (e) {}

    if (!showData) {
        try {
            const json = await fetchAniListGraphQL({ query: FULL_SHOW_QUERY, variables: { id: anilistId } });
            if (json && json.data && json.data.Media) {
                showData = json.data.Media;
                localStorage.setItem('activeShowData', JSON.stringify(showData));
            } else {
                throw new Error("Anime not found");
            }
        } catch (err) {
            console.error("Failed to fetch anime details:", err);
            detailsLayout.innerHTML = `
                <div class="w-full text-center py-12 text-themeCrimson font-semibold">
                    Failed to fetch details from AniList: ${err.message}.
                    <br>
                    <button onclick="window.history.pushState(null, '', '/home'); handleSpaRouting();" class="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">Back to Home</button>
                </div>
            `;
            return;
        }
    }

    window.showData = showData;

    const accentColor = showData.coverImage?.color || showData.color || '#f59e0b';
    applyAnimeThemeColor(accentColor);

    const bannerImg = showData.bannerImage || showData.coverImage?.extraLarge || showData.coverImage?.large || '';
    const posterImg = showData.coverImage?.extraLarge || showData.coverImage?.large || '';
    const title = showData.title.english || showData.title.romaji || showData.title.userPreferred;
    const studios = showData.studios?.nodes?.map(n => n.name).join(', ') || 'N/A';
    const score = showData.averageScore || showData.meanScore ? `★ ${showData.averageScore || showData.meanScore}%` : '★ N/A';
    const genres = showData.genres?.map(g => `<span class="px-2.5 py-1 bg-white/5 border border-white/10 text-xs text-white rounded-full font-medium">${g}</span>`).join(' ') || '';
    
    // Synopsis with "Read More" Toggle
    const synopsisHtml = `
        <div class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-3 relative">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider border-l-4 pl-3" style="border-color: var(--anime-accent-color, #f59e0b);">Synopsis</h3>
            <div id="details-synopsis-wrapper" class="text-steelGray text-sm font-light leading-relaxed max-h-24 overflow-hidden transition-all duration-500 ease-in-out">
                <p id="details-synopsis">${showData.description || 'No synopsis available.'}</p>
            </div>
            <button id="details-read-more-btn" onclick="toggleDetailsSynopsis()" class="text-xs font-bold tracking-wider mt-1 transition-all duration-300 self-start uppercase" style="color: var(--anime-accent-color, #f59e0b);">+ Read More</button>
        </div>
    `;

    // Trailer
    let trailerHtml = '';
    if (showData.trailer && showData.trailer.site === 'youtube') {
        trailerHtml = `
            <div class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider border-l-4 border-themeCyan pl-3">Official Trailer</h3>
                <div class="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10">
                    <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${showData.trailer.id}" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            </div>
        `;
    }

    // Cast & Staff / Voice Actors
    const charactersList = showData.characters?.edges || [];
    let charactersHtml = '';
    if (charactersList.length > 0) {
        charactersHtml = `
            <div class="glass-panel p-6 rounded-2xl border border-white/5">
                <h3 class="text-lg font-bold text-white uppercase tracking-wider mb-4 border-l-4 border-themeCyan pl-3">Cast & Voice Actors</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    ${charactersList.map(edge => {
                        const charNode = edge.node;
                        const charName = charNode.name.userPreferred || charNode.name.full;
                        const charImage = charNode.image.large || '';
                        const charRole = edge.role || 'SUPPORTING';
                        
                        const vaNode = edge.voiceActors?.[0];
                        const vaName = vaNode ? vaNode.name.full : '';
                        const vaImage = vaNode ? vaNode.image.large : '';
                        
                        return `
                            <div class="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center gap-3 transition-all duration-300 hover:border-themeCyan/30">
                                <div class="flex items-center gap-3 min-w-0">
                                    <img class="w-10 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0" src="${charImage}" alt="${charName}" loading="lazy" decoding="async">
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-white truncate">${charName}</div>
                                        <div class="text-[9px] text-steelGray uppercase tracking-wider mt-1">${charRole}</div>
                                    </div>
                                </div>
                                ${vaNode ? `
                                    <div class="flex items-center gap-3 text-right min-w-0">
                                        <div class="min-w-0">
                                            <div class="text-xs font-medium text-white truncate">${vaName}</div>
                                            <div class="text-[9px] text-themeCyan uppercase tracking-wider mt-1">Japanese</div>
                                        </div>
                                        <img class="w-10 h-14 rounded-lg object-cover border border-white/10 flex-shrink-0" src="${vaImage}" alt="${vaName}" loading="lazy" decoding="async">
                                    </div>
                                ` : `
                                    <div class="text-[10px] text-steelGray italic pr-3">No VA Listed</div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Reviews
    const reviewsList = showData.reviews?.nodes || [];
    let reviewsHtml = '';
    if (reviewsList.length > 0) {
        reviewsHtml = `
            <div class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                <h3 class="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-themeCyan pl-3">User Reviews</h3>
                <div class="flex flex-col gap-4">
                    ${reviewsList.map(review => {
                        const username = review.user?.name || 'Anonymous';
                        const avatarUrl = review.user?.avatar?.large || '';
                        const reviewSummary = review.summary;
                        const reviewScore = review.score;
                        const reviewBody = review.body ? review.body.replace(/__+/g, '').replace(/~~+/g, '').replace(/\*+/g, '').substring(0, 300) + '...' : '';
                        return `
                            <div class="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <img class="w-10 h-10 rounded-full border border-white/10 object-cover" src="${avatarUrl}" alt="${username}" loading="lazy" decoding="async">
                                        <div>
                                            <div class="text-sm font-semibold text-white">${username}</div>
                                            <div class="text-[10px] text-steelGray">BlackLeg Critic</div>
                                        </div>
                                    </div>
                                    <div class="px-2.5 py-1 bg-themeCyan/10 border border-themeCyan/20 text-themeCyan text-xs font-bold rounded-lg">
                                        Score: ${reviewScore}%
                                    </div>
                                </div>
                                <div>
                                    <div class="text-xs font-bold text-white mb-1">"${reviewSummary}"</div>
                                    <p class="text-steelGray text-xs font-light leading-relaxed">${reviewBody}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Categorized Franchise Adaptations (Worker API + AniList Fallback)
    const detailsRelations = showData.relations?.edges || [];
    const showSlug = slugify(showData.title.english || showData.title.romaji || showData.title.userPreferred);
    const franchiseSeasons = await fetchFranchiseTree(showSlug, showData.id);
    const franchiseCategories = categorizeFranchiseItems(franchiseSeasons, detailsRelations);
    const categorizedHtml = renderFranchiseSectionsHTML(franchiseCategories);

    const totalEpisodes = getActualEpisodeCount(showData);
    const lastWatchedEp = (typeof window.getLastWatchedEpisode === 'function') ? window.getLastWatchedEpisode(showData.id) : 1;
    const ctaLabel = lastWatchedEp > 1 ? `Resume Ep ${lastWatchedEp}` : 'Start Watching';

    // Score Distribution Visual Builder
    const scoreDist = showData.stats?.scoreDistribution || [];
    let scoreDistHtml = '';
    if (scoreDist.length > 0) {
        const maxAmount = Math.max(...scoreDist.map(d => d.amount)) || 1;
        scoreDistHtml = `
            <div class="mt-2 pt-4 border-t border-white/5">
                <span class="text-[10px] text-steelGray uppercase tracking-wider block mb-2">Score Distribution</span>
                <div class="flex items-end gap-1.5 h-14 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                    ${scoreDist.map(d => {
                        const heightPct = Math.round((d.amount / maxAmount) * 100);
                        return `
                            <div class="flex-grow bg-themeCyan/20 hover:bg-themeCyan transition-all duration-300 rounded-t" style="height: ${heightPct}%" title="Score ${d.score}: ${d.amount.toLocaleString()} users"></div>
                        `;
                    }).join('')}
                </div>
                <div class="flex justify-between text-[9px] text-steelGray mt-1 px-1">
                    <span>10%</span>
                    <span>100%</span>
                </div>
            </div>
        `;
    }

    detailsLayout.innerHTML = `
        <div class="absolute inset-x-0 top-0 h-[500px] bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-40 transition-all duration-700" style="background-image: url('${bannerImg}'); mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);"></div>
        <div class="absolute inset-x-0 top-0 h-[500px] pointer-events-none z-0" style="background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(15,23,42,1) 100%);"></div>

        <div class="relative z-10 grid grid-cols-12 gap-8 mt-6">
            <!-- Left Column: Poster & Episodes -->
            <div class="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col gap-6">
                <div class="details-poster-card w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <img class="w-full h-full object-cover" src="${posterImg}" alt="${title}" loading="lazy" decoding="async">
                </div>
                <!-- Episode Grid & Selector -->
                <div class="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 max-h-[500px] overflow-y-auto scrollbar-thin">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider border-l-4 pl-2.5" style="border-color: var(--anime-accent-color, #f59e0b);">Episodes</h3>
                        <select id="details-lang-selector" onchange="setDetailsAudioPref(${showData.id}, this.value)" class="bg-[#121218] text-white border border-white/10 px-2 py-1 rounded text-xs font-bold uppercase focus:outline-none">
                            <option value="sub">Audio: SUB</option>
                            <option value="dub">Audio: DUB</option>
                        </select>
                    </div>
                    <hr class="border-white/5">
                    <select id="details-batch-selector" class="w-full bg-[#121218] text-white border border-white/10 px-3 py-2 rounded-lg text-xs font-bold tracking-wide focus:outline-none transition-all duration-300"></select>
                    <div id="details-episodes-grid" class="grid grid-cols-4 gap-2 pr-1"></div>
                </div>
            </div>

            <!-- Main Column: Title & Metadata -->
            <div class="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col gap-6">
                <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="px-2.5 py-1 text-xs font-semibold tracking-wider rounded-md uppercase" style="background: rgba(var(--anime-accent-rgb,245,158,11),0.15); border: 1px solid rgba(var(--anime-accent-rgb,245,158,11),0.3); color: var(--anime-accent-color, #f59e0b);">${showData.format || 'ANIME'}</span>
                        <span class="px-2.5 py-1 text-xs font-semibold tracking-wider rounded-md uppercase" style="background: rgba(var(--anime-accent-rgb,245,158,11),0.15); border: 1px solid rgba(var(--anime-accent-rgb,245,158,11),0.3); color: var(--anime-accent-color, #f59e0b);">EPISODES: ${totalEpisodes}</span>
                        <span class="font-bold text-sm" style="color: var(--anime-accent-color, #f59e0b);">★ ${showData.averageScore || showData.meanScore || 'N/A'}% Average Score</span>
                    </div>
                    <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none">${title}</h1>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${genres}
                    </div>
                </div>

                <div class="flex gap-4">
                    <button onclick="navigateWatchEpisode(${lastWatchedEp})" class="px-8 py-4 text-[#08080c] font-bold tracking-wider rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 uppercase flex items-center gap-2" style="background: var(--anime-accent-color, #f59e0b); box-shadow: 0 0 20px rgba(var(--anime-accent-rgb,245,158,11),0.4);">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        ${ctaLabel}
                    </button>
                </div>

                <!-- Top Metadata Container -->
                <div class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Format</span>
                            <span class="text-white text-sm font-semibold">${showData.format || 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Status</span>
                            <span class="text-white text-sm font-semibold uppercase">${showData.status || 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Studio</span>
                            <span class="text-white text-sm font-semibold">${studios}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Season</span>
                            <span class="text-white text-sm font-semibold uppercase">${showData.season || 'N/A'} ${showData.seasonYear || ''}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Source Material</span>
                            <span class="text-white text-sm font-semibold uppercase">${showData.source || 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Episode Duration</span>
                            <span class="text-white text-sm font-semibold">${showData.duration ? showData.duration + ' mins' : 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Popularity Rank</span>
                            <span class="text-white text-sm font-semibold">#${showData.popularity ? showData.popularity.toLocaleString() : 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Total Watch Count</span>
                            <span class="text-white text-sm font-semibold">${showData.popularity ? showData.popularity.toLocaleString() : 'N/A'} Users</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-steelGray uppercase tracking-wider block">Favorites</span>
                            <span class="text-white text-sm font-semibold">${showData.favourites ? showData.favourites.toLocaleString() : 'N/A'}</span>
                        </div>
                    </div>
                    ${scoreDistHtml}
                </div>

                ${synopsisHtml}
                ${trailerHtml}
                ${charactersHtml}
                ${categorizedHtml}

                <!-- Reviews Section -->

                ${reviewsHtml}
            </div>
        </div>
    `;

    window.setDetailsAudioPref = function(showId, lang) {
        localStorage.setItem(`lang_${showId}`, lang);
        toggleUserPreference('preferredLang', lang);
    };

    // Initialize the details episode picker
    window.renderDetailsEpisodePicker = function(totalEps) {
        const selector = document.getElementById('details-batch-selector');
        if (!selector) return;
        const batchSize = 100;
        const numBatches = Math.ceil(totalEps / batchSize);
        if (numBatches > 1) {
            selector.classList.remove('hidden');
            let selectorHtml = '';
            for (let b = 0; b < numBatches; b++) {
                const start = b * batchSize + 1;
                const end = Math.min((b + 1) * batchSize, totalEps);
                selectorHtml += `<option value="${b}">Episodes ${start} - ${end}</option>`;
            }
            selector.innerHTML = selectorHtml;
            selector.onchange = (e) => {
                renderDetailsGridForBatch(parseInt(e.target.value, 10), totalEps);
            };
            renderDetailsGridForBatch(0, totalEps);
        } else {
            selector.classList.add('hidden');
            renderDetailsGridForBatch(0, totalEps);
        }
    };

    async function renderDetailsGridForBatch(batchIdx, totalEps) {
        const container = document.getElementById('details-episodes-grid');
        if (!container) return;
        const fillerSet = await fetchFillerEpisodes(showData.id);
        const subDubData = await fetchSubDubCounts(showData.id);

        const detailsLangSelector = document.getElementById('details-lang-selector');

        if (detailsLangSelector) {
            if (subDubData.dubCount === 0) {
                detailsLangSelector.classList.add('hidden');
            } else {
                detailsLangSelector.classList.remove('hidden');
            }
        }

        const activeLang = localStorage.getItem(`lang_${showData.id}`) || 'sub';
        const isDub = (activeLang === 'dub');
        const validEps = isDub ? (subDubData.dubEps.length > 0 ? subDubData.dubEps : Array.from({ length: subDubData.dubCount }, (_, i) => i + 1))
                              : (subDubData.subEps.length > 0 ? subDubData.subEps : Array.from({ length: subDubData.subCount }, (_, i) => i + 1));

        const totalValidEps = validEps.length;
        const batchSize = 100;
        const startIdx = batchIdx * batchSize;
        const endIdx = Math.min((batchIdx + 1) * batchSize, totalValidEps);

        let html = '';
        for (let idx = startIdx; idx < endIdx; idx++) {
            const i = validEps[idx];
            const isWatched = localStorage.getItem(`watched_${showData.id}_${i}`) === 'true';
            const isFiller = fillerSet.has(i);
            let btnClasses = "p-3 rounded-lg text-center font-semibold text-xs transition-all duration-300 transform hover:scale-105 active:scale-95 glass-panel border ";
            if (isFiller) {
                btnClasses += "border border-amber-600/80 bg-amber-950/40 text-amber-300 shadow-[0_0_10px_rgba(180,83,9,0.7)] ";
            } else if (isWatched) {
                btnClasses += "text-[var(--anime-accent-color,#f59e0b)] border-[var(--anime-accent-color,#f59e0b)]/30 hover:border-[var(--anime-accent-color,#f59e0b)] bg-slate-900/60 ";
            } else {
                btnClasses += "text-white border-white/5 hover:border-white/20 hover:text-[var(--anime-accent-color,#f59e0b)] bg-white/5 ";
            }
            const currentDetailsLang = detailsLangSelector ? detailsLangSelector.value : activeLang;
            const titleAttr = isFiller ? `Episode ${i} (Filler)` : `Episode ${i}`;
            html += `
                <button onclick="navigateWatchEpisode(${i}, '${currentDetailsLang}')" title="${titleAttr}" class="${btnClasses}">
                    ${i}
                </button>
            `;
        }
        container.innerHTML = html;
    }

    window.renderDetailsEpisodePicker(totalEpisodes);

    window.toggleDetailsSynopsis = function() {
        const wrapper = document.getElementById('details-synopsis-wrapper');
        const btn = document.getElementById('details-read-more-btn');
        if (!wrapper || !btn) return;

        if (wrapper.classList.contains('max-h-24')) {
            wrapper.classList.remove('max-h-24');
            wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
            btn.innerText = "- Show Less";
        } else {
            wrapper.style.maxHeight = '6rem';
            wrapper.classList.add('max-h-24');
            btn.innerText = "+ Read More";
        }
    };
}

window.navigateWatchEpisode = function(epNum, forcedLang) {
    const show = window.showData;
    const detailsLangSelector = document.getElementById('details-lang-selector');
    const selectedLang = forcedLang || (detailsLangSelector ? detailsLangSelector.value : null) || window.currentLang || 'sub';
    window.currentLang = selectedLang;
    if (show && show.id) {
        localStorage.setItem(`lang_${show.id}`, selectedLang);
    }
    if (typeof toggleUserPreference === 'function') {
        toggleUserPreference('preferredLang', selectedLang);
    }
    const slug = window.slugify(show.title.english || show.title.romaji || show.title.userPreferred);
    window.location.href = `/watch/anime/${slug}-${show.id}?ep=${epNum}`;
};



// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// STATIC PAGES RENDERERS (/contact, /dmca, /terms) & CONTACT MODAL
// -------------------------------------------------------------------------
function handleContactSubmit(e) {
    if (e) e.preventDefault();
    showContactSuccessModal();
}
window.handleContactSubmit = handleContactSubmit;

function showContactSuccessModal() {
    let modal = document.getElementById('contact-success-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contact-success-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300 opacity-0 pointer-events-none';
        modal.innerHTML = `
            <div class="relative w-full max-w-md bg-[#0b0c10] border border-[#d4af37]/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col items-center text-center gap-5 transform scale-95 transition-all duration-300 glass-panel">
                <button onclick="dismissContactModal()" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-base">
                    ✕
                </button>

                <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f59e0b] flex items-center justify-center text-3xl text-[#050508] font-bold shadow-[0_0_25px_rgba(212,175,55,0.4)]">
                    ✓
                </div>

                <div class="flex flex-col gap-2">
                    <h3 class="text-2xl font-extrabold text-white tracking-tight">Message Dispatched</h3>
                    <p class="text-steelGray text-xs md:text-sm leading-relaxed font-light">
                        Thank you for contacting BlackLeg. Your inquiry has been successfully logged and sent directly to our team.
                    </p>
                </div>

                <button onclick="dismissContactModal()" class="w-full py-3 bg-[#d4af37] hover:bg-[#e5bf47] text-[#050508] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                    Dismiss
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (ev) => {
            if (ev.target === modal) {
                dismissContactModal();
            }
        });
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    const innerCard = modal.querySelector('.glass-panel');
    if (innerCard) {
        innerCard.classList.remove('scale-95');
        innerCard.classList.add('scale-100');
    }
}
window.showContactSuccessModal = showContactSuccessModal;

function dismissContactModal() {
    const modal = document.getElementById('contact-success-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100');
        const innerCard = modal.querySelector('.glass-panel');
        if (innerCard) {
            innerCard.classList.add('scale-95');
            innerCard.classList.remove('scale-100');
        }
    }
}
window.dismissContactModal = dismissContactModal;

function renderContactView() {
    let layout = document.getElementById('contact-page-layout');
    if (!layout) {
        layout = document.createElement('div');
        layout.id = 'contact-page-layout';
        layout.className = 'w-full relative min-h-screen py-10 max-w-4xl mx-auto px-4 animate-crystal-in select-none';
        document.getElementById('main-content').appendChild(layout);
    }
    layout.classList.remove('hidden');

    layout.innerHTML = `
        <div class="glass-panel p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-3 border-b border-white/10 pb-6">
                <span class="text-xs font-mono text-[#d4af37] tracking-widest uppercase">GET IN TOUCH</span>
                <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Contact Us</h1>
                <p class="text-steelGray text-sm md:text-base font-light">Have questions, feedback, or technical inquiries? Reach out to the BlackLeg team.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-2">
                    <h3 class="text-white font-bold text-base flex items-center gap-2">
                        <span class="text-[#d4af37]">📧</span> General Inquiries
                    </h3>
                    <p class="text-steelGray text-xs font-light">For platform feedback, suggestions, or general support questions.</p>
                    <a href="mailto:support@blackleg.to" class="text-[#d4af37] font-mono text-sm mt-2 hover:underline">support@blackleg.to</a>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-2">
                    <h3 class="text-white font-bold text-base flex items-center gap-2">
                        <span class="text-[#d4af37]">⚖️</span> Legal & DMCA
                    </h3>
                    <p class="text-steelGray text-xs font-light">For copyright notices, removal requests, and legal correspondence.</p>
                    <a href="mailto:dmca@blackleg.to" class="text-[#d4af37] font-mono text-sm mt-2 hover:underline">dmca@blackleg.to</a>
                </div>
            </div>

            <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                <h3 class="text-white font-bold text-base">Send Us a Message</h3>
                <form onsubmit="handleContactSubmit(event)" class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Your Name" required class="w-full bg-[#050508] border border-white/10 px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4af37] transition-colors">
                        <input type="email" placeholder="Your Email" required class="w-full bg-[#050508] border border-white/10 px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4af37] transition-colors">
                    </div>
                    <textarea rows="4" placeholder="Your Message..." required class="w-full bg-[#050508] border border-white/10 px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#d4af37] transition-colors resize-none"></textarea>
                    <button type="submit" class="px-8 py-3.5 bg-[#d4af37] hover:bg-[#e5bf47] text-[#050508] font-extrabold text-xs md:text-sm uppercase tracking-wider rounded-xl transition-all self-start shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                        Send Message
                    </button>
                </form>
            </div>
        </div>
    `;
}

function renderDmcaView() {
    let layout = document.getElementById('dmca-page-layout');
    if (!layout) {
        layout = document.createElement('div');
        layout.id = 'dmca-page-layout';
        layout.className = 'w-full relative min-h-screen py-10 max-w-4xl mx-auto px-4 animate-crystal-in select-none';
        document.getElementById('main-content').appendChild(layout);
    }
    layout.classList.remove('hidden');

    layout.innerHTML = `
        <div class="glass-panel p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-3 border-b border-white/10 pb-6">
                <span class="text-xs font-mono text-[#00f5ff] tracking-widest uppercase">LEGAL COMPLIANCE</span>
                <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-tight">DMCA Copyright Policy</h1>
                <p class="text-steelGray text-sm md:text-base font-light">BlackLeg respects the intellectual property rights of others and expects its users to do the same.</p>
            </div>

            <div class="flex flex-col gap-6 text-steelGray text-xs md:text-sm font-light leading-relaxed">
                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">Digital Millennium Copyright Act Notice</h3>
                    <p>BlackLeg is an online service provider under the Digital Millennium Copyright Act (17 U.S.C. § 512). We do not host, store, or upload any media files, videos, or streams on our servers. All media content accessible via our platform is hosted on non-affiliated 3rd party services and servers.</p>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">Takedown Request Procedure</h3>
                    <p>If you believe that your copyrighted work has been linked to or indexed by BlackLeg in a manner that constitutes copyright infringement, please submit a written DMCA takedown notification containing the following details:</p>
                    <ul class="list-disc list-inside flex flex-col gap-2 mt-2 text-slate-300">
                        <li>A physical or electronic signature of the copyright owner or authorized representative.</li>
                        <li>Identification of the copyrighted work claimed to have been infringed.</li>
                        <li>Identification of the material/link on BlackLeg that is claimed to be infringing.</li>
                        <li>Your contact information (email address, telephone number, and mailing address).</li>
                        <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner.</li>
                        <li>A statement under penalty of perjury that the information in the notification is accurate.</li>
                    </ul>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">Designated Agent Contact</h3>
                    <p>Please send all official DMCA takedown requests to our designated legal agent at:</p>
                    <a href="mailto:dmca@blackleg.to" class="text-[#00f5ff] font-mono text-sm hover:underline">dmca@blackleg.to</a>
                    <p class="text-[11px] text-steelGray/60 mt-1">Properly formatted requests are typically processed within 24 to 48 business hours.</p>
                </div>
            </div>
        </div>
    `;
}

function renderTermsView() {
    let layout = document.getElementById('terms-page-layout');
    if (!layout) {
        layout = document.createElement('div');
        layout.id = 'terms-page-layout';
        layout.className = 'w-full relative min-h-screen py-10 max-w-4xl mx-auto px-4 animate-crystal-in select-none';
        document.getElementById('main-content').appendChild(layout);
    }
    layout.classList.remove('hidden');

    layout.innerHTML = `
        <div class="glass-panel p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-3 border-b border-white/10 pb-6">
                <span class="text-xs font-mono text-[#00f5ff] tracking-widest uppercase">USER AGREEMENT</span>
                <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Terms of Use</h1>
                <p class="text-steelGray text-sm md:text-base font-light">Please read these terms carefully before accessing or using the BlackLeg platform.</p>
            </div>

            <div class="flex flex-col gap-6 text-steelGray text-xs md:text-sm font-light leading-relaxed">
                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">1. Acceptance of Terms</h3>
                    <p>By accessing or using BlackLeg, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">2. Disclaimer of Content & Hosting</h3>
                    <p>BlackLeg operates solely as an indexing directory and search engine for anime content. BlackLeg does not host, upload, store, or manage video files on any of its servers. All video streams are embedded or linked from third-party hosting services over which BlackLeg exercises no control.</p>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">3. Limitation of Liability</h3>
                    <p>In no event shall BlackLeg or its operators be liable for any damages arising out of the use or inability to use the materials or services on the platform, even if notified orally or in writing of the possibility of such damage.</p>
                </div>

                <div class="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                    <h3 class="text-white font-bold text-base">4. Changes to Terms</h3>
                    <p>BlackLeg reserves the right to revise or update these Terms of Use at any time without prior notice. By continuing to use the platform after changes are posted, you agree to be bound by the revised terms.</p>
                </div>
            </div>
        </div>
    `;
}

window.renderContactView = renderContactView;
window.renderDmcaView = renderDmcaView;
window.renderTermsView = renderTermsView;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });
} else {
    initApp();
}
