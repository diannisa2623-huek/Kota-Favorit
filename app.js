/* ============================================================
   NusaKota – app.js
   ------------------------------------------------------------
   LANGKAH WAJIB: tempel URL Web App Apps Script kamu di bawah.
   Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
   ============================================================ */
const WEB_APP_URL = "";   // <-- ISI DI SINI

const REFRESH_MS = 30000; // perbarui peringkat tiap 30 detik

/* Daftar kota. Nama harus sama persis dengan yang ada di code.gs */
const CITIES = [
  { name: "Bali",        emoji: "🏝️", color: "#00b4d8" },
  { name: "Yogyakarta",  emoji: "🏯", color: "#ff6b6b" },
  { name: "Bandung",     emoji: "🌄", color: "#06d6a0" },
  { name: "Jakarta",     emoji: "🌆", color: "#7c5cff" },
  { name: "Surabaya",    emoji: "🦈", color: "#0077b6" },
  { name: "Malang",      emoji: "🍎", color: "#ffb703" },
  { name: "Labuan Bajo", emoji: "🦎", color: "#ff7eb6" },
  { name: "Lombok",      emoji: "🌊", color: "#2ec4b6" },
  { name: "Medan",       emoji: "🍜", color: "#f77f00" },
  { name: "Makassar",    emoji: "⛵", color: "#4361ee" },
  { name: "Semarang",    emoji: "🏛️", color: "#e56b9f" },
  { name: "Manado",      emoji: "🐠", color: "#48cae4" }
];

const FEATURES = [
  { t: "Kuliner Khas",      d: "Makanan lezat yang tidak ada di kota lain.",       i: "🍜", c: "#ffe2a8" },
  { t: "Pantai & Laut",     d: "Pasir lembut dan air jernih untuk melepas penat.", i: "🏖️", c: "#c9f2ff" },
  { t: "Budaya & Sejarah",  d: "Tradisi hidup yang masih dirayakan warganya.",     i: "🎭", c: "#ffd0e3" },
  { t: "Alam Terbuka",      d: "Gunung, danau, dan kebun yang dekat dari pusat kota.", i: "⛰️", c: "#c8f5e6" },
  { t: "Keramahan Warga",   d: "Orang lokal yang mudah menyapa dan membantu.",     i: "🤝", c: "#e0d7ff" },
  { t: "Belanja & Oleh-oleh", d: "Pasar, butik, dan toko kerajinan khas daerah.",  i: "🛍️", c: "#ffd9c7" },
  { t: "Hiburan Malam",     d: "Kafe, musik langsung, dan jajanan sampai larut.",  i: "🌙", c: "#d4e4ff" },
  { t: "Mudah Dijangkau",   d: "Bandara, kereta, dan jalan yang nyaman.",          i: "🚆", c: "#fff0b3" }
];

/* Data contoh saat WEB_APP_URL masih kosong */
const DEMO = {
  total: 0,
  counts: { "Bali": 128, "Yogyakarta": 112, "Bandung": 87, "Labuan Bajo": 64, "Malang": 52, "Jakarta": 41, "Lombok": 38, "Surabaya": 24 },
  recent: [
    { nama: "Dewi",  kota: "Bali",       alasan: "Pantainya bikin tenang dan makanannya enak.", waktu: "" },
    { nama: "Rama",  kota: "Yogyakarta", alasan: "Murah, ramah, dan penuh budaya.", waktu: "" },
    { nama: "Salsa", kota: "Bandung",    alasan: "Udaranya sejuk dan kafenya banyak.", waktu: "" }
  ]
};

/* ---------------- util ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const cityMeta = n => CITIES.find(c => c.name === n) || { emoji: "📍", color: "#0077b6" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const fmt = n => new Intl.NumberFormat("id-ID").format(n);
const isDemo = !WEB_APP_URL;
let state = isDemo ? JSON.parse(JSON.stringify(DEMO)) : { total: 0, counts: {}, recent: [] };
let loaded = false;

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("show"), 3600);
}

/* ---------------- animasi saat scroll ---------------- */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" })
  : null;

function watch(el) {
  if (!el) return;
  if (io) io.observe(el); else el.classList.add("in");
}
function watchAll(root = document) { root.querySelectorAll(".reveal:not(.in)").forEach(watch); }

