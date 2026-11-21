/* =========================================================
   VIRTUAL PHOTOBOOTH — runs fully in the browser.
   Photos are decoded locally, never uploaded, never stored.
   The preview and the downloaded PNG use the SAME render()
   function (logical coordinates + scale), so what you see is
   exactly what you get — no element screenshots involved.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const TAU = Math.PI * 2;

  const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
  const HAND = 'Caveat, "Segoe Script", "Bradley Hand", cursive';
  const SANS = '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
  const MONO = '"DM Sans", ui-monospace, Menlo, Consolas, monospace';

  /* ---------- formats ---------- */
  /* 5.1 x 15.2 cm at 300 DPI = 602 x 1795 px (1:3 strip). Every format uses the same print area. */
  const PW = 602, PH = 1795;
  const FORMATS = [
    { id: 'single', n: 1, label: 'Single Photo', W: PW, H: PH },
    { id: 'double', n: 2, label: 'Double Photo', W: PW, H: PH },
    { id: 'triple', n: 3, label: 'Triple Photo', W: PW, H: PH },
    { id: 'four', n: 4, label: 'Four Photo', W: PW, H: PH }
  ];

  /* ---------- tiny drawing helpers ---------- */
  function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function txt(c, s, x, y, font, col, align = 'center', ls = 0, base = 'alphabetic') {
    c.save(); c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = base;
    if ('letterSpacing' in c) c.letterSpacing = ls + 'px';
    c.fillText(s, x, y); c.restore();
  }
  function sparkle(c, x, y, r, col) {
    c.save(); c.fillStyle = col; c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.restore();
  }
  function heart(c, x, y, s, col) {
    c.save(); c.translate(x, y); c.scale(s / 20, s / 20); c.fillStyle = col; c.beginPath();
    c.moveTo(0, 8); c.bezierCurveTo(-18, -4, -9, -16, 0, -7); c.bezierCurveTo(9, -16, 18, -4, 0, 8); c.fill(); c.restore();
  }
  function bow(c, cx, cy, s, col, dk) {
    c.save(); c.translate(cx, cy); c.scale(s / 100, s / 100);
    c.fillStyle = dk; c.beginPath(); c.moveTo(-4, 6); c.lineTo(-30, 52); c.lineTo(-15, 48); c.lineTo(-8, 62); c.lineTo(4, 10); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(4, 6); c.lineTo(30, 52); c.lineTo(15, 48); c.lineTo(8, 62); c.lineTo(-4, 10); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-22, -36, -62, -32, -58, 0); c.bezierCurveTo(-62, 32, -22, 36, 0, 0); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(22, -36, 62, -32, 58, 0); c.bezierCurveTo(62, 32, 22, 36, 0, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)';
    c.beginPath(); c.ellipse(-32, -9, 17, 6, -.3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(32, -9, 17, 6, .3, 0, TAU); c.fill();
    c.fillStyle = dk; rr(c, -9, -12, 18, 24, 7); c.fill();
    c.fillStyle = col; rr(c, -5, -9, 6, 18, 3); c.fill();
    c.restore();
  }
  function cloud(c, x, y, s, col) {
    c.save(); c.fillStyle = col; c.beginPath();
    c.arc(x, y, s * .5, 0, TAU); c.arc(x + s * .55, y - s * .18, s * .62, 0, TAU); c.arc(x + s * 1.15, y, s * .5, 0, TAU);
    c.rect(x, y, s * 1.15, s * .5); c.fill(); c.restore();
  }
  function petal(c, x, y, s, rot, col) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath();
    c.moveTo(0, -s); c.bezierCurveTo(s * .9, -s * .7, s * .8, s * .5, 0, s); c.bezierCurveTo(-s * .8, s * .5, -s * .9, -s * .7, 0, -s); c.fill(); c.restore();
  }
  function blossom(c, x, y, r, col, core) {
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; petal(c, x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, a + Math.PI / 2, col); }
    c.fillStyle = core; c.beginPath(); c.arc(x, y, r * .18, 0, TAU); c.fill();
  }
  function tape(c, x, y, w, h, rot, col) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.globalAlpha = .82; c.fillRect(-w / 2, -h / 2, w, h);
    c.globalAlpha = .35; c.fillStyle = '#fff'; for (let i = -w / 2; i < w / 2; i += 7) c.fillRect(i, -h / 2, 2, h);
    c.restore();
  }
  function catEars(c, x, y, w, col, inner) {
    // simple, explicit ears (left and right)
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x + w * .04, y - 1); c.lineTo(x + w * .085, y - w * .11); c.lineTo(x + w * .2, y - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + w * .96, y - 1); c.lineTo(x + w * .915, y - w * .11); c.lineTo(x + w * .8, y - 1); c.closePath(); c.fill();
    c.fillStyle = inner;
    c.beginPath(); c.moveTo(x + w * .075, y - 3); c.lineTo(x + w * .095, y - w * .07); c.lineTo(x + w * .15, y - 3); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + w * .925, y - 3); c.lineTo(x + w * .905, y - w * .07); c.lineTo(x + w * .85, y - 3); c.closePath(); c.fill();
  }
  function paw(c, x, y, s, col) {
    c.save(); c.fillStyle = col; c.beginPath(); c.ellipse(x, y + s * .25, s * .5, s * .4, 0, 0, TAU); c.fill();
    [[-.55, -.25], [-.2, -.6], [.2, -.6], [.55, -.25]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * .2, s * .26, 0, 0, TAU); c.fill(); });
    c.restore();
  }
  function catFace(c, x, y, s, line, fill) {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.lineWidth = 4; c.strokeStyle = line; c.fillStyle = fill; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-46, -8); c.lineTo(-44, -52); c.lineTo(-14, -34); c.quadraticCurveTo(0, -38, 14, -34); c.lineTo(44, -52); c.lineTo(46, -8); c.quadraticCurveTo(52, 30, 0, 38); c.quadraticCurveTo(-52, 30, -46, -8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = line; c.beginPath(); c.arc(-18, 2, 4.2, 0, TAU); c.arc(18, 2, 4.2, 0, TAU); c.fill();
    c.fillStyle = '#e48fa6'; c.beginPath(); c.moveTo(-5, 12); c.lineTo(5, 12); c.lineTo(0, 18); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 18); c.quadraticCurveTo(-4, 24, -9, 22); c.moveTo(0, 18); c.quadraticCurveTo(4, 24, 9, 22); c.stroke();
    c.lineWidth = 2.5; [[-30, 14, -64, 8], [-30, 20, -64, 22], [30, 14, 64, 8], [30, 20, 64, 22]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
    c.restore();
  }

  /* ---------- the 12 frame templates ---------- */
  /* m = margins as fractions of canvas width. Each template owns its paper, slot style and decoration. */
  const TEMPLATES = [
    {
      id: 'gingham', name: 'Pink Gingham', m: { top: .09, side: .085, bottom: .2, gap: .04 }, radius: .02, border: { w: .014, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#fff4f7'; c.fillRect(0, 0, W, H); const s = W * .05;
        c.fillStyle = 'rgba(238,150,176,.34)'; for (let y = 0; y < H; y += s * 2) c.fillRect(0, y, W, s);
        for (let x = 0; x < W; x += s * 2) c.fillRect(x, 0, s, H);
      },
      deco(c, W, H, slots) {
        bow(c, W / 2, slots[0].y - W * .005, W * .17, '#ef8fab', '#d4668a');
        const y = H - W * .07; txt(c, 'little moments', W / 2, y - W * .025, `600 ${W * .085}px ${HAND}`, '#c4607e'); txt(c, '27 · 11 · 2026', W / 2, y + W * .04, `500 ${W * .026}px ${SANS}`, '#b98593', 'center', W * .01);
        heart(c, W * .1, H - W * .1, W * .045, '#ef8fab'); heart(c, W * .9, H - W * .1, W * .045, '#ef8fab');
      }
    },
    {
      id: 'matcha', name: 'Matcha Diary', m: { top: .1, side: .11, bottom: .2, gap: .055 }, radius: .004, border: null, shadow: false, tilt: 1.2,
      paper(c, W, H) {
        c.fillStyle = '#e6eedc'; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(111,143,90,.28)'; c.lineWidth = 2; for (let y = W * .06; y < H; y += W * .045) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.strokeStyle = 'rgba(196,106,120,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * .065, 0); c.lineTo(W * .065, H); c.moveTo(W * .075, 0); c.lineTo(W * .075, H); c.stroke();
        c.fillStyle = 'rgba(111,143,90,.5)'; for (let y = W * .12; y < H - W * .1; y += W * .28) { c.beginPath(); c.arc(W * .03, y, W * .011, 0, TAU); c.fill(); }
      },
      under(c, r, i, W) {
        const p = W * .022; c.save(); c.shadowColor = 'rgba(60,80,40,.35)'; c.shadowBlur = W * .02; c.shadowOffsetY = W * .008; c.fillStyle = '#fffdf8';
        c.fillRect(r.x - p, r.y - p, r.w + p * 2, r.h + p * 2); c.restore();
        tape(c, r.x + r.w * .12, r.y - p * .6, W * .12, W * .035, -.35, i % 2 ? '#f2b8c6' : '#b9d19f');
        tape(c, r.x + r.w * .88, r.y + r.h + p * .6, W * .12, W * .035, -.35, i % 2 ? '#b9d19f' : '#f2b8c6');
      },
      deco(c, W, H) {
        const y = H - W * .13; c.fillStyle = '#fffdf8'; rr(c, W * .2, y - W * .05, W * .6, W * .11, W * .01); c.fill();
        txt(c, 'matcha diary', W / 2, y + W * .01, `600 ${W * .07}px ${HAND}`, '#5f7f4b'); txt(c, '27.11.2026', W / 2, y + W * .05, `500 ${W * .024}px ${SANS}`, '#8aa275', 'center', W * .012);
        [[.88, .93, .8], [.94, .9, -.6]].forEach(([x, yy, rot]) => { c.save(); c.translate(W * x, H * yy); c.rotate(rot); c.fillStyle = '#9db685'; c.beginPath(); c.ellipse(0, 0, W * .05, W * .022, 0, 0, TAU); c.fill(); c.restore(); });
      }
    },
    {
      id: 'kitty', name: 'Kitty Photobooth', m: { top: .12, side: .1, bottom: .24, gap: .07 }, radius: .05, border: { w: .014, col: '#f4b2c3' }, shadow: false,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffeef3'); g.addColorStop(.5, '#fffafb'); g.addColorStop(1, '#ffe9f0'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = mulberry(7); for (let i = 0; i < 16; i++) paw(c, R() * W, R() * H, W * (.018 + R() * .014), 'rgba(244,178,195,.35)');
      },
      deco(c, W, H, slots) {
        slots.forEach((r) => { catEars(c, r.x, r.y, r.w, '#f4b2c3', '#fde3ea'); });
        const y = H - W * .125; catFace(c, W / 2, y, W * .21, '#5a4850', '#fff'); txt(c, 'meow', W * .22, y + W * .02, `600 ${W * .075}px ${HAND}`, '#d4668a'); txt(c, '19', W * .78, y + W * .03, `600 ${W * .09}px ${HAND}`, '#d4668a');
        sparkle(c, W * .1, H * .045, W * .03, '#f4b2c3'); sparkle(c, W * .9, H * .06, W * .022, '#f4b2c3');
      }
    },
    {
      id: 'film', name: 'Vintage Film', m: { top: .075, side: .175, bottom: .11, gap: .035 }, radius: 0, border: null, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#1b1917'; c.fillRect(0, 0, W, H);
        const hw = W * .05, hh = W * .034, step = W * .075; c.fillStyle = '#e8dcc3';
        for (let y = W * .025; y < H - hh; y += step) { rr(c, W * .055, y, hw, hh, W * .007); c.fill(); rr(c, W - W * .055 - hw, y, hw, hh, W * .007); c.fill(); }
      },
      deco(c, W, H, slots) {
        slots.forEach((r, i) => { txt(c, `${12 + i}A`, r.x + W * .01, r.y - W * .006, `600 ${W * .026}px ${MONO}`, '#e9a14a', 'left', 2); txt(c, '▸', r.x + r.w - W * .01, r.y - W * .006, `600 ${W * .026}px ${MONO}`, '#e9a14a', 'right'); });
        txt(c, 'FILM 400  ·  27.11.26', W / 2, H - W * .04, `600 ${W * .03}px ${MONO}`, '#e9a14a', 'center', W * .006);
      }
    },
    {
      id: 'polaroid', name: 'Classic Polaroid', m: { top: .08, side: .12, bottom: .12, gap: .115 }, radius: 0, border: null, shadow: false, tilt: 1.4,
      paper(c, W, H) {
        const g = c.createRadialGradient(W / 2, H / 2, W * .2, W / 2, H / 2, H * .75); g.addColorStop(0, '#f1ece6'); g.addColorStop(1, '#ddd5cc'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
      under(c, r, i, W) {
        const p = W * .028; c.save(); c.shadowColor = 'rgba(40,30,20,.4)'; c.shadowBlur = W * .03; c.shadowOffsetY = W * .012; c.fillStyle = '#fdfbf7';
        c.fillRect(r.x - p, r.y - p, r.w + p * 2, r.h + p + W * .095); c.restore();
        txt(c, i % 2 ? 'with you ♡' : 'always & forever', r.x + r.w / 2, r.y + r.h + W * .068, `600 ${W * .05}px ${HAND}`, '#6a5f58');
      },
    },
    {
      id: 'ribbon', name: 'Ribbon & Bow', m: { top: .08, side: .14, bottom: .22, gap: .045 }, radius: .012, border: { w: .012, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#fbe4e9'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,.55)';
        for (let y = W * .04; y < H; y += W * .09) for (let x = (Math.round(y / (W * .09)) % 2 ? W * .045 : 0) + W * .02; x < W; x += W * .09) { c.beginPath(); c.arc(x, y, W * .008, 0, TAU); c.fill(); }
        const rx = W * .045, rw = W * .055; const g = c.createLinearGradient(rx, 0, rx + rw, 0); g.addColorStop(0, '#e0708f'); g.addColorStop(.5, '#f6a5bc'); g.addColorStop(1, '#d95f80'); c.fillStyle = g; c.fillRect(rx, 0, rw, H);
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.setLineDash([8, 9]); c.beginPath(); c.moveTo(rx + 7, 0); c.lineTo(rx + 7, H); c.moveTo(rx + rw - 7, 0); c.lineTo(rx + rw - 7, H); c.stroke(); c.setLineDash([]);
      },
      under(c, r, i, W) {
        c.save(); c.fillStyle = '#fff'; const b = W * .014; c.shadowColor = 'rgba(190,90,120,.35)'; c.shadowBlur = W * .02;
        for (let x = r.x - b; x < r.x + r.w + b; x += b * 1.6) { c.beginPath(); c.arc(x + b, r.y - b * .4, b, 0, TAU); c.arc(x + b, r.y + r.h + b * .4, b, 0, TAU); c.fill(); }
        for (let y = r.y - b; y < r.y + r.h + b; y += b * 1.6) { c.beginPath(); c.arc(r.x - b * .4, y + b, b, 0, TAU); c.arc(r.x + r.w + b * .4, y + b, b, 0, TAU); c.fill(); }
        c.fillRect(r.x - b, r.y - b, r.w + b * 2, r.h + b * 2); c.restore();
      },
      deco(c, W, H) {
        bow(c, W / 2, H - W * .185, W * .16, '#ea7f9f', '#c85378'); txt(c, 'wrapped with love', W / 2, H - W * .028, `600 ${W * .06}px ${HAND}`, '#c4607e');
      }
    },
    {
      id: 'retro', name: 'Retro Photostrip', m: { top: .15, side: .08, bottom: .14, gap: .028 }, radius: 0, border: { w: .01, col: '#f4f1ea' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#121212'; c.fillRect(0, 0, W, H); c.fillStyle = '#e9c46a';
        for (let x = W * .06; x < W; x += W * .068) { c.beginPath(); c.arc(x, W * .035, W * .009, 0, TAU); c.fill(); c.beginPath(); c.arc(x, H - W * .02, W * .007, 0, TAU); c.fill(); }
      },
      deco(c, W, H) {
        txt(c, 'PHOTO BOOTH', W / 2, W * .105, `700 ${W * .075}px ${SERIF}`, '#f4f1ea', 'center', W * .012); c.fillStyle = '#c4506d'; c.fillRect(W * .3, W * .125, W * .4, 3);
        txt(c, '★  THANK YOU  ★  27.11.26  ★', W / 2, H - W * .055, `500 ${W * .027}px ${SANS}`, '#f4f1ea', 'center', W * .012);
      }
    },
    {
      id: 'cloudy', name: 'Cloudy Memories', m: { top: .1, side: .1, bottom: .2, gap: .045 }, radius: .085, border: { w: .014, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfe3f3'); g.addColorStop(.55, '#f1e6f3'); g.addColorStop(1, '#fde6ee'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = mulberry(11); for (let i = 0; i < 9; i++) cloud(c, R() * W * .9, R() * H, W * (.06 + R() * .06), 'rgba(255,255,255,.55)');
        for (let i = 0; i < 14; i++) sparkle(c, R() * W, R() * H, W * (.008 + R() * .01), 'rgba(255,255,255,.9)');
      },
      deco(c, W, H, slots) {
        const r0 = slots[0], rl = slots[slots.length - 1]; cloud(c, r0.x - W * .045, r0.y - W * .02, W * .12, '#fff'); cloud(c, r0.x + r0.w - W * .09, r0.y - W * .035, W * .1, '#fff');
        cloud(c, rl.x + r0.w * .02, rl.y + rl.h - W * .02, W * .14, '#fff'); cloud(c, rl.x + rl.w - W * .1, rl.y + rl.h - W * .035, W * .12, '#fff');
        txt(c, 'soft & cloudy', W / 2, H - W * .075, `600 ${W * .08}px ${HAND}`, '#7d96ad'); txt(c, '♡ 27.11.26 ♡', W / 2, H - W * .033, `500 ${W * .025}px ${SANS}`, '#9aaabb', 'center', W * .01);
      }
    },
    {
      id: 'blossom', name: 'Cherry Blossom', m: { top: .095, side: .1, bottom: .2, gap: .045 }, radius: .03, border: { w: .016, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#fff6f8'; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#9a7468'; c.lineCap = 'round'; c.lineWidth = W * .012; c.beginPath(); c.moveTo(W * 1.02, W * .02); c.bezierCurveTo(W * .82, W * .06, W * .7, W * .02, W * .58, W * .08); c.stroke();
        c.lineWidth = W * .007; c.beginPath(); c.moveTo(W * .84, W * .05); c.quadraticCurveTo(W * .88, W * .13, W * .82, W * .18); c.stroke();
        const R = mulberry(5); [[.62, .075], [.7, .045], [.78, .06], [.86, .1], [.83, .17], [.93, .05], [.55, .09]].forEach(([x, y]) => blossom(c, W * x, W * y, W * .042, '#f7bfd0', '#d46a8d'));
        for (let i = 0; i < 18; i++) petal(c, R() * W, R() * H, W * (.012 + R() * .01), R() * 6, 'rgba(244,170,195,.55)');
      },
      deco(c, W, H, slots) {
        blossom(c, W * .06, slots[0].y + W * .02, W * .05, '#f7bfd0', '#d46a8d'); blossom(c, W * .94, slots[slots.length - 1].y + slots[0].h - W * .02, W * .05, '#f7bfd0', '#d46a8d');
        txt(c, 'sakura days', W / 2, H - W * .085, `italic 300 ${W * .105}px ${SERIF}`, '#b5566f'); txt(c, '27 · 11 · 2026', W / 2, H - W * .04, `500 ${W * .025}px ${SANS}`, '#c797a4', 'center', W * .012);
      }
    },
    {
      id: 'magazine', name: 'Pastel Magazine', m: { top: .32, side: .08, bottom: .13, gap: .03 }, radius: 0, border: null, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#f5f2ee'; c.fillRect(0, 0, W, H); c.fillStyle = '#f2c9d3'; c.fillRect(0, 0, W, W * .035);
        c.fillStyle = '#cfe0bd'; c.fillRect(0, W * .035, W * .3, W * .012);
      },
      under(c, r, i, W) { const o = W * .016; c.fillStyle = i % 2 ? '#d7e6c8' : '#f3cdd8'; c.fillRect(r.x + o, r.y + o, r.w, r.h); },
      deco(c, W, H) {
        txt(c, 'ALIA', W / 2, W * .262, `700 ${W * .24}px ${SERIF}`, '#2a292b', 'center', W * .004);
        txt(c, 'THE BIRTHDAY ISSUE  ·  Nº 19', W / 2, W * .075, `500 ${W * .024}px ${SANS}`, '#8b7b80', 'center', W * .014);
        c.fillStyle = '#c4506d'; c.fillRect(W * .08, W * .29, W * .2, W * .008);
        txt(c, '27 NOVEMBER 2026', W * .92, W * .298, `500 ${W * .022}px ${SANS}`, '#8b7b80', 'right', W * .01);
        txt(c, 'SPECIAL EDITION', W * .08, H - W * .055, `600 ${W * .026}px ${SANS}`, '#2a292b', 'left', W * .012);
        c.fillStyle = '#2a292b'; const R = mulberry(3); for (let x = W * .72; x < W * .92; x += W * .008) c.fillRect(x, H - W * .09, R() > .5 ? 3 : 1.6, W * .05);
      }
    },
    {
      id: 'camera', name: 'Film Camera', m: { top: .19, side: .09, bottom: .18, gap: .035 }, radius: .01, border: { w: .017, col: '#232222' }, shadow: false,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#cfccc9'); g.addColorStop(.5, '#e2dfdc'); g.addColorStop(1, '#c8c5c2'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1; for (let x = 0; x < W; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
        c.fillStyle = '#2b2a2a'; rr(c, W * .06, W * .045, W * .88, W * .11, W * .02); c.fill();
        const lx = W * .5, ly = W * .1; [[.07, '#444'], [.055, '#1a1a1a'], [.04, '#2f3a4a'], [.022, '#0e1722']].forEach(([r, col]) => { c.fillStyle = col; c.beginPath(); c.arc(lx, ly, W * r, 0, TAU); c.fill(); });
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(lx - W * .012, ly - W * .012, W * .008, 0, TAU); c.fill();
        c.fillStyle = '#e7e3dc'; rr(c, W * .1, W * .07, W * .12, W * .06, W * .008); c.fill(); c.fillStyle = '#f8d57a'; rr(c, W * .78, W * .07, W * .1, W * .06, W * .008); c.fill();
        c.fillStyle = '#d34a4a'; c.beginPath(); c.arc(W * .27, W * .075, W * .012, 0, TAU); c.fill();
      },
      deco(c, W, H) {
        txt(c, "27 11 '26", W * .9, H - W * .1, `700 ${W * .06}px ${MONO}`, '#e9822b', 'right', 3); txt(c, 'AUTO  ·  ISO 400', W * .1, H - W * .1, `600 ${W * .026}px ${SANS}`, '#4a4747', 'left', W * .01);
        txt(c, 'Alia · 19', W / 2, H - W * .035, `600 ${W * .05}px ${HAND}`, '#5b5858');
      }
    },
    {
      id: 'birthday', name: 'Birthday Special', m: { top: .15, side: .085, bottom: .22, gap: .04 }, radius: .018, border: { w: .014, col: '#c4506d' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#fffafb'; c.fillRect(0, 0, W, H); const R = mulberry(19); const cols = ['#f2b8c6', '#b9d19f', '#d9d6d3', '#f3d98b'];
        for (let i = 0; i < 70; i++) { c.save(); c.translate(R() * W, R() * H); c.rotate(R() * 6); c.fillStyle = cols[i % 4]; c.globalAlpha = .75; c.fillRect(-W * .008, -W * .004, W * .018, W * .008); c.restore(); }
        c.strokeStyle = '#a98a92'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, W * .03); c.quadraticCurveTo(W / 2, W * .13, W, W * .03); c.stroke();
        const n = 9; for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = W * t, y = W * .03 + (W * .1) * 2 * t * (1 - t) * 1.0; c.fillStyle = ['#f2b8c6', '#d7e6c8', '#fff', '#f2b8c6'][i % 4]; c.strokeStyle = 'rgba(0,0,0,.06)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - W * .035, y); c.lineTo(x + W * .035, y); c.lineTo(x, y + W * .07); c.closePath(); c.fill(); c.stroke(); }
      },
      deco(c, W, H, slots) {
        txt(c, 'Happy 19th', W / 2, H - W * .13, `italic 400 ${W * .105}px ${SERIF}`, '#2a292b'); txt(c, 'Alia', W / 2, H - W * .04, `600 ${W * .09}px ${HAND}`, '#c4506d');
        sparkle(c, W * .09, H - W * .13, W * .035, '#e9c46a'); sparkle(c, W * .92, H - W * .17, W * .028, '#9db685'); sparkle(c, W * .87, H - W * .07, W * .02, '#f2b8c6');
        sparkle(c, W * .06, slots[0].y + W * .02, W * .02, '#e9c46a'); sparkle(c, W * .95, slots[0].y + slots[0].h * .5, W * .022, '#f2b8c6');
      }
    },
    {
      id: 'editorial', name: 'Editorial Print', m: { top: .17, side: .09, bottom: .17, gap: .035 }, radius: 0, border: null, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#f7f3ee'; c.fillRect(0, 0, W, H); c.fillStyle = '#2a292b'; c.fillRect(W * .09, W * .05, W * .82, 3); c.fillRect(W * .09, H - W * .07, W * .82, 3);
        c.fillStyle = '#e8c9ce'; c.fillRect(W * .09, H - W * .165, W * .2, W * .06);
      },
      deco(c, W, H) {
        txt(c, 'ALIA', W * .09, W * .15, `italic 500 ${W * .1}px ${SERIF}`, '#2a292b', 'left'); txt(c, 'THE BIRTHDAY ISSUE', W * .91, W * .095, `600 ${W * .022}px ${SANS}`, '#a96b75', 'right', W * .008);
        txt(c, 'Nº 19', W * .91, W * .135, `italic 400 ${W * .04}px ${SERIF}`, '#2a292b', 'right');
        txt(c, 'vol. 27.11.2026', W * .09, H - W * .035, `500 ${W * .024}px ${SANS}`, '#4a4747', 'left', W * .006); txt(c, 'happy birthday', W * .31, H - W * .118, `italic 500 ${W * .05}px ${SERIF}`, '#2a292b', 'left');
        sparkle(c, W * .9, H - W * .12, W * .03, '#a96b75');
      }
    },
    {
      id: 'washi', name: 'Japanese Stationery', m: { top: .12, side: .12, bottom: .19, gap: .05 }, radius: .006, border: { w: .01, col: '#fffdf8' }, shadow: true, tilt: .6,
      paper(c, W, H) {
        c.fillStyle = '#f4efe6'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(111,143,90,.22)'; c.lineWidth = 2;
        for (let y = W * .08; y < H; y += W * .06) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.strokeStyle = '#c98798'; c.lineWidth = 3; c.setLineDash([W * .02, W * .015]); rr(c, W * .03, W * .03, W * .94, H - W * .06, W * .015); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#c4506d'; c.fillRect(W * .9, W * .04, W * .05, W * .13); txt(c, '祝', W * .925, W * .095, `700 ${W * .04}px serif`, '#fff'); txt(c, '誕生日', W * .925, W * .14, `600 ${W * .014}px serif`, '#fff');
      },
      deco(c, W, H, slots) {
        tape(c, slots[0].x + W * .02, slots[0].y - W * .02, W * .16, W * .04, -.4, 'rgba(157,182,133,.8)'); tape(c, slots[0].x + slots[0].w - W * .02, slots[0].y - W * .02, W * .16, W * .04, .4, 'rgba(214,174,178,.85)');
        txt(c, 'Alia · 十九歳', W / 2, H - W * .095, `italic 500 ${W * .075}px ${SERIF}`, '#2a292b'); txt(c, '2026 . 11 . 27', W / 2, H - W * .05, `500 ${W * .026}px ${SANS}`, '#6f8f5a', 'center', W * .012);
        blossom(c, W * .1, H - W * .1, W * .03, '#f2b8c6', '#c4506d'); blossom(c, W * .9, H - W * .1, W * .03, '#f2b8c6', '#c4506d');
      }
    }
  ];

  /* ---------- extra drawing helpers for the collections ---------- */
  function star5(c, x, y, r, col, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? r * .42 : r; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
    c.closePath(); c.fill(); c.restore();
  }
  function flake(c, x, y, r, col, lw = 2) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r); c.moveTo(0, -r * .55); c.lineTo(r * .22, -r * .78); c.moveTo(0, -r * .55); c.lineTo(-r * .22, -r * .78); c.stroke(); }
    c.restore();
  }
  function leaf(c, x, y, s, rot, col, vein) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath();
    c.moveTo(0, -s); c.bezierCurveTo(s * .9, -s * .4, s * .7, s * .6, 0, s); c.bezierCurveTo(-s * .7, s * .6, -s * .9, -s * .4, 0, -s); c.fill();
    c.strokeStyle = vein; c.lineWidth = Math.max(1.5, s * .06); c.beginPath(); c.moveTo(0, -s * .9); c.lineTo(0, s * 1.25); c.stroke(); c.restore();
  }
  function maple(c, x, y, s, rot, col) {
    const P = [[0, -1], [.18, -.6], [.5, -.78], [.4, -.3], [.9, -.35], [.62, .02], [.88, .3], [.3, .24], [.34, .5], [.04, .38], [.03, .95], [-.03, .95], [-.04, .38], [-.34, .5], [-.3, .24], [-.88, .3], [-.62, .02], [-.9, -.35], [-.4, -.3], [-.5, -.78], [-.18, -.6]];
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath(); P.forEach(([a, b], i) => c[i ? 'lineTo' : 'moveTo'](a * s, b * s)); c.closePath(); c.fill(); c.restore();
  }
  function checker(c, x, y, w, h, s, a, b) {
    for (let j = 0; j * s < h; j++) for (let i = 0; i * s < w; i++) { c.fillStyle = (i + j) % 2 ? b : a; c.fillRect(x + i * s, y + j * s, Math.min(s, w - i * s), Math.min(s, h - j * s)); }
  }
  function stripes(c, x, y, w, h, s, a, b, ang) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = a; c.fillRect(x, y, w, h); c.fillStyle = b;
    c.translate(x, y); c.rotate(ang || -Math.PI / 4); for (let i = -h - w; i < w + h; i += s * 2) c.fillRect(i, -w - h, s, (w + h) * 2); c.restore();
  }
  function glowText(c, s, x, y, font, col, glow, align = 'center', ls = 0) {
    c.save(); c.shadowColor = glow; c.shadowBlur = 18; txt(c, s, x, y, font, col, align, ls); c.shadowBlur = 6; txt(c, s, x, y, font, col, align, ls); c.restore();
  }
  function wave(c, x, y, w, amp, len, col, bottom) {
    c.save(); c.fillStyle = col; c.beginPath(); c.moveTo(x, bottom);
    for (let i = 0; i <= w; i += 4) c.lineTo(x + i, y + Math.sin(i / len * TAU) * amp); c.lineTo(x + w, bottom); c.closePath(); c.fill(); c.restore();
  }
  function pine(c, x, y, h, col, trunk) {
    c.save(); c.fillStyle = trunk || '#5b4636'; c.fillRect(x - h * .04, y - h * .12, h * .08, h * .12); c.fillStyle = col;
    for (let i = 0; i < 3; i++) { const t = y - h * .1 - i * h * .27, w = h * (.36 - i * .07); c.beginPath(); c.moveTo(x, t - h * .4); c.lineTo(x + w, t); c.lineTo(x - w, t); c.closePath(); c.fill(); }
    c.restore();
  }
  function ring(c, x, y, r, col, lw) { c.save(); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore(); }
  function sunBurst(c, x, y, r, col, n = 14) {
    c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = r * .14; c.lineCap = 'round';
    for (let i = 0; i < n; i++) { c.rotate(TAU / n); c.beginPath(); c.moveTo(0, -r * 1.3); c.lineTo(0, -r * 1.6); c.stroke(); } c.restore();
  }
  const slotsBottom = s => s[s.length - 1].y + s[s.length - 1].h;

  /* ---------- 20 collection templates (original designs, inspired by travel / photobooth trends) ---------- */
  const COLLECTION = [
    /* ===== JAPAN & ASIA ===== */
    {
      id: 'tokyo', cat: 'Japan & Asia', name: 'Tokyo Neon Night', m: { top: 0.33, side: .1, bottom: 0.3, gap: .05 }, radius: .006, border: { w: .012, col: '#101020' }, shadow: false,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e0a24'); g.addColorStop(.6, '#1a1040'); g.addColorStop(1, '#2a1250'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = mulberry(7); for (let i = 0; i < 40; i++) star5(c, R() * W, R() * H * .5, 1.4 + R() * 2.2, 'rgba(255,255,255,.7)');
        for (let i = 0, x = 0; x < W; i++) { const w = W * (.07 + R() * .07), h = W * (.18 + R() * .34); c.fillStyle = i % 2 ? '#150c33' : '#1d1144'; c.fillRect(x, H - h, w, h);
          for (let y = H - h + 14; y < H - 10; y += 22) for (let xx = x + 8; xx < x + w - 8; xx += 14) if (R() > .45) { c.fillStyle = R() > .5 ? '#ffe28a' : '#ff6fb5'; c.fillRect(xx, y, 6, 8); } x += w + 3; }
      },
      under(c, r, i, W) { c.save(); c.shadowColor = i % 2 ? '#ff3d9a' : '#27e1ff'; c.shadowBlur = 26; c.strokeStyle = i % 2 ? '#ff3d9a' : '#27e1ff'; c.lineWidth = 5; c.strokeRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18); c.restore(); },
      deco(c, W, H, s) {
        glowText(c, 'TOKYO', W / 2, W * .2, `800 ${W * .17}px ${SANS}`, '#ffd1ec', '#ff3d9a', 'center', W * .02);
        glowText(c, 'トーキョー  ナイト', W / 2, W * .27, `700 ${W * .06}px ${SANS}`, '#c8f6ff', '#27e1ff', 'center', W * .01);
        const y = slotsBottom(s) + W * .12; glowText(c, 'NEON NIGHT', W / 2, y, `700 ${W * .075}px ${SANS}`, '#fff3b0', '#ffb300', 'center', W * .02); txt(c, '27 · 11 · 2026', W / 2, y + W * .075, `600 ${W * .045}px ${SANS}`, '#c8f6ff', 'center', W * .02);
      }
    },
    {
      id: 'kyoto', cat: 'Japan & Asia', name: 'Kyoto Sakura', m: { top: 0.22, side: .11, bottom: 0.36, gap: .05 }, radius: .004, border: { w: .01, col: '#fffaf3' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#f7efe6'; c.fillRect(0, 0, W, H); const R = mulberry(11); c.strokeStyle = 'rgba(150,120,90,.12)'; c.lineWidth = 1;
        for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H, l = 10 + R() * 26, a = R() * TAU; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
        const g = c.createLinearGradient(0, 0, 0, W * .5); g.addColorStop(0, 'rgba(248,196,210,.65)'); g.addColorStop(1, 'rgba(248,196,210,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W * .5);
      },
      deco(c, W, H, s) {
        c.strokeStyle = '#6b4a3a'; c.lineWidth = W * .014; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, W * .1); c.bezierCurveTo(W * .25, W * .03, W * .5, W * .14, W * 1.05, W * .05); c.stroke();
        [[.1, .075], [.25, .06], [.4, .1], [.58, .115], [.74, .075], [.9, .06]].forEach(([x, y], i) => blossom(c, W * x, W * y + W * .015, W * (.04 + (i % 3) * .008), '#f6b7c7', '#c4506d'));
        const R = mulberry(5); for (let i = 0; i < 16; i++) petal(c, R() * W, W * .2 + R() * (H - W * .4), W * .014 + R() * W * .012, R() * TAU, 'rgba(246,160,185,.75)');
        const y = slotsBottom(s); c.fillStyle = '#c8452d'; const px = W * .3, py = y + W * .04, pw = W * .4, ph = W * .13;
        c.fillRect(px + W * .03, py + W * .035, W * .028, ph); c.fillRect(px + pw - W * .058, py + W * .035, W * .028, ph); c.fillRect(px - W * .02, py, pw + W * .04, W * .025); c.fillRect(px + W * .01, py + W * .045, pw - W * .02, W * .016);
        txt(c, 'Kyoto · Spring', W / 2, py + ph + W * .12, `italic 500 ${W * .085}px ${SERIF}`, '#6b4a3a'); c.fillStyle = '#c8452d'; c.fillRect(W * .86, W * .05, W * .06, W * .12); txt(c, '京', W * .89, W * .12, `700 ${W * .045}px serif`, '#fff');
      }
    },
    {
      id: 'shibuya', cat: 'Japan & Asia', name: 'Shibuya Crossing', m: { top: 0.26, side: .1, bottom: 0.32, gap: .06 }, radius: 0, border: { w: .012, col: '#fff' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#2c2d33'; c.fillRect(0, 0, W, H); c.fillStyle = '#34353c'; for (let y = 0; y < H; y += W * .4) c.fillRect(0, y, W, W * .2);
        for (let k = 0; k < 2; k++) { const y0 = k ? H - W * .27 : W * .01; c.fillStyle = 'rgba(255,255,255,.9)'; for (let x = W * .02; x < W; x += W * .1) c.fillRect(x, y0 + W * .02, W * .06, W * .2); }
      },
      under(c, r, i, W) { c.fillStyle = ['#ffd400', '#ff2e63', '#18c0e6'][i % 3]; c.fillRect(r.x - W * .02, r.y - W * .02, r.w + W * .04, r.h + W * .04); },
      deco(c, W, H, s) {
        c.fillStyle = '#ffd400'; c.fillRect(W * .08, W * .06, W * .84, W * .16); c.fillStyle = '#111'; c.fillRect(W * .09, W * .07, W * .82, W * .14);
        txt(c, 'SHIBUYA', W * .12, W * .17, `800 ${W * .1}px ${SANS}`, '#ffd400', 'left', W * .01); txt(c, '渋谷 →', W * .88, W * .17, `700 ${W * .075}px ${SANS}`, '#fff', 'right');
        const y = slotsBottom(s) + W * .1; c.fillStyle = '#e8e8ee'; c.fillRect(W * .08, y, W * .84, W * .11); txt(c, 'SCRAMBLE  ·  27.11.2026', W / 2, y + W * .075, `700 ${W * .05}px ${SANS}`, '#2c2d33', 'center', W * .006);
        c.fillStyle = '#ff2e63'; c.fillRect(W * .08, y + W * .13, W * .4, W * .045); c.fillStyle = '#18c0e6'; c.fillRect(W * .52, y + W * .13, W * .4, W * .045);
      }
    },
    {
      id: 'matchacafe', cat: 'Japan & Asia', name: 'Japanese Matcha Cafe', m: { top: 0.24, side: .11, bottom: 0.46, gap: .045 }, radius: .01, border: { w: .01, col: '#6b8f52' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#f4f1de'; c.fillRect(0, 0, W, H); c.fillStyle = '#9db685'; c.fillRect(0, 0, W, W * .16); c.fillStyle = '#7e9c68'; for (let x = 0; x < W; x += W * .08) { c.beginPath(); c.arc(x + W * .04, W * .16, W * .04, 0, Math.PI); c.fill(); }
        c.strokeStyle = 'rgba(111,143,90,.3)'; c.setLineDash([6, 8]); c.lineWidth = 2; c.strokeRect(W * .04, W * .24, W * .92, H - W * .28); c.setLineDash([]);
      },
      deco(c, W, H, s) {
        txt(c, 'MATCHA CAFE', W / 2, W * .105, `700 ${W * .075}px ${SANS}`, '#fffdf3', 'center', W * .02); txt(c, '抹茶カフェ  ·  menu', W / 2, W * .21, `500 ${W * .045}px ${SERIF}`, '#5f7f4b');
        const y = slotsBottom(s) + W * .08, cx = W * .3;
        c.fillStyle = '#6b8f52'; c.beginPath(); c.moveTo(cx - W * .11, y); c.lineTo(cx + W * .11, y); c.quadraticCurveTo(cx + W * .1, y + W * .13, cx, y + W * .13); c.quadraticCurveTo(cx - W * .1, y + W * .13, cx - W * .11, y); c.fill();
        c.fillStyle = '#c5dba9'; c.beginPath(); c.ellipse(cx, y, W * .11, W * .02, 0, 0, TAU); c.fill(); c.strokeStyle = '#8b5a3c'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + W * .1, y - W * .1); c.lineTo(cx + W * .02, y + W * .03); c.stroke();
        [['#f2b8c6', 0], ['#fffdf3', 1], ['#9db685', 2]].forEach(([col, k]) => { c.fillStyle = col; c.beginPath(); c.arc(W * .62 + k * W * .1, y + W * .03, W * .04, 0, TAU); c.fill(); }); c.strokeStyle = '#8b5a3c'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * .6, y + W * .1); c.lineTo(W * .84, y + W * .1); c.moveTo(W * .62, y + W * .03); c.lineTo(W * .62, y + W * .1); c.stroke();
        txt(c, 'matcha latte · dango', W / 2, y + W * .24, `600 ${W * .06}px ${HAND}`, '#5f7f4b'); txt(c, '27.11.2026', W / 2, y + W * .32, `600 ${W * .04}px ${SANS}`, '#8aa275', 'center', W * .02);
      }
    },
    {
      id: 'seoul', cat: 'Japan & Asia', name: 'Seoul Photobooth', m: { top: 0.14, side: .075, bottom: 0.36, gap: .03 }, radius: .004, border: null, shadow: false,
      paper(c, W, H) { c.fillStyle = '#fff1a8'; c.fillRect(0, 0, W, H); c.strokeStyle = '#1b1b1d'; c.lineWidth = 3; c.strokeRect(W * .03, W * .03, W * .94, H - W * .06); },
      deco(c, W, H, s) {
        txt(c, 'SEOUL PHOTO BOOTH', W / 2, W * .075, `800 ${W * .045}px ${SANS}`, '#1b1b1d', 'center', W * .015);
        const y = slotsBottom(s) + W * .1; txt(c, '서울', W * .1, y + W * .1, `800 ${W * .17}px ${SANS}`, '#1b1b1d', 'left'); txt(c, '추억 · memories', W * .1, y + W * .19, `600 ${W * .05}px ${SANS}`, '#1b1b1d', 'left');
        txt(c, '2026.11.27', W * .9, y + W * .04, `700 ${W * .045}px ${SANS}`, '#1b1b1d', 'right', W * .01);
        heart(c, W * .82, y + W * .12, W * .09, '#ff5d8f'); star5(c, W * .7, y + W * .17, W * .045, '#1b1b1d'); star5(c, W * .9, y + W * .2, W * .03, '#ff5d8f'); sparkle(c, W * .62, y + W * .06, W * .03, '#1b1b1d');
      }
    },
    /* ===== CITIES ===== */
    {
      id: 'london', cat: 'Cities', name: 'London Postcard', m: { top: 0.27, side: .12, bottom: 0.42, gap: .05 }, radius: 0, border: { w: .012, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#f6efe0'; c.fillRect(0, 0, W, H); const b = W * .035;
        stripes(c, 0, 0, W, b, b * .9, '#c8283c', '#1f3c88'); stripes(c, 0, H - b, W, b, b * .9, '#c8283c', '#1f3c88'); stripes(c, 0, 0, b, H, b * .9, '#c8283c', '#1f3c88', Math.PI / 4); stripes(c, W - b, 0, b, H, b * .9, '#c8283c', '#1f3c88', Math.PI / 4);
        c.fillStyle = '#f6efe0'; c.fillRect(b, b, W - b * 2, H - b * 2);
      },
      deco(c, W, H, s) {
        txt(c, 'Greetings from', W * .12, W * .13, `italic 500 ${W * .055}px ${SERIF}`, '#1f3c88', 'left'); txt(c, 'London', W * .12, W * .2, `700 ${W * .1}px ${SERIF}`, '#c8283c', 'left');
        const sx = W * .72, sy = W * .07, sw = W * .17, sh = W * .2; c.fillStyle = '#fff'; c.fillRect(sx, sy, sw, sh); c.fillStyle = '#9db685'; c.fillRect(sx + 6, sy + 6, sw - 12, sh - 12); c.fillStyle = '#c8283c'; c.fillRect(sx + sw * .2, sy + sh * .45, sw * .6, sh * .3); c.fillStyle = '#fff'; c.fillRect(sx + sw * .28, sy + sh * .5, sw * .12, sh * .1); c.fillRect(sx + sw * .55, sy + sh * .5, sw * .12, sh * .1);
        const y = slotsBottom(s) + W * .1; ring(c, W * .26, y + W * .09, W * .075, '#1f3c88', 3); txt(c, 'LONDON', W * .26, y + W * .085, `700 ${W * .028}px ${SANS}`, '#1f3c88'); txt(c, '27 NOV 26', W * .26, y + W * .115, `600 ${W * .024}px ${SANS}`, '#1f3c88');
        c.strokeStyle = '#1f3c88'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(W * .36, y + W * (.06 + k * .03)); c.bezierCurveTo(W * .44, y + W * (.03 + k * .03), W * .5, y + W * (.09 + k * .03), W * .58, y + W * (.06 + k * .03)); c.stroke(); }
        txt(c, 'wish you were here', W * .88, y + W * .21, `600 ${W * .06}px ${HAND}`, '#c8283c', 'right');
      }
    },
    {
      id: 'paris', cat: 'Cities', name: 'Paris Editorial', m: { top: 0.33, side: .1, bottom: 0.34, gap: .045 }, radius: 0, border: null, shadow: false,
      paper(c, W, H) { c.fillStyle = '#f5f0e8'; c.fillRect(0, 0, W, H); c.fillStyle = '#e9c9cf'; c.fillRect(W * .1, W * .05, W * .8, 2); c.fillRect(W * .1, W * .3 - W * .02, W * .8, 2); },
      deco(c, W, H, s) {
        txt(c, 'Paris', W / 2, W * .2, `italic 600 ${W * .2}px ${SERIF}`, '#1c1b1c'); txt(c, 'ÉDITION SPÉCIALE  ·  N° 19', W / 2, W * .09, `600 ${W * .028}px ${SANS}`, '#a96b75', 'center', W * .02); txt(c, 'MODE · ART · AMOUR', W / 2, W * .27, `600 ${W * .03}px ${SANS}`, '#1c1b1c', 'center', W * .03);
        const y = slotsBottom(s) + W * .12, cx = W * .5; c.strokeStyle = '#1c1b1c'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx - W * .09, y + W * .2); c.lineTo(cx - W * .02, y); c.lineTo(cx + W * .02, y); c.lineTo(cx + W * .09, y + W * .2); c.moveTo(cx - W * .06, y + W * .12); c.lineTo(cx + W * .06, y + W * .12); c.moveTo(cx - W * .035, y + W * .06); c.lineTo(cx + W * .035, y + W * .06); c.stroke();
        txt(c, 'toujours', W * .14, y + W * .15, `italic 500 ${W * .06}px ${SERIF}`, '#a96b75', 'left'); txt(c, 'Alia', W * .86, y + W * .15, `italic 500 ${W * .06}px ${SERIF}`, '#1c1b1c', 'right'); txt(c, '27.11.2026', W / 2, y + W * .27, `500 ${W * .03}px ${SANS}`, '#4a4747', 'center', W * .03);
      }
    },
    {
      id: 'nysubway', cat: 'Cities', name: 'New York Subway', m: { top: 0.27, side: .1, bottom: 0.38, gap: .05 }, radius: 0, border: { w: .014, col: '#111' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#e9ece8'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c3c9c4'; c.lineWidth = 2; const tw = W * .1, th = W * .05;
        for (let y = 0, r = 0; y < H; y += th, r++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (r % 2) * tw / 2; x < W; x += tw) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + th); c.stroke(); } }
        c.fillStyle = '#f7c400'; c.fillRect(0, H - W * .03, W, W * .03);
      },
      deco(c, W, H, s) {
        c.fillStyle = '#111'; c.fillRect(W * .06, W * .06, W * .88, W * .15); txt(c, '28th ST', W * .1, W * .165, `800 ${W * .09}px ${SANS}`, '#fff', 'left'); [['#e63946', 'A'], ['#2a9d8f', 'B'], ['#f4a300', 'C']].forEach(([col, l], i) => { c.fillStyle = col; c.beginPath(); c.arc(W * (.66 + i * .1), W * .135, W * .035, 0, TAU); c.fill(); txt(c, l, W * (.66 + i * .1), W * .15, `800 ${W * .042}px ${SANS}`, '#fff'); });
        const y = slotsBottom(s) + W * .08; c.fillStyle = '#111'; c.fillRect(W * .06, y, W * .88, W * .13); txt(c, 'ALIA  EXPRESS', W * .1, y + W * .085, `800 ${W * .065}px ${SANS}`, '#fff', 'left', W * .01); c.fillStyle = '#2a9d8f'; c.beginPath(); c.arc(W * .87, y + W * .065, W * .04, 0, TAU); c.fill(); txt(c, '19', W * .87, y + W * .08, `800 ${W * .05}px ${SANS}`, '#fff');
        txt(c, 'NEW YORK  ·  27.11.2026', W / 2, y + W * .22, `700 ${W * .042}px ${SANS}`, '#111', 'center', W * .015);
      }
    },
    {
      id: 'nydiner', cat: 'Cities', name: 'New York Diner', m: { top: 0.32, side: .1, bottom: 0.4, gap: .05 }, radius: .01, border: { w: .016, col: '#d9dde0' }, shadow: true,
      paper(c, W, H) { c.fillStyle = '#7fd6cc'; c.fillRect(0, 0, W, H); checker(c, 0, H - W * .14, W, W * .14, W * .05, '#fff', '#e63946'); c.fillStyle = '#e63946'; c.fillRect(0, W * .3, W, W * .016); c.fillStyle = '#fff'; c.fillRect(0, W * .316, W, W * .01); },
      deco(c, W, H, s) {
        c.fillStyle = '#1b1b1d'; rr(c, W * .12, W * .05, W * .76, W * .17, W * .04); c.fill(); glowText(c, 'DINER', W / 2, W * .17, `800 ${W * .13}px ${SANS}`, '#ff6a7a', '#ff2e4d', 'center', W * .02); txt(c, 'OPEN 24 HRS', W / 2, W * .27, `800 ${W * .04}px ${SANS}`, '#e63946', 'center', W * .03);
        const y = slotsBottom(s) + W * .06, cx = W * .27; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx - W * .07, y); c.lineTo(cx + W * .07, y); c.lineTo(cx + W * .045, y + W * .17); c.lineTo(cx - W * .045, y + W * .17); c.closePath(); c.fill(); c.fillStyle = '#ff9fb5'; c.fillRect(cx - W * .062, y + W * .04, W * .124, W * .06); c.fillStyle = '#e63946'; c.beginPath(); c.arc(cx, y - W * .01, W * .018, 0, TAU); c.fill();
        txt(c, 'shakes & pie', W * .68, y + W * .09, `700 ${W * .075}px ${HAND}`, '#1b1b1d'); txt(c, 'est. 2026', W * .68, y + W * .15, `600 ${W * .04}px ${SANS}`, '#e63946', 'center', W * .02);
      }
    },
    {
      id: 'amsterdam', cat: 'Cities', name: 'Amsterdam Travel Diary', m: { top: 0.28, side: .1, bottom: 0.38, gap: .05 }, radius: .004, border: { w: .01, col: '#fffaf0' }, shadow: true, tilt: .8,
      paper(c, W, H) {
        c.fillStyle = '#dcc8a6'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(70,110,140,.35)'; c.lineWidth = 6; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-10, H * (.2 + k * .25)); c.bezierCurveTo(W * .3, H * (.14 + k * .25), W * .6, H * (.3 + k * .25), W * 1.1, H * (.2 + k * .25)); c.stroke(); }
        c.strokeStyle = 'rgba(120,90,60,.25)'; c.lineWidth = 1.5; for (let x = 0; x < W; x += W * .12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      },
      deco(c, W, H, s) {
        tape(c, W * .22, W * .06, W * .2, W * .05, -.3, '#e07a8f'); tape(c, W * .78, W * .06, W * .2, W * .05, .3, '#5e9bb8');
        c.save(); c.translate(W * .5, W * .17); c.rotate(-.04); c.fillStyle = '#fffaf0'; rr(c, -W * .3, -W * .06, W * .6, W * .13, W * .01); c.fill(); c.fillStyle = '#e07a8f'; c.beginPath(); c.arc(-W * .3, W * .005, W * .02, 0, TAU); c.arc(W * .3, W * .005, W * .02, 0, TAU); c.fill(); txt(c, 'TRAM · AMSTERDAM', 0, W * .005, `700 ${W * .045}px ${SANS}`, '#1f4e6b', 'center', W * .01); txt(c, 'No. 028-11 · 2026', 0, W * .045, `500 ${W * .03}px ${SANS}`, '#7a5c3c'); c.restore();
        const y = slotsBottom(s) + W * .05, cols = ['#a1443a', '#d9a441', '#3f6f86', '#8a5a44', '#c47d6d'];
        for (let i = 0; i < 5; i++) { const x = W * .08 + i * W * .17, h = W * (.1 + (i % 3) * .03), by = y + W * .2; c.fillStyle = cols[i]; c.beginPath(); c.moveTo(x, by); c.lineTo(x, by - h); c.lineTo(x + W * .085, by - h - W * .035); c.lineTo(x + W * .16, by - h); c.lineTo(x + W * .16, by); c.fill(); c.fillStyle = '#fffaf0'; c.fillRect(x + W * .05, by - h + W * .03, W * .03, W * .04); }
        txt(c, 'travel diary', W / 2, y + W * .31, `700 ${W * .085}px ${HAND}`, '#1f4e6b');
      }
    },
    /* ===== SEASONAL ===== */
    {
      id: 'winter', cat: 'Seasonal', name: 'Winter Wonderland', m: { top: 0.28, side: .1, bottom: 0.34, gap: .05 }, radius: .03, border: { w: .014, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfe6f6'); g.addColorStop(1, '#f1f8fd'); c.fillStyle = g; c.fillRect(0, 0, W, H); const R = mulberry(21);
        for (let i = 0; i < 26; i++) flake(c, R() * W, R() * H, 8 + R() * 18, 'rgba(255,255,255,.95)', 2.4); wave(c, 0, H - W * .2, W, W * .03, W * .6, '#fff', H);
      },
      deco(c, W, H, s) {
        txt(c, 'Winter', W / 2, W * .15, `italic 600 ${W * .15}px ${SERIF}`, '#3d6f94'); txt(c, 'WONDERLAND', W / 2, W * .205, `700 ${W * .045}px ${SANS}`, '#5a94b8', 'center', W * .05);
        const y = H - W * .12; pine(c, W * .14, y, W * .22, '#4a8a78'); pine(c, W * .86, y, W * .26, '#3f7a6a'); pine(c, W * .24, y + W * .02, W * .16, '#5a9a86');
        txt(c, 'snow days', W / 2, y - W * .1, `700 ${W * .09}px ${HAND}`, '#3d6f94'); txt(c, '27.11.2026', W / 2, y - W * .03, `600 ${W * .04}px ${SANS}`, '#7aa9c6', 'center', W * .03);
      }
    },
    {
      id: 'alpine', cat: 'Seasonal', name: 'Alpine Snow Day', m: { top: 0.36, side: .1, bottom: 0.36, gap: .05 }, radius: .01, border: { w: .014, col: '#f4f8fb' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9cc7e8'); g.addColorStop(.55, '#d7e9f5'); g.addColorStop(1, '#f2f7fb'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const mt = (y, h, col, off) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= W; x += W * .12) c.lineTo(x + off, y - h * (.5 + .5 * Math.abs(Math.sin(x / W * 5 + off)))); c.lineTo(W, y); c.closePath(); c.fill(); };
        mt(W * .22, W * .2, '#b9d4e8', 0); mt(W * .22, W * .13, '#e8f1f8', 1.3); mt(H, W * .25, '#dfeaf2', 2); mt(H, W * .13, '#fff', 3.5);
      },
      deco(c, W, H, s) {
        txt(c, 'ALPINE', W / 2, W * .15, `800 ${W * .13}px ${SANS}`, '#2f5f84', 'center', W * .03); txt(c, 'SNOW DAY', W / 2, W * .22, `700 ${W * .06}px ${SANS}`, '#e8743b', 'center', W * .06);
        c.strokeStyle = '#2f5f84'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, W * .3); c.lineTo(W, W * .26); c.stroke(); c.fillStyle = '#e8743b'; rr(c, W * .5, W * .29, W * .09, W * .06, 6); c.fill();
        const y = slotsBottom(s) + W * .1; pine(c, W * .13, y + W * .2, W * .22, '#3f6f6a'); pine(c, W * .87, y + W * .2, W * .26, '#356b66'); txt(c, '2,468 m', W / 2, y + W * .1, `800 ${W * .08}px ${SANS}`, '#2f5f84'); txt(c, 'summit · 27.11.2026', W / 2, y + W * .17, `600 ${W * .04}px ${SANS}`, '#e8743b', 'center', W * .02);
      }
    },
    {
      id: 'riviera', cat: 'Seasonal', name: 'Summer Riviera', m: { top: 0.34, side: .1, bottom: 0.36, gap: .05 }, radius: .02, border: { w: .014, col: '#fffaf0' }, shadow: true,
      paper(c, W, H) { c.fillStyle = '#fbf0d9'; c.fillRect(0, 0, W, H); wave(c, 0, H - W * .22, W, W * .018, W * .3, '#7cc3d9', H); wave(c, 0, H - W * .15, W, W * .02, W * .4, '#4aa3c4', H); },
      deco(c, W, H, s) {
        const aw = W * .125; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#2b79a8'; c.beginPath(); c.moveTo(i * aw, 0); c.lineTo((i + 1) * aw, 0); c.lineTo((i + 1) * aw, W * .13); c.arc(i * aw + aw / 2, W * .13, aw / 2, 0, Math.PI); c.closePath(); c.fill(); }
        txt(c, 'Riviera', W / 2, W * .27, `italic 600 ${W * .15}px ${SERIF}`, '#2b79a8');
        const y = slotsBottom(s) + W * .1; c.fillStyle = '#f6c21f'; c.beginPath(); c.ellipse(W * .2, y + W * .06, W * .06, W * .045, -.3, 0, TAU); c.fill(); leaf(c, W * .24, y + W * .01, W * .03, .8, '#6fa05a', '#4c7a3e');
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(W * .72, y + W * .09); c.lineTo(W * .72, y - W * .06); c.lineTo(W * .84, y + W * .09); c.closePath(); c.fill(); c.fillStyle = '#e8743b'; c.beginPath(); c.moveTo(W * .7, y + W * .1); c.lineTo(W * .88, y + W * .1); c.lineTo(W * .84, y + W * .13); c.lineTo(W * .72, y + W * .13); c.closePath(); c.fill();
        txt(c, 'côte d’azur · été', W / 2, y + W * .07, `600 ${W * .045}px ${SERIF}`, '#2b79a8'); txt(c, '27.11.2026', W / 2, y + W * .12, `600 ${W * .035}px ${SANS}`, '#c88a2c', 'center', W * .03);
      }
    },
    {
      id: 'tropical', cat: 'Seasonal', name: 'Tropical Summer', m: { top: 0.31, side: .11, bottom: 0.36, gap: .05 }, radius: .04, border: { w: .014, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe3a8'); g.addColorStop(.5, '#ffb58a'); g.addColorStop(1, '#43c2c2'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const frond = (x, y, a, s) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#1f8a5b'; for (let i = -4; i <= 4; i++) { c.save(); c.rotate(i * .26); c.beginPath(); c.ellipse(0, -s * .5, s * .09, s * .5, 0, 0, TAU); c.fill(); c.restore(); } c.restore(); };
        frond(0, W * .05, .6, W * .45); frond(W, W * .05, -.6, W * .45); frond(0, H - W * .3, 1.9, W * .4); frond(W, H - W * .3, -1.9, W * .4); wave(c, 0, H - W * .12, W, W * .02, W * .25, 'rgba(255,255,255,.55)', H);
      },
      deco(c, W, H, s) {
        sunBurst(c, W * .5, W * .1, W * .055, '#ffd23f'); txt(c, 'Tropical Summer', W / 2, W * .245, `700 ${W * .1}px ${HAND}`, '#a6362b');
        const y = slotsBottom(s) + W * .12; c.fillStyle = '#f4b41a'; c.beginPath(); c.ellipse(W * .25, y + W * .05, W * .05, W * .07, 0, 0, TAU); c.fill(); c.fillStyle = '#2f8f4e'; for (let i = -2; i <= 2; i++) leaf(c, W * .25 + i * W * .015, y - W * .045, W * .035, i * .3, '#2f8f4e', '#1f6a38');
        c.fillStyle = '#e63a56'; c.beginPath(); c.arc(W * .7, y, W * .08, 0, Math.PI); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(W * .7, y, W * .066, 0, Math.PI); c.fill(); c.fillStyle = '#e63a56'; c.beginPath(); c.arc(W * .7, y, W * .055, 0, Math.PI); c.fill(); c.fillStyle = '#222'; [[-.025, .03], [.01, .04], [.03, .02]].forEach(([a, b]) => { c.beginPath(); c.arc(W * (.7 + a), y + W * b, 3, 0, TAU); c.fill(); });
        txt(c, '27.11.2026 · beach mode', W / 2, y + W * .17, `700 ${W * .045}px ${SANS}`, '#fff', 'center', W * .015);
      }
    },
    {
      id: 'autumn', cat: 'Seasonal', name: 'Autumn Memories', m: { top: 0.28, side: .1, bottom: 0.34, gap: .05 }, radius: .006, border: { w: .016, col: '#fff7ea' }, shadow: true, tilt: .7,
      paper(c, W, H) {
        c.fillStyle = '#f2dcbc'; c.fillRect(0, 0, W, H); const R = mulberry(33), cols = ['#c9532b', '#e08a2b', '#a63a1e', '#d9a441', '#7a4a2a'];
        for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H; (i % 2 ? maple : (cc, a, b, s, r, col) => leaf(cc, a, b, s * .7, r, col, 'rgba(90,40,20,.4)'))(c, x, y, 16 + R() * 20, R() * TAU, cols[i % 5]); }
        c.fillStyle = 'rgba(242,220,188,.88)'; c.fillRect(0, 0, W, W * .02);
      },
      deco(c, W, H, s) {
        txt(c, 'Autumn', W / 2, W * .15, `italic 600 ${W * .15}px ${SERIF}`, '#8a3b1e'); txt(c, 'MEMORIES', W / 2, W * .205, `700 ${W * .05}px ${SANS}`, '#c9532b', 'center', W * .06);
        const y = slotsBottom(s) + W * .1; c.fillStyle = '#fff7ea'; rr(c, W * .15, y - W * .02, W * .7, W * .2, W * .015); c.fill(); txt(c, 'warm days & cozy nights', W / 2, y + W * .06, `700 ${W * .07}px ${HAND}`, '#8a3b1e'); txt(c, '27 · 11 · 2026', W / 2, y + W * .13, `600 ${W * .038}px ${SANS}`, '#c9532b', 'center', W * .03);
      }
    },
    /* ===== SPECIAL STYLES ===== */
    {
      id: 'racing', cat: 'Special Styles', name: 'Motorsport Racing', m: { top: 0.32, side: .1, bottom: 0.36, gap: .05 }, radius: 0, border: { w: .016, col: '#fff' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#141416'; c.fillRect(0, 0, W, H); checker(c, 0, 0, W, W * .08, W * .04, '#fff', '#141416'); checker(c, 0, H - W * .08, W, W * .08, W * .04, '#fff', '#141416');
        c.fillStyle = '#e10600'; c.save(); c.transform(1, 0, -.35, 1, 0, 0); c.fillRect(W * .72, 0, W * .05, H); c.fillStyle = '#fff'; c.fillRect(W * .8, 0, W * .02, H); c.restore();
      },
      deco(c, W, H, s) {
        txt(c, '19', W * .5, W * .26, `italic 900 ${W * .2}px ${SANS}`, '#e10600'); txt(c, 'GRAND PRIX', W * .08, W * .17, `italic 800 ${W * .06}px ${SANS}`, '#fff', 'left', W * .01); txt(c, 'ALIA', W * .08, W * .22, `italic 800 ${W * .06}px ${SANS}`, '#e10600', 'left', W * .02);
        const y = slotsBottom(s) + W * .1; txt(c, 'P1', W * .1, y + W * .13, `italic 900 ${W * .15}px ${SANS}`, '#fff', 'left'); txt(c, 'RACE DAY', W * .9, y + W * .06, `italic 800 ${W * .05}px ${SANS}`, '#fff', 'right', W * .02); txt(c, '27.11.2026', W * .9, y + W * .12, `700 ${W * .04}px ${SANS}`, '#e10600', 'right', W * .02);
      }
    },
    {
      id: 'paddock', cat: 'Special Styles', name: 'Racing Paddock', m: { top: 0.27, side: .1, bottom: 0.42, gap: .05 }, radius: 0, border: { w: .012, col: '#f5c400' }, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#9ea1a6'; c.fillRect(0, 0, W, H); const R = mulberry(41); for (let i = 0; i < 400; i++) { c.fillStyle = R() > .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'; c.fillRect(R() * W, R() * H, 2 + R() * 3, 2 + R() * 3); }
        stripes(c, 0, 0, W, W * .045, W * .03, '#f5c400', '#1b1b1d'); stripes(c, 0, H - W * .045, W, W * .045, W * .03, '#f5c400', '#1b1b1d'); c.fillStyle = '#fff'; c.fillRect(W * .04, W * .06, 4, H - W * .12);
      },
      deco(c, W, H, s) {
        txt(c, 'PIT LANE', W * .08, W * .15, `900 ${W * .105}px ${SANS}`, '#1b1b1d', 'left'); txt(c, 'BOX 19  ·  PADDOCK CLUB', W * .08, W * .205, `700 ${W * .038}px ${SANS}`, '#f5c400', 'left', W * .02);
        const y = slotsBottom(s) + W * .09; [0, 1, 2].forEach(i => { c.fillStyle = '#1b1b1d'; c.beginPath(); c.arc(W * (.17 + i * .12), y + W * .05, W * .05, 0, TAU); c.fill(); c.fillStyle = '#e10600'; c.beginPath(); c.arc(W * (.17 + i * .12), y + W * .05, W * .018, 0, TAU); c.fill(); });
        c.fillStyle = '#1b1b1d'; c.fillRect(W * .55, y - W * .01, W * .37, W * .14); [['P1', 'ALIA', '1:27.11'], ['P2', 'YOU', '+0.019']].forEach(([a, b, d], i) => { txt(c, a, W * .57, y + W * (.045 + i * .055), `800 ${W * .036}px ${SANS}`, '#f5c400', 'left'); txt(c, b, W * .66, y + W * (.045 + i * .055), `700 ${W * .036}px ${SANS}`, '#fff', 'left'); txt(c, d, W * .9, y + W * (.045 + i * .055), `600 ${W * .03}px ${SANS}`, '#9ea1a6', 'right'); });
        txt(c, 'pit stop · 27.11.2026', W / 2, y + W * .24, `700 ${W * .045}px ${SANS}`, '#1b1b1d', 'center', W * .02);
      }
    },
    {
      id: 'doodle', cat: 'Special Styles', name: 'Original Cartoon Doodle', m: { top: 0.25, side: .11, bottom: 0.42, gap: .055 }, radius: .05, border: { w: .014, col: '#1d1d1f' }, shadow: false, tilt: 1,
      paper(c, W, H) { c.fillStyle = '#fff8e6'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(29,29,31,.1)'; for (let y = W * .04; y < H; y += W * .06) for (let x = W * .04; x < W; x += W * .06) { c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); } },
      deco(c, W, H, s) {
        c.lineWidth = 4; c.strokeStyle = '#1d1d1f'; c.lineCap = 'round'; c.lineJoin = 'round';
        const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r * .9, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(x - r * .33, y - r * .1, r * .09, 0, TAU); c.arc(x + r * .33, y - r * .1, r * .09, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y + r * .1, r * .3, .15, Math.PI - .15); c.stroke(); c.fillStyle = 'rgba(255,120,150,.6)'; c.beginPath(); c.arc(x - r * .6, y + r * .15, r * .14, 0, TAU); c.arc(x + r * .6, y + r * .15, r * .14, 0, TAU); c.fill(); };
        blob(W * .2, W * .1, W * .075, '#ffc2d1'); blob(W * .8, W * .1, W * .06, '#c5e3a5'); c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(W * .5, W * .08, W * .035, 0, TAU); c.fill(); c.stroke();
        txt(c, 'doodle day!', W / 2, W * .185, `800 ${W * .09}px ${HAND}`, '#1d1d1f');
        const y = slotsBottom(s) + W * .12; blob(W * .25, y + W * .08, W * .09, '#bde0fe'); cloud(c, W * .55, y + W * .08, W * .1, '#fff'); c.beginPath(); c.arc(W * .6, y + W * .09, W * .002, 0, TAU); c.stroke(); star5(c, W * .85, y + W * .05, W * .05, '#ffd84d'); c.strokeStyle = '#1d1d1f'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? W * .021 : W * .05; c.lineTo(W * .85 + Math.cos(a) * d, y + W * .05 + Math.sin(a) * d); } c.closePath(); c.stroke();
        txt(c, 'made by Radit for Alia', W / 2, y + W * .24, `700 ${W * .06}px ${HAND}`, '#1d1d1f');
      }
    },
    {
      id: 'y2k', cat: 'Special Styles', name: 'Y2K Pop Magazine', m: { top: 0.38, side: .1, bottom: 0.46, gap: .045 }, radius: .03, border: { w: .014, col: '#fff' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ff9ad5'); g.addColorStop(.5, '#c8b6ff'); g.addColorStop(1, '#8fe3ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = mulberry(51); for (let i = 0; i < 18; i++) star5(c, R() * W, R() * H, 8 + R() * 14, 'rgba(255,255,255,.8)', R());
      },
      deco(c, W, H, s) {
        c.save(); c.shadowColor = '#7a3df0'; c.shadowOffsetX = 5; c.shadowOffsetY = 5; txt(c, 'POP!', W / 2, W * .27, `900 ${W * .22}px ${SANS}`, '#fff'); c.restore();
        txt(c, 'THE Y2K ISSUE', W / 2, W * .075, `800 ${W * .045}px ${SANS}`, '#7a3df0', 'center', W * .04); txt(c, '♥ ALIA ♥ 19 ♥', W / 2, W * .335, `700 ${W * .045}px ${SANS}`, '#fff', 'center', W * .02);
        star5(c, W * .87, W * .2, W * .06, '#fff35c', .3);
        const y = slotsBottom(s) + W * .1; c.fillStyle = '#fff'; c.fillRect(W * .08, y, W * .3, W * .13); for (let i = 0; i < 26; i++) { c.fillStyle = '#111'; c.fillRect(W * .09 + i * W * .0112, y + W * .015, i % 3 ? 2 : 4, W * .1); }
        txt(c, 'y2k forever', W * .9, y + W * .06, `800 ${W * .07}px ${HAND}`, '#7a3df0', 'right'); txt(c, '27.11.2026', W * .9, y + W * .12, `700 ${W * .04}px ${SANS}`, '#fff', 'right', W * .02);
        c.fillStyle = '#fff'; [[.15, .1], [.5, .08]].forEach(([a, b]) => { c.beginPath(); c.ellipse(W * a, y + W * (.2 + b), W * .05, W * .03, .4, 0, TAU); c.fill(); });
        heart(c, W * .22, y + W * .28, W * .08, '#ff5aa8'); heart(c, W * .78, y + W * .28, W * .06, '#7a3df0');
      }
    },
    {
      id: 'contact', cat: 'Special Styles', name: 'Vintage Film Contact Sheet', m: { top: 0.2, side: .17, bottom: 0.26, gap: .045 }, radius: 0, border: null, shadow: false,
      paper(c, W, H) {
        c.fillStyle = '#17120f'; c.fillRect(0, 0, W, H); c.fillStyle = '#f3ead7';
        for (let y = W * .03; y < H; y += W * .06) { rr(c, W * .045, y, W * .05, W * .035, 4); c.fill(); rr(c, W * .905, y, W * .05, W * .035, 4); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.04)'; const R = mulberry(61); for (let i = 0; i < 300; i++) c.fillRect(R() * W, R() * H, 2, 2);
      },
      deco(c, W, H, s) {
        txt(c, 'ISO 400 · CONTACT SHEET', W / 2, W * .085, `700 ${W * .03}px ${SANS}`, '#f0a63c', 'center', W * .015); txt(c, 'ALIA / 19 / ROLL 27', W / 2, W * .125, `600 ${W * .03}px ${SANS}`, '#f3ead7', 'center', W * .02);
        s.forEach((r, i) => { txt(c, String(i * 2 + 12) + 'A', r.x, r.y - W * .012, `700 ${W * .03}px ${SANS}`, '#f0a63c', 'left'); txt(c, '▸ ' + (i + 1), r.x + r.w, r.y + r.h + W * .035, `700 ${W * .03}px ${SANS}`, '#f0a63c', 'right'); });
        const y = slotsBottom(s) + W * .1; c.strokeStyle = '#e5352b'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.ellipse(W * .5, y + W * .035, W * .25, W * .055, -.03, 0, TAU); c.stroke(); txt(c, 'pick this one', W / 2, y + W * .045, `700 ${W * .06}px ${HAND}`, '#e5352b'); txt(c, '27.11.2026', W / 2, y + W * .15, `600 ${W * .035}px ${SANS}`, '#f3ead7', 'center', W * .03);
      }
    }
  ];

  /* ---------- 3 exclusive templates made only for Alia ---------- */
  const ALIA = 'Alia';   /* change this one word if the name should be spelled differently */
  const EXCLUSIVE = [
    {
      id: 'alia-edition', cat: 'Alia Exclusive', name: "Alia's Birthday Edition", m: { top: .455, side: .1, bottom: .42, gap: .045 }, radius: .012, border: { w: .014, col: '#ffffff' }, shadow: true,
      paper(c, W, H) {
        c.fillStyle = '#f6dfe3'; c.fillRect(0, 0, W, H); const R = mulberry(81); c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(R() * W, R() * H, 1 + R() * 3, 0, TAU); c.fill(); }
        c.strokeStyle = '#a96b75'; c.lineWidth = 2; rr(c, W * .035, W * .035, W * .93, H - W * .07, W * .03); c.stroke(); c.strokeStyle = 'rgba(169,107,117,.45)'; c.setLineDash([5, 8]); rr(c, W * .055, W * .055, W * .89, H - W * .11, W * .02); c.stroke(); c.setLineDash([]);
      },
      deco(c, W, H, s) {
        c.save(); c.strokeStyle = '#a96b75'; c.lineWidth = 6; c.lineCap = 'round'; [-1, 1].forEach(d => { c.beginPath(); c.moveTo(W / 2, W * .13); c.bezierCurveTo(W / 2 + d * W * .12, W * .2, W / 2 + d * W * .2, W * .26, W / 2 + d * W * .26, W * .35); c.stroke(); }); c.restore();
        bow(c, W / 2, W * .12, W * .2, '#e6899f', '#b9566f');
        txt(c, 'THE BIRTHDAY EDITION', W / 2, W * .41, `600 ${W * .027}px ${SANS}`, '#a96b75', 'center', W * .012);
        txt(c, ALIA.toUpperCase(), W / 2, W * .37, `600 ${W * .21}px ${SERIF}`, '#2a292b', 'center', W * .01);
        star5(c, W * .13, W * .3, W * .035, '#9db685'); star5(c, W * .87, W * .27, W * .045, '#a96b75'); sparkle(c, W * .2, W * .2, W * .03, '#fff'); sparkle(c, W * .8, W * .2, W * .03, '#fff');
        blossom(c, W * .09, W * .42, W * .03, '#fff', '#e6899f'); blossom(c, W * .91, W * .42, W * .03, '#fff', '#e6899f');
        const y = slotsBottom(s); txt(c, '27 · 11 · 2026', W / 2, y + W * .11, `600 ${W * .07}px ${SERIF}`, '#2a292b', 'center', W * .02);
        txt(c, 'happy 19th birthday', W / 2, y + W * .2, `700 ${W * .075}px ${HAND}`, '#a96b75');
        c.fillStyle = '#9db685'; rr(c, W * .16, y + W * .25, W * .68, W * .085, W * .02); c.fill(); txt(c, 'ALIA EXCLUSIVE COLLECTION', W / 2, y + W * .307, `700 ${W * .03}px ${SANS}`, '#fff', 'center', W * .004);
        for (let i = 0; i < 6; i++) star5(c, W * (.2 + i * .12), y + W * .39, W * .018, i % 2 ? '#a96b75' : '#fff');
      }
    },
    {
      id: 'alia-memories', cat: 'Alia Exclusive', name: 'Little Memories of Alia', m: { top: .35, side: .12, bottom: .3, gap: .075 }, radius: .004, border: { w: .016, col: '#fffdf8' }, shadow: true, tilt: 1.6,
      paper(c, W, H) {
        c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(111,143,90,.28)'; c.lineWidth = 2; for (let y = W * .1; y < H; y += W * .075) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.strokeStyle = 'rgba(214,110,130,.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * .055, 0); c.lineTo(W * .055, H); c.stroke();
        c.fillStyle = '#d9d6cf'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(W * .02, W * .1 + i * (H - W * .2) / 11, W * .016, 0, TAU); c.fill(); }
      },
      deco(c, W, H, s) {
        tape(c, W * .3, W * .07, W * .26, W * .06, -.08, 'rgba(157,182,133,.85)'); txt(c, ALIA.toUpperCase() + "'S", W * .52, W * .17, `700 ${W * .1}px ${HAND}`, '#2a292b'); txt(c, 'LITTLE MEMORIES', W * .52, W * .255, `800 ${W * .065}px ${SANS}`, '#a96b75', 'center', W * .012);
        c.strokeStyle = '#a96b75'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(W * .2, W * .285); c.bezierCurveTo(W * .35, W * .3, W * .6, W * .27, W * .85, W * .29); c.stroke();
        heart(c, W * .86, W * .12, W * .06, '#e6899f'); star5(c, W * .17, W * .1, W * .03, '#9db685', .3);
        s.forEach((r, i) => { tape(c, r.x + r.w * .12, r.y - W * .018, W * .15, W * .04, i % 2 ? .35 : -.35, i % 2 ? 'rgba(214,174,178,.9)' : 'rgba(157,182,133,.85)'); });
        const notes = ['ini favorit ✦', 'lucu banget', 'jangan lupa senyum'];
        s.slice(0, -1).forEach((r, i) => txt(c, notes[i % 3], r.x + r.w, r.y + r.h + W * .052, `700 ${W * .05}px ${HAND}`, '#6f8f5a', 'right'));
        const y = slotsBottom(s); txt(c, 'diary entry · 27.11.2026', W * .14, y + W * .1, `700 ${W * .055}px ${HAND}`, '#2a292b', 'left');
        c.strokeStyle = '#2a292b'; c.lineWidth = 2; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(W * .14, y + W * .13); c.lineTo(W * .86, y + W * .13); c.stroke(); c.setLineDash([]);
        catFace(c, W * .82, y + W * .19, W * .06, '#2a292b', '#fff'); txt(c, 'SPECIAL FOR ' + ALIA.toUpperCase(), W * .14, y + W * .21, `800 ${W * .03}px ${SANS}`, '#a96b75', 'left', W * .01);
      }
    },
    {
      id: 'alia-premium', cat: 'Alia Exclusive', name: 'Made Especially for Alia', m: { top: .4, side: .12, bottom: .4, gap: .05 }, radius: .004, border: { w: .01, col: '#ffffff' }, shadow: true,
      paper(c, W, H) {
        const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f2f1ef'); g.addColorStop(1, '#e4e2df'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#c9a3a8'; c.lineWidth = 3; c.strokeRect(W * .04, W * .04, W * .92, H - W * .08); c.lineWidth = 1.2; c.strokeRect(W * .062, W * .062, W * .876, H - W * .124);
        c.fillStyle = '#f6dde1'; c.beginPath(); c.arc(W * 1.02, W * .05, W * .5, 0, TAU); c.fill();
      },
      deco(c, W, H, s) {
        c.strokeStyle = '#7a5a4c'; c.lineWidth = W * .014; c.lineCap = 'round'; c.beginPath(); c.moveTo(W * 1.02, W * .06); c.bezierCurveTo(W * .82, W * .1, W * .68, W * .08, W * .5, W * .17); c.stroke(); c.lineWidth = W * .008; c.beginPath(); c.moveTo(W * .8, W * .1); c.quadraticCurveTo(W * .78, W * .17, W * .74, W * .22); c.stroke();
        [[.9, .08, .045], [.76, .1, .04], [.64, .12, .036], [.55, .16, .034], [.74, .21, .03]].forEach(([x, y, r]) => blossom(c, W * x, W * y, W * r, '#f7c7d3', '#c4506d'));
        const R = mulberry(7); for (let i = 0; i < 7; i++) petal(c, W * (.45 + R() * .5), W * (.25 + R() * .12), W * .015, R() * TAU, 'rgba(246,160,185,.8)');
        txt(c, 'made especially for', W * .12, W * .12, `italic 500 ${W * .06}px ${SERIF}`, '#4a4747', 'left');
        txt(c, ALIA, W * .5, W * .35, `italic 500 ${W * .24}px ${SERIF}`, '#a96b75');
        c.strokeStyle = '#a96b75'; c.lineWidth = 2; c.beginPath(); c.moveTo(W * .2, W * .37); c.bezierCurveTo(W * .35, W * .4, W * .5, W * .35, W * .8, W * .38); c.stroke(); star5(c, W * .82, W * .38, W * .02, '#9db685');
        const y = slotsBottom(s); bow(c, W / 2, y + W * .09, W * .13, '#d9aab2', '#a96b75');
        txt(c, 'LIMITED EDITION · SPECIAL FOR ' + ALIA.toUpperCase(), W / 2, y + W * .22, `700 ${W * .026}px ${SANS}`, '#a96b75', 'center', W * .008); txt(c, '27 November 2026', W / 2, y + W * .29, `italic 500 ${W * .06}px ${SERIF}`, '#2a292b');
        star5(c, W * .16, y + W * .15, W * .025, '#9db685'); star5(c, W * .84, y + W * .15, W * .025, '#9db685'); sparkle(c, W * .12, y + W * .27, W * .02, '#c9a3a8'); sparkle(c, W * .88, y + W * .27, W * .02, '#c9a3a8');
      }
    }
  ];

  /* old templates form the 'Cute Classics' category; the new collections come first */
  TEMPLATES.forEach(t => { t.cat = 'Cute Classics'; });
  const ALL_TEMPLATES = EXCLUSIVE.concat(COLLECTION, TEMPLATES);
  const CATS = ['Semua', 'Alia Exclusive', 'Japan & Asia', 'Cities', 'Seasonal', 'Special Styles', 'Cute Classics'];

  /* ---------- state ---------- */
  const st = { fmt: FORMATS[2], tpl: ALL_TEMPLATES[0], cat: 'Semua', slots: [null, null, null, null], sel: 0, tok: [0, 0, 0, 0], pickTarget: null };
  let inited = false, canvas, ctx, view, fitK = 1, dispW = 0, dispH = 0, raf = 0, thumbRaf = 0, fontsOK = false;
  const els = {};

  function layout(t, f) {
    const W = f.W, H = f.H, m = t.m, top = m.top * W, side = m.side * W, bottom = m.bottom * W, gap = m.gap * W;
    const sw = W - side * 2, avail = H - top - bottom - gap * (f.n - 1);
    const sh = Math.min(avail / f.n, sw * (f.n === 1 ? 2.1 : 1.65));
    const used = sh * f.n + gap * (f.n - 1), y0 = top + (H - top - bottom - used) / 2;
    return Array.from({ length: f.n }, (_, i) => ({ x: side, y: y0 + i * (sh + gap), w: sw, h: sh }));
  }
  function inset(r, d) { return { x: r.x + d, y: r.y + d, w: r.w - d * 2, h: r.h - d * 2 }; }
  function shapePath(c, r, t, W) { rr(c, r.x, r.y, r.w, r.h, (t.radius || 0) * W); }

  function clampPhoto(p, r) {
    const rw = p.rot % 2 ? p.src.h : p.src.w, rh = p.rot % 2 ? p.src.w : p.src.h;
    const base = Math.max(r.w / rw, r.h / rh), s = base * p.zoom;
    const mx = Math.max(0, (rw * s - r.w) / 2), my = Math.max(0, (rh * s - r.h) / 2);
    return { s, ox: Math.max(-mx, Math.min(mx, p.ox)), oy: Math.max(-my, Math.min(my, p.oy)), mx, my };
  }
  function drawPhoto(c, p, r) {
    const k = clampPhoto(p, r);
    c.save(); c.translate(r.x + r.w / 2 + k.ox, r.y + r.h / 2 + k.oy); c.rotate(p.rot * Math.PI / 2); c.scale(k.s, k.s);
    c.imageSmoothingQuality = 'high'; c.drawImage(p.src.img, -p.src.w / 2, -p.src.h / 2, p.src.w, p.src.h); c.restore();
  }
  function placeholder(c, r, i, mode, W) {
    if (mode === 'out') { c.fillStyle = '#efe9e4'; c.fillRect(r.x, r.y, r.w, r.h); return; }
    if (mode === 'thumb') {
      const pal = [['#f6cfda', '#fbe9ee'], ['#d9e6c9', '#eef4e6'], ['#e7e1dc', '#f6f2ee'], ['#cfd9ea', '#e9eef6']][i % 4];
      const g = c.createLinearGradient(r.x, r.y, r.x, r.y + r.h); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h);
      const cx = r.x + r.w / 2, u = Math.min(r.w, r.h); c.fillStyle = 'rgba(255,255,255,.75)';
      c.beginPath(); c.arc(cx, r.y + r.h * .42, u * .17, 0, TAU); c.fill(); c.beginPath(); c.ellipse(cx, r.y + r.h * .86, u * .32, u * .26, 0, 0, TAU); c.fill(); return;
    }
    c.fillStyle = '#f4ece8'; c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = 'rgba(169,107,117,.16)'; c.lineWidth = 2; c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
    for (let d = -r.h; d < r.w; d += W * .035) { c.beginPath(); c.moveTo(r.x + d, r.y + r.h); c.lineTo(r.x + d + r.h, r.y); c.stroke(); } c.restore();
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, u = Math.min(r.w, r.h) * .13;
    c.fillStyle = '#a96b75'; c.beginPath(); c.arc(cx, cy, u, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = u * .16; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - u * .45, cy); c.lineTo(cx + u * .45, cy); c.moveTo(cx, cy - u * .45); c.lineTo(cx, cy + u * .45); c.stroke();
    txt(c, 'Ketuk untuk tambah foto', cx, cy + u * 2.1, `500 ${Math.max(20, W * .026)}px ${SANS}`, '#8f6a72');
  }

  /* One render function for preview, thumbnails and the final PNG. */
  function render(c, t, f, photos, k, mode, sel) {
    const W = f.W, H = f.H; c.save(); c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, W, H);
    t.paper(c, W, H);
    const slots = layout(t, f);
    slots.forEach((r, i) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, tilt = (t.tilt || 0) * (i % 2 ? 1 : -1) * Math.PI / 180;
      c.save(); if (tilt) { c.translate(cx, cy); c.rotate(tilt); c.translate(-cx, -cy); }
      if (t.shadow) { c.save(); c.shadowColor = 'rgba(60,30,40,.28)'; c.shadowBlur = W * .025; c.shadowOffsetY = W * .01; c.fillStyle = '#fff'; shapePath(c, r, t, W); c.fill(); c.restore(); }
      t.under && t.under(c, r, i, W);
      c.save(); shapePath(c, r, t, W); c.clip();
      const p = photos[i];
      if (p) drawPhoto(c, p, r); else placeholder(c, r, i, mode, W);
      c.restore();
      if (t.border) { c.save(); c.lineWidth = t.border.w * W; c.strokeStyle = t.border.col; shapePath(c, inset(r, -t.border.w * W / 2), { radius: (t.radius || 0) + t.border.w / 2 }, W); c.stroke(); c.restore(); }
      c.restore();
    });
    t.deco && t.deco(c, W, H, slots, f);
    if (mode === 'ui' && sel != null && slots[sel]) {
      const r = slots[sel], cx = r.x + r.w / 2, cy = r.y + r.h / 2, tilt = (t.tilt || 0) * (sel % 2 ? 1 : -1) * Math.PI / 180;
      c.save(); if (tilt) { c.translate(cx, cy); c.rotate(tilt); c.translate(-cx, -cy); }
      c.setLineDash([W * .02, W * .014]); c.lineWidth = Math.max(3, W * .005); c.strokeStyle = 'rgba(255,255,255,.95)'; shapePath(c, inset(r, W * .004), t, W); c.stroke();
      c.lineDashOffset = W * .017; c.strokeStyle = '#a96b75'; shapePath(c, inset(r, W * .004), t, W); c.stroke(); c.restore();
    }
    c.restore();
  }

  /* ---------- preview canvas ---------- */
  function fit() {
    if (!view || !view.clientWidth) return;
    const cs = getComputedStyle(view), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const aw = view.clientWidth - padX, ah = view.clientHeight - padY, f = st.fmt;
    let w = Math.min(aw, ah * f.W / f.H), h = w * f.H / f.W;
    dispW = Math.max(60, Math.floor(w)); dispH = Math.max(60, Math.floor(h));
    const dpr = Math.min(window.devicePixelRatio || 1, 2); let bw = dispW * dpr; const px = bw * (bw * f.H / f.W); if (px > 3.2e6) bw *= Math.sqrt(3.2e6 / px);
    canvas.style.width = dispW + 'px'; canvas.style.height = dispH + 'px';
    canvas.width = Math.round(bw); canvas.height = Math.round(bw * f.H / f.W); fitK = canvas.width / f.W;
    paint();
  }
  function paint() { if (!inited) return; render(ctx, st.tpl, st.fmt, st.slots, fitK, 'ui', st.sel); }
  function requestPaint() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); }

  /* ---------- photo loading (race-safe, memory-safe) ---------- */
  function say(el, text, ms) { el.textContent = text; el.hidden = !text; clearTimeout(el._t); if (text && ms) el._t = setTimeout(() => { el.hidden = true; el.textContent = ''; }, ms); }
  const err = t => say(els.err, t, 7000);
  const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  function supported(file) { return OK_TYPES.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name)); }

  async function decode(file) {
    let bmp = null;
    if (window.createImageBitmap) { try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = null; } }
    let w, h, img;
    if (bmp) { w = bmp.width; h = bmp.height; img = bmp; }
    else {
      const url = URL.createObjectURL(file);
      try {
        const im = new Image(); im.decoding = 'async'; im.src = url;
        await (im.decode ? im.decode() : new Promise((res, rej) => { im.onload = res; im.onerror = rej; }));
        w = im.naturalWidth; h = im.naturalHeight; if (!w || !h) throw new Error('empty');
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0); img = cv;
      } finally { URL.revokeObjectURL(url); }
    }
    if (!w || !h) throw new Error('empty');
    const MAX = 2400;
    if (Math.max(w, h) > MAX) {
      const s = MAX / Math.max(w, h), cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, cv.width, cv.height);
      if (img.close) img.close(); return { img: cv, w: cv.width, h: cv.height, refs: 0 };
    }
    return { img, w, h, refs: 0 };
  }
  function retain(src) { src.refs++; return src; }
  function release(src) { if (src && --src.refs <= 0 && src.img && src.img.close) { try { src.img.close(); } catch (e) {} } }
  function setSlot(i, src) {
    const old = st.slots[i];
    st.slots[i] = src ? { src: retain(src), zoom: 1, rot: 0, ox: 0, oy: 0 } : null;
    if (old) release(old.src);
  }

  async function loadInto(i, file) {
    const tok = ++st.tok[i]; els.loading.hidden = false;
    try {
      if (!supported(file)) throw new Error('type');
      if (file.size > 60 * 1024 * 1024) throw new Error('big');
      const src = await decode(file);
      if (tok !== st.tok[i]) { if (src.img.close) src.img.close(); return false; }  // a newer pick for this slot won
      setSlot(i, src); return true;
    } catch (e) {
      if (tok === st.tok[i]) err(e.message === 'type' ? `“${file.name}” tidak didukung. Pakai JPG, JPEG, PNG, atau WebP ya.` : e.message === 'big' ? `“${file.name}” terlalu besar (maks 60 MB).` : `“${file.name}” tidak bisa dibaca. Filenya mungkin rusak, coba foto lain.`);
      return false;
    }
  }
  async function handleFiles(files, target) {
    const list = Array.from(files || []); if (!list.length) return; say(els.err, '');
    els.loading.hidden = false; let ok = 0;
    try {
      if (target != null) { if (await loadInto(target, list[0])) { ok++; st.sel = target; } }
      else {
        const n = st.fmt.n; const free = []; for (let i = 0; i < n; i++) if (!st.slots[i]) free.push(i);
        const targets = free.length ? free : [st.sel];
        for (let j = 0; j < list.length && j < targets.length; j++) { if (await loadInto(targets[j], list[j])) { ok++; st.sel = targets[j]; } }
        if (list.length > targets.length) say(els.msg, `Hanya ${targets.length} foto yang dipakai untuk format ini.`, 4000);
      }
    } finally { els.loading.hidden = true; }
    if (ok) { syncUI(); requestPaint(); scheduleThumbs(); }
  }
  function pick(target) { st.pickTarget = target; els.file.value = ''; els.file.multiple = target == null; els.file.click(); }

  /* ---------- UI sync ---------- */
  function syncUI() {
    const n = st.fmt.n, cur = st.slots[st.sel];
    els.slots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slot' + (st.slots[i] ? ' has' : '') + (i === st.sel ? ' sel' : ''); b.setAttribute('aria-label', 'Slot ' + (i + 1) + (st.slots[i] ? ' (ada foto)' : ' (kosong)'));
      if (st.slots[i]) { const c = document.createElement('canvas'); c.width = c.height = 124; const g = c.getContext('2d'), s = st.slots[i].src, sc = Math.max(124 / s.w, 124 / s.h); g.drawImage(s.img, (124 - s.w * sc) / 2, (124 - s.h * sc) / 2, s.w * sc, s.h * sc); b.appendChild(c); }
      else b.textContent = '+';
      const nn = document.createElement('b'); nn.textContent = i + 1; b.appendChild(nn);
      b.addEventListener('click', () => { st.sel = i; if (!st.slots[i]) pick(i); syncUI(); requestPaint(); });
      els.slots.appendChild(b);
    }
    els.slotInfo.textContent = n > 1 ? `slot ${st.sel + 1} dari ${n}` : '1 slot';
    const any = st.slots.slice(0, n).some(Boolean);
    [els.zoom, els.zoomIn, els.zoomOut, els.rotate, els.reset].forEach(b => { b.disabled = !cur; });
    els.change.disabled = !cur; els.remove.disabled = !cur; els.add.textContent = any ? 'Tambah foto' : 'Pilih foto';
    els.same.hidden = !(n > 1 && cur); els.download.disabled = !any;
    if (cur) els.zoom.value = cur.zoom;
    canvas.style.touchAction = cur ? 'none' : 'pan-y';
    els.hint.textContent = !any ? 'Pilih foto dari galeri atau folder, lalu atur posisinya di sini.' : 'Seret foto untuk menggeser · cubit atau scroll untuk zoom';
  }
  function buildFormats() {
    const icon = n => `<svg viewBox="0 0 26 34" aria-hidden="true">${Array.from({ length: n }, (_, i) => { const h = (30 - (n - 1) * 2) / n, y = 2 + i * (h + 2); return `<rect x="3" y="${y.toFixed(1)}" width="20" height="${h.toFixed(1)}" rx="2" fill="currentColor" opacity=".78"/>`; }).join('')}</svg>`;
    els.formats.innerHTML = '';
    FORMATS.forEach(f => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fmt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(f === st.fmt));
      b.innerHTML = icon(f.n) + `<span>${f.n === 4 ? '4 Foto' : f.n + ' Foto'}</span>`;
      b.addEventListener('click', () => {
        st.fmt = f; st.sel = Math.min(st.sel, f.n - 1);
        $$('.fmt', els.formats).forEach(x => x.setAttribute('aria-checked', String(x === b)));
        fit(); syncUI(); scheduleThumbs();
      });
      els.formats.appendChild(b);
    });
  }
  let thumbCanvases = [];
  function buildFrames() {
    els.frames.innerHTML = ''; thumbCanvases = [];
    ALL_TEMPLATES.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'frm'; b.dataset.cat = t.cat; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(t === st.tpl)); b.setAttribute('aria-label', t.name);
      const cv = document.createElement('canvas'); b.appendChild(cv); const s = document.createElement('span'); s.textContent = t.name; b.appendChild(s);
      b.addEventListener('click', () => {
        st.tpl = t; $$('.frm', els.frames).forEach(x => x.setAttribute('aria-checked', String(x === b))); els.frameName.textContent = t.name; paint();
      });
      els.frames.appendChild(b); thumbCanvases.push([t, cv]);
    });
    els.frameName.textContent = st.tpl.name;
    els.cats.innerHTML = '';
    CATS.forEach(cn => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = cn; b.setAttribute('aria-pressed', String(cn === st.cat));
      b.addEventListener('click', () => { st.cat = cn; applyCat(); }); els.cats.appendChild(b);
    });
    applyCat(false);
  }
  function applyCat(draw = true) {
    $$('.frm', els.frames).forEach(b => { b.hidden = st.cat !== 'Semua' && b.dataset.cat !== st.cat; });
    $$('.chip', els.cats).forEach(b => b.setAttribute('aria-pressed', String(b.textContent === st.cat)));
    if (draw) { els.frames.scrollTop = 0; scheduleThumbs(); }
  }
  function scheduleThumbs() { if (thumbRaf) cancelAnimationFrame(thumbRaf); thumbRaf = requestAnimationFrame(() => { thumbRaf = 0; drawThumbs(); }); }
  function drawThumbs() {
    const f = st.fmt, tw = 180, th = Math.round(tw * f.H / f.W), k = tw / f.W, photos = st.slots.map(p => p);
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < thumbCanvases.length && performance.now() - t0 < 14) {
        const [t, cv] = thumbCanvases[i++]; if (cv.parentNode.hidden) continue; cv.width = tw; cv.height = th; cv.style.aspectRatio = f.W + '/' + f.H;
        render(cv.getContext('2d'), t, f, photos, k, 'thumb', null);
      }
      if (i < thumbCanvases.length) requestAnimationFrame(step);
    };
    step();
  }

  /* ---------- pointer / wheel interaction on the preview ---------- */
  function toLogical(e) { const r = canvas.getBoundingClientRect(), k = st.fmt.W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k }; }
  function slotAt(x, y) { const sl = layout(st.tpl, st.fmt); for (let i = 0; i < sl.length; i++) { const r = sl[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i; } return -1; }
  function setZoom(p, z) { p.zoom = Math.max(1, Math.min(3.5, z)); const r = layout(st.tpl, st.fmt)[st.sel]; const k = clampPhoto(p, r); p.ox = k.ox; p.oy = k.oy; }
  function initPointer() {
    const ptrs = new Map(); let drag = null, pinch = null, moved = false, downSlot = -1;
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = toLogical(e), i = slotAt(p.x, p.y); moved = false;
      if (ptrs.size === 1) { downSlot = i; if (i >= 0 && st.sel !== i) { st.sel = i; syncUI(); requestPaint(); } const cur = st.slots[st.sel]; if (i >= 0 && cur) { drag = { x: e.clientX, y: e.clientY, ox: cur.ox, oy: cur.oy, k: p.k }; canvas.classList.add('drag'); } }
      else if (ptrs.size === 2 && st.slots[st.sel]) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: st.slots[st.sel].zoom }; drag = null; }
    });
    canvas.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cur = st.slots[st.sel];
      if (pinch && ptrs.size >= 2 && cur) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); setZoom(cur, pinch.z * d / pinch.d); els.zoom.value = cur.zoom; moved = true; requestPaint(); }
      else if (drag && cur) {
        const dx = (e.clientX - drag.x) * drag.k, dy = (e.clientY - drag.y) * drag.k; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) moved = true;
        const r = layout(st.tpl, st.fmt)[st.sel]; cur.ox = drag.ox + dx; cur.oy = drag.oy + dy; const k = clampPhoto(cur, r); cur.ox = k.ox; cur.oy = k.oy; requestPaint();
      }
    });
    const up = e => {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) { canvas.classList.remove('drag'); if (!moved && downSlot >= 0 && !st.slots[downSlot] && e.type === 'pointerup') pick(downSlot); drag = null; scheduleThumbsSoon(); }
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
      const p = toLogical(e), i = slotAt(p.x, p.y); const idx = i >= 0 ? i : st.sel; const cur = st.slots[idx]; if (!cur) return;
      e.preventDefault(); if (idx !== st.sel) { st.sel = idx; syncUI(); }
      setZoom(cur, cur.zoom * Math.exp(-e.deltaY * .0016)); els.zoom.value = cur.zoom; requestPaint();
    }, { passive: false });
  }
  let thumbT = 0; function scheduleThumbsSoon() { clearTimeout(thumbT); thumbT = setTimeout(scheduleThumbs, 350); }

  /* ---------- download ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  /* insert a pHYs chunk (pixels per metre) right after IHDR so print apps read 300 DPI */
  async function withDpi(blob, dpi) {
    try {
      const buf = new Uint8Array(await blob.arrayBuffer()), ppm = Math.round(dpi / 0.0254), chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
      dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1; dv.setUint32(17, crc32(chunk.subarray(4, 17)));
      const at = 33; /* 8 signature + 25 IHDR */
      const out = new Uint8Array(buf.length + 21); out.set(buf.subarray(0, at)); out.set(chunk, at); out.set(buf.subarray(at), at + 21);
      return new Blob([out], { type: 'image/png' });
    } catch (e) { return blob; }
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  async function download() {
    const f = st.fmt, n = f.n; if (!st.slots.slice(0, n).some(Boolean)) { say(els.msg, 'Pilih foto dulu ya.', 3000); return; }
    els.download.disabled = true; say(els.msg, 'Menyiapkan PNG…');
    try {
      await ensureFonts();
      const k = 1, cv = document.createElement('canvas'); cv.width = Math.round(f.W * k); cv.height = Math.round(f.H * k);
      render(cv.getContext('2d'), st.tpl, f, st.slots, cv.width / f.W, 'out', null);
      const raw = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'));
      const blob = await withDpi(raw, 300);
      cv.width = cv.height = 0;
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `alia-photobooth-${slug(st.tpl.name)}-${f.id}.png`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      const empty = st.slots.slice(0, n).some(p => !p);
      say(els.msg, empty ? 'Tersimpan! (ada slot yang masih kosong)' : 'Tersimpan! Cek folder Download kamu ✨', 5000);
    } catch (e) { say(els.msg, 'Gagal membuat gambar. Coba lagi ya.', 5000); }
    finally { els.download.disabled = !st.slots.slice(0, n).some(Boolean); }
  }

  /* ---------- fonts for the canvas ---------- */
  async function ensureFonts() {
    if (fontsOK || !document.fonts || !document.fonts.load) { fontsOK = true; return; }
    try { await Promise.race([Promise.all([document.fonts.load('italic 300 60px "Cormorant Garamond"'), document.fonts.load('700 60px "Cormorant Garamond"'), document.fonts.load('600 40px Caveat'), document.fonts.load('500 20px "DM Sans"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    fontsOK = true;
  }

  /* ---------- init ---------- */
  function init() {
    if (inited) return;
    ['view:pbView', 'canvas:pbCanvas', 'loading:pbLoading', 'hint:pbHint', 'zoom:pbZoom', 'zoomIn:pbZoomIn', 'zoomOut:pbZoomOut', 'rotate:pbRotate', 'reset:pbReset', 'slots:pbSlots', 'slotInfo:pbSlotInfo', 'add:pbAdd', 'change:pbChange', 'remove:pbRemove', 'same:pbSame', 'file:pbFile', 'err:pbErr', 'formats:pbFormats', 'frames:pbFrames', 'cats:pbCats', 'frameName:pbFrameName', 'download:pbDownload', 'msg:pbMsg']
      .forEach(p => { const [k, id] = p.split(':'); els[k] = document.getElementById(id); });
    view = els.view; canvas = els.canvas; ctx = canvas.getContext('2d'); inited = true;

    els.file.addEventListener('change', () => { const t = st.pickTarget; handleFiles(els.file.files, t); st.pickTarget = null; });
    els.add.addEventListener('click', () => pick(null));
    els.change.addEventListener('click', () => pick(st.sel));
    els.remove.addEventListener('click', () => { setSlot(st.sel, null); st.tok[st.sel]++; syncUI(); requestPaint(); scheduleThumbs(); say(els.err, ''); });
    els.same.addEventListener('click', () => {
      const cur = st.slots[st.sel] || st.slots.find(Boolean); if (!cur) return;
      for (let i = 0; i < st.fmt.n; i++) if (i !== st.sel && st.slots[i] !== cur) { st.tok[i]++; setSlot(i, cur.src); }
      syncUI(); requestPaint(); scheduleThumbs();
    });
    const zoomBy = d => { const p = st.slots[st.sel]; if (!p) return; setZoom(p, p.zoom + d); els.zoom.value = p.zoom; requestPaint(); };
    els.zoomIn.addEventListener('click', () => zoomBy(.2)); els.zoomOut.addEventListener('click', () => zoomBy(-.2));
    els.zoom.addEventListener('input', () => { const p = st.slots[st.sel]; if (!p) return; setZoom(p, parseFloat(els.zoom.value)); requestPaint(); });
    els.rotate.addEventListener('click', () => { const p = st.slots[st.sel]; if (!p) return; p.rot = (p.rot + 1) % 4; setZoom(p, p.zoom); requestPaint(); scheduleThumbs(); });
    els.reset.addEventListener('click', () => { const p = st.slots[st.sel]; if (!p) return; p.zoom = 1; p.rot = 0; p.ox = p.oy = 0; els.zoom.value = 1; requestPaint(); scheduleThumbs(); });
    els.download.addEventListener('click', download);
    buildFormats(); buildFrames(); initPointer();
    if (window.ResizeObserver) new ResizeObserver(() => fit()).observe(view); else addEventListener('resize', fit);
    syncUI(); fit(); scheduleThumbs();
    ensureFonts().then(() => { paint(); scheduleThumbs(); });
  }

  document.addEventListener('app:open', e => { if (e.detail !== 'photobooth') return; init(); requestAnimationFrame(() => { fit(); scheduleThumbs(); }); });
  window.__pb = { st, TEMPLATES: ALL_TEMPLATES, CATS, FORMATS, render, layout, handleFiles, download };
})();
