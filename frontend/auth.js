// ════════════════════════════════════════════════════
//  TravelX — auth.js
//  Firebase Authentication + Firestore sync layer
//  Non-destructive: hooks into existing script.js
//  globals without overwriting any functions.
// ════════════════════════════════════════════════════

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// ─── AUTH STATE ─────────────────────────────────────
export let currentUser = null;
export let isGuestMode = true;

const googleProvider = new GoogleAuthProvider();

// ─── RESTRICTED FEATURES ────────────────────────────
// Pages/actions that require login
export const RESTRICTED_PAGES    = ["saved", "planner"];
export const RESTRICTED_ACTIONS  = ["save", "planner"];

// ─── AUTH STATE OBSERVER ────────────────────────────
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isGuestMode  = !user;

  updateNavAuthUI(user);

  if (user) {
    // Sync Firestore saved places → localStorage (merge)
    await syncSavedPlacesFromFirestore(user.uid);
    // Notify existing script.js to refresh saved list
    if (typeof window.renderSavedPage === "function") window.renderSavedPage();
    if (typeof window.renderPlannerSaved === "function") window.renderPlannerSaved();
    showToastTX(`Welcome back, ${user.displayName || user.email.split("@")[0]}! ✈`, "success");
  }
});

// ─── SIGN IN ─────────────────────────────────────────
export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  // Create user doc in Firestore
  await setDoc(doc(db, "users", cred.user.uid), {
    displayName: displayName || "",
    email: cred.user.email,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return cred;
}

export async function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logOut() {
  await signOut(auth);
  showToastTX("Signed out. Browsing as Guest.", "info");
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// ─── FIRESTORE: SAVED PLACES ─────────────────────────
export async function savePlaceToFirestore(uid, place) {
  if (!uid || !place?.xid) return;
  const ref = doc(db, "users", uid, "savedPlaces", place.xid);
  await setDoc(ref, { ...place, savedAt: serverTimestamp() });
}

export async function removePlaceFromFirestore(uid, xid) {
  if (!uid || !xid) return;
  const ref = doc(db, "users", uid, "savedPlaces", xid);
  await deleteDoc(ref);
}

export async function syncSavedPlacesFromFirestore(uid) {
  if (!uid) return;
  try {
    const snap = await getDocs(collection(db, "users", uid, "savedPlaces"));
    const remotePlaces = snap.docs.map(d => d.data());
    // Merge with localStorage without duplicates
    const local = JSON.parse(localStorage.getItem("tx_saved") || "[]");
    const allXids = new Set(local.map(p => p.xid));
    for (const p of remotePlaces) {
      if (!allXids.has(p.xid)) local.push(p);
    }
    localStorage.setItem("tx_saved", JSON.stringify(local));
    // Update global if script.js already loaded
    if (Array.isArray(window.savedPlaces)) {
      window.savedPlaces = local;
    }
  } catch (e) {
    console.warn("TravelX Auth: Firestore sync failed:", e.message);
  }
}

// ─── FIRESTORE: PLANNER TRIPS ────────────────────────
export async function savePlannerTripToFirestore(uid, tripData) {
  if (!uid || !tripData?.id) return;
  const ref = doc(db, "users", uid, "plannerTrips", tripData.id);
  await setDoc(ref, { ...tripData, updatedAt: serverTimestamp() });
}

export async function loadPlannerTripsFromFirestore(uid) {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "plannerTrips"));
  return snap.docs.map(d => d.data());
}

// ─── NAV UI UPDATE ───────────────────────────────────
function updateNavAuthUI(user) {
  const btn   = document.getElementById("auth-nav-btn");
  const badge = document.getElementById("guest-badge");
  if (!btn) return;

  if (user) {
    const name = user.displayName || user.email.split("@")[0];
    btn.textContent = name.charAt(0).toUpperCase() + name.slice(1, 10);
    btn.title = user.email;
    btn.classList.add("auth-signed-in");
    btn.onclick = () => import("./login-modal.js").then(m => m.showUserMenu());
    if (badge) badge.style.display = "none";
  } else {
    btn.textContent = "Sign In";
    btn.classList.remove("auth-signed-in");
    btn.onclick = () => import("./login-modal.js").then(m => m.openAuthModal());
    if (badge) badge.style.display = "flex";
  }
}

// ─── GATE: Check before restricted action ────────────
export function requireAuth(action = "") {
  if (currentUser) return true;
  import("./login-modal.js").then(m => m.openAuthModal("login", action));
  return false;
}

// ─── TOAST helper (uses existing TravelX toast) ──────
function showToastTX(msg, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(msg);
    return;
  }
  // Fallback if showToast not yet defined
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = `toast-visible toast-${type}`;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => { t.className = ""; }, 3200);
}

// ─── PATCH script.js save hooks non-destructively ────
// Intercept the global toggleSave / addToPlanner to gate on auth.
// We wait for DOMContentLoaded so script.js is already parsed.
window.addEventListener("DOMContentLoaded", () => {
  // Patch toggleSave
  if (typeof window.toggleSave === "function") {
    const _origToggleSave = window.toggleSave.bind(window);
    window.toggleSave = function(place) {
      if (!requireAuth("save")) return;
      _origToggleSave(place);
      // Mirror to Firestore
      const isSaved = (window.savedPlaces || []).some(p => p.xid === place.xid);
      if (currentUser) {
        if (isSaved) {
          savePlaceToFirestore(currentUser.uid, place).catch(() => {});
        } else {
          removePlaceFromFirestore(currentUser.uid, place.xid).catch(() => {});
        }
      }
    };
  }

  // Patch toggleSaveFromModal (used inside place detail modal)
  if (typeof window.toggleSaveFromModal === "function") {
    const _origModal = window.toggleSaveFromModal.bind(window);
    window.toggleSaveFromModal = function() {
      if (!requireAuth("save")) return;
      _origModal();
      // Mirror to Firestore after orig runs
      setTimeout(() => {
        const place = window.modalPlace;
        if (!place || !currentUser) return;
        const isSaved = (window.savedPlaces || []).some(p => p.xid === place.xid);
        if (isSaved) {
          savePlaceToFirestore(currentUser.uid, place).catch(() => {});
        } else {
          removePlaceFromFirestore(currentUser.uid, place.xid).catch(() => {});
        }
      }, 100);
    };
  }

  // Gate planner page
  const _origShowPage = window.showPage;
  if (typeof _origShowPage === "function") {
    window.showPage = function(page) {
      if (RESTRICTED_PAGES.includes(page)) {
        if (!requireAuth(page)) return;
      }
      _origShowPage(page);
    };
  }

  // Mobile nav planner button
  const mnavPlanner = document.getElementById("mnav-planner");
  if (mnavPlanner) {
    const _orig = mnavPlanner.getAttribute("onclick");
    mnavPlanner.removeAttribute("onclick");
    mnavPlanner.addEventListener("click", () => {
      if (!requireAuth("planner")) return;
      if (typeof window._origShowPage === "function") window._origShowPage("planner");
      else if (_orig) eval(_orig);
    });
  }
});