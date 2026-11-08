// ============================================================
//  BRUSHSTROKES — bs.js  v4.0  PREMIUM EDITION
//  Living Gallery + Paint Quest + Art Carnival
// ============================================================

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ── Student data ─────────────────────────────────────────────
const student = {
  name:    "Student Name",
  course:  "Your Course",
  roll:    "Roll Number",
  college: "Ramanujan College",
  photo:   ""
};

$("#name").textContent    = student.name;
$("#course").textContent  = student.course;
$("#roll").textContent    = student.roll;
$("#college").textContent = student.college;
$("#avatar").innerHTML = student.photo
  ? `<img src="${student.photo}" alt="${student.name}">`
  : student.name.split(" ").map(w => w[0]).join("").slice(0, 2);

// ── Toast ────────────────────────────────────────────────────
const toastEl = $("#toast"); let toastTimer;
function say(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// ── Reduced motion ───────────────────────────────────────────
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Dark mode ────────────────────────────────────────────────
const root = document.documentElement, tbtn = $("#themeToggle");
function setTheme(t, animate) {
  root.dataset.theme = t;
  tbtn.firstElementChild.textContent = t === "dark" ? "☀️" : "🌙";
  if (animate) root.offsetHeight;
}
let saved = "light";
try {
  saved = localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
} catch(e) {}
setTheme(saved, false);
requestAnimationFrame(() => requestAnimationFrame(() =>
  document.body.classList.add("theme-ready")
));
tbtn.addEventListener("click", () => {
  const n = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(n, true);
  try { localStorage.setItem("theme", n); } catch(e) {}
  if (!calm) burstConfetti(10);
});

// ════════════════════════════════════════════════════════════
//  CONFETTI CANVAS — Art Carnival
// ════════════════════════════════════════════════════════════
const confettiCanvas = $("#confettiCanvas");
const ctx = confettiCanvas.getContext("2d");
const pieces = [];
const COLORS = ["#ff6b9d","#ffd93d","#6bcb77","#4d96ff","#c77dff","#ff9f43","#54a0ff","#5f27cd"];

function resizeConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener("resize", resizeConfetti);

function spawnPiece(x, y) {
  for (let i = 0; i < 6; i++) {
    pieces.push({
      x: x ?? Math.random() * confettiCanvas.width,
      y: y ?? -10,
      r: Math.random() * 7 + 3,
      d: Math.random() * 1.5 + .5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      angle: Math.random() * 360,
      spin:  (Math.random() - .5) * 6,
      vx:    (Math.random() - .5) * 3,
      vy:    Math.random() * 2 + 1,
      shape: Math.random() > .5 ? "rect" : "circle",
      alpha: 1,
      life:  Math.random() * 180 + 120,
      age:   0
    });
  }
}

function burstConfetti(n = 20, cx, cy) {
  for (let i = 0; i < n; i++) spawnPiece(cx, cy);
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    p.age++;
    p.alpha = Math.max(0, 1 - p.age / p.life);
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += .04;
    p.angle += p.spin;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle * Math.PI / 180);
    ctx.fillStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.r, -p.r * .5, p.r * 2, p.r);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (p.age > p.life || p.y > confettiCanvas.height + 20) pieces.splice(i, 1);
  }
  requestAnimationFrame(animateConfetti);
}
if (!calm) animateConfetti();

// Burst on load
if (!calm) setTimeout(() => burstConfetti(35), 600);

// ════════════════════════════════════════════════════════════
//  PAINT CANVAS — interactive brush strokes on click
// ════════════════════════════════════════════════════════════
const paintCanvas = $("#paintCanvas");
const pctx = paintCanvas.getContext("2d");
let painting = false, lastX = 0, lastY = 0;

function resizePaint() {
  const imgData = pctx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);
  paintCanvas.width  = window.innerWidth;
  paintCanvas.height = window.innerHeight;
  pctx.putImageData(imgData, 0, 0);
}
resizePaint();
window.addEventListener("resize", resizePaint);

const brushColors = ["#ff6b9d","#ffd93d","#6bcb77","#4d96ff","#c77dff","#ff9f43"];
let brushColor = brushColors[0], brushIdx = 0;

function paintSplat(x, y, r = 18, color = brushColor) {
  pctx.save();
  pctx.globalAlpha = .22;
  pctx.beginPath();
  pctx.arc(x, y, r, 0, Math.PI * 2);
  const g = pctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  pctx.fillStyle = g;
  pctx.fill();
  pctx.restore();
}

// Fade paint over time
setInterval(() => {
  pctx.globalAlpha = .015;
  pctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || "#fdf4e8";
  pctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
  pctx.globalAlpha = 1;
}, 2000);

