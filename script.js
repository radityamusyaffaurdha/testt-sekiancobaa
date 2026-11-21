/* =========================================================
   A LITTLE SPACE FOR ALIA — script.js (v3)
   Flow: loader (7s) → keypad → success → music picker → curtain → site (views)
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const PASSWORD = '271108';
  const LOAD_MS = 7000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* Optional files that may not exist yet (probed lazily, so no request until needed) */
  const OPTIONAL = {
    favorite: 'assets/images/favorite.jpg',   // hidden frame in the gallery
    calendar: 'assets/calendar/calendar.png'  // image exported from the calendar PDF
  };

  function svgIcon(id, cls) {
    const s = document.createElementNS(NS, 'svg');
    if (cls) s.setAttribute('class', cls);
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }
  function revealScreen(el) { el.hidden = false; void el.offsetWidth; el.classList.add('show'); }
  const fmtTime = s => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function probeImage(src, ok, fail) { const i = new Image(); i.onload = () => ok(i); i.onerror = fail || (() => {}); i.src = src; }

  /* =====================================================
     FX — tiny canvas confetti + fireworks (capped, short-lived)
     ===================================================== */
  const fx = (() => {
    const cv = $('#fx'), ctx = cv.getContext('2d');
    let W = 0, H = 0, parts = [], raf = 0, last = 0;
    const COLS = ['#a96b75', '#d6aeb2', '#f1d8d8', '#9db685', '#c6c6c9', '#ffffff', '#e8c36a'];
    const MAX = 220;
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size, { passive: true });
    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    function confetti(x, y, n, o = {}) {
      if (reduce) return;
      const { angle = -Math.PI / 2, spread = Math.PI, speed = 10, gravity = .24 } = o;
      for (let i = 0; i < n && parts.length < MAX; i++) {
        const a = angle + rand(-spread / 2, spread / 2), sp = rand(speed * .45, speed);
        parts.push({ t: 'c', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: gravity, w: rand(5, 9), h: rand(3, 6), r: rand(0, 6.28), vr: rand(-.3, .3), c: COLS[(Math.random() * COLS.length) | 0], l: 0, m: rand(90, 150) });
      }
      start();
    }
    function firework(x, y) {
      if (reduce) return;
      const col = COLS[(Math.random() * 3) | 0], n = 16;
      for (let i = 0; i < n && parts.length < MAX; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-.1, .1), sp = rand(2.2, 3.6);
        parts.push({ t: 's', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: col, l: 0, m: rand(34, 48) });
      }
      start();
    }
    function loop(now) {
      const dt = Math.min((now - last) / 16.67, 2.5); last = now;
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter(p => p.l < p.m);
      for (const p of parts) {
        p.l += dt;
        const k = 1 - p.l / p.m, a = Math.min(1, k * 3.2);
        if (p.t === 'c') {
          p.vx *= .985; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        } else {
          p.vx *= .965; p.vy = p.vy * .965 + .05 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = a; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, W, H); }
    }
    function celebrate() {
      confetti(W * .12, H, 26, { angle: -1.15, spread: .9, speed: 15 });
      confetti(W * .88, H, 26, { angle: -Math.PI + 1.15, spread: .9, speed: 15 });
      for (let i = 0; i < 6; i++) setTimeout(() => confetti(rand(W * .1, W * .9), -10, 6, { angle: Math.PI / 2, spread: .7, speed: 4, gravity: .1 }), 300 + i * 260);
      [[.3, .3, 500], [.7, .25, 950], [.5, .38, 1400]].forEach(([fx_, fy, d]) => setTimeout(() => firework(W * fx_, H * fy), d));
    }
    return { confetti, firework, celebrate, get W() { return W; }, get H() { return H; } };
  })();

  /* =====================================================
     MUSIC — two tracks, never at the same time, persists across views
     ===================================================== */
  const A = { 2: $('#aud2'), 3: $('#audm3') };
  const TRACKS = [2, 3];
  let chosen = 0, muted = false;
  const mcards = $$('.mcard');
  const PLAY = 'M8 5l11 7-11 7z', PAUSE = 'M7 5h4v14H7zM13 5h4v14h-4z';
  const musicbar = $('#musicbar');

  function syncMusic() {
    mcards.forEach(c => {
      const n = +c.dataset.track, a = A[n], playing = !a.paused;
      c.classList.toggle('playing', playing);
      c.classList.toggle('selected', chosen === n);
      $('.mbtn--pick', c).setAttribute('aria-checked', String(chosen === n));
      $('.ico', c).setAttribute('d', playing ? PAUSE : PLAY);
      $('.mbtn--play span', c).textContent = playing ? 'Jeda' : 'Preview';
      const d = isFinite(a.duration) ? a.duration : 0;
      $('.t-dur', c).textContent = d ? fmtTime(d) : '–:––';
      $('.t-now', c).textContent = fmtTime(a.currentTime);
      $('.mcard__bar i', c).style.transform = 'scaleX(' + (d ? a.currentTime / d : 0) + ')';
    });
    $('#musicContinue').disabled = !chosen;
    const playingNow = chosen && !A[chosen].paused;
    musicbar.classList.toggle('playing', !!playingNow);
    $('#barPlayIco').setAttribute('d', playingNow ? PAUSE : PLAY);
    $('#barName').textContent = chosen ? 'Music 0' + chosen : 'Music';
  }
  function playOnly(n) {
    TRACKS.forEach(o => { if (o !== n) A[o].pause(); });
    A[n].muted = muted;
    const p = A[n].play(); if (p && p.catch) p.catch(() => {});
    syncMusic();
  }
  function choose(n, { play = true } = {}) {
    chosen = n;
    TRACKS.forEach(o => { if (o !== n) { A[o].pause(); try { A[o].currentTime = 0; } catch (e) {} } });
    if (play && A[n].paused) playOnly(n); else syncMusic();
  }
  TRACKS.forEach(n => {
    ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange'].forEach(ev => A[n].addEventListener(ev, syncMusic));
  });
  mcards.forEach(c => {
    const n = +c.dataset.track;
    $('.mbtn--play', c).addEventListener('click', () => { if (A[n].paused) playOnly(n); else { A[n].pause(); syncMusic(); } });
    $('.mbtn--pick', c).addEventListener('click', () => choose(n));
  });
  $('#barPlay').addEventListener('click', () => {
    if (!chosen) { choose(2); return; }
    if (A[chosen].paused) playOnly(chosen); else { A[chosen].pause(); syncMusic(); }
  });
  $('#barSwap').addEventListener('click', () => choose(TRACKS[chosen % TRACKS.length]));
  $('#barMute').addEventListener('click', () => {
    muted = !muted; TRACKS.forEach(n => { A[n].muted = muted; });
    $('#barMute').setAttribute('aria-pressed', String(muted));
    $('#barMuteX').setAttribute('opacity', muted ? '1' : '0');
    $('#barWave').setAttribute('opacity', muted ? '0' : '1');
  });
  syncMusic();

  /* =====================================================
     1. LOADER — cat walks with the bar (time-based, never drifts)
     ===================================================== */
  const intro = $('#intro'), gate = $('#gate');
  const track = $('#loaderTrack'), fill = $('#loaderFill'), cat = $('#loaderCat');
  const pct = $('#loaderPct'), bar = $('#loader');
  let trackW = track.clientWidth;
  addEventListener('resize', () => { trackW = track.clientWidth; }, { passive: true });

  function runLoader() {
    const dur = reduce ? 1200 : LOAD_MS;
    let t0 = null, lastPct = -1;
    const tick = now => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / dur, 1);
      fill.style.transform = 'scaleX(' + p + ')';
      cat.style.transform = 'translate3d(' + (p * trackW).toFixed(2) + 'px,0,0)';
      const n = Math.round(p * 100);
      if (n !== lastPct) { lastPct = n; pct.textContent = n + '%'; bar.setAttribute('aria-valuenow', n); }
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finishLoader, 450);
    };
    requestAnimationFrame(tick);
  }
  function finishLoader() {
    revealScreen(gate);
    intro.classList.add('out');
    setTimeout(() => { intro.hidden = true; }, 950);
  }
  runLoader();

  /* =====================================================
     2. KEYPAD PASSWORD
     ===================================================== */
  const card = $('#gateCard'), dots = $('#dots'), dotEls = $$('i', dots), msg = $('#gateMsg'), hint = $('#gateHint'), dotsSR = $('#dotsSR');
  let code = '', fails = 0, locked = false;
  const wrongMsgs = ['Hmm, belum pas. Coba lagi ya.', 'Hampir? Mungkin. Coba sekali lagi.', 'Kucingnya geleng-geleng… 🐾', 'Tenang, pelan-pelan aja.'];
  const hints = [
    "Maybe it's a date that means something special?",
    'Six digits: a day, a month, and two more.',
    'It starts with 27, the day. November comes right after.',
    '27 · 11 · 0_ — tinggal satu angka terakhir.'
  ];
  function paintDots() {
    dotEls.forEach((d, i) => d.classList.toggle('on', i < code.length));
    dotsSR.textContent = code.length + ' dari 6 angka';
  }
  function press(d) {
    if (locked || code.length >= 6) return;
    code += d; msg.textContent = ''; paintDots();
    if (code.length === 6) { locked = true; setTimeout(check, 280); }
  }
  function backspace() { if (locked) return; code = code.slice(0, -1); paintDots(); }
  function clearAll() { if (locked) return; code = ''; paintDots(); }
  function check() {
    if (code === PASSWORD) { msg.style.color = 'var(--char2)'; msg.textContent = '✦'; showSuccess(); return; }
    fails++;
    msg.style.color = 'var(--rose)'; msg.textContent = wrongMsgs[(fails - 1) % wrongMsgs.length];
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    dots.classList.add('err'); dotEls.forEach(d => d.classList.add('on'));
    setTimeout(() => { dots.classList.remove('err'); code = ''; paintDots(); locked = false; }, 650);
    if (fails >= 2) {
      const tier = Math.min(Math.floor(fails / 2), hints.length);
      hint.innerHTML = '<small>Hint ' + tier + ' / ' + hints.length + '</small>' + hints[tier - 1];
      hint.classList.remove('pop'); void hint.offsetWidth; hint.classList.add('pop');
    }
  }
  $('#keypad').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 140);
    if (k === 'del') backspace(); else if (k === 'clear') clearAll(); else press(k);
  });
  addEventListener('keydown', e => {   // convenience on desktop; the on-screen keypad is the main input
    if (gate.hidden || !gate.classList.contains('show') || gate.classList.contains('out')) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Escape' || e.key === 'Delete') clearAll();
  });

  /* =====================================================
     3. SUCCESS
     ===================================================== */
  const success = $('#success'), music = $('#music');
  function buildSuccessDecor() {
    const wrap = $('#succHearts'), cols = ['var(--rose)', 'var(--dusty)', '#c98b94'];
    for (let i = 0; i < 12; i++) {
      const h = svgIcon('heart', 'fh');
      h.style.setProperty('--x', rand(4, 94) + '%'); h.style.setProperty('--s', rand(14, 30) + 'px');
      h.style.setProperty('--d', rand(7, 12) + 's'); h.style.setProperty('--dl', -rand(0, 10) + 's');
      h.style.setProperty('--dx', rand(-40, 40) + 'px'); h.style.setProperty('--c', cols[i % 3]);
      wrap.appendChild(h);
    }
    for (let i = 0; i < 7; i++) {
      const s = svgIcon('star', 'fs');
      s.style.setProperty('--x', rand(6, 92) + '%'); s.style.setProperty('--y', rand(8, 85) + '%');
      s.style.setProperty('--s', rand(10, 20) + 'px'); s.style.setProperty('--d', rand(2.8, 5) + 's'); s.style.setProperty('--dl', -rand(0, 4) + 's');
      wrap.appendChild(s);
    }
  }
  function showSuccess() {
    buildSuccessDecor();
    setTimeout(() => {
      revealScreen(success); gate.classList.add('out');
      setTimeout(() => { gate.hidden = true; $('#continueBtn').focus({ preventScroll: true }); }, 950);
    }, 350);
  }
  $('#continueBtn').addEventListener('click', () => {
    const wipe = $('#heartwipe');
    wipe.classList.add('go');
    setTimeout(() => {
      success.hidden = true; revealScreen(music);
      wipe.classList.add('fade'); setTimeout(() => { wipe.hidden = true; }, 900);
    }, reduce ? 50 : 760);
  }, { once: true });

  /* =====================================================
     4. MUSIC PICKER → CURTAIN → SITE
     ===================================================== */
  let entering = false;
  function enterSite() {
    if (entering) return; entering = true;
    const cu = $('#curtain'), site = $('#site');
    cu.classList.add('on'); void cu.offsetWidth; cu.classList.add('close');
    setTimeout(() => {
      music.hidden = true; site.hidden = false; site.classList.add('enter');
      musicbar.classList.add('on');
      startSite();
      cu.classList.remove('close'); void cu.offsetWidth; cu.classList.add('open');
      document.body.classList.remove('is-locked');
      setTimeout(() => { $('#hero').classList.add('go'); fx.celebrate(); }, reduce ? 0 : 450);
      setTimeout(() => cu.classList.remove('on', 'open'), 1500);
    }, reduce ? 50 : 850);
  }

  /* Lanjutkan: stop every preview, restart the chosen track from 0 and loop it (called inside the click, so autoplay is allowed) */
  function startChosenTrack() {
    TRACKS.forEach(n => { A[n].pause(); });
    const a = A[chosen]; if (!a) return;
    a.loop = true; a.muted = muted;
    try { a.currentTime = 0; } catch (e) {}
    const pr = a.play();
    if (pr && pr.then) pr.then(syncMusic).catch(() => { syncMusic(); toast('Ketuk tombol ▶ di pojok untuk memulai musik'); }); else syncMusic();
  }
  $('#musicContinue').addEventListener('click', () => { if (chosen && !entering) { startChosenTrack(); enterSite(); } });
  $('#musicSkip').addEventListener('click', () => { TRACKS.forEach(n => A[n].pause()); chosen = 0; syncMusic(); enterSite(); });

  /* =====================================================
     5. MAIN SITE (views)
     ===================================================== */
  let started = false;
  const SECTIONS = ['home', 'cake', 'gallery', 'things', 'memories', 'wishes', 'secret', 'extras'];
  const APPS = ['photobooth', 'quiz'];
  let openApp = null, lastFocus = null, spyActive = null, openApp_t = 0;

  function startSite() {
    if (started) return; started = true;
    initRouter(); initChrome(); initReveal(); initStripVideos();
    initBook(); initLightbox(); initPlayer(); initVoice(); initMoving(); initPetals(); initEnvelope(); initCat(); initHunt();
    initCards(); initCake(); initCalendar(); initGalleryEgg(); initFinaleSparkles();
    initApps();
  }

  /* ---------- scrapbook book (Little Frames) ----------
     Page stack: leaf i = front page 2i + back page 2i+1. Every leaf is either "turned" (t=1, lies on the left stack) or "open" (t=0, right stack).
     All motion is driven from JS (rAF / pointer), so the same code path is used for buttons, keyboard, mouse drag and touch swipe.
     Face visibility is switched explicitly at the half-turn (no reliance on backface-visibility alone), and only the leaves that can actually be seen are visible. */
  function initBook() {
    const book = $('#book'); if (!book) return;
    const view = $('#bkView'), stage = $('#bkStage'), src = $('#bkSrc'), noEl = $('#bkNo'), prev = $('#bkPrev'), next = $('#bkNext'), hint = $('#bkHint'), zoomBtn = $('#bkZoom'), scroller = $('#bkScroll');
    const pages = $$('.bk-page', src), n = pages.length / 2;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const DUR = reduce ? 1 : 720;
    const mk = (cls, parent) => { const e = document.createElement('div'); e.className = cls; parent.appendChild(e); return e; };
    const baseL = mk('bk-base bk-base--l', stage), baseR = mk('bk-base bk-base--r', stage);
    const leaves = [];
    for (let i = 0; i < n; i++) {
      const el = mk('bk-leaf', stage), f = mk('bk-face bk-face--front', el), bk = mk('bk-face bk-face--back', el);
      f.appendChild(pages[2 * i]); bk.appendChild(pages[2 * i + 1]);
      const ff = mk('bk-fold', f), fb = mk('bk-fold', bk);
      leaves.push({ el, f, bk, ff, fb, t: 0, sf: true });
    }
    const castL = mk('bk-cast bk-cast--l', stage), castR = mk('bk-cast bk-cast--r', stage);
    /* controlled warm-up: decode every page photo once (in page order, while idle) so flipping never waits on load/decode */
    let warmed = 0;
    const idle = window.requestIdleCallback || (f => setTimeout(f, 180));
    function warmNext() {
      if (warmed >= n) return;
      leaves[warmed++].el.querySelectorAll('img').forEach(im => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); });
      idle(warmNext, { timeout: 600 });
    }
    const warmIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { warmIO.disconnect(); warmNext(); } }, { rootMargin: '800px 0px' });
    warmIO.observe(book);
    let cur = 0, busy = false, queue = [], drag = null, suppress = false;

    function place(i, t) {
      const L = leaves[i]; L.t = t; const s = Math.sin(Math.PI * t);
      L.el.style.transform = 'translateZ(' + L.z + 'px) rotateY(' + (-180 * t).toFixed(2) + 'deg) rotateX(' + (s * 1.6).toFixed(2) + 'deg)';
      const sf = t < .5;
      if (L.sf !== sf) { L.sf = sf; L.f.style.visibility = sf ? 'visible' : 'hidden'; L.bk.style.visibility = sf ? 'hidden' : 'visible'; }
      const o = (s * .55).toFixed(3); L.ff.style.opacity = o; L.fb.style.opacity = o;
      castR.style.opacity = sf ? (s * .5).toFixed(3) : 0; castL.style.opacity = sf ? 0 : (s * .5).toFixed(3);
    }
    function shift(pos) { const x = pos < 1 ? -25 * (1 - pos) : pos > n - 1 ? 25 * (pos - (n - 1)) : 0; stage.style.transform = 'translate3d(' + x.toFixed(3) + '%,0,0)'; }
    function windowShow(lo, hi) { leaves.forEach((L, i) => { L.el.style.visibility = i >= lo && i <= hi ? 'visible' : 'hidden'; }); }
    function rest() {
      leaves.forEach((L, i) => { const turned = i < cur; L.z = (turned ? i : n - i) * .5; L.el.classList.remove('moving'); place(i, turned ? 1 : 0); });
      windowShow(cur - 1, cur); shift(cur); castL.style.opacity = castR.style.opacity = 0;
      baseL.style.display = cur > 0 ? '' : 'none'; baseR.style.display = cur < n ? '' : 'none';
      ui();
    }
    function ui() {
      noEl.textContent = cur === 0 ? 'cover' : cur === n ? 'the end' : (2 * cur - 1) + '–' + (2 * cur) + ' / ' + (2 * (n - 1));
      prev.disabled = cur === 0; next.disabled = cur === n;
    }
    function begin(dir) { /* prepare the leaf that is going to move */
      const i = dir > 0 ? cur : cur - 1, L = leaves[i];
      L.z = 8; L.el.classList.add('moving'); L.el.style.zIndex = 99;
      windowShow(dir > 0 ? cur - 1 : cur - 2, dir > 0 ? cur + 1 : cur);
      baseL.style.display = baseR.style.display = '';
      return i;
    }
    function animate(i, from, to, dur) {
      return new Promise(res => {
        const t0 = performance.now();
        const tick = now => {
          const k = clamp((now - t0) / dur, 0, 1), t = from + (to - from) * ease(k);
          place(i, t); shift(i + t); if (k < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
    }
    async function turn(dir, fromT) {
      const i = begin(dir), a = fromT === undefined ? (dir > 0 ? 0 : 1) : fromT, b = dir > 0 ? 1 : 0;
      busy = true; hint.classList.add('gone');
      await animate(i, a, b, Math.max(240, DUR * Math.abs(b - a)));
      leaves[i].el.style.zIndex = ''; cur += dir; busy = false; rest();
      if (queue.length) { const d = queue.shift(); step(d); }
    }
    async function cancelTurn(dir, t) { /* released too early: let the page fall back */
      const i = leaves.findIndex(L => L.el.classList.contains('moving')), b = dir > 0 ? 0 : 1;
      busy = true; await animate(i, t, b, Math.max(220, DUR * .6 * Math.abs(b - t)));
      leaves[i].el.style.zIndex = ''; busy = false; rest();
    }
    function step(dir) {
      const to = cur + dir; if (to < 0 || to > n) return;
      if (busy || drag && drag.live) { if (queue.length < 6) queue.push(dir); return; }
      turn(dir);
    }
    prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
    view.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { step(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); } });

    /* mouse drag + touch swipe (touch-action: pan-y keeps vertical scrolling; disabled while the book is zoomed so it can be panned) */
    view.addEventListener('click', e => { if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);
    view.addEventListener('pointerdown', e => {
      if (busy || e.button > 0 || book.dataset.zoom === '1') return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tm: performance.now(), live: false, i: -1, dir: 0, t: 0, x0: 0, target: e.target };
    });
    view.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.live) {
        if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
        const dir = dx < 0 ? 1 : -1, to = cur + dir; if (to < 0 || to > n) { drag = null; return; }
        drag.dir = dir; drag.i = begin(dir); drag.live = true; drag.x0 = e.clientX; drag.t = dir > 0 ? 0 : 1;
        try { view.setPointerCapture(e.pointerId); } catch (_) {}
        view.classList.add('is-drag'); hint.classList.add('gone');
      }
      const pw = view.getBoundingClientRect().width * .5 * 1.05, mv = e.clientX - drag.x0;
      drag.t = clamp(drag.dir > 0 ? -mv / pw : 1 - mv / pw, 0, 1);
      if (drag.dir < 0 && mv < 0) drag.t = 1;
      place(drag.i, drag.t); shift(drag.i + drag.t);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null; view.classList.remove('is-drag');
      if (!d.live) { if (e.type === 'pointerup' && cur === 0 && d.target.closest && d.target.closest('.bk-cover') && !d.target.closest('.bk-ph')) step(1); return; }
      suppress = true; setTimeout(() => { suppress = false; }, 350);
      const v = (e.clientX - d.x0) / Math.max(1, performance.now() - d.tm);
      const commit = e.type === 'pointercancel' ? false : d.dir > 0 ? (d.t > .3 || v < -.5) : (d.t < .7 || v > .5);
      if (commit) turn(d.dir, d.t); else cancelTurn(d.dir, d.t);
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);

    /* page unit (--u) follows the real page width, so text and decorations scale with the book */
    const size = () => book.style.setProperty('--u', (view.clientWidth / 2 / 100).toFixed(3) + 'px');
    if (window.ResizeObserver) new ResizeObserver(size).observe(view); else addEventListener('resize', size);
    size();
    /* zoom: bigger book, panned by horizontal scroll, both pages stay together */
    zoomBtn.addEventListener('click', () => {
      const z = book.dataset.zoom === '1'; book.dataset.zoom = z ? '0' : '1';
      zoomBtn.setAttribute('aria-pressed', String(!z)); zoomBtn.textContent = z ? 'perbesar buku' : 'perkecil buku';
      requestAnimationFrame(() => { size(); if (!z) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2; else scroller.scrollLeft = 0; });
    });
    rest();
  }

  /* ---------- voice note (audio diary) + one audio manager for the whole site ----------
     Rule: the main backsound and the voice note never sound together. Playing the voice note pauses the backsound (position is kept, nothing is reset);
     when the voice note is paused/ends the backsound resumes only if it was really playing before. */
  function initVoice() {
    const au = $('#aud3'); if (!au) return;
    const play = $('#vnPlay'), seek = $('#vnSeek'), time = $('#vnTime'), dur = $('#vnDur'), wave = $('#vnWave'), box = $('#vn'), err = $('#vnErr');
    const PK = [0.18,0.63,0.81,0.7,0.74,0.62,0.95,0.62,0.69,0.77,0.78,0.78,0.75,0.77,0.77,0.75,0.75,0.76,0.58,0.86,0.62,0.83,0.83,0.49,0.58,0.45,0.49,0.71,0.55,0.42,0.61,0.62,0.5,0.41,0.62,0.67,0.54,0.66,0.77,0.77,0.52,0.55,0.79,0.86,0.72,0.31,0.52,0.77,0.75,0.72,0.69,0.68,0.84,0.77,1,0.9];
    const bars = PK.map(v => { const b = document.createElement('i'); b.style.height = Math.round(18 + v * 82) + '%'; wave.appendChild(b); return b; });
    const fmt = x => { x = Math.max(0, Math.floor(x || 0)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
    let resume = 0, last = -1;
    const paint = () => {
      const d = au.duration || 60, p = clamp01(au.currentTime / d), k = Math.round(p * bars.length);
      if (k !== last) { last = k; bars.forEach((b, i) => b.classList.toggle('on', i < k)); }
      seek.value = Math.round(p * 1000); time.textContent = fmt(au.currentTime) + ' / ' + fmt(d); dur.textContent = fmt(d);
      seek.style.setProperty('--p', (p * 100) + '%');
    };
    const clamp01 = v => Math.max(0, Math.min(1, v || 0));
    const state = () => { const on = !au.paused; box.classList.toggle('playing', on); play.setAttribute('aria-label', on ? 'Jeda voice music' : 'Putar voice music'); };
    function holdMain() {
      resume = 0;
      TRACKS.forEach(n => { if (!A[n].paused) { if (n === chosen) resume = n; A[n].pause(); } });
      syncMusic();
    }
    function releaseMain() {
      if (resume && A[resume].paused && au.paused) { const p = A[resume].play(); if (p && p.catch) p.catch(() => {}); }
      resume = 0; syncMusic();
    }
    au.addEventListener('play', () => { holdMain(); state(); });
    au.addEventListener('pause', () => { state(); if (!au.ended) releaseMain(); });
    au.addEventListener('ended', () => { state(); releaseMain(); au.currentTime = 0; paint(); });
    ['timeupdate', 'loadedmetadata', 'durationchange'].forEach(e => au.addEventListener(e, paint));
    au.addEventListener('error', () => { err.hidden = false; box.classList.add('broken'); });
    /* if the backsound is started on purpose while the voice note plays, the voice note yields (never two sounds) */
    TRACKS.forEach(n => A[n].addEventListener('play', () => { if (!au.paused) { resume = 0; au.pause(); } }));
    play.addEventListener('click', () => {
      if (au.paused) { err.hidden = true; const p = au.play(); if (p && p.catch) p.catch(() => { err.hidden = false; }); } else au.pause();
    });
    seek.addEventListener('input', () => { const d = au.duration || 60; au.currentTime = (seek.value / 1000) * d; paint(); });
    paint(); state();
  }

  /* ---------- moving memories: two portrait video slots ---------- */
  function initMoving() {
    const frames = $$('.mm__frame'); if (!frames.length) return;
    const load = f => {
      if (f._tried) return; f._tried = true;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.setAttribute('aria-label', 'Video kenangan ' + (frames.indexOf(f) + 1));
      v.addEventListener('loadeddata', () => { f.classList.add('has-video'); if (f._vis) v.play().catch(() => {}); }, { once: true });
      v.addEventListener('error', () => { v.remove(); f.classList.add('no-video'); f._v = null; }, { once: true });
      f._v = v; $('.mm__screen', f).prepend(v); v.src = f.dataset.src;
    };
    const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); near.unobserve(e.target); } }), { rootMargin: '400px 0px' });
    const vis = new IntersectionObserver(es => es.forEach(e => {
      const f = e.target; f._vis = e.isIntersecting;
      if (!f._v) return;
      if (e.isIntersecting && f.classList.contains('has-video') && !openApp && !document.hidden) { try { f._v.currentTime = 0; } catch (err) {} f._v.play().catch(() => {}); }
      else if (!e.isIntersecting) { f._v.pause(); try { f._v.currentTime = 0; } catch (err) {} } else f._v.pause();
    }), { threshold: .5 });
    const mmHold = () => frames.forEach(f => f._v && f._v.pause()), mmRelease = () => frames.forEach(f => { if (f._v && f._vis && f.classList.contains('has-video') && !openApp && !document.hidden) f._v.play().catch(() => {}); });
    document.addEventListener('app:open', mmHold); document.addEventListener('app:close', () => setTimeout(mmRelease, 700));
    document.addEventListener('visibilitychange', () => document.hidden ? mmHold() : mmRelease());
    frames.forEach(f => { near.observe(f); vis.observe(f); });
    const rail = $('#mmRail'), dots = $$('#mmDots i');
    rail.addEventListener('scroll', () => {
      const w = frames[0].getBoundingClientRect().width + 16, i = clamp(Math.round(rail.scrollLeft / w), 0, dots.length - 1);
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  }

  /* ---------- sakura petals: few, only in hero + footer, only while visible ---------- */
  function initPetals() {
    if (reduce) return;
    $$('[data-petals]').forEach(box => {
      const n = innerWidth < 760 ? 5 : 8;
      for (let i = 0; i < n; i++) {
        const el = document.createElement('i'), d = rand(12, 19);
        el.style.cssText = '--x:' + rand(2, 96).toFixed(1) + '%;--s:' + Math.round(rand(12, 20)) + 'px;--d:' + d.toFixed(1) + 's;--dl:' + (-rand(0, d)).toFixed(1) + 's;--w:' + rand(3, 5).toFixed(1) + 's;--dx:' + Math.round(rand(-60, 90)) + 'px';
        box.appendChild(el);
      }
      new IntersectionObserver(es => es.forEach(e => box.classList.toggle('on', e.isIntersecting)), { threshold: 0 }).observe(box.parentElement);
    });
  }

  /* ---------- landing router: sections scroll; Photobooth / Quiz open as separate views ---------- */
  let setActiveNav = () => {};
  function initRouter() {
    const navLinks = $$('#navList a'), bv = $('#bannerVideo');
    let heroVisible = true;
    const syncHero = () => { if (heroVisible && !openApp && !document.hidden) bv.play().catch(() => {}); else bv.pause(); };
    const markOk = () => { bv.classList.add('ok'); syncHero(); };
    bv.addEventListener('loadeddata', markOk); bv.addEventListener('canplay', markOk);
    /* some browsers hold autoplay until the first touch: start the banner then */
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (bv.paused && heroVisible && !openApp) bv.play().catch(() => {}); }, { once: true, passive: true }));
    bv.addEventListener('error', () => bv.classList.remove('ok'), true);
    if (bv.readyState >= 2) markOk();
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !heroVisible) { try { bv.currentTime = 0; } catch (err) {} } heroVisible = e.isIntersecting; syncHero(); }), { threshold: .05 }).observe($('#hero'));
    document.addEventListener('visibilitychange', syncHero);
    window.__syncHero = syncHero;

    setActiveNav = id => {
      if (id === spyActive) return; spyActive = id;
      navLinks.forEach(l => { const on = l.dataset.go === id; l.classList.toggle('active', on); if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    };

    function goSection(id, { instant = false, push = false } = {}) {
      const el = document.getElementById(id); if (!el || !SECTIONS.includes(id)) return;
      if (openApp) closeApp(false);
      el.scrollIntoView({ behavior: instant || reduce ? 'auto' : 'smooth', block: 'start' });
      /* lazy images can shift the layout mid-scroll: re-aim until the section really sits under the nav */
      let n = 0, last = -1, still = 0, stop = false;
      const halt = () => { stop = true; };
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, halt, { once: true, passive: true }));
      const settle = () => {
        if (stop || openApp) return;
        const y = scrollY; still = Math.abs(y - last) < 1 ? still + 1 : 0; last = y;
        if (still >= 6 || n++ > 180) {
          const off = el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
          if (Math.abs(off) > 6 && settle.tries++ < 3) { el.scrollIntoView({ behavior: 'auto', block: 'start' }); still = 0; requestAnimationFrame(settle); }
          return;
        }
        requestAnimationFrame(settle);
      }; settle.tries = 0; requestAnimationFrame(settle);
      setActiveNav(id);
      try { history[push ? 'pushState' : 'replaceState']({ s: id }, '', '#' + id); } catch (e) {}
      closeNav();
    }
    $$('[data-go]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goSection(a.dataset.go); }));
    window.__go = goSection;

    addEventListener('popstate', () => {
      const h = (location.hash || '').replace('#', '');
      if (APPS.includes(h)) openAppView(h, null, false);
      else if (openApp) closeApp(false);
    });
    const h0 = (location.hash || '').replace('#', '');
    try { history.replaceState({ s: SECTIONS.includes(h0) ? h0 : 'home' }, '', '#' + (SECTIONS.includes(h0) ? h0 : 'home')); } catch (e) {}
    if (SECTIONS.includes(h0) && h0 !== 'home') requestAnimationFrame(() => goSection(h0, { instant: true }));
    else setActiveNav('home');
  }

  /* ---------- separate views (Photobooth / Quiz) ---------- */
  function openAppView(name, trigger, push = true) {
    if (!APPS.includes(name) || openApp === name) return;
    if (openApp) closeApp(false, true);
    const el = document.getElementById('app-' + name); if (!el) return;
    lastFocus = trigger || document.activeElement;
    const r = trigger && trigger.getBoundingClientRect ? trigger.getBoundingClientRect() : null;
    el.style.setProperty('--ox', Math.max(0, Math.min(innerWidth, r ? r.left + r.width / 2 : innerWidth / 2)) + 'px');
    el.style.setProperty('--oy', Math.max(0, Math.min(innerHeight, r ? r.top + r.height / 2 : innerHeight / 2)) + 'px');
    el.hidden = false; void el.offsetWidth; el.classList.add('open');
    document.documentElement.classList.add('is-app'); document.body.classList.add('is-app', 'app-' + name);
    openApp = name; closeNav();
    if (push) { try { history.pushState({ app: name }, '', '#' + name); } catch (e) {} }
    window.__syncHero && window.__syncHero();
    setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (e) {} }, 60);
    document.dispatchEvent(new CustomEvent('app:open', { detail: name }));
    clearTimeout(openApp_t); openApp_t = setTimeout(() => { if (openApp) document.body.classList.add('app-isolate'); }, reduce ? 60 : 760);
  }
  function closeApp(popHistory = true, quick = false) {
    if (!openApp) return;
    const name = openApp, el = document.getElementById('app-' + name);
    openApp = null;
    document.dispatchEvent(new CustomEvent('app:close', { detail: name }));
    clearTimeout(openApp_t); document.body.classList.remove('app-isolate');
    el.classList.remove('open');
    const fin = () => { if (!openApp) { document.documentElement.classList.remove('is-app'); } document.body.classList.remove('app-' + name); if (openApp !== name) el.hidden = true; };
    if (quick || reduce) { el.hidden = true; fin(); } else setTimeout(fin, 520);
    if (!quick) document.body.classList.toggle('is-app', !!openApp);
    if (popHistory && history.state && history.state.app === name) history.back();
    window.__syncHero && window.__syncHero();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function initApps() {
    $$('[data-app]').forEach(b => b.addEventListener('click', () => openAppView(b.dataset.app, b)));
    $$('[data-app-close]').forEach(b => b.addEventListener('click', () => closeApp(true)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && openApp && $('#lb').hidden) closeApp(true); });
  }

  /* ---------- strip videos: only play while on screen (muted, looping) ---------- */
  function initStripVideos() {
    const vids = $$('.sv');
    vids.forEach(v => { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.volume = 0; });
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      v._vis = e.isIntersecting;
      if (e.isIntersecting && !openApp && !document.hidden) { if (v.paused) { try { v.currentTime = 0; } catch (err) {} } v.play().catch(() => {}); }
      else if (!e.isIntersecting) { v.pause(); try { v.currentTime = 0; } catch (err) {} }
    }), { threshold: .15 });
    vids.forEach(v => { v.preload = 'metadata'; io.observe(v); });
    const hold = () => vids.forEach(v => v.pause()), release = () => vids.forEach(v => { if (v._vis && !openApp && !document.hidden) v.play().catch(() => {}); });
    document.addEventListener('app:open', hold); document.addEventListener('app:close', () => setTimeout(release, 700));
    document.addEventListener('visibilitychange', () => document.hidden ? hold() : release());
  }

  /* ---------- nav, progress, back-to-top, parallax ---------- */
  let onScroll = null, closeNav = () => {};
  function initChrome() {
    const nav = $('#nav'), toggle = $('#navToggle');
    closeNav = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => { const o = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', e => { if (!nav.contains(e.target)) closeNav(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

    const progress = $('#progressBar'), top = $('#toTop'), par = $$('[data-speed]'), secs = SECTIONS.map(id => document.getElementById(id));
    top.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); setActiveNav('home'); try { history.replaceState({ s: 'home' }, '', '#home'); } catch (e) {} });
    let ticking = false;
    onScroll = () => {
      if (openApp) { ticking = false; return; }
      const h = document.documentElement.scrollHeight - innerHeight, y = scrollY;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
      top.classList.toggle('on', y > innerHeight * .8);
      nav.classList.toggle('solid', y > 24);
      if (!reduce && y < innerHeight * 1.1) par.forEach(el => { el.style.translate = '0 ' + (y * parseFloat(el.dataset.speed) / 100) + 'px'; });
      /* scroll-spy: the last section whose top has passed the reading line */
      const line = 90 + innerHeight * .28; let cur = 'home';
      for (let i = 0; i < secs.length; i++) {
        const r = secs[i].getBoundingClientRect(); if (r.top <= line) cur = secs[i].id;
        if (!reduce && r.bottom > -50 && r.top < innerHeight + 50) secs[i].style.setProperty('--py', ((r.top + r.height / 2 - innerHeight / 2) / innerHeight * -36).toFixed(1) + 'px');
      }
      if (h > 0 && y >= h - 4) cur = 'extras';
      setActiveNav(cur);
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    addEventListener('resize', () => onScroll(), { passive: true });
    onScroll();
  }

  function initReveal() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    $$('[data-reveal], .draw, .extras__ribbon').forEach(el => io.observe(el));
    io.observe($('#finale'));
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); cio.unobserve(e.target); }
    }), { threshold: .04 });
    cio.observe($('#cards'));
  }

  function initFinaleSparkles() {
    const fs = $('#finaleStars');
    for (let i = 0; i < 12; i++) {
      const s = svgIcon('star', 'sp');
      s.style.left = rand(3, 96) + '%'; s.style.top = rand(4, 92) + '%';
      s.style.setProperty('--s', rand(8, 16) + 'px'); s.style.setProperty('--d', rand(3, 5.5) + 's'); s.style.setProperty('--dl', -rand(0, 4) + 's');
      fs.appendChild(s);
    }
  }

  /* ---------- lightbox (gallery items, dynamic) ---------- */
  let favLoaded = false;
  function initLightbox() {
    const lb = $('#lb'), img = $('#lbImg'), cnt = $('#lbCount'), fav = $('#fav');
    let items = [], i = 0, tx = 0, last = null;
    const collect = () => {
      items = $$('#gallery [data-lb]').map(b => ({ src: b.dataset.full, alt: $('img', b).alt }));
      if (favLoaded && !fav.hidden) items.push({ src: $('#favImg').dataset.full, alt: 'Favorite' });
    };
    const label = n => String(n + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    const show = n => {
      i = (n + items.length) % items.length;
      img.classList.add('swap');
      setTimeout(() => {
        img.onload = () => img.classList.remove('swap');
        img.src = items[i].src; img.alt = items[i].alt; cnt.textContent = label(i);
        if (img.complete) img.classList.remove('swap');
      }, 160);
    };
    const open = n => {
      collect(); if (!items.length) return;
      last = document.activeElement; lb.hidden = false; document.body.style.overflow = 'hidden';
      i = n; img.classList.remove('swap'); img.src = items[n].src; img.alt = items[n].alt; cnt.textContent = label(n);
      requestAnimationFrame(() => lb.classList.add('on'));
      $('#lbClose').focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('on'); document.body.style.overflow = '';
      setTimeout(() => { lb.hidden = true; img.removeAttribute('src'); }, 400);
      if (last) last.focus({ preventScroll: true });
    };
    $$('#gallery [data-lb]').forEach(b => b.addEventListener('click', () => open($$('#gallery [data-lb]').indexOf(b))));
    $('#favImg').addEventListener('click', () => { collect(); open(items.length - 1); });
    $('#lbClose').onclick = close;
    $('#lbPrev').onclick = () => show(i - 1);
    $('#lbNext').onclick = () => show(i + 1);
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb__fig')) close(); });
    addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
    lb.addEventListener('touchstart', e => { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 45) show(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------- hidden frame (easter egg): tap the little cat 3x ---------- */
  function initGalleryEgg() {
    const btn = $('#galCat'), fav = $('#fav'), favImg = $('#favImg'), slot = $('#favSlot');
    const lines = ['hm?', 'psst… sekali lagi', 'ada yang sembunyi…'];
    let taps = 0, found = false;
    btn.addEventListener('click', () => {
      if (found) { say(btn, 'sudah ketemu ✦'); return; }
      say(btn, lines[taps]); taps++;
      if (taps >= 3) {
        found = true;
        setTimeout(() => {
          fav.hidden = false; fav.classList.add('reveal');
          probeImage(OPTIONAL.favorite, () => { favImg.src = OPTIONAL.favorite; favImg.style.display = 'block'; slot.hidden = true; favLoaded = true; });
          fav.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
          toast('✦ Frame rahasia ditemukan');
          fx.confetti(fx.W / 2, fx.H * .6, 22, { spread: 1.6, speed: 9 });
        }, 500);
      }
    });
  }

  /* ---------- cinema video player ---------- */
  function initPlayer() {
    const player = $('#player'), v = $('#mainVideo'), big = $('#bigPlay'), pp = $('#pp'), ico = $('#ppIcon');
    const seek = $('#seek'), tc = $('#tc'), mute = $('#mute'), fs = $('#fs');
    const path = ico.firstElementChild;
    v.muted = true;
    const ok = () => player.classList.add('has-video'), bad = () => player.classList.remove('has-video');
    v.addEventListener('loadeddata', ok); v.addEventListener('error', bad, true);
    if (v.readyState >= 2) ok();
    const toggle = () => { if (!player.classList.contains('has-video')) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
    big.onclick = toggle; pp.onclick = toggle; v.onclick = toggle;
    const setState = p => { player.classList.toggle('playing', p); path.setAttribute('d', p ? PAUSE : PLAY); };
    v.addEventListener('play', () => setState(true)); v.addEventListener('pause', () => setState(false)); v.addEventListener('ended', () => setState(false));
    v.addEventListener('timeupdate', () => {
      const p = v.duration ? v.currentTime / v.duration * 1000 : 0;
      seek.value = p; seek.style.setProperty('--p', p / 10 + '%'); tc.textContent = fmtTime(v.currentTime).padStart(5, '0');
    });
    seek.addEventListener('input', () => { if (v.duration) v.currentTime = seek.value / 1000 * v.duration; });
    mute.onclick = () => { v.muted = !v.muted; mute.textContent = v.muted ? 'MUTED' : 'SOUND'; };
    fs.onclick = () => {
      const el = $('.player__screen', player);
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    };
    new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && !v.paused) v.pause(); }), { threshold: .1 }).observe(player);
    document.addEventListener('app:open', () => { if (!v.paused) v.pause(); });
    v.preload = 'metadata';
  }

  /* ---------- envelope + hidden secret message ---------- */
  /* ---------- secret envelope: locked until the star mission is done ---------- */
  const hunt = { found: new Set(), total: 0, unlocked: false, sync: () => {} };
  function initEnvelope() {
    const env = $('#envelope'), hintEl = $('#envHint'), secret = $('#secretMsg'), tpl = $('#secretTpl'), huntHint = $('#huntHint');
    const closeMsg = () => { secret.hidden = true; secret.classList.remove('show'); secret.innerHTML = ''; };
    env.addEventListener('click', () => {
      if (!hunt.unlocked) {
        env.classList.remove('shake'); void env.offsetWidth; env.classList.add('shake');
        const left = hunt.total - hunt.found.size;
        huntHint.textContent = 'Masih terkunci. Cari ' + left + ' bintang lagi untuk membukanya.';
        toast('🔒 ' + left + ' bintang lagi');
        return;
      }
      const open = env.classList.toggle('open');
      env.setAttribute('aria-expanded', String(open));
      hintEl.textContent = open ? 'tap again to close' : 'ketuk amplopnya untuk membaca';
      if (open) {
        setTimeout(() => {
          if (!env.classList.contains('open')) return;
          secret.innerHTML = ''; secret.appendChild(tpl.content.cloneNode(true));
          secret.hidden = false; secret.classList.remove('show'); void secret.offsetWidth; secret.classList.add('show');
          secret.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }, reduce ? 0 : 750);
      } else closeMsg();
    });
  }

  /* ---------- cat companion + generic speech bubble ---------- */
  const bubble = $('#bubble'); let bubbleT;
  function say(el, text) {
    const r = el.getBoundingClientRect();
    bubble.textContent = text;
    const bw = Math.min(230, innerWidth - 24);
    bubble.style.maxWidth = bw + 'px';
    let left = r.left + r.width / 2 - 30;
    left = Math.max(12, Math.min(left, innerWidth - bw - 12));
    bubble.style.left = left + 'px';
    bubble.style.setProperty('--tx', Math.max(12, r.left + r.width / 2 - left - 6) + 'px');
    bubble.classList.add('on');
    bubble.style.top = Math.max(10, r.top - bubble.offsetHeight - 14) + 'px';
    clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('on'), 2400);
  }
  function initCat() {
    const lines = ['meow ♡', 'Happy birthday, Teh Alia!', 'psst… ada bintang yang sembunyi ✦', 'u look very special.', 'purr…', 'selamat ulang tahun yaa!', 'masih ada yang belum kamu temukan.'];
    let k = 0;
    $$('.cat-click').forEach(c => {
      const go = () => say(c, lines[k++ % lines.length]);
      c.addEventListener('click', go);
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2300); }

  /* ---------- star hunt: 8 fixed stars, progress kept in memory (resets on reload / new tab) ---------- */
  const HINTS = [
    ['Mulai dari sambutan paling atas, dekat tanggal spesialnya.', 'Cari bintang kecil di samping tulisan 27 NOVEMBER 2026 di bagian Home.'],
    ['Ada yang bersembunyi dekat kue stroberi matcha.', 'Lihat kalimat di bawah judul kue, setelah "Ketuk kuenya 11 kali".'],
    ['Satu bintang menunggu di Photo Gallery.', 'Di samping catatan kecil "tap foto untuk memperbesar".'],
    ['Kartu-kartu kecil menjaga satu bintang.', 'Di catatan bawah judul 19 Little Things.'],
    ['Bintang ini suka nonton di bioskop kecil.', 'Di akhir film, tepat di samping tulisan FIN.'],
    ['Ada bintang yang menempel di kalender.', 'Tepat di bawah pesan tanggal 27 November.'],
    ['Surat itu menyimpan sesuatu di ujungnya.', 'Di bagian bawah surat, di samping hati kecil.'],
    ['Bintang terakhir ada di penutup website.', 'Di samping "Happy 19th Birthday, Alia." paling bawah.']
  ];
  function initHunt() {
    const slots = $$('[data-star]'), total = slots.length; hunt.total = total;
    const cntEl = $('#huntCount'), totEl = $('#huntTotal'), dotsEl = $('#huntDots'), done = $('#huntDone'), bar = $('#huntBar');
    const chip = $('#starChip'), chipC = $('#chipCount'), chipT = $('#chipTotal'), hintTxt = $('#huntHint'), hintBtn = $('#huntHintBtn');
    const env = $('#envelope'), envHint = $('#envHint'), huntText = $('#huntText');
    totEl.textContent = total; chipT.textContent = total;
    /* progress lives in page memory only: a reload or a new tab starts again from 0 */
    const saved = [], persist = () => {};
    const dotsS = slots.map(() => { const d = svgIcon('star', 'dstar'); dotsEl.appendChild(d); return d; });
    const level = slots.map(() => 0);

    function render() {
      const n = hunt.found.size;
      cntEl.textContent = n; chipC.textContent = n; bar.style.transform = 'scaleX(' + (total ? n / total : 0) + ')';
      chip.classList.toggle('full', n === total);
    }
    function unlockUI(animate) {
      hunt.unlocked = true; done.hidden = false;
      env.classList.remove('locked'); env.setAttribute('aria-label', 'Buka amplop rahasia');
      if (animate) { env.classList.add('unlocking'); setTimeout(() => env.classList.remove('unlocking'), 1500); }
      envHint.textContent = 'ketuk amplopnya untuk membaca';
      huntText.textContent = 'Kamu menemukan semuanya! Sekarang amplop rahasianya bisa dibuka.';
      hintBtn.hidden = true; hintTxt.textContent = '';
    }
    slots.forEach((slot, n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hunt-star'; b.setAttribute('aria-label', 'Bintang tersembunyi ' + (n + 1));
      b.appendChild(svgIcon('star'));
      const mark = (live) => {
        b.classList.add('found'); b.setAttribute('aria-label', 'Bintang sudah ditemukan'); dotsS[n].classList.add('found');
        if (live) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 900); const r = b.getBoundingClientRect(); fx.confetti(r.left + r.width / 2, r.top + r.height / 2, 14, { spread: 1.4, speed: 6 }); }
      };
      if (saved.includes(n)) { hunt.found.add(n); mark(false); }
      b.addEventListener('click', () => {
        if (hunt.found.has(n)) { say(b, 'Bintang ini sudah kamu temukan ✦'); return; }
        hunt.found.add(n); mark(true); persist(); render(); chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
        hintTxt.textContent = '';
        if (hunt.found.size < total) toast('✦ ' + hunt.found.size + ' / ' + total + ' Stars Found');
        else { toast('✦ ' + total + ' / ' + total + ' Stars Found'); unlockUI(true); setTimeout(() => openReward(true), 700); }
      });
      slot.appendChild(b);
    });
    render(); chip.hidden = false;
    if (hunt.found.size === total && total) unlockUI(false);

    chip.addEventListener('click', () => window.__go('secret'));
    hintBtn.addEventListener('click', () => {
      const i = slots.findIndex((_, k) => !hunt.found.has(k)); if (i < 0) return;
      const lv = Math.min(level[i]++, 2);
      if (lv < 2) hintTxt.textContent = '✦ ' + HINTS[i][lv] + (lv === 0 ? ' (tekan lagi untuk petunjuk lebih jelas)' : '');
      else {
        hintTxt.textContent = '✦ Ini dia, kuberi tahu tempatnya.';
        slots[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        const star = slots[i].querySelector('.hunt-star'); star.classList.add('pulse'); setTimeout(() => star.classList.remove('pulse'), 4200);
      }
    });

    function openReward() {
      const r = $('#reward'), burst = $('#burst'); burst.innerHTML = '';
      const cols = ['#a96b75', '#d6aeb2', '#f1d8d8', '#9db685', '#2a292b'];
      for (let i = 0; i < 36; i++) {
        const c = document.createElement('i'); c.className = 'cf';
        const a = rand(0, Math.PI * 2), d = rand(90, 240);
        c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px');
        c.style.setProperty('--r', rand(-360, 360) + 'deg'); c.style.setProperty('--c', cols[i % cols.length]);
        burst.appendChild(c);
      }
      r.hidden = false; void r.offsetWidth; r.classList.add('on'); $('#rewardClose').focus({ preventScroll: true });
    }
    const closeReward = () => { const r = $('#reward'); if (r.hidden) return; r.classList.remove('on'); setTimeout(() => { r.hidden = true; }, 500); window.__go('secret'); };
    $('#rewardClose').addEventListener('click', closeReward);
    $('#reward').addEventListener('click', e => { if (e.target.id === 'reward') closeReward(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#reward').hidden) closeReward(); });
  }

  /* ---------- 19 little things: 3D flip cards ---------- */
  function initCards() {
    const cards = $$('.fc'), count = $('#cardCount'), barEl = $('#cardBar'), done = $('#cardsDone');
    const opened = new Set(), total = cards.length;
    function update() {
      count.textContent = opened.size;
      barEl.style.transform = 'scaleX(' + opened.size / total + ')';
      if (opened.size === total && done.hidden) {
        done.hidden = false;
        fx.confetti(fx.W / 2, fx.H * .55, 34, { spread: 2.4, speed: 11 });
        done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    }
    cards.forEach((c, i) => c.addEventListener('click', () => {
      const f = c.classList.toggle('flipped');
      c.setAttribute('aria-pressed', String(f));
      if (f && !opened.has(i)) { opened.add(i); update(); }   // each card counts once
    }));
    $('#cardReset').addEventListener('click', () => {
      cards.forEach(c => { c.classList.remove('flipped'); c.setAttribute('aria-pressed', 'false'); });
      opened.clear(); done.hidden = true; update();
    });
  }

  /* ---------- strawberry matcha cake: exactly 11 taps ---------- */
  function initCake() {
    const cake = $('#cakeBtn'), cnt = $('#cakeCount'), bar = $('#cakeBar'), msgBox = $('#cakeMsg'), sub = $('#cakeSubTxt');  /* text lives in its own span, so the star slot next to it is never wiped */
    const NEED = 11; let taps = 0, out = false, lastTap = 0;
    const paint = () => { cnt.textContent = taps; bar.style.transform = 'scaleX(' + taps / NEED + ')'; cake.style.setProperty('--f', (1 - taps / NEED * .5).toFixed(2)); };
    cake.addEventListener('click', () => {
      if (out) return;
      const now = performance.now();
      if (now - lastTap < 150) return;       // one physical tap = one count
      lastTap = now; taps++;
      cake.classList.remove('tap'); void cake.offsetWidth; cake.classList.add('tap');
      paint();
      if (taps >= NEED) {
        out = true; cake.classList.add('out');
        sub.textContent = 'Lilinnya sudah padam.';
        setTimeout(() => {
          msgBox.hidden = false;
          const r = cake.getBoundingClientRect();
          fx.confetti(r.left + r.width / 2, r.top + r.height * .3, 36, { spread: 2.6, speed: 10 });
        }, 600);
      }
    });
    $('#cakeAgain').addEventListener('click', () => {
      taps = 0; out = false; lastTap = 0; cake.classList.remove('out', 'tap');
      msgBox.hidden = true; sub.textContent = 'Ketuk kuenya 11 kali untuk meniup lilinnya.'; paint();
    });
    paint();
  }

  /* ---------- calendar (slot waits for the PDF-derived image) ---------- */
  function initCalendar() {
    const dateBtn = $('#calDate'), msg = $('#calMsg'), img = $('#calImg'), slot = $('#calSlot'), shot = $('#calShot'), hot = $('#calHot');
    let probed = false;
    const probe = () => {
      if (probed) return; probed = true;
      probeImage(OPTIONAL.calendar, () => { img.src = OPTIONAL.calendar; shot.hidden = false; slot.hidden = true; });
    };
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) probe(); }), { rootMargin: '200px' }).observe($('#calArt'));
    const open28 = (el) => {
      dateBtn.classList.add('seen'); hot.classList.add('seen');
      msg.textContent = 'Catat ya: 27 November 2026. Hari spesial kamu ✦';
      const r = el.getBoundingClientRect();
      fx.confetti(r.left + r.width / 2, r.top + r.height / 2, 18, { spread: 1.6, speed: 8 });
    };
    dateBtn.addEventListener('click', () => open28(dateBtn));
    hot.addEventListener('click', () => open28(hot));
  }
})();
