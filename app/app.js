/* TaxDesk for the iPad. The page runs TaxDesk's own Python engine in the browser (Pyodide, webapi.py), so every figure,
   card and guide is the desktop app's. This file is the touch interface: the pages, the writing pad, and saving the
   user's notes and work on the iPad. */
"use strict";

const PYODIDE = new URL("pyodide/", location.href).href;  // Python, served with the app (tools/build_web.py)
const CONTROL = "https://raw.githubusercontent.com/majmalzaib/taxdesk-downloads/main/control.json";
const PENS = { ink: "#1f2937", blue: "#1d4ed8", red: "#b91c1c", green: "#15803d" };
const SIZES = { Fine: 2.0, Medium: 3.5, Thick: 6.0 };
let api = null, version = "";

// ---------------------------------------------------------------- small helpers
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
const store = {
  get(key, fallback) { try { const v = localStorage.getItem("taxdesk." + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem("taxdesk." + key, JSON.stringify(value)); } catch (e) { alert("Couldn't save on this iPad: " + e.message); } },
  del(key) { try { localStorage.removeItem("taxdesk." + key); } catch { /* nothing kept */ } },
};
const pause = () => new Promise(r => setTimeout(r, 30));
async function busy(fn, text = "Working…") {  // let the page show it's working before Python runs
  const b = $("#busy"); b.textContent = text; b.classList.remove("hidden");
  await pause();
  try { return fn(); } finally { b.classList.add("hidden"); }
}
const J = s => JSON.parse(s);
const money = v => (v == null || v === "" || isNaN(v)) ? "" : Number(v).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const num = s => { const v = parseFloat(String(s).replace(/,/g, "")); return isNaN(v) ? 0 : v; };

// ---------------------------------------------------------------- start: Python, TaxDesk, the licence
function progress(text, pct) { $("#splash-text").textContent = text; $("#splash-bar").style.width = pct + "%"; }

async function start() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  try {
    progress("Loading Python…", 8);
    const py = await loadPyodide({ indexURL: PYODIDE });
    progress("Loading TaxDesk and the law…", 55);
    const zip = await (await fetch("py/taxdesk.zip")).arrayBuffer();
    py.unpackArchive(zip, "zip", { extractDir: "/home/pyodide/app" });
    py.runPython("import sys; sys.path.insert(0, '/home/pyodide/app')");
    progress("Getting ready…", 75);
    await py.loadPackage("cryptography");  // checks the licence key's signature
    api = py.pyimport("webapi");
    version = J(api.start(matchMedia("(prefers-color-scheme: dark)").matches)).version;
    progress("Ready", 100);
    await licence();
  } catch (e) {
    progress("TaxDesk couldn't open: " + e.message + ". Connect to the internet once, then try again.", 100);
  }
}

async function controlJson() {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(CONTROL + "?t=" + Date.now(), { signal: ctl.signal, cache: "no-store" });
    if (r.ok) { const t = await r.text(); store.set("control", t); store.set("controlAt", Date.now()); return t; }
  } catch { /* offline: the last copy read */ }
  return store.get("control", "");
}

async function licence() {
  const control = await controlJson();
  const days = Math.floor((Date.now() - store.get("controlAt", Date.now())) / 86400000);
  const d = J(api.check_licence(store.get("key", ""), control, days));
  if (d.ok) { $("#splash").classList.add("hidden"); $("#gate").classList.add("hidden"); open(d); return; }
  $("#splash").classList.add("hidden");
  $("#gate").classList.remove("hidden");
  $("#gate-text").textContent = d.message ? `${d.title ? d.title + ": " : ""}${d.message}`
    : "Enter your TaxDesk licence key to open TaxDesk on this iPad.";
  $("#gate-form").onsubmit = async e => {
    e.preventDefault();
    $("#gate-text").textContent = "Checking the key…";
    store.set("key", $("#gate-key").value.trim());
    await licence();
  };
}

// ---------------------------------------------------------------- the app's frame
const PAGES = [
  ["guide", "Practice guide", guidePage], ["library", "Law library", libraryPage], ["practice", "Practice", practicePage],
  ["changes", "Law changes", changesPage], ["ask", "Ask TaxDesk", askPage], ["backup", "Backup & licence", backupPage],
];
let current = null;

function open(d) {
  $("#app").classList.remove("hidden");
  const nav = $("#nav");
  for (const [id, title] of PAGES) nav.append(el("button", { "data-page": id, onclick: () => go(id) }, title));
  $("#foot").innerHTML = `TaxDesk ${esc(version)}${d.name ? " · " + esc(d.name) : ""}<br>A practice tool, not FBR's IRIS.`;
  $("#menu").onclick = () => $("#side").classList.toggle("open");
  if (d.notice) setTimeout(() => sheet("Message from TaxDesk", `<p>${esc(d.notice)}</p>`), 400);
  go(store.get("page", "guide"));
}

function go(id, then) {
  const page = PAGES.find(p => p[0] === id) || PAGES[0];
  store.set("page", page[0]);
  for (const b of document.querySelectorAll("#nav button")) b.classList.toggle("on", b.dataset.page === page[0]);
  $("#side").classList.remove("open");
  $("#title").textContent = page[1];
  const holder = $("#page"); holder.innerHTML = "";
  current = { id: page[0] };
  Object.assign(current, page[2](holder) || {});
  if (then) then(current);
}

