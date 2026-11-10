// ============================================================
//  BRUSHSTROKES — bs.js  v4.0  PREMIUM EDITION
//  Living Gallery + Paint Quest + Art Carnival
// ============================================================

// ── Firebase (CDN modules) ───────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  initializeAuth, inMemoryPersistence, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, writeBatch, updateDoc, serverTimestamp,
  collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ── Student data ─────────────────────────────────────────────
// Filled from Firestore after login (see the LOGIN section at the bottom).
function applyStudent(s) {
  const name = String(s.name || "").trim();
  $("#name").textContent    = name;
  $("#course").textContent  = s.course || "";
  $("#roll").textContent    = s.year ? `${s.year} Year` : "";
  $("#college").textContent = s.college || "Ramanujan College";
  const av = $("#avatar");
  av.textContent = "";
  if (s.photo) {
    const img = document.createElement("img");
    img.src = s.photo; img.alt = name;
    av.appendChild(img);
  } else {
    av.textContent = name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }
}

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

// (opening confetti burst now plays after login)

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
//  GSAP ORCHESTRATED ENTRY — Living Gallery curtain effect (plays after login)
// ════════════════════════════════════════════════════════════
function playEntry() {
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
}

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
    const page = a.dataset.page;
    if (page === "home" || page === "activity") {
      if (page === currentPage()) return say(page === "home" ? "Aap Home par hi ho 🏠" : "Aap Activity page par hi ho 🎨");
      const pb = a.getBoundingClientRect();
      if (!calm) burstConfetti(14, pb.left + pb.width / 2, pb.top + pb.height / 2);
      showPage(page);
      return;
    }
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

// ════════════════════════════════════════════════════════════
//  LOGIN · CREATE ACCOUNT · FORGOT PASSWORD  (Firebase)
//  Project: brushstrokes-student (separate from the admin project)
//  Create Account opens first. Full name is case-insensitive.
//  Forgot password = security question (answer unlocks the saved
//  password copy, then a new password is set).
// ════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyATW9btDBBsJg32Qcj84yEU34l1OzX5G_Q",
  authDomain: "brushstrokes-student.firebaseapp.com",
  projectId: "brushstrokes-student",
  storageBucket: "brushstrokes-student.firebasestorage.app",
  messagingSenderId: "140790604149",
  appId: "1:140790604149:web:18dc0eaf59d9672ce8333c"
};
const fbApp = initializeApp(firebaseConfig);
// in-memory session: nothing is stored, so every reload / reopen asks for login again
const auth = initializeAuth(fbApp, { persistence: inMemoryPersistence });
const db = getFirestore(fbApp);

const A = id => document.getElementById(id);
const htmlEl = document.documentElement;

// ── name / answer helpers ────────────────────────────────────
// NOTE: the admin app must use the SAME normalizeName + nameHash when it
// publishes attendance_summary/{nameHash}.
const EMAIL_DOMAIN = "students.brushstrokes.app";
const YEARS = ["1st", "2nd", "3rd", "4th"];
const QUESTIONS = [
  { id: "school",  text: "What was the name of your first school?" },
  { id: "city",    text: "In which city were you born?" },
  { id: "pet",     text: "What was the name of your first pet?" },
  { id: "friend",  text: "What is the name of your childhood best friend?" },
  { id: "teacher", text: "What is the name of your favourite teacher?" },
  { id: "dish",    text: "What is your favourite food?" }
];
const COURSES = [
  "B.A. (Hons.) Applied Psychology",
  "B.A. (Hons.) Economics",
  "B.A. (Hons.) English",
  "B.A. (Hons.) Hindi",
  "B.A. (Hons.) Philosophy",
  "B.A. (Hons.) Political Science",
  "B.A. Programme (Commerce + Economics)",
  "B.A. Programme (Commerce + Mathematics)",
  "B.A. Programme (Economics + Psychology)",
  "B.A. Programme (Hindi + History)",
  "B.A. Programme (Hindi + Political Science)",
  "B.A. Programme (History + Philosophy)",
  "B.A. Programme (History + Political Science)",
  "B.A. Programme (Philosophy + Political Science)",
  "B.A. Programme (Political Science + Psychology)",
  "B.Com.",
  "B.Com. (Hons.)",
  "B.Sc. (Hons.) Computer Science",
  "B.Sc. (Hons.) Environmental Sciences",
  "B.Sc. (Hons.) Mathematics",
  "B.Sc. (Hons.) Statistics",
  "B.Voc. Banking, Financial Services and Insurance",
  "B.Voc. Software Development",
  "Bachelor of Management Studies (BMS)"
];
const PBKDF2_ITERATIONS = 250000;
const enc = new TextEncoder();

