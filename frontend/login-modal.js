// ════════════════════════════════════════════════════
//  TravelX — login-modal.js
//  Builds and controls the split-screen auth modal.
//  Calls auth.js for all Firebase operations.
// ════════════════════════════════════════════════════

import {
  signInEmail,
  signUpEmail,
  signInGoogle,
  logOut,
  resetPassword,
  currentUser,
} from "./auth.js";

// ─── STATE ───────────────────────────────────────────
let _modalBuilt  = false;
let _currentTab  = "login";   // "login" | "signup"
let _pendingPage = "";        // page to open after auth

// ─── PUBLIC API ──────────────────────────────────────
export function openAuthModal(tab = "login", pendingPage = "") {
  _pendingPage = pendingPage;
  buildModal();
  switchTab(tab);
  const overlay = document.getElementById("auth-modal-overlay");
  overlay.classList.add("auth-open");
  document.body.style.overflow = "hidden";
}

export function closeAuthModal() {
  const overlay = document.getElementById("auth-modal-overlay");
  if (overlay) overlay.classList.remove("auth-open");
  document.body.style.overflow = "";
  clearMessages();
}

export function showUserMenu() {
  buildUserMenu();
  const menu = document.getElementById("auth-user-menu");
  if (!menu) return;
  const btn = document.getElementById("auth-nav-btn");
  if (btn) {
    const r = btn.getBoundingClientRect();
    menu.style.top  = (r.bottom + 8) + "px";
    menu.style.right = (window.innerWidth - r.right) + "px";
  }
  menu.classList.toggle("open");
  // Close on outside click
  const close = (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove("open");
      document.removeEventListener("click", close, true);
    }
  };
  setTimeout(() => document.addEventListener("click", close, true), 10);
}