// links in any page or sheet: the law, concepts, the guide, the library, and the web
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || a.closest("#nav")) return;
  const href = a.getAttribute("href");
  if (href.startsWith("#")) return;  // a jump within the page
  e.preventDefault();
  follow(href);
});

function follow(href) {
  if (/^https?:/.test(href)) { window.open(href, "_blank", "noopener"); return; }
  const kind = href.split(":")[0];
  if (["chapter", "schedules", "forms", "formgroup", "form"].includes(kind) || (kind === "law" && current?.id === "library")) {
    closeSheet();
    if (current?.id === "library") current.select(href); else go("library", p => p.select(href));
  } else if (kind === "law") {
    const [, act, ...rest] = href.split(":");
    sheet(`${act} ${rest.join(":")}`, api.card(act, rest.join(":"), ""), true);
  } else if (kind === "guide") {
    closeSheet(); go("guide", p => p.select(href.slice(6)));
  } else if (kind === "page") {
    closeSheet(); go(href.slice(5));
  } else {
    try { sheet("Concept", api.concept(href), true); } catch { /* not a concept */ }
  }
}

// a sheet over the page: a law card, a concept, results, a form to fill; it keeps a history to go back through
const sheetStack = [];
function sheet(title, content, history = false) {
  if (!history) sheetStack.length = 0;
  sheetStack.push([title, content]);
  showSheet();
}
function showSheet() {
  const [title, content] = sheetStack[sheetStack.length - 1];
  $("#sheet-title").textContent = title;
  const body = $("#sheet-body"); body.innerHTML = "";
  if (typeof content === "string") body.innerHTML = content; else body.append(content);
  body.scrollTop = 0;
  $("#sheet-back").classList.toggle("hidden", sheetStack.length < 2);
  $("#sheet").classList.remove("hidden");
  const hit = body.querySelector("a[name=hit]"); if (hit) hit.scrollIntoView({ block: "center" });
}
function closeSheet() { sheetStack.length = 0; $("#sheet").classList.add("hidden"); }
$("#sheet-close").onclick = closeSheet;
$("#sheet-back").onclick = () => { sheetStack.pop(); if (sheetStack.length) showSheet(); else closeSheet(); };
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });

// a list beside its reading pane; on a narrow screen one at a time, with Back
function split(holder) {
  const list = el("div", { class: "list" }), detail = el("div", { class: "detail" }), s = el("div", { class: "split" }, list, detail);
  holder.append(s);
  return { s, list, detail, read(on) { s.classList.toggle("reading", on); if (on) detail.scrollTop = 0; } };
}
const backButton = sp => el("button", { class: "back", onclick: () => sp.read(false) }, "← Back");

// ---------------------------------------------------------------- practice guide, with my practice points
function guidePage(holder) {
  const sp = split(holder);
  const groups = J(api.guide_tree());
  const titles = Object.fromEntries(groups.flatMap(g => g.items.map(i => [i.id, i])));
  const search = el("input", { type: "search", placeholder: "Search the guide, e.g. perquisite, cash payment…" });
  const items = el("div", { class: "items" });
  sp.list.append(el("div", { class: "tools" }, search), items);
  let chosen = store.get("guide", "salary");

  function fill() {
    const found = search.value.trim() ? new Set(J(api.guide_search(search.value))) : null;
    items.innerHTML = "";
    for (const g of groups) {
      const shown = g.items.filter(i => !found || found.has(i.id));
      if (!shown.length) continue;
      items.append(el("div", { class: "group" }, g.title));
      for (const i of shown) items.append(el("div", { class: "item" + (i.id === chosen ? " on" : ""), onclick: () => select(i.id) }, i.title));
    }
  }
  function select(id) {
    if (!titles[id]) return;
    chosen = id; store.set("guide", id); fill();
    const topic = titles[id];
    const tabs = el("div", { class: "tabs" });
    const body = el("div");
    const show = which => {
      for (const b of tabs.children) b.classList.toggle("on", b.dataset.t === which);
      body.innerHTML = "";
      if (which === "guide") body.innerHTML = api.guide_page(id);
      else body.append(pointsPanel(id, topic.title, topic.act, n => { tabs.children[1].textContent = `My practice points (${n})`; }));
    };
    const n = points().filter(p => p.topic === id).length;
    tabs.append(el("button", { "data-t": "guide", onclick: () => show("guide") }, "Guide"),
      el("button", { "data-t": "points", onclick: () => show("points") }, `My practice points (${n})`));
    sp.detail.innerHTML = "";
    sp.detail.append(backButton(sp), tabs, body);
    show("guide");
    sp.read(true);
  }
  search.addEventListener("input", fill);
  fill();
  if (innerWidth > 900) select(chosen);
  return { select };
}

// my practice points: notes (typed, written by hand, or both) and question cards, kept on this iPad
const points = () => store.get("points", []);
const savePoints = list => store.set("points", list);