// "  SAGAR   Sharma " -> "sagar sharma"
const normalizeName = n => String(n || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const normalizeAnswer = a => String(a || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const tidy = s => String(s || "").normalize("NFKC").trim().replace(/\s+/g, " ");

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
// 40 hex chars: Firestore doc id (recovery, attendance_summary) and the
// local part of the internal Firebase email.
const nameHash = async n => (await sha256Hex(normalizeName(n))).slice(0, 40);
const emailFromHash = h => `${h}@${EMAIL_DOMAIN}`;

const toB64 = bytes => btoa(String.fromCharCode(...bytes));
const fromB64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));

async function deriveKey(answer, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", enc.encode(normalizeAnswer(answer)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
// Password encrypted with a key made from the security answer.
async function encryptPassword(password, answer, hash) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(answer, salt, PBKDF2_ITERATIONS);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(hash) }, key, enc.encode(password)
  ));
  return { salt: toB64(salt), iv: toB64(iv), cipher: toB64(cipher), iter: PBKDF2_ITERATIONS };
}
// Returns the password, or null when the answer is wrong.
async function decryptPassword(rec, answer, hash) {
  try {
    const key = await deriveKey(answer, fromB64(rec.salt), rec.iter || PBKDF2_ITERATIONS);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(rec.iv), additionalData: enc.encode(hash) }, key, fromB64(rec.cipher)
    );
    return new TextDecoder().decode(plain);
  } catch { return null; }
}

// ── screens: auth-pending -> auth-out (login screen) / auth-in (app) ──
let appShown = false;
function showApp() {
  htmlEl.classList.remove("auth-pending", "auth-out");
  htmlEl.classList.add("auth-in");
  routeFromHash();
  ["lgName", "lgPass"].forEach(id => { A(id).value = ""; });
  if (!appShown) {
    appShown = true;
    playEntry();
    if (!calm) setTimeout(() => burstConfetti(35), 600);
  }
}
function showAuth() {
  htmlEl.classList.remove("auth-pending", "auth-in");
  htmlEl.classList.add("auth-out");
  appShown = false;
  if (!auView) auGo(hasAccount() ? "login" : "signup", false);
}
function hasAccount() {
  try { return localStorage.getItem("bsHasAccount") === "1"; } catch (_) { return false; }
}

// ── views ────────────────────────────────────────────────────
const AU_VIEWS = {
  signup: "signupForm", login: "loginForm",
  forgot: "fgNameForm", forgot2: "fgAnswerForm", forgot3: "fgNewForm"
};
let auView = "";
let auBusy = false;          // true while a flow signs in/out on purpose

async function auGo(view, focus = true) {
  // leaving the "new password" step while signed in -> sign out again
  if (auView === "forgot3" && auth.currentUser) {
    auBusy = true;
    try { await signOut(auth); } catch (e) { console.error(e); }
    auBusy = false;
  }
  if (view !== "forgot2" && view !== "forgot3") auResetForgot();
  auView = view;
  Object.entries(AU_VIEWS).forEach(([key, id]) => { A(id).hidden = key !== view; });
  if (focus) {
    const first = A(AU_VIEWS[view]).querySelector("input:not([type=radio]), select");
    if (first) first.focus({ preventScroll: true });
  }
}

A("authScreen").addEventListener("click", e => {
  const btn = e.target.closest("[data-go]");
  if (btn) { e.preventDefault(); auGo(btn.dataset.go); }
  const tog = e.target.closest(".au-pwt");
  if (tog) {
    const input = A(tog.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    tog.classList.toggle("is-shown", show);
    tog.setAttribute("aria-label", show ? "Hide password" : "Show password");
    tog.setAttribute("aria-pressed", String(show));
  }
});

function auMsg(el, text, kind = "error") {
  el.textContent = text;
  el.className = `au-msg ${kind}`;
  el.hidden = !text;
}
function auLoading(btn, on, label) {
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  btn.disabled = on;
}
function auFriendly(err) {
  const code = (err && err.code) || "";
  console.error("Auth error:", err);
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this name already exists. Log in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Name or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
    case "unavailable":
    case "failed-precondition":
      return "No internet connection. Check your network and try again.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is switched off in Firebase Authentication.";
    case "auth/requires-recent-login":
      return "Session expired. Start the password reset again.";
    case "permission-denied":
      return "Could not save to the database. Check that the Firestore rules are published.";
    default:
      return "Something went wrong. Please try again.";
  }
}