// ─── BUILD OVERLAY + MODAL (once) ────────────────────
function buildModal() {
  if (_modalBuilt) return;
  _modalBuilt = true;

  const overlay = document.createElement("div");
  overlay.id = "auth-modal-overlay";
  overlay.innerHTML = `
<div class="auth-modal" role="dialog" aria-modal="true" aria-label="TravelX Sign In">

  <!-- LEFT PANEL -->
  <div class="auth-left">
    <div class="auth-left-bg"></div>

    <!-- Floating badges -->
    <div class="auth-badges">
      <span class="auth-badge">✈ 50+ Countries</span>
      <span class="auth-badge">🗺 Smart Planner</span>
      <span class="auth-badge">☁ Live Weather</span>
      <span class="auth-badge">📍 Crowd AI</span>
    </div>

    <!-- Floating destination cards -->
    <div class="auth-float-cards">
      <div class="auth-float-card">
        <div class="auth-float-card-label">Trending Now</div>
        <div class="auth-float-card-val">🏔 Manali</div>
        <div class="auth-float-card-sub">Low crowd · 12°C</div>
      </div>
      <div class="auth-float-card">
        <div class="auth-float-card-label">Best Weather</div>
        <div class="auth-float-card-val">🌊 Goa</div>
        <div class="auth-float-card-sub">Clear skies · 29°C</div>
      </div>
      <div class="auth-float-card">
        <div class="auth-float-card-label">Top Saved</div>
        <div class="auth-float-card-val">⛩ Kyoto</div>
        <div class="auth-float-card-sub">Peak season soon</div>
      </div>
    </div>

    <!-- Bottom copy -->
    <div class="auth-left-content">
      <div class="auth-left-eyebrow">TravelX Premium</div>
      <div class="auth-left-title">Travel<br><em>Beyond</em><br>Ordinary</div>
      <div class="auth-left-sub">Save journeys, build itineraries, and unlock personalized exploration.</div>
    </div>
  </div>

  <!-- RIGHT PANEL -->
  <div class="auth-right">
    <button class="auth-modal-close" id="auth-modal-close-btn" aria-label="Close">✕</button>

    <!-- Logo -->
    <div class="auth-logo-row">
      <span class="auth-logo-dot"></span>
      <span class="auth-logo-wordmark">TravelX</span>
    </div>

    <!-- Tabs -->
    <div class="auth-tabs" id="auth-tabs" data-tab="login">
      <div class="auth-tab-indicator"></div>
      <div class="auth-tab active" id="auth-tab-login" role="button" tabindex="0">Sign In</div>
      <div class="auth-tab"        id="auth-tab-signup" role="button" tabindex="0">Create Account</div>
    </div>

    <!-- Inline message -->
    <div class="auth-form-msg" id="auth-form-msg"></div>

    <!-- LOGIN PANEL -->
    <div id="auth-panel-login">
      <div class="auth-form-group">
        <div class="auth-field">
          <label for="auth-login-email">Email</label>
          <input type="email" id="auth-login-email" placeholder="you@example.com" autocomplete="email">
          <div class="auth-field-error" id="auth-err-login-email"></div>
        </div>
        <div class="auth-field">
          <label for="auth-login-pw">Password</label>
          <input type="password" id="auth-login-pw" placeholder="••••••••" autocomplete="current-password">
          <span class="auth-pw-toggle" id="auth-login-pw-toggle" title="Show/hide password">👁</span>
          <div class="auth-field-error" id="auth-err-login-pw"></div>
        </div>
      </div>

      <div class="auth-row-meta">
        <label class="auth-remember">
          <input type="checkbox" id="auth-remember">
          Remember me
        </label>
        <span class="auth-forgot" id="auth-forgot-link">Forgot password?</span>
      </div>

      <button class="auth-btn auth-btn-primary" id="auth-login-btn">
        <div class="auth-spinner"></div>
        <span class="auth-btn-text">Continue</span>
      </button>

      <div class="auth-divider">or</div>

      <button class="auth-btn auth-btn-google" id="auth-google-btn-login">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span class="auth-btn-text">Continue with Google</span>
      </button>

      <button class="auth-btn auth-btn-guest" id="auth-guest-btn-login">
        Continue as Guest
      </button>
    </div>

    <!-- SIGNUP PANEL -->
    <div id="auth-panel-signup" style="display:none">
      <div class="auth-form-group">
        <div class="auth-field">
          <label for="auth-signup-name">Display Name</label>
          <input type="text" id="auth-signup-name" placeholder="Your name" autocomplete="name">
          <div class="auth-field-error" id="auth-err-signup-name"></div>
        </div>
        <div class="auth-field">
          <label for="auth-signup-email">Email</label>
          <input type="email" id="auth-signup-email" placeholder="you@example.com" autocomplete="email">
          <div class="auth-field-error" id="auth-err-signup-email"></div>
        </div>
        <div class="auth-field">
          <label for="auth-signup-pw">Password</label>
          <input type="password" id="auth-signup-pw" placeholder="Min. 8 characters" autocomplete="new-password">
          <span class="auth-pw-toggle" id="auth-signup-pw-toggle" title="Show/hide password">👁</span>
          <div class="auth-field-error" id="auth-err-signup-pw"></div>
        </div>
        <div class="auth-field">
          <label for="auth-signup-pw2">Confirm Password</label>
          <input type="password" id="auth-signup-pw2" placeholder="Repeat password" autocomplete="new-password">
          <div class="auth-field-error" id="auth-err-signup-pw2"></div>
        </div>
      </div>

      <button class="auth-btn auth-btn-primary" id="auth-signup-btn" style="margin-top:14px">
        <div class="auth-spinner"></div>
        <span class="auth-btn-text">Create Account</span>
      </button>

      <div class="auth-divider">or</div>

      <button class="auth-btn auth-btn-google" id="auth-google-btn-signup">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span class="auth-btn-text">Continue with Google</span>
      </button>

      <button class="auth-btn auth-btn-guest" id="auth-guest-btn-signup">
        Continue as Guest
      </button>
    </div>
  </div>
</div>`;
  document.body.appendChild(overlay);

  // Build gate modal too
  buildGateModal();

  // ─── Bind events ──────────────────────────────────
  // Close
  document.getElementById("auth-modal-close-btn")
    .addEventListener("click", closeAuthModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  // Tabs
  document.getElementById("auth-tab-login")
    .addEventListener("click", () => switchTab("login"));
  document.getElementById("auth-tab-signup")
    .addEventListener("click", () => switchTab("signup"));

  // Password toggles
  bindPwToggle("auth-login-pw",   "auth-login-pw-toggle");
  bindPwToggle("auth-signup-pw",  "auth-signup-pw-toggle");

  // Login
  document.getElementById("auth-login-btn")
    .addEventListener("click", handleLogin);
  document.getElementById("auth-login-email")
    .addEventListener("keydown", (e) => { if (e.key === "Enter") handleLogin(); });
  document.getElementById("auth-login-pw")
    .addEventListener("keydown", (e) => { if (e.key === "Enter") handleLogin(); });

  // Sign up
  document.getElementById("auth-signup-btn")
    .addEventListener("click", handleSignup);

  // Google (both panels)
  document.getElementById("auth-google-btn-login")
    .addEventListener("click", handleGoogle);
  document.getElementById("auth-google-btn-signup")
    .addEventListener("click", handleGoogle);

  // Guest (both panels)
  document.getElementById("auth-guest-btn-login")
    .addEventListener("click", handleGuest);
  document.getElementById("auth-guest-btn-signup")
    .addEventListener("click", handleGuest);

  // Forgot password
  document.getElementById("auth-forgot-link")
    .addEventListener("click", handleForgotPassword);

  // Ripple on primary buttons
  ["auth-login-btn","auth-signup-btn","auth-google-btn-login",
   "auth-google-btn-signup","auth-guest-btn-login","auth-guest-btn-signup"]
    .forEach(id => addRipple(document.getElementById(id)));
}

// ─── GATE MODAL (Login Required) ─────────────────────
function buildGateModal() {
  if (document.getElementById("auth-gate-modal")) return;
  const el = document.createElement("div");
  el.id = "auth-gate-modal";
  el.innerHTML = `
<div class="auth-gate-card">
  <div class="auth-gate-icon">✈</div>
  <div class="auth-gate-title">Login Required</div>
  <div class="auth-gate-sub" id="auth-gate-sub">
    Create your travel profile to save places and build smart travel plans.
  </div>
  <div class="auth-gate-btns">
    <button class="auth-gate-login-btn" id="auth-gate-login-btn">Sign In or Create Account</button>
    <button class="auth-gate-continue-btn" id="auth-gate-continue-btn">Continue Browsing</button>
  </div>
</div>`;
  document.body.appendChild(el);

  document.getElementById("auth-gate-login-btn").addEventListener("click", () => {
    closeGateModal();
    openAuthModal("login");
  });
  document.getElementById("auth-gate-continue-btn").addEventListener("click", closeGateModal);
  el.addEventListener("click", (e) => { if (e.target === el) closeGateModal(); });
}

export function openGateModal(context = "") {
  buildGateModal();
  const sub = document.getElementById("auth-gate-sub");
  if (sub) {
    if (context === "save") {
      sub.textContent = "Sign in to save places, sync across devices, and build your dream itinerary.";
    } else if (context === "planner") {
      sub.textContent = "Sign in to access the Trip Planner, build itineraries and track your travel budget.";
    } else {
      sub.textContent = "Create your travel profile to save places and build smart travel plans.";
    }
  }
  document.getElementById("auth-gate-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeGateModal() {
  const el = document.getElementById("auth-gate-modal");
  if (el) el.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── USER MENU ────────────────────────────────────────
function buildUserMenu() {
  if (document.getElementById("auth-user-menu")) return;
  const menu = document.createElement("div");
  menu.id = "auth-user-menu";
  menu.innerHTML = `
<div class="auth-menu-header">
  <div class="auth-menu-name" id="auth-menu-name">—</div>
  <div class="auth-menu-email" id="auth-menu-email">—</div>
</div>
<div class="auth-menu-item" id="auth-menu-saved">🔖 Saved Places</div>
<div class="auth-menu-item" id="auth-menu-planner">✈ Trip Planner</div>
<div class="auth-menu-item danger" id="auth-menu-signout">↩ Sign Out</div>`;
  document.body.appendChild(menu);

  document.getElementById("auth-menu-saved").addEventListener("click", () => {
    menu.classList.remove("open");
    if (typeof window.showPage === "function") window.showPage("saved");
  });
  document.getElementById("auth-menu-planner").addEventListener("click", () => {
    menu.classList.remove("open");
    if (typeof window.showPage === "function") window.showPage("planner");
  });
  document.getElementById("auth-menu-signout").addEventListener("click", () => {
    menu.classList.remove("open");
    logOut();
  });
}

// Update user menu data lazily
function refreshUserMenu(user) {
  const nameEl  = document.getElementById("auth-menu-name");
  const emailEl = document.getElementById("auth-menu-email");
  if (nameEl)  nameEl.textContent  = user?.displayName || user?.email?.split("@")[0] || "Traveler";
  if (emailEl) emailEl.textContent = user?.email || "";
}

// ─── TAB SWITCH ───────────────────────────────────────
function switchTab(tab) {
  _currentTab = tab;
  const tabs = document.getElementById("auth-tabs");
  if (!tabs) return;
  tabs.setAttribute("data-tab", tab);
  document.getElementById("auth-tab-login" ).classList.toggle("active", tab === "login");
  document.getElementById("auth-tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("auth-panel-login" ).style.display = tab === "login"  ? "" : "none";
  document.getElementById("auth-panel-signup").style.display = tab === "signup" ? "" : "none";
  clearMessages();
}

// ─── HANDLERS ─────────────────────────────────────────
async function handleLogin() {
  clearMessages();
  const email = val("auth-login-email");
  const pw    = val("auth-login-pw");
  let ok = true;
  if (!email || !isValidEmail(email)) { showFieldErr("auth-err-login-email", "Enter a valid email."); ok = false; }
  if (!pw || pw.length < 6)           { showFieldErr("auth-err-login-pw",    "Password too short."); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("auth-login-btn");
  setLoading(btn, true);

  try {
    await signInEmail(email, pw);
    onAuthSuccess();
  } catch (err) {
    showMsg("error", friendlyError(err.code));
  } finally {
    setLoading(btn, false);
  }
}

async function handleSignup() {
  clearMessages();
  const name  = val("auth-signup-name");
  const email = val("auth-signup-email");
  const pw    = val("auth-signup-pw");
  const pw2   = val("auth-signup-pw2");
  let ok = true;
  if (!name.trim())                   { showFieldErr("auth-err-signup-name",  "Please enter your name."); ok = false; }
  if (!email || !isValidEmail(email)) { showFieldErr("auth-err-signup-email", "Enter a valid email."); ok = false; }
  if (!pw || pw.length < 8)           { showFieldErr("auth-err-signup-pw",    "Min. 8 characters."); ok = false; }
  if (pw !== pw2)                     { showFieldErr("auth-err-signup-pw2",   "Passwords don't match."); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("auth-signup-btn");
  setLoading(btn, true);

  try {
    await signUpEmail(email, pw, name.trim());
    onAuthSuccess();
  } catch (err) {
    showMsg("error", friendlyError(err.code));
  } finally {
    setLoading(btn, false);
  }
}

async function handleGoogle() {
  clearMessages();
  try {
    await signInGoogle();
    onAuthSuccess();
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      showMsg("error", friendlyError(err.code));
    }
  }
}

function handleGuest() {
  closeAuthModal();
  if (typeof window.showToast === "function") {
    window.showToast("Browsing as Guest. Some features require sign-in.");
  }
}

async function handleForgotPassword() {
  const email = val("auth-login-email");
  if (!email || !isValidEmail(email)) {
    showFieldErr("auth-err-login-email", "Enter your email first.");
    document.getElementById("auth-login-email").focus();
    return;
  }
  try {
    await resetPassword(email);
    showMsg("success", "Reset link sent! Check your inbox.");
  } catch (err) {
    showMsg("error", friendlyError(err.code));
  }
}

// ─── POST-AUTH ────────────────────────────────────────
function onAuthSuccess() {
  closeAuthModal();
  if (_pendingPage && typeof window.showPage === "function") {
    window.showPage(_pendingPage);
    _pendingPage = "";
  }
}

// ─── HELPERS ──────────────────────────────────────────
function val(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function showFieldErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.add("show");
  const input = el.closest(".auth-field")?.querySelector("input");
  if (input) input.classList.add("auth-error");
}

function clearMessages() {
  document.querySelectorAll(".auth-field-error").forEach(e => {
    e.textContent = ""; e.classList.remove("show");
  });
  document.querySelectorAll(".auth-field input").forEach(i => {
    i.classList.remove("auth-error");
  });
  const msg = document.getElementById("auth-form-msg");
  if (msg) { msg.className = "auth-form-msg"; msg.textContent = ""; }
}

function showMsg(type, text) {
  const msg = document.getElementById("auth-form-msg");
  if (!msg) return;
  msg.textContent = text;
  msg.className = `auth-form-msg show ${type}`;
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle("loading", on);
  btn.disabled = on;
}

function bindPwToggle(inputId, toggleId) {
  const toggle = document.getElementById(toggleId);
  const input  = document.getElementById(inputId);
  if (!toggle || !input) return;
  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "🙈" : "👁";
  });
}

function addRipple(btn) {
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    const r  = btn.getBoundingClientRect();
    const rp = document.createElement("span");
    const d  = Math.max(r.width, r.height);
    rp.className = "auth-ripple";
    rp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
    btn.appendChild(rp);
    setTimeout(() => rp.remove(), 600);
  });
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Incorrect password. Try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password":        "Password should be at least 6 characters.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/too-many-requests":    "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-blocked":        "Popup was blocked. Allow popups and retry.",
    "auth/invalid-credential":   "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}  