function pointsPanel(topicId, topic, act, onCount) {
  const box = el("div");
  let tab = "note", answers = false;
  function render() {
    const mine = points().filter(p => p.topic === topicId);
    onCount(mine.length);
    const list = mine.filter(p => p.kind === tab);
    box.innerHTML = "";
    const tabs = el("div", { class: "tabs" },
      el("button", { class: tab === "note" ? "on" : "", onclick: () => { tab = "note"; render(); } }, `Notes (${mine.filter(p => p.kind === "note").length})`),
      el("button", { class: tab === "card" ? "on" : "", onclick: () => { tab = "card"; render(); } }, `Practice cards (${mine.filter(p => p.kind === "card").length})`));
    box.append(el("p", { class: "muted" }, `Your own points on ${topic}: notes to read, and practice cards to test your understanding. They're kept on this iPad (Backup copies them).`), tabs);
    if (!list.length) box.append(el("p", { class: "muted" }, tab === "card"
      ? "Write a question you should be able to answer, with its answer and the section it rests on. Test me asks them with the answer hidden."
      : "Write what to remember about this topic in your own words, or by hand with the Apple Pencil."));
    for (const p of list) {
      const law = p.law ? `<p class="muted">${api.cited(p.law, act)}</p>` : "";
      const actions = el("div", { class: "row" },
        el("button", { class: "link", onclick: () => edit(p.kind, p) }, "Edit"),
        el("button", { class: "link", onclick: () => { if (confirm("Delete this " + (p.kind === "card" ? "card" : "note") + "?")) { savePoints(points().filter(x => x.id !== p.id)); render(); } } }, "Delete"));
      if (p.kind === "card") {
        const score = p.tested ? `knew it ${p.knew} of ${p.tested} time${p.tested === 1 ? "" : "s"}${p.last === "again" ? " · to review" : ""}` : "not tested yet";
        box.append(el("div", { class: "card" }, el("div", { html: `<h3>${api.linked(p.title, act)}</h3>` + (answers ? `<p>${api.linked(p.body, act)}</p>` : `<p class="muted"><i>Answer hidden: Show answers, or Test me.</i></p>`) + law + `<p class="muted">${score}</p>` }), actions));
      } else {
        box.append(el("div", { class: "card note" }, el("div", { html: (p.title ? `<h3>${api.linked(p.title, act)}</h3>` : "") + (p.body ? `<p class="hand">${api.linked(p.body, act)}</p>` : "") + (p.ink ? inkSvg(J(p.ink)) : "") + law }), actions));
      }
    }
    const cards = mine.filter(p => p.kind === "card");
    box.append(el("div", { class: "row" },
      el("button", { onclick: () => edit("note") }, "Add a note"),
      el("button", { onclick: () => edit("card") }, "Add a practice card"),
      tab === "card" ? el("button", { onclick: () => { answers = !answers; render(); } }, answers ? "Hide answers" : "Show answers") : null,
      el("span", { class: "grow" }),
      el("button", { class: "primary", disabled: !cards.length, onclick: () => testMe(cards, topic, act, render) }, "Test me")));
  }
  function edit(kind, p) {
    const card = kind === "card";
    const title = el("textarea", { rows: 2, placeholder: card ? "The question to answer" : "A heading, e.g. Perquisites" }); title.value = p?.title || "";
    const body = el("textarea", { rows: card ? 4 : 6, placeholder: card ? "The answer, in your own words" : "Your note", class: card ? "" : "hand-input" }); body.value = p?.body || "";
    const law = el("input", { placeholder: "Optional: the law it rests on, e.g. Section 13; rule 5" }); law.value = p?.law || "";
    const pad = card ? null : new InkPad(p?.ink ? J(p.ink) : null);
    const form = el("div", {},
      el("label", {}, card ? "Question" : "Heading"), title,
      el("label", {}, card ? "Answer" : "Note: type it, or write it by hand below"), body,
      pad ? el("div", {}, el("label", {}, "Write by hand (Apple Pencil, or your finger)"), pad.tools(), pad.el) : null,
      el("label", {}, "Law"), law,
      el("div", { class: "row end", style: "margin-top:14px" },
        el("button", { onclick: closeSheet }, "Cancel"),
        el("button", { class: "primary", onclick: () => {
          const ink = pad ? pad.value() : "";
          if (!title.value.trim() && !ink && !body.value.trim()) { title.focus(); return; }
          const all = points(), now = new Date().toISOString();
          const data = { topic: topicId, kind, title: title.value, body: body.value, law: law.value, ink, updated: now };
          if (p) Object.assign(all.find(x => x.id === p.id), data);
          else all.push({ id: Date.now(), created: now, tested: 0, knew: 0, last: "", ...data });
          savePoints(all); closeSheet(); tab = kind; render();
        } }, "Save")));
    sheet((p ? "Edit" : "Add") + (card ? " a practice card" : " a note"), form);
  }
  render();
  return box;
}