QUESTIONS.forEach(q => {
  const o = document.createElement("option");
  o.value = q.id; o.textContent = q.text;
  A("suQ").appendChild(o);
});

// ── course dropdown with search ──────────────────────────────
// Typing filters the list ("bsc comp" finds B.Sc. (Hons.) Computer Science).
// Only a course from the list is accepted.
const courseKey = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
const courseFind = text => COURSES.find(c => courseKey(c) === courseKey(text));
const courseInput = A("suCourse"), courseList = A("suCourseList");
const courseBox = courseInput.closest(".au-combo");
let courseShown = [], courseActive = -1;

function courseSetActive(i) {
  courseActive = i;
  [...courseList.children].forEach((li, n) => li.classList.toggle("is-active", n === i));
  const li = courseList.children[i];
  if (li && li.id) {
    courseInput.setAttribute("aria-activedescendant", li.id);
    li.scrollIntoView({ block: "nearest" });
  } else courseInput.removeAttribute("aria-activedescendant");
}
function courseOpen() {
  const picked = courseFind(courseInput.value);
  const words = picked ? [] : courseKey(courseInput.value).split(" ").filter(Boolean);
  courseShown = COURSES.filter(c => { const k = courseKey(c); return words.every(w => k.includes(w)); });
  courseList.textContent = "";
  if (!courseShown.length) {
    const li = document.createElement("li");
    li.className = "au-opt none"; li.textContent = "No matching course";
    courseList.appendChild(li);
  } else {
    courseShown.forEach((c, i) => {
      const li = document.createElement("li");
      li.id = `suCourseOpt${i}`; li.className = "au-opt"; li.dataset.i = i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(c === picked));
      li.textContent = c;
      courseList.appendChild(li);
    });
  }
  courseList.hidden = false;
  courseInput.setAttribute("aria-expanded", "true");
  courseSetActive(courseShown.length ? Math.max(0, courseShown.indexOf(picked)) : -1);
}
function courseClose() {
  courseList.hidden = true;
  courseInput.setAttribute("aria-expanded", "false");
  courseInput.removeAttribute("aria-activedescendant");
  courseActive = -1;
}
function courseChoose(i) {
  if (!courseShown[i]) return;
  courseInput.value = courseShown[i];
  courseClose();
}
courseInput.addEventListener("focus", courseOpen);
courseInput.addEventListener("click", () => { if (courseList.hidden) courseOpen(); });
courseInput.addEventListener("input", courseOpen);
courseInput.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (courseList.hidden) { courseOpen(); return; }
    if (!courseShown.length) return;
    const step = e.key === "ArrowDown" ? 1 : -1;
    courseSetActive((courseActive + step + courseShown.length) % courseShown.length);
  } else if (e.key === "Enter" && !courseList.hidden && courseActive >= 0) {
    e.preventDefault();
    courseChoose(courseActive);
  } else if (e.key === "Escape" && !courseList.hidden) {
    e.preventDefault(); e.stopPropagation();
    courseClose();
  } else if (e.key === "Tab") {
    courseClose();
  }
});
courseList.addEventListener("mousedown", e => e.preventDefault());   // keep focus in the input
courseList.addEventListener("click", e => {
  const li = e.target.closest(".au-opt[data-i]");
  if (li) courseChoose(Number(li.dataset.i));
});
courseBox.querySelector(".au-caret").addEventListener("mousedown", e => e.preventDefault());
courseBox.querySelector(".au-caret").addEventListener("click", () => {
  if (courseList.hidden) { courseInput.focus(); courseOpen(); } else courseClose();
});
courseBox.addEventListener("focusout", e => { if (!courseBox.contains(e.relatedTarget)) courseClose(); });

