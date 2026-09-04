// ============================================================
// FULL script.js - with dynamic project loading, featured,
// advanced chatbot, voice input, BM25 search.
// ============================================================
(function () {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ========================
    // YEAR
    // ========================
    const yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();

    // ========================
    // SCROLL HELPER
    // ========================
    function scrollToElement(target) {
        if (!target) return;
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            scrollToElement(target);
        });
    });

    // ========================
    // TOAST
    // ========================
    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ========================
    // THEME TOGGLE
    // ========================
    const SUN_PATH = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    const MOON_PATH = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.innerHTML = theme === 'dark' ? MOON_PATH : SUN_PATH;
        try { localStorage.setItem('aa_theme', theme); } catch (e) { /* storage unavailable */ }
    }

    // Drives a state swap (theme, motion, ...) through the View Transitions
    // API so the change reveals as a circle expanding out from whatever
    // button triggered it, instead of the whole page just snapping (or
    // crossfading in place). Every element's own little color/border
    // transitions are switched off for the duration (see .vt-swapping in
    // style.css) so the "after" snapshot the browser captures is the
    // fully-settled new state, not a half-finished local fade - otherwise
    // the reveal would show a page that's still visibly catching up to
    // itself. Shared by the theme toggle and the motion toggle so both get
    // the exact same circular-reveal treatment.
    let activeViewTransition = null;