function testMe(cards, topic, act, done) {
  const rank = c => [c.last !== "again" ? 1 : 0, c.tested > 0 ? 1 : 0, c.tested ? c.knew / c.tested : 0, Math.random()];
  let queue = [...cards].sort((a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
  let pos = 0, knew = 0, again = [];
  const box = el("div");
  function ask() {
    const c = queue[pos];
    box.innerHTML = `<p class="muted">${esc(topic)} · card ${pos + 1} of ${queue.length}</p><h2>${api.linked(c.title, act)}</h2><p class="muted">Answer it in your head, or on paper, then show the answer.</p>`;
    box.append(el("div", { class: "row end" }, el("button", { class: "primary", onclick: reveal }, "Show answer")));
  }
  function reveal() {
    const c = queue[pos];
    box.innerHTML = `<p class="muted">${esc(topic)} · card ${pos + 1} of ${queue.length}</p><h2>${api.linked(c.title, act)}</h2><hr><p class="big">${api.linked(c.body, act) || "<i>No answer written.</i>"}</p>` + (c.law ? `<p class="muted">${api.cited(c.law, act)}</p>` : "");
    box.append(el("div", { class: "row end" }, el("button", { onclick: () => mark(false) }, "Review again"), el("button", { class: "primary", onclick: () => mark(true) }, "Knew it")));
  }
  function mark(k) {
    const all = points(), c = all.find(x => x.id === queue[pos].id);
    if (c) { c.tested += 1; c.knew += k ? 1 : 0; c.last = k ? "knew" : "again"; savePoints(all); }
    knew += k; if (!k) again.push(queue[pos]);
    pos += 1;
    if (pos < queue.length) { ask(); return; }
    box.innerHTML = `<h2 class="${knew === queue.length ? "ok" : "warn"}">You knew ${knew} of ${queue.length}.</h2>` + (again.length
      ? "<p>To review:</p><ul>" + again.map(c => `<li>${api.linked(c.title, act)}</li>`).join("") + "</ul><p class='muted'>These come first the next time you test yourself.</p>"
      : "<p>Well done: you knew them all.</p>");
    box.append(el("div", { class: "row end" }, again.length ? el("button", { onclick: () => { queue = again; pos = 0; knew = 0; again = []; ask(); } }, "Practise the ones to review") : null,
      el("button", { class: "primary", onclick: () => { closeSheet(); done(); } }, "Done")));
  }
  ask();
  sheet("Test me — " + topic, box);
}

// ---------------------------------------------------------------- handwriting: the same ink as the desktop's
const inkWidth = (s, p) => (s.s || 3) * (0.35 + 0.65 * Math.max(0, Math.min(1, p)));
function inkSvg(ink) {
  const w = ink.w || 1000, used = Math.max(0, ...ink.strokes.flatMap(s => s.p.map(p => p[1])));
  const h = used ? Math.min(ink.h || 700, used + 40) : 80;
  let out = "";
  for (const s of ink.strokes) {
    const c = esc(s.c || PENS.ink);
    if (s.p.length === 1) out += `<circle cx="${s.p[0][0]}" cy="${s.p[0][1]}" r="${(inkWidth(s, s.p[0][2]) / 2).toFixed(1)}" fill="${c}"/>`;
    for (let i = 1; i < s.p.length; i++) {
      const [x1, y1, p1] = s.p[i - 1], [x2, y2, p2] = s.p[i];
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${inkWidth(s, (p1 + p2) / 2).toFixed(1)}" stroke-linecap="round"/>`;
    }
  }
  return `<svg class="inkview" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="640">${out}</svg>`;
}

class InkPad {
  constructor(ink) {
    this.ink = ink && ink.strokes ? ink : { w: 1000, h: 700, strokes: [] };
    this.color = PENS.ink; this.size = SIZES.Medium; this.erasing = false; this.undoStack = []; this.cur = null; this.penSeen = false;
    this.canvas = el("canvas");
    this.el = el("div", { class: "pad" }, this.canvas);
    const c = this.canvas;
    c.addEventListener("pointerdown", e => this.down(e));
    c.addEventListener("pointermove", e => this.move(e));
    for (const t of ["pointerup", "pointercancel", "pointerleave"]) c.addEventListener(t, () => this.up());
    new ResizeObserver(() => requestAnimationFrame(() => this.resize())).observe(this.el);
  }
  tools() {
    const dots = Object.entries(PENS).map(([name, color]) => el("button", { class: "dot" + (color === this.color ? " on" : ""), style: `background:${color}`, title: name + " pen", onclick: e => { this.color = color; this.erasing = false; mark(e.target); } }));
    const eraser = el("button", { onclick: e => { this.erasing = true; mark(e.target); } }, "Eraser");
    const mark = b => { for (const d of [...dots, eraser]) d.classList.toggle("on", d === b); };
    const size = el("select", { onchange: e => { this.size = Number(e.target.value); } }, ...Object.entries(SIZES).map(([n, v]) => el("option", { value: v, selected: v === this.size }, n + " pen")));
    return el("div", { class: "pens" }, ...dots, size, eraser, el("span", { class: "grow" }),
      el("button", { onclick: () => this.undo() }, "Undo"), el("button", { onclick: () => this.clear() }, "Clear"));
  }
  resize() {
    const w = this.el.clientWidth || 600, ratio = window.devicePixelRatio || 1;
    this.scale = w / this.ink.w;
    this.canvas.style.height = (this.ink.h * this.scale) + "px";
    this.canvas.width = w * ratio; this.canvas.height = this.ink.h * this.scale * ratio;
    this.ratio = ratio; this.draw();
  }
  at(e) { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale]; }
  pressure(e) { return e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5; }
  ignore(e) { if (e.pointerType === "pen") this.penSeen = true; return e.pointerType === "touch" && this.penSeen; }  // a resting hand
  down(e) {
    if (this.ignore(e)) return;
    e.preventDefault(); this.canvas.setPointerCapture(e.pointerId);
    const [x, y] = this.at(e);
    if (this.erasing) { this.undoStack.push(JSON.stringify(this.ink.strokes)); this.erase(x, y); this.cur = "erase"; return; }
    this.cur = { c: this.color, s: this.size, p: [[x, y, this.pressure(e)]] };
  }
  move(e) {
    if (!this.cur || this.ignore(e)) return;
    for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
      const [x, y] = this.at(ev);
      if (this.cur === "erase") { this.erase(x, y); continue; }
      const last = this.cur.p[this.cur.p.length - 1];
      if ((x - last[0]) ** 2 + (y - last[1]) ** 2 >= 1.5) this.cur.p.push([x, y, this.pressure(ev)]);
    }
    this.draw();
  }
  up() {
    if (this.cur && this.cur !== "erase") { this.undoStack.push(JSON.stringify(this.ink.strokes)); this.ink.strokes.push(this.cur); }
    this.cur = null; this.draw();
  }
  erase(x, y, r = 14) {
    const keep = this.ink.strokes.filter(s => !s.p.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 <= r * r));
    if (keep.length !== this.ink.strokes.length) { this.ink.strokes = keep; this.draw(); }
  }
  undo() { if (this.undoStack.length) { this.ink.strokes = JSON.parse(this.undoStack.pop()); this.draw(); } }
  clear() { if (this.ink.strokes.length) { this.undoStack.push(JSON.stringify(this.ink.strokes)); this.ink.strokes = []; this.draw(); } }
  draw() {
    const g = this.canvas.getContext("2d"), k = this.scale * this.ratio;
    if (!k) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#fffdf7"; g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.strokeStyle = "#dbe4f0"; g.lineWidth = 1;
    for (let y = 76; y < this.ink.h; y += 38) { g.beginPath(); g.moveTo(0, y * k); g.lineTo(this.canvas.width, y * k); g.stroke(); }
    g.strokeStyle = "#f3c4c4"; g.beginPath(); g.moveTo(70 * k, 0); g.lineTo(70 * k, this.canvas.height); g.stroke();
    g.lineCap = "round"; g.lineJoin = "round";
    for (const s of [...this.ink.strokes, ...(this.cur && this.cur !== "erase" ? [this.cur] : [])]) {
      g.strokeStyle = g.fillStyle = s.c;
      if (s.p.length === 1) { g.beginPath(); g.arc(s.p[0][0] * k, s.p[0][1] * k, inkWidth(s, s.p[0][2]) * k / 2, 0, 7); g.fill(); }
      for (let i = 1; i < s.p.length; i++) {
        const [x1, y1, p1] = s.p[i - 1], [x2, y2, p2] = s.p[i];
        g.lineWidth = inkWidth(s, (p1 + p2) / 2) * k;
        g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.stroke();
      }
    }
  }
  value() {
    const strokes = this.ink.strokes.filter(s => s.p.length).map(s => ({ c: s.c, s: Math.round(s.s * 10) / 10, p: s.p.map(([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100]) }));
    return strokes.length ? JSON.stringify({ w: this.ink.w, h: this.ink.h, strokes }) : "";
  }
}

