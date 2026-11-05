'use strict';
/*
 * Little Stars: a learning and music app for little kids.
 * Plain HTML, CSS and JavaScript with no build step, so the same code runs as a
 * web app (PWA) on any phone, tablet or computer and inside Capacitor as a
 * native Android or iOS app.
 */

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');

const store = {
  get(k, d) { try { const v = localStorage.getItem('littlestars_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('littlestars_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};

const state = {
  stars: store.get('stars', 0),
  music: store.get('music', true),
  voice: store.get('voice', true),
};

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => shuffle(a).slice(0, n);
const choicesFor = (list, target, n) => shuffle([target, ...sample(list.filter((x) => x !== target), n - 1)]);
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// Every screen change bumps the generation, which cancels pending timers of the old screen.
let gen = 0;
const newGen = () => ++gen;
function later(fn, ms) { const g = gen; return setTimeout(() => { if (g === gen) fn(); }, ms); }

function bounce(el) { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); }

/* ================= content ================= */
const RAINBOW = ['#ff4d6d', '#ff8c42', '#f4b400', '#2fbf63', '#18a9c4', '#4d7cff', '#9b5de5', '#f15bb5'];
const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
const PRAISE = ['Great job!', 'Awesome!', 'You did it!', 'Super star!', 'Wonderful!', 'Yay!', 'Brilliant!', 'Fantastic!', 'Hooray!', 'So clever!'];
const OOPS = ['Oops! Try again!', 'Not quite. Try again!', 'Almost! Try another one!'];

const LETTERS = [
  ['A', 'Apple', '🍎'], ['B', 'Butterfly', '🦋'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'],
  ['E', 'Elephant', '🐘'], ['F', 'Fish', '🐟'], ['G', 'Giraffe', '🦒'], ['H', 'House', '🏠'],
  ['I', 'Ice cream', '🍦'], ['J', 'Juice', '🧃'], ['K', 'Kite', '🪁'], ['L', 'Lion', '🦁'],
  ['M', 'Moon', '🌙'], ['N', 'Noodles', '🍜'], ['O', 'Octopus', '🐙'], ['P', 'Penguin', '🐧'],
  ['Q', 'Queen', '👸'], ['R', 'Rainbow', '🌈'], ['S', 'Sun', '☀️'], ['T', 'Tiger', '🐯'],
  ['U', 'Umbrella', '☂️'], ['V', 'Violin', '🎻'], ['W', 'Whale', '🐳'], ['X', 'Xylophone', '🎶'],
  ['Y', 'Yo-yo', '🪀'], ['Z', 'Zebra', '🦓'],
];

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COUNT_ITEMS = [
  { e: '🍎', one: 'apple', many: 'apples' }, { e: '⭐', one: 'star', many: 'stars' },
  { e: '🐟', one: 'fish', many: 'fish' }, { e: '🎈', one: 'balloon', many: 'balloons' },
  { e: '🐞', one: 'ladybug', many: 'ladybugs' }, { e: '🍓', one: 'strawberry', many: 'strawberries' },
  { e: '🚗', one: 'car', many: 'cars' }, { e: '🦆', one: 'duck', many: 'ducks' },
  { e: '🌸', one: 'flower', many: 'flowers' }, { e: '🍪', one: 'cookie', many: 'cookies' },
];

const COLORS = [
  { name: 'Red', hex: '#ff3b30', like: 'a strawberry', e: '🍓' },
  { name: 'Orange', hex: '#ff9500', like: 'an orange', e: '🍊' },
  { name: 'Yellow', hex: '#ffd60a', like: 'a banana', e: '🍌' },
  { name: 'Green', hex: '#34c759', like: 'a frog', e: '🐸' },
  { name: 'Blue', hex: '#0a84ff', like: 'a whale', e: '🐳' },
  { name: 'Purple', hex: '#af52de', like: 'grapes', e: '🍇' },
  { name: 'Pink', hex: '#ff6fb5', like: 'a flamingo', e: '🦩' },
  { name: 'Brown', hex: '#a0632a', like: 'a teddy bear', e: '🧸' },
];

const SHAPES = [
  { name: 'Circle', fact: 'It is round, like a ball!', svg: '<circle cx="50" cy="50" r="42"/>' },
  { name: 'Square', fact: 'It has four sides, all the same!', svg: '<rect x="10" y="10" width="80" height="80" rx="5"/>' },
  { name: 'Triangle', fact: 'It has three sides, like a slice of pizza!', svg: '<polygon points="50,8 94,90 6,90" stroke-linejoin="round"/>' },
  { name: 'Rectangle', fact: 'It is long, like a door!', svg: '<rect x="4" y="24" width="92" height="52" rx="5"/>' },
  { name: 'Star', fact: 'It twinkles in the sky!', svg: '<polygon points="50,5 61,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 39,38" stroke-linejoin="round"/>' },
  { name: 'Heart', fact: 'It means love!', svg: '<path d="M50,90 C50,90 6,62 6,34 C6,19 17,9 30,9 C40,9 47,15 50,23 C53,15 60,9 70,9 C83,9 94,19 94,34 C94,62 50,90 50,90Z"/>' },
  { name: 'Oval', fact: 'It looks like an egg!', svg: '<ellipse cx="50" cy="50" rx="30" ry="44"/>' },
  { name: 'Diamond', fact: 'It looks like a kite!', svg: '<polygon points="50,4 90,50 50,96 10,50" stroke-linejoin="round"/>' },
];
const shapeSvg = (s, color) =>
  `<svg viewBox="0 0 100 100" class="shape" aria-label="${s.name}"><g fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="3">${s.svg}</g></svg>`;

const ANIMALS = [
  { e: '🐮', n: 'cow', s: 'moo' }, { e: '🐶', n: 'dog', s: 'woof woof' }, { e: '🐱', n: 'cat', s: 'meow' },
  { e: '🦆', n: 'duck', s: 'quack quack' }, { e: '🐑', n: 'sheep', s: 'baa baa' }, { e: '🐷', n: 'pig', s: 'oink oink' },
  { e: '🦁', n: 'lion', s: 'roar' }, { e: '🐸', n: 'frog', s: 'ribbit' }, { e: '🐴', n: 'horse', s: 'neigh' },
  { e: '🐓', n: 'rooster', s: 'cock-a-doodle-doo' }, { e: '🦉', n: 'owl', s: 'hoo hoo' }, { e: '🐝', n: 'bee', s: 'buzz' },
  { e: '🐍', n: 'snake', s: 'hiss' }, { e: '🐵', n: 'monkey', s: 'ooh ooh aah aah' }, { e: '🐘', n: 'elephant', s: 'toot toot' },
];

const MEM_POOL = [
  { e: '🐶', n: 'dog' }, { e: '🐱', n: 'cat' }, { e: '🐸', n: 'frog' }, { e: '🦊', n: 'fox' },
  { e: '🐼', n: 'panda' }, { e: '🐵', n: 'monkey' }, { e: '🦁', n: 'lion' }, { e: '🐷', n: 'pig' },
  { e: '🐰', n: 'bunny' }, { e: '🐻', n: 'bear' }, { e: '🐯', n: 'tiger' }, { e: '🍎', n: 'apple' },
  { e: '🍌', n: 'banana' }, { e: '🚀', n: 'rocket' }, { e: '🌈', n: 'rainbow' }, { e: '🍦', n: 'ice cream' },
];

const STICKERS = [
  ['🦄', 'unicorn'], ['🚀', 'rocket'], ['🌈', 'rainbow'], ['🦖', 'dinosaur'], ['🍭', 'lollipop'],
  ['🐬', 'dolphin'], ['🏰', 'castle'], ['🧸', 'teddy bear'], ['🦋', 'butterfly'], ['🎠', 'carousel'],
  ['🐼', 'panda'], ['🍩', 'donut'], ['🛸', 'flying saucer'], ['🐉', 'dragon'], ['🎸', 'guitar'],
  ['🦁', 'lion'], ['🍉', 'watermelon'], ['👑', 'crown'], ['🐙', 'octopus'], ['🌟', 'golden star'],
];
const STARS_PER_STICKER = 5;

const KEYS = [
  { n: 'C4', s: 'Do', c: '#ff4d6d', e: '🐞' }, { n: 'D4', s: 'Re', c: '#ff8c42', e: '🦊' },
  { n: 'E4', s: 'Mi', c: '#f4b400', e: '🐥' }, { n: 'F4', s: 'Fa', c: '#2fbf63', e: '🐸' },
  { n: 'G4', s: 'So', c: '#18a9c4', e: '🐳' }, { n: 'A4', s: 'La', c: '#4d7cff', e: '🦋' },
  { n: 'B4', s: 'Ti', c: '#9b5de5', e: '🍇' }, { n: 'C5', s: 'Do', c: '#f15bb5', e: '🦄' },
];
// Traditional nursery tunes. Letters are keys (c = high C); a digit is the number of beats.
const SONGS = [
  { name: 'Twinkle Twinkle', e: '⭐', notes: 'C C G G A A G2 F F E E D D C2 G G F F E E D2 G G F F E E D2 C C G G A A G2 F F E E D D C2' },
  { name: 'Mary Had a Little Lamb', e: '🐑', notes: 'E D C D E E E2 D D D2 E G G2 E D C D E E E E D D E D C4' },
  { name: 'Row Your Boat', e: '🚣', notes: 'C C C D E2 E D E F G4 c c c G G G E E E C C C G F E D C4' },
  { name: 'Old MacDonald', e: '🐮', notes: 'C C C G A A G2 E E D D C3 G C C C G A A G2 E E D D C3' },
  { name: 'Jingle Bells', e: '🔔', notes: 'E E E2 E E E2 E G C D E4 F F F F F E E E E D D E D2 G2' },
  { name: 'London Bridge', e: '🌉', notes: 'G A G F E F G2 D E F2 E F G2 G A G F E F G2 D2 G2 E C2' },
  { name: 'Hot Cross Buns', e: '🥯', notes: 'E D C2 E D C2 C C C C D D D D E D C2' },
  { name: 'Are You Sleeping', e: '😴', notes: 'C D E C C D E C E F G2 E F G2 G A G F E C G A G F E C c G c2 c G c2' },
  { name: 'Ode to Joy', e: '🎉', notes: 'E E F G G F E D C C D E E D D2 E E F G G F E D C C D E D C C2' },
  { name: 'Rain Rain Go Away', e: '🌧️', notes: 'G E2 G G E2 G G E A G G E2' },
  { name: 'Lightly Row', e: '🛶', notes: 'G E E2 F D D2 C D E F G G G2 G E E2 F D D2 C E G G C4' },
];
const KEY_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6, c: 7 };
const parseSong = (str) => str.trim().split(/\s+/).map((tok) => ({ k: KEY_INDEX[tok[0]], b: tok.length > 1 ? +tok.slice(1) : 1 }));

const GREETINGS = ['Hi friend! What shall we play today?', 'Yay, you are here! Let’s learn!', 'Pick a game. Let’s have fun!'];
const TICKLES = ['Hee hee! That tickles!', 'You are a super star!', 'Let’s sing a song!', 'I love learning with you!', 'Boing boing!'];

/* ================= voice ================= */
const Voice = {
  voice: null,
  native() {
    const C = window.Capacitor;
    return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.TextToSpeech;
  },
  init() {
    if (!('speechSynthesis' in window)) return;
    const choose = () => {
      const vs = speechSynthesis.getVoices();
      this.voice =
        vs.find((v) => /^en/i.test(v.lang) && /samantha|karen|moira|tessa|google us|zira|aria|jenny|female/i.test(v.name)) ||
        vs.find((v) => /^en[-_]US/i.test(v.lang)) ||
        vs.find((v) => /^en/i.test(v.lang)) || null;
    };
    choose();
    speechSynthesis.onvoiceschanged = choose;
  },
  say(text) {
    if (!state.voice || !text) return;
    const tts = this.native();
    if (tts) {
      tts.stop().catch(() => {});
      Sound.duck(true);
      tts.speak({ text, lang: 'en-US', rate: 0.9, pitch: 1.2, volume: 1 })
        .then(() => Sound.duck(false), () => Sound.duck(false));
      return;
    }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice ? this.voice.lang : 'en-US';
    u.rate = 0.9; u.pitch = 1.25;
    u.onstart = () => Sound.duck(true);
    u.onend = u.onerror = () => Sound.duck(false);
    speechSynthesis.speak(u);
  },
  stop() {
    const tts = this.native();
    if (tts) tts.stop().catch(() => {});
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
};

/* ================= mascot ================= */
const mascotSVG = () => `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <polygon points="60,8 74,42 111,44 82,67 92,104 60,84 28,104 38,67 9,44 46,42"
    fill="#ffd93b" stroke="#ffd93b" stroke-width="14" stroke-linejoin="round"/>
  <polygon points="60,8 74,42 111,44 82,67 92,104 60,84 28,104 38,67 9,44 46,42"
    fill="none" stroke="#f5b700" stroke-width="2" stroke-linejoin="round" transform="translate(60 58) scale(1.12) translate(-60 -58)" opacity=".5"/>
  <g class="eyes">
    <ellipse cx="48" cy="56" rx="6" ry="8" fill="#3b2d63"/>
    <ellipse cx="72" cy="56" rx="6" ry="8" fill="#3b2d63"/>
    <circle cx="50" cy="53" r="2.3" fill="#fff"/><circle cx="74" cy="53" r="2.3" fill="#fff"/>
  </g>
  <circle cx="39" cy="69" r="6" fill="#ff8fb1" opacity=".75"/>
  <circle cx="81" cy="69" r="6" fill="#ff8fb1" opacity=".75"/>
  <path d="M50 68 Q60 80 70 68" fill="none" stroke="#3b2d63" stroke-width="4" stroke-linecap="round"/>
</svg>`;

/* ================= stars, stickers, celebrations ================= */
function updateStars(bumpIt) {
  $('#starCount').textContent = state.stars;
  if (bumpIt) { const s = $('#stars'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
}

function flyStar() {
  const target = $('#stars').getBoundingClientRect();
  const x0 = window.innerWidth / 2 - 20, y0 = window.innerHeight / 2 - 20;
  const s = h('div', { class: 'fly-star' }, '⭐');
  document.body.append(s);
  const a = s.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(2.4)`, opacity: 1 },
    { transform: `translate(${target.left + 4}px, ${target.top}px) scale(.7)`, opacity: 0.9 },
  ], { duration: 850, easing: 'cubic-bezier(.5,-0.4,.6,1)' });
  a.onfinish = () => s.remove();
}

function addStar() {
  state.stars++;
  store.set('stars', state.stars);
  flyStar();
  setTimeout(() => updateStars(true), 800);
  if (state.stars % STARS_PER_STICKER === 0) {
    const st = STICKERS[state.stars / STARS_PER_STICKER - 1];
    if (st) setTimeout(() => newSticker(st), 1500);
  }
}

function confetti(n = 80) {
  const box = $('#confetti');
  for (let i = 0; i < n; i++) {
    const p = h('i', {
      style: `left:${Math.random() * 100}%;background:${pick(RAINBOW)};animation-duration:${1.8 + Math.random() * 1.6}s;` +
        `animation-delay:${Math.random() * 0.4}s;width:${6 + Math.random() * 8}px`,
    });
    box.append(p);
    setTimeout(() => p.remove(), 4200);
  }
}
function celebrate() { Sound.fanfare(); confetti(); }

function overlay(content) {
  const o = h('div', { class: 'overlay' }, content);
  const close = () => o.remove();
  o.addEventListener('click', (e) => { if (e.target === o) close(); });
  document.body.append(o);
  return close;
}

function newSticker(st) {
  Sound.fanfare(); confetti(110);
  Voice.say(`Wow! You got a new sticker! A ${st[1]}!`);
  const close = overlay(h('div', { class: 'big-card' },
    h('div', { class: 'big-emoji jump' }, st[0]),
    h('div', { class: 'big-word' }, 'New sticker!'),
    h('button', { class: 'btn', onclick: () => { Sound.tap(); close(); } }, 'Yay! 🎉')));
}

function finishPanel(container, onAgain, msg = 'You did it!') {
  container.innerHTML = '';
  celebrate();
  Voice.say(`${msg} You are a super star!`);
  container.append(h('div', { class: 'finish' },
    h('div', { class: 'trophy' }, '🏆'),
    h('h2', {}, msg),
    h('div', { class: 'stars-row' }, '⭐⭐⭐⭐⭐'),
    h('div', {},
      h('button', { class: 'btn', onclick: () => { Sound.tap(); onAgain(); } }, '🔁 Again'),
      h('button', { class: 'btn alt', onclick: goHome }, '🏠 Home'))));
}

/* ================= screen building blocks ================= */
function shell(title, emoji, modes) {
  const head = h('div', { class: 'act-head' }, h('h1', {}, h('span', { class: 'title-emoji' }, emoji), ' ', title));
  const body = h('div', { class: 'act-body' });
  app.append(head, body);
  if (modes) {
    const tabs = h('div', { class: 'tabs' });
    const btns = {};
    const show = (k) => {
      newGen();
      for (const [kk, b] of Object.entries(btns)) b.classList.toggle('active', kk === k);
      body.innerHTML = '';
      modes[k](body);
    };
    for (const [k, label] of [['learn', '📖 Learn'], ['play', '🎮 Play']]) {
      btns[k] = h('button', { class: 'tab', onclick: () => { Sound.tap(); show(k); } }, label);
      tabs.append(btns[k]);
    }
    head.append(tabs);
    show('learn');
  }
  return body;
}

function learnGrid(body, items, { render, onTap, min = '96px', cellClass = () => '' }) {
  const grid = h('div', { class: 'grid', style: `--min:${min}` });
  items.forEach((it, i) => {
    const c = h('button', {
      class: 'cell ' + cellClass(it, i),
      style: `animation-delay:${i * 25}ms;--c:${RAINBOW[i % RAINBOW.length]}`,
      html: render(it, i),
    });
    c.onclick = () => { Sound.playNote(PENTA[i % PENTA.length], 'xylo'); bounce(c); onTap(it, i, c); };
    grid.append(c);
  });
  body.append(grid);
}

// Five questions in a row, with a star for each one and a party at the end.
function playRounds(body, makeRound, total = 5) {
  newGen();
  body.innerHTML = '';
  const prog = h('div', { class: 'progress' });
  for (let i = 0; i < total; i++) prog.append(h('span'));
  const area = h('div', { class: 'round-area' });
  body.append(prog, area);
  let n = 0;
  const again = () => playRounds(body, makeRound, total);
  const next = () => {
    area.innerHTML = '';
    let done = false;
    makeRound(area, {
      isDone: () => done,
      win(say) {
        if (done) return;
        done = true;
        prog.children[n].classList.add('done');
        n++;
        addStar();
        Sound.correct();
        Voice.say(say || pick(PRAISE));
        later(() => (n >= total ? finishPanel(area, again) : next()), 1700);
      },
    });
  };
  next();
}

function oops(el, msg) {
  Sound.wrong();
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  Voice.say(msg || pick(OOPS));
}

function choiceRound(area, ctx, o) {
  area.append(h('div', { class: 'prompt' },
    h('span', { html: o.prompt }),
    h('button', { class: 'round say', 'aria-label': 'Say it again', onclick: () => Voice.say(o.say) }, '🔊')));
  if (o.visual) area.append(o.visual);
  const grid = h('div', { class: 'choices', 'data-n': o.options.length });
  o.options.forEach((opt, i) => {
    const b = h('button', { class: 'choice', style: `animation-delay:${i * 70}ms`, html: o.render(opt) });
    b.onclick = () => {
      if (ctx.isDone()) return;
      if (o.isCorrect(opt)) { b.classList.add('right'); ctx.win(o.rightSay); }
      else oops(b, o.wrongSay ? o.wrongSay(opt) : null);
    };
    grid.append(b);
  });
  area.append(grid);
  later(() => Voice.say(o.say), 250);
}

/* ================= activities ================= */
const letterColor = (t) => RAINBOW[LETTERS.indexOf(t) % RAINBOW.length];

function showLetter(i) {
  const [L, w, e] = LETTERS[i];
  const say = () => Voice.say(`${L}. ${L} is for ${w}!`);
  const step = (d) => () => { close(); Sound.flip(); showLetter((i + d + LETTERS.length) % LETTERS.length); };
  const close = overlay(h('div', { class: 'big-card', style: `--c:${RAINBOW[i % RAINBOW.length]}` },
    h('button', { class: 'round close', 'aria-label': 'Close', onclick: () => close() }, '✖'),
    h('div', { class: 'big-letter' }, L, h('small', {}, L.toLowerCase())),
    h('div', { class: 'big-emoji jump' }, e),
    h('div', { class: 'big-word', html: `<b>${w[0]}</b>${w.slice(1)}` }),
    h('div', { class: 'card-nav' },
      h('button', { class: 'round', 'aria-label': 'Previous', onclick: step(-1) }, '◀'),
      h('button', { class: 'round', 'aria-label': 'Say it', onclick: say }, '🔊'),
      h('button', { class: 'round', 'aria-label': 'Next', onclick: step(1) }, '▶'))));
  say();
}

function renderABC() {
  shell('Letters', '🔤', {
    learn(body) {
      learnGrid(body, LETTERS, {
        min: '72px',
        render: ([L]) => `<span class="ltr">${L}</span>`,
        onTap: (_, i) => showLetter(i),
      });
    },
    play(body) {
      playRounds(body, (area, ctx) => {
        const t = pick(LETTERS);
        const render = (o) => `<span style="color:${letterColor(o)}">${o[0]}</span>`;
        if (Math.random() < 0.5) {
          choiceRound(area, ctx, {
            prompt: `Find the letter <b class="hl">${t[0]}</b>`,
            say: `Find the letter ${t[0]}!`,
            options: choicesFor(LETTERS, t, 4), render,
            isCorrect: (o) => o === t,
            rightSay: `Yes! That's ${t[0]}!`,
            wrongSay: (o) => `That's ${o[0]}. Find ${t[0]}!`,
          });
        } else {
          choiceRound(area, ctx, {
            prompt: `<span class="pe">${t[2]}</span> ${t[1]} starts with…`,
            say: `${t[1]}! Which letter does ${t[1]} start with?`,
            options: choicesFor(LETTERS, t, 3), render,
            isCorrect: (o) => o === t,
            rightSay: `Yes! ${t[1]} starts with ${t[0]}!`,
          });
        }
      });
    },
  });
}

