// -------------------------------------------------------------------------
// DATA RENDERERS
// -------------------------------------------------------------------------

const GENRE_MAPPING = [
    { name: "Action & Adventure", genre: "Action", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37V60ETLs2.jpg", desc: "High-octane battles, epic journeys, and adrenaline-pumping combat sequences that test the limits of destiny." },
    { name: "Fantasy & Magic", genre: "Fantasy", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101759-Mhlv26gSp9Cl.jpg", desc: "Step into enchanted realms of sorcery, mythical beasts, and ancient legends where imagination holds absolute power." },
    { name: "Sci-Fi & Cyberpunk", genre: "Sci-Fi", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/1-O3ugZgss44sn.jpg", desc: "Futuristic machinery, outer space exploration, and cybernetic realities that challenge the boundary of humanity." },
    { name: "Romance & Drama", genre: "Romance", banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/125313-v0lQp0G3rQp1.jpg", desc: "Intense emotional connections, heartfelt relationships, and life-changing struggles that define the human spirit." }
];
window.GENRE_MAPPING = GENRE_MAPPING;

let activeScheduleDayIndex = 0;

const LANGUAGE_MAP = {
    'en': { label: 'EN', name: 'English' },
    'x-jat': { label: 'JP', name: 'Romaji' },
    'ja': { label: '日', name: 'Native Japanese' },
    'zh-Hans': { label: '简', name: 'Simplified Chinese' },
    'zh-Hant': { label: '繁', name: 'Traditional Chinese' },
    'ar': { label: 'AR', name: 'Arabic' },
    'cs': { label: 'CS', name: 'Czech' },
    'de': { label: 'DE', name: 'German' },
    'es': { label: 'ES', name: 'Spanish' },
    'es-CA': { label: 'ES-CA', name: 'Spanish (Latin America)' },
    'fr': { label: 'FR', name: 'French' },
    'he': { label: 'HE', name: 'Hebrew' },
    'hu': { label: 'HU', name: 'Hungarian' },
    'it': { label: 'IT', name: 'Italian' },
    'ko': { label: 'KO', name: 'Korean' },
    'pl': { label: 'PL', name: 'Polish' },
    'pt': { label: 'PT', name: 'Portuguese' },
    'pt-BR': { label: 'PT-BR', name: 'Portuguese (Brazil)' },
    'ro': { label: 'RO', name: 'Romanian' },
    'ru': { label: 'RU', name: 'Russian' },
    'th': { label: 'TH', name: 'Thai' },
    'tr': { label: 'TR', name: 'Turkish' },
    'vi': { label: 'VI', name: 'Vietnamese' }
};
window.LANGUAGE_MAP = LANGUAGE_MAP;

function getShowTitle(show) {
    if (!show || !show.title) return 'Unknown Title';
    const pref = localStorage.getItem('userLanguagePref') || 'en';

    if (pref === 'en') {
        return show.title.english || show.title.romaji || show.title.userPreferred || 'Unknown Title';
    } else if (pref === 'x-jat') {
        return show.title.romaji || show.title.english || show.title.userPreferred || 'Unknown Title';
    } else if (pref === 'ja' || pref === 'zh-Hans' || pref === 'zh-Hant') {
        return show.title.native || show.title.romaji || show.title.english || show.title.userPreferred || 'Unknown Title';
    } else if (show.title[pref]) {
        return show.title[pref];
    }

    return show.title.english || show.title.romaji || show.title.userPreferred || 'Unknown Title';
}
window.getShowTitle = getShowTitle;

function updateAllRenderedTitles() {
    // Update standard thumbnail cards, explore cards, and search cards
    document.querySelectorAll('[data-anime-data]').forEach(el => {
        try {
            const show = JSON.parse(el.getAttribute('data-anime-data'));
            const titleTextEl = el.querySelector('.anime-title-text, .continue-title-text, .search-title-text, .explore-title-text');
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
            const titleTextEl = el.querySelector('.continue-title-text, .anime-title-text');
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
window.updateAllRenderedTitles = updateAllRenderedTitles;

function updateLanguageSelectionUI() {
    const currentPref = localStorage.getItem('userLanguagePref') || 'en';
    const langCodeEl = document.getElementById('current-lang-code');
    const langInfo = LANGUAGE_MAP[currentPref] || LANGUAGE_MAP['en'];
    if (langCodeEl) {
        langCodeEl.innerText = langInfo ? langInfo.label : 'EN';
    }

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
window.updateLanguageSelectionUI = updateLanguageSelectionUI;

function setupLanguageListeners() {
    const langPrefBtn = document.getElementById('lang-pref-btn');
    const langPrefDropdown = document.getElementById('lang-pref-dropdown');

    if (langPrefBtn && langPrefDropdown) {
        langPrefBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            langPrefDropdown.classList.toggle('hidden');
        };

        document.addEventListener('click', (e) => {
            if (!langPrefDropdown.contains(e.target) && !langPrefBtn.contains(e.target)) {
                langPrefDropdown.classList.add('hidden');
            }
        });
    }

    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const val = btn.getAttribute('data-value');
            if (val) {
                localStorage.setItem('userLanguagePref', val);
                updateAllRenderedTitles();
                updateLanguageSelectionUI();
            }
            if (langPrefDropdown) {
                langPrefDropdown.classList.add('hidden');
            }
        };
    });

    updateLanguageSelectionUI();
}
window.setupLanguageListeners = setupLanguageListeners;

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
            const spotlightBtn = document.getElementById('spotlight-watch-btn');
            if (spotlightBtn) {
                spotlightBtn.innerText = 'Details';
                spotlightBtn.setAttribute('onclick', `watchShow(${stringifiedShow})`);
            }
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

    let dockHtml = `<div class="flex items-center gap-2 overflow-x-auto pb-3 w-full scrollbar-none snap-x snap-mandatory touch-pan-x">`;
    dayGroups.forEach((group, index) => {
        const dayName = group.day;
        const isSelected = index === activeScheduleDayIndex;
        const isToday = index === 0;
        const shortDay = dayName.length > 3 ? dayName.substring(0, 3) : dayName;

        const displayLabel = isToday ? `Today (${shortDay})` : dayName;

        const activeClass = isSelected
            ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] font-bold'
            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white font-medium';

        dockHtml += `
            <button onclick="selectScheduleDay(${index})" class="px-4 py-2 text-xs tracking-wider uppercase rounded-xl border transition-all duration-300 ${activeClass} whitespace-nowrap snap-start shrink-0">
                ${displayLabel}
            </button>
        `;
    });
    dockHtml += `</div>`;

    const currentGroup = dayGroups[activeScheduleDayIndex];
    const shows = currentGroup ? currentGroup.shows || [] : [];

    let gridHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4 w-full">`;
    if (shows.length === 0) {
        gridHtml += `<div class="col-span-full text-center py-10 text-slate-400 text-xs italic">No scheduled broadcasts for this day</div>`;
    } else {
        shows.forEach(show => {
            const localTime = formatLocalTime(show.timestamp);
            const searchParam = encodeURIComponent(show.title);

            gridHtml += `
                <div class="flex items-center justify-between p-3.5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group active:scale-[0.98]" onclick="searchAndPlay('${searchParam}', '${show.slug}')">
                    <div class="flex items-center gap-3 min-w-0 mr-3">
                        <span class="text-[11px] font-extrabold text-purple-300 whitespace-nowrap bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30 shadow-[0_0_8px_rgba(147,51,234,0.15)]">
                            ${localTime}
                        </span>
                        <h4 class="text-white text-xs md:text-sm font-bold truncate group-hover:text-purple-300 transition-colors" title="${show.title}">
                            ${show.title}
                        </h4>
                    </div>
                    <span class="text-[10px] font-extrabold text-purple-100 bg-purple-600/90 px-2.5 py-1 rounded-full whitespace-nowrap shadow-[0_0_8px_rgba(147,51,234,0.3)] border border-purple-400/30">
                        EP ${show.episode}
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
        <div class="anime-card flex-none w-[140px] md:w-[185px] bg-[#121218]/45 rounded-2xl overflow-hidden border border-[#bd00ff]/20 hover:border-[#00f5ff] relative cursor-pointer group transition-all duration-500 hover:shadow-[0_0_20px_rgba(0,245,255,0.25)] snap-start" onclick="watchShow(${stringifiedShow})" data-anime-data="${stringifiedShow}">
            <div class="relative aspect-[3/4] w-full overflow-hidden">
                <img src="${coverUrl}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[9px] md:text-[11px] font-bold text-[#00f5ff] border border-[#00f5ff]/20">
                    ★ ${rating}
                </div>
                ${badgeHTML}
            </div>
            <div class="anime-card-title-box">
                <h3 class="anime-title-text text-white text-xs md:text-sm font-semibold group-hover:text-[#00f5ff] transition-colors duration-300" title="${title}">
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
    container.className = "flex flex-nowrap overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none gap-3 pb-4 touch-pan-x";
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

// Dynamic AniList Accent Color Theming Helper
function applyAnimeThemeColor(colorHex) {
    let hex = colorHex;
    if (!hex || typeof hex !== 'string' || hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#000000' || !/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
        hex = '#f59e0b'; // Amber-500 fallback
    }
    document.documentElement.style.setProperty('--anime-accent-color', hex);
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const r = parseInt(cleanHex.slice(0, 2), 16) || 245;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 158;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 11;
    document.documentElement.style.setProperty('--anime-accent-rgb', `${r}, ${g}, ${b}`);
}

window.applyAnimeThemeColor = applyAnimeThemeColor;

// Watch Page 4x25 Grid & Filler Styling Helper
function getWatchEpisodeBtnClasses(isActive, isFiller, isWatched) {
    let btnClasses = "episode-btn glass-panel text-xs font-semibold py-2 px-1 rounded-md text-center flex items-center justify-center cursor-pointer transition-all duration-200 ";
    if (isActive) {
        btnClasses += "bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] font-extrabold shadow-[0_0_12px_var(--anime-accent-color,#f59e0b)] border-[var(--anime-accent-color,#f59e0b)] ";
    } else if (isFiller) {
        btnClasses += "border border-amber-600/80 bg-amber-950/40 text-amber-300 shadow-[0_0_10px_rgba(180,83,9,0.7)] ";
    } else if (isWatched) {
        btnClasses += "text-[var(--anime-accent-color,#f59e0b)] hover:text-white border border-[var(--anime-accent-color,#f59e0b)]/30 bg-[#121218]/70 ";
    } else {
        btnClasses += "text-steelGray hover:text-white border border-white/5 hover:border-white/20 bg-[#121218]/40 ";
    }
    return btnClasses;
}

window.getWatchEpisodeBtnClasses = getWatchEpisodeBtnClasses;

// FRANCHISE CATEGORIZATION & RENDERING (MAIN SERIES / SEASONS, MOVIES, OVAS & SPECIALS)
function categorizeFranchiseItems(franchiseSeasons, fallbackRelations) {
    const mainSeasons = [];
    const movies = [];
    const ovasSpecials = [];

    const seenIds = new Set();

    if (Array.isArray(franchiseSeasons) && franchiseSeasons.length > 0) {
        franchiseSeasons.forEach(item => {
            if (!item) return;
            const id = item.anilistId || item.id;
            if (id && seenIds.has(id)) return;
            if (id) seenIds.add(id);

            const titleStr = typeof item.title === 'string' ? item.title : (item.title?.english || item.title?.romaji || item.title?.userPreferred || 'Anime');
            const typeStr = (item.type || item.format || '').toUpperCase();
            const lowerTitle = titleStr.toLowerCase();

            const entry = {
                anilistId: id,
                title: titleStr,
                image: item.image || item.poster || item.coverImage || '',
                type: typeStr || 'TV'
            };

            if (typeStr === 'MOVIE' || typeStr.includes('MOVIE')) {
                movies.push(entry);
            } else if (typeStr === 'TV' || lowerTitle.includes('season')) {
                mainSeasons.push(entry);
            } else {
                ovasSpecials.push(entry);
            }
        });
    } else if (Array.isArray(fallbackRelations)) {
        fallbackRelations.forEach(r => {
            const node = r.node;
            if (!node || !node.id || seenIds.has(node.id)) return;
            seenIds.add(node.id);

            const titleStr = node.title?.english || node.title?.romaji || node.title?.userPreferred || 'Anime';
            const fmt = (node.format || '').toUpperCase();
            const relType = (r.relationType || '').toUpperCase();
            const lowerTitle = titleStr.toLowerCase();

            const entry = {
                anilistId: node.id,
                title: titleStr,
                image: node.coverImage?.large || node.coverImage?.extraLarge || '',
                type: fmt || 'TV'
            };

            if (fmt === 'MOVIE' || relType.includes('MOVIE')) {
                movies.push(entry);
            } else if (fmt === 'TV' || lowerTitle.includes('season')) {
                mainSeasons.push(entry);
            } else {
                ovasSpecials.push(entry);
            }
        });
    }

    return { mainSeasons, movies, ovasSpecials };
}

function renderFranchiseSectionsHTML(categories) {
    const sections = [
        { title: 'Main Series / Seasons', items: categories.mainSeasons },
        { title: 'Movies', items: categories.movies },
        { title: 'OVAs & Specials', items: categories.ovasSpecials }
    ];

    let html = '';
    sections.forEach(sec => {
        if (!sec.items || sec.items.length === 0) return;

        html += `
            <div class="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider border-l-4 pl-3" style="border-color: var(--anime-accent-color, #f59e0b);">${sec.title}</h3>
                <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                    ${sec.items.map(item => {
                        const posterUrl = item.image || '';
                        return `
                            <div class="flex-none w-[110px] md:w-[130px] cursor-pointer group" onclick="viewRelatedShow('${item.anilistId}')">
                                <div class="w-full aspect-[2/3] rounded-xl overflow-hidden relative border border-white/5 group-hover:border-[var(--anime-accent-color,#f59e0b)] transition-all duration-300">
                                    <img class="w-full h-full object-cover" src="${posterUrl}" alt="${item.title}" loading="lazy">
                                    <span class="absolute top-1.5 right-1.5 bg-themeBlack/80 text-[8px] font-bold text-[var(--anime-accent-color,#f59e0b)] px-1.5 py-0.5 rounded border border-[var(--anime-accent-color,#f59e0b)]/20 uppercase tracking-widest">
                                        ${item.type}
                                    </span>
                                </div>
                                <div class="anime-title-text text-[10px] md:text-xs font-semibold text-white mt-2 group-hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors" title="${item.title}">${item.title}</div>
                                <div class="text-[9px] text-steelGray mt-0.5 uppercase">${item.type}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    return html;
}

window.categorizeFranchiseItems = categorizeFranchiseItems;
window.renderFranchiseSectionsHTML = renderFranchiseSectionsHTML;

// DUAL SUB/DUB BUTTON RENDERER HELPER
function renderDualSubDubButtonsHTML(activeLang, dubUnavailable = false) {
    const isDub = (activeLang === 'dub');
    const subActiveStyle = !isDub
        ? "bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] shadow-[0_0_10px_var(--anime-accent-color,#f59e0b)] font-extrabold"
        : "text-steelGray hover:text-white bg-transparent font-bold";
    
    let dubActiveStyle = "";
    let dubDisabledAttr = "";
    let dubText = "🎙️ DUB";

    if (dubUnavailable) {
        dubActiveStyle = "opacity-50 cursor-not-allowed text-steelGray/50 bg-transparent font-bold";
        dubDisabledAttr = 'disabled title="Dub Unavailable for this Episode"';
        dubText = "🎙️ DUB (Unavailable)";
    } else if (isDub) {
        dubActiveStyle = "bg-[var(--anime-accent-color,#f59e0b)] text-[#08080c] shadow-[0_0_10px_var(--anime-accent-color,#f59e0b)] font-extrabold";
    } else {
        dubActiveStyle = "text-steelGray hover:text-white bg-transparent font-bold";
    }

    return `
        <div class="flex items-center gap-1.5 p-1 rounded-xl bg-[#121218] border border-white/10 select-none">
            <button id="btn-sub-toggle" onclick="setAudioLanguage('sub')" class="px-3.5 py-1.5 text-xs rounded-lg uppercase tracking-wider transition-all duration-300 ${subActiveStyle}">
                💬 SUB
            </button>
            <button id="btn-dub-toggle" onclick="setAudioLanguage('dub')" ${dubDisabledAttr} class="px-3.5 py-1.5 text-xs rounded-lg uppercase tracking-wider transition-all duration-300 ${dubActiveStyle}">
                ${dubText}
            </button>
        </div>
    `;
}

window.renderDualSubDubButtonsHTML = renderDualSubDubButtonsHTML;

// -------------------------------------------------------------------------
// IMMERSIVE LANDING PAGE RENDERER (/)
// -------------------------------------------------------------------------
window.renderLandingView = function() {
    let landingLayout = document.getElementById('landing-page-layout');
    if (!landingLayout) {
        landingLayout = document.createElement('div');
        landingLayout.id = 'landing-page-layout';
        landingLayout.className = 'w-full relative min-h-screen py-8 flex flex-col gap-20 select-none animate-crystal-in';
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.appendChild(landingLayout);
        }
    }
    if (landingLayout) {
        landingLayout.classList.remove('hidden');
    } else {
        return;
    }

    landingLayout.innerHTML = `
        <!-- HERO HEADER SECTION -->
        <div class="glass-crystal relative w-full rounded-3xl p-6 sm:p-10 md:p-20 flex flex-col items-center text-center gap-8 md:gap-10 mt-2">
            <!-- Subtle ambient refraction -->
            <div class="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-3xl"></div>

            <!-- Top Monospaced Tag -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 text-[10px] sm:text-[11px] font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                <span>SYSTEM VERSION 3.0</span>
                <span class="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                <span>DECENTRALIZED CORE</span>
            </div>

            <!-- Main Title & Subtitle -->
            <div class="flex flex-col gap-4 sm:gap-5 max-w-3xl z-10">
                <h1 class="text-3xl sm:text-6xl md:text-7xl font-extralight text-white tracking-[0.2em] sm:tracking-[0.25em] uppercase leading-none break-all sm:break-normal">
                    ANIMEFLOW
                </h1>
                <p class="text-sm sm:text-lg md:text-xl text-slate-300 font-light tracking-wide max-w-xl mx-auto leading-relaxed px-2">
                    A minimal, high-speed anime streaming platform engineered for zero latency, zero ads, and pure content presentation.
                </p>
            </div>

            <!-- Primary Crystal CTA Button -->
            <div class="z-10 mt-2 w-full flex justify-center">
                <button onclick="window.history.pushState(null, '', '/home'); handleSpaRouting();" class="btn-crystal w-full sm:w-auto min-h-[52px] px-9 py-4 rounded-2xl text-sm font-semibold tracking-[0.15em] uppercase flex items-center justify-center gap-3">
                    Enter Experience <span class="text-lg">→</span>
                </button>
            </div>
        </div>

        <!-- TRIBUTE & LEGACY SECTION -->
        <div class="w-full flex flex-col items-center gap-8 text-center px-2 sm:px-4 max-w-5xl mx-auto">
            <div class="flex flex-col items-center gap-2">
                <span class="text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">HONORING THE FOUNDATIONS</span>
                <h2 class="text-xl sm:text-2xl md:text-3xl font-light text-white tracking-[0.15em] uppercase">
                    Built in Memory of the Giants
                </h2>
                <div class="h-[1px] w-16 bg-white/20 mt-3"></div>
            </div>

            <!-- Frosted Glass Tribute Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 w-full">
                <!-- Zoro.to -->
                <div class="glass-crystal-card p-6 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                    <span class="text-xl font-medium text-white tracking-wider">Zoro.to</span>
                    <span class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">2020 — 2023</span>
                </div>
                <!-- HiAnime -->
                <div class="glass-crystal-card p-6 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                    <span class="text-xl font-medium text-white tracking-wider">HiAnime</span>
                    <span class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Legacy Pillar</span>
                </div>
                <!-- AniWatch -->
                <div class="glass-crystal-card p-6 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                    <span class="text-xl font-medium text-white tracking-wider">AniWatch</span>
                    <span class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Speed Standard</span>
                </div>
                <!-- AnimeKai -->
                <div class="glass-crystal-card p-6 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                    <span class="text-xl font-medium text-white tracking-wider">AnimeKai</span>
                    <span class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Catalog Pioneer</span>
                </div>
            </div>

            <!-- Understated Frosted Plaque Statement -->
            <div class="glass-crystal p-8 md:p-10 rounded-3xl w-full text-left flex flex-col md:flex-row items-center gap-6">
                <div class="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white text-xl shrink-0 font-serif">
                    ❖
                </div>
                <div class="flex flex-col gap-2">
                    <h3 class="text-sm font-semibold text-white tracking-[0.15em] uppercase">The BlackLeg Legacy Pledge</h3>
                    <p class="text-xs md:text-sm text-slate-300 leading-relaxed font-light">
                        They established the standard for community anime streaming. ANIMEFLOW carries their vision forward—delivering an uncompromised, ad-free, high-performance platform dedicated solely to anime preservation and accessibility.
                    </p>
                </div>
            </div>
        </div>

        <!-- PLATFORM ARCHITECTURE EDITORIAL GRID -->
        <div class="w-full flex flex-col items-center gap-10 px-4 max-w-6xl mx-auto pb-12">
            <div class="flex flex-col items-center gap-2 text-center">
                <span class="text-slate-400 text-xs font-mono tracking-[0.2em] uppercase">SYSTEM SPECIFICATION</span>
                <h2 class="text-2xl md:text-3xl font-light text-white tracking-[0.15em] uppercase">Core Platform Architecture</h2>
                <div class="h-[1px] w-16 bg-white/20 mt-3"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                <!-- Feature 1 -->
                <div class="glass-crystal-card p-7 rounded-3xl flex flex-col gap-4">
                    <span class="text-xs font-mono text-slate-400 tracking-widest uppercase">01 / PROXY</span>
                    <h3 class="text-base font-medium text-white tracking-wide">Cluster Streaming</h3>
                    <p class="text-xs text-slate-300 leading-relaxed font-light">
                        Direct edge-worker chunk relaying bypasses rate limits and origin throttling, providing instant bufferless video delivery.
                    </p>
                </div>

                <!-- Feature 2 -->
                <div class="glass-crystal-card p-7 rounded-3xl flex flex-col gap-4">
                    <span class="text-xs font-mono text-slate-400 tracking-widest uppercase">02 / TIMELINE</span>
                    <h3 class="text-base font-medium text-white tracking-wide">Frame Accuracy</h3>
                    <p class="text-xs text-slate-300 leading-relaxed font-light">
                        Precise intro and outro timestamp serialization allows automated skip integration directly inside the playback engine.
                    </p>
                </div>

                <!-- Feature 3 -->
                <div class="glass-crystal-card p-7 rounded-3xl flex flex-col gap-4">
                    <span class="text-xs font-mono text-slate-400 tracking-widest uppercase">03 / SYNC</span>
                    <h3 class="text-base font-medium text-white tracking-wide">State Synchronization</h3>
                    <p class="text-xs text-slate-300 leading-relaxed font-light">
                        Seamless cross-session episode memory and progress persistence stored locally without invasive user tracking.
                    </p>
                </div>

                <!-- Feature 4 -->
                <div class="glass-crystal-card p-7 rounded-3xl flex flex-col gap-4">
                    <span class="text-xs font-mono text-slate-400 tracking-widest uppercase">04 / COLOR</span>
                    <h3 class="text-base font-medium text-white tracking-wide">Palette Adaptability</h3>
                    <p class="text-xs text-slate-300 leading-relaxed font-light">
                        Dynamic theme color extraction tailors subtle interface highlight hues to the active anime artwork.
                    </p>
                </div>
            </div>
        </div>
    `;
};

window.renderTrendingExploreView = async function() {
    const container = document.getElementById('trending-explore-layout');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-[#00f5ff]"></div>
        </div>
    `;

    try {
        const json = await fetchTrendingExplore();
        const trendingList = json?.data?.Page?.media || window.trendingCache || [];

        if (trendingList.length === 0) {
            container.innerHTML = `<div class="text-center py-12 text-slate-400">No trending titles available right now.</div>`;
            return;
        }

        const top1 = trendingList[0];
        const top1Title = getShowTitle(top1);
        const top1Banner = top1.bannerImage || top1.coverImage.extraLarge || top1.coverImage.large;
        const top1Desc = top1.description ? top1.description.replace(/<[^>]*>?/gm, '') : '';
        const top1Stringified = JSON.stringify(top1).replace(/"/g, '&quot;');

        let heroHtml = `
            <!-- HERO BANNER FOR #1 TRENDING -->
            <div class="relative w-full rounded-3xl overflow-hidden mb-8 border border-white/10 glass-crystal shadow-2xl min-h-[300px] md:min-h-[360px] flex items-end p-6 md:p-10">
                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105" style="background-image: url('${top1Banner}');"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/70 to-transparent"></div>
                
                <div class="relative z-10 flex flex-col gap-3 max-w-2xl">
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1 bg-[#00f5ff]/20 border border-[#00f5ff]/40 text-[#00f5ff] text-xs font-mono font-bold uppercase rounded-full tracking-wider flex items-center gap-1.5">
                            🔥 #1 TRENDING WORLDWIDE
                        </span>
                        <span class="text-xs font-bold text-amber-400">★ ${top1.meanScore || 'N/A'}% Score</span>
                    </div>
                    <h1 class="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                        ${top1Title}
                    </h1>
                    <p class="text-xs sm:text-sm text-slate-300 line-clamp-2 font-light max-w-xl">
                        ${top1Desc}
                    </p>
                    <div class="flex items-center gap-3 mt-2">
                        <button onclick="watchShow(${top1Stringified})" class="px-6 py-3 min-h-[44px] bg-[#00f5ff] hover:bg-[#00d8e6] text-[#08080c] font-bold text-xs md:text-sm rounded-xl transition-all transform hover:scale-105 active:scale-95 uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,245,255,0.4)]">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            Watch Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        let gridCardsHtml = trendingList.map((show, idx) => {
            const title = getShowTitle(show);
            const coverUrl = show.coverImage.extraLarge || show.coverImage.large;
            const rating = show.meanScore ? `${show.meanScore}%` : 'N/A';
            const showStr = JSON.stringify(show).replace(/"/g, '&quot;');
            const badgeText = show.format || 'ANIME';

            return `
                <div class="anime-card flex flex-col bg-[#121218]/50 rounded-2xl overflow-hidden border border-white/10 hover:border-[#00f5ff] relative cursor-pointer group transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,245,255,0.25)] min-h-[44px]" onclick="watchShow(${showStr})">
                    <div class="relative aspect-[3/4] w-full overflow-hidden">
                        <img src="${coverUrl}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded text-[9px] font-mono font-extrabold text-amber-400 border border-amber-400/20">
                            #${idx + 1}
                        </div>
                        <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[9px] font-bold text-[#00f5ff] border border-[#00f5ff]/20">
                            ★ ${rating}
                        </div>
                        <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-slate-300 uppercase tracking-wider border border-white/5">
                            ${badgeText}
                        </div>
                    </div>
                    <div class="anime-card-title-box">
                        <h3 class="explore-title-text anime-title-text text-white text-xs md:text-sm font-semibold group-hover:text-[#00f5ff] transition-colors" title="${title}">
                            ${title}
                        </h3>
                    </div>
                </div>
            `;
        }).join('');

        let mainHtml = `
            <div class="flex flex-col gap-6">
                ${heroHtml}
                <div class="flex items-center justify-between border-l-4 border-[#00f5ff] pl-3 py-1">
                    <h2 class="text-base md:text-xl font-bold tracking-widest text-white uppercase">
                        Top 50 Trending Anime
                    </h2>
                    <span class="text-xs font-mono text-slate-400">50 Titles Loaded</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5 md:gap-4">
                    ${gridCardsHtml}
                </div>
            </div>
        `;

        container.innerHTML = mainHtml;
    } catch (err) {
        console.error('[Trending Explore] Error rendering:', err);
        container.innerHTML = `<div class="text-center py-12 text-rose-500 font-semibold">Failed to load top trending anime.</div>`;
    }
};

window.renderDedicatedScheduleView = async function() {
    const container = document.getElementById('dedicated-schedule-layout');
    if (!container) return;

    if (!window.airingScheduleData) {
        container.innerHTML = `
            <div class="flex items-center justify-center py-16">
                <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-[#00f5ff]"></div>
            </div>
        `;
        try {
            const schedData = await fetchClusterNode({ action: 'schedule' });
            window.airingScheduleData = schedData || [];
        } catch (err) {
            console.error('[Schedule View] Failed to fetch schedule:', err);
        }
    }

    const dayGroups = window.airingScheduleData || [];
    if (dayGroups.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-400">Schedule unavailable.</div>`;
        return;
    }

    let dayDockHtml = `<div class="flex items-center gap-2 overflow-x-auto pb-4 w-full scrollbar-none snap-x snap-mandatory touch-pan-x">`;
    dayGroups.forEach((group, index) => {
        const dayName = group.day;
        const isSelected = index === activeScheduleDayIndex;
        const isToday = index === 0;
        const shortDay = dayName.length > 3 ? dayName.substring(0, 3) : dayName;
        const displayLabel = isToday ? `Today (${shortDay})` : dayName;

        const activeClass = isSelected
            ? 'bg-[#00f5ff]/20 border-[#00f5ff]/60 text-white shadow-[0_0_20px_rgba(0,245,255,0.3)] font-bold'
            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white font-medium';

        dayDockHtml += `
            <button onclick="selectDedicatedScheduleDay(${index})" class="px-5 py-3 text-xs md:text-sm tracking-wider uppercase rounded-2xl border transition-all duration-300 ${activeClass} whitespace-nowrap snap-start shrink-0 min-h-[44px]">
                ${displayLabel}
            </button>
        `;
    });
    dayDockHtml += `</div>`;

    const currentGroup = dayGroups[activeScheduleDayIndex];
    const shows = currentGroup ? currentGroup.shows || [] : [];

    let showsListHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full">`;
    if (shows.length === 0) {
        showsListHtml += `<div class="col-span-full text-center py-12 text-slate-400 text-sm italic">No scheduled broadcasts for this day</div>`;
    } else {
        shows.forEach(show => {
            const localTime = formatLocalTime(show.timestamp);
            const searchParam = encodeURIComponent(show.title);

            showsListHtml += `
                <div class="flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-[#00f5ff]/40 transition-all duration-300 cursor-pointer group active:scale-[0.98] min-h-[44px]" onclick="searchAndPlay('${searchParam}', '${show.slug}')">
                    <div class="flex items-center gap-3 min-w-0 mr-3">
                        <span class="text-xs font-extrabold text-[#00f5ff] whitespace-nowrap bg-[#00f5ff]/10 px-3 py-1.5 rounded-xl border border-[#00f5ff]/25 shadow-[0_0_10px_rgba(0,245,255,0.15)]">
                            ${localTime}
                        </span>
                        <h4 class="text-white text-xs md:text-sm font-bold truncate group-hover:text-[#00f5ff] transition-colors" title="${show.title}">
                            ${show.title}
                        </h4>
                    </div>
                    <span class="text-[10px] font-extrabold text-white bg-[#00f5ff]/80 text-[#08080c] px-3 py-1 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(0,245,255,0.3)] font-mono">
                        EP ${show.episode}
                    </span>
                </div>
            `;
        });
    }
    showsListHtml += `</div>`;

    container.innerHTML = `
        <div class="flex flex-col gap-6">
            <div class="flex items-center justify-between border-l-4 border-[#00f5ff] pl-3 py-1">
                <h1 class="text-xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
                    Weekly Airing Broadcast Schedule
                </h1>
                <span class="text-xs font-mono text-slate-400">Live Release Times</span>
            </div>
            ${dayDockHtml}
            ${showsListHtml}
        </div>
    `;
};

window.selectDedicatedScheduleDay = function(index) {
    activeScheduleDayIndex = index;
    if (typeof window.renderDedicatedScheduleView === 'function') {
        window.renderDedicatedScheduleView();
    }
};


