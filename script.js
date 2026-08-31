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
                applyTheme(next);
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
                setMotion(next);
            });
        }
    }

    // ========================
    // HIDDEN BROWSER GAME - points the user to their browser's built-in
    // easter-egg game (offline address-bar link) plus an online alternative
    // where one exists. Browsers block scripts from navigating to their own
    // internal chrome://, edge://, opera://, vivaldi:// pages, so the offline
    // link is handed back as text to paste in rather than auto-opened.
    // ========================
    const BROWSER_GAMES = {
        chrome: { label: 'Chrome', name: 'Rex Runner', offline: 'chrome://dino', online: 'https://elgoog.im/dinosaur-game/' },
        edge: { label: 'Edge', name: 'Edge Surf', offline: 'edge://surf', online: null },
        opera: { label: 'Opera GX', name: 'Operius', offline: 'opera://operius', online: 'https://gx.games/games/8z54je/operius/' },
        vivaldi: { label: 'Vivaldi', name: 'Vivaldia', offline: 'vivaldi://game', online: 'https://vivaldi.com/games/vivaldia2/' }
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

    function appendChatMessage(text, sender = 'bot') {
        const box = document.getElementById('chatMessages');
        if (!box) return;
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        div.textContent = text;
        box.appendChild(div);
        removeQuickReplies();
        box.scrollTop = box.scrollHeight;
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
        if (send) send.disabled = visible;
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
            chatHistory.push({ role: 'assistant', content: text });
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

    // Exact substring first; for longer words, tolerate 1-2 character typos.
    function fuzzyTextIncludes(haystack, needle) {
        if (haystack.includes(needle)) return true;
        if (needle.length < 4) return false;
        const maxDist = needle.length > 7 ? 2 : 1;
        return haystack.split(/\W+/).some(w => w.length > 3 && levenshtein(w, needle) <= maxDist);
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
        'reach', 'skill', 'start'
    ];

    let SPELLING_WORDS = SPELLING_WORDS_BASE.slice();

    function learnVocabularyFromPage() {
        const seen = new Set(SPELLING_WORDS);
        document.querySelectorAll('.p-title, .p-stack span, .spot-tags span').forEach(el => {
            el.textContent.split(/\W+/).forEach(raw => {
                const word = raw.toLowerCase();
                if (word.length > 3 && !seen.has(word)) { seen.add(word); SPELLING_WORDS.push(word); }
            });
        });
    }

    function correctSpelling(text) {
        return text.split(/(\s+)/).map(part => {
            if (/^\s+$/.test(part) || part.length < 4) return part;
            const punctuation = part.match(/[^\w]*$/)[0];
            const word = part.slice(0, part.length - punctuation.length);
            if (!word || SPELLING_WORDS.includes(word)) return part;
            let closest = word;
            let bestDistance = Infinity;
            SPELLING_WORDS.forEach(candidate => {
                if (Math.abs(candidate.length - word.length) > 2) return;
                const distance = levenshtein(word, candidate);
                const limit = candidate.length >= 6 ? 2 : 1;
                if (distance <= limit && distance < bestDistance) {
                    closest = candidate;
                    bestDistance = distance;
                }
            });
            return closest + punctuation;
        }).join('');
    }

    function splitCompoundIntents(text) {
        const rawParts = text.split(/\s*(?:,\s*and\s+|\s+and\s+|\s*&\s*)\s*/i).map(p => p.trim()).filter(Boolean);
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

    const SECTION_SUMMARIES = {
        about: "I'm Amika Alankara, an AI & Data Science student at IIT Colombo.\nThis site covers my projects, skills, and experience.",
        featured: 'The newest builds:\n• Sri Lanka Fuel Price Intelligence Pipeline (AWS data pipeline)\n• MARGA Research Hub\n\nBoth are in the Featured section.',
        projects: 'GitHub: github.com/Amika1118\nEverything from ML pipelines to CLI tools is there.\n\nFull project list and links are below.',
        skills: 'Core skills:\n• Python, Java, JavaScript, SQL\n• Applied ML\n• Full-stack (React/Node)\n• Data engineering & AWS\n\nSee the Skills section for the full breakdown.',
        education: 'BSc (Hons) AI & Data Science at IIT Colombo, affiliated with Robert Gordon University, UK.\nCheck the Education section for modules and grades.',
        contact: "A few ways to reach out:\n• Use the contact form below\n• Email amika.20240191@iit.ac.lk\n• Just tell me you want to get in touch and I'll fill the form for you"
    };

    const cannedReplies = [
        { pattern: /\b(who are you|what is this site|about you|introduce yourself|your name|you)\b/i, reply: SECTION_SUMMARIES.about, section: 'about' },
        { pattern: /^(hello|hi|hey)\b/i, reply: "Hi, I'm Amika's assistant. Ask me about her projects, skills, or background - or I can fill the contact form for you.", section: null },
        { pattern: /\b(how are you|how're you|how you doing)\b/i, reply: 'Running smoothly, no stack overflow - thanks for asking! How can I help?', section: null },
        { pattern: /\b(where are you from|where do you live|where is amika from|where is amika based)\b/i, reply: "I'm a local assistant living rent-free in this browser tab. Amika is based in Colombo, Sri Lanka - feel free to ask about her work there.", section: null },
        { pattern: /\b(bye|goodbye|good night|goodnight|see you|later)\b/i, reply: 'Logging off gracefully - no force quit required. Come back anytime!', section: null },
        {
            pattern: /\b(what can you do|what are your capabilities|show menu|show options|help me|^help$)\b/i,
            reply: "I'm more than a search box - I can act directly, not just describe things.\n\nPick a category below, or just ask me anything in plain English.",
            section: null,
            quick: ['Sections', 'Actions', 'Fun stuff']
        },
        {
            pattern: /^sections$/i,
            reply: 'Ask me about any of these and I\'ll summarize it and scroll you there:\n• About\n• Projects\n• Skills\n• Education\n• Contact\n\nYou can also name a project directly, e.g. "tell me about MealMatch".',
            section: null,
            quick: ['Projects', 'Skills', 'Education', 'Contact']
        },
        {
            pattern: /^actions$/i,
            reply: "Things I can actually do, not just talk about:\n• Open GitHub, LinkedIn, or any social link\n• Open a project's code - \"open MealMatch\"\n• Filter projects by category - \"show ML projects\"\n• Fill out the contact form for you\n• Copy the email address\n• Request the CV\n• Switch light/dark mode\n• Pause or resume animations\n• Launch your browser's hidden game - \"I'm bored\"\n• Scroll back to top\n• \"Surprise me\" with a random project\n• \"Restart\" to clear this chat",
            section: null,
            quick: ['Surprise me', 'Get in touch']
        },
        {
            pattern: /^fun stuff$/i,
            reply: "I've got a few easter eggs hiding in here 👀\nTry asking if I'm sentient, for a joke, or poking at pop culture (matrix, angels & devils...).\nSome need finding rather than asking - keep an eye on your keyboard.",
            section: null
        },
        { pattern: /\b(newest|latest|recent)\b/i, reply: SECTION_SUMMARIES.featured, section: 'featured' },
        { pattern: /\b(projects|portfolio|where is your code|code)\b/i, reply: SECTION_SUMMARIES.projects, section: 'projects' },
        { pattern: /\b(skills|technologies|tech stack|what are your skills|what do you do)\b/i, reply: SECTION_SUMMARIES.skills, section: 'skills' },
        { pattern: /\b(education|degree|university|school)\b/i, reply: SECTION_SUMMARIES.education, section: 'education' },
        {
            pattern: /\b(available for internship|open to internship|are you available|open for work|open to work|currently available)\b/i,
            reply: 'Yes - actively looking for internships, and open to research or freelance collaborations too.\nWant to get in touch?',
            section: null,
            quick: ['Get in touch']
        },
        { pattern: /\b(internship|job|opportunity)\b/i, reply: "Amika's open to internships and job opportunities.\nUse the contact form and pick the right purpose, or just tell me and I'll fill it in for you.", section: 'contact' },
        { pattern: /\b(how can i contact you|how do i contact you|^email$)\b/i, reply: SECTION_SUMMARIES.contact, section: 'contact' },
        { pattern: /\b(gpa|grades|grade point|academic record|marks)\b/i, reply: 'No cumulative GPA published here, but recent module grades:\n• Database Systems - A\n• Web Technology - A\n• Programming Fundamentals - B\n• Computational Mathematics - B', section: 'education' },
        { pattern: /\b(how accurate|model accuracy|accuracy of|churn.*(accuracy|score|performance))\b/i, reply: 'The churn prediction model:\n• Random Forest, 5-fold cross-validation\n• ~82.5% accuracy on 7,000+ records\n• Class imbalance handled with balanced class weights', section: 'about' },
        { pattern: /\b(strongest skill|best skill|main skill|what are you best at|strongest at)\b/i, reply: 'Python and machine learning are the strongest - 85% and 80% on the skill bars.\nBacked by the churn prediction and fuel-price pipeline projects.', section: 'skills' },
        { pattern: /\b(recommend|suggest|which project|best project|good project)\b/i, reply: 'For ML or data engineering: Sri Lanka Fuel Price Intelligence Pipeline.\nFor research or collaboration: MARGA Research Hub.', section: 'featured', quick: ['Surprise me', 'Projects'] },
        { pattern: /\b(what should i learn|how do i start|where should i start|career advice)\b/i, reply: 'Start with Python and SQL, then build one small end-to-end project.\nAmika’s portfolio shows that progression through ML, web apps, and data pipelines.', section: 'skills' },
        { pattern: /\b(tech stack|built with|what language|programming language)\b/i, reply: 'Main toolkit:\n• Python, Java, JavaScript, SQL\n• React / Node\n• Machine learning & data engineering\n• AWS', section: 'skills' },
        // Easter eggs
        { pattern: /\b(tell me a joke|make me laugh|know any jokes)\b/i, reply: 'Why do programmers prefer dark mode? Because light attracts bugs. 🐛', section: null },
        { pattern: /\bsudo\b.*\bsandwich\b/i, reply: 'Permission denied. Nice try though - that one never works outside xkcd. 😏', section: null },
        { pattern: /\b(konami|up up down down|secret code)\b/i, reply: 'Cheat code accepted. You found the hidden developer entrance.', section: null },
        { pattern: /\b(matrix|red pill|blue pill)\b/i, reply: 'There is no spoon. There is only JavaScript, CSS, and one very determined portfolio.', section: null },
        { pattern: /\b(angel|lucifer|devil|heaven|hell)\b/i, reply: 'The angels guard light mode, Lucifer keeps watch over dark mode, and I keep the portfolio running in between.', section: null },
        { pattern: /\b(are you sentient|are you skynet|are you self.?aware|are you gpt|are you an ai|are you chatgpt)\b/i, reply: "I'm a simple rule-based assistant - no neural networks, no world domination plans. Just if/else statements pretending to be clever.", section: null },
        { pattern: /\b(meaning of life|meaning of existence)\b/i, reply: '42, obviously. Though Amika would probably say it\'s shipping something that actually works.', section: null },
        { pattern: /\b(do you dream|do you sleep)\b/i, reply: 'Only of well-documented code and O(n log n) solutions.', section: null }
    ];

    function resolveSingleQuery(rawText, done) {
        const lower = rawText.trim().toLowerCase();
        const normalized = normalizeSlang(lower);
        const corrected = correctSpelling(normalized);

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
            done(`Filtered to ${FILTER_LABELS[filterIntent]} projects below.`, document.getElementById('projects'));
            return;
        }

        if (detectSurpriseIntent(corrected)) {
            const cards = Array.from(document.querySelectorAll('.p-card'));
            if (cards.length) {
                const card = cards[Math.floor(Math.random() * cards.length)];
                const title = (card.querySelector('.p-title') || {}).textContent || '';
                const summary = (card.querySelector('.p-sum') || {}).textContent || '';
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

        const statLabel = detectStatsIntent(corrected);
        if (statLabel) {
            const value = getStatValue(statLabel);
            if (value) {
                const phrasing = {
                    Projects: `${value} projects and counting - see them all below.`,
                    Languages: `${value} programming languages in the toolkit.`,
                    Graduating: `Graduating in ${value}.`
                };
                done(phrasing[statLabel], statLabel === 'Projects' ? document.getElementById('projects') : null);
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

        for (const item of cannedReplies) {
            if (item.pattern.test(lower) || item.pattern.test(normalized) || item.pattern.test(corrected)) {
                done(item.reply, item.section ? document.getElementById(item.section) : null, item.quick);
                return;
            }
        }

        const sectionMap = [
            { id: 'about', keys: ['about', 'background', 'bio'] },
            { id: 'projects', keys: ['project', 'projects', 'work', 'archive'] },
            { id: 'skills', keys: ['skill', 'skills', 'technologies', 'stack'] },
            { id: 'education', keys: ['education', 'degree', 'university', 'college'] },
            { id: 'contact', keys: ['contact', 'reach', 'linkedin', 'upwork'] }
        ];
        for (const s of sectionMap) {
            if (s.keys.some(k => fuzzyTextIncludes(corrected, k))) {
                done(SECTION_SUMMARIES[s.id], document.getElementById(s.id));
                return;
            }
        }

        const cards = Array.from(document.querySelectorAll('.p-card'));
        for (const card of cards) {
            const title = (card.querySelector('.p-title') || {}).textContent || '';
            const titleWords = title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
            if (fuzzyTextIncludes(corrected, title.toLowerCase()) || titleWords.some(w => fuzzyTextIncludes(corrected, w))) {
                const link = card.querySelector('.p-link');
                if (link && detectOpenCodeVerb(corrected)) {
                    window.open(link.href, '_blank', 'noopener');
                    done(`Opening the code for "${title.trim()}" in a new tab.`, card);
                    return;
                }
                const sumEl = card.querySelector('.p-sum');
                const snippet = title.trim() + (sumEl ? '\n' + sumEl.textContent.trim() : '') + (link ? '\nSay "open" to jump to the code.' : '');
                done(snippet, card);
                return;
            }
        }

        done("I couldn't find exactly what you asked for.\nTry rephrasing, or say \"help\" to see everything I can do.", null, ['Help', 'Projects', 'Skills', 'Contact']);
    }

    // Shows a bot reply for a single resolved query (typing delay, scroll, quick replies).
    function showResolvedReply(text, onDone) {
        setChatTyping(true);
        setTimeout(() => {
            resolveSingleQuery(text, (replyText, scrollTarget, quickOptions) => {
                setChatTyping(false);
                appendChatMessage(replyText, 'bot');
                chatHistory.push({ role: 'assistant', content: replyText });
                if (scrollTarget) scrollToElement(scrollTarget);
                if (quickOptions) appendQuickReplies(quickOptions);
                if (onDone) onDone();
            });
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
            showResolvedReply(parts[index], () => playPart(index + 1));
        }
        playPart(0);
    }

    // Centralized handler for any user-provided chat text (typed or quick-reply)
    function handleChatUserText(text) {
        if (!text) return;
        if (Date.now() < silentUntil) return; // mid "silent treatment" - ignore

        if (RESTART_RE.test(text.trim())) {
            resetChat();
            return;
        }

        const lower = text.toLowerCase();
        appendChatMessage(text, 'user');
        chatHistory.push({ role: 'user', content: text });

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
    const ALREADY_ACTIVE_LINES = {
        theme: {
            dark: [
                "Already dark in here. Lucifer never left 😈",
                "Still dark mode - did you forget, or are you just testing me?",
                "We're already there. Your eyes adjusted yet?"
            ],
            light: [
                "Already living in the light 😇 the angels haven't moved.",
                "Still light mode. Nothing to switch, chief.",
                "We're already there. Might want sunglasses."
            ]
        },
        motion: {
            paused: [
                "Already paused. Can't freeze something that's already standing still.",
                "Nothing's moving in here - it's been paused this whole time.",
                "Already stopped. That request just froze twice."
            ],
            running: [
                "Already running. They never stopped - déjà vu much?",
                "Still moving, same as before you asked.",
                "Animations are already live. No restart needed."
            ]
        }
    };

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
                botReply(pickLine(ALREADY_ACTIVE_LINES.theme.light), { delay: 450 });
                return;
            }
            applyTheme('light');
            botReply('Switched to light mode. The angels are pleased 😇', { delay: 450 });
            return;
        }
        if (/\b(dark mode|make it dark|switch to dark|dark theme|dark)\b/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-theme') || 'dark') === 'dark') {
                botReply(pickLine(ALREADY_ACTIVE_LINES.theme.dark), { delay: 450 });
                return;
            }
            applyTheme('dark');
            botReply('Switched to dark mode. Lucifer approves 😈', { delay: 450 });
            return;
        }
        if (/\b(pause|stop|freeze)\b.*\b(animation|motion)/i.test(lower) || /\b(animation|motion)\b.*\b(pause|stop|off)/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-motion') || 'running') === 'paused') {
                botReply(pickLine(ALREADY_ACTIVE_LINES.motion.paused), { delay: 450 });
                return;
            }
            setMotion('paused');
            botReply("Animations paused - everything's holding still now.", { delay: 450 });
            return;
        }
        if (/\b(resume|play|start|unpause)\b.*\b(animation|motion)/i.test(lower) || /\b(animation|motion)\b.*\b(resume|on)/i.test(lower)) {
            if ((document.documentElement.getAttribute('data-motion') || 'running') === 'running') {
                botReply(pickLine(ALREADY_ACTIVE_LINES.motion.running), { delay: 450 });
                return;
            }
            setMotion('running');
            botReply('Animations resumed - things are moving again.', { delay: 450 });
            return;
        }

        // Bot control: point to the browser's built-in hidden game. Detects
        // which of Chrome/Edge/Opera GX/Vivaldi is running and replies with
        // the offline address-bar link plus the online alternative (opened
        // directly, same as any other outbound link this bot opens). The
        // offline link can't be auto-navigated to (browsers block script-
        // initiated loads of their own internal chrome://, edge://, etc.
        // pages - by design, to stop malicious sites doing the same thing),
        // so it's copied to the clipboard instead, same pattern as the
        // "copy email" action above.
        if (detectHiddenGameIntent(lower)) {
            const browserKey = detectCurrentBrowser();
            const game = browserKey ? BROWSER_GAMES[browserKey] : null;
            if (game && navigator.clipboard) {
                navigator.clipboard.writeText(game.offline).then(() => showToast(`${game.offline} copied ✓`)).catch(() => { });
            }
            if (game && game.online) {
                window.open(game.online, '_blank', 'noopener');
                botReply(`You're on ${game.label}, so ${game.name} is built right in.\nOffline: "${game.offline}" is copied to your clipboard - just paste it into the address bar (no internet needed).\nAlso opened the online version in a new tab.`, { delay: 450 });
                return;
            }
            if (game) {
                botReply(`You're on ${game.label}, so ${game.name} is built right in.\n"${game.offline}" is copied to your clipboard - paste it into the address bar to play. It's ${game.label}-exclusive, no online version exists.`, { delay: 450 });
                return;
            }
            const fallback = BROWSER_GAMES.chrome;
            window.open(fallback.online, '_blank', 'noopener');
            botReply("Couldn't tell which browser you're on (Chrome, Edge, Opera GX, and Vivaldi all have one built in) - opened the classic dino runner in a new tab instead.", { delay: 450 });
            return;
        }

        sendChatMessage(text);
    }

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

        botReply("Hi! I'm Amika's assistant.\nAsk about projects, skills, or background - I can open links, filter projects, fill the contact form, or surprise you with a random pick.\nSay \"help\" for the full menu.", { delay: 600 });
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
        initTheme();
        initMotion();
        initFilter();
        initCopyEmail();
        initForm();
        learnVocabularyFromPage();
        initChatWidget();
        initContactChooser();
        initEasterEggs();
        initReveal();
        initBars();
        startTypewriter();
        startCounters();
        runPreloader();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();