function renderNumbers() {
  shell('Numbers', '🔢', {
    learn(body) {
      const row = h('div', { class: 'num-row' });
      const stage = h('div', { class: 'count-stage' }, h('div', { class: 'hint' }, 'Tap a number! 👆'));
      for (let n = 1; n <= 10; n++) {
        row.append(h('button', { class: 'num-btn', style: `--c:${RAINBOW[(n - 1) % RAINBOW.length]}`, onclick: () => countTo(n) }, n));
      }
      body.append(row, stage);
      function countTo(n) {
        newGen();
        Sound.tap();
        stage.innerHTML = '';
        const it = pick(COUNT_ITEMS);
        const big = h('div', { class: 'count-big' }, n);
        const items = h('div', { class: 'count-items' });
        stage.append(big, items);
        for (let i = 0; i < n; i++) {
          later(() => { items.append(h('span', { class: 'pop-in' }, it.e)); Sound.count(i); Voice.say(NUM_WORDS[i + 1]); }, 300 + i * 750);
        }
        later(() => { bounce(big); Sound.correct(); Voice.say(`${NUM_WORDS[n]} ${n === 1 ? it.one : it.many}!`); }, 300 + n * 750 + 150);
      }
    },
    play(body) {
      playRounds(body, (area, ctx) => {
        const render = (o) => `<span style="color:${RAINBOW[(o - 1) % RAINBOW.length]}">${o}</span>`;
        if (Math.random() < 0.6) {
          const n = rnd(1, 10), it = pick(COUNT_ITEMS);
          const box = h('div', { class: 'count-box' });
          let counted = 0;
          for (let i = 0; i < n; i++) {
            const s = h('span', { class: 'pop-in', style: `animation-delay:${i * 60}ms` }, it.e);
            s.onclick = () => {
              if (s.classList.contains('counted')) return;
              s.classList.add('counted'); counted++;
              Sound.count(counted - 1); Voice.say(NUM_WORDS[counted]);
            };
            box.append(s);
          }
          const nums = [n];
          while (nums.length < 3) { const k = rnd(1, 10); if (!nums.includes(k)) nums.push(k); }
          choiceRound(area, ctx, {
            prompt: `How many ${it.many}?`,
            say: `How many ${it.many}? Tap them to count!`,
            visual: box, options: shuffle(nums), render,
            isCorrect: (o) => o === n,
            rightSay: `Yes! ${NUM_WORDS[n]} ${n === 1 ? it.one : it.many}!`,
            wrongSay: (o) => `Not ${NUM_WORDS[o]}. Let's count again!`,
          });
        } else {
          const n = rnd(1, 10);
          const nums = [n];
          while (nums.length < 4) { const k = rnd(1, 10); if (!nums.includes(k)) nums.push(k); }
          choiceRound(area, ctx, {
            prompt: `Find number <b class="hl">${NUM_WORDS[n]}</b>`,
            say: `Find the number ${NUM_WORDS[n]}!`,
            options: shuffle(nums), render,
            isCorrect: (o) => o === n,
            wrongSay: (o) => `That's ${NUM_WORDS[o]}. Find ${NUM_WORDS[n]}!`,
          });
        }
      });
    },
  });
}