// ── create account ───────────────────────────────────────────
const NAME_RE = /^\p{L}[\p{L}\p{M} .'-]{1,59}$/u;

A("signupForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = A("suMsg"), btn = A("suBtn");
  auMsg(msg, "");

  const fullName = tidy(A("suName").value);
  const course = courseFind(A("suCourse").value);
  const year = A("suYear").value;
  const password = A("suPass").value;
  const questionId = A("suQ").value;
  const answer = tidy(A("suA").value);

  if (!NAME_RE.test(fullName)) return auMsg(msg, "Enter your full name using letters only.");
  if (!course) return auMsg(msg, "Choose your course from the list.");
  if (!YEARS.includes(year)) return auMsg(msg, "Choose your year.");
  if (password.length < 6) return auMsg(msg, "Password must be at least 6 characters.");
  if (!QUESTIONS.some(q => q.id === questionId)) return auMsg(msg, "Choose a security question.");
  if (answer.length < 4) return auMsg(msg, "Your answer needs at least 4 characters.");

  auBusy = true;
  auLoading(btn, true, "Creating account…");
  let created = null;
  try {
    const hash = await nameHash(fullName);
    const cred = await createUserWithEmailAndPassword(auth, emailFromHash(hash), password);
    created = cred.user;

    const recovery = await encryptPassword(password, answer, hash);
    const batch = writeBatch(db);
    // status:"pending" and nameMatchVerified:false are enforced by Firestore rules
    // (the rule rejects any create where these are not exactly these values).
    batch.set(doc(db, "users", created.uid), {
      fullName, normName: normalizeName(fullName), nameHash: hash,
      course, year, createdAt: serverTimestamp(),
      status: "pending",
      role: "student",
      nameMatchVerified: false
    });
    batch.set(doc(db, "recovery", hash), {
      uid: created.uid, questionId, ...recovery, createdAt: serverTimestamp()
    });
    // Write pending approval request so admin can see it on the dashboard.
    batch.set(doc(db, "pending_approvals", created.uid), {
      uid: created.uid,
      fullName,
      normName: normalizeName(fullName),
      nameHash: hash,
      course,
      year,
      submittedAt: serverTimestamp(),
      status: "pending"
    });
    await batch.commit();

    await signOut(auth);
    created = null;
    try { localStorage.setItem("bsHasAccount", "1"); } catch (_) {}

    A("signupForm").reset();
    courseClose();
    await auGo("login");
    A("lgName").value = fullName;
    A("lgPass").focus();
    auMsg(A("lgMsg"), "Account created! Waiting for admin approval before you can log in.", "ok");
  } catch (err) {
    // never leave a half-made account behind
    if (created) { try { await created.delete(); } catch (_) {} }
    auMsg(msg, auFriendly(err));
  } finally {
    auBusy = false;
    auLoading(btn, false);
  }
});

// ── login ────────────────────────────────────────────────────
A("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = A("lgMsg"), btn = A("lgBtn");
  auMsg(msg, "");

  const name = tidy(A("lgName").value);
  const password = A("lgPass").value;
  if (!name) return auMsg(msg, "Enter your full name.");
  if (!password) return auMsg(msg, "Enter your password.");

  auLoading(btn, true, "Logging in…");
  try {
    const hash = await nameHash(name);
    await signInWithEmailAndPassword(auth, emailFromHash(hash), password);
    try { localStorage.setItem("bsHasAccount", "1"); } catch (_) {}
    // onAuthStateChanged below opens the app
  } catch (err) {
    auMsg(msg, auFriendly(err));
  } finally {
    auLoading(btn, false);
  }
});

// ── forgot password ──────────────────────────────────────────
// 1) name -> load recovery doc  2) answer -> unlock saved password, sign in
// 3) new password -> updatePassword + re-encrypt the recovery copy
let auFg = null;                 // { hash, rec, answer }
let auWrong = 0, auLockUntil = 0;

function auResetForgot() {
  auFg = null; auWrong = 0; auLockUntil = 0;
  ["fgName", "fgAnswer", "fgNewPass"].forEach(id => { A(id).value = ""; });
  ["fgNameMsg", "fgAnswerMsg", "fgNewMsg"].forEach(id => auMsg(A(id), ""));
}

A("fgNameForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = A("fgNameMsg"), btn = A("fgNameBtn");
  auMsg(msg, "");
  const name = tidy(A("fgName").value);
  if (!name) return auMsg(msg, "Enter your full name.");

  auLoading(btn, true, "Looking up…");
  try {
    const hash = await nameHash(name);
    const snap = await getDoc(doc(db, "recovery", hash));
    if (!snap.exists()) {
      auMsg(msg, "No account with a security question found for this name.");
      return;
    }
    const rec = snap.data();
    const q = QUESTIONS.find(x => x.id === rec.questionId);
    auFg = { hash, rec, answer: "" };
    A("fgQuestion").textContent = q ? q.text : "Security question";
    await auGo("forgot2");
  } catch (err) {
    auMsg(msg, auFriendly(err));
  } finally {
    auLoading(btn, false);
  }
});

