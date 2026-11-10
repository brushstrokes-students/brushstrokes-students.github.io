// bs-auth.js — auth guard for all student pages
// Import this in every page. Checks login + approval status.

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { initializeAuth, inMemoryPersistence, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore, doc, getDoc }
  from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { STUDENT_CONFIG, STUDENT_ADMIN_UID } from "./bs-config.js";

// Init student app (reuse if already initialised by bs.js on index)
const existing = getApps().find(a => a.name === "[DEFAULT]");
export const studentApp = existing || initializeApp(STUDENT_CONFIG);
export const auth = initializeAuth(studentApp, { persistence: inMemoryPersistence });
export const db   = getFirestore(studentApp);

/**
 * guardPage(callbacks)
 *   callbacks.onApproved(user, userData)   — show main content
 *   callbacks.onPending()                  — show pending screen
 *   callbacks.onRejected()                 — show rejected screen
 *   callbacks.onUnverified()               — approved but nameMatchVerified=false (attendance only)
 *   callbacks.onLoggedOut()                — not logged in → redirect
 *
 * Pass onUnverified only for the attendance page.
 */
export function guardPage(callbacks) {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      if (callbacks.onLoggedOut) callbacks.onLoggedOut();
      else location.href = "index.html";
      return;
    }

    // Admin always gets full access
    if (user.uid === STUDENT_ADMIN_UID) {
      let userData = { status: "approved", role: "admin", nameMatchVerified: true };
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) userData = { ...userData, ...snap.data() };
      } catch(_) {}
      if (callbacks.onApproved) callbacks.onApproved(user, userData);
      return;
    }

    // Load user doc
    let userData = {};
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) userData = snap.data();
    } catch(err) {
      console.error("guardPage: could not load user doc", err);
    }

    const status = userData.status || "pending";

    if (status === "pending" || !status) {
      if (callbacks.onPending) callbacks.onPending(userData);
      return;
    }
    if (status === "rejected") {
      if (callbacks.onRejected) callbacks.onRejected(userData);
      return;
    }
    // approved
    if (callbacks.onUnverified && !userData.nameMatchVerified) {
      callbacks.onUnverified(userData);
      return;
    }
    if (callbacks.onApproved) callbacks.onApproved(user, userData);
  });
}