function renderColors() {
  shell('Colors', '🎨', {
    learn(body) {
      learnGrid(body, COLORS, {
        min: '120px',
        render: (c) => `<span class="blob" style="background:${c.hex}"><span>${c.e}</span></span><small>${c.name}</small>`,
        onTap: (c) => Voice.say(`${c.name}! ${c.name}, like ${c.like}.`),
      });
    },
    play(body) {
      playRounds(body, (area, ctx) => {
        const set = sample(COLORS, 4), t = pick(set);
        const say = `Pop the ${t.name} balloon!`;
        area.append(h('div', { class: 'prompt' },
          h('span', { html: `Pop the <b style="color:${t.hex}" class="hl">${t.name}</b> balloon!` }),
          h('button', { class: 'round say', 'aria-label': 'Say it again', onclick: () => Voice.say(say) }, '🔊')));
        const sky = h('div', { class: 'balloons' });
        set.forEach((c, i) => {
          const b = h('button', { class: 'balloon', 'aria-label': c.name, style: `--c:${c.hex};animation-delay:${-i * 0.7}s` });
          b.onclick = () => {
            if (ctx.isDone()) return;
            if (c === t) { b.classList.add('popped'); Sound.pop(); ctx.win(`Pop! You found ${t.name}!`); }
            else oops(b, `That's ${c.name}. Find ${t.name}!`);
          };
          sky.append(b);
        });
        area.append(sky);
        later(() => Voice.say(say), 250);
      });
    },
  });
}