function runCircularReveal(applyChange, originEl) {
    if (prefersReduced || typeof document.startViewTransition !== 'function') {
        applyChange();
        return;
    }

    const rect = originEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Use document dimensions, not viewport
    const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);

    const radius = Math.hypot(
        Math.max(x, docWidth - x),
        Math.max(y, docHeight - y)
    );

    const root = document.documentElement;
    root.style.setProperty('--theme-x', x + 'px');
    root.style.setProperty('--theme-y', y + 'px');
    root.style.setProperty('--theme-radius', radius + 'px');

    if (activeViewTransition) activeViewTransition.skipTransition();

    root.classList.add('vt-swapping');
    const transition = document.startViewTransition(applyChange);
    activeViewTransition = transition;
    transition.finished.catch(() => {}).finally(() => {
        root.classList.remove('vt-swapping');
        if (activeViewTransition === transition) activeViewTransition = null;
    });
}

    function swapTheme(next, originEl) {
        runCircularReveal(() => applyTheme(next), originEl);
    }

    function initTheme() {
        let theme = 'dark';
        try {
            const saved = localStorage.getItem('aa_theme');
            if (saved) theme = saved;
            else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
        } catch (e) { /* ignore */ }
        applyTheme(theme);

        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                swapTheme(next, toggle);
                showToast(next === 'dark' ? 'Welcome to the dark side 😈 Lucifer approves.' : 'Back to the light 😇 The angels are pleased.');
            });
        }
    }

    // ========================
    // MOTION TOGGLE - pause/resume ambient animations
    // ========================
    function setMotion(state) {
        document.documentElement.setAttribute('data-motion', state);
        const icon = document.getElementById('motionIcon');
        const btn = document.getElementById('motionToggle');
        if (icon) icon.className = state === 'paused' ? 'fas fa-play' : 'fas fa-pause';
        if (btn) {
            btn.setAttribute('aria-pressed', String(state === 'paused'));
            btn.setAttribute('aria-label', state === 'paused' ? 'Resume animations' : 'Pause animations');
        }
        try { localStorage.setItem('aa_motion', state); } catch (e) { /* ignore */ }
    }

    // Same circular-reveal treatment as the theme toggle (see
    // runCircularReveal above) - pausing/resuming animations gets the same
    // "wipe" the page does when switching between dark and light.
    function swapMotion(next, originEl) {
        runCircularReveal(() => setMotion(next), originEl);
    }

    // Comedic "system readout" shown whenever animations start/stop, whether
    // that's from the nav toggle or a chat command. Reuses the SAME toast
    // popup the theme toggle uses (showToast) so pause/resume feedback looks
    // and behaves exactly like the dark/light mode switch - just with its
    // own rotating set of lines. The toast's colors already come from
    // --text/--bg, which flip with the theme, so this stays mode-aware for
    // free without any extra color logic.
    const MOTION_POPUP_LINES = {
        paused: [
            '⏸️ system.halt() - animations paused. CPU says thanks.',
            '🧊 motion.freeze() - orbs frozen mid-orbit.',
            '💤 process.sleep() - everything decorative just clocked out.'
        ],
        running: [
            '▶️ system.resume() - orbs back on the clock.',
            '⚡ motion.restart() - re-animating, try not to blink.',
            '🔁 loop.restore() - ambient motion restored.'
        ]
    };

    function showMotionPopup(state) {
        showToast(pickLine(MOTION_POPUP_LINES[state] || MOTION_POPUP_LINES.running));
    }

    function initMotion() {
        let state = prefersReduced ? 'paused' : 'running';
        try {
            const saved = localStorage.getItem('aa_motion');
            if (saved) state = saved;
        } catch (e) { /* ignore */ }
        setMotion(state);

        const btn = document.getElementById('motionToggle');
        if (btn) {
            btn.addEventListener('click', () => {
                const next = document.documentElement.getAttribute('data-motion') === 'paused' ? 'running' : 'paused';
                swapMotion(next, btn);
                showMotionPopup(next);
            });
        }
    }

    // ========================
    // HIDDEN BROWSER GAME - points the user straight to the online version
    // of their browser's built-in easter-egg game. Older builds of this also
    // copied the offline chrome://dino-style address-bar link to the
    // clipboard, but that added a confusing extra step (and a permissions
    // prompt on some browsers) for something that just needs one tab to
    // open. Now it only ever opens a link directly - no clipboard writes.
    // ========================
    const BROWSER_GAMES = {
        chrome: { label: 'Chrome', name: 'Rex Runner', online: 'https://elgoog.im/dinosaur-game/' },
        edge: { label: 'Edge', name: 'Edge Surf', online: null },
        opera: { label: 'Opera GX', name: 'Operius', online: 'https://gx.games/games/8z54je/operius/' },
        vivaldi: { label: 'Vivaldi', name: 'Vivaldia', online: 'https://vivaldi.com/games/vivaldia2/' }
    };


    // Order matters: Vivaldi, Edge, and Opera all carry "Chrome" in their UA
    // string for site-compatibility reasons, so the more specific tokens
    // (Vivaldi/, Edg/, OPR/) have to be checked before the generic fallback.
    function detectCurrentBrowser() {
        const ua = navigator.userAgent || '';
        if (/Vivaldi/i.test(ua)) return 'vivaldi';
        if (/Edg\//i.test(ua)) return 'edge';
        if (/OPR\//i.test(ua) || /\bOpera\b/i.test(ua)) return 'opera';
        if (/Chrome/i.test(ua)) return 'chrome';
        return null;
    }

    function detectHiddenGameIntent(t) {
        return /\b(play a game|hidden game|secret game|browser game|easter egg( game)?|i'?m bored|entertain me|got any games|know any games|dino game|game time)\b/.test(t);
    }

    // ========================
    // NAV - scroll state, progress bar, back-to-top, active link
    // ========================
    const nav = document.getElementById('nav');
    const prog = document.getElementById('scrollProg');
    const toTop = document.getElementById('toTop');

    function onScroll() {
        const y = window.scrollY || document.documentElement.scrollTop;
        if (nav) nav.classList.toggle('scrolled', y > 40);
        if (toTop) toTop.classList.toggle('show', y > 500);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (prog) prog.style.width = (max > 0 ? (y / max * 100) : 0) + '%';
    }
    // Trackpads and inertial scrolling can fire the scroll event dozens of
    // times per frame - running onScroll() straight off every one of them
    // reads/writes layout far more often than the screen can actually
    // repaint, which is what makes a scroll-linked progress bar or nav
    // state feel like it's stuttering rather than tracking smoothly.
    // Coalescing to one call per animation frame fixes that without
    // changing any of the logic above.
    let scrollScheduled = false;
    function onScrollThrottled() {
        if (scrollScheduled) return;
        scrollScheduled = true;
        requestAnimationFrame(() => {
            scrollScheduled = false;
            onScroll();
        });
    }
    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener('click', () => scrollToElement(document.getElementById('home')));
    }

    const navLinks = document.querySelectorAll('.nl');
    const sections = document.querySelectorAll('section[id]');
    if (navLinks.length && sections.length) {
        const sectObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('data-section') === entry.target.id);
                    });
                }
            });
        }, { threshold: 0.3 });
        sections.forEach(s => sectObs.observe(s));
    }

    // ========================
    // MOBILE DRAWER
    // ========================
    const burger = document.getElementById('burger');
    const drawer = document.getElementById('drawer');
    const drawerClose = document.getElementById('drawerClose');
    const backdrop = document.getElementById('backdrop');

    function openDrawer() {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('show');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('show');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
    if (burger && drawer) {
        burger.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
        drawerClose.addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);
        document.querySelectorAll('.dl').forEach(a => a.addEventListener('click', closeDrawer));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });
    }

    // ========================
    // TYPEWRITER (hero role)
    // ========================
    function startTypewriter() {
        const phrases = ['ML models.', 'data pipelines.', 'web applications.'];
        const el = document.getElementById('typeText');
        if (!el) return;
        if (prefersReduced) { el.textContent = phrases[0]; return; }
        let pi = 0, ci = 0, deleting = false;

        function tick() {
            const phrase = phrases[pi];
            if (deleting) {
                ci--;
                el.textContent = phrase.slice(0, ci);
                if (ci <= 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 350); return; }
                setTimeout(tick, 32);
            } else {
                ci++;
                el.textContent = phrase.slice(0, ci);
                if (ci >= phrase.length) { deleting = true; setTimeout(tick, 1900); return; }
                setTimeout(tick, 68);
            }
        }
        tick();
    }

    // ========================
    // STAT COUNTERS
    // ========================
    function startCounters() {
        const counters = document.querySelectorAll('.stat-num[data-count]');
        if (!counters.length) return;
        const cIo = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target, end = +el.dataset.count, dur = 1300, t0 = performance.now();
                if (prefersReduced) { el.textContent = end; cIo.unobserve(el); return; }
                function step(now) {
                    const p = Math.min((now - t0) / dur, 1);
                    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * end);
                    if (p < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
                cIo.unobserve(el);
            });
        }, { threshold: 0.6 });
        counters.forEach(el => cIo.observe(el));
    }

    // ========================
    // SCROLL REVEAL
    // ========================
    function initReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        if (prefersReduced) { items.forEach(el => el.classList.add('in')); return; }
        const rIo = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); rIo.unobserve(entry.target); } });
        }, { threshold: 0.12 });
        items.forEach(el => rIo.observe(el));
    }

    // ========================
    // SKILL BARS + EDU PROGRESS
    // ========================
    function initBars() {
        const bars = document.querySelectorAll('.skb-fill[data-w], .edu-prog-fill[data-w]');
        if (!bars.length) return;
        const bIo = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.width = entry.target.dataset.w + '%'; bIo.unobserve(entry.target); } });
        }, { threshold: 0.4 });
        bars.forEach(el => bIo.observe(el));
    }

    // ========================
    // PROJECT FILTER
    // ========================
    function initFilter() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const cards = document.querySelectorAll('.p-card');
        if (!filterBtns.length) return;
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                const filter = btn.dataset.filter;
                cards.forEach(card => card.classList.toggle('hide', filter !== 'all' && card.dataset.cat !== filter));
            });
        });
    }

    // ========================
    // COPY EMAIL
    // ========================
    function initCopyEmail() {
        const row = document.getElementById('emailRow');
        if (!row) return;
        row.addEventListener('click', (e) => {
            if (!navigator.clipboard) return; // no Clipboard API - let the mailto: default action run
            e.preventDefault();
            navigator.clipboard.writeText('amika.20240191@iit.ac.lk')
                .then(() => showToast('Email copied ✓'))
                .catch(() => {
                    // Clipboard write failed (permissions, insecure context, etc.) - fall back to opening the mail client
                    showToast("Couldn't copy - opening your email client instead");
                    window.location.href = 'mailto:amika.20240191@iit.ac.lk';
                });
        });
    }

    // ========================
    // CONTACT FORM
    // ========================
    function initForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;
        const submitBtn = form.querySelector('.form-submit');
        const submitText = form.querySelector('.form-submit-text');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('fName');
            const email = document.getElementById('fEmail');
            const message = document.getElementById('fMsg');
            let valid = true;
            [name, email, message].forEach(field => {
                field.classList.remove('error');
                if (!field.value.trim()) { field.classList.add('error'); valid = false; }
            });
            if (email.value.trim() && !email.validity.valid) {
                email.classList.add('error');
                valid = false;
            }
            if (!valid) {
                showToast(email.classList.contains('error') && email.value.trim() ? 'Please enter a valid email address.' : 'Please fill in the highlighted fields.');
                return;
            }

            submitBtn.disabled = true;
            if (submitText) submitText.textContent = 'Opening…';

            const subjectSelect = document.getElementById('fPurpose');
            const subjectVal = (subjectSelect && subjectSelect.value) ? subjectSelect.value : 'Portfolio Contact';
            const mailto = `mailto:amika.20240191@iit.ac.lk?subject=${encodeURIComponent(subjectVal + ' - Portfolio Contact from ' + name.value)}&body=${encodeURIComponent(message.value + '\n\nFrom: ' + email.value)}`;

            setTimeout(() => {
                window.location.href = mailto;
                submitBtn.disabled = false;
                if (submitText) submitText.textContent = 'Send Message';
                showToast('Opening your email client ✓');
            }, 500);
        });
    }

    // ========================
    // PRELOADER + WELCOME POPUP
    // ========================
    function showWelcomePopup() {
        let already = false;
        try { already = !!sessionStorage.getItem('aa_welcomed'); } catch (e) { /* ignore */ }
        if (already) return;

        const overlay = document.getElementById('welcomeOverlay');
        const cta = document.getElementById('welcomeCta');
        const dismiss = document.getElementById('welcomeDismiss');
        if (!overlay) return;

        setTimeout(() => {
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
        }, 500);

        function close() {
            try { sessionStorage.setItem('aa_welcomed', '1'); } catch (e) { /* ignore */ }
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
        }
        cta.addEventListener('click', close);
        dismiss.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function onEsc(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
        });
    }

    // Guaranteed minimum so the preloader always reads as intentional
    // rather than a flash on a fast connection. Real page load (fonts,
    // images, the Font Awesome CDN) can take longer than this on a slow
    // one, so the preloader waits for whichever of the two - the minimum
    // timer or the actual window 'load' event - finishes last. Never
    // shorter than PRELOADER_MIN_MS, but never stuck showing a finished
    // page underneath it either.
    const PRELOADER_MIN_MS = 3000;
    const PRELOADER_STATUS_LINES = ['Booting up', 'Loading assets', 'Compiling components', 'Almost there'];

    function runPreloader() {
        const preloader = document.getElementById('preloader');
        const bar = document.getElementById('preloaderBar');
        const pct = document.getElementById('preloaderPct');
        const status = document.getElementById('preloaderStatus');
        if (!preloader) { showWelcomePopup(); return; }

        const start = performance.now();

        let statusIndex = 0;
        if (status) status.textContent = PRELOADER_STATUS_LINES[0];
        const statusTimer = setInterval(() => {
            statusIndex = (statusIndex + 1) % PRELOADER_STATUS_LINES.length;
            if (status) status.textContent = PRELOADER_STATUS_LINES[statusIndex];
        }, PRELOADER_MIN_MS / PRELOADER_STATUS_LINES.length);

        // Bar fill + percentage tick against real elapsed time (not a fixed
        // CSS transition), eased out so it starts quick and settles gently
        // rather than hitting 100% on a mechanical linear ramp.
        let rafId;
        function tick(now) {
            const progress = Math.min(1, (now - start) / PRELOADER_MIN_MS);
            const eased = 1 - Math.pow(1 - progress, 3);
            if (bar) bar.style.width = (eased * 100).toFixed(1) + '%';
            if (pct) pct.textContent = Math.round(eased * 100) + '%';
            if (progress < 1) rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        const minWait = new Promise(resolve => setTimeout(resolve, PRELOADER_MIN_MS));
        const pageLoaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

        Promise.all([minWait, pageLoaded]).then(() => {
            clearInterval(statusTimer);
            cancelAnimationFrame(rafId);
            if (bar) bar.style.width = '100%';
            if (pct) pct.textContent = '100%';
            if (status) status.textContent = 'Ready';
            preloader.classList.add('hidden');
            showWelcomePopup();
        });
    }

    // ========================
    // CHAT WIDGET - local rule-based assistant
    // Answers from page content, scrolls to referenced sections/projects,
    // can auto-fill the contact form, and can act directly (open links,
    // filter the project grid, request the CV) rather than just describe.
    // ========================
    let chatHistory = [];
    let contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
    let pendingGuess = null; // { correctedText } - set while waiting on "did you mean X?"
    let chatBusy = false; // true while a reply is being "typed" - blocks sending, not typing
    let queuedMessage = null; // holds one message typed while chatBusy, sent right after
    let lastMentionedProject = null;   // context memory for pronoun resolution
    let lastMentionedSection = null;
    let lastFilter = 'all';            // remember last filter applied
    let userContext = {};              // extended user modelling

    // ---------- Persistent chat history ----------
    const CHAT_STORAGE_KEY = 'aa_chat_history';
    function saveChatHistory() {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-50)));
        } catch (e) { /* ignore */ }
    }
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE_KEY);
            if (saved) chatHistory = JSON.parse(saved);
        } catch (e) { chatHistory = []; }
    }

    // Enhanced cleaning: remove leading/trailing whitespace on each line,
    // collapse multiple spaces to one (but keep line breaks), and replace tabs.
    function cleanBotText(text) {
        return text
            .replace(/\t/g, '    ')                      // tabs -> 4 spaces
            .split('\n')
            .map(line => line.trim().replace(/ {2,}/g, ' ')) // trim each line, collapse internal multiple spaces
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')                  // max two consecutive newlines
            .trim();
    }

    function appendChatMessage(text, sender = 'bot') {
        const box = document.getElementById('chatMessages');
        if (!box) return;
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        div.textContent = sender === 'bot' ? cleanBotText(text) : text;
        box.appendChild(div);
        removeQuickReplies();
        box.scrollTop = box.scrollHeight;
        chatHistory.push({ role: sender, content: text });
        saveChatHistory();
    }

    function removeQuickReplies() {
        const existing = document.getElementById('chatQuick');
        if (existing) existing.remove();
    }

    function appendQuickReplies(options = []) {
        const box = document.getElementById('chatMessages');
        if (!box || !options.length) return;
        removeQuickReplies();
        const container = document.createElement('div');
        container.id = 'chatQuick';
        container.className = 'chat-quick';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chat-quick-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleChatUserText(opt));
            container.appendChild(btn);
        });
        box.appendChild(container);
        box.scrollTop = box.scrollHeight;
    }

    function setChatTyping(visible) {
        const typing = document.getElementById('chatTyping');
        const send = document.querySelector('.chat-send');
        if (typing) {
            typing.classList.toggle('visible', visible);
            typing.setAttribute('aria-hidden', String(!visible));
        }
        // Only the send button locks - the textarea itself stays enabled and
        // focused. Disabling it would blur the field and drop the on-screen
        // keyboard on every single reply, which feels broken while texting.
        // Also stays locked while chatbot-rules.json is still loading, so a
        // fast typist can't submit before the rules are ready.
        if (send) send.disabled = visible || chatRulesLoading;
        chatBusy = visible;
        if (visible) {
            const box = document.getElementById('chatMessages');
            if (box) box.scrollTop = box.scrollHeight;
        }
    }

    function naturalDelay(text = '') {
        const base = 550 + Math.random() * 450;
        const thinking = Math.min(1100, text.length * 9);
        const jitter = Math.random() * 300;
        return Math.round(base + thinking + jitter);
    }

    function botReply(text, { scrollTarget = null, quick = null, delay = null, after = null } = {}) {
        setChatTyping(true);
        setTimeout(() => {
            setChatTyping(false);
            appendChatMessage(text, 'bot');
            if (scrollTarget) scrollToElement(scrollTarget);
            if (quick) appendQuickReplies(quick);
            if (after) after();
            if (queuedMessage) {
                const next = queuedMessage;
                queuedMessage = null;
                handleChatUserText(next);
            }
        }, delay != null ? delay : naturalDelay(text));
    }

    function resetChat() {
        const box = document.getElementById('chatMessages');
        if (box) box.innerHTML = '';
        contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
        pendingGuess = null;
        chatHistory = [];
        lastMentionedProject = null;
        lastMentionedSection = null;
        lastFilter = 'all';
        userContext = {};
        localStorage.removeItem(CHAT_STORAGE_KEY);
        endSilentTreatment();
        botReply("Chat cleared. Hi again - I'm Amika's assistant. Ask about projects, skills, or background, or say \"help\" for the full menu.", { delay: 400 });
    }

    function finishContactFlow() {
        const fName = document.getElementById('fName');
        const fEmail = document.getElementById('fEmail');
        const fMessage = document.getElementById('fMsg');
        const fSubject = document.getElementById('fPurpose');
        if (fName) fName.value = contactFlow.name;
        if (fEmail) fEmail.value = contactFlow.email;
        if (fMessage) fMessage.value = contactFlow.message;
        if (fSubject && contactFlow.purpose) {
            const purposeValue = contactFlow.purpose.trim();
            const optionExists = Array.from(fSubject.options).some(opt => opt.value === purposeValue);
            if (optionExists) {
                fSubject.value = purposeValue;
            } else {
                const customOption = document.createElement('option');
                customOption.value = purposeValue;
                customOption.textContent = purposeValue;
                customOption.selected = true;
                fSubject.appendChild(customOption);
            }
        }
        botReply("Done! I've filled the contact form. Scroll down, review it, and hit Send whenever you're ready.", {
            after: () => {
                scrollToElement(document.getElementById('contact'));
                showToast('Contact form auto-filled ✓');
            }
        });
        contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
    }

    // ---------- text-matching helpers: light typo/slang tolerance ----------
    const SLANG_MAP = {
        u: 'you', ur: 'your', r: 'are', wat: 'what', wut: 'what', skillz: 'skills',
        projct: 'project', projet: 'project', proj: 'project', abt: 'about', yr: 'your',
        pls: 'please', plz: 'please', thx: 'thanks', msg: 'message', info: 'information',
        edu: 'education', wrk: 'work', gud: 'good', bout: 'about'
    };
    function normalizeSlang(str) {
        return str.split(/\s+/).map(word => {
            const clean = word.replace(/[^\w']/g, '');
            return SLANG_MAP[clean] || word;
        }).join(' ');
    }

    // Lightweight stemmer: strip common suffixes to improve fuzzy matching
    function stemWord(word) {
        if (word.length < 4) return word;
        const suffixes = ['ing', 'ed', 'es', 's', 'ly', 'ment', 'tion', 'er', 'or', 'able', 'ible', 'al', 'ive', 'ize'];
        for (const suff of suffixes) {
            if (word.endsWith(suff) && word.length - suff.length >= 4) {
                return word.slice(0, -suff.length);
            }
        }
        return word;
    }

    // Levenshtein distance: https://en.wikipedia.org/wiki/Levenshtein_distance
    function levenshtein(a, b) {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) d[i][0] = i;
        for (let j = 0; j <= n; j++) d[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                d[i][j] = Math.min(
                    d[i - 1][j] + 1,        // deletion
                    d[i][j - 1] + 1,        // insertion
                    d[i - 1][j - 1] + cost  // substitution
                );
                if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                    d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost); // adjacent transposition
                }
            }
        }
        return d[m][n];
    }

    // Soundex phonetic algorithm (for spelling correction)
    function soundex(word) {
        const w = word.toUpperCase().replace(/[^A-Z]/g, '');
        if (!w) return '';
        const first = w[0];
        const map = { B:1, F:1, P:1, V:1, C:2, G:2, J:2, K:2, Q:2, S:2, X:2, Z:2, D:3, T:3, L:4, M:5, N:5, R:6 };
        let code = first;
        let prev = map[first] || 0;
        for (let i = 1; i < w.length && code.length < 4; i++) {
            const digit = map[w[i]] || 0;
            if (digit && digit !== prev) {
                code += digit;
            }
            if (w[i] !== 'H' && w[i] !== 'W') prev = digit;
        }
        while (code.length < 4) code += '0';
        return code;
    }

    // Enhanced spelling correction: use Levenshtein first, then Soundex if no close match
    function correctSpellingWithSoundex(word) {
        let closest = word;
        let bestDistance = Infinity;
        for (const candidate of SPELLING_WORDS) {
            if (Math.abs(candidate.length - word.length) > 2) continue;
            const dist = levenshtein(word, candidate);
            const limit = candidate.length >= 6 ? 2 : 1;
            if (dist <= limit && dist < bestDistance) {
                closest = candidate;
                bestDistance = dist;
            }
        }
        if (closest !== word) return closest;

        // If no close Levenshtein match, try Soundex
        const wordSoundex = soundex(word);
        if (wordSoundex) {
            for (const candidate of SPELLING_WORDS) {
                if (soundex(candidate) === wordSoundex) {
                    return candidate;
                }
            }
        }
        return word;
    }

    const SPELLING_WORDS_BASE = [
        'about', 'accuracy', 'assistant', 'available', 'background', 'contact', 'collaboration',
        'code', 'discord', 'education', 'email', 'experience', 'featured', 'github', 'internship',
        'internships', 'linkedin', 'lucifer', 'machine', 'learning', 'message', 'opportunity',
        'opportunities', 'portfolio', 'project', 'projects', 'python', 'research', 'resume',
        'skills', 'social', 'software', 'technology', 'technologies', 'university', 'upwork',
        'whatsapp', 'work', 'instagram', 'twitter', 'reddit', 'javascript', 'java', 'react',
        'node', 'aws', 'database', 'pipeline', 'recommend', 'career', 'advice', 'freelance',
        'random', 'surprise', 'restart', 'cancel', 'grades', 'degree', 'colombo', 'informatics',
        'abort', 'accurate', 'angel', 'grade', 'information', 'meaning', 'mode', 'model',
        'reach', 'skill', 'start', 'docker', 'airflow', 'mlops', 'scikit', 'pandas', 'jupyter',
        'sqlite', 'oop', 'cli', 'pdf', 'eeg', 'bci', 'churn', 'telco', 'transport', 'marga',
        'bookify', 'meal', 'match', 'audio', 'trimmer', 'lecture', 'notes', 'processor',
        'world', 'bank', 'data', 'fetcher', 'sliding', 'puzzle', 'card', 'game', 'team',
        'formation', 'media', 'database', 'manager', 'fuel', 'price', 'intelligence',
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her',
        'was', 'one', 'our', 'out', 'has', 'have', 'their', 'what', 'when', 'where', 'which',
        'with', 'this', 'that', 'these', 'those', 'from', 'they', 'will', 'would', 'there',
        'their', 'about', 'into', 'just', 'more', 'most', 'some', 'such', 'than', 'too',
        'very', 'just', 'because', 'before', 'between', 'through', 'during', 'without'
    ];

    let SPELLING_WORDS = SPELLING_WORDS_BASE.slice();

    function learnVocabularyFromPage() {
        const seen = new Set(SPELLING_WORDS);
        document.querySelectorAll('.p-title, .p-stack span, .spot-tags span, .edu-mod-item, .learning-tags span, .skb-info span:first-child, .about-text p').forEach(el => {
            el.textContent.split(/\W+/).forEach(raw => {
                const word = raw.toLowerCase();
                if (word.length > 3 && !seen.has(word)) { seen.add(word); SPELLING_WORDS.push(word); }
            });
        });
    }

    // Replace correctSpelling with enhanced version using Soundex fallback
    function correctSpelling(text) {
        return text.split(/(\s+)/).map(part => {
            if (/^\s+$/.test(part) || part.length < 4) return part;
            const punctuation = part.match(/[^\w]*$/)[0];
            const word = part.slice(0, part.length - punctuation.length);
            if (!word || SPELLING_WORDS.includes(word)) return part;
            return correctSpellingWithSoundex(word) + punctuation;
        }).join('');
    }

    // Split compound intents on connectors, but also handle verb phrases better
    function splitCompoundIntents(text) {
        const connectors = /\s*(?:,\s*and\s+|\s+and\s+|\s*&\s*|\s*,\s*then\s+|\s+then\s+|\s+also\s+|\s+as well as\s+)\s*/i;
        const rawParts = text.split(connectors).map(p => p.trim()).filter(Boolean);
        if (rawParts.length < 2) return [text];
        const allMultiWord = rawParts.every(p => p.split(/\s+/).length >= 2);
        return allMultiWord ? rawParts : [text];
    }

    const RESTART_RE = /^(restart|reset|clear chat|clear the chat|start over)\b/i;
    const CANCEL_RE = /\b(cancel|nevermind|never mind|forget it|stop that|abort)\b/i;
    const INSULT_RE = /\b(fuck\w*|f\*+ck\w*|screw you|shut (the )?(f\w+ )?up|stfu|stupid|idiot|moron|dumbass|useless|worthless|pathetic|garbage bot|trash bot|suck\w*|hate you|damn you|piece of (shit|crap)|go to hell|asshole|jerk|loser)\b/i;
    let silentUntil = 0;
    let silentInterval = null;
    let silentInputPlaceholder = '';

    function startSilentTreatment() {
        const input = document.getElementById('chatInput');
        const send = document.querySelector('.chat-send');
        silentUntil = Date.now() + 5 * 60 * 1000;
        if (input) {
            silentInputPlaceholder = input.placeholder;
            input.disabled = true;
        }
        if (send) send.disabled = true;

        const tick = () => {
            if (!input) return;
            const msLeft = Math.max(0, silentUntil - Date.now());
            const m = Math.floor(msLeft / 60000);
            const s = Math.floor((msLeft % 60000) / 1000);
            input.placeholder = `😤 back in ${m}:${String(s).padStart(2, '0')}`;
        };
        tick();
        silentInterval = setInterval(tick, 1000);

        // The bot's own patience for the bit is much shorter than the
        // 5 minutes it just threatened.
        setTimeout(() => {
            endSilentTreatment();
            botReply("Okay, okay - just kidding! 😄 What can I do for you?");
        }, 4000 + Math.random() * 2000);
    }

    function endSilentTreatment() {
        silentUntil = 0;
        if (silentInterval) {
            clearInterval(silentInterval);
            silentInterval = null;
        }
        const input = document.getElementById('chatInput');
        const send = document.querySelector('.chat-send');
        if (input) {
            input.disabled = false;
            input.placeholder = silentInputPlaceholder || input.placeholder;
        }
        if (send) send.disabled = false;
    }

    const CHAT_LINKS = {
        github: { url: 'https://github.com/Amika1118', label: 'GitHub' },
        linkedin: { url: 'https://www.linkedin.com/in/amika-ranmeth/', label: 'LinkedIn' },
        upwork: { url: 'https://www.upwork.com/freelancers/~01e0bb28542b1cc5ad', label: 'Upwork' },
        discord: { url: 'https://discord.com/users/1120633957491421286', label: 'Discord' },
        twitter: { url: 'https://x.com/amika_alankara/', label: 'Twitter' },
        x: { url: 'https://x.com/amika_alankara/', label: 'X (Twitter)' },
        reddit: { url: 'https://www.reddit.com/user/amika_alankara_2004/', label: 'Reddit' },
        instagram: { url: 'https://www.instagram.com/amika.alankara/', label: 'Instagram' },
        email: { url: 'mailto:amika.20240191@iit.ac.lk', label: 'Email' },
        whatsapp: { url: 'https://wa.me/94701097800', label: 'WhatsApp' }
    };

    const CONTACT_OPTIONS = [
        { label: 'Email', prompt: 'email', link: CHAT_LINKS.email },
        { label: 'Contact form', prompt: 'contact form' },
        { label: 'LinkedIn', prompt: 'linkedin', link: CHAT_LINKS.linkedin },
        { label: 'GitHub', prompt: 'github', link: CHAT_LINKS.github },
        { label: 'Upwork', prompt: 'upwork', link: CHAT_LINKS.upwork },
        { label: 'WhatsApp', prompt: 'whatsapp', link: CHAT_LINKS.whatsapp },
        { label: 'X', prompt: 'x', link: CHAT_LINKS.x },
        { label: 'Discord', prompt: 'discord', link: CHAT_LINKS.discord },
        { label: 'Reddit', prompt: 'reddit', link: CHAT_LINKS.reddit },
        { label: 'Instagram', prompt: 'instagram', link: CHAT_LINKS.instagram }
    ];

    function showContactOptions() {
        botReply('Here are all the ways to reach Amika. Pick an option and I will open it, or choose Contact form to fill it in together.', {
            quick: CONTACT_OPTIONS.map(option => option.label)
        });
    }

    function openContactOption(option) {
        if (option.link) {
            window.open(option.link.url, '_blank', 'noopener');
            return true;
        }
        return false;
    }

    function detectContactOptionIntent(t) {
        return CONTACT_OPTIONS.find(option => new RegExp(`^${option.prompt}$`, 'i').test(t.trim())) || null;
    }

    function detectOpenLinkIntent(t) {
        if (!/\b(open|go to|visit|take me to|pull up)\b/.test(t)) return null;
        if (/\bgithub\b/.test(t)) return CHAT_LINKS.github;
        if (/\blinkedin\b/.test(t)) return CHAT_LINKS.linkedin;
        if (/\bupwork\b/.test(t)) return CHAT_LINKS.upwork;
        if (/\bdiscord\b/.test(t)) return CHAT_LINKS.discord;
        if (/\btwitter\b/.test(t)) return CHAT_LINKS.twitter;
        if (/\bx\b/.test(t)) return CHAT_LINKS.x;
        if (/\breddit\b/.test(t)) return CHAT_LINKS.reddit;
        if (/\binstagram\b/.test(t)) return CHAT_LINKS.instagram;
        if (/\bemail\b/.test(t)) return CHAT_LINKS.email;
        if (/\bwhatsapp\b/.test(t)) return CHAT_LINKS.whatsapp;
        return null;
    }

    const FILTER_LABELS = { ml: 'ML / Data', web: 'Web', software: 'Software', research: 'Research' };
    function detectFilterIntent(t) {
        if (!/\bproject/.test(t)) return null;
        if (/\b(ml|machine learning|data science|data)\b/.test(t)) return 'ml';
        if (/\bweb\b/.test(t)) return 'web';
        if (/\bsoftware\b/.test(t)) return 'software';
        if (/\bresearch\b/.test(t)) return 'research';
        return null;
    }

    function detectResumeIntent(t) {
        return /\b(resume|cv)\b/.test(t) && /\b(see|send|get|share|request|open|email|have|can i|could i)\b/.test(t);
    }

    function detectSurpriseIntent(t) {
        return /\b(surprise me|random project|show me something random|pick a random project|any random project)\b/.test(t);
    }

    function detectScrollTopIntent(t) {
        return /\b(back to top|scroll to top|go to top|top of the page|scroll (all the way )?up)\b/.test(t);
    }

    function detectCopyEmailIntent(t) {
        return /\bcopy\b.*\bemail\b/.test(t);
    }

    // Copies the current page URL - distinct from detectCopyEmailIntent above,
    // and checked after it in resolveSingleQuery so "copy email" still wins
    // if a message somehow matched both.
    function detectCopyLinkIntent(t) {
        return /\bcopy\b/.test(t) && /\b(link|url|page|site|portfolio)\b/.test(t) && !/\bemail\b/.test(t);
    }

    // "list all projects" / "show every project" etc. - an overview action,
    // distinct from asking about the Projects *section* (which the existing
    // "projects" canned reply already covers) or filtering by category.
    function detectListProjectsIntent(t) {
        return /\b(list|show me|show|give me)\b.*\b(all|every)\b.*\bprojects?\b/.test(t)
            || /\ball projects\b/.test(t)
            || /\bevery project\b/.test(t)
            || /\bfull project list\b/.test(t);
    }

    // "projects using python" / "which projects use react" / "projects built
    // with aws" - pulls the tech keyword out and matches it against each
    // project card's tag chips (.p-stack span) rather than the fixed ml/web/
    // software/research buckets detectFilterIntent works with.
    function detectTechSearchIntent(t) {
        const m = t.match(/\bprojects?\b[^.?!]*\b(?:using|with|built (?:with|using|in)|written in|made (?:with|in))\s+([a-z0-9+.#]+)/)
            || t.match(/\bwhich projects?\s+use\s+([a-z0-9+.#]+)/);
        return m ? m[1] : null;
    }

    // Reads live numbers straight off the hero stat counters so answers never
    // drift out of sync with what's actually shown on the page.
    function detectStatsIntent(t) {
        if (/\bhow many\b.*\blanguages?\b/.test(t) || /\blanguages?\b.*\bknow\b/.test(t)) return 'Languages';
        if (/\bhow many\b.*\bprojects?\b/.test(t)) return 'Projects';
        if (/\b(graduat(e|ing|ion)|when.*(finish|complete).*(degree|studies))\b/.test(t)) return 'Graduating';
        return null;
    }
    function getStatValue(label) {
        for (const stat of document.querySelectorAll('.stat')) {
            const lbl = stat.querySelector('.stat-lbl');
            const num = stat.querySelector('.stat-num[data-count]');
            if (lbl && num && lbl.textContent.trim().toLowerCase() === label.toLowerCase()) {
                return num.getAttribute('data-count');
            }
        }
        return null;
    }

    function detectStateQueryIntent(t) {
        if (/\b(what theme|which theme|current theme|is (it |the )?(dark|light) mode( on)?)\b/.test(t)) return 'theme';
        if (/\b(are animations|is motion|animations? (on|off|paused|running)|motion (on|off|paused|running))\b/.test(t)) return 'motion';
        return null;
    }

    // "Open"/"code for" + a project name should jump straight to that
    // project's link instead of just scrolling to the card.
    function detectOpenCodeVerb(t) {
        return /\b(open|show me the code|code for|view code|github for|link for|source for)\b/.test(t);
    }

    // ---------- rule data loading ----------
    // SECTION_SUMMARIES, cannedReplies, sectionMap, statsPhrasing, and
    // alreadyActiveLines all used to be hardcoded here. They now live in
    // chatbot-rules.json (fetched below) so they can be hand-edited without
    // touching this file. `chatRules` holds the parsed/rebuilt data once the
    // fetch resolves; every place that used to read the old constants now
    // reads from `chatRules` (or `rules`, a local alias) instead, falling
    // back to empty/safe defaults if the fetch hasn't finished yet or failed.
    let chatRules = null;
    let chatRulesFailed = false;
    let chatRulesLoading = true;

    const EMPTY_RULES = { SECTION_SUMMARIES: {}, cannedReplies: [], sectionMap: [], statsPhrasing: {}, alreadyActiveLines: {} };

    function loadChatRules() {
        return fetch('data/chatbot-rules.json')
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(data => {
                chatRules = {
                    SECTION_SUMMARIES: data.SECTION_SUMMARIES || {},
                    cannedReplies: (data.cannedReplies || []).map(item => ({
                        // JSON can't hold a regex literal, so each rule stores a plain
                        // `pattern` string plus a `flags` string (e.g. "i") and the
                        // RegExp is rebuilt here, once, at load time.
                        pattern: new RegExp(item.pattern, item.flags || ''),
                        reply: item.reply,
                        section: item.section || null,
                        quick: item.quick || null
                    })),
                    sectionMap: data.sectionMap || [],
                    statsPhrasing: data.statsPhrasing || {},
                    alreadyActiveLines: data.alreadyActiveLines || {}
                };
            })
            .catch(err => {
                console.error('Failed to load chatbot-rules.json', err);
                chatRulesFailed = true;
                // Fallback rules so the bot still works offline
                chatRules = {
                    SECTION_SUMMARIES: {
                        about: "I'm Amika Alankara, an AI & Data Science student at IIT Colombo.",
                        projects: "GitHub: github.com/Amika1118 - ML, web, and software projects.",
                        skills: "Python, JavaScript, Java, SQL, ML, full‑stack, data engineering.",
                        education: "BSc (Hons) AI & Data Science at IIT, affiliated with RGU, UK.",
                        contact: "Email amika.20240191@iit.ac.lk or use the form below."
                    },
                    cannedReplies: [
                        { pattern: /help/i, reply: "I can tell you about projects, skills, education, open links, filter projects, fill the contact form, and more. Ask away!" },
                        { pattern: /hello|hi|hey/i, reply: "Hi! I'm Amika's assistant. Ask about her work or say \"help\"." }
                    ],
                    sectionMap: [
                        { id: 'about', keys: ['about', 'background'] },
                        { id: 'projects', keys: ['project', 'projects', 'work'] },
                        { id: 'skills', keys: ['skill', 'skills', 'tech'] },
                        { id: 'education', keys: ['education', 'degree', 'university'] },
                        { id: 'contact', keys: ['contact', 'reach', 'email'] }
                    ],
                    statsPhrasing: {},
                    alreadyActiveLines: {}
                };
            });
    }

    // Picks one of a few phrasing variants for "you asked for a state that's
    // already active" replies. Falls back to a plain, non-randomized line if
    // chatbot-rules.json hasn't loaded (or failed to), so this never throws.
    function pickLine(lines) {
        return lines[Math.floor(Math.random() * lines.length)];
    }

    function pickAlreadyActiveLine(category, state) {
        const lines = chatRules && chatRules.alreadyActiveLines[category] && chatRules.alreadyActiveLines[category][state];
        if (lines && lines.length) return pickLine(lines);
        return category === 'theme' ? `Already in ${state} mode.` : `Animations are already ${state}.`;
    }

    // Generate dynamic section summaries from live DOM
    function generateSectionSummary(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return '';
        let text = '';
        if (sectionId === 'about') {
            const p = section.querySelector('.about-text p');
            if (p) text = p.textContent.trim().slice(0, 200) + '...';
        } else if (sectionId === 'projects') {
            const cards = section.querySelectorAll('.p-card');
            const titles = Array.from(cards).slice(0, 3).map(c => c.querySelector('.p-title').textContent.trim());
            text = `Some projects: ${titles.join(', ')}. Ask about any one by name.`;
        } else if (sectionId === 'skills') {
            const skills = section.querySelectorAll('.skb-info span:first-child');
            text = 'Core skills: ' + Array.from(skills).slice(0, 5).map(s => s.textContent.trim()).join(', ') + '...';
        } else if (sectionId === 'education') {
            const degree = section.querySelector('.edu-degree-big');
            if (degree) text = degree.textContent.trim() + ' at IIT, affiliated with RGU, UK.';
        } else if (sectionId === 'contact') {
            text = 'You can reach me via the contact form, email, or social links. Or just say "get in touch" and I\'ll fill the form for you.';
        }
        return text || `Here's the ${sectionId} section.`;
    }

    // ====================================================================
    // ADVANCED INTENT RECOGNITION (scoring-based)
    // ====================================================================
    // Instead of relying solely on regex, we now use a multi-signal scoring
    // system for section and project matching. The system combines:
    //   - Exact keyword match
    //   - Synonym match (custom map below)
    //   - Fuzzy match (Levenshtein)
    //   - Jaccard similarity on word sets for longer phrases
    //   - Dynamic keyword extraction from the page content itself
    // ====================================================================

    // Custom synonym map for common intent keywords.
    const SYNONYMS = {
        'project': ['proj', 'proyect', 'build', 'work', 'app', 'application'],
        'projects': ['projs', 'proyects', 'builds', 'works', 'apps', 'applications'],
        'skill': ['tech', 'technology', 'ability', 'competence', 'expertise'],
        'skills': ['techs', 'technologies', 'abilities', 'competences', 'expertises'],
        'about': ['bio', 'background', 'info', 'information'],
        'education': ['edu', 'study', 'studies', 'degree', 'university', 'college'],
        'contact': ['reach', 'get in touch', 'message', 'email', 'connect'],
        'open': ['show', 'display', 'view', 'go to', 'visit', 'take me to'],
        'code': ['source', 'github', 'repo', 'repository'],
        'resume': ['cv', 'curriculum vitae'],
        'list': ['show all', 'display all', 'enumerate', 'all'],
        'random': ['surprise', 'pick any', 'any project'],
        'pause': ['stop', 'freeze', 'halt'],
        'resume': ['play', 'start', 'continue', 'unpause'],
        'light': ['white', 'day'],
        'dark': ['black', 'night']
    };

    // Expand a token list with synonyms.
    function expandWithSynonyms(tokens) {
        const expanded = new Set(tokens);
        for (const token of tokens) {
            const syns = SYNONYMS[token];
            if (syns) {
                syns.forEach(s => expanded.add(s));
            }
        }
        return Array.from(expanded);
    }

    // Simple tokenizer: lowercase, remove punctuation, split on whitespace.
    function tokenize(text) {
        return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    }

    // Remove common stopwords to reduce noise.
    const STOPWORDS = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
        'which', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
        'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
        'did', 'doing', 'will', 'would', 'shall', 'should', 'may', 'might',
        'must', 'can', 'could', 'of', 'at', 'by', 'for', 'with', 'about',
        'against', 'between', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
        'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
        'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
        'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'don', 'now'
    ]);

    function removeStopwords(tokens) {
        return tokens.filter(t => !STOPWORDS.has(t));
    }

    // Jaccard similarity between two word arrays.
    function jaccardSimilarity(arr1, arr2) {
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);
        let intersection = 0;
        for (const item of set1) {
            if (set2.has(item)) intersection++;
        }
        const union = set1.size + set2.size - intersection;
        return union === 0 ? 0 : intersection / union;
    }

    // Cosine similarity on character n-grams (trigrams) for fuzzy phrase matching.
    function trigramSimilarity(str1, str2) {
        function getTrigrams(s) {
            const t = s.toLowerCase().replace(/\s+/g, ' ');
            const trigrams = new Set();
            for (let i = 0; i < t.length - 2; i++) {
                trigrams.add(t.slice(i, i + 3));
            }
            return trigrams;
        }
        const tri1 = getTrigrams(str1);
        const tri2 = getTrigrams(str2);
        let intersection = 0;
        for (const tg of tri1) {
            if (tri2.has(tg)) intersection++;
        }
        const denominator = Math.sqrt(tri1.size * tri2.size);
        return denominator === 0 ? 0 : intersection / denominator;
    }

    // Score a section based on its keywords (from sectionMap) and synonyms.
    function getSectionScore(sectionId, tokens, rules) {
        const sectionDef = rules.sectionMap.find(s => s.id === sectionId);
        if (!sectionDef) return 0;
        const keywords = sectionDef.keys; // array of keywords
        const expandedKeywords = expandWithSynonyms(keywords);
        let score = 0;
        for (const token of tokens) {
            if (expandedKeywords.includes(token)) {
                score += 2; // exact/synonym match
            } else {
                // Fuzzy match
                for (const keyword of expandedKeywords) {
                    const dist = levenshtein(token, keyword);
                    if (dist <= (token.length > 5 ? 2 : 1)) {
                        score += 1.5;
                        break;
                    }
                }
            }
        }
        // Bonus for phrase-level similarity (if section has a summary)
        const summary = generateSectionSummary(sectionId);
        if (summary) {
            const summaryTokens = removeStopwords(tokenize(summary));
            const phraseSim = trigramSimilarity(tokens.join(' '), summaryTokens.join(' '));
            score += phraseSim * 5;
        }
        return score;
    }

    // Score a project card based on its title, tags, and description.
    function getProjectScore(card, tokens, corrected) {
        const title = (card.querySelector('.p-title') || {}).textContent || '';
        const titleTokens = removeStopwords(tokenize(title));
        const titleSet = new Set(titleTokens);
        const stackEls = card.querySelectorAll('.p-stack span');
        const stackTokens = Array.from(stackEls).flatMap(el => removeStopwords(tokenize(el.textContent)));
        const descEl = card.querySelector('.p-sum');
        const descTokens = descEl ? removeStopwords(tokenize(descEl.textContent)) : [];

        let score = 0;
        // Title match
        for (const token of tokens) {
            if (titleSet.has(token)) score += 3;
            else {
                // Fuzzy match on title words
                for (const t of titleTokens) {
                    if (levenshtein(token, t) <= (token.length > 5 ? 2 : 1)) {
                        score += 1.5;
                        break;
                    }
                }
            }
        }
        // Tech stack match
        for (const token of tokens) {
            if (stackTokens.includes(token)) score += 2;
        }
        // Description match (Jaccard similarity on word sets)
        if (descTokens.length) {
            const descSim = jaccardSimilarity(tokens, descTokens);
            score += descSim * 4;
        }
        // Trigram similarity with full title
        score += trigramSimilarity(tokens.join(' '), title) * 6;

        return score;
    }

    // Enhanced query resolver with scoring
    function resolveSingleQuery(rawText, done) {
        const rules = chatRules || EMPTY_RULES;
        const lower = rawText.trim().toLowerCase();
        const normalized = normalizeSlang(lower);
        const corrected = correctSpelling(normalized);

        // --- Direct actions with side effects (must run synchronously) ---
        if (detectResumeIntent(corrected)) {
            window.location.href = 'mailto:amika.20240191@iit.ac.lk?subject=Request%20for%20CV';
            done('Opening an email to request the CV - send it and Amika will get back to you.', null);
            return;
        }

        const linkIntent = detectOpenLinkIntent(corrected);
        if (linkIntent) {
            window.open(linkIntent.url, '_blank', 'noopener');
            done(`Opening ${linkIntent.label} in a new tab.`, null);
            return;
        }

        const contactOption = detectContactOptionIntent(corrected);
        if (contactOption && openContactOption(contactOption)) {
            done(`Opening ${contactOption.link.label} in a new tab.`, null);
            return;
        }

        const filterIntent = detectFilterIntent(corrected);
        if (filterIntent) {
            const btn = document.querySelector(`.filter-btn[data-filter="${filterIntent}"]`);
            if (btn) btn.click();
            lastFilter = filterIntent;
            done(`Filtered to ${FILTER_LABELS[filterIntent]} projects below.`, document.getElementById('projects'));
            return;
        }

        if (detectSurpriseIntent(corrected)) {
            const cards = Array.from(document.querySelectorAll('.p-card'));
            if (cards.length) {
                const card = cards[Math.floor(Math.random() * cards.length)];
                const title = (card.querySelector('.p-title') || {}).textContent || '';
                const summary = (card.querySelector('.p-sum') || {}).textContent || '';
                lastMentionedProject = title.trim();
                done(`🎲 ${title}\n${summary}`, card);
                return;
            }
        }

        if (detectScrollTopIntent(corrected)) {
            scrollToElement(document.getElementById('home'));
            done('Back to the top ↑', null);
            return;
        }

        if (detectCopyEmailIntent(corrected)) {
            const email = 'amika.20240191@iit.ac.lk';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(() => showToast('Email copied ✓')).catch(() => { });
            }
            done(`${email} - copied to your clipboard.`, null);
            return;
        }

        if (detectCopyLinkIntent(corrected)) {
            const url = window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => showToast('Link copied ✓')).catch(() => { });
            }
            done('Portfolio link copied to your clipboard - share away.', null);
            return;
        }

        // --- Informational intents (no immediate side effect) ---
        if (detectListProjectsIntent(corrected)) {
            const cards = Array.from(document.querySelectorAll('.p-card'));
            if (cards.length) {
                const titles = cards.map(card => (card.querySelector('.p-title') || {}).textContent.trim()).filter(Boolean);
                done(`All ${titles.length} projects:\n${titles.map(t => '• ' + t).join('\n')}\n\nAsk about any one by name for details, or say "open" plus the name for its code.`, document.getElementById('projects'));
                return;
            }
        }

        const techQuery = detectTechSearchIntent(corrected);
        if (techQuery) {
            const cards = Array.from(document.querySelectorAll('.p-card'));
            const matches = cards.filter(card =>
                Array.from(card.querySelectorAll('.p-stack span')).some(tag => fuzzyTextIncludes(tag.textContent.toLowerCase(), techQuery))
            );
            if (matches.length) {
                const titles = matches.map(card => (card.querySelector('.p-title') || {}).textContent.trim());
                done(`Projects using ${techQuery}:\n${titles.map(t => '• ' + t).join('\n')}`, matches[0]);
                return;
            }
            done(`Couldn't find a project tagged with "${techQuery}" - say "list all projects" to see everything.`, null);
            return;
        }

        const statLabel = detectStatsIntent(corrected);
        if (statLabel) {
            const value = getStatValue(statLabel);
            const template = rules.statsPhrasing[statLabel];
            if (value && template) {
                done(template.replace('{value}', value), statLabel === 'Projects' ? document.getElementById('projects') : null);
                return;
            }
        }

        const stateQuery = detectStateQueryIntent(corrected);
        if (stateQuery === 'theme') {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            done(`You're in ${theme} mode right now.\nSay "light mode" or "dark mode" to switch.`, null);
            return;
        }
        if (stateQuery === 'motion') {
            const paused = document.documentElement.getAttribute('data-motion') === 'paused';
            done(`Animations are currently ${paused ? 'paused' : 'running'}.\nSay "pause animations" or "resume animations" to change that.`, null);
            return;
        }

        // Canned replies from JSON (first exact regex match)
        for (const item of rules.cannedReplies) {
            if (item.pattern.test(lower) || item.pattern.test(normalized) || item.pattern.test(corrected)) {
                done(item.reply, item.section ? document.getElementById(item.section) : null, item.quick);
                return;
            }
        }

        // ---- SCORING-BASED MATCHING ----
        const tokens = removeStopwords(tokenize(corrected));
        const expandedTokens = expandWithSynonyms(tokens);

        // First, try to find a section with high score
        let bestSection = null;
        let bestSectionScore = 0;
        for (const s of rules.sectionMap) {
            const score = getSectionScore(s.id, tokens, rules);
            if (score > bestSectionScore) {
                bestSectionScore = score;
                bestSection = s.id;
            }
        }
        // Threshold for section match
        if (bestSection && bestSectionScore >= 2.0) {
            const summary = generateSectionSummary(bestSection) || rules.SECTION_SUMMARIES[bestSection];
            lastMentionedSection = bestSection;
            done(summary, document.getElementById(bestSection));
            return;
        }

        // Next, try project matching with scoring
        const cards = Array.from(document.querySelectorAll('.p-card'));
        let bestProjectCard = null;
        let bestProjectScore = 0;
        for (const card of cards) {
            const score = getProjectScore(card, tokens, corrected);
            if (score > bestProjectScore) {
                bestProjectScore = score;
                bestProjectCard = card;
            }
        }
        // Threshold for project match
        if (bestProjectCard && bestProjectScore >= 3.0) {
            const title = (bestProjectCard.querySelector('.p-title') || {}).textContent.trim();
            const sumEl = bestProjectCard.querySelector('.p-sum');
            const link = bestProjectCard.querySelector('.p-link');
            const snippet = title + (sumEl ? '\n' + sumEl.textContent.trim() : '') + (link ? '\nSay "open" to jump to the code.' : '');
            if (link && detectOpenCodeVerb(corrected)) {
                window.open(link.href, '_blank', 'noopener');
                lastMentionedProject = title;
                done(`Opening the code for "${title}" in a new tab.`, bestProjectCard);
            } else {
                lastMentionedProject = title;
                done(snippet, bestProjectCard);
            }
            return;
        }

        // Pronoun resolution (if project was mentioned before)
        if (/\b(its|that project|the project|the one|it)\b/.test(corrected) && lastMentionedProject) {
            const card = cards.find(c => (c.querySelector('.p-title') || {}).textContent.trim() === lastMentionedProject);
            if (card) {
                const title = card.querySelector('.p-title').textContent.trim();
                const sumEl = card.querySelector('.p-sum');
                const link = card.querySelector('.p-link');
                const snippet = title + (sumEl ? '\n' + sumEl.textContent.trim() : '') + (link ? '\nSay "open" to jump to the code.' : '');
                if (link && detectOpenCodeVerb(corrected)) {
                    window.open(link.href, '_blank', 'noopener');
                    done(`Opening the code for "${title}" in a new tab.`, card);
                } else {
                    done(snippet, card);
                }
                return;
            }
        }

        // ---- BM25 fallback for general page content ----
        resolveWithBM25(corrected, done);
    }

    // Resolves a single query and runs any side effect it triggers (window.open,
    // a mailto navigation, clicking a filter button, ...) IMMEDIATELY, then hands
    // back just the display info (reply text, scroll target, quick replies) for
    // showing later. Kept separate from the on-screen delay below because a
    // window.open() call only counts as "user-initiated" - to browsers, and to
    // the extra popup blocking most ad blockers layer on top - when it happens
    // synchronously inside the click/submit/keydown handler that started it.
    // Queuing it behind a setTimeout (even a short "typing" one) breaks that
    // chain and is exactly what gets it silently blocked.
    function resolveQueryNow(text) {
        let result = null;
        resolveSingleQuery(text, (replyText, scrollTarget, quickOptions) => {
            result = { replyText, scrollTarget, quickOptions };
        });
        return result;
    }

    // Shows an already-resolved reply after a natural-feeling typing delay.
    function displayResolvedReply(text, resolved, onDone) {
        setChatTyping(true);
        setTimeout(() => {
            setChatTyping(false);
            appendChatMessage(resolved.replyText, 'bot');
            if (resolved.scrollTarget) scrollToElement(resolved.scrollTarget);
            if (resolved.quickOptions) appendQuickReplies(resolved.quickOptions);
            if (onDone) onDone();
        }, naturalDelay(text));
    }

    // Spelling guess was uncertain enough to need a correction - confirm with the
    // user before acting on it, rather than silently guessing and running with it.
    function askGuessConfirmation(correctedText) {
        pendingGuess = { correctedText };
        botReply(`Did you mean "${correctedText}"?`, {
            delay: 500 + Math.random() * 300,
            quick: ["Yes, that's right", "No, let me clarify"]
        });
    }

    function sendChatMessage(userText) {
        const lower = userText.trim().toLowerCase();
        const normalizedFull = normalizeSlang(lower);
        const correctedFull = correctSpelling(normalizedFull);

        // If we had to guess at a spelling fix anywhere in the message, confirm
        // it first instead of just running with the guess. If nothing needed
        // correcting, go straight to resolving and showing the result.
        if (correctedFull !== normalizedFull) {
            askGuessConfirmation(correctedFull);
            return;
        }

        const parts = splitCompoundIntents(normalizedFull);

        // Resolve every part - and fire any window.open/mailto/filter-click side
        // effect - right now, still inside the original user gesture's call
        // stack, even for a multi-part message like "open github and linkedin".
        // Only the typed-out display below is staggered per part.
        const resolvedParts = parts.map(resolveQueryNow);

        function playPart(index) {
            if (index >= parts.length) {
                setChatTyping(false);
                if (queuedMessage) {
                    const next = queuedMessage;
                    queuedMessage = null;
                    handleChatUserText(next);
                }
                return;
            }
            displayResolvedReply(parts[index], resolvedParts[index], () => playPart(index + 1));
        }
        playPart(0);
    }

    // Centralized handler for any user-provided chat text (typed or quick-reply)
    function handleChatUserText(text) {
        if (!text) return;
        if (chatRulesLoading) return; // defensive: input/quick-replies are disabled while rules load, but don't act on a stray call
        if (Date.now() < silentUntil) return; // mid "silent treatment" - ignore

        if (RESTART_RE.test(text.trim())) {
            resetChat();
            return;
        }

        const lower = text.toLowerCase();
        appendChatMessage(text, 'user');

        if (INSULT_RE.test(lower)) {
            pendingGuess = null;
            contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
            botReply("😤 Wow, rude. I'm not talking to you for the next 5 minutes.", { after: startSilentTreatment });
            return;
        }

        if (pendingGuess) {
            const guess = pendingGuess;
            pendingGuess = null;
            if (CANCEL_RE.test(lower) || /^(n|no|nope|nah|not quite|incorrect|wrong)\b/.test(lower)) {
                botReply("Got it - no worries. Could you tell me a bit more about what you're looking for?");
                return;
            }
            if (/^(y|yes|yeah|yep|yup|correct|right|thats right|that's right|sure|ya|exactly)\b/.test(lower)) {
                resolveFreeText(guess.correctedText);
                return;
            }
            // Not a clear yes/no - treat this message itself as the clarification
            // and try to resolve it fresh (it may trigger its own guess check).
            sendChatMessage(text);
            return;
        }

        if (contactFlow.stage && contactFlow.stage !== 'idle') {
            if (CANCEL_RE.test(lower)) {
                contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
                botReply('No worries - cancelled that. What else can I help with?');
                return;
            }
            if (contactFlow.stage === 'purpose') {
                contactFlow.purpose = text;
                contactFlow.stage = 'name';
                botReply(`Purpose set to "${text}". What's your name? (say "cancel" anytime to stop)`);
                return;
            }
            if (contactFlow.stage === 'name') {
                contactFlow.name = text;
                contactFlow.stage = 'email';
                botReply('Thanks - and the best email address to reach you at?');
                return;
            }
            if (contactFlow.stage === 'email') {
                contactFlow.email = text;
                contactFlow.stage = 'message';
                botReply("Got it - what's the message you'd like to send?");
                return;
            }
            if (contactFlow.stage === 'message') {
                contactFlow.message = text;
                finishContactFlow();
                return;
            }
        }

        resolveFreeText(text);
    }

    // "Already there" comebacks - shared by every state-aware bot control
    // below (theme + motion, and any future on/off style function). Each
    // key holds a few lines so repeat offenders don't get the exact same
    // roast twice in a row.
    function pickLine(lines) {
        return lines[Math.floor(Math.random() * lines.length)];
    }

    // Resolves any already-spelling-confirmed text into a direct bot control
    // (contact flow, theme switch, motion toggle) or, failing that, a normal
    // resolved reply. Shared by handleChatUserText (fresh messages) and the
    // "yes, that's right" branch above (accepted corrections) so accepting a
    // spelling suggestion behaves exactly like typing that text correctly in
    // the first place, instead of skipping straight to the narrower
    // resolveSingleQuery() and missing these intents entirely.
    function resolveFreeText(text) {
        // Covers "restart"/"clear chat" phrasing that only became exact after
        // a spelling correction was accepted - handleChatUserText only checks
        // this against the raw first message, so it needs checking again here.
        if (RESTART_RE.test(text.trim())) {
            resetChat();
            return;
        }
        const lower = text.toLowerCase();

        if (/\b(contact options|ways to contact|where can i reach|all contact|social links)\b/i.test(lower)) {
            showContactOptions();
            return;
        }

        if (/(contact|reach out|get in touch|hire|message me|send a message|contact me)/i.test(lower)) {
            contactFlow.stage = 'purpose';
            botReply('Sure - what is the purpose of the message? Please choose one:', {
                quick: ['Internship', 'Collaboration', 'Project Inquiry', 'Research', 'Other']
            });
            return;
        }

        // Bot controls: theme + animation state, actioned directly.
        // Each one checks the CURRENT state first - if the user asks for a
        // state that's already active, they get a sarcastic callout instead
        // of a redundant "switched" message. Same pattern for every toggle.
        if (/\b(light mode|make it light|switch to light|light theme|light)\b/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-theme') || 'dark') === 'light') {
                botReply(pickAlreadyActiveLine('theme', 'light'), { delay: 450 });
                return;
            }
            applyTheme('light');
            botReply('Switched to light mode. The angels are pleased 😇', { delay: 450 });
            return;
        }
        if (/\b(dark mode|make it dark|switch to dark|dark theme|dark)\b/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-theme') || 'dark') === 'dark') {
                botReply(pickAlreadyActiveLine('theme', 'dark'), { delay: 450 });
                return;
            }
            applyTheme('dark');
            botReply('Switched to dark mode. Lucifer approves 😈', { delay: 450 });
            return;
        }
        if (/\b(pause|stop|freeze)\b.*\b(animation|motion)/i.test(lower) || /\b(animation|motion)\b.*\b(pause|stop|off)/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-motion') || 'running') === 'paused') {
                botReply(pickAlreadyActiveLine('motion', 'paused'), { delay: 450 });
                return;
            }
            setMotion('paused');
            showMotionPopup('paused');
            botReply("Animations paused - everything's holding still now.", { delay: 450 });
            return;
        }
        if (/\b(resume|play|start|unpause)\b.*\b(animation|motion)/i.test(lower) || /\b(animation|motion)\b.*\b(resume|on)/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-motion') || 'running') === 'running') {
                botReply(pickAlreadyActiveLine('motion', 'running'), { delay: 450 });
                return;
            }
            setMotion('running');
            showMotionPopup('running');
            botReply('Animations resumed - things are moving again.', { delay: 450 });
            return;
        }

        // Bot control: open the browser's built-in hidden game directly - no
        // clipboard copying, no offline address-bar link, just a new tab.
        // Detects which of Chrome/Edge/Opera GX/Vivaldi is running so it can
        // open that browser's own online version where one exists; anything
        // else (no online version, or browser not detected) falls back to
        // the classic online dino runner, same as every other outbound link
        // this bot opens.
        if (detectHiddenGameIntent(lower)) {
            const browserKey = detectCurrentBrowser();
            const game = browserKey ? BROWSER_GAMES[browserKey] : null;
            if (game && game.online) {
                window.open(game.online, '_blank', 'noopener');
                botReply(`You're on ${game.label}, so here's ${game.name} - opened in a new tab.`, { delay: 450 });
                return;
            }
            const fallback = BROWSER_GAMES.chrome;
            window.open(fallback.online, '_blank', 'noopener');
            botReply(game
                ? `${game.label} doesn't have an online version of its hidden game - opened the classic dino runner in a new tab instead.`
                : "Couldn't tell which browser you're on - opened the classic dino runner in a new tab.", { delay: 450 });
            return;
        }

        sendChatMessage(text);
    }

    // ----- Advanced intent recognition with BM25 + scoring -----
    const pageIndex = []; // array of { id, type, text, tokens, element }

    function buildPageIndex() {
        pageIndex.length = 0; // clear existing
        // Index sections
        document.querySelectorAll('section[id]').forEach(section => {
            const text = section.innerText || '';
            const tokens = tokenize(text);
            pageIndex.push({
                id: section.id,
                type: 'section',
                text: text,
                tokens: tokens,
                element: section
            });
        });

        // Index project cards individually
        document.querySelectorAll('.p-card').forEach(card => {
            const title = card.querySelector('.p-title')?.textContent || '';
            const stack = Array.from(card.querySelectorAll('.p-stack span')).map(s => s.textContent).join(' ');
            const desc = card.querySelector('.p-sum')?.textContent || '';
            const text = `${title} ${stack} ${desc}`;
            const tokens = tokenize(text);
            pageIndex.push({
                id: title,
                type: 'project',
                text: text,
                tokens: tokens,
                element: card
            });
        });

        // Index skills
        const skillsSection = document.getElementById('skills');
        if (skillsSection) {
            const text = skillsSection.innerText || '';
            pageIndex.push({
                id: 'skills-detail',
                type: 'skills',
                text: text,
                tokens: tokenize(text),
                element: skillsSection
            });
        }
    }

    // BM25 ranking
    function bm25Score(queryTokens, docTokens, avgDocLength, totalDocs, docFreq) {
        const k1 = 1.5, b = 0.75;
        let score = 0;
        const docLength = docTokens.length;
        const docTermFreq = {};
        docTokens.forEach(t => docTermFreq[t] = (docTermFreq[t] || 0) + 1);

        for (const term of queryTokens) {
            const tf = docTermFreq[term] || 0;
            if (tf === 0) continue;
            const df = docFreq[term] || 1;
            const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
            const norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));
            score += idf * norm;
        }
        return score;
    }

    let docFreqMap = {};
    let totalDocs = 0;
    let avgDocLength = 0;

    function prepareBM25() {
        buildPageIndex();
        totalDocs = pageIndex.length;
        const allTokens = [];
        pageIndex.forEach(doc => {
            allTokens.push(...doc.tokens);
        });
        avgDocLength = allTokens.length / totalDocs;
        const df = {};
        pageIndex.forEach(doc => {
            const uniqueTerms = new Set(doc.tokens);
            uniqueTerms.forEach(term => df[term] = (df[term] || 0) + 1);
        });
        docFreqMap = df;
    }

    // Enhanced query resolution using BM25 for sections and projects
    function resolveWithBM25(queryText, done) {
        const tokens = removeStopwords(tokenize(queryText));
        if (pageIndex.length === 0) prepareBM25();

        let bestDoc = null;
        let bestScore = 0;
        pageIndex.forEach(doc => {
            const score = bm25Score(tokens, doc.tokens, avgDocLength, totalDocs, docFreqMap);
            if (score > bestScore) {
                bestScore = score;
                bestDoc = doc;
            }
        });

        if (bestDoc && bestScore > 1.5) {
            if (bestDoc.type === 'project') {
                const card = bestDoc.element;
                const title = bestDoc.id;
                const sumEl = card.querySelector('.p-sum');
                const link = card.querySelector('.p-link');
                const snippet = title + (sumEl ? '\n' + sumEl.textContent.trim() : '') + (link ? '\nSay "open" to jump to the code.' : '');
                if (link && detectOpenCodeVerb(queryText)) {
                    window.open(link.href, '_blank', 'noopener');
                    lastMentionedProject = title;
                    done(`Opening the code for "${title}" in a new tab.`, card);
                } else {
                    lastMentionedProject = title;
                    done(snippet, card);
                }
                return;
            } else if (bestDoc.type === 'section') {
                lastMentionedSection = bestDoc.id;
                const summary = generateSectionSummary(bestDoc.id) || bestDoc.text.slice(0, 200) + '...';
                done(summary, bestDoc.element);
                return;
            } else if (bestDoc.type === 'skills') {
                const summary = generateSectionSummary('skills') || 'Here are my skills.';
                done(summary, document.getElementById('skills'));
                return;
            }
        }

        // If no strong match but some candidates exist, offer them
        const candidates = pageIndex
            .filter(doc => doc.type === 'project' || doc.type === 'section')
            .map(doc => ({ doc, score: bm25Score(tokens, doc.tokens, avgDocLength, totalDocs, docFreqMap) }))
            .filter(item => item.score > 0.5)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.doc.id);

        if (candidates.length > 0) {
            done(`I'm not 100% sure what you mean. Did you want to know about:\n${candidates.map(c => '• ' + c).join('\n')}`, null, candidates);
            return;
        }

        done("I couldn't find exactly what you asked for.\nTry rephrasing, or say \"help\" to see everything I can do.", null, ['Help', 'Projects', 'Skills', 'Contact']);
    }

    // Simple sentiment analysis
    const POSITIVE_WORDS = new Set(['great', 'awesome', 'nice', 'cool', 'love', 'good', 'thanks', 'thank', 'helpful', 'fantastic', 'excellent']);
    const NEGATIVE_WORDS = new Set(['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'useless', 'poor', 'worst', 'not working']);

    function analyzeSentiment(text) {
        const tokens = tokenize(text);
        let pos = 0, neg = 0;
        tokens.forEach(t => {
            if (POSITIVE_WORDS.has(t)) pos++;
            else if (NEGATIVE_WORDS.has(t)) neg++;
        });
        if (pos > neg) return 'positive';
        if (neg > pos) return 'negative';
        return 'neutral';
    }

    // Web Speech API integration
    function initVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'chat-mic';
        micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        micBtn.setAttribute('aria-label', 'Use voice input');
        const chatForm = document.getElementById('chatForm');
        if (!chatForm) return;

        // Insert mic button before the send button if present, otherwise just append.
        const sendBtn = chatForm.querySelector('.chat-send');
        if (sendBtn) {
            chatForm.insertBefore(micBtn, sendBtn);
        } else {
            chatForm.appendChild(micBtn);
        }

        micBtn.addEventListener('click', () => {
            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('chatInput');
            input.value = transcript;
            // Submit the form
            chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
        };

        recognition.onerror = (event) => {
            console.log('Speech recognition error', event.error);
        };
    }

    // ========================
    // DYNAMIC PROJECT LOADING
    // ========================
    let PROJECTS_DATA = [];   // holds the loaded project objects

    async function loadProjects() {
        try {
            const response = await fetch('data/projects.json');
            if (!response.ok) throw new Error('Failed to load projects.json');
            PROJECTS_DATA = await response.json();

            // Featured: sort by rank ascending, then date descending
            const featuredProjects = [...PROJECTS_DATA]
                .sort((a, b) => {
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return new Date(b.date) - new Date(a.date);
                })
                .slice(0, 3); // top 3

            renderFeatured(featuredProjects);
            renderProjects(PROJECTS_DATA); // all projects in archive

            // Re‑initialize filter and BM25 index after projects are rendered
            initFilter();
            learnVocabularyFromPage();
            prepareBM25();
        } catch (err) {
            console.error('Could not load projects.json:', err);
        }
    }

    function renderFeatured(projects) {
        const grid = document.getElementById('spotlightGrid');
        if (!grid) return;
        grid.innerHTML = ''; // clear any loading placeholder

        projects.forEach((project, index) => {
            const article = document.createElement('article');
            article.className = `spotlight reveal${index === 0 ? ' feat' : ''}`;
            article.style.setProperty('--rd', (index * 0.06) + 's');

            // Badge
            let badge = '';
            if (index === 0) {
                badge = `<span class="spot-badge spot-badge-top">Top Pick</span>`;
            } else if (project.rank <= 3) {
                badge = `<span class="spot-badge spot-badge-new">New</span>`;
            }

            // Media placeholder
            const media = `
                <div class="spot-media">
                    <span class="spot-media-ph">screenshot / demo</span>
                    <span class="spot-index">0${index+1}</span>
                </div>
            `;

            // Body
            const body = `
                <div class="spot-body">
                    <h3>${project.title}</h3>
                    <p>${project.summary}</p>
                    <div class="spot-tags">
                        ${project.stack.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                    ${project.link ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="p-link spot-link">View project <i class="fas fa-arrow-right"></i></a>` : ''}
                </div>
            `;

            article.innerHTML = badge + media + body;
            grid.appendChild(article);
        });

        // Observe reveal animations for new cards
        const newCards = grid.querySelectorAll('.spotlight.reveal:not(.in)');
        if (newCards.length && !prefersReduced) {
            const rIo = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        rIo.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12 });
            newCards.forEach(el => rIo.observe(el));
        } else if (prefersReduced) {
            newCards.forEach(el => el.classList.add('in'));
        }
    }

    function renderProjects(projects) {
        const grid = document.getElementById('projGrid');
        if (!grid) return;
        grid.innerHTML = ''; // clear any loading placeholder

        projects.forEach((project, index) => {
            const card = document.createElement('article');
            card.className = 'p-card reveal';
            card.setAttribute('data-cat', project.category);
            card.style.setProperty('--rd', (index * 0.03) + 's');

            const badgeClass = project.category; // ml, web, software, research
            const badgeLabel = project.category === 'ml' ? 'ML / Data' :
                               project.category === 'web' ? 'Web' :
                               project.category === 'software' ? 'Software' :
                               'Research';

            let footHTML = '';
            if (project.link) {
                footHTML = `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="p-link"><i class="fab fa-github"></i> View Code</a>`;
            } else {
                footHTML = `<span class="p-norepo">${project.context === 'Research Initiative' ? 'Proposal - development paused during academics' : 'No public repo'}</span>`;
            }

            card.innerHTML = `
                <div class="p-head">
                    <span class="p-badge ${badgeClass}">${badgeLabel}</span>
                    <span class="p-ctx">${project.context}</span>
                </div>
                <h3 class="p-title">${project.title}</h3>
                <p class="p-sum">${project.summary}</p>
                <div class="p-stack">
                    ${project.stack.map(tag => `<span>${tag}</span>`).join('')}
                </div>
                <div class="p-foot">${footHTML}</div>
            `;

            grid.appendChild(card);
        });

        // Observe reveal animations for new cards
        const newCards = grid.querySelectorAll('.p-card.reveal:not(.in)');
        if (newCards.length && !prefersReduced) {
            const rIo = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        rIo.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12 });
            newCards.forEach(el => rIo.observe(el));
        } else if (prefersReduced) {
            newCards.forEach(el => el.classList.add('in'));
        }
    }

    // ========================
    // INIT CHAT WIDGET
    // ========================
    function initChatWidget() {
        const bubble = document.getElementById('chatBubble');
        const panel = document.getElementById('chatPanel');
        const closeBtn = document.getElementById('chatClose');
        const form = document.getElementById('chatForm');
        const input = document.getElementById('chatInput');
        if (!bubble || !panel || !form || !input) return;

        function openPanel() {
            panel.classList.add('open');
            panel.setAttribute('aria-hidden', 'false');
            bubble.setAttribute('aria-expanded', 'true');
            setTimeout(() => input.focus(), 250);
        }
        function closePanel() {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            bubble.setAttribute('aria-expanded', 'false');
        }

        bubble.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });

        // Auto-grow the textarea as the user types, up to the CSS max-height
        // (which then scrolls), so multi-line messages stay readable instead
        // of scrolling sideways inside a single-line box.
        function autoGrowInput() {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        }
        function resetInputHeight() {
            input.style.height = '';
        }
        input.addEventListener('input', autoGrowInput);

        // Enter sends the message; Shift+Enter inserts a real line break,
        // matching how texting apps handle multi-line input. isComposing /
        // keyCode 229 guards skip the Enter that confirms an IME suggestion
        // (Japanese/Chinese/Korean input, and some Android keyboards) so it
        // doesn't accidentally send half-typed text.
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            resetInputHeight();
            // If the bot is mid-reply, don't drop the message or block typing -
            // queue it and it fires the moment the current reply lands, same
            // as sending a follow-up text before the other person replies.
            if (chatBusy) {
                queuedMessage = text;
                return;
            }
            handleChatUserText(text);
        });

        // Restore chat history if any exists
        loadChatHistory();
        const box = document.getElementById('chatMessages');
        if (box && chatHistory.length) {
            chatHistory.forEach(msg => {
                const div = document.createElement('div');
                div.className = `chat-message ${msg.role}`;
                div.textContent = msg.role === 'bot' ? cleanBotText(msg.content) : msg.content;
                box.appendChild(div);
            });
            box.scrollTop = box.scrollHeight;
        }

        // The rule data (canned replies, section summaries, etc.) loads
        // async from chatbot-rules.json, so the textarea and send button
        // stay disabled until it resolves - this guards against the user
        // typing a query before there's anything to match it against. The
        // greeting below is hardcoded (not part of the rule data) so it can
        // still show immediately while the fetch is in flight.
        const originalPlaceholder = input.placeholder;
        input.disabled = true;
        input.placeholder = 'Loading assistant…';
        const send = form.querySelector('.chat-send');
        if (send) send.disabled = true;

        loadChatRules().finally(() => {
            chatRulesLoading = false;
            input.disabled = false;
            input.placeholder = originalPlaceholder;
            if (send) send.disabled = chatBusy;
            if (chatRulesFailed) {
                botReply("Heads up - I couldn't load my response data just now, so some answers may be limited. Refreshing the page usually fixes it. Direct actions like opening links, filtering projects, and the contact form still work fine.", { delay: 500 });
            } else if (!chatHistory.length) {
                botReply("Hi! I'm Amika's assistant.\nAsk about projects, skills, or background - I can open links, filter projects, fill the contact form, or surprise you with a random pick.\nSay \"help\" for the full menu.", { delay: 600 });
            }
        });

        // Initialize voice input
        initVoiceInput();
    }

    function initContactChooser() {
        document.querySelectorAll('a[href="#contact"]').forEach(link => {
            link.addEventListener('click', () => {
                const panel = document.getElementById('chatPanel');
                const bubble = document.getElementById('chatBubble');
                if (!panel || !bubble) return;
                panel.classList.add('open');
                panel.setAttribute('aria-hidden', 'false');
                bubble.setAttribute('aria-expanded', 'true');
                showContactOptions();
            });
        });
    }

    function initEasterEggs() {
        const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let progress = 0;
        document.addEventListener('keydown', event => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            progress = key === konami[progress] ? progress + 1 : (key === konami[0] ? 1 : 0);
            if (progress !== konami.length) return;
            progress = 0;
            showToast('Secret passage unlocked. The angels and Lucifer both noticed.');
            if (document.getElementById('chatMessages')) {
                botReply('Konami code detected. You have excellent taste in hidden features.', { delay: 500 });
            }
        });
    }

    // ========================
    // INIT
    // ========================
    function init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(error => {
                console.error('Service worker registration failed', error);
            });
        }

        initTheme();
        initMotion();
        initFilter();        // attach filter buttons (static)
        initCopyEmail();
        initForm();
        initChatWidget();
        initContactChooser();
        initEasterEggs();
        initReveal();        // observe static reveal elements
        initBars();          // animate skill bars and education progress
        startTypewriter();
        startCounters();
        runPreloader();

        // Load projects asynchronously, then re-learn vocab and prepare BM25
        loadProjects().then(() => {
            // (Filter, vocabulary, and BM25 are handled inside loadProjects)
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();