A("fgAnswerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = A("fgAnswerMsg"), btn = A("fgAnswerBtn");
  auMsg(msg, "");
  if (!auFg) return auGo("forgot");

  const now = Date.now();
  if (now < auLockUntil) {
    return auMsg(msg, `Too many wrong answers. Try again in ${Math.ceil((auLockUntil - now) / 1000)} seconds.`);
  }
  const answer = tidy(A("fgAnswer").value);
  if (!answer) return auMsg(msg, "Enter your answer.");

  auBusy = true;
  auLoading(btn, true, "Checking…");
  try {
    const oldPassword = await decryptPassword(auFg.rec, answer, auFg.hash);
    if (oldPassword === null) {
      auWrong += 1;
      if (auWrong >= 5) { auLockUntil = Date.now() + 60000; auWrong = 0; }
      auBusy = false;
      return auMsg(msg, "That answer doesn't match.");
    }
    // proves ownership: sign in with the recovered password
    await signInWithEmailAndPassword(auth, emailFromHash(auFg.hash), oldPassword);
    auFg.answer = answer;
    auFg.rec = null;
    auWrong = 0;
    await auGo("forgot3");        // auBusy stays true until step 3 ends
  } catch (err) {
    auBusy = false;
    const code = err && err.code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      auMsg(msg, "Your saved recovery data is out of date. Contact the Brushstrokes admin.");
    } else {
      auMsg(msg, auFriendly(err));
    }
  } finally {
    auLoading(btn, false);
  }
});

A("fgNewForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = A("fgNewMsg"), btn = A("fgNewBtn");
  auMsg(msg, "");
  const user = auth.currentUser;
  if (!user || !auFg) return auGo("forgot");

  const newPassword = A("fgNewPass").value;
  if (newPassword.length < 6) return auMsg(msg, "Password must be at least 6 characters.");

  auLoading(btn, true, "Saving…");
  try {
    await updatePassword(user, newPassword);
  } catch (err) {
    auMsg(msg, auFriendly(err));
    auLoading(btn, false);
    return;
  }

  let note = "Password updated. Log in with your new password.";
  let kind = "ok";
  try {
    // keep the recovery copy in sync with the new password
    const fresh = await encryptPassword(newPassword, auFg.answer, auFg.hash);
    await updateDoc(doc(db, "recovery", auFg.hash), { ...fresh, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error("Recovery update failed", err);
    note = "Password updated, but the recovery copy could not be refreshed, so Forgot password may not work next time.";
    kind = "error";
  }

  const typedName = A("fgName").value;
  try { await signOut(auth); } catch (_) {}
  auBusy = false;
  auLoading(btn, false);
  await auGo("login");
  A("lgName").value = typedName;
  auMsg(A("lgMsg"), note, kind);
});

// ── start ────────────────────────────────────────────────────
// Whole app stays hidden (auth-pending) until Firebase answers.
// First visit on a device -> Create Account; every visit after -> Login.
auGo(hasAccount() ? "login" : "signup", false);

const auFailSafe = setTimeout(() => {
  if (htmlEl.classList.contains("auth-pending")) {
    showAuth();
    auMsg(A("lgMsg"), "Can't reach the server. Check your connection and refresh.");
    auGo("login", false);
  }
}, 12000);

let auToken = 0;
onAuthStateChanged(auth, async user => {
  clearTimeout(auFailSafe);
  if (auBusy) return;               // a flow above is signing in/out on purpose
  const token = ++auToken;
  if (!user) { actStop(); showAuth(); return; }

  let p = {};
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) p = snap.data();
  } catch (err) {
    console.error("Could not load profile", err);
  }
  if (token !== auToken || auBusy) return;

  // ── Approval gate ──────────────────────────────────────────
  // Admin account (hardcoded UID) is always allowed through.
  const STUDENT_ADMIN_UID = "25Tcm6EsmDSwrznOhNwZaLMV0zg1";
  const isAdminUser = user.uid === STUDENT_ADMIN_UID;

  if (!isAdminUser) {
    if (!p.status || p.status === "pending") {
      // Show pending screen — do NOT call showApp()
      auBusy = true;
      await signOut(auth);
      auBusy = false;
      htmlEl.classList.remove("auth-pending", "auth-in");
      htmlEl.classList.add("auth-out");
      auGo("login", false);
      // Show pending message on the login form
      auMsg(A("lgMsg"),
        "⏳ Your account is pending admin approval. You will be notified once approved.",
        "ok");
      return;
    }
    if (p.status === "rejected") {
      auBusy = true;
      await signOut(auth);
      auBusy = false;
      htmlEl.classList.remove("auth-pending", "auth-in");
      htmlEl.classList.add("auth-out");
      auGo("login", false);
      auMsg(A("lgMsg"),
        "❌ Your registration was not approved. Please contact the Brushstrokes admin.",
        "error");
      return;
    }
    // status === "approved" — fall through to show app
  }
  // ── End approval gate ──────────────────────────────────────

  applyStudent({ name: p.fullName || "Student", course: p.course || "", year: p.year || "" });
  actStart(user, p.fullName || "Student");
  showApp();
});

