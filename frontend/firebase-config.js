// ════════════════════════════════════════════════════
//  TravelX — firebase-config.js
//  Initialize Firebase app + export auth & db
//  Replace the firebaseConfig values with your own
//  from the Firebase Console → Project Settings.
// ════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── YOUR FIREBASE PROJECT CONFIG ───────────────────
// Replace these values with your own from:
// Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyCGQvU6NSEj7wFYLzCfBWJ_rz-phAPgtrk",
  authDomain: "travelx-3c215.firebaseapp.com",
  projectId: "travelx-3c215",
  storageBucket: "travelx-3c215.firebasestorage.app",
  messagingSenderId: "278207011438",
  appId: "1:278207011438:web:7673e0fb133241e205e47f",
  measurementId: "G-W95D4QE5RH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);