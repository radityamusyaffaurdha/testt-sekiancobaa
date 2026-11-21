/* =========================================================
   SEBERAPA KENAL KAMU DENGAN ALIA? — separate view, 100% Indonesian.
   The correct answer is stored by TEXT (not by position), so shuffling
   the options can never swap which answer is right.
   ========================================================= */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const TOTAL = 10;

  /* a = correct option (stored by text, so shuffling can never swap it); every fact comes from the Alia notes in this project */
  const POOL = [
    { q: 'Coba tebak, kalau lagi foto bareng terus Alia nggak diajak, biasanya dia gimana?', a: 'Ngambek', w: ['Pura-pura nggak peduli', 'Ikut nimbrung diam-diam', 'Foto sendiri aja'], ok: 'Alia emang suka banget diajak foto. Jangan sampai ketinggalan ya!' },
    { q: 'Nah, kalau soal hewan, Alia paling suka sama...', a: 'Kucing', w: ['Kelinci', 'Anjing', 'Hamster'], ok: 'Kucinggg! Nggak kalah penting.' },
    { q: 'Kalau Alia, ciri khas penampilannya yang gampang diingat apa?', a: 'Kacamata', w: ['Topi dan jaket', 'Poni tebal dan anting besar', 'Hoodie dan sneakers'], ok: 'Kacamata, udah jadi ciri khasnya.' },
    { q: 'Kira-kira, Alia itu tipe yang gimana soal tidur?', a: 'Suka begadang', w: ['Tidur cepat tiap malam', 'Bangun subuh terus', 'Tidur siang terus'], ok: 'Night owl sejati. Tapi jangan keseringan ya!' },
    { q: 'Menurut kamu, mood Alia sehari-hari itu kayak gimana?', a: 'Susah ditebak', w: ['Selalu ceria dari pagi', 'Selalu tenang dan datar', 'Gampang banget ditebak'], ok: 'Kadang seneng, kadang ngambek. Susah ditebak pokoknya!' },
    { q: 'Coba tebak, sekarang Alia lagi sibuk apa?', a: 'Kuliah dan ngerjain tugas', w: ['Kerja kantoran', 'Persiapan masuk sekolah', 'Lagi cuti panjang'], ok: 'Semangat terus kuliahnya, Teh Alia!' },
    { q: 'Kalau malam hari, Alia suka ngapain, kira-kira?', a: 'Jalan-jalan malam', w: ['Rebahan sambil nonton', 'Belajar sampai pagi', 'Langsung tidur'], ok: 'Jalan-jalan malam, sambil menikmati suasananya.' },
    { q: 'Nah, kalau lagi ngobrol, Alia biasanya suka...', a: 'Cerita random soal lagi ngapain aja', w: ['Diam dan dengerin aja', 'Ngomongin tugas terus', 'Bales chat pendek-pendek'], ok: 'Cerita random, dan seru banget didengerin.' },
    { q: 'Kalau Alia udah lapar, kira-kira agenda berikutnya apa?', a: 'Cari jajanan', w: ['Cari makanan berat', 'Bikin camilan sendiri', 'Cari minuman dulu'], ok: 'Jajanan dulu, baru yang lain wkwk.' },
    { q: 'Coba tebak, tanggal ulang tahun Alia kapan?', a: '27 November', w: ['17 November', '27 Oktober', '7 November'], ok: '27 November, tanggal yang wajib dicatat!' },
    { q: 'Kira-kira, siapa yang bikin website ini buat Alia?', a: 'Radit', w: ['Teman sekelas Alia', 'Admin kampus', 'Kakaknya Alia'], ok: 'Betul, Radit. Teman yang bukan teman biasa, hehe.' },
    { q: 'Kalau Alia mulai cerita lewat voice atau call, kamu harus siapin apa?', a: 'Tempat nyaman buat dengerin sampai selesai', w: ['Alasan biar bisa kabur', 'Catatan buat ngerangkum', 'Kuota tambahan banget'], ok: 'Siapin tempat nyaman, ceritanya bakal panjang!' }
  ];
  const GOOD = ['Wahh, bener juga kamu!', 'Nah, ternyata kamu lumayan kenal Alia!', 'Yeay, tepat banget!', 'Mantap, kamu tahu!'];
  const BAD = ['Yahh, masih kurang kenal nih wkwk.', 'Hampirrr, tapi belum pas!', 'Oops, bukan itu hehe.', 'Belum pas nih, coba lagi di soal berikutnya!'];
  const RANKS = [
    { max: 30, name: 'Masih Perlu Kenalan Lagi', note: 'Hmm, kayaknya kamu perlu ngobrol lebih banyak sama Alia deh. Mulai dari matcha dan kucing dulu ya wkwk.' },
    { max: 60, name: 'Lumayan Kenal', note: 'Lumayan nih! Sebagian besar udah kamu tahu. Tinggal lebih sering dengerin cerita random Alia biar nilainya naik.' },
    { max: 80, name: "Alia's Bestie", note: 'Wah, bestie sejati! Alia pasti seneng ada yang sehapal ini sama kebiasaannya.' },
    { max: 100, name: 'Alia Expert!', note: 'Gila, sampai hal kecil soal Alia pun kamu hafal! Resmi jadi pakar Alia! 🏆' }
  ];

  const $$ = {};
  let inited = false, order = [], idx = 0, score = 0, locked = false, lastDeck = '';

  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const show = id => { ['qzIntro', 'qzPlay', 'qzEnd'].forEach(k => { $$[k].hidden = k !== id; }); };

  function newRound() {
    let deck; let tries = 0;
    do { deck = shuffle(POOL).slice(0, TOTAL); tries++; } while (deck.map(d => d.q).join('|') === lastDeck && tries < 4);
    lastDeck = deck.map(d => d.q).join('|');
    order = deck.map(d => ({ ...d, opts: shuffle([d.a, ...d.w]) }));
    idx = 0; score = 0; locked = false;
    show('qzPlay'); renderQ(true);
  }

  function renderQ(first) {
    const d = order[idx]; locked = false;
    $$.prog.textContent = `${idx + 1} / ${TOTAL}`; $$.live.textContent = `${score} poin`; $$.bar.style.transform = `scaleX(${idx / TOTAL})`;
    $$.q.textContent = d.q; $$.opts.innerHTML = ''; $$.fb.hidden = true; $$.fb.className = 'qz__fb'; $$.next.hidden = true;
    d.opts.forEach((text, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt';
      const l = document.createElement('b'); l.textContent = 'ABCD'[i]; const s = document.createElement('span'); s.textContent = text; b.append(l, s);
      b.addEventListener('click', () => answer(b, text));
      $$.opts.appendChild(b);
    });
    $$.card.classList.remove('swap'); void $$.card.offsetWidth; $$.card.classList.add('swap');
    if (!first) { const first = $$.opts.querySelector('.opt'); first && first.focus({ preventScroll: true }); }
  }

  function answer(btn, text) {
    if (locked) return; locked = true;
    const d = order[idx], right = text === d.a;
    if (right) score += 10;
    Array.from($$.opts.children).forEach(b => {
      const t = b.querySelector('span').textContent; b.disabled = true;
      if (t === d.a) b.classList.add('ok'); else if (b === btn) b.classList.add('bad'); else b.classList.add('dim');
    });
    $$.live.textContent = `${score} poin`;
    $$.fb.className = 'qz__fb ' + (right ? 'ok' : 'bad'); $$.fb.hidden = false;
    $$.fb.textContent = right ? `${pick(GOOD)} ${d.ok}` : `${pick(BAD)} Jawabannya: ${d.a}.`;
    $$.bar.style.transform = `scaleX(${(idx + 1) / TOTAL})`;
    $$.next.textContent = idx === TOTAL - 1 ? 'Lihat hasil' : 'Lanjut'; $$.next.hidden = false; $$.next.focus({ preventScroll: true });
  }

  function finish() {
    const r = RANKS.find(x => score <= x.max) || RANKS[RANKS.length - 1];
    $$.final.textContent = score; $$.rank.textContent = r.name; $$.comment.textContent = r.note;
    show('qzEnd');
    if (score >= 90 && window.__fxConfetti) window.__fxConfetti();
  }

  function init() {
    if (inited) return; inited = true;
    const ids = { prog: 'qzProg', live: 'qzScoreLive', bar: 'qzBar', card: 'qzCard', q: 'qzQ', opts: 'qzOpts', fb: 'qzFb', next: 'qzNext', final: 'qzFinal', rank: 'qzRank', comment: 'qzComment', qzIntro: 'qzIntro', qzPlay: 'qzPlay', qzEnd: 'qzEnd' };
    Object.keys(ids).forEach(k => { $$[k] = document.getElementById(ids[k]); });
    $('#qzStart').addEventListener('click', newRound);
    $('#qzAgain').addEventListener('click', newRound);
    $$.next.addEventListener('click', () => { if (idx >= TOTAL - 1) finish(); else { idx++; renderQ(false); } });
  }

  document.addEventListener('app:open', e => { if (e.detail === 'quiz') { init(); if (!$$.qzPlay || $$.qzPlay.hidden) { /* keep the current screen when re-opened mid-way */ } } });
  window.__quiz = { POOL, get state() { return { idx, score, order }; } };
})();
