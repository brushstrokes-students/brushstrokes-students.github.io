// ============================================================
//  BRUSHSTROKES — bs.js  v3.0
//  GSAP for orchestrated entry animations
//  Enhanced brush, palette tilt, splash navigation
// ============================================================

// ── Student data ────────────────────────────────────────────
const student = {
  name:    "Student Name",
  course:  "Your Course",
  roll:    "Roll Number",
  college: "Ramanujan College",
  photo:   ""   // paste photo URL here; leave empty for initials
};

const $ = s => document.querySelector(s);

$("#name").textContent   = student.name;
$("#course").textContent = student.course;
$("#roll").textContent   = student.roll;
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
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// ── Dark mode (no flash) ─────────────────────────────────────
const root = document.documentElement, tbtn = $("#themeToggle");

function setTheme(t, animate) {
  root.dataset.theme = t;
  tbtn.firstElementChild.textContent = t === "dark" ? "☀️" : "🌙";
  if (animate) root.offsetHeight; // force reflow for mobile
}

let saved = "light";
try {
  saved = localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch(e) {}

setTheme(saved, false);

requestAnimationFrame(() => requestAnimationFrame(() => {
  document.body.classList.add("theme-ready");
}));

tbtn.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next, true);
  try { localStorage.setItem("theme", next); } catch(e) {}
});

// ── Reduced motion check ─────────────────────────────────────
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── GSAP orchestrated page-load animation ───────────────────
// GSAP loaded via CDN in index.html
window.addEventListener("load", () => {
  if (calm || typeof gsap === "undefined") return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Header fades down
  tl.from(".top", { y: -30, opacity: 0, duration: .6 })

  // Easel swings up from below
  .from(".easel", {
    y: 60, opacity: 0, rotateX: -12,
    duration: .75, ease: "back.out(1.4)"
  }, "-=.2")

  // Board content staggers in
  .from(".avatar-wrap", { scale: 0, opacity: 0, duration: .5, ease: "back.out(2)" }, "-=.3")
  .from(".info h2",     { x: -24, opacity: 0, duration: .45 }, "-=.2")
  .from(".row",         { x: -18, opacity: 0, stagger: .08, duration: .38 }, "-=.2")

  // Palette stage rises
  .from(".stage", {
    y: 50, opacity: 0, scale: .92,
    duration: .7, ease: "back.out(1.3)"
  }, "-=.35")

  // Brush floats in from left
  .from(".brush", {
    x: -40, opacity: 0, rotate: -15,
    duration: .6, ease: "back.out(1.5)"
  }, "-=.4")

  // Footer
  .from("footer", { opacity: 0, duration: .4 }, "-=.1");
});

// ── 3-D palette tilt on pointer ──────────────────────────────
const stage = $("#stage"), pal = $("#palette"), brush = $("#brush"), easel = $("#easel");

if (!calm) {
  // Palette + brush tilt
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

  // Easel card tilt
  easel.addEventListener("pointermove", e => {
    const r = easel.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - .5;
    const y = (e.clientY - r.top)  / r.height - .5;
    easel.style.transform = `perspective(900px) rotateX(${-y*5}deg) rotateY(${x*6}deg)`;
  });
  easel.addEventListener("pointerleave", () => easel.style.transform = "");
}

// ── Splash navigation ────────────────────────────────────────
document.querySelectorAll(".dab").forEach(a => {
  a.addEventListener("click", async e => {
    e.preventDefault();

    if (a.dataset.page === "home") return say("Aap Home par hi ho 🏠");

    const url = a.getAttribute("href");
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (!r.ok) throw 0;
    } catch {
      return say("Ye page abhi bana nahi 🎨");
    }

    // Splash circle
    const b = a.getBoundingClientRect();
    const s = document.createElement("div");
    s.className = "splash";
    s.style.left       = `${b.left + b.width  / 2}px`;
    s.style.top        = `${b.top  + b.height / 2}px`;
    s.style.background = getComputedStyle(a).getPropertyValue("--a");
    document.body.appendChild(s);

    setTimeout(() => location.href = url, calm ? 0 : 500);
  });
});

// ── Brush: click to dip in a new colour ─────────────────────
const paints = ["#e8764f","#4fa45c","#2a78c9","#9a63e0","#f0a020","#c23a62","#20b8a0"];
let paintIdx = 0;

brush.addEventListener("click", () => {
  paintIdx = (paintIdx + 1) % paints.length;
  const col = paints[paintIdx];

  // Update tip fill + glow
  const tip     = $("#tip");
  const tipGlow = $("#tipGlow");
  if (tip)     tip.setAttribute("fill", col);
  if (tipGlow) tipGlow.setAttribute("fill", col);

  // Brief GSAP wobble (graceful fallback if GSAP not ready)
  if (!calm && typeof gsap !== "undefined") {
    gsap.fromTo(brush,
      { rotate: "-38deg" },
      { rotate: "-30deg", duration: .35, ease: "elastic.out(1.2,.5)",
        transformOrigin: "3% 50%" }
    );
  }

  say("Brush ne naya rang uthaya 🎨");
});

// ── Dab hover: GSAP pulse glow ───────────────────────────────
if (!calm && typeof gsap !== "undefined") {
  document.querySelectorAll(".dab").forEach(dab => {
    dab.addEventListener("mouseenter", () => {
      gsap.to(dab, {
        scale: 1.14, duration: .22,
        ease: "back.out(2)"
      });
    });
    dab.addEventListener("mouseleave", () => {
      gsap.to(dab, { scale: 1, duration: .28, ease: "power2.out" });
    });
  });
}

// ── PWA install ──────────────────────────────────────────────
const ib = $("#installBtn"); let deferred;
addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferred = e; ib.hidden = false;
});
ib.addEventListener("click", async () => {
  deferred.prompt();
  await deferred.userChoice;
  ib.hidden = true; deferred = null;
});
addEventListener("appinstalled", () => ib.hidden = true);

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}