function renderShapes() {
  shell('Shapes', '🔺', {
    learn(body) {
      learnGrid(body, SHAPES, {
        min: '120px',
        render: (s, i) => shapeSvg(s, RAINBOW[i % RAINBOW.length]) + `<small>${s.name}</small>`,
        onTap: (s) => Voice.say(`${s.name}! ${s.fact}`),
      });
    },
    play(body) {
      playRounds(body, (area, ctx) => {
        const opts = sample(SHAPES, 4), t = pick(opts), cols = sample(RAINBOW, 4);
        choiceRound(area, ctx, {
          prompt: `Find the <b class="hl">${t.name}</b>`,
          say: `Find the ${t.name}!`,
          options: opts,
          render: (o) => shapeSvg(o, cols[opts.indexOf(o)]),
          isCorrect: (o) => o === t,
          rightSay: `Yes! That's the ${t.name}!`,
          wrongSay: (o) => `That's a ${o.name}. Find the ${t.name}!`,
        });
      });
    },
  });
}

function renderAnimals() {
  shell('Animals', '🦁', {
    learn(body) {
      learnGrid(body, ANIMALS, {
        min: '100px',
        render: (a) => `<span class="ae">${a.e}</span>`,
        onTap: (a) => Voice.say(`${a.n}! The ${a.n} says ${a.s}!`),
      });
    },
    play(body) {
      playRounds(body, (area, ctx) => {
        const render = (o) => `<span class="ae">${o.e}</span>`;
        if (Math.random() < 0.5) {
          const opts = sample(ANIMALS, 3), t = pick(opts);
          choiceRound(area, ctx, {
            prompt: `Who says <b class="hl">“${t.s}”</b>?`,
            say: `Who says ${t.s}?`,
            options: opts, render,
            isCorrect: (o) => o === t,
            rightSay: `Yes! The ${t.n} says ${t.s}!`,
            wrongSay: (o) => `The ${o.n} says ${o.s}! Try again!`,
          });
        } else {
          const opts = sample(ANIMALS, 4), t = pick(opts);
          choiceRound(area, ctx, {
            prompt: `Find the <b class="hl">${t.n}</b>`,
            say: `Find the ${t.n}!`,
            options: opts, render,
            isCorrect: (o) => o === t,
            rightSay: `Yes! The ${t.n} says ${t.s}!`,
            wrongSay: (o) => `That's the ${o.n}. Find the ${t.n}!`,
          });
        }
      });
    },
  });
}

