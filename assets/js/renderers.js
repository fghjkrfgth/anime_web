// -------------------------------------------------------------------------
// DATA RENDERERS
// -------------------------------------------------------------------------

const GENRE_MAPPING = [
    { name: "Action & Adventure", genre: "Action", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37V60ETLs2.jpg", desc: "High-octane battles, epic journeys, and adrenaline-pumping combat sequences that test the limits of destiny." },
    { name: "Fantasy & Magic", genre: "Fantasy", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101759-Mhlv26gSp9Cl.jpg", desc: "Step into enchanted realms of sorcery, mythical beasts, and ancient legends where imagination holds absolute power." },
    { name: "Sci-Fi & Cyberpunk", genre: "Sci-Fi", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/1-O3ugZgss44sn.jpg", desc: "Futuristic machinery, outer space exploration, and cybernetic realities that challenge the boundary of humanity." },
    { name: "Romance & Drama", genre: "Romance", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/125313-v0lQp0G3rQp1.jpg", desc: "Intense emotional connections, heartfelt relationships, and life-changing struggles that define the human spirit." }
];

let activeScheduleDayIndex = 0;

function getShowTitle(show) {
    if (!show || !show.title) return 'Unknown Title';
    const pref = localStorage.getItem('userLanguagePref') || 'romaji';
    if (show.title[pref]) {
        return show.title[pref];
    }
    return show.title.userPreferred || show.title.romaji || show.title.english || 'Unknown Title';
}

function updateAllRenderedTitles() {
    // Update standard thumbnail cards
    document.querySelectorAll('[data-anime-data]').forEach(el => {
        try {
            const show = JSON.parse(el.getAttribute('data-anime-data'));
            const titleTextEl = el.querySelector('.anime-title-text');
            if (show && titleTextEl) {
                const newTitle = getShowTitle(show);
                titleTextEl.innerText = newTitle;
                titleTextEl.setAttribute('title', newTitle);
                const img = el.querySelector('img');
                if (img) img.setAttribute('alt', newTitle);
            }
        } catch (e) {
            console.error('Failed to update title for element:', e);
        }
    });

    // Update continue watching cards
    document.querySelectorAll('[data-continue-show]').forEach(el => {
        try {
            const show = JSON.parse(el.getAttribute('data-continue-show'));
            const titleTextEl = el.querySelector('.continue-title-text');
            if (show && titleTextEl) {
                const newTitle = getShowTitle(show);
                titleTextEl.innerText = newTitle;
            }
        } catch (e) {
            console.error('Failed to update continue title for element:', e);
        }
    });

    // Update spotlight title
    if (window.spotlightState && window.spotlightState.items) {
        const centerItem = window.spotlightState.items[window.spotlightState.centerIdx];
        if (centerItem) {
            const titleEl = document.getElementById('spotlight-title');
            if (titleEl) {
                titleEl.innerText = getShowTitle(centerItem);
            }
        }
    }
}

function updateLanguageSelectionUI() {
    const currentPref = localStorage.getItem('userLanguagePref') || 'romaji';
    document.querySelectorAll('.lang-option').forEach(btn => {
        const val = btn.getAttribute('data-value');
        if (val === currentPref) {
            btn.classList.add('bg-[#00f5ff]/20', 'text-[#00f5ff]');
            btn.classList.remove('text-white');
        } else {
            btn.classList.remove('bg-[#00f5ff]/20', 'text-[#00f5ff]');
            btn.classList.add('text-white');
        }
    });
}

function setupLanguageListeners() {
    const langPrefBtn = document.getElementById('lang-pref-btn');
    const langPrefDropdown = document.getElementById('lang-pref-dropdown');

    if (langPrefBtn && langPrefDropdown) {
        langPrefBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langPrefDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!langPrefDropdown.contains(e.target) && e.target !== langPrefBtn) {
                langPrefDropdown.classList.add('hidden');
            }
        });
    }

    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-value');
            localStorage.setItem('userLanguagePref', val);

            updateAllRenderedTitles();
            updateLanguageSelectionUI();

            if (langPrefDropdown) {
                langPrefDropdown.classList.add('hidden');
            }
        });
    });
}