// ════════════════════════════════════════════════════════════
//  PAGES + ACTIVITY
//  The Activity page opens inside this same page (no reload), so the
//  in-memory login session is kept. The palette moves with you.
//  Data: Firestore collection "activities" in the student project.
//  The Brushstroke admin app reads the same collection live
//  (admin side: student-activities.js).
// ════════════════════════════════════════════════════════════
const mainArea = $("#mainArea");
const currentPage = () => (mainArea.dataset.view === "activity" ? "activity" : "home");

function showPage(page, push = true) {
  const toAct = page === "activity";
  mainArea.dataset.view = toAct ? "activity" : "home";
  $("#activityPage").hidden = !toAct;
  (toAct ? $("#slotActivity") : $("#slotHome")).appendChild($("#stage"));
  $$(".dab").forEach(d => {
    if (d.dataset.page === page) d.setAttribute("aria-current", "page");
    else d.removeAttribute("aria-current");
  });
  const want = toAct ? "#activity" : "";
  if (push && location.hash !== want) {
    history.pushState(null, "", location.pathname + location.search + want);
  }
  window.scrollTo(0, 0);
}
function routeFromHash() { showPage(location.hash === "#activity" ? "activity" : "home", false); }
const onRoute = () => { if (htmlEl.classList.contains("auth-in")) routeFromHash(); };
window.addEventListener("hashchange", onRoute);
window.addEventListener("popstate", onRoute);

// ── helpers ──────────────────────────────────────────────────
const ACT_MAX_SHOTS = 3;
const ACT_SHOT_CHARS = 220000;          // ~165 KB per image, 3 fit easily in a 1 MiB document
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const pad2 = n => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function actDateParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return { day: "--", mon: "" };
  return { day: m[3], mon: `${MONTHS[+m[2] - 1] || ""} ${m[1]}` };
}
const actTimeout = (p, ms = 20000) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "timeout" })), ms))
]);
function actMsg(text, kind = "error") {
  const m = A("actMsg");
  m.textContent = text; m.className = `act-msg ${kind}`; m.hidden = !text;
}
const isShot = s => typeof s === "string" && /^data:image\//.test(s);

// ── state ────────────────────────────────────────────────────
let actUid = "", actHash = "", actStudent = "";
let actUnsub = null, actItems = [];
let actEditId = null, actConfirmId = null, actNewRef = null;
let actShots = [];                      // screenshots currently in the form (data URLs)
let actBusy = false;

// ── image -> small JPEG data URL ─────────────────────────────
async function actCompress(file) {
  if (!file.type || !file.type.startsWith("image/")) throw new Error("not-image");
  if (file.size > 25 * 1024 * 1024) throw new Error("too-big");
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch {
    bmp = await new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); res(im); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("decode")); };
      im.src = url;
    });
  }
  const w0 = bmp.width, h0 = bmp.height;
  let scale = Math.min(1, 1280 / Math.max(w0, h0)), quality = 0.78;
  const canvas = document.createElement("canvas");
  try {
    for (let i = 0; i < 12; i++) {
      canvas.width = Math.max(1, Math.round(w0 * scale));
      canvas.height = Math.max(1, Math.round(h0 * scale));
      const c = canvas.getContext("2d");
      c.fillStyle = "#fff"; c.fillRect(0, 0, canvas.width, canvas.height);   // PNG transparency -> white
      c.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= ACT_SHOT_CHARS) return url;
      if (quality > 0.5) quality -= 0.1; else scale *= 0.8;
    }
  } finally { if (bmp.close) bmp.close(); }
  throw new Error("too-big");
}

// ── form: screenshots ────────────────────────────────────────
function actRenderShots() {
  const box = A("actShots");
  box.textContent = "";
  actShots.forEach((src, i) => {
    const w = mk("div", "act-shot");
    const img = new Image(); img.src = src; img.alt = `Screenshot ${i + 1}`;
    const x = mk("button", "act-shot-x", "×");
    x.type = "button"; x.setAttribute("aria-label", `Remove screenshot ${i + 1}`);
    x.addEventListener("click", () => { actShots.splice(i, 1); actRenderShots(); });
    w.append(img, x); box.appendChild(w);
  });
  A("actUpload").hidden = actShots.length >= ACT_MAX_SHOTS;
  A("actShotHint").textContent = actShots.length >= ACT_MAX_SHOTS
    ? "3 of 3 added. Remove one to add a different screenshot."
    : `${actShots.length} of ${ACT_MAX_SHOTS} added. Large photos are shrunk automatically.`;
}