// ---------------------------------------------------------------- law library: the Rules, the Ordinance and the Act
function libraryPage(holder) {
  const sp = split(holder);
  const tree = J(busyNow(() => api.library_tree()));
  const nodes = {}, parent = {};
  (function index(list, up) { for (const n of list) { nodes[n.ref] = n; parent[n.ref] = up; if (n.children) index(n.children, n.ref); } })(tree, null);
  const open = new Set(store.get("libraryOpen", ["law:ITR"]));
  const search = el("input", { type: "search", placeholder: "Find by number or words in the law: 44, rule 34, banking channel…" });
  const items = el("div", { class: "items tree" });
  sp.list.append(el("div", { class: "tools" }, search), items);
  let chosen = store.get("library", "law:ITR"), query = "", found = null, timer = null;

  function row(n, depth) {
    const kids = n.children && n.children.length;
    const div = el("div", { class: "node" + (n.ref === chosen ? " on" : "") + (depth === 0 ? " law" : "") + (n.omitted ? " omitted" : ""), style: `padding-left:${12 + depth * 16}px` },
      el("span", { class: "tw" }, kids ? (open.has(n.ref) ? "▾" : "▸") : ""), el("span", {}, n.title));
    div.onclick = () => { if (kids) { open.has(n.ref) ? open.delete(n.ref) : open.add(n.ref); store.set("libraryOpen", [...open]); } select(n.ref, true); };
    return div;
  }
  function fill() {
    items.innerHTML = "";
    if (found) {  // a search: what it found, law by law
      items.append(el("div", { class: "node on", onclick: () => select("results:", true) }, el("span", {}, `Results for “${query}” (${found.length})`)));
      for (const law of tree) {
        const mine = found.filter(r => r.split(":")[1] === law.ref.split(":")[1] && nodes[r]);
        if (!mine.length) continue;
        items.append(el("div", { class: "group" }, law.title));
        for (const r of mine) items.append(el("div", { class: "node" + (r === chosen ? " on" : ""), onclick: () => select(r, true) }, el("span", {}, nodes[r].title)));
      }
      return;
    }
    (function walk(list, depth) { for (const n of list) { items.append(row(n, depth)); if (n.children && open.has(n.ref)) walk(n.children, depth + 1); } })(tree, 0);
  }
  function select(ref, fromList) {
    chosen = ref;
    if (!fromList && !found) { for (let p = parent[ref]; p; p = parent[p]) open.add(p); }  // open the way to it
    store.set("library", ref);
    const page = ref === "results:" ? J(api.library_search(query)).html : api.library_page(ref, found ? query : "");
    sp.detail.innerHTML = "";
    sp.detail.append(backButton(sp), el("div", { html: page }));
    fill();
    sp.read(true);
    const hit = sp.detail.querySelector("a[name=hit]"); if (hit) setTimeout(() => hit.scrollIntoView({ block: "center" }), 50);
    const on = items.querySelector(".node.on:not(:first-child)") || items.querySelector(".node.on"); if (on && !fromList) on.scrollIntoView({ block: "center" });
  }
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      query = search.value.trim();
      if (!query) { found = null; fill(); return; }
      const res = J(api.library_search(query));
      found = res.refs;
      fill();
      sp.detail.innerHTML = ""; sp.detail.append(backButton(sp), el("div", { html: res.html || "<p class='muted'>Nothing matches. Try a number (44, STR-7) or other words.</p>" }));
      sp.read(true);
    }, 300);
  });
  fill();
  if (innerWidth > 900) select(chosen);
  return { select: ref => { if (found) { search.value = ""; found = null; query = ""; } select(ref, false); } };
}
function busyNow(fn) { return fn(); }