function renderMusic() {
  Sound.stopMusic(); // quiet the background tune so kids hear their own notes
  const body = shell('Music Time', '🎹', null);
  let instr = store.get('instr', 'xylo');
  let guide = null;

  const instrBar = h('div', { class: 'instr' });
  for (const [k, label] of [['xylo', '🎶 Xylophone'], ['piano', '🎹 Piano'], ['robot', '🤖 Robot']]) {
    const b = h('button', { class: 'pill' + (k === instr ? ' active' : '') }, label);
    b.onclick = () => {
      instr = k; store.set('instr', k);
      instrBar.querySelectorAll('.pill').forEach((x) => x.classList.toggle('active', x === b));
      playKey(4);
    };
    instrBar.append(b);
  }

  const status = h('div', { class: 'music-status' }, 'Tap the keys to make music! 🎵');
  const bar = h('div', { class: 'song-bar' }, h('i'));
  const stage = h('div', { class: 'music-stage' });
  const keysEl = h('div', { class: 'keys' });
  const keyEls = KEYS.map((k, i) => {
    const el = h('button', { class: 'key', 'aria-label': k.s, style: `--c:${k.c};--h:${100 - i * 4.5}%` },
      h('span', { class: 'peg' }), h('span', { class: 'ke' }, k.e), h('span', { class: 'ks' }, k.s), h('span', { class: 'peg' }));
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); playKey(i); });
    keysEl.append(el);
    return el;
  });
  stage.append(bar, keysEl);

  function playKey(i, auto = false) {
    Sound.init();
    Sound.playNote(KEYS[i].n, instr);
    const el = keyEls[i];
    el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 200);
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const fx = h('span', { class: 'note-fx', style: `left:${r.left - sr.left + r.width / 2 - 12}px;top:${r.top - sr.top + 20}px;color:${KEYS[i].c}` },
      pick(['♪', '♫', '♩', '♬']));
    stage.append(fx);
    setTimeout(() => fx.remove(), 1200);
    if (!auto && guide) guide.press(i);
  }

  const pads = h('div', { class: 'pads' });
  for (const [e, f] of [['🥁', 'drum'], ['👏', 'clap'], ['🔔', 'bell'], ['🤪', 'boing']]) {
    const p = h('button', { class: 'pad', 'aria-label': f }, e);
    p.addEventListener('pointerdown', (ev) => { ev.preventDefault(); Sound.init(); Sound[f](); bounce(p); });
    pads.append(p);
  }

  const setBar = (frac) => { bar.firstChild.style.width = `${Math.round(frac * 100)}%`; };
  function stopSong() { newGen(); guide = null; keyEls.forEach((k) => k.classList.remove('guide')); setBar(0); }
  const focusKeys = () => stage.scrollIntoView({ behavior: 'smooth', block: 'center' });

  function listen(s) {
    stopSong(); Sound.tap(); focusKeys();
    status.textContent = `🎧 Listen: ${s.name}`;
    Voice.say(s.name);
    const notes = parseSong(s.notes);
    let t = 1100;
    notes.forEach((nt, idx) => {
      later(() => { playKey(nt.k, true); setBar((idx + 1) / notes.length); }, t);
      t += nt.b * 420;
    });
    later(() => { status.textContent = 'Your turn! Press 👆 to play along.'; setBar(0); }, t + 400);
  }

  function playAlong(s) {
    stopSong(); Sound.tap(); focusKeys();
    const notes = parseSong(s.notes);
    let pos = 0;
    status.textContent = `👆 Tap the glowing key: ${s.name}`;
    Voice.say(`Let's play ${s.name}! Tap the glowing key.`);
    const show = () => keyEls.forEach((k, i) => k.classList.toggle('guide', i === notes[pos].k));
    guide = {
      press(i) {
        if (i !== notes[pos].k) return;
        pos++;
        setBar(pos / notes.length);
        if (pos < notes.length) { show(); return; }
        guide = null;
        keyEls.forEach((k) => k.classList.remove('guide'));
        status.textContent = `🌟 You played ${s.name}!`;
        later(() => { celebrate(); addStar(); Voice.say(`Hooray! You played ${s.name}!`); }, 450);
      },
    };
    show();
  }

  const songsEl = h('div', { class: 'songs' });
  for (const s of SONGS) {
    songsEl.append(h('div', { class: 'song' },
      h('span', { class: 'em' }, s.e),
      h('span', { class: 'nm' }, s.name),
      h('button', { 'aria-label': `Listen to ${s.name}`, onclick: () => listen(s) }, '▶'),
      h('button', { 'aria-label': `Play ${s.name}`, class: 'along', onclick: () => playAlong(s) }, '👆')));
  }

  body.append(instrBar, status, stage, pads,
    h('h2', { class: 'section' }, '🎵 Songs'),
    h('p', { class: 'tip' }, '▶ listen   ·   👆 play it yourself on the glowing keys'),
    songsEl);

  // Computer keyboard: 1–8 or A S D F G H J K play the keys.
  const keyMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7 };
  const onKey = (e) => { const i = keyMap[e.key.toLowerCase()]; if (i != null && !e.repeat) playKey(i); };
  window.addEventListener('keydown', onKey);
  cleanup = () => {
    window.removeEventListener('keydown', onKey);
    if (state.music) Sound.startMusic();
  };
}

function renderMemory() {
  const body = shell('Memory Match', '🃏', null);
  const chooseLevel = () => {
    newGen();
    body.innerHTML = '';
    body.append(h('div', { class: 'levels' },
      h('p', {}, 'Flip two cards and find the same pictures!'),
      h('button', { class: 'btn', onclick: () => start(3) }, '😊 Easy'),
      h('button', { class: 'btn alt', onclick: () => start(6) }, '🤩 Big')));
    Voice.say('Find the matching pairs! Pick easy or big.');
  };
  function start(pairs) {
    newGen(); Sound.tap();
    body.innerHTML = '';
    const items = sample(MEM_POOL, pairs);
    const deck = shuffle([...items, ...items]);
    const grid = h('div', { class: 'mem-grid', style: `--cols:${pairs === 3 ? 3 : 4}` });
    let first = null, lock = false, found = 0;
    deck.forEach((it, i) => {
      const c = h('button', { class: 'mcard', style: `animation-delay:${i * 40}ms`, 'aria-label': 'card' },
        h('div', { class: 'in' }, h('div', { class: 'f' }, '⭐'), h('div', { class: 'b' }, it.e)));
      c.onclick = () => {
        if (lock || c.classList.contains('flipped')) return;
        Sound.flip();
        c.classList.add('flipped');
        Voice.say(it.n);
        if (!first) { first = { c, it }; return; }
        const a = first; first = null; lock = true;
        if (a.it === it) {
          later(() => {
            a.c.classList.add('matched'); c.classList.add('matched');
            Sound.sparkle(); addStar(); found++; lock = false;
            if (found === pairs) later(() => finishPanel(body, () => start(pairs), 'All pairs found!'), 800);
            else Voice.say(pick(PRAISE));
          }, 450);
        } else {
          later(() => { a.c.classList.remove('flipped'); c.classList.remove('flipped'); lock = false; }, 1100);
        }
      };
      grid.append(c);
    });
    body.append(grid);
    Voice.say('Flip two cards. Find the same pictures!');
  }
  chooseLevel();
}

function renderStickers() {
  const body = shell('My Stickers', '🦄', null);
  const have = Math.min(Math.floor(state.stars / STARS_PER_STICKER), STICKERS.length);
  const left = STARS_PER_STICKER - (state.stars % STARS_PER_STICKER);
  body.append(h('div', { class: 'next-info' },
    have >= STICKERS.length ? 'You collected ALL the stickers! 🎉'
      : `⭐ ${left} more star${left > 1 ? 's' : ''} for a new sticker!`));
  learnGrid(body, STICKERS, {
    min: '86px',
    cellClass: (_, i) => (i < have ? '' : 'locked'),
    render: (st, i) => `<span class="ae">${i < have ? st[0] : '🔒'}</span>`,
    onTap: (st, i) => Voice.say(i < have ? `${st[1]}!` : 'Win more stars to unlock this sticker!'),
  });
  Voice.say(have ? `You have ${have} sticker${have > 1 ? 's' : ''}!` : 'Play games and win stars to get stickers!');
}

/* ---------- Draw & Color ---------- */
const DRAW_COLORS = [
  ['Red', '#ff3b30'], ['Orange', '#ff9500'], ['Yellow', '#ffd60a'], ['Green', '#34c759'], ['Blue', '#0a84ff'],
  ['Purple', '#af52de'], ['Pink', '#ff6fb5'], ['Brown', '#a0632a'], ['Black', '#222222'],
];
const BRUSHES = [['Small', 6], ['Medium', 14], ['Big', 28]];
const STAMPS = [['⭐', 'stars'], ['❤️', 'hearts'], ['🌸', 'flowers'], ['🐞', 'ladybugs'], ['🚀', 'rockets'], ['🐟', 'fish']];
const TRACE_SHAPES = {
  circle: 'M50 8A42 42 0 1 1 49.9 8Z',
  square: 'M10 10H90V90H10Z',
  triangle: 'M50 8L94 90H6Z',
  star: 'M50 5L61 38L96 38L68 58L79 92L50 72L21 92L32 58L4 38L39 38Z',
  heart: 'M50,90 C50,90 6,62 6,34 C6,19 17,9 30,9 C40,9 47,15 50,23 C53,15 60,9 70,9 C83,9 94,19 94,34 C94,62 50,90 50,90Z',
};
const TRACE_ITEMS = [
  ...LETTERS.map(([L]) => ({ text: L, say: `the letter ${L}` })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ text: String(n), say: `the number ${NUM_WORDS[n]}` })),
  ...Object.keys(TRACE_SHAPES).map((k) => ({ shape: k, say: `the ${k}` })),
];
const DRAW_IDEAS = [
  'Can you draw a big yellow sun?', 'Draw a house with a red roof!', 'Draw a happy face!',
  'Draw a rainbow with lots of colors!', 'Draw your favorite animal!', 'Draw a flower in a garden!',
  'Draw a fish in the blue sea!', 'Draw a car with round wheels!', 'Draw yourself!', 'Draw a tall green tree!',
  'Draw a cat with long whiskers!', 'Draw a rocket going to the moon!',
];
const DRAW_PRAISE = ['Beautiful!', 'Wow, nice colors!', 'You are a great artist!', 'I love it!', 'Keep going!', 'So creative!'];