A("actFile").addEventListener("change", async e => {
  const files = [...e.target.files];
  e.target.value = "";
  if (!files.length) return;
  const room = ACT_MAX_SHOTS - actShots.length;
  if (room <= 0) return actMsg(`You can add up to ${ACT_MAX_SHOTS} screenshots. Remove one first.`);
  actBusy = true; A("actSubmit").disabled = true;
  actMsg("Processing image…", "ok");
  let skipped = files.length > room;
  try {
    for (const f of files.slice(0, room)) {
      actShots.push(await actCompress(f));
      actRenderShots();
    }
    actMsg(skipped ? `Only ${ACT_MAX_SHOTS} screenshots are allowed — extra files were skipped.` : "", "error");
  } catch (err) {
    actMsg(err.message === "not-image" ? "Please choose an image file (JPG or PNG)."
      : err.message === "too-big" ? "That image is too large. Try a smaller screenshot."
      : "Couldn't read that image. Use a JPG or PNG screenshot.");
  } finally {
    actBusy = false; A("actSubmit").disabled = false;
  }
});

// ── form: reset / edit / cancel ──────────────────────────────
function actReset() {
  actEditId = null; actShots = [];
  A("actForm").reset();
  A("actDate").max = todayISO();
  actNewRef = doc(collection(db, "activities"));       // fixed id: a retry can never create a duplicate
  A("actFormTitle").textContent = "Add an event";
  A("actSubmit").textContent = "Add event";
  A("actCancel").hidden = true;
  actMsg("");
  actRenderShots();
  actRender();
}
function actEdit(id) {
  const it = actItems.find(x => x.id === id);
  if (!it) return;
  actEditId = id; actConfirmId = null;
  A("actDate").max = todayISO();
  A("actDate").value = it.eventDate || "";
  A("actEvent").value = it.eventName || "";
  A("actMode").value = it.mode || "";
  A("actCollege").value = it.college || "";
  actShots = (it.shots || []).filter(isShot).slice(0, ACT_MAX_SHOTS);
  A("actFormTitle").textContent = "Edit event";
  A("actSubmit").textContent = "Save changes";
  A("actCancel").hidden = false;
  actMsg(""); actRenderShots(); actRender();
  A("actForm").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  A("actEvent").focus({ preventScroll: true });
}
A("actCancel").addEventListener("click", actReset);

// ── form: save (add or edit) ─────────────────────────────────
A("actForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (actBusy || !actUid) return;
  actMsg("");
  const eventDate = A("actDate").value;
  const eventName = tidy(A("actEvent").value);
  const mode = A("actMode").value;
  const college = tidy(A("actCollege").value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || isNaN(Date.parse(eventDate))) return actMsg("Pick the event date from the calendar.");
  if (eventDate > todayISO()) return actMsg("The event date can't be in the future.");
  if (eventName.length < 2) return actMsg("Enter the event name.");
  if (mode !== "Online" && mode !== "Offline") return actMsg("Choose Online or Offline.");
  if (college.length < 2) return actMsg("Enter the college name.");
  if (!actShots.length) return actMsg("Add at least one screenshot as proof.");

  const btn = A("actSubmit");
  actBusy = true; btn.disabled = true;
  btn.textContent = actEditId ? "Saving…" : "Adding…";
  const editing = actEditId;
  try {
    const data = { eventDate, eventName, mode, college, shots: [...actShots], updatedAt: serverTimestamp() };
    if (editing) {
      await actTimeout(updateDoc(doc(db, "activities", editing), data));
    } else {
      await actTimeout(setDoc(actNewRef, {
        ...data, uid: actUid, nameHash: actHash, studentName: actStudent, createdAt: serverTimestamp()
      }));
    }
    say(editing ? "Event updated ✅" : "Event added 🎨");
    actReset();
  } catch (err) {
    console.error("Activity save failed", err);
    const code = err && err.code;
    if (code === "not-found") { actMsg("This event no longer exists."); actReset(); }
    else actMsg(code === "permission-denied" ? "Couldn't save. Check that the Firestore rules are published."
      : code === "timeout" ? "Saving is taking too long. Check your connection and try again."
      : "Couldn't save. Please try again.");
  } finally {
    actBusy = false; btn.disabled = false;
    btn.textContent = actEditId ? "Save changes" : "Add event";
  }
});

// ── delete ───────────────────────────────────────────────────
async function actDelete(id) {
  actConfirmId = null;
  try {
    await actTimeout(deleteDoc(doc(db, "activities", id)));
    if (actEditId === id) actReset();
    say("Event deleted 🗑️");
  } catch (err) {
    console.error("Activity delete failed", err);
    say("Couldn't delete. Please try again.");
    actRender();
  }
}

// ── list ─────────────────────────────────────────────────────
function actBtn(label, cls, onClick) {
  const b = mk("button", `act-btn small ${cls}`, label);
  b.type = "button"; b.addEventListener("click", onClick);
  return b;
}
function actRender() {
  const list = A("actList");
  list.textContent = "";
  const ts = x => (x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now());
  const items = [...actItems].sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || "") || ts(b) - ts(a));
  A("actCount").textContent = items.length ? `${items.length} event${items.length === 1 ? "" : "s"}` : "";
  if (!items.length) {
    list.appendChild(mk("p", "act-empty", "No events added yet. Add your first one above."));
    return;
  }
  items.forEach(it => {
    const card = mk("article", "act-item" + (it.id === actEditId ? " is-editing" : ""));
    card.dataset.id = it.id;

    const top = mk("div", "act-item-top");
    const dt = actDateParts(it.eventDate);
    const chip = mk("div", "act-date");
    chip.append(mk("span", "d", dt.day), mk("span", "m", dt.mon));
    const info = mk("div", "act-info");
    info.appendChild(mk("h4", "", it.eventName || ""));
    const meta = mk("p", "act-meta");
    meta.append(mk("span", "act-pill " + (it.mode === "Online" ? "online" : "offline"), it.mode || ""),
                mk("span", "act-college", it.college || ""));
    info.appendChild(meta);
    top.append(chip, info);
    card.appendChild(top);

    const thumbs = mk("div", "act-thumbs");
    (it.shots || []).filter(isShot).forEach((src, i) => {
      const b = mk("button", "act-thumb");
      b.type = "button"; b.setAttribute("aria-label", `View screenshot ${i + 1} of ${it.eventName}`);
      const img = new Image(); img.src = src; img.alt = ""; img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", () => actOpenLightbox(src));
      thumbs.appendChild(b);
    });
    card.appendChild(thumbs);

    const acts = mk("div", "act-item-actions");
    if (actConfirmId === it.id) {
      acts.append(
        mk("span", "act-confirm", "Delete this event?"),
        actBtn("Yes, delete", "danger", () => actDelete(it.id)),
        actBtn("Keep it", "ghost", () => { actConfirmId = null; actRender(); })
      );
    } else {
      acts.append(
        actBtn("Edit", "primary", () => actEdit(it.id)),
        actBtn("Delete", "ghost", () => { actConfirmId = it.id; actRender(); })
      );
    }
    card.appendChild(acts);
    list.appendChild(card);
  });
}

// ── full-size screenshot viewer ──────────────────────────────
function actOpenLightbox(src) {
  A("actLbImg").src = src;
  A("actLightbox").hidden = false;
  A("actLbClose").focus();
}
function actCloseLightbox() { A("actLightbox").hidden = true; A("actLbImg").removeAttribute("src"); }
A("actLbClose").addEventListener("click", actCloseLightbox);
A("actLightbox").addEventListener("click", e => { if (e.target === A("actLightbox")) actCloseLightbox(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !A("actLightbox").hidden) actCloseLightbox(); });

// ── live data (starts after login, stops on logout) ──────────
function actStart(user, name) {
  A("actName").textContent = name;
  if (actUid === user.uid && actUnsub) return;
  actStop();
  actUid = user.uid;
  actHash = String(user.email || "").split("@")[0];      // = nameHash, also what the rules check
  actStudent = name;
  actReset();
  const q = query(collection(db, "activities"), where("uid", "==", user.uid));
  actUnsub = onSnapshot(q, snap => {
    actItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (actEditId && !actItems.some(i => i.id === actEditId)) {
      actReset();
      actMsg("That event was deleted, so editing was cancelled.");
    }
    actRender();
  }, err => {
    console.error("Activities listener failed", err);
    A("actList").textContent = "";
    A("actList").appendChild(mk("p", "act-empty",
      "Couldn't load your events. Check your connection and that the Firestore rules are published."));
  });
}
function actStop() {
  if (actUnsub) actUnsub();
  actUnsub = null; actUid = ""; actItems = []; actEditId = null; actConfirmId = null; actShots = [];
  A("actList").textContent = "";
  actCloseLightbox();
}