// ════════════════════════════════════════════════════════════
//  GSAP ORCHESTRATED ENTRY — Living Gallery curtain effect
// ════════════════════════════════════════════════════════════
window.addEventListener("load", () => {
  if (calm || typeof gsap === "undefined") return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(".top",           { y: -40, opacity: 0, duration: .7 })
    .from(".gallery-wall",  { opacity: 0, scale: .96, y: 30, duration: .75, ease: "back.out(1.3)" }, "-=.2")
    .from(".museum-label",  { opacity: 0, y: -10, duration: .4 }, "-=.4")
    .from(".easel",         { y: 50, opacity: 0, duration: .7, ease: "back.out(1.5)" }, "-=.3")
    .from(".avatar-wrap",   { scale: 0, opacity: 0, duration: .55, ease: "back.out(2.5)" }, "-=.3")
    .from(".info h2",       { x: -28, opacity: 0, duration: .45 }, "-=.25")
    .from(".row",           { x: -18, opacity: 0, stagger: .08, duration: .38 }, "-=.2")
    .from(".xp-bar-wrap",   { opacity: 0, y: 10, duration: .4 }, "-=.1")
    .from(".xp-badge",      { scale: 0, rotation: -15, opacity: 0, duration: .45, ease: "back.out(2)" }, "-=.6")
    .from(".carnival-banner", { opacity: 0, y: 20, duration: .5 }, "-=.1")
    .from(".carnival-sub",    { opacity: 0, duration: .3 }, "-=.2")
    .from(".stage",         { y: 60, opacity: 0, scale: .9, duration: .75, ease: "back.out(1.3)" }, "-=.3")
    .from(".brush",         { x: -50, opacity: 0, rotate: -20, duration: .65, ease: "back.out(1.5)" }, "-=.45")
    .from(".quest-card",    { y: 30, opacity: 0, stagger: .12, duration: .5, ease: "back.out(1.6)" }, "-=.2")
    .from("footer",         { opacity: 0, duration: .4 }, "-=.1");
});

// ── 3-D palette tilt ─────────────────────────────────────────
const stage = $("#stage"), pal = $("#palette"), brush = $("#brush"), easel = $("#easel");

if (!calm) {
  stage.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - .5;
    const y = (e.clientY - r.top)  / r.height - .5;
    pal.style.transform = `perspective(900px) rotateX(${-y*10}deg) rotateY(${x*10}deg)`;
    brush.style.setProperty("--wob", `${x * 9}deg`);
  });
  stage.addEventListener("pointerleave", () => {
    pal.style.transform = "";
    brush.style.setProperty("--wob", "0deg");
  });
  easel.addEventListener("pointermove", e => {
    const r = easel.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - .5;
    const y = (e.clientY - r.top)  / r.height - .5;
    easel.style.transform = `perspective(900px) rotateX(${-y*5}deg) rotateY(${x*6}deg)`;
  });
  easel.addEventListener("pointerleave", () => easel.style.transform = "");
}

// ── Splash navigation ─────────────────────────────────────────
$$(".dab").forEach(a => {
  a.addEventListener("click", async e => {
    e.preventDefault();
    if (a.dataset.page === "home") return say("Aap Home par hi ho 🏠");
    const url = a.getAttribute("href");
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (!r.ok) throw 0;
    } catch { return say("Ye quest abhi unlock nahi hui 🎨"); }
    const b = a.getBoundingClientRect();
    const s = document.createElement("div");
    s.className = "splash";
    s.style.left       = `${b.left + b.width  / 2}px`;
    s.style.top        = `${b.top  + b.height / 2}px`;
    s.style.background = getComputedStyle(a).getPropertyValue("--a");
    document.body.appendChild(s);
    if (!calm) burstConfetti(18, b.left + b.width/2, b.top + b.height/2);
    setTimeout(() => location.href = url, calm ? 0 : 500);
  });
});

// ── Brush click — change colour ───────────────────────────────
const paints = ["#e8764f","#4fa45c","#2a78c9","#9a63e0","#f0a020","#c23a62","#20b8a0","#ff6b9d"];
let paintIdx = 0;
brush.addEventListener("click", () => {
  paintIdx = (paintIdx + 1) % paints.length;
  brushColor = paints[paintIdx];
  brushIdx   = paintIdx;
  const col  = paints[paintIdx];
  const tip  = $("#tip"), tipGlow = $("#tipGlow");
  if (tip)     tip.setAttribute("fill", col);
  if (tipGlow) tipGlow.setAttribute("fill", col);
  if (!calm && typeof gsap !== "undefined") {
    gsap.fromTo(brush,
      { rotate: "-38deg" },
      { rotate: "-30deg", duration: .4, ease: "elastic.out(1.2,.5)", transformOrigin: "3% 50%" }
    );
  }
  if (!calm) burstConfetti(10,
    brush.getBoundingClientRect().left,
    brush.getBoundingClientRect().top + 40
  );
  say("Brush ne naya rang uthaya 🎨");
});

// ── Dab hover glow — GSAP ────────────────────────────────────
if (!calm && typeof gsap !== "undefined") {
  $$(".dab").forEach(dab => {
    dab.addEventListener("mouseenter", () => gsap.to(dab, { scale:1.14, duration:.22, ease:"back.out(2)" }));
    dab.addEventListener("mouseleave", () => gsap.to(dab, { scale:1,    duration:.28, ease:"power2.out" }));
  });
}

// ── Quest card hover — mini confetti ─────────────────────────
if (!calm) {
  $$(".quest-card:not(.locked)").forEach(card => {
    card.addEventListener("mouseenter", () => {
      const b = card.getBoundingClientRect();
      burstConfetti(6, b.left + b.width/2, b.top + b.height/2);
    });
  });
}

// ── PWA install ───────────────────────────────────────────────
const ib = $("#installBtn"); let deferred;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; ib.hidden = false; });
ib.addEventListener("click", async () => { deferred.prompt(); await deferred.userChoice; ib.hidden = true; deferred = null; });
addEventListener("appinstalled", () => ib.hidden = true);
if ("serviceWorker" in navigator)
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));