function renderDraw() {
  const body = shell('Draw & Color', '🖍️', null);
  let color = DRAW_COLORS[0][1], size = 14, tool = 'brush', stamp = STAMPS[0], hue = 0;
  let strokes = 0, lastNote = 0, traceItem = null, W = 0, H = 0, dpr = 1;
  const undo = [];

  const tip = h('div', { class: 'draw-tip' }, 'Pick a color and draw with your finger! 👆');
  const say = (text, show = text) => { tip.textContent = show; Voice.say(text); };

  /* palette */
  const palette = h('div', { class: 'palette' });
  const select = (el) => { body.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); el.classList.add('sel'); };
  DRAW_COLORS.forEach(([name, hex], i) => {
    const b = h('button', { class: 'swatch' + (i === 0 ? ' sel' : ''), 'aria-label': name, style: `--c:${hex}` });
    b.onclick = () => { color = hex; tool = 'brush'; select(b); Sound.playNote(PENTA[i % PENTA.length], 'xylo'); say(name + '!', `${name} crayon 🖍️`); };
    palette.append(b);
  });
  const rainbowBtn = h('button', { class: 'swatch rainbow', 'aria-label': 'Rainbow brush' });
  rainbowBtn.onclick = () => { tool = 'rainbow'; select(rainbowBtn); Sound.sparkle(); say('Rainbow magic brush!', 'Rainbow magic brush 🌈'); };
  palette.append(rainbowBtn);

  /* canvas */
  const board = h('div', { class: 'board' });
  const guide = h('canvas', { class: 'guide' });
  const paint = h('canvas', { class: 'paint', 'aria-label': 'Drawing board' });
  board.append(guide, paint);
  const gctx = guide.getContext('2d'), pctx = paint.getContext('2d');

  /* tools */
  const tools = h('div', { class: 'draw-tools' });
  BRUSHES.forEach(([name, px]) => {
    const b = h('button', { class: 'tool size' + (px === size ? ' on' : ''), 'aria-label': `${name} brush` }, h('i', { style: `width:${px * 0.8 + 6}px;height:${px * 0.8 + 6}px` }));
    b.onclick = () => {
      size = px; tools.querySelectorAll('.size').forEach((x) => x.classList.toggle('on', x === b));
      if (tool === 'eraser' || tool === 'stamp') { tool = 'brush'; select(palette.children[Math.max(0, DRAW_COLORS.findIndex((c) => c[1] === color))]); }
      Sound.tap(); say(`${name} brush!`);
    };
    tools.append(b);
  });
  const eraser = h('button', { class: 'tool', 'aria-label': 'Eraser' }, '🧽');
  eraser.onclick = () => { tool = 'eraser'; select(eraser); Sound.flip(); say('Eraser! Rub out anything you like.', 'Eraser 🧽'); };
  tools.append(eraser);
  STAMPS.forEach((st) => {
    const b = h('button', { class: 'tool', 'aria-label': `${st[1]} stamp` }, st[0]);
    b.onclick = () => { tool = 'stamp'; stamp = st; select(b); Sound.pop(); say(`${st[1]}! Tap the paper to stamp ${st[1]}.`, `Stamp ${st[0]}  tap to stamp!`); };
    tools.append(b);
  });
  const undoBtn = h('button', { class: 'tool', 'aria-label': 'Undo' }, '↩️');
  undoBtn.onclick = () => {
    if (!undo.length) { say('Nothing to undo!'); return; }
    pctx.putImageData(undo.pop(), 0, 0); Sound.flip(); say('Oops! Undo!');
  };
  const clearBtn = h('button', { class: 'tool', 'aria-label': 'Clear' }, '🗑️');
  clearBtn.onclick = () => {
    pushUndo(); pctx.clearRect(0, 0, W, H); traceItem = null; drawGuide(); strokes = 0;
    Sound.boing(); say('All clean! Let’s draw something new!', 'All clean! ✨');
  };
  tools.append(undoBtn, clearBtn);

  /* actions */
  const actions = h('div', { class: 'draw-actions' },
    h('button', { class: 'btn small', onclick: traceNext }, '✏️ Trace'),
    h('button', { class: 'btn small alt', onclick: idea }, '💡 Idea'),
    h('button', { class: 'btn small done', onclick: done }, '✅ Done'));

  const galleryTitle = h('h2', { class: 'section' }, '🖼️ My Pictures');
  const gallery = h('div', { class: 'gallery' });
  body.append(tip, palette, board, tools, actions, galleryTitle, gallery);

  /* drawing */
  function fit() {
    const r = board.getBoundingClientRect();
    const nw = Math.round(r.width), nh = Math.round(r.height);
    if (!nw || !nh || (nw === W && nh === H)) return;
    let old = null;
    if (W) { old = document.createElement('canvas'); old.width = paint.width; old.height = paint.height; old.getContext('2d').drawImage(paint, 0, 0); }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = nw; H = nh;
    for (const c of [guide, paint]) { c.width = W * dpr; c.height = H * dpr; }
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (old) pctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, W, H);
    undo.length = 0;
    drawGuide();
  }

  function drawGuide() {
    gctx.clearRect(0, 0, W, H);
    if (!traceItem) return;
    const s = Math.min(W, H) * 0.8;
    gctx.save();
    gctx.strokeStyle = 'rgba(110, 90, 180, .5)';
    gctx.fillStyle = 'rgba(155, 93, 229, .08)';
    gctx.lineJoin = 'round';
    if (traceItem.text) {
      gctx.setLineDash([10, 12]); gctx.lineWidth = 5;
      gctx.font = `900 ${Math.round(s * 0.95)}px ui-rounded, "Arial Rounded MT Bold", "Chalkboard SE", system-ui, sans-serif`;
      gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
      gctx.fillText(traceItem.text, W / 2, H / 2 + s * 0.05);
      gctx.strokeText(traceItem.text, W / 2, H / 2 + s * 0.05);
    } else {
      const k = s / 100;
      gctx.translate(W / 2 - s / 2, H / 2 - s / 2); gctx.scale(k, k);
      gctx.setLineDash([10 / k, 12 / k]); gctx.lineWidth = 5 / k;
      const p = new Path2D(TRACE_SHAPES[traceItem.shape]);
      gctx.fill(p); gctx.stroke(p);
    }
    gctx.restore();
  }

  const pos = (e) => { const r = paint.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function pushUndo() {
    try { undo.push(pctx.getImageData(0, 0, paint.width, paint.height)); if (undo.length > 12) undo.shift(); } catch (e) { /* ignore */ }
  }
  function brushStyle() {
    pctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    if (tool === 'rainbow') { hue = (hue + 5) % 360; pctx.strokeStyle = pctx.fillStyle = `hsl(${hue}, 90%, 55%)`; }
    else pctx.strokeStyle = pctx.fillStyle = color;
    pctx.lineWidth = tool === 'eraser' ? size * 2 : size;
    pctx.lineCap = 'round'; pctx.lineJoin = 'round';
  }
  function line(a, b) { brushStyle(); pctx.beginPath(); pctx.moveTo(a.x, a.y); pctx.lineTo(b.x, b.y); pctx.stroke(); pctx.globalCompositeOperation = 'source-over'; }
  function dot(p) { brushStyle(); pctx.beginPath(); pctx.arc(p.x, p.y, pctx.lineWidth / 2, 0, Math.PI * 2); pctx.fill(); pctx.globalCompositeOperation = 'source-over'; }
  function musicBrush(p) {
    const t = performance.now();
    if (t - lastNote < 150 || tool === 'eraser') return;
    lastNote = t;
    const i = Math.max(0, Math.min(PENTA.length - 1, Math.floor((1 - p.y / H) * PENTA.length)));
    Sound.playNote(PENTA[i], 'soft');
  }
  function placeStamp(p) {
    pctx.save();
    pctx.font = `${Math.round(size * 2.6 + 24)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
    pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    pctx.translate(p.x, p.y); pctx.rotate((Math.random() - 0.5) * 0.6);
    pctx.fillText(stamp[0], 0, 0);
    pctx.restore();
    Sound.pop();
    strokeDone();
  }
  function strokeDone() {
    strokes++;
    if (strokes % 8 === 0) say(pick(DRAW_PRAISE));
  }

  const active = new Map();
  paint.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sound.init();
    if (active.size === 0) pushUndo();
    const p = pos(e);
    if (tool === 'stamp') { placeStamp(p); return; }
    try { paint.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    active.set(e.pointerId, p);
    dot(p); musicBrush(p);
  });
  paint.addEventListener('pointermove', (e) => {
    let prev = active.get(e.pointerId);
    if (!prev) return;
    const list = e.getCoalescedEvents && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e];
    for (const ce of list) { const p = pos(ce); line(prev, p); prev = p; }
    active.set(e.pointerId, prev);
    musicBrush(prev);
  });
  const end = (e) => { if (active.delete(e.pointerId) && active.size === 0) strokeDone(); };
  paint.addEventListener('pointerup', end);
  paint.addEventListener('pointercancel', end);

  /* trace, ideas, done */
  function traceNext() {
    let next;
    do { next = pick(TRACE_ITEMS); } while (traceItem && next === traceItem);
    traceItem = next;
    pushUndo(); pctx.clearRect(0, 0, W, H); strokes = 0;
    drawGuide(); Sound.sparkle();
    say(`Let's trace ${traceItem.say}! Follow the dotted line with your finger.`,
      `✏️ Trace ${traceItem.text || traceItem.shape}: follow the dots!`);
  }
  function idea() { Sound.sparkle(); const i = pick(DRAW_IDEAS); say(i, `💡 ${i}`); }

  function snapshot() {
    const tw = 320, th = Math.round(tw * H / W) || 240;
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th);
    x.drawImage(guide, 0, 0, tw, th); x.drawImage(paint, 0, 0, tw, th);
    return c.toDataURL('image/jpeg', 0.75);
  }
  function done() {
    if (!strokes) { say('Draw something first, then tap done!'); return; }
    const pics = store.get('drawings', []);
    pics.unshift(snapshot());
    store.set('drawings', pics.slice(0, 8));
    strokes = 0;
    celebrate(); addStar();
    say(traceItem ? `Great tracing! You traced ${traceItem.say}!` : 'What a beautiful picture! I put it in your gallery.',
      '🌟 Saved to My Pictures!');
    showGallery();
  }
  function showGallery() {
    const pics = store.get('drawings', []);
    gallery.innerHTML = '';
    galleryTitle.hidden = !pics.length;
    pics.forEach((src) => {
      const img = h('img', { src, alt: 'My picture' });
      img.onclick = () => {
        Sound.tap(); Voice.say('Look at your picture!');
        const close = overlay(h('div', { class: 'big-card' },
          h('img', { src, alt: 'My picture', class: 'pic-big' }),
          h('button', { class: 'btn', onclick: () => close() }, '👍 Nice!')));
      };
      gallery.append(img);
    });
  }

  fit();
  showGallery();
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  cleanup = () => window.removeEventListener('resize', onResize);
  Voice.say('Let’s draw! Pick a color and draw with your finger. Tap trace to practice letters, or idea for something to draw.');
}