// ---------------------------------------------------------------- practice: cases and the question bank
function practicePage(holder) {
  const wrap = el("div", { style: "display:flex;flex-direction:column;flex:1;min-height:0" });
  const tabs = el("div", { class: "tabs", style: "padding:0 22px;margin:8px 0 0" });
  const body = el("div", { style: "display:flex;flex:1;min-height:0" });
  wrap.append(tabs, body); holder.append(wrap);
  const show = which => {
    store.set("practiceTab", which);
    for (const b of tabs.children) b.classList.toggle("on", b.dataset.t === which);
    body.innerHTML = "";
    (which === "quiz" ? quizPanel : casesPanel)(body);
  };
  const list = J(api.case_list());
  tabs.append(el("button", { "data-t": "cases", onclick: () => show("cases") }, `Case studies (${list.cases.length})`),
    el("button", { "data-t": "quiz", onclick: () => show("quiz") }, "Question bank"));
  show(store.get("practiceTab", "cases"));
}

function casesPanel(holder) {
  const sp = split(holder);
  const list = J(api.case_list());
  const topic = el("select", {}, el("option", { value: "" }, "All topics"), ...list.topics.map(t => el("option", { value: t }, t)));
  const items = el("div", { class: "items" });
  sp.list.append(el("div", { class: "tools" }, topic), items);
  const fill = () => {
    items.innerHTML = "";
    for (const c of list.cases.filter(c => !topic.value || c.topic === topic.value)) {
      const work = store.get("case:" + c.id, null);
      items.append(el("div", { class: "item", onclick: () => openCase(c.id) }, c.title,
        el("small", {}, `${c.topic} · ${c.level} · ${c.kind}${work ? " · " + (work.ok ? "correct" : "started") : ""}`)));
    }
  };
  topic.onchange = fill; fill();

  function openCase(id) {
    const c = J(api.case_start(id));
    const saved = store.get("case:" + id, null);
    let doc = saved ? saved.doc : structuredClone(c.blank);
    const save = (extra = {}) => store.set("case:" + id, { doc, ...(store.get("case:" + id, {}) || {}), ...extra, doc });
    sp.detail.innerHTML = "";
    sp.detail.append(backButton(sp), el("div", { class: "card", html: c.facts }));
    const getPath = p => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);
    const setPath = (p, v) => { const ks = p.split("."); let o = doc; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks[ks.length - 1]] = v; save(); };
    c.sections.forEach((s, i) => sp.detail.append(section(s, i === 0, getPath, setPath, () => doc, save)));
    const out = el("div");
    sp.detail.append(el("div", { class: "actions" },
      el("button", { class: "primary", onclick: () => busy(() => { sheet("Computation", api.compute(id, JSON.stringify(doc))); }) }, "Compute"),
      el("button", { class: "primary", onclick: () => busy(() => {
        const html = api.check(id, JSON.stringify(doc)); save({ ok: html.includes("Well done") });
        sheet("Check my answer", html); fill();
      }) }, "Check my answer"),
      el("button", { onclick: () => busy(() => sheet("Model answer", api.model_answer(id))) }, "Model answer"),
      el("span", { class: "grow" }),
      el("button", { onclick: () => { if (confirm("Start this case again? Your entries are cleared.")) { store.del("case:" + id); openCase(id); } } }, "Start again")), out);
    sp.read(true);
  }
}

function section(s, first, getPath, setPath, getDoc, save) {
  const d = el("details", { class: "card section", open: first }, el("summary", {}, s.name));
  if (s.intro) d.append(el("p", { class: "muted" }, s.intro));
  if (s.kind === "form" || s.kind === "recon") for (const f of s.fields) d.append(fieldRow(f, getPath, setPath));
  if (s.kind === "table") d.append(rowsTable(s, getDoc, save));
  if (s.kind === "wealth") d.append(wealthGrid(s, getDoc, save));
  return d;
}

