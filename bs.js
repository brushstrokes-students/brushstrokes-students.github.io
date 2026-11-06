// ---------- Student data (edit / load from Firebase later) ----------
const student = {
  name: "Student Name",
  course: "Your Course",
  roll: "Roll Number",
  college: "Ramanujan College",
  photo: "" // photo URL daalo to initials ki jagah photo dikhegi
};
const $ = s => document.querySelector(s);
$("#name").textContent = student.name;
$("#course").textContent = student.course;
$("#roll").textContent = student.roll;
$("#college").textContent = student.college;
$("#avatar").innerHTML = student.photo
  ? `<img src="${student.photo}" alt="${student.name}">`
  : student.name.split(" ").map(w => w[0]).join("").slice(0, 2);

// ---------- Toast ----------
const toast = $("#toast"); let tt;
function say(msg){ toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("show"), 2200); }

// ---------- Dark mode (no flicker on mobile) ----------
const root = document.documentElement, tbtn = $("#themeToggle");
function setTheme(t, animate){
  root.dataset.theme = t;
  tbtn.firstElementChild.textContent = t === "dark" ? "☀️" : "🌙";
  if (animate) {
    // force reflow so transition triggers correctly on mobile
    root.offsetHeight; // eslint-disable-line no-unused-expressions
  }
}
let saved = "light";
try { saved = localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch(e){}
// Apply saved theme immediately (no transition — prevents flash)
setTheme(saved, false);
// Enable transitions only after first paint (prevents mobile flicker)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.classList.add("theme-ready");
  });
});
tbtn.addEventListener("click", () => {
  const n = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(n, true);
  try { localStorage.setItem("theme", n); } catch(e){}
});

// ---------- Palette: tilt, brush follow, splash navigation ----------
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const stage = $("#stage"), pal = $("#palette"), brush = $("#brush"), easel = $("#easel");
if (!calm) {
  stage.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    pal.style.transform = `perspective(900px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg)`;
    brush.style.setProperty("--wob", x * 8 + "deg");
  });
  stage.addEventListener("pointerleave", () => { pal.style.transform = ""; brush.style.setProperty("--wob", "0deg"); });
  easel.addEventListener("pointermove", e => {
    const r = easel.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    easel.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`;
  });
  easel.addEventListener("pointerleave", () => easel.style.transform = "");
}

document.querySelectorAll(".dab").forEach(a => a.addEventListener("click", async e => {
  e.preventDefault();
  if (a.dataset.page === "home") return say("Aap Home par hi ho 🏠");
  const url = a.getAttribute("href");
  try { const r = await fetch(url, { method: "HEAD" }); if (!r.ok) throw 0; }
  catch(err){ return say("Ye page abhi bana nahi 🎨"); }
  const b = a.getBoundingClientRect(), s = document.createElement("div");
  s.className = "splash"; s.style.left = b.left + b.width / 2 + "px"; s.style.top = b.top + b.height / 2 + "px";
  s.style.background = getComputedStyle(a).getPropertyValue("--a");
  document.body.appendChild(s);
  setTimeout(() => location.href = url, calm ? 0 : 450);
}));

// ---------- Brush: click to dip in a new colour ----------
const paints = ["#e8764f", "#4fa45c", "#2a78c9", "#9a63e0", "#f0a020", "#c23a62"];
let pi = 0;
brush.addEventListener("click", () => {
  pi = (pi + 1) % paints.length;
  $("#tip").setAttribute("fill", paints[pi]);
  say("Brush ne naya rang uthaya 🎨");
});

// ---------- Install as app (PWA) ----------
const ib = $("#installBtn"); let deferred;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; ib.hidden = false; });
ib.addEventListener("click", async () => { deferred.prompt(); await deferred.userChoice; ib.hidden = true; deferred = null; });
addEventListener("appinstalled", () => ib.hidden = true);
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));