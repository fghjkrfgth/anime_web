// -------------------------------------------------------------------------
// ADVANCED PLAYER CONTROLS & KEYBOARD SHORTCUTS ENGINE
// -------------------------------------------------------------------------

window.overlayHideTimeout = window.overlayHideTimeout || null;

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
    overlay.className = 'absolute inset-0 z-20 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 pointer-events-none transition-opacity duration-300 select-none';

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

            <!-- Bottom Bar: Play/Pause, Time, Volume, Fullscreen -->
            <div class="flex items-center justify-between gap-4 pointer-events-auto bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                <div class="flex items-center gap-3">
                    <button id="btn-bottom-play" title="Play/Pause" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
                        <svg id="icon-bottom-play" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg id="icon-bottom-pause" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <span id="player-time-display" class="text-xs font-mono text-white/90">0:00 / 0:00</span>
                </div>

                <div class="flex items-center gap-4">
                    <!-- Volume Controls -->
                    <div class="flex items-center gap-2">
                        <button id="btn-mute-toggle" title="Mute/Unmute (M)" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors">
                            <svg id="icon-vol-high" class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            <svg id="icon-vol-mute" class="w-5 h-5 fill-current hidden" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        </button>
                        <input id="player-volume-slider" type="range" min="0" max="1" step="0.05" value="1" class="w-16 md:w-20 accent-[var(--anime-accent-color,#f59e0b)] h-1 cursor-pointer">
                    </div>

                    <!-- Fullscreen Toggle -->
                    <button id="btn-fullscreen-toggle" title="Toggle Fullscreen (F)" class="text-white hover:text-[var(--anime-accent-color,#f59e0b)] transition-colors focus:outline-none">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                    </button>
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