function input(kind, value, onchange, choices) {
  if (kind === "bool") { const i = el("input", { type: "checkbox" }); i.checked = !!value; i.onchange = () => onchange(i.checked); return i; }
  if (kind === "yesno") return input("choice", value === false || value === "no" ? "no" : "yes", v => onchange(v === "yes"), [["yes", "Yes"], ["no", "No"]]);
  if (kind === "choice") { const s = el("select", {}, ...choices.map(([v, t]) => el("option", { value: v }, t))); s.value = value ?? choices[0][0]; s.onchange = () => onchange(s.value); if (value == null) onchange(s.value); return s; }
  if (kind === "text") { const i = el("input", { type: "text" }); i.value = value ?? ""; i.onchange = () => onchange(i.value.trim()); return i; }
  if (kind === "date") { const i = el("input", { type: "date" }); i.value = value ?? ""; i.onchange = () => onchange(i.value); return i; }
  const i = el("input", { type: "text", inputmode: kind === "int" ? "numeric" : "decimal", class: "money" });
  i.value = value ? money(value) : "";
  i.onchange = () => { const v = num(i.value); i.value = v ? money(v) : ""; onchange(kind === "int" ? Math.round(v) : v); };
  return i;
}

function fieldRow(f, getPath, setPath) {
  return el("div", { class: "field" },
    el("label", { html: esc(f.label) + (f.law ? `<small>${f.law}</small>` : "") + (f.help ? `<small>${esc(f.help)}</small>` : "") }),
    input(f.kind, getPath(f.path), v => setPath(f.path, v), f.choices));
}

function rowsTable(s, getDoc, save) {
  const box = el("div", { class: "tablewrap" });
  const draw = () => {
    const rows = getDoc()[s.key] ||= [];
    box.innerHTML = "";
    const t = el("table", { class: "rows" }, el("tr", {}, ...s.cols.map(c => el("th", {}, c.header)), el("th")));
    rows.forEach((r, i) => t.append(el("tr", {}, ...s.cols.map(c => el("td", {}, input(c.kind, r[c.key] ?? c.default, v => { r[c.key] = v; save(); }, c.choices))),
      el("td", {}, el("button", { class: "link", onclick: () => { rows.splice(i, 1); save(); draw(); } }, "Remove")))));
    box.append(t, el("button", { onclick: () => { rows.push({}); save(); draw(); } }, s.add));
  };
  draw();
  return box;
}

function wealthGrid(s, getDoc, save) {
  const w = () => getDoc().wealth ||= {};
  const t = el("table", { class: "rows" }, el("tr", {}, el("th", {}, "Assets at cost, and liabilities"), el("th", {}, "Opening (start of year)"), el("th", {}, "Closing (year end)")));
  for (const [part, items] of [["assets", s.assets], ["liabilities", s.liabilities]]) {
    t.append(el("tr", {}, el("td", { colspan: 3, style: "font-weight:700;padding-top:10px" }, part === "assets" ? "Assets" : "Liabilities")));
    for (const it of items) {
      const v = (w()[part] || {})[it.key] || {};
      const set = (when, x) => { const p = w()[part] ||= {}; const e = p[it.key] ||= { open: 0, close: 0 }; e[when] = x; if (!e.open && !e.close) delete p[it.key]; save(); };
      t.append(el("tr", {}, el("td", {}, it.label), el("td", {}, input("money", v.open, x => set("open", x))), el("td", {}, input("money", v.close, x => set("close", x)))));
    }
  }
  return el("div", { class: "tablewrap" }, t);
}

function quizPanel(holder) {
  const box = el("div", { class: "detail", style: "max-width:900px" });
  holder.append(box);
  const topics = J(api.quiz_start("", "")).topics;
  const topic = el("select", {}, el("option", { value: "" }, "All topics"), ...topics.map(t => el("option", { value: t }, t)));
  const level = el("select", {}, ...["", "Basic", "Intermediate", "Advanced"].map(l => el("option", { value: l }, l || "All levels")));
  const card = el("div", { class: "card" }), score = el("span", { class: "muted" });
  let qs = [], pos = 0, right = 0, done = 0;
  const begin = () => { qs = J(api.quiz_start(topic.value, level.value)).questions; pos = right = done = 0; ask(); };
  function ask() {
    card.innerHTML = "";
    score.textContent = done ? `${right} of ${done} right this round` : "";
    if (pos >= qs.length) { card.append(el("h3", {}, done ? `Done: ${right} of ${done} correct.` : "No questions match.")); return; }
    const q = qs[pos];
    let choice = null;
    const answer = el("input", { type: "text", inputmode: "decimal", placeholder: "Your answer" });
    const opts = q.kind === "choice" ? el("div", {}, ...q.options.map((o, i) => el("label", { class: "row", style: "padding:8px 0" }, el("input", { type: "radio", name: "q", onchange: () => { choice = i; } }), o))) : answer;
    const feedback = el("div");
    const checkBtn = el("button", { class: "primary", onclick: () => {
      const resp = q.kind === "choice" ? choice : answer.value;
      if (resp == null || resp === "") { feedback.innerHTML = "<p class='warn'>Choose or type an answer first.</p>"; return; }
      const r = J(api.quiz_check(q.id, String(resp)));
      right += r.ok; done += 1; score.textContent = `${right} of ${done} right this round`;
      feedback.innerHTML = r.html; checkBtn.disabled = true; next.textContent = "Next question";
      const marks = store.get("quiz", {}); marks[q.id] = r.ok ? 1 : 0; store.set("quiz", marks);
    } }, "Check");
    const next = el("button", { onclick: () => { pos += 1; ask(); } }, "Skip");
    card.append(el("p", { class: "muted" }, `Question ${pos + 1} of ${qs.length} · ${q.topic} · ${q.level}`), el("h3", {}, q.text), opts,
      el("div", { class: "row", style: "margin-top:12px" }, checkBtn, next), feedback);
  }
  box.append(el("div", { class: "row", style: "margin-bottom:14px" }, topic, level, el("button", { class: "primary", onclick: begin }, "Start"), score), card);
  begin();
}

