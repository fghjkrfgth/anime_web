// -------------------------------------------------------------------------
// ADVANCED PLAYER CONTROLS, PROGRESS BAR & KEYBOARD SHORTCUTS ENGINE
// -------------------------------------------------------------------------

window.overlayHideTimeout = window.overlayHideTimeout || null;

function applySubtitleStyles(fontSize, styleType) {
    let styleTag = document.getElementById('custom-cue-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-cue-styles';
        document.head.appendChild(styleTag);
    }
    let bg = 'rgba(8, 8, 12, 0.75)';
    if (styleType === 'transparent') bg = 'transparent';
    else if (styleType === 'semi-trans') bg = 'rgba(0, 0, 0, 0.45)';

    styleTag.textContent = `
        video::cue, ::cue {
            font-size: ${fontSize || '15px'} !important;
            background: ${bg} !important;
            color: #ffffff !important;
            text-shadow: 0 0 4px rgba(0,0,0,0.9) !important;
            font-family: 'Outfit', sans-serif !important;
            line-height: 1.4 !important;
            margin-bottom: 15% !important;
        }
    `;
}

function renderEmptyStreamFallback(epNum) {
    const playerContainer = document.getElementById('player-container') || document.querySelector('#watch-page-layout .aspect-video') || document.querySelector('.aspect-video');
    if (!playerContainer) return;

    const spinner = document.getElementById('player-loading-spinner');
    if (spinner) spinner.classList.add('hidden');

    const existingOverlay = document.getElementById('custom-player-controls-overlay');
    if (existingOverlay) existingOverlay.remove();

    const existingFallback = document.getElementById('empty-stream-fallback-overlay');
    if (existingFallback) existingFallback.remove();

    const fallback = document.createElement('div');
    fallback.id = 'empty-stream-fallback-overlay';
    fallback.className = 'absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-2xl text-center select-none animate-crystal-in';
    
    const epText = epNum ? `Episode ${epNum}` : 'this episode';

    fallback.innerHTML = `
        <div class="glass-crystal p-8 md:p-10 rounded-3xl max-w-md w-full flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
            <!-- Minimalist Line-Art Anime Reaction Sticker in Soft White -->
            <div class="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                <span class="text-3xl font-mono text-slate-200 tracking-tighter select-none font-semibold">(>_<)</span>
            </div>

            <!-- Header & Messages -->
            <div class="flex flex-col gap-2">
                <span class="text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 self-center">
                    STREAM UNAVAILABLE
                </span>
                <h3 class="text-lg md:text-xl font-light text-white tracking-wide mt-1">
                    Stream Segment Unresolved
                </h3>
                <p class="text-xs md:text-sm text-slate-300 leading-relaxed font-light max-w-xs">
                    Neither Sub nor Dub segments could be resolved for <strong class="text-white font-medium">${epText}</strong>.
                </p>
            </div>

            <!-- Action Buttons in Crystal Glass -->
            <div class="flex items-center gap-3 w-full mt-1">
                <button onclick="if(typeof window.loadEpisodeStream === 'function'){ window.loadEpisodeStream(${epNum || 1}); }" class="btn-crystal flex-1 py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
                    <svg class="w-3.5 h-3.5 fill-current opacity-80" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                    Retry Cluster
                </button>
                <button onclick="if(window.showData){ const slug = (typeof window.slugify === 'function' ? window.slugify(window.showData.title.english || window.showData.title.romaji) : 'anime'); window.history.pushState({}, '', '/anime/' + slug + '-' + window.showData.id); handleSpaRouting(); } else { window.history.pushState({}, '', '/home'); handleSpaRouting(); }" class="btn-crystal py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider">
                    Go Back
                </button>
            </div>
        </div>
    `;
    
    playerContainer.appendChild(fallback);
}

window.renderEmptyStreamFallback = renderEmptyStreamFallback;

