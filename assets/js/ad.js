// -------------------------------------------------------------------------
// CENTRALIZED ADVERTISING & IN-STREAM AD ENGINE
// -------------------------------------------------------------------------

// 1. INJECT BANNER AD SCRIPT
window.initBannerAdScript = function() {
    if (document.getElementById('banner-ad-script')) return;
    
    const script = document.createElement('script');
    script.id = 'banner-ad-script';
    script.async = true;
    script.src = 'https://js.wpadmngr.com/static/adManager.js';
    script.setAttribute('data-admpid', '452315');
    document.head.appendChild(script);
    
    console.log('[Ad Engine] Banner ad script initialized.');
};

// 2. INJECT IN-STREAM AD SCRIPT
window.initInStreamAdScript = function() {
    if (document.getElementById('instream-ad-script')) return;
    
    const script = document.createElement('script');
    script.id = 'instream-ad-script';
    script.async = true;
    script.src = 'https://js.wpadmngr.com/static/adManager.js';
    script.setAttribute('data-admpid', '444877');
    document.head.appendChild(script);
    
    console.log('[Ad Engine] In-stream ad script initialized.');
};

// 3. INJECT IN-PAGE AD SCRIPT
window.initInPageAdScript = function() {
    if (document.getElementById('inpage-ad-script')) return;
    
    const script = document.createElement('script');
    script.id = 'inpage-ad-script';
    script.async = true;
    script.src = 'https://js.wpadmngr.com/static/adManager.js';
    script.setAttribute('data-admpid', '452319');
    document.head.appendChild(script);
    
    console.log('[Ad Engine] In-page ad script initialized.');
};

// 4. RENDER BANNER CONTAINER DIV
window.getBannerAdHTML = function() {
    return `<div data-banner-id="1498736"></div>`;
};

// 5. MASTER ROUTE REFRESH ENGINE (CALL ON SPA NAVIGATION)
window.refreshAllAdSlots = function() {
    try {
        window.initBannerAdScript();
        window.initInStreamAdScript();
        window.initInPageAdScript();
        
        if (window.adManager && typeof window.adManager.refresh === 'function') {
            window.adManager.refresh();
        }
    } catch (e) {
        console.warn('[Ad Engine] Ad refresh failed silently:', e);
    }
};