const ACTIVITIES = [
  { id: 'abc', label: 'ABC', em: '🔤', a: '#ff6b6b', b: '#ff9a8b', say: 'Let’s learn letters!' },
  { id: 'numbers', label: '123', em: '🔢', a: '#ff9f43', b: '#ffc36b', say: 'Let’s count!' },
  { id: 'colors', label: 'Colors', em: '🎨', a: '#f6c90e', b: '#ffe066', say: 'Colors! So pretty!' },
  { id: 'shapes', label: 'Shapes', em: '🔺', a: '#2fbf63', b: '#7be495', say: 'Let’s find shapes!' },
  { id: 'animals', label: 'Animals', em: '🦁', a: '#18a9c4', b: '#62d6e8', say: 'Animals! Roar!' },
  { id: 'music', label: 'Music', em: '🎹', a: '#4d7cff', b: '#8ea9ff', say: 'Music time! Let’s play!' },
  { id: 'memory', label: 'Memory', em: '🃏', a: '#9b5de5', b: '#c39bff', say: 'Let’s play memory!' },
  { id: 'draw', label: 'Draw', em: '🖍️', a: '#7cb342', b: '#b8e06a', say: 'Let’s draw and color!' },
  { id: 'stickers', label: 'Stickers', em: '🦄', a: '#f15bb5', b: '#ff9ad5', say: 'Your stickers!' },
];

function renderHome() {
  const bubble = h('div', { class: 'bubble' }, pick(GREETINGS));
  const m = h('button', { class: 'mascot-wrap', 'aria-label': 'Star friend', html: mascotSVG() });
  m.onclick = () => { const l = pick(TICKLES); bubble.textContent = l; Sound.boing(); bounce(m); Voice.say(l); };
  app.append(h('div', { class: 'hello' }, m, bubble));
  const tiles = h('div', { class: 'tiles' });
  ACTIVITIES.forEach((a, i) => tiles.append(h('button', {
    class: 'tile', style: `--a:${a.a};--b:${a.b};animation-delay:${i * 60}ms`,
    onclick: () => { Sound.tap(); Voice.say(a.say); go(a.id); },
  }, h('span', { class: 'em', style: `animation-delay:${i * 0.5}s` }, a.em), h('span', { class: 'lbl' }, a.label))));
  app.append(tiles);
}

/* ================= navigation ================= */
const SCREENS = {
  home: renderHome, abc: renderABC, numbers: renderNumbers, colors: renderColors, shapes: renderShapes,
  animals: renderAnimals, music: renderMusic, draw: renderDraw, memory: renderMemory, stickers: renderStickers,
};
let cleanup = null;

function go(name, push = true) {
  newGen();
  if (cleanup) { const c = cleanup; cleanup = null; c(); }
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  if (push && name !== 'home') history.pushState({ s: name }, '');
  document.body.dataset.screen = name;
  app.innerHTML = '';
  app.scrollTop = 0;
  (SCREENS[name] || renderHome)();
}

function goHome() {
  Sound.tap();
  if (history.state && history.state.s) history.back();
  else go('home', false);
}

window.addEventListener('popstate', (e) => go((e.state && e.state.s) || 'home', false));

/* ================= top bar ================= */
function syncToggles() {
  $('#musicBtn').classList.toggle('off', !state.music);
  $('#voiceBtn').classList.toggle('off', !state.voice);
}
$('#homeBtn').onclick = goHome;
$('#musicBtn').onclick = () => {
  state.music = !state.music; store.set('music', state.music); syncToggles();
  Sound.init(); Sound.tap();
  if (state.music && document.body.dataset.screen !== 'music') Sound.startMusic(); else Sound.stopMusic();
};
$('#voiceBtn').onclick = () => {
  state.voice = !state.voice; store.set('voice', state.voice); syncToggles();
  Sound.init(); Sound.tap();
  if (state.voice) Voice.say('Hello!'); else Voice.stop();
};

// Pause sound when the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Sound.suspend(); Voice.stop(); } else Sound.resume();
});

/* ================= start ================= */
$('#splashMascot').innerHTML = mascotSVG();
$('#startBtn').onclick = () => {
  Sound.init();
  if (state.music) Sound.startMusic();
  const sp = $('#splash');
  sp.classList.add('hide');
  setTimeout(() => sp.remove(), 450);
  Voice.say('Welcome to Little Stars! ' + $('.bubble').textContent);
};

Voice.init();
syncToggles();
updateStars(false);
history.replaceState({ s: null }, '');
go('home', false);

const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isNative) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
