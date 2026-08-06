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
    let bg = 'rgba(0,0,0,0.85)';
    if (styleType === 'transparent') bg = 'transparent';
    else if (styleType === 'semi-trans') bg = 'rgba(0,0,0,0.45)';

    styleTag.textContent = `
        video::cue, ::cue {
            font-size: ${fontSize || '1.1rem'} !important;
            background: ${bg} !important;
            color: #ffffff !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.9);
            font-family: 'Outfit', sans-serif !important;
            margin-bottom: 14% !important;
        }
    `;
}

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
            <div id="player-overlay-status" class="px-2 py-0.5 rounded text-[10px] font-mono bg-black/50 border border-white/10 uppercase" style="color: var(--anime-accent-color, #f59e0b);">
                BLACKLEG PLAYER
            </div>
        </div>

        <!-- Center Bar: 10s Rewind, Center Play/Pause, 10s Fast-Forward -->
        <div class="flex items-center justify-center gap-6 md:gap-8 my-auto pointer-events-auto">
            <button id="btn-rewind-10" title="Rewind 10s (Left Arrow / J)" class="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-md">
                <span class="text-xs font-extrabold tracking-tighter">⏮ 10s</span>
            </button>
            <button id="btn-center-play" title="Play/Pause (Space / K)" class="w-16 h-16 rounded-full text-[#08080c] flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-xl" style="background: var(--anime-accent-color, #f59e0b); box-shadow: 0 0 25px rgba(var(--anime-accent-rgb, 245, 158, 11), 0.6);">
                <svg id="icon-center-play" class="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg id="icon-center-pause" class="w-8 h-8 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button id="btn-forward-10" title="Forward 10s (Right Arrow / L)" class="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-md">
                <span class="text-xs font-extrabold tracking-tighter">10s ⏭</span>
            </button>
        </div>

        <!-- Bottom Controls & Progress Bar Wrapper -->
        <div class="flex flex-col gap-2 pointer-events-auto bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 relative">
            
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
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <button id="btn-bottom-play" title="Play/Pause" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
                        <svg id="icon-bottom-play" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg id="icon-bottom-pause" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <span id="player-time-display" class="text-xs font-mono text-white/90">0:00 / 0:00</span>
                </div>

                <div class="flex items-center gap-3 md:gap-4 relative">
                    <!-- Subtitles/Captions Button & Popover -->
                    <div class="relative">
                        <button id="btn-captions-toggle" title="Subtitles / Captions (C)" class="px-2 py-1 text-xs font-bold font-mono text-white/80 hover:text-white bg-white/5 hover:bg-white/15 rounded border border-white/10 transition-all">
                            CC
                        </button>
                        <div id="player-captions-popover" class="absolute right-0 bottom-10 w-56 p-3 rounded-xl bg-slate-950/90 border border-white/15 backdrop-blur-xl shadow-2xl hidden z-50 flex flex-col gap-3 text-xs text-white">
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
                                        <option value="0.8rem">Small</option>
                                        <option value="1.1rem" selected>Medium</option>
                                        <option value="1.4rem">Large</option>
                                        <option value="1.8rem">X-Large</option>
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
                        <button id="btn-speed-toggle" title="Playback Speed (< / >)" class="px-2 py-1 text-xs font-bold font-mono text-white/80 hover:text-white bg-white/5 hover:bg-white/15 rounded border border-white/10 transition-all">
                            1.0x
                        </button>
                        <div id="player-speed-popover" class="absolute right-0 bottom-10 w-32 p-2 rounded-xl bg-slate-950/90 border border-white/15 backdrop-blur-xl shadow-2xl hidden z-50 flex flex-col gap-1 text-xs text-white">
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
                    <div class="flex items-center gap-2">
                        <button id="btn-mute-toggle" title="Mute/Unmute (M)" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors">
                            <svg id="icon-vol-high" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            <svg id="icon-vol-mute" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        </button>
                        <input id="player-volume-slider" type="range" min="0" max="1" step="0.05" value="1" class="w-14 md:w-20 accent-[var(--anime-accent-color,#f59e0b)] h-1 cursor-pointer">
                    </div>

                    <!-- Fullscreen Toggle -->
                    <button id="btn-fullscreen-toggle" title="Toggle Fullscreen (F)" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
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
        const timeDisplay = document.getElementById('player-time-display');
        if (timeDisplay) {
            timeDisplay.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
        if (video.duration && progressFill) {
            const pct = (video.currentTime / video.duration) * 100;
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

    function seekRelative(seconds) {
        if (!video.duration) return;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (video.requestFullscreen) {
                video.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
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
        progressContainer.onmousedown = (e) => {
            isSeeking = true;
            seekFromEvent(e);
        };
        window.addEventListener('mousemove', (e) => {
            if (isSeeking) seekFromEvent(e);
        });
        window.addEventListener('mouseup', () => {
            isSeeking = false;
        });

        progressContainer.onmousemove = (e) => {
            if (!video.duration || !progressTooltip) return;
            const rect = progressContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            progressTooltip.innerText = formatTime(pos * video.duration);
            progressTooltip.style.left = `${pos * 100}%`;
            progressTooltip.classList.remove('opacity-0');
        };
        progressContainer.onmouseleave = () => {
            if (progressTooltip) progressTooltip.classList.add('opacity-0');
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

    video.onplay = updatePlayPauseIcons;
    video.onpause = updatePlayPauseIcons;
    video.ontimeupdate = updateTimeDisplay;
    video.onloadedmetadata = updateTimeDisplay;

    function showOverlayTemporarily() {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        if (window.overlayHideTimeout) clearTimeout(window.overlayHideTimeout);
        window.overlayHideTimeout = setTimeout(() => {
            if (!video.paused) {
                overlay.classList.remove('opacity-100', 'pointer-events-auto');
                overlay.classList.add('opacity-0', 'pointer-events-none');
            }
        }, 3000);
    }

    container.onmousemove = showOverlayTemporarily;
    container.onmouseenter = showOverlayTemporarily;
    container.onmouseleave = () => {
        if (!video.paused) {
            overlay.classList.remove('opacity-100', 'pointer-events-auto');
            overlay.classList.add('opacity-0', 'pointer-events-none');
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
