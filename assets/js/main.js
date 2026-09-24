/* ============================================================================
   Nishta — interaction layer
   No dependencies. Everything degrades: without JS the page is fully readable,
   and every motion path is gated on prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const fineQ   = matchMedia('(hover: hover) and (pointer: fine)');
  let reduced   = motionQ.matches;
  motionQ.addEventListener('change', e => { reduced = e.matches; onScroll(); });

  /* ---------------------------------------------------------------- 1. Images
     Fade each image in when its bytes land, then drop the LQIP backdrop. */
  const settle = img => {
    img.classList.add('is-loaded');
    const m = img.closest('.media');
    if (m) setTimeout(() => m.classList.add('is-ready'), 750);
  };
  $$('.media img').forEach(img => {
    if (img.complete && img.naturalWidth) settle(img);
    else {
      img.addEventListener('load',  () => settle(img), { once: true });
      img.addEventListener('error', () => settle(img), { once: true });
    }
  });

  /* ------------------------------------------------------- 2. Hero type reveal
     Two frames so the initial styles are committed before we transition. */
  const heroTitle = $('[data-lit]');
  if (heroTitle) {
    requestAnimationFrame(() => requestAnimationFrame(() => heroTitle.classList.add('is-lit')));
  }

  /* --------------------------------------------------- 3. Scroll-in reveals */
  const revealIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  $$('[data-reveal]').forEach(el => revealIO.observe(el));

  const stepIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  $$('[data-step]').forEach(el => stepIO.observe(el));

  /* ------------------------------------------ 4. Manifesto word illumination */
  const manifesto = $('[data-illuminate]');
  const manWords  = manifesto ? $$('.w', manifesto) : [];
  function illuminate() {
    if (!manifesto) return;
    if (reduced) { manWords.forEach(w => w.classList.add('on')); return; }
    const r  = manifesto.getBoundingClientRect();
    const vh = innerHeight;
    const p  = (vh * 0.86 - r.top) / (vh * 0.52);
    const lit = Math.round(Math.min(1, Math.max(0, p)) * manWords.length);
    manWords.forEach((w, i) => w.classList.toggle('on', i < lit));
  }

  /* --------------------------------------------------------- 5. Stat counters */
  const countIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const el  = e.target;
      const end = Number(el.dataset.count) || 0;
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      if (reduced) { el.textContent = pre + end + suf; return; }
      const dur = 1500, t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = pre + Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* --------------------------------------------- 5b. Deferred CSS backgrounds */
  const lazyBg = $$('[data-bg]');
  if (lazyBg.length) {
    const bgIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        const url = e.target.dataset.bg;
        const pre = new Image();
        pre.onload = () => { e.target.style.backgroundImage = `url("${url}")`; };
        pre.src = url;
      });
    }, { rootMargin: '320px 0px' });
    lazyBg.forEach(el => bgIO.observe(el));
  }

  /* ------------------------------------------------- 6. Header state + active */
  const header = $('#header');
  let lastY = scrollY;
  let holdHeaderUntil = 0;

  function headerState() {
    const y = scrollY;
    header.classList.toggle('is-stuck', y > 40);
    // An in-page jump scrolls "down" hard; keep the nav on screen through it
    // instead of hiding it the moment the reader arrives.
    const holding = performance.now() < holdHeaderUntil;
    const hide = !holding && y > lastY && y > 520 && !drawerOpen && !lbOpen;
    header.classList.toggle('is-hidden', hide);
    lastY = y;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    holdHeaderUntil = performance.now() + 1400;
    header.classList.remove('is-hidden');
  });

  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = $(`.nav__link[href="#${e.target.id}"]`);
      if (link) link.classList.toggle('is-active', e.isIntersecting);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['collections', 'bestseller', 'studio', 'house', 'lookbook']
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .forEach(el => navIO.observe(el));

  /* ------------------------------------------------------------- 7. Inerting
     While a dialog is open the rest of the page is removed from the a11y tree
     and the tab order, which is cheaper and safer than a hand-rolled trap. */
  const backdropRegions = () => [$('#main'), $('footer.footer')].filter(Boolean);
  function setBackgroundInert(on, alsoHeader) {
    backdropRegions().forEach(el => on ? el.setAttribute('inert', '') : el.removeAttribute('inert'));
    if (alsoHeader) on ? header.setAttribute('inert', '') : header.removeAttribute('inert');
  }

  /* -------------------------------------------------------- 8. Mobile drawer */
  const burger = $('#burger');
  const drawer = $('#drawer');
  let drawerOpen = false;
  let drawerReturn = null;

  function setDrawer(open) {
    if (open === drawerOpen) return;
    drawerOpen = open;
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);

    if (open) {
      // The header may be auto-hidden from a downward scroll; it carries the
      // only close affordance, so bring it back.
      header.classList.remove('is-hidden');
      drawerReturn = document.activeElement;
      drawer.removeAttribute('inert');
      setBackgroundInert(true, false);
      setTimeout(() => { const f = drawer.querySelector('a'); if (f) f.focus(); }, 140);
    } else {
      // Order matters: restore the page first, then drop the dialog out of the
      // tab order, then move focus back. Focusing an inert element is a no-op.
      setBackgroundInert(false, false);
      drawer.setAttribute('inert', '');
      if (drawerReturn && document.contains(drawerReturn)) drawerReturn.focus();
      else burger.focus();
    }
  }
  burger.addEventListener('click', () => setDrawer(!drawerOpen));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
  // A resize into the desktop layout must not leave the page scroll-locked.
  addEventListener('resize', () => { if (drawerOpen && innerWidth >= 992) setDrawer(false); });

  /* ---------------------------------------------------- 9. Magnetic buttons */
  if (fineQ.matches) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (reduced) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width  / 2)) * 0.26;
        const y = (e.clientY - (r.top  + r.height / 2)) * 0.32;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      el.addEventListener('blur',         () => { el.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------- 10. Card spotlight */
  $$('[data-spotlight]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width)  * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top)  / r.height) * 100}%`);
    });
  });

  /* -------------------------------------- 11. Parallax + hero drift (one rAF) */
  const pxEls     = $$('[data-parallax]');
  const heroInner = $('[data-hero-drift]');
  const hero      = $('.hero');
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = innerHeight;

    if (!reduced) {
      for (const el of pxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        const speed = parseFloat(el.dataset.speed) || 0.05;
        const delta = (r.top + r.height / 2) - vh / 2;
        const max   = r.height * 0.042;          // stays inside the 1.09 scale
        const py    = Math.max(-max, Math.min(max, -delta * speed));
        el.style.setProperty('--py', `${py.toFixed(2)}px`);
      }
      if (heroInner && hero) {
        const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9)));
        heroInner.style.setProperty('--hy', `${(p * 84).toFixed(1)}px`);
        heroInner.style.setProperty('--ho', (1 - p * 0.9).toFixed(3));
      }
    } else {
      pxEls.forEach(el => el.style.removeProperty('--py'));
      if (heroInner) { heroInner.style.removeProperty('--hy'); heroInner.style.removeProperty('--ho'); }
    }
    illuminate();
  }

  function onScroll() {
    headerState();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ------------------------------------------------------------ 12. Lightbox */
  const looks   = $$('.look');
  const lb      = $('#lightbox');
  const lbImg   = $('#lb-img');
  const lbCap   = $('#lb-cap');
  const lbCount = $('#lb-count');
  let lbIndex = 0, lbOpen = false, lbReturn = null;

  function lbShow(i) {
    lbIndex = (i + looks.length) % looks.length;
    const btn = looks[lbIndex];
    const src = btn.dataset.full;
    const cap = btn.dataset.cap || '';
    lbImg.classList.remove('is-in');
    const pre = new Image();
    pre.decoding = 'async';
    pre.onload = () => {
      lbImg.src = src;
      lbImg.alt = cap;
      requestAnimationFrame(() => lbImg.classList.add('is-in'));
    };
    pre.onerror = () => { lbImg.src = src; lbImg.alt = cap; lbImg.classList.add('is-in'); };
    pre.src = src;
    lbCap.textContent   = cap;
    lbCount.textContent = `${lbIndex + 1} / ${looks.length}`;
  }

  function setLightbox(open, from) {
    if (!lb || open === lbOpen) return;
    lbOpen = open;
    lb.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) {
      lbReturn = from || document.activeElement;
      lb.removeAttribute('inert');
      setBackgroundInert(true, true);
      setTimeout(() => $('#lb-close').focus(), 60);
    } else {
      setBackgroundInert(false, true);
      lb.setAttribute('inert', '');
      if (lbReturn && document.contains(lbReturn)) lbReturn.focus();
    }
  }

  // Interior pages (contact, etc.) reuse this script but have no gallery.
  if (lb && looks.length) {
    looks.forEach((btn, i) => btn.addEventListener('click', () => { lbShow(i); setLightbox(true, btn); }));
    $('#lb-close').addEventListener('click', () => setLightbox(false));
    $('#lb-prev').addEventListener('click', () => lbShow(lbIndex - 1));
    $('#lb-next').addEventListener('click', () => lbShow(lbIndex + 1));
    lb.addEventListener('click', e => { if (e.target === lb) setLightbox(false); });
  }

  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (lbOpen) setLightbox(false);
      else if (drawerOpen) setDrawer(false);
      return;
    }
    if (!lbOpen) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); lbShow(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex + 1); }
  });

  /* --------------------------------------------------------------- 13. Forms */
  function fieldOf(input) { return input.closest('.field'); }

  function checkField(input) {
    const wrap = fieldOf(input);
    const ok = input.checkValidity();
    if (wrap) wrap.classList.toggle('is-invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  const apptForm = $('#appoint-form');
  if (apptForm) {
    const status = $('#form-status');
    const statusText = $('[data-status-text]', status);

    $$('input, select, textarea', apptForm).forEach(input => {
      input.addEventListener('blur',  () => { if (input.value) checkField(input); });
      input.addEventListener('input', () => {
        const wrap = fieldOf(input);
        if (wrap && wrap.classList.contains('is-invalid')) checkField(input);
      });
    });

    apptForm.addEventListener('submit', e => {
      e.preventDefault();
      const inputs = $$('input, select, textarea', apptForm);
      let firstBad = null;
      inputs.forEach(input => { if (!checkField(input) && !firstBad) firstBad = input; });

      if (firstBad) {
        status.classList.remove('is-on');
        firstBad.focus();
        return;
      }
      const name = $('#f-name').value.trim().split(/\s+/)[0];
      statusText.textContent =
        `Thank you${name ? ', ' + name : ''} — your enquiry is noted. We'll reply within one working day.`;
      status.classList.add('is-on');
      apptForm.reset();
      $$('.field', apptForm).forEach(f => f.classList.remove('is-invalid'));
    });
  }

  const newsForm = $('#news-form');
  if (newsForm) {
    const newsStatus = $('#news-status');
    newsForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#f-news');
      if (!input.checkValidity()) {
        newsStatus.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      newsStatus.textContent = 'Welcome — the next letter comes at the turn of the season.';
      newsForm.reset();
    });
  }

  /* ----------------------------------------------------------------- 14. Misc */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  onScroll();
})();
