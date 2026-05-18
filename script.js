(function() {
  'use strict';

  // ========================
  // REGISTER GSAP PLUGINS
  // ========================
  gsap.registerPlugin(ScrollTrigger, Flip);
  ScrollTrigger.defaults({ markers: false });

  // ========================
  // REDUCED MOTION CHECK
  // ========================
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========================
  // LENIS SMOOTH SCROLL
  // ========================
  let lenis;
  if (!prefersReduced) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.08 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ========================
  // YEAR
  // ========================
  document.getElementById('year').textContent = new Date().getFullYear();

  // ========================
  // CUSTOM CURSOR — improved
  // ========================
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const rippleContainer = document.getElementById('cursor-ripple');

  let mouse   = { x: -200, y: -200 };
  let ringPos = { x: -200, y: -200 };
  let ringW = 34, ringH = 34;
  let targetRingW = 34, targetRingH = 34;

  function lerp(a, b, t) { return a + (b - a) * t; }

  // Dot snaps instantly to position
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // Dot: instant snap (no translate offset, we position relative to cursor center)
    dot.style.left = mouse.x + 'px';
    dot.style.top  = mouse.y + 'px';
    dot.style.transform = 'translate(-50%, -50%)';
  });

  // Ring follows with lerp
  function animateRing() {
    ringPos.x = lerp(ringPos.x, mouse.x, 0.12);
    ringPos.y = lerp(ringPos.y, mouse.y, 0.12);
    ringW = lerp(ringW, targetRingW, 0.14);
    ringH = lerp(ringH, targetRingH, 0.14);
    ring.style.left   = ringPos.x + 'px';
    ring.style.top    = ringPos.y + 'px';
    ring.style.width  = ringW + 'px';
    ring.style.height = ringH + 'px';
    ring.style.transform = 'translate(-50%, -50%)';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover targets: ring scale + accent color
  function updateCursorHovers() {
    const hoverTargets = document.querySelectorAll(
      'a, button, .project-card, .filter-btn, .social-btn, .card-link, ' +
      '.chat-bubble, .chat-close, .welcome-cta, .welcome-dismiss'
    );
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.opacity    = '0';
        targetRingW = 48;
        targetRingH = 48;
        ring.classList.add('hovered');
      });
      el.addEventListener('mouseleave', () => {
        dot.style.opacity    = '1';
        targetRingW = 34;
        targetRingH = 34;
        ring.classList.remove('hovered');
      });
    });
  }
  updateCursorHovers();

  // Click ripple burst
  document.addEventListener('click', (e) => {
    if (!rippleContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple-burst';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top  = e.clientY + 'px';
    rippleContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  if (!window.matchMedia('(hover: none)').matches) {
    document.body.classList.add('cursor-enabled');
  }

  // ========================
  // MAGNETIC BUTTONS
  // ========================
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // ========================
  // PAGE PROGRESS — preloader phase
  // ========================
  const pageProgress = document.getElementById('page-progress');
  function setProgress(pct) {
    if (pageProgress) pageProgress.style.width = pct + '%';
  }

  // ========================
  // PRELOADER
  // ========================
  function runPreloader() {
    const preloader  = document.getElementById('preloader');
    const bar        = document.getElementById('preloader-bar');
    const initials   = document.querySelector('.preloader-initials');
    const heroContent = document.querySelector('.hero-content');
    const heroVisual  = document.querySelector('.hero-visual');

    heroContent.style.opacity = '0';
    heroVisual.style.opacity  = '0';

    // Animate page progress bar from 0 → 100 while preloader runs
    setProgress(0);
    setTimeout(() => setProgress(100), 50);

    // Animate the preloader's own bar
    requestAnimationFrame(() => { bar.style.width = '100%'; });

    setTimeout(() => {
      gsap.to(initials, { scale: 1.5, opacity: 0, duration: 0.5, ease: 'power2.in' });
      gsap.to(bar.parentElement, { opacity: 0, duration: 0.4, delay: 0.1 });

      gsap.to(preloader, {
        y: '-100%',
        duration: 0.7,
        delay: 0.4,
        ease: 'expo.inOut',
        onComplete: () => {
          preloader.style.display = 'none';
          // Reset progress bar for scroll-driven use
          setProgress(0);
          startHeroAnimations();
          showWelcomePopup();
        }
      });
    }, 1400);
  }

  // ========================
  // WELCOME POPUP
  // ========================
  function showWelcomePopup() {
    if (sessionStorage.getItem('aa_welcomed')) return;

    const overlay  = document.getElementById('welcome-overlay');
    const ctaBtn   = document.getElementById('welcome-cta');
    const dismissBtn = document.getElementById('welcome-dismiss');
    if (!overlay) return;

    // Show with a tiny delay so hero animation starts first
    setTimeout(() => {
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('visible');
    }, 600);

    function closePopup() {
      sessionStorage.setItem('aa_welcomed', '1');
      overlay.classList.add('hiding');
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }, 450);
    }

    ctaBtn.addEventListener('click', closePopup);
    dismissBtn.addEventListener('click', closePopup);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });

    // Close on Escape
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        closePopup();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  // ========================
  // TEXT SCRAMBLE UTILITIES
  // ========================
  function getRandomChar() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function scrambleText(element, finalText, duration = 1) {
    const original    = finalText.split('');
    let frame         = 0;
    const totalFrames = Math.round(duration * 35);
    const lockTimes   = original.map((_, i) =>
      Math.round(totalFrames * (i / original.length) + Math.random() * 8)
    );

    const interval = setInterval(() => {
      const output = original.map((char, i) => {
        if (frame >= lockTimes[i] || char === ' ') return char;
        return getRandomChar();
      });
      element.textContent = output.join('');
      frame++;
      if (frame > totalFrames) {
        clearInterval(interval);
        element.textContent = finalText;
      }
    }, 28);
  }

  function prepareHeroNameForScramble(heroName) {
    if (!heroName) return;
    heroName.style.display = 'inline-block';
    heroName.style.whiteSpace = 'nowrap';
    const width = heroName.getBoundingClientRect().width;
    heroName.style.width = `${Math.ceil(width)}px`;
    heroName.style.overflow = 'hidden';
  }

  function scheduleHeroNameScramble(heroName, heroNameText) {
    if (!heroName) return;
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 7000;
      setTimeout(() => {
        if (!heroName.isConnected) return;
        prepareHeroNameForScramble(heroName);
        scrambleText(heroName, heroNameText, 0.9);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  function scrambleHeading(title) {
    const words = Array.from(title.querySelectorAll('.word'));
    if (!words.length) return;
    const original    = words.map(w => w.textContent);
    const totalFrames = Math.round(0.9 * 35);
    let frame         = 0;

    const interval = setInterval(() => {
      words.forEach((word, idx) => {
        const text       = original[idx];
        const revealCount = Math.floor((frame / totalFrames) * text.length);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          out += (i < revealCount || text[i] === ' ') ? text[i] : getRandomChar();
        }
        word.textContent = out;
      });
      frame++;
      if (frame > totalFrames) {
        clearInterval(interval);
        words.forEach((w, i) => { w.textContent = original[i]; });
      }
    }, 28);
  }

  // ========================
  // HERO ANIMATIONS
  // ========================
  function startHeroAnimations() {
    const heroContent = document.querySelector('.hero-content');
    const greeting    = document.querySelector('.hero-greeting');
    const heroName    = document.querySelector('.hero-name');
    const typewriterEl = document.querySelector('.hero-typewriter');
    const heroDesc    = document.querySelector('.hero-desc');
    const heroStats   = document.querySelector('.hero-stats');
    const heroCtas    = document.querySelector('.hero-ctas');
    const scrollInd   = document.querySelector('.scroll-indicator');
    const heroVisual  = document.querySelector('.hero-visual');

    heroContent.style.opacity = '1';
    heroVisual.style.opacity  = '1';

    const tl = gsap.timeline();

    // 1. Greeting
    tl.to(greeting, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0);

    // 2. Name — glitch/scramble reveal
    const heroNameText = heroName.textContent.trim();
    heroName.style.opacity = '1';
    if (!prefersReduced) {
      prepareHeroNameForScramble(heroName);
      heroName.textContent = heroNameText;
      tl.call(() => scrambleText(heroName, heroNameText, 1.1), null, 0.15);
      tl.from(heroName, { opacity: 0, duration: 0.55, ease: 'power3.out' }, 0.15);
      tl.call(() => scheduleHeroNameScramble(heroName, heroNameText), null, 1.6);
    } else {
      tl.from(heroName, { opacity: 0, y: 20, duration: 0.55, ease: 'power3.out' }, 0.15);
    }

    // 3. Typewriter
    tl.to(typewriterEl, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.4);
    tl.call(() => startTypewriter(), null, 0.4);

    // 4. Description
    tl.to(heroDesc, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.6);

    // 5. Stats
    tl.to(heroStats, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.8);
    tl.call(() => startCounters(), null, 0.8);

    // 6. CTAs
    tl.to(heroCtas, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.0);

    // 7. Scroll indicator — pulsing bounce, disappears on scroll
    tl.to(scrollInd, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.2);

    // 8. Hero visual
    tl.to(heroVisual, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.3);
  }

  // ========================
  // TYPEWRITER
  // ========================
  function startTypewriter() {
    const phrases = ['ML models.', 'data pipelines.', 'web applications.'];
    const el      = document.getElementById('typewriter-text');
    const cursor  = document.getElementById('typewriter-cursor');
    let phraseIndex = 0, charIndex = 0, isDeleting = false;

    function tick() {
      const current = phrases[phraseIndex];
      cursor.classList.add('typing');

      if (!isDeleting && charIndex <= current.length) {
        el.textContent = current.slice(0, charIndex++);
        if (charIndex > current.length) {
          cursor.classList.remove('typing');
          setTimeout(() => { isDeleting = true; tick(); }, 2200);
          return;
        }
        setTimeout(tick, 75);
      } else if (isDeleting && charIndex >= 0) {
        el.textContent = current.slice(0, charIndex--);
        if (charIndex < 0) {
          isDeleting = false; charIndex = 0;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          cursor.classList.remove('typing');
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, 35);
      }
    }
    tick();
  }

  // ========================
  // STAT COUNTERS
  // ========================
  function startCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
      const target = parseInt(el.getAttribute('data-target'));
      gsap.to({ val: 0 }, {
        val: target, duration: 1.4, ease: 'power2.out', delay: 0.2,
        onUpdate: function() { el.textContent = Math.round(this.targets()[0].val); }
      });
    });
  }

  // ========================
  // TOAST
  // ========================
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ========================
  // SCROLL HELPER
  // ========================
  function scrollToElement(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.1 });
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========================
  // NAVBAR — scroll behavior
  // ========================
  const navbar = document.getElementById('navbar');
  let heroScrollHidden = false;

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 80);

    // Back to top
    const backTop = document.getElementById('back-to-top');
    backTop.classList.toggle('visible', window.scrollY > 400);

    // Page progress (scroll-driven after preloader)
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH > 0) setProgress((window.scrollY / docH) * 100);

    // Scroll indicator hide on first scroll
    const scrollInd = document.querySelector('.scroll-indicator');
    if (scrollInd && window.scrollY > 30 && !heroScrollHidden) {
      heroScrollHidden = true;
      scrollInd.classList.add('hidden');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ========================
  // ACTIVE NAV LINK
  // ========================
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link');
  const sectObs   = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('data-section') === entry.target.id);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => sectObs.observe(s));

  // ========================
  // MOBILE NAV
  // ========================
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobile-nav');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  function openMobileNav() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    mobileLinks.forEach((link, i) => {
      gsap.to(link, { opacity: 1, y: 0, duration: 0.4, delay: i * 0.06, ease: 'power3.out' });
    });
  }

  function closeMobileNav() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileLinks.forEach(link => gsap.to(link, { opacity: 0, y: 20, duration: 0.2 }));
    setTimeout(() => {
      mobileNav.classList.remove('open');
      mobileNav.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }

  hamburger.addEventListener('click', () => {
    mobileNav.classList.contains('open') ? closeMobileNav() : openMobileNav();
  });
  mobileLinks.forEach(link => link.addEventListener('click', closeMobileNav));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMobileNav();
  });
  mobileLinks.forEach(link => { link.style.opacity = '0'; link.style.transform = 'translateY(20px)'; });

  // ========================
  // BACK TO TOP
  // ========================
  document.getElementById('back-to-top').addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ========================
  // SCROLL ANIMATIONS
  // ========================
  function initScrollAnimations() {
    if (prefersReduced) return;

    // Section title scramble + reveal
    Splitting({ target: '.section-title', by: 'words' });
    gsap.utils.toArray('.section-title').forEach(title => {
      const words = title.querySelectorAll('.word');
      if (!words.length) return;
      gsap.set(words, { y: '110%', opacity: 0 });
      gsap.to(words, {
        scrollTrigger: { trigger: title, start: 'top 85%' },
        y: '0%', opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out'
      });
    });

    // Section title wrapper underlines
    gsap.utils.toArray('.section-title-wrapper').forEach(wrapper => {
      ScrollTrigger.create({
        trigger: wrapper, start: 'top 85%',
        onEnter: () => wrapper.classList.add('in-view')
      });
    });

    // About text
    gsap.utils.toArray('.about-text p').forEach(p => {
      gsap.from(p, {
        scrollTrigger: { trigger: p, start: 'top 85%' },
        y: 30, opacity: 0, duration: 0.7, ease: 'power2.out'
      });
    });

    gsap.from('.currently-learning', {
      scrollTrigger: { trigger: '.currently-learning', start: 'top 90%' },
      y: 20, opacity: 0, duration: 0.5, ease: 'power2.out'
    });
    gsap.from('.status-badge', {
      scrollTrigger: { trigger: '.status-badge', start: 'top 95%' },
      y: 20, opacity: 0, duration: 0.5, delay: 0.1, ease: 'power2.out'
    });

    // Project cards — tilt only on desktop
    gsap.utils.toArray('.project-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: 'top 92%' },
        y: 60, opacity: 0, duration: 0.7, delay: (i % 3) * 0.12, ease: 'power3.out'
      });
    });

    // Skills
    gsap.from('.skill-group', {
      scrollTrigger: { trigger: '.skills-groups', start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out'
    });
    gsap.from('.skill-tags-list .skill-tag', {
      scrollTrigger: { trigger: '.skills-groups', start: 'top 80%' },
      scale: 0.7, opacity: 0, duration: 0.4, stagger: 0.03, ease: 'back.out(1.7)'
    });

    // Education timeline
    gsap.fromTo('.timeline-line-fill',
      { scaleY: 0 },
      {
        scaleY: 1,
        scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 80%', scrub: 1 },
        transformOrigin: 'top', ease: 'none'
      }
    );
    gsap.utils.toArray('.timeline-item').forEach(item => {
      gsap.to(item, {
        scrollTrigger: { trigger: item, start: 'top 85%' },
        opacity: 1, x: 0, duration: 0.6, delay: 0.1, ease: 'power2.out'
      });
    });

    // Hero parallax
    gsap.to('.hero-visual', {
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      y: -60
    });

    // Contact
    gsap.from('.contact-headline', {
      scrollTrigger: { trigger: '#contact', start: 'top 80%' },
      y: 40, opacity: 0, duration: 0.7, ease: 'power3.out'
    });
    gsap.from('.contact-sub', {
      scrollTrigger: { trigger: '#contact', start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.6, delay: 0.15, ease: 'power2.out'
    });
    gsap.from('.contact-email-block', {
      scrollTrigger: { trigger: '#contact', start: 'top 80%' },
      y: 20, opacity: 0, duration: 0.5, delay: 0.3, ease: 'power2.out'
    });
    gsap.from('.social-btn', {
      scrollTrigger: { trigger: '.contact-socials', start: 'top 90%' },
      scale: 0.8, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.7)'
    });
    gsap.from('.contact-form', {
      scrollTrigger: { trigger: '.contact-form', start: 'top 90%' },
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out'
    });
  }

  // ========================
  // PROJECT FILTER
  // ========================
  function initFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards      = document.querySelectorAll('.project-card');
    const pill       = document.getElementById('filter-pill');

    function movePill(btn) {
      const barRect = document.querySelector('.filter-bar').getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      gsap.to(pill, { left: btnRect.left - barRect.left - 6, width: btnRect.width, duration: 0.3, ease: 'power2.inOut' });
    }

    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn) {
      requestAnimationFrame(() => {
        const barRect = document.querySelector('.filter-bar').getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        gsap.set(pill, { left: btnRect.left - barRect.left - 6, width: btnRect.width });
      });
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        movePill(btn);

        cards.forEach(card => {
          const matches = filter === 'all' || card.getAttribute('data-category') === filter;
          if (!matches) {
            gsap.to(card, { opacity: 0, scale: 0.95, duration: 0.25, ease: 'power2.in',
              onComplete: () => { card.style.display = 'none'; } });
          } else {
            card.style.display = 'flex';
            gsap.fromTo(card, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
          }
        });
      });
    });
  }

  // ========================
  // COPY EMAIL
  // ========================
  function initCopyEmail() {
    const copyBtn = document.querySelector('.copy-email');
    if (!copyBtn) return;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('amika.20240191@iit.ac.lk');
        copyBtn.innerHTML = '✓ Copied';
        copyBtn.style.color = 'var(--success)';
        copyBtn.style.borderColor = 'var(--success)';
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
          copyBtn.style.color = '';
          copyBtn.style.borderColor = '';
        }, 2500);
      } catch {
        copyBtn.textContent = 'Copy link above';
      }
    });
  }

  // ========================
  // CONTACT FORM
  // ========================
  function initForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const submitBtn  = form.querySelector('.form-submit');
    const submitText = form.querySelector('.form-submit-text');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name    = document.getElementById('form-name');
      const email   = document.getElementById('form-email');
      const message = document.getElementById('form-message');
      let valid = true;

      [name, email, message].forEach(field => {
        field.classList.remove('error');
        if (!field.value.trim()) { field.classList.add('error'); valid = false; }
      });

      if (!valid) {
        showToast('Please fill in the highlighted fields.');
        return;
      }

      // Show loading spinner
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      submitText.textContent = 'Opening...';

      const subjectSelect = document.getElementById('form-subject');
      const subjectVal = subjectSelect ? subjectSelect.value : 'Portfolio Contact';
      const mailto = `mailto:amika.20240191@iit.ac.lk?subject=${encodeURIComponent(subjectVal + ' — Portfolio Contact from ' + name.value)}&body=${encodeURIComponent(message.value + '\n\nFrom: ' + email.value)}`;

      setTimeout(() => {
        window.location.href = mailto;
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitText.textContent = 'Send Message';
        showToast('Message sent ✓');
      }, 600);
    });
  }

  // ========================
  // VANILLA TILT — desktop only
  // ========================
  function initTilt() {
    if (window.matchMedia('(hover: none)').matches) return; // disable on mobile/touch
    VanillaTilt.init(document.querySelectorAll('.project-card'), {
      max: 8, speed: 400, glare: true, 'max-glare': 0.08, gyroscope: false
    });
  }

  // ========================
  // CHAT WIDGET — Local DOM assistant
  // Uses page content to reply and can scroll to referenced sections/projects
  // ========================
  const CHAT_SYSTEM_PROMPT = `You are a smart, friendly portfolio assistant for Amika Alankara. Keep answers concise and helpful (2-4 sentences max unless the user asks for detail).

About Amika:
- 2nd year BSc (Hons) Artificial Intelligence & Data Science student at Informatics Institute of Technology (IIT), Colombo, Sri Lanka — affiliated with Robert Gordon University, UK.
- Skills: Python, Java, JavaScript, React, HTML/CSS, SQL, SQLite, Pandas, NumPy, SciPy, Scikit-learn, Matplotlib, Seaborn, Jupyter, RStudio, Apache Airflow (learning), Docker (learning), AWS S3/Lambda/Glue/Athena (learning), Git, CLI.
- Projects: Telco Customer Churn Prediction (ML, Scikit-learn), Colombo Transport Optimization (SciPy linear programming), Weather Prediction Model (Scikit-learn), Media Database Manager (Python + SQLite CLI), Team Formation System (Java OOP), Bookify (React e-commerce), Brain-to-Text BCI Research (EEG/signal processing proposal).
- GitHub: github.com/Amika1118
- LinkedIn: linkedin.com/in/amika-ranmeth
- Email: amika.20240191@iit.ac.lk
- Open to: internships, research collaborations, and project partnerships in ML, data engineering, and full-stack development.

If the user wants to contact Amika: tell them you can auto-fill the contact form for them and ask if they'd like to do that. Trigger phrase: user mentions "contact", "reach out", "hire", "get in touch", "send a message", "message Amika".

Always be professional, slightly playful, and represent Amika accurately. Don't make up projects or skills not listed above.`;

  let chatHistory = [];
  // Global contact flow state so both sender and widget can access
  let contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };

  function appendChatMessage(text, sender = 'bot') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    // remove any existing quick-replies when a normal message is added
    const existingQR = document.getElementById('chat-quick-replies');
    if (existingQR) existingQR.remove();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendQuickReplies(options = []) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages || !options.length) return;
    // remove old quick replies
    const existing = document.getElementById('chat-quick-replies');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'chat-quick-replies';
    container.style.display = 'flex';
    container.style.gap = '0.5rem';
    container.style.flexWrap = 'wrap';
    container.style.marginTop = '0.5rem';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-btn';
      btn.textContent = opt;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        // centralized handler will append the user message and record it
        handleChatUserText(opt);
      });
      container.appendChild(btn);
    });

    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Centralized handler for user-provided chat text (used by submit and quick replies)
  function handleChatUserText(text) {
    if (!text) return;
    const lower = text.toLowerCase();
    // display user message in chat UI
    appendChatMessage(text, 'user');
    // record user message
    chatHistory.push({ role: 'user', content: text });

    // If we're in a contact flow, advance through stages
    if (contactFlow.stage && contactFlow.stage !== 'idle') {
      if (contactFlow.stage === 'purpose') {
        contactFlow.purpose = text;
        contactFlow.stage = 'name';
        appendChatMessage(`Purpose set to "${text}". What's your name?`, 'bot');
        return;
      }
      if (contactFlow.stage === 'name') {
        contactFlow.name = text;
        contactFlow.stage = 'email';
        appendChatMessage('Thanks — and the best email address to reach you at?', 'bot');
        return;
      }
      if (contactFlow.stage === 'email') {
        contactFlow.email = text;
        contactFlow.stage = 'message';
        appendChatMessage("Got it — what's the message you'd like to send?", 'bot');
        return;
      }
      if (contactFlow.stage === 'message') {
        contactFlow.message = text;
        // complete
        finishContactFlow();
        return;
      }
    }

    // If not in a contact flow, check for contact trigger
    if (/(contact|reach out|get in touch|hire|message me|send a message|contact me)/i.test(lower)) {
      contactFlow.stage = 'purpose';
      appendChatMessage('Sure — what is the purpose of the message? Please choose one:', 'bot');
      appendQuickReplies(['Internship', 'Collaboration', 'Project Inquiry', 'Research', 'Other']);
      return;
    }

    // Otherwise delegate to local assistant responder
    sendChatMessage(text);
  }

  function setChatTyping(visible) {
    const typing = document.getElementById('chat-typing');
    if (!typing) return;
    typing.classList.toggle('visible', visible);
    typing.setAttribute('aria-hidden', String(!visible));
    if (visible) {
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Local DOM-based responder: uses page content and scrolls to referenced sections.
  async function sendChatMessage(userText) {
    setChatTyping(true);
    const lower = userText.trim().toLowerCase();

    // If user explicitly asks to contact, start purpose flow
    if (/(contact|reach out|get in touch|hire|message me|send a message|contact me)/i.test(lower)) {
      contactFlow.stage = 'purpose';
      appendChatMessage('Sure — what is the purpose of the message? Please choose one:', 'bot');
      appendQuickReplies(['Internship', 'Collaboration', 'Project Inquiry', 'Research', 'Other']);
      setChatTyping(false);
      return;
    }

    // Fast canned answers for common questions, with page jump support
    const cannedReplies = [

      {
        pattern: /\b(who are you|what is this site|about you|introduce yourself|name)\b/i,
        reply: "I'm Amika Alankara, a 2nd year BSc (Hons) AI & Data Science student at IIT Colombo. This is my portfolio site showcasing my projects, skills, and experience.",
        section: 'about'
      },
      {
        pattern: /^(hello|hi)\b/i,
        reply: "Hi, I'm Amika Alankara. How can I help you?",
        section: null
      },
      {
        pattern: /\b(projects|portfolio|where is your code|code)\b/i,
        reply: "My GitHub is github.com/Amika1118. Project links and details are in the Projects section.",
        section: 'projects'
      },
      {
        pattern: /\b(skills|technologies|tech|what are your skills|what do you do)\b/i,
        reply: "Key skills: Python, Java, JavaScript, React, SQL, Pandas, NumPy, Scikit-learn — see the Skills section for more.",
        section: 'skills'
      },
      {
        pattern: /\b(education|degree|university|school)\b/i,
        reply: "I'm a 2nd year BSc (Hons) AI & Data Science student at IIT Colombo, UK-affiliated. Check the Education section for more.",
        section: 'education'
      },
      {
        pattern: /\b(internship|job|opportunity)\b/i,
        reply: "I'm open to internships and job opportunities. Use the contact form and choose the appropriate purpose.",
        section: 'contact'
      },
      {
        pattern: /\b(how can i contact you|how do i contact you)\b/i,
        reply: "You can use the contact form below or email amika.20240191@iit.ac.lk.",
        section: 'contact'
      }
    ];

    for (const item of cannedReplies) {
      if (item.pattern.test(lower)) {
        appendChatMessage(item.reply, 'bot');
        chatHistory.push({ role: 'assistant', content: item.reply });
        if (item.section) {
          const target = document.getElementById(item.section);
          if (target) scrollToElement(target);
        }
        setChatTyping(false);
        return;
      }
    }

    // Try to match main sections by keywords
    const sectionMap = [
      { id: 'about', keys: ['about', 'background', 'who', 'me'] },
      { id: 'projects', keys: ['project', 'projects', 'work', 'portfolio'] },
      { id: 'skills', keys: ['skill', 'skills', 'technologies', 'tech'] },
      { id: 'education', keys: ['education', 'degree', 'university', 'school'] },
      { id: 'contact', keys: ['contact', 'email', 'reach'] }
    ];

    let matchedEl = null;
    for (const s of sectionMap) {
      for (const k of s.keys) {
        if (lower.includes(k)) {
          matchedEl = document.getElementById(s.id);
          break;
        }
      }
      if (matchedEl) break;
    }

    // Try project titles and summaries
    if (!matchedEl) {
      const projects = Array.from(document.querySelectorAll('.project-card'));
      for (const card of projects) {
        const title = (card.querySelector('.card-title') || {}).textContent || '';
        const summary = (card.querySelector('.card-summary') || {}).textContent || '';
        const combined = (title + ' ' + summary).toLowerCase();
        if (lower.includes(title.toLowerCase()) || combined.includes(lower) || lower.split(/\W+/).some(w => w && combined.includes(w))) {
          matchedEl = card;
          break;
        }
      }
    }

    // Prepare reply and scroll if we found something
    if (matchedEl) {
      // extract useful snippet
      let snippet = '';
      const titleEl = matchedEl.querySelector && matchedEl.querySelector('.card-title');
      const summaryEl = matchedEl.querySelector && matchedEl.querySelector('.card-summary');
      if (titleEl) snippet += titleEl.textContent.trim() + '\n';
      if (summaryEl) snippet += summaryEl.textContent.trim();
      if (!snippet) snippet = matchedEl.textContent.trim().slice(0, 600);

      // show typing then reply and scroll
      setTimeout(() => {
        appendChatMessage(snippet, 'bot');
        chatHistory.push({ role: 'assistant', content: snippet });
        scrollToElement(matchedEl);
        setChatTyping(false);
      }, 500 + Math.min(800, snippet.length * 5));
      return;
    }

    // Fallback answers: show a helpful menu when the bot doesn't know the request
    setTimeout(() => {
      const apology = "Sorry, I couldn't find exactly what you asked for. Here are some quick menu options to help you get there:";
      appendChatMessage(apology, 'bot');
      chatHistory.push({ role: 'assistant', content: apology });
      appendQuickReplies(['Projects', 'Skills', 'Education', 'Contact']);
      setChatTyping(false);
    }, 500);
  }

  function initChatWidget() {
    const chatBubble = document.getElementById('chat-bubble');
    const chatPanel  = document.getElementById('chat-panel');
    const chatClose  = document.getElementById('chat-close');
    const chatForm   = document.getElementById('chat-form');
    const chatInput  = document.getElementById('chat-input');
    if (!chatBubble || !chatPanel || !chatClose || !chatForm || !chatInput) return;

    function startContactFlow() {
      contactFlow.stage = 'name';
      appendChatMessage("Sure! I'll fill the form for you. What name should I use?", 'bot');
    }

    function finishContactFlow() {
      const fName    = document.getElementById('form-name');
      const fEmail   = document.getElementById('form-email');
      const fMessage = document.getElementById('form-message');
      const fSubject = document.getElementById('form-subject');
      if (fName)    fName.value    = contactFlow.name;
      if (fEmail)   fEmail.value   = contactFlow.email;
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
      appendChatMessage("Done! I've filled the contact form. Scroll down, review it, and hit Send whenever you're ready.", 'bot');
      setTimeout(() => {
        scrollToElement(document.getElementById('contact'));
      }, 100);
      showToast('Contact form auto-filled ✓');
      contactFlow = { stage: 'idle', purpose: '', name: '', email: '', message: '' };
      // Update cursor hover targets (new button may have been added)
      updateCursorHovers();
    }

    function openChatPanel() {
      chatPanel.classList.add('open');
      chatPanel.setAttribute('aria-hidden', 'false');
      chatBubble.setAttribute('aria-expanded', 'true');
      setTimeout(() => chatInput.focus(), 300);
    }

    function closeChatPanel() {
      chatPanel.classList.remove('open');
      chatPanel.setAttribute('aria-hidden', 'true');
      chatBubble.setAttribute('aria-expanded', 'false');
    }

    chatBubble.addEventListener('click', openChatPanel);
    chatBubble.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openChatPanel();
    });
    chatClose.addEventListener('click', closeChatPanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatPanel.classList.contains('open')) closeChatPanel();
    });

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      handleChatUserText(text);
    });

    // Welcome message
    appendChatMessage("Hi! I'm Amika's AI assistant. Ask me about her projects, skills, or background — or I can fill the contact form for you.", 'bot');
  }

  // ========================
  // NAV ANCHOR SMOOTH SCROLL
  // ========================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href === '#main-content') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ========================
  // INIT
  // ========================
  window.addEventListener('load', () => {
    runPreloader();
    initFilter();
    initCopyEmail();
    initForm();
    initTilt();
    initChatWidget();
    initScrollAnimations();
  });

  // Reduced motion fallback
  if (prefersReduced) {
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity   = '1';
      el.style.transform = 'none';
    });
  }

})();