function cleanDescription(desc) {
    if (!desc) return 'No synopsis available.';
    return desc.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function scrollTrack(containerId, direction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const scrollAmount = 300;
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

function renderSpotlight(mediaList) {
    const titleEl = document.getElementById('spotlight-title');
    if (!mediaList || mediaList.length === 0) {
        if (titleEl) titleEl.innerText = "No spotlight items available";
        return;
    }

    const spotlightItems = mediaList.slice(0, 5);
    window.spotlightState = { items: spotlightItems, centerIdx: 0 };

    rotateSpotlight(0);

    if (window.spotlightInterval) clearInterval(window.spotlightInterval);
    window.spotlightInterval = setInterval(() => {
        if (window.spotlightState) {
            const nextIdx = (window.spotlightState.centerIdx + 1) % window.spotlightState.items.length;
            rotateSpotlight(nextIdx);
        }
    }, 6000);
}

function rotateSpotlight(clickedIdx) {
    if (!window.spotlightState) return;
    const { items } = window.spotlightState;
    window.spotlightState.centerIdx = clickedIdx;

    const centerItem = items[clickedIdx];
    const cardContent = document.getElementById('spotlight-card-content');

    if (cardContent) {
        cardContent.classList.add('opacity-0');

        setTimeout(() => {
            const title = getShowTitle(centerItem);
            const coverUrl = centerItem.bannerImage || centerItem.coverImage.extraLarge;
            const desc = cleanDescription(centerItem.description);

            document.getElementById('spotlight-bg-img').style.backgroundImage = `url('${coverUrl}')`;
            document.getElementById('spotlight-title').innerText = title;
            document.getElementById('spotlight-desc').innerText = desc;

            const stringifiedShow = JSON.stringify(centerItem).replace(/"/g, '&quot;');
            document.getElementById('spotlight-watch-btn').setAttribute('onclick', `watchShow(${stringifiedShow})`);
            document.getElementById('spotlight-watchlist-btn').onclick = () => {
                alert(`Added "${title}" to watchlist!`);
            };

            cardContent.classList.remove('opacity-0');
        }, 300);
    }
}

function renderGenreSpotlight() {
    const container = document.getElementById('genre-spotlight-container');
    if (!container) return;
    container.innerHTML = GENRE_MAPPING.map(g => `
        <div onclick="searchGenre('${g.genre}')" class="flex flex-col sm:flex-row h-auto sm:h-24 md:h-28 rounded-2xl overflow-hidden border border-white/5 hover:border-[#00f5ff]/40 bg-[#121218]/45 hover:bg-[#121218]/70 transition-all duration-500 cursor-pointer group shadow-lg hover:shadow-[#00f5ff]/5">
            <div class="w-full sm:w-1/3 md:w-1/4 h-32 sm:h-full overflow-hidden relative">
                <img src="${g.banner}" alt="${g.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                <div class="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-transparent to-[#121218]"></div>
            </div>
            <div class="w-full sm:w-2/3 md:w-3/4 p-4 flex flex-col justify-center">
                <h3 class="text-white text-sm md:text-base font-extrabold group-hover:text-[#00f5ff] transition-all duration-300 uppercase">${g.name}</h3>
                <p class="text-steelGray text-xs sm:text-[10px] md:text-xs line-clamp-none sm:line-clamp-2 mt-1 font-light leading-relaxed">${g.desc}</p>
            </div>
        </div>
    `).join('');
}

function formatLocalTime(epochSeconds) {
    const date = new Date(epochSeconds * 1000);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

function renderAiringSchedule(dayGroups) {
    if (!dayGroups || dayGroups.length === 0) return;
    window.airingScheduleData = dayGroups;

    const columnsContainer = document.getElementById('airing-broadcast-columns');
    if (!columnsContainer) return;

    columnsContainer.className = "flex flex-col w-full";
    updateScheduleUI();
}

function updateScheduleUI() {
    const columnsContainer = document.getElementById('airing-broadcast-columns');
    if (!columnsContainer || !window.airingScheduleData) return;

    const dayGroups = window.airingScheduleData;

    let dockHtml = `<div class="flex justify-start md:justify-center gap-3 overflow-x-auto pb-4 w-full scrollbar-none">`;
    dayGroups.forEach((group, index) => {
        const dayName = group.day;
        const isSelected = index === activeScheduleDayIndex;
        const isToday = index === 0;

        const displayLabel = isToday ? `${dayName} (Today)` : dayName;

        const activeClass = isSelected
            ? 'bg-purple-600/15 border border-purple-500/40 text-white shadow-[0_0_20px_rgba(147,51,234,0.25)]'
            : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white';

        dockHtml += `
            <button onclick="selectScheduleDay(${index})" class="px-5 py-2.5 text-xs font-bold tracking-wider uppercase rounded-2xl transition-all duration-300 ${activeClass} whitespace-nowrap">
                ${displayLabel}
            </button>
        `;
    });
    dockHtml += `</div>`;

    const currentGroup = dayGroups[activeScheduleDayIndex];
    const shows = currentGroup ? currentGroup.shows || [] : [];

    let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full">`;
    if (shows.length === 0) {
        gridHtml += `<div class="col-span-full text-center py-12 text-slate-400 text-sm italic">No scheduled broadcasts for this day</div>`;
    } else {
        shows.forEach(show => {
            const localTime = formatLocalTime(show.timestamp);
            const searchParam = encodeURIComponent(show.title);

            gridHtml += `
                <div class="flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all duration-300 cursor-pointer group" onclick="searchAndPlay('${searchParam}', '${show.slug}')">
                    <div class="flex items-center gap-3 min-w-0 mr-4">
                        <span class="text-xs font-extrabold text-purple-400 whitespace-nowrap bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/25 shadow-[0_0_10px_rgba(147,51,234,0.1)]">
                            ${localTime}
                        </span>
                        <h4 class="text-white text-xs md:text-sm font-bold truncate group-hover:text-purple-400 transition-colors duration-300" title="${show.title}">
                            ${show.title}
                        </h4>
                    </div>
                    <span class="text-[10px] font-extrabold text-purple-200 bg-purple-600 px-3 py-1 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(147,51,234,0.3)]">
                        Episode ${show.episode}
                    </span>
                </div>
            `;
        });
    }
    gridHtml += `</div>`;

    columnsContainer.innerHTML = dockHtml + gridHtml;
}

function selectScheduleDay(index) {
    activeScheduleDayIndex = index;
    updateScheduleUI();
}

function searchAndPlay(title, slug) {
    const cleanTitle = decodeURIComponent(title);
    const url = new URL(window.location.href);
    url.searchParams.set('search', cleanTitle);
    url.searchParams.delete('genre');
    url.searchParams.delete('status');
    url.searchParams.delete('format');
    url.searchParams.delete('year');
    url.searchParams.delete('sort');
    window.history.pushState({}, '', url.toString());
    checkUrlParamsAndSearch();
}

function createCardHTML(show) {
    const title = getShowTitle(show);
    const coverUrl = show.coverImage.large || show.coverImage.extraLarge;
    const rating = show.meanScore ? `${show.meanScore}%` : 'N/A';

    const stringifiedShow = JSON.stringify(show).replace(/"/g, '&quot;');

    const isNewEpisode = show.status === 'RELEASING' || (show.nextAiringEpisode !== undefined && show.nextAiringEpisode !== null);
    let displayBadgeText = 'Finished';
    if (isNewEpisode) {
        displayBadgeText = 'Ongoing';
    } else if (show.format === 'TV' || show.format === 'TV_SHORT') {
        displayBadgeText = 'TV';
    } else if (show.format === 'MOVIE') {
        displayBadgeText = 'Movie';
    } else if (show.format === 'SPECIAL') {
        displayBadgeText = 'Special';
    } else if (show.format) {
        displayBadgeText = show.format;
    }

    const badgeHTML = isNewEpisode
        ? `<div class="absolute bottom-2 left-2 px-2 py-0.5 bg-[#bd00ff]/80 backdrop-blur-md rounded text-[8px] font-bold text-white uppercase tracking-wider border border-[#00f5ff]/30 animate-pulse">${displayBadgeText}</div>`
        : `<div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-[#a0a5b5] uppercase tracking-wider border border-white/5">${displayBadgeText}</div>`;

    return `
        <div class="anime-card flex-none w-[145px] md:w-[185px] bg-[#121218]/45 rounded-2xl overflow-hidden border border-[#bd00ff]/20 hover:border-[#00f5ff] relative cursor-pointer group transition-all duration-500 hover:shadow-[0_0_20px_rgba(0,245,255,0.25)] snap-start snap-item" onclick="watchShow(${stringifiedShow})" data-anime-data="${stringifiedShow}">
            <div class="relative aspect-[3/4] w-full overflow-hidden">
                <img src="${coverUrl}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[9px] md:text-[11px] font-bold text-[#00f5ff] border border-[#00f5ff]/20">
                    ★ ${rating}
                </div>
                ${badgeHTML}
            </div>
            <div class="p-3 bg-gradient-to-t from-black/95 to-black/30">
                <h3 class="anime-title-text text-white text-xs md:text-sm font-semibold truncate group-hover:text-[#00f5ff] transition-colors duration-300" title="${title}">
                    ${title}
                </h3>
            </div>
        </div>
    `;
}

function renderThumbnailRow(containerId, shows) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!shows || shows.length === 0) {
        container.innerHTML = `<div class="text-steelGray py-8">No titles available.</div>`;
        return;
    }
    container.innerHTML = shows.map(show => createCardHTML(show)).join('');
}

function renderContinueWatching() {
    const dock = document.getElementById('continue-watching-section');
    const container = document.getElementById('continue-watching-container');
    if (!dock || !container) return;

    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('continueWatching')) || [];
    } catch (e) {
        history = [];
    }

    history = history.filter(item => item && item.show && item.epNum);

    if (history.length === 0) {
        dock.classList.add('hidden');
        return;
    }

    dock.classList.remove('hidden');
    container.innerHTML = history.map(item => {
        const show = item.show;
        const title = getShowTitle(show);
        const coverUrl = show.coverImage.large || show.coverImage.extraLarge;
        const epNum = item.epNum;
        const percent = Math.min(100, Math.max(0, item.percentage || 0));

        const stringifiedShow = JSON.stringify(show).replace(/"/g, '&quot;');

        return `
            <div class="anime-card flex-none w-[180px] md:w-[220px] bg-[#121218]/45 rounded-xl overflow-hidden border border-white/5 relative cursor-pointer group" onclick="watchShowProgress(${stringifiedShow}, ${epNum})" data-continue-show="${stringifiedShow}">
                <div class="relative h-[95px] md:h-[120px] overflow-hidden">
                    <img src="${show.banner || show.bannerImage || coverUrl}" alt="${title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-2.5">
                        <span class="continue-title-text text-white text-xs md:text-sm font-semibold truncate group-hover:text-themeCyan transition-colors duration-300">
                            ${title}
                        </span>
                        <span class="text-themeCyan text-[9px] md:text-xs font-semibold mt-0.5">
                            Episode ${epNum}
                        </span>
                    </div>
                </div>
                <div class="w-full h-1 bg-white/10 relative">
                    <div class="h-full bg-themeCyan transition-all duration-300" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function slugify(text) {
    if (!text) return 'show';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
window.slugify = slugify;

function watchShowProgress(show, epNum) {
    const slug = slugify(show.title.english || show.title.romaji || show.title.userPreferred);
    localStorage.setItem('activeShowData', JSON.stringify(show));
    window.history.pushState({}, '', `/watch/anime/${slug}-${show.id}?ep=${epNum}`);
    if (typeof window.handleSpaRouting === 'function') {
        window.handleSpaRouting();
    } else if (typeof window.renderWatchView === 'function') {
        window.renderWatchView();
    }
}

function watchShow(show) {
    const slug = slugify(show.title.english || show.title.romaji || show.title.userPreferred);
    localStorage.setItem('activeShowData', JSON.stringify(show));
    window.history.pushState({}, '', `/anime/${slug}-${show.id}`);
    if (typeof window.handleSpaRouting === 'function') {
        window.handleSpaRouting();
    }
}

// Watch Page 4x25 Grid & Filler Styling Helper
function getWatchEpisodeBtnClasses(isActive, isFiller, isWatched) {
    let btnClasses = "episode-btn glass-panel text-xs font-semibold py-2 px-1 rounded-md text-center flex items-center justify-center cursor-pointer transition-all duration-200 ";
    if (isActive) {
        btnClasses += "bg-themeCyan text-themeBlack shadow-[0_0_12px_rgba(0,255,204,0.5)] border-themeCyan ";
    } else if (isFiller) {
        btnClasses += "border border-amber-600/80 bg-amber-950/40 text-amber-300 shadow-[0_0_10px_rgba(180,83,9,0.7)] ";
    } else if (isWatched) {
        btnClasses += "text-themeCyan hover:text-white border border-themeCyan/30 bg-[#121218]/70 ";
    } else {
        btnClasses += "text-steelGray hover:text-white border border-white/5 hover:border-white/20 bg-[#121218]/40 ";
    }
    return btnClasses;
}

window.getWatchEpisodeBtnClasses = getWatchEpisodeBtnClasses;

// Franchise Tree Categorization Helper
function getFranchiseTree(showData) {
    if (!showData) return { mainSeries: [], movies: [], ovasSpecials: [] };

    let items = [];
    const seenIds = new Set();

    if (showData.seasons && Array.isArray(showData.seasons) && showData.seasons.length > 0) {
        showData.seasons.forEach(season => {
            const id = season.id || season.anilistId;
            if (season && id && !seenIds.has(id)) {
                seenIds.add(id);
                items.push({
                    id: id,
                    title: season.title?.english || season.title?.romaji || season.title?.userPreferred || season.name || 'Anime',
                    coverImage: season.coverImage?.large || season.poster || season.bannerImage || '',
                    format: (season.format || 'TV').toUpperCase(),
                    status: season.status || 'N/A'
                });
            }
        });
    } else if (showData.relations?.edges) {
        showData.relations.edges.forEach(edge => {
            const node = edge.node;
            if (node && node.id && !seenIds.has(node.id)) {
                seenIds.add(node.id);
                items.push({
                    id: node.id,
                    title: node.title?.english || node.title?.romaji || node.title?.userPreferred || 'Anime',
                    coverImage: node.coverImage?.large || '',
                    format: (node.format || 'TV').toUpperCase(),
                    status: node.status || 'N/A'
                });
            }
        });
    }

    const mainSeries = [];
    const movies = [];
    const ovasSpecials = [];

    items.forEach(item => {
        if (item.format === 'TV') {
            mainSeries.push(item);
        } else if (item.format === 'MOVIE') {
            movies.push(item);
        } else if (['OVA', 'SPECIAL', 'ONA'].includes(item.format)) {
            ovasSpecials.push(item);
        } else {
            mainSeries.push(item);
        }
    });

    return { mainSeries, movies, ovasSpecials };
}

window.getFranchiseTree = getFranchiseTree;
