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
                                <div class="text-[10px] md:text-xs font-semibold text-white mt-2 truncate group-hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors">${item.title}</div>
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
        landingLayout.className = 'w-full relative min-h-screen py-6 flex flex-col gap-16 select-none';
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
        <!-- HERO SECTION -->
        <div class="relative w-full rounded-3xl overflow-hidden p-8 md:p-16 border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,255,204,0.15)] flex flex-col items-center text-center gap-8 mt-4 group">
            
            <!-- Animated Background Glow & Particles -->
            <div class="absolute inset-0 bg-gradient-to-tr from-[#00f5ff]/10 via-transparent to-[#bd00ff]/15 opacity-70 pointer-events-none"></div>
            <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00f5ff]/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div class="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#bd00ff]/20 rounded-full blur-[120px] pointer-events-none"></div>

            <!-- Top Badge -->
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-themeCyan text-xs font-mono font-extrabold uppercase tracking-widest shadow-md">
                <span class="w-2 h-2 rounded-full bg-themeCyan animate-ping"></span>
                DECENTRALIZED ARCHITECTURE V3.0
            </div>

            <!-- Main Title & Tagline -->
            <div class="flex flex-col gap-4 max-w-4xl z-10">
                <h1 class="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none">
                    ANIME<span class="text-transparent bg-clip-text bg-gradient-to-r from-themeCyan via-cyan-300 to-amber-400 drop-shadow-[0_0_25px_rgba(0,255,204,0.6)]">FLOW</span>
                </h1>
                <p class="text-lg md:text-2xl text-slate-300 font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
                    Next-Generation Decentralized Anime Streaming Engine.
                </p>
            </div>

            <!-- Main CTA Glass Button -->
            <div class="z-10 mt-2">
                <button onclick="window.history.pushState(null, '', '/home'); handleSpaRouting();" class="relative group/btn px-10 py-5 rounded-2xl bg-gradient-to-r from-themeCyan via-cyan-400 to-amber-400 text-[#08080c] font-black text-base md:text-lg uppercase tracking-wider transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(0,255,204,0.5)] hover:shadow-[0_0_50px_rgba(0,255,204,0.8)] flex items-center gap-3">
                    <span class="text-xl">🚀</span> START STREAMING
                    <svg class="w-5 h-5 fill-current transition-transform group-hover/btn:translate-x-1" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>

        <!-- TRIBUTE & LEGACY SECTION (Dedicated Honor to Banned Sites) -->
        <div class="w-full flex flex-col items-center gap-8 text-center px-4">
            <div class="flex flex-col items-center gap-2">
                <div class="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-widest">
                    <span>👑</span> HONORING THE PIONEERS
                </div>
                <h2 class="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-wider">
                    Built in Memory of the Giants
                </h2>
                <div class="h-1 w-24 bg-gradient-to-r from-themeCyan to-amber-400 rounded-full mt-2"></div>
            </div>

            <!-- Tribute Badges Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl">
                <!-- Zoro.to -->
                <div class="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] group">
                    <span class="text-2xl font-black text-emerald-400 group-hover:scale-110 transition-transform">Zoro.to</span>
                    <span class="text-[10px] text-steelGray font-mono uppercase tracking-wider">2020 — 2023</span>
                </div>
                <!-- HiAnime -->
                <div class="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-pink-400/60 hover:shadow-[0_0_20px_rgba(244,114,182,0.3)] group">
                    <span class="text-2xl font-black text-pink-400 group-hover:scale-110 transition-transform">HiAnime</span>
                    <span class="text-[10px] text-steelGray font-mono uppercase tracking-wider">Legacy Pillar</span>
                </div>
                <!-- AniWatch -->
                <div class="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] group">
                    <span class="text-2xl font-black text-cyan-400 group-hover:scale-110 transition-transform">AniWatch</span>
                    <span class="text-[10px] text-steelGray font-mono uppercase tracking-wider">Speed Benchmark</span>
                </div>
                <!-- AnimeKai -->
                <div class="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] group">
                    <span class="text-2xl font-black text-amber-400 group-hover:scale-110 transition-transform">AnimeKai</span>
                    <span class="text-[10px] text-steelGray font-mono uppercase tracking-wider">Catalog Master</span>
                </div>
            </div>

            <!-- Legacy Promise Banner -->
            <div class="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 max-w-3xl w-full bg-slate-950/60 backdrop-blur-xl relative overflow-hidden shadow-xl text-left flex flex-col md:flex-row items-center gap-6">
                <div class="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-3xl shrink-0">
                    🔥
                </div>
                <div class="flex flex-col gap-1.5">
                    <h4 class="text-base md:text-lg font-bold text-white uppercase tracking-wide">The BlackLeg Legacy Promise</h4>
                    <p class="text-xs md:text-sm text-steelGray leading-relaxed font-light">
                        They built the foundation; we carry the torch. BlackLeg and ANIMEFLOW promise to carry their legacy forward—delivering zero-ad, ultra-fast, high-performance streaming for anime fans worldwide.
                    </p>
                </div>
            </div>
        </div>

        <!-- HOW IT WORKS & KEY FEATURES -->
        <div class="w-full flex flex-col items-center gap-10 px-4">
            <div class="flex flex-col items-center gap-2 text-center">
                <span class="text-themeCyan text-xs font-mono uppercase tracking-widest">⚡ ARCHITECTURE OVERVIEW</span>
                <h2 class="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-wider">How It Works & Key Features</h2>
                <div class="h-1 w-24 bg-gradient-to-r from-themeCyan to-amber-400 rounded-full mt-2"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
                <!-- Feature 1 -->
                <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-4 hover:border-themeCyan/50 transition-all duration-300 group hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-2xl bg-themeCyan/10 border border-themeCyan/30 flex items-center justify-center text-themeCyan text-2xl group-hover:scale-110 transition-transform">
                        🌐
                    </div>
                    <h3 class="text-base font-bold text-white uppercase tracking-wider">Decentralized Cluster Proxy</h3>
                    <p class="text-xs text-steelGray leading-relaxed font-light">
                        Bypasses rate limits and streams directly via high-speed Worker nodes, ensuring zero buffering and instant playback startup.
                    </p>
                </div>

                <!-- Feature 2 -->
                <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-4 hover:border-amber-400/50 transition-all duration-300 group hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-2xl group-hover:scale-110 transition-transform">
                        🌳
                    </div>
                    <h3 class="text-base font-bold text-white uppercase tracking-wider">Smart Timeline Serialization</h3>
                    <p class="text-xs text-steelGray leading-relaxed font-light">
                        Full franchise tree navigation powered by SvelteKit data de-serialization, connecting prequels, sequels, and side-stories seamlessly.
                    </p>
                </div>

                <!-- Feature 3 -->
                <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-4 hover:border-cyan-400/50 transition-all duration-300 group hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-2xl group-hover:scale-110 transition-transform">
                        ⏩
                    </div>
                    <h3 class="text-base font-bold text-white uppercase tracking-wider">In-Player Filler Engine</h3>
                    <p class="text-xs text-steelGray leading-relaxed font-light">
                        Automated filler detection with instant skip toggles and marker highlights embedded directly on the custom progress bar timeline.
                    </p>
                </div>

                <!-- Feature 4 -->
                <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col gap-4 hover:border-pink-400/50 transition-all duration-300 group hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-2xl bg-pink-400/10 border border-pink-400/30 flex items-center justify-center text-pink-400 text-2xl group-hover:scale-110 transition-transform">
                        🎨
                    </div>
                    <h3 class="text-base font-bold text-white uppercase tracking-wider">Theme-Synced Player</h3>
                    <p class="text-xs text-steelGray leading-relaxed font-light">
                        Dynamic accent color adaptation tailored to every anime's unique palette, morphing UI highlights dynamically as you browse.
                    </p>
                </div>
            </div>
        </div>
    `;
};