/* angka naik pelan */
function countTo(el, to) {
  if (!el) return;
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
  const start = performance.now(), dur = 1100;
  (function tick(now) {
    const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

/* ---------------- render statis ---------------- */
function renderFeatures() {
  $("#features").innerHTML = FEATURES.map((f, i) => `
    <article class="fcard reveal ${i === 0 ? "hl" : ""}" style="--d:${(i % 4) * 0.1}s">
      <div class="ic" style="--c:${f.c}">${f.i}</div>
      <h3>${esc(f.t)}</h3>
      <p>${esc(f.d)}</p>
      <a href="#vote">Pilih kota →</a>
    </article>`).join("");
}

function renderChips() {
  $("#chips").innerHTML = CITIES.map((c, i) => `
    <label class="chip" style="--c:${c.color}">
      <input type="radio" name="kota" value="${esc(c.name)}" ${i === 0 ? "" : ""}>
      <span>${c.emoji} ${esc(c.name)}</span>
    </label>`).join("");
}

/* ---------------- render data ---------------- */
function render() {
  const entries = Object.entries(state.counts)
    .map(([name, n]) => [name, Number(n) || 0])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const top = entries[0], second = entries[1];

  countTo($("#heroTotal"), total);
  countTo($("#statTotal"), total);
  countTo($("#statCities"), entries.length);
  $("#statLeader").textContent = top ? `${cityMeta(top[0]).emoji} ${top[0]}` : "–";

  $("#heroLeader").textContent = top ? top[0] : "Belum ada";
  const pct = top && total ? Math.round(top[1] / total * 100) : 0;
  $("#heroRing").style.setProperty("--p", pct);
  $("#heroPct").textContent = pct + "%";
  $("#heroNote").textContent = top
    ? `${top[0]} memegang ${pct}% dari seluruh suara.`
    : "Jadilah yang pertama memberi suara.";
  $("#heroSecond").textContent = second ? second[0] : "Belum ada";
  $("#heroSecondVotes").textContent = second ? `${fmt(second[1])} suara` : "0 suara";

  const max = top ? top[1] : 1;
  const bars = $("#bars");
  bars.innerHTML = entries.length ? entries.map(([name, n], i) => {
    const m = cityMeta(name), share = total ? Math.round(n / total * 100) : 0;
    return `<div class="bar">
      <div class="n">${i === 0 ? "👑" : m.emoji}</div>
      <div><div class="nm"><span>${esc(name)}</span><em>${share}%</em></div>
        <div class="track"><div class="fill" style="--c:${m.color}" data-w="${Math.max(4, n / max * 100)}"></div></div></div>
      <div class="v">${fmt(n)}</div></div>`;
  }).join("") : `<p class="empty">Belum ada suara. Jadilah yang pertama!</p>`;

  const feed = $("#feed");
  feed.innerHTML = state.recent.length ? state.recent.map(r => {
    const m = cityMeta(r.kota);
    return `<div class="msg" style="--c:${m.color}"><span class="ct">${m.emoji} ${esc(r.kota)}</span><b>${esc(r.nama || "Anonim")}</b>
      ${r.alasan ? `<p>${esc(r.alasan)}</p>` : `<p>Tidak menulis alasan.</p>`}</div>`;
  }).join("") : `<p class="empty">Belum ada cerita yang masuk.</p>`;

  /* isi lebar bar setelah panel terlihat */
  const panel = bars.closest(".panel");
  const fill = () => bars.querySelectorAll(".fill").forEach(f => (f.style.width = f.dataset.w + "%"));
  panel.classList.contains("in") ? requestAnimationFrame(fill) : new MutationObserver((_, o) => { if (panel.classList.contains("in")) { o.disconnect(); setTimeout(fill, 250); } }).observe(panel, { attributes: true, attributeFilter: ["class"] });
}

/* ---------------- koneksi ke spreadsheet ---------------- */
async function loadData() {
  $("#demoNote").classList.toggle("on", isDemo);
  if (isDemo) { render(); return; }
  try {
    const res = await fetch(WEB_APP_URL + "?action=summary&t=" + Date.now());
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Respons tidak valid");
    state = { total: data.total, counts: data.counts || {}, recent: data.recent || [] };
    loaded = true;
    render();
  } catch (err) {
    console.error(err);
    if (!loaded) {
      $("#feed").innerHTML = `<p class="empty">Data belum bisa dimuat. Periksa URL Web App dan izin akses "Anyone".</p>`;
      $("#bars").innerHTML = `<p class="empty">Data belum bisa dimuat.</p>`;
    }
  }
}

async function sendVote(payload) {
  if (isDemo) {
    state.counts[payload.kota] = (state.counts[payload.kota] || 0) + 1;
    state.recent.unshift({ ...payload, waktu: "" });
    state.recent = state.recent.slice(0, 8);
    render();
    return;
  }
  /* text/plain menghindari preflight CORS di Apps Script */
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Gagal menyimpan");
  await loadData();
}

/* ---------------- form ---------------- */
function bindForm() {
  const form = $("#voteForm"), err = $("#err"), btn = $("#submitBtn"), box = $("#form");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.textContent = "";
    const nama = form.nama.value.trim();
    const kota = (form.querySelector("input[name=kota]:checked") || {}).value;
    const alasan = form.alasan.value.trim();
    if (!nama) { err.textContent = "Tulis namamu dulu."; form.nama.focus(); return; }
    if (!kota) { err.textContent = "Pilih satu kota favoritmu."; return; }
    btn.disabled = true; btn.textContent = "Mengirim…";
    try {
      await sendVote({ nama, kota, alasan });
      box.classList.add("done");
      form.reset();
      toast("Suaramu tersimpan. Terima kasih!");
    } catch (ex) {
      console.error(ex);
      err.textContent = "Suara belum terkirim. Periksa koneksi dan URL Web App, lalu coba lagi.";
    } finally {
      btn.disabled = false; btn.textContent = "Kirim Suara";
    }
  });
  $("#again").addEventListener("click", () => box.classList.remove("done"));
}

/* ---------------- navigasi ---------------- */
function bindNav() {
  const burger = $("#burger"), menu = $("#menu");
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  menu.addEventListener("click", e => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });

  const links = [...menu.querySelectorAll("a")];
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  }), { threshold: 0.45 });
  ["home", "fitur", "ranking", "cara", "vote"].forEach(id => spy.observe(document.getElementById(id)));
}

/* ---------------- mulai ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderFeatures();
  renderChips();
  bindForm();
  bindNav();
  watchAll();
  loadData();
  setInterval(() => { if (!document.hidden) loadData(); }, REFRESH_MS);
});