function initPlayerControls() {
    const video = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
    if (!video) return;

    const container = video.parentElement;
    if (!container) return;

    if (!container.id) {
        container.id = 'player-container';
    }

    let existingOverlay = document.getElementById('custom-player-controls-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'custom-player-controls-overlay';
    overlay.className = 'absolute inset-0 z-20 flex flex-col justify-between p-4 bg-gradient-to-t from-black/85 via-transparent to-black/40 opacity-0 pointer-events-none transition-opacity duration-300 select-none';

    const showTitle = window.showData?.title?.english || window.showData?.title?.romaji || window.showData?.title?.userPreferred || 'Anime';
    const epNum = window.currentEp || 1;

    overlay.innerHTML = `
        <!-- Top Bar: Title & Status -->
        <div class="flex items-center justify-between text-white text-xs font-semibold drop-shadow-md">
            <div id="player-overlay-title" class="truncate font-bold tracking-wide">
                ${showTitle} - Episode ${epNum}
            </div>
            <div id="player-overlay-status" class="px-2 py-0.5 rounded text-[10px] font-mono bg-black/40 border border-white/10 uppercase" style="color: var(--anime-accent-color, #f59e0b);">
                BLACKLEG PLAYER
            </div>
        </div>

        <!-- Center Bar: 10s Rewind, Center Play/Pause, 10s Fast-Forward -->
        <div class="flex items-center justify-center gap-6 md:gap-8 my-auto pointer-events-auto">
            <button id="btn-rewind-10" title="Rewind 10s (Left Arrow / J)" class="w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-md">
                <span class="text-xs font-extrabold tracking-tighter">⏮ 10s</span>
            </button>
            <button id="btn-center-play" title="Play/Pause (Space / K)" class="w-16 h-16 rounded-full text-[#08080c] flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-xl" style="background: var(--anime-accent-color, #f59e0b); box-shadow: 0 0 25px rgba(var(--anime-accent-rgb, 245, 158, 11), 0.6);">
                <svg id="icon-center-play" class="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg id="icon-center-pause" class="w-8 h-8 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button id="btn-forward-10" title="Forward 10s (Right Arrow / L)" class="w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-md">
                <span class="text-xs font-extrabold tracking-tighter">10s ⏭</span>
            </button>
        </div>

        <!-- Bottom Controls & Progress Bar Wrapper (Transparent Gradient Overlay) -->
        <div class="flex flex-col gap-2 pointer-events-auto bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 border-none shadow-none relative rounded-b-xl">
            
            <!-- Segmented Custom Progress Bar -->
            <div id="player-progress-container" class="relative w-full h-3 flex items-center cursor-pointer group py-1">
                <!-- Tooltip -->
                <div id="player-progress-tooltip" class="absolute -top-7 transform -translate-x-1/2 bg-black/90 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-white/20 opacity-0 pointer-events-none transition-opacity duration-150 shadow-md z-30">
                    0:00
                </div>

                <!-- Track Container -->
                <div class="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden group-hover:h-2 transition-all duration-200">
                    <!-- Intro Marker Highlight -->
                    <div id="player-progress-intro-marker" class="absolute top-0 bottom-0 bg-cyan-400/70 border-x border-cyan-300 shadow-[0_0_8px_rgba(0,255,255,0.8)] hidden z-10"></div>
                    <!-- Outro Marker Highlight -->
                    <div id="player-progress-outro-marker" class="absolute top-0 bottom-0 bg-amber-400/70 border-x border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)] hidden z-10"></div>
                    <!-- Progress Fill -->
                    <div id="player-progress-fill" class="h-full rounded-full transition-all duration-75 relative z-20" style="width: 0%; background: var(--anime-accent-color, #f59e0b);"></div>
                </div>
            </div>

            <!-- Controls Row -->
            <div class="flex items-center justify-between gap-2 md:gap-4">
                <div class="flex items-center gap-2 md:gap-3">
                    <button id="btn-bottom-play" title="Play/Pause" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
                        <svg id="icon-bottom-play" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg id="icon-bottom-pause" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <span id="player-time-display" class="text-xs font-mono text-white/90">0:00 / 0:00</span>
                </div>

                <div class="flex items-center gap-2 md:gap-4 relative">
                    <!-- In-Player Automation Controls Popover -->
                    <div class="relative">
                        <button id="btn-auto-toggles" title="Auto Settings" class="min-w-[44px] min-h-[44px] px-2.5 py-1.5 text-xs font-bold font-mono text-white/80 hover:text-white hover:bg-white/10 rounded border border-white/10 transition-all flex items-center justify-center gap-1">
                            ⚡ Auto
                        </button>
                        <div id="player-auto-popover" class="absolute right-0 bottom-12 w-48 p-3 rounded-xl bg-slate-950/95 border border-white/15 backdrop-blur-xl shadow-2xl hidden z-50 flex flex-col gap-2.5 text-xs text-white">
                            <div class="font-bold border-b border-white/10 pb-1 text-slate-300 flex justify-between items-center text-[11px]">
                                <span>Automation Controls</span>
                            </div>
                            <label class="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                                <span class="text-slate-200 text-[11px]">Auto Skip Intro</span>
                                <input id="chk-player-skip-intro" type="checkbox" class="accent-[var(--anime-accent-color,#f59e0b)] w-4 h-4 cursor-pointer">
                            </label>
                            <label class="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                                <span class="text-slate-200 text-[11px]">Auto Skip Outro</span>
                                <input id="chk-player-skip-outro" type="checkbox" class="accent-[var(--anime-accent-color,#f59e0b)] w-4 h-4 cursor-pointer">
                            </label>
                            <label class="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                                <span class="text-slate-200 text-[11px]">Auto Next Ep</span>
                                <input id="chk-player-auto-next" type="checkbox" class="accent-[var(--anime-accent-color,#f59e0b)] w-4 h-4 cursor-pointer">
                            </label>
                        </div>
                    </div>

                    <!-- Subtitles/Captions Button & Popover -->
                    <div class="relative">
                        <button id="btn-captions-toggle" title="Subtitles / Captions (C)" class="min-w-[44px] min-h-[44px] px-2.5 py-1.5 text-xs font-bold font-mono text-white/80 hover:text-white hover:bg-white/10 rounded border border-white/10 transition-all flex items-center justify-center">
                            CC
                        </button>
                        <div id="player-captions-popover" class="absolute right-0 bottom-12 w-56 p-3 rounded-xl bg-slate-950/95 border border-white/15 backdrop-blur-xl shadow-2xl hidden z-50 flex flex-col gap-3 text-xs text-white">
                            <div class="font-bold border-b border-white/10 pb-1.5 text-slate-300 flex justify-between items-center">
                                <span>Subtitles / Captions</span>
                                <span id="captions-active-track-label" class="text-[10px] text-themeCyan">Off</span>
                            </div>
                            <div id="captions-tracks-list" class="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                                <button class="caption-track-option text-left px-2 py-1 rounded hover:bg-white/10 text-themeCyan font-bold" data-index="-1">Off</button>
                            </div>
                            <div class="border-t border-white/10 pt-2 flex flex-col gap-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-[11px] text-slate-400">Size</span>
                                    <select id="caption-size-select" class="bg-slate-900 border border-white/10 text-xs text-white rounded px-1.5 py-0.5 outline-none cursor-pointer">
                                        <option value="12px">Small</option>
                                        <option value="15px" selected>Medium</option>
                                        <option value="18px">Large</option>
                                        <option value="22px">X-Large</option>
                                    </select>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[11px] text-slate-400">Style</span>
                                    <select id="caption-style-select" class="bg-slate-900 border border-white/10 text-xs text-white rounded px-1.5 py-0.5 outline-none cursor-pointer">
                                        <option value="black-box" selected>Black Box</option>
                                        <option value="transparent">Transparent</option>
                                        <option value="semi-trans">Semi-Trans</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Playback Speed Button & Popover -->
                    <div class="relative">
                        <button id="btn-speed-toggle" title="Playback Speed (< / >)" class="min-w-[44px] min-h-[44px] px-2.5 py-1.5 text-xs font-bold font-mono text-white/80 hover:text-white hover:bg-white/10 rounded border border-white/10 transition-all flex items-center justify-center">
                            1.0x
                        </button>
                        <div id="player-speed-popover" class="absolute right-0 bottom-12 w-32 p-2 rounded-xl bg-slate-950/95 border border-white/15 backdrop-blur-xl shadow-2xl hidden z-50 flex flex-col gap-1 text-xs text-white">
                            <div class="font-bold border-b border-white/10 pb-1 text-slate-300 text-[11px]">Speed</div>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="0.25">0.25x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="0.5">0.5x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="0.75">0.75x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10 font-bold text-themeCyan" data-speed="1.0">1.0x (Normal)</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="1.25">1.25x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="1.5">1.5x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="1.75">1.75x</button>
                            <button class="speed-option text-left px-2 py-1 rounded hover:bg-white/10" data-speed="2.0">2.0x</button>
                        </div>
                    </div>

                    <!-- Volume Controls -->
                    <div class="hidden sm:flex items-center gap-2">
                        <button id="btn-mute-toggle" title="Mute/Unmute (M)" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors">
                            <svg id="icon-vol-high" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            <svg id="icon-vol-mute" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        </button>
                        <input id="player-volume-slider" type="range" min="0" max="1" step="0.05" value="1" class="w-14 md:w-20 accent-[var(--anime-accent-color,#f59e0b)] h-1 cursor-pointer">
                    </div>

                    <!-- Fullscreen Toggle -->
                    <button id="btn-fullscreen-toggle" title="Toggle Fullscreen (F)" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(overlay);

    const btnRewind = document.getElementById('btn-rewind-10');
    const btnForward = document.getElementById('btn-forward-10');
    const btnCenterPlay = document.getElementById('btn-center-play');
    const btnBottomPlay = document.getElementById('btn-bottom-play');
    const btnMute = document.getElementById('btn-mute-toggle');
    const volSlider = document.getElementById('player-volume-slider');
    const btnFullscreen = document.getElementById('btn-fullscreen-toggle');
    const btnCaptions = document.getElementById('btn-captions-toggle');
    const captionsPopover = document.getElementById('player-captions-popover');
    const btnSpeed = document.getElementById('btn-speed-toggle');
    const speedPopover = document.getElementById('player-speed-popover');
    const btnAuto = document.getElementById('btn-auto-toggles');
    const autoPopover = document.getElementById('player-auto-popover');
    const chkSkipIntro = document.getElementById('chk-player-skip-intro');
    const chkSkipOutro = document.getElementById('chk-player-skip-outro');
    const chkAutoNext = document.getElementById('chk-player-auto-next');
    const progressContainer = document.getElementById('player-progress-container');
    const progressFill = document.getElementById('player-progress-fill');
    const progressTooltip = document.getElementById('player-progress-tooltip');
    const introMarker = document.getElementById('player-progress-intro-marker');
    const outroMarker = document.getElementById('player-progress-outro-marker');

    function togglePlay() {
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    function updatePlayPauseIcons() {
        const isPaused = video.paused;
        const iconCenterPlay = document.getElementById('icon-center-play');
        const iconCenterPause = document.getElementById('icon-center-pause');
        const iconBottomPlay = document.getElementById('icon-bottom-play');
        const iconBottomPause = document.getElementById('icon-bottom-pause');

        if (iconCenterPlay && iconCenterPause) {
            iconCenterPlay.classList.toggle('hidden', !isPaused);
            iconCenterPause.classList.toggle('hidden', isPaused);
        }
        if (iconBottomPlay && iconBottomPause) {
            iconBottomPlay.classList.toggle('hidden', !isPaused);
            iconBottomPause.classList.toggle('hidden', isPaused);
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateTimeDisplay() {
        const currentTime = video.currentTime;
        const prefs = (typeof window.getUserPreferences === 'function') ? window.getUserPreferences() : { autoSkipIntro: false, autoSkipOutro: false, autoNext: true };

        // --- CONSOLIDATED AUTOMATED SKIP LOGIC ---
        // 1. Auto Skip Intro
        if (prefs.autoSkipIntro && window.introTimes) {
            const start = window.introTimes.start !== undefined ? window.introTimes.start : (Array.isArray(window.introTimes) ? window.introTimes[0] : 0);
            const end = window.introTimes.end !== undefined ? window.introTimes.end : (Array.isArray(window.introTimes) ? window.introTimes[1] : 90);
            if (end > 0 && currentTime >= start && currentTime < (end - 0.5)) {
                console.log(`[Player Engine] Auto-Skipping Intro to ${end}s`);
                video.currentTime = end;
                return;
            }
        }

        // 2. Auto Skip Outro
        if (prefs.autoSkipOutro && window.outroTimes) {
            const start = window.outroTimes.start !== undefined ? window.outroTimes.start : (Array.isArray(window.outroTimes) ? window.outroTimes[0] : 1300);
            const end = window.outroTimes.end !== undefined ? window.outroTimes.end : (Array.isArray(window.outroTimes) ? window.outroTimes[1] : 1390);
            if (end > 0 && currentTime >= start && currentTime < (end - 0.5)) {
                console.log(`[Player Engine] Auto-Skipping Outro to ${end}s`);
                video.currentTime = end;
                return;
            }
        }

        const timeDisplay = document.getElementById('player-time-display');
        if (timeDisplay) {
            timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(video.duration)}`;
        }
        if (video.duration && progressFill) {
            const pct = (currentTime / video.duration) * 100;
            progressFill.style.width = `${pct}%`;
        }

        // Timeline markers for intro / outro
        if (video.duration) {
            if (window.introTimes && introMarker) {
                let start = window.introTimes.start !== undefined ? window.introTimes.start : (Array.isArray(window.introTimes) ? window.introTimes[0] : 0);
                let end = window.introTimes.end !== undefined ? window.introTimes.end : (Array.isArray(window.introTimes) ? window.introTimes[1] : 90);
                if (end > start) {
                    const startPct = (start / video.duration) * 100;
                    const widthPct = ((end - start) / video.duration) * 100;
                    introMarker.style.left = `${startPct}%`;
                    introMarker.style.width = `${widthPct}%`;
                    introMarker.classList.remove('hidden');
                }
            }
            if (window.outroTimes && outroMarker) {
                let start = window.outroTimes.start !== undefined ? window.outroTimes.start : (Array.isArray(window.outroTimes) ? window.outroTimes[0] : 1300);
                let end = window.outroTimes.end !== undefined ? window.outroTimes.end : (Array.isArray(window.outroTimes) ? window.outroTimes[1] : 1390);
                if (end > start) {
                    const startPct = (start / video.duration) * 100;
                    const widthPct = ((end - start) / video.duration) * 100;
                    outroMarker.style.left = `${startPct}%`;
                    outroMarker.style.width = `${widthPct}%`;
                    outroMarker.classList.remove('hidden');
                }
            }
        }
    }

    // --- CONSOLIDATED AUTOMATED NEXT EPISODE LOGIC ---
    video.onended = () => {
        updatePlayPauseIcons();
        const prefs = (typeof window.getUserPreferences === 'function') ? window.getUserPreferences() : { autoNext: true };
        if (prefs.autoNext && window.showData) {
            const totalEps = (typeof window.getActualEpisodeCount === 'function') ? window.getActualEpisodeCount(window.showData) : 0;
            if (window.currentEp && window.currentEp < totalEps) {
                console.log(`[Player Engine] Episode ended. Advancing to Episode ${window.currentEp + 1}...`);
                if (typeof window.changeEpisode === 'function') {
                    window.changeEpisode(window.currentEp + 1);
                }
            }
        }
    };

    function seekRelative(seconds) {
        if (!video.duration) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }

    function handleFullscreenChange() {
        const isFS = !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.mozFullScreenElement || !!document.msFullscreenElement;
        if (isFS) {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch((err) => {
                    console.warn('[Player] Landscape lock not supported or denied:', err);
                });
            }
        } else {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    function toggleFullscreen() {
        const isFS = !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.mozFullScreenElement || !!document.msFullscreenElement;
        if (!isFS) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    function toggleMute() {
        video.muted = !video.muted;
        updateVolumeUI();
    }

    function updateVolumeUI() {
        const iconHigh = document.getElementById('icon-vol-high');
        const iconMute = document.getElementById('icon-vol-mute');
        if (volSlider) volSlider.value = video.muted ? 0 : video.volume;
        if (iconHigh && iconMute) {
            iconHigh.classList.toggle('hidden', video.muted || video.volume === 0);
            iconMute.classList.toggle('hidden', !video.muted && video.volume > 0);
        }
    }

    // Progress Bar Interactive Seeking & Tooltip Hover
    let isSeeking = false;
    function seekFromEvent(e) {
        if (!video.duration || !progressContainer) return;
        const rect = progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = pos * video.duration;
    }

    if (progressContainer) {
        let mouseMoveRafPending = false;
        progressContainer.onmousedown = (e) => {
            isSeeking = true;
            seekFromEvent(e);
        };
        window.addEventListener('mousemove', (e) => {
            if (isSeeking && !mouseMoveRafPending) {
                mouseMoveRafPending = true;
                requestAnimationFrame(() => {
                    seekFromEvent(e);
                    mouseMoveRafPending = false;
                });
            }
        });
        window.addEventListener('mouseup', () => {
            isSeeking = false;
        });

        let tooltipRafPending = false;
        progressContainer.onmousemove = (e) => {
            if (!video.duration || !progressTooltip || tooltipRafPending) return;
            tooltipRafPending = true;
            const rect = progressContainer.getBoundingClientRect();
            requestAnimationFrame(() => {
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                progressTooltip.innerText = formatTime(pos * video.duration);
                progressTooltip.style.left = `${pos * 100}%`;
                progressTooltip.classList.remove('opacity-0');
                tooltipRafPending = false;
            });
        };
        progressContainer.onmouseleave = () => {
            if (progressTooltip) progressTooltip.classList.add('opacity-0');
        };
    }

    // --- AUTOMATION TOGGLES POPOVER & EVENT BINDINGS ---
    function syncAutoTogglesUI() {
        if (typeof window.getUserPreferences !== 'function') return;
        const prefs = window.getUserPreferences();
        if (chkSkipIntro) chkSkipIntro.checked = !!prefs.autoSkipIntro;
        if (chkSkipOutro) chkSkipOutro.checked = !!prefs.autoSkipOutro;
        if (chkAutoNext) chkAutoNext.checked = (prefs.autoNext !== undefined ? !!prefs.autoNext : true);
    }

    if (btnAuto) {
        btnAuto.onclick = (e) => {
            e.stopPropagation();
            if (captionsPopover) captionsPopover.classList.add('hidden');
            if (speedPopover) speedPopover.classList.add('hidden');
            if (autoPopover) {
                const isHidden = autoPopover.classList.contains('hidden');
                if (isHidden) syncAutoTogglesUI();
                autoPopover.classList.toggle('hidden');
            }
        };
    }

    if (chkSkipIntro) {
        chkSkipIntro.onchange = (e) => {
            if (typeof window.toggleUserPreference === 'function') {
                window.toggleUserPreference('autoSkipIntro', e.target.checked);
            }
        };
    }
    if (chkSkipOutro) {
        chkSkipOutro.onchange = (e) => {
            if (typeof window.toggleUserPreference === 'function') {
                window.toggleUserPreference('autoSkipOutro', e.target.checked);
            }
        };
    }
    if (chkAutoNext) {
        chkAutoNext.onchange = (e) => {
            if (typeof window.toggleUserPreference === 'function') {
                window.toggleUserPreference('autoNext', e.target.checked);
            }
        };
    }

    // Subtitles & Captions Menu Populate & Listeners
    function populateCaptionsMenu() {
        const tracksList = document.getElementById('captions-tracks-list');
        const activeLabel = document.getElementById('captions-active-track-label');
        if (!tracksList) return;

        const textTracks = Array.from(video.textTracks || []);
        let html = `<button class="caption-track-option text-left px-2 py-1 rounded hover:bg-white/10 font-bold text-themeCyan" data-index="-1">Off</button>`;
        
        let activeFound = false;
        textTracks.forEach((tr, idx) => {
            const isShowing = tr.mode === 'showing';
            if (isShowing) activeFound = true;
            html += `<button class="caption-track-option text-left px-2 py-1 rounded hover:bg-white/10 ${isShowing ? 'font-bold text-themeCyan' : ''}" data-index="${idx}">${tr.label || tr.language || 'Track ' + (idx + 1)}</button>`;
        });

        tracksList.innerHTML = html;
        if (activeLabel) {
            const activeTr = textTracks.find(t => t.mode === 'showing');
            activeLabel.innerText = activeTr ? (activeTr.label || activeTr.language || 'On') : 'Off';
        }

        tracksList.querySelectorAll('.caption-track-option').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                textTracks.forEach((tr, i) => {
                    tr.mode = (i === index) ? 'showing' : 'disabled';
                });
                populateCaptionsMenu();
                if (captionsPopover) captionsPopover.classList.add('hidden');
            };
        });
    }

    if (btnCaptions) {
        btnCaptions.onclick = (e) => {
            e.stopPropagation();
            if (speedPopover) speedPopover.classList.add('hidden');
            if (autoPopover) autoPopover.classList.add('hidden');
            if (captionsPopover) {
                const isHidden = captionsPopover.classList.contains('hidden');
                if (isHidden) populateCaptionsMenu();
                captionsPopover.classList.toggle('hidden');
            }
        };
    }

    const captionSizeSelect = document.getElementById('caption-size-select');
    const captionStyleSelect = document.getElementById('caption-style-select');
    if (captionSizeSelect && captionStyleSelect) {
        const updateStyles = () => {
            applySubtitleStyles(captionSizeSelect.value, captionStyleSelect.value);
        };
        captionSizeSelect.onchange = updateStyles;
        captionStyleSelect.onchange = updateStyles;
        updateStyles();
    }

    // Playback Speed Menu Listeners
    if (btnSpeed) {
        btnSpeed.onclick = (e) => {
            e.stopPropagation();
            if (captionsPopover) captionsPopover.classList.add('hidden');
            if (autoPopover) autoPopover.classList.add('hidden');
            if (speedPopover) {
                speedPopover.classList.toggle('hidden');
            }
        };
    }

    if (speedPopover) {
        speedPopover.querySelectorAll('.speed-option').forEach(btn => {
            btn.onclick = () => {
                const spd = parseFloat(btn.getAttribute('data-speed'));
                video.playbackRate = spd;
                if (btnSpeed) btnSpeed.innerText = `${spd}x`;
                speedPopover.querySelectorAll('.speed-option').forEach(b => {
                    b.classList.remove('font-bold', 'text-themeCyan');
                });
                btn.classList.add('font-bold', 'text-themeCyan');
                speedPopover.classList.add('hidden');
            };
        });
    }

    // Auto-close popovers on outside click
    document.onclick = (e) => {
        if (captionsPopover && !captionsPopover.classList.contains('hidden')) {
            if (!captionsPopover.contains(e.target) && !btnCaptions.contains(e.target)) {
                captionsPopover.classList.add('hidden');
            }
        }
        if (speedPopover && !speedPopover.classList.contains('hidden')) {
            if (!speedPopover.contains(e.target) && !btnSpeed.contains(e.target)) {
                speedPopover.classList.add('hidden');
            }
        }
        if (autoPopover && !autoPopover.classList.contains('hidden')) {
            if (!autoPopover.contains(e.target) && !btnAuto.contains(e.target)) {
                autoPopover.classList.add('hidden');
            }
        }
    };

    if (btnCenterPlay) btnCenterPlay.onclick = togglePlay;
    if (btnBottomPlay) btnBottomPlay.onclick = togglePlay;
    if (btnRewind) btnRewind.onclick = () => seekRelative(-10);
    if (btnForward) btnForward.onclick = () => seekRelative(10);
    if (btnFullscreen) btnFullscreen.onclick = toggleFullscreen;
    if (btnMute) btnMute.onclick = toggleMute;

    if (volSlider) {
        volSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            video.volume = val;
            video.muted = (val === 0);
            updateVolumeUI();
        };
    }

    let timeUpdateRafPending = false;
    function throttledUpdateTimeDisplay() {
        if (!timeUpdateRafPending) {
            timeUpdateRafPending = true;
            requestAnimationFrame(() => {
                updateTimeDisplay();
                timeUpdateRafPending = false;
            });
        }
    }

    video.onplay = updatePlayPauseIcons;
    video.onpause = updatePlayPauseIcons;
    video.ontimeupdate = throttledUpdateTimeDisplay;
    video.onloadedmetadata = updateTimeDisplay;

    function hideOverlay() {
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        if (window.overlayHideTimeout) clearTimeout(window.overlayHideTimeout);
        document.getElementById('player-captions-popover')?.classList.add('hidden');
        document.getElementById('player-speed-popover')?.classList.add('hidden');
        document.getElementById('player-auto-popover')?.classList.add('hidden');
    }

    function showOverlayTemporarily() {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        if (window.overlayHideTimeout) clearTimeout(window.overlayHideTimeout);
        if (!video.paused) {
            window.overlayHideTimeout = setTimeout(() => {
                hideOverlay();
            }, 3000);
        }
    }

    function toggleOverlayVisibility(e) {
        if (e.target.closest('.pointer-events-auto') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
            return;
        }

        if (!overlay) return;

        const isVisible = overlay.classList.contains('opacity-100');

        if (isVisible) {
            hideOverlay();
        } else {
            showOverlayTemporarily();
        }
    }

    const playerContainer = document.getElementById('player-container') || video.parentElement;
    playerContainer.onclick = toggleOverlayVisibility;

    playerContainer.onmousemove = () => {
        if (!overlay.classList.contains('opacity-100')) {
            showOverlayTemporarily();
        }
    };
    playerContainer.onmouseenter = showOverlayTemporarily;
    playerContainer.onmouseleave = () => {
        if (!video.paused) {
            hideOverlay();
        }
    };
}

function setupPlayerKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) {
            return;
        }

        const video = document.querySelector('#player-container video') || document.querySelector('video') || document.getElementById('main-video-player');
        if (!video) return;

        const code = e.code;
        const key = e.key.toLowerCase();
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

        if (code === 'Escape') {
            const capPopover = document.getElementById('player-captions-popover');
            const spdPopover = document.getElementById('player-speed-popover');
            if (capPopover) capPopover.classList.add('hidden');
            if (spdPopover) spdPopover.classList.add('hidden');
            return;
        }

        if (code === 'Space' || key === 'k') {
            e.preventDefault();
            if (video.paused) video.play().catch(() => {}); else video.pause();
        } else if (code === 'ArrowLeft' || key === 'j') {
            e.preventDefault();
            if (video.duration) video.currentTime = Math.max(0, video.currentTime - 10);
        } else if (code === 'ArrowRight' || key === 'l') {
            e.preventDefault();
            if (video.duration) video.currentTime = Math.min(video.duration, video.currentTime + 10);
        } else if (key === 'f') {
            e.preventDefault();
            const container = video.parentElement || video;
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) container.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        } else if (key === 'm') {
            e.preventDefault();
            video.muted = !video.muted;
            const slider = document.getElementById('player-volume-slider');
            if (slider) slider.value = video.muted ? 0 : video.volume;
            const iconHigh = document.getElementById('icon-vol-high');
            const iconMute = document.getElementById('icon-vol-mute');
            if (iconHigh && iconMute) {
                iconHigh.classList.toggle('hidden', video.muted || video.volume === 0);
                iconMute.classList.toggle('hidden', !video.muted && video.volume > 0);
            }
        } else if (key === ',' || key === '<') {
            e.preventDefault();
            const current = video.playbackRate;
            const prev = [...speeds].reverse().find(s => s < current) || speeds[0];
            video.playbackRate = prev;
            const btn = document.getElementById('btn-speed-toggle');
            if (btn) btn.innerText = `${prev}x`;
        } else if (key === '.' || key === '>') {
            e.preventDefault();
            const current = video.playbackRate;
            const next = speeds.find(s => s > current) || speeds[speeds.length - 1];
            video.playbackRate = next;
            const btn = document.getElementById('btn-speed-toggle');
            if (btn) btn.innerText = `${next}x`;
        } else if (key === 'c') {
            e.preventDefault();
            const textTracks = Array.from(video.textTracks || []);
            if (textTracks.length > 0) {
                const anyShowing = textTracks.some(t => t.mode === 'showing');
                textTracks.forEach((tr, i) => {
                    tr.mode = (!anyShowing && i === 0) ? 'showing' : 'disabled';
                });
                const label = document.getElementById('captions-active-track-label');
                if (label) {
                    const active = textTracks.find(t => t.mode === 'showing');
                    label.innerText = active ? (active.label || active.language || 'On') : 'Off';
                }
            }
        } else if (code === 'ArrowUp') {
            e.preventDefault();
            video.volume = Math.min(1, video.volume + 0.1);
            video.muted = false;
            const slider = document.getElementById('player-volume-slider');
            if (slider) slider.value = video.volume;
        } else if (code === 'ArrowDown') {
            e.preventDefault();
            video.volume = Math.max(0, video.volume - 0.1);
            if (video.volume === 0) video.muted = true;
            const slider = document.getElementById('player-volume-slider');
            if (slider) slider.value = video.volume;
        }
    });
}

window.initPlayerControls = initPlayerControls;
window.setupPlayerKeyboardShortcuts = setupPlayerKeyboardShortcuts;

window.addEventListener('DOMContentLoaded', () => {
    setupPlayerKeyboardShortcuts();
});