// ---------------------------------------------------------------- law changes
function changesPage(holder) {
  const sp = split(holder);
  const data = J(api.change_list());
  const law = el("select", {}, el("option", { value: "" }, "All laws"), ...[...new Set(data.changes.map(c => c.law))].map(l => el("option", { value: l }, l)));
  const kind = el("select", {}, el("option", { value: "" }, "All changes"), ...["new", "changed", "omitted"].map(k => el("option", { value: k }, k[0].toUpperCase() + k.slice(1))));
  const search = el("input", { type: "search", placeholder: "Search number or heading, e.g. 37A, super tax…" });
  const items = el("div", { class: "items" });
  sp.list.append(el("div", { class: "tools" }, el("p", { class: "muted", style: "margin:0;font-size:13px" }, data.editions.map(e => `${e.law}: ${e.then} → ${e.now}`).join(" · ")), el("div", { class: "row" }, law, kind), search), items);
  const colour = { new: "ok", omitted: "bad", changed: "warn" };
  const fill = () => {
    items.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    const shown = data.changes.filter(c => (!law.value || c.law === law.value) && (!kind.value || c.kind === kind.value) && (!q || `${c.key} ${c.title} ${c.heading}`.toLowerCase().includes(q)));
    items.append(el("div", { class: "group" }, `${shown.length} shown`));
    for (const c of shown) items.append(el("div", { class: "item", onclick: () => { sp.detail.innerHTML = ""; sp.detail.append(backButton(sp), el("div", { html: api.change_page(c.act, c.key) })); sp.read(true); } },
      el("span", { class: colour[c.kind] }, c.kind[0].toUpperCase() + c.kind.slice(1)), " · ", c.title, el("small", {}, `${c.law} · ${c.heading}`)));
  };
  for (const x of [law, kind]) x.onchange = fill;
  search.oninput = fill;
  fill();
  if (innerWidth > 900 && data.changes.length) items.children[1].click();
}

// ---------------------------------------------------------------- Ask TaxDesk
function askPage(holder) {
  const box = el("div", { class: "detail chat", style: "max-width:980px" });
  holder.append(box);
  const log = el("div");
  const input = el("textarea", { rows: 2, placeholder: "Ask about a section, a concept, or give figures: tax on a salary of Rs 3,000,000…" });
  const send = q => {
    q = (q || input.value).trim(); if (!q) return;
    input.value = "";
    log.append(el("div", { class: "you" }, q));
    busy(() => {
      const md = api.ask(q);
      const answer = el("div", { class: "bot", html: marked.parse(md) });
      log.append(answer); answer.scrollIntoView({ block: "start" });
    }, "Thinking…");
  };
  box.append(el("p", { class: "muted" }, "TaxDesk's own tutor. It works offline, and nothing you type leaves this iPad."),
    el("div", { class: "chips" }, ...J(api.suggestions()).map(s => el("button", { onclick: () => send(s) }, s))), log,
    el("div", { class: "actions" }, input, el("button", { class: "primary", onclick: () => send() }, "Send")));
}

// ---------------------------------------------------------------- backup and licence
function backupPage(holder) {
  const box = el("div", { class: "detail", style: "max-width:820px" });
  holder.append(box);
  const exportAll = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("taxdesk.") && k !== "taxdesk.key") data[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: "TaxDesk", version, saved: new Date().toISOString(), data }, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `TaxDesk backup ${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  };
  const file = el("input", { type: "file", accept: "application/json,.json", onchange: async () => {
    try {
      const b = JSON.parse(await file.files[0].text());
      if (b.app !== "TaxDesk") throw new Error("not a TaxDesk backup");
      if (!confirm("Replace your notes, cards and case work on this iPad with the backup's?")) return;
      for (const [k, v] of Object.entries(b.data)) if (k.startsWith("taxdesk.")) localStorage.setItem(k, v);
      alert("Restored."); go("guide");
    } catch (e) { alert("Couldn't restore: " + e.message); }
  } });
  const n = points().length, cases = Object.keys(localStorage).filter(k => k.startsWith("taxdesk.case:")).length;
  box.append(
    el("div", { class: "card" }, el("h3", {}, "Your work on this iPad"),
      el("p", {}, `${n} practice point${n === 1 ? "" : "s"} (notes and cards) and ${cases} case${cases === 1 ? "" : "s"} you've worked on are kept on this iPad.`),
      el("p", { class: "muted" }, "Save a backup now and then (to Files or iCloud Drive): it keeps your notes, handwriting, cards and work if the iPad is reset."),
      el("div", { class: "row" }, el("button", { class: "primary", onclick: exportAll }, "Save a backup…"), el("label", { class: "row" }, "Restore a backup:", file))),
    el("div", { class: "card" }, el("h3", {}, "Licence"),
      el("p", {}, `TaxDesk ${version}.`),
      el("button", { onclick: () => { if (confirm("Remove the licence key from this iPad? You'll need it to open TaxDesk again.")) { store.del("key"); location.reload(); } } }, "Remove the licence key from this iPad")));
}

start();
