/* ════════════════════════════════════════════════════
   TravelX — script.js
   Multi-page: Home, Explore, Trending, Saved, Planner
   Features: Crowd prediction, Weather, Map, Planner,
             Hourly forecast, Autocomplete, Save system
════════════════════════════════════════════════════ */

// ─── API LAYER ──────────────────────────────────────────────
// Keys mirrored from config.js — browser calls APIs directly if server is down
const _OPENCAGE_KEY    = "f9c9cb6be0c944149e57d5cce7b10b55";
const _OPENTRIPMAP_KEY = "5ae2e3f221c38a28845f05b6b9ffb0011633af45fbf6f1d1760f33d1";
const _OPENWEATHER_KEY = "15b9d664deb34d1d32785f95cf33914e";
const SERVER_BASE      = "/api";

const API = {
  _tryServer: async (url) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) { const d = await r.json(); if (!d.error) return d; }
    } catch {}
    return null;
  },
  geocode: async (city) => {
    const sv = await API._tryServer(`${SERVER_BASE}/geocode?city=${encodeURIComponent(city)}`);
    if (sv) return sv;
    const r = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${_OPENCAGE_KEY}&limit=1&no_annotations=1`);
    if (!r.ok) throw new Error("Geocode failed");
    const d = await r.json();
    const loc = d.results?.[0]?.geometry;
    if (!loc) throw new Error("City not found");
    return { lat: loc.lat, lng: loc.lng, formatted: d.results[0].formatted };
  },
  places: async (lat, lon) => {
    const sv = await API._tryServer(`${SERVER_BASE}/places?lat=${lat}&lon=${lon}`);
    if (sv) return sv;
    const delta = 0.35;
    const r = await fetch(`https://api.opentripmap.com/0.1/en/places/bbox?lon_min=${lon-delta}&lon_max=${lon+delta}&lat_min=${lat-delta}&lat_max=${lat+delta}&format=json&limit=500&apikey=${_OPENTRIPMAP_KEY}`);
    if (!r.ok) throw new Error("Places failed");
    return r.json();
  },
  weather: async (lat, lon) => {
    const sv = await API._tryServer(`${SERVER_BASE}/weather?lat=${lat}&lon=${lon}`);
    if (sv) return sv;
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${_OPENWEATHER_KEY}`);
    if (!r.ok) throw new Error("Weather failed");
    return r.json();
  },
  price: (params) => `${SERVER_BASE}/price?${params}`,
};

// ─── STATE ──────────────────────────────────────────────────
let map, markers = [], globalPlaces = [], currentBounds = [];
let activeFilter = "all", activeSort = "rating";
let currentCity = "Pune", currentLat = 18.5204, currentLon = 73.8567;
let weatherCache = null;
let savedPlaces = JSON.parse(localStorage.getItem("tx_saved") || "[]");
let plannerDays = [];
let plannerPlaces = [];
let modalPlace = null;
let focusedPlace = null;
let focusMarker = null;
let mapFocusMode = false;
let mapStyleDark = false;
let tileLayer = null;
let loadGeneration = 0;
const BOOT_GENERATION = 0; // boot never bumps loadGeneration — avoids wiping user searches

// ─── CITY DATA ─────────────────────────────────────────────
const POPULAR_CITIES = [
  { name: "Mumbai",    flag: "🇮🇳", country: "India" },
  { name: "Delhi",     flag: "🇮🇳", country: "India" },
  { name: "Bangalore", flag: "🇮🇳", country: "India" },
  { name: "Pune",      flag: "🇮🇳", country: "India" },
  { name: "Jaipur",    flag: "🇮🇳", country: "India" },
  { name: "Goa",       flag: "🇮🇳", country: "India" },
  { name: "Hyderabad", flag: "🇮🇳", country: "India" },
  { name: "Chennai",   flag: "🇮🇳", country: "India" },
  { name: "Kolkata",   flag: "🇮🇳", country: "India" },
  { name: "Agra",      flag: "🇮🇳", country: "India" },
  { name: "Varanasi",  flag: "🇮🇳", country: "India" },
  { name: "Udaipur",   flag: "🇮🇳", country: "India" },
  { name: "Mysore",    flag: "🇮🇳", country: "India" },
  { name: "Rishikesh", flag: "🇮🇳", country: "India" },
  { name: "Manali",    flag: "🇮🇳", country: "India" },
  { name: "Paris",     flag: "🇫🇷", country: "France" },
  { name: "London",    flag: "🇬🇧", country: "UK" },
  { name: "Tokyo",     flag: "🇯🇵", country: "Japan" },
  { name: "Kyoto",     flag: "🇯🇵", country: "Japan" },
  { name: "New York",  flag: "🇺🇸", country: "USA" },
  { name: "Barcelona", flag: "🇪🇸", country: "Spain" },
  { name: "Rome",      flag: "🇮🇹", country: "Italy" },
  { name: "Bangkok",   flag: "🇹🇭", country: "Thailand" },
  { name: "Bali",      flag: "🇮🇩", country: "Indonesia" },
  { name: "Singapore", flag: "🇸🇬", country: "Singapore" },
  { name: "Dubai",     flag: "🇦🇪", country: "UAE" },
  { name: "Istanbul",  flag: "🇹🇷", country: "Turkey" },
  { name: "Lisbon",    flag: "🇵🇹", country: "Portugal" },
  { name: "Prague",    flag: "🇨🇿", country: "Czech Republic" },
];

const CITY_RECOMMENDATIONS = {
  india: [
    { name: "Jaipur",    emoji: "🏰", state: "Rajasthan",    tags: ["Heritage","Forts","Bazaars"], bg: "#FEF3C7" },
    { name: "Goa",       emoji: "🌊", state: "Goa",          tags: ["Beaches","Nightlife","Seafood"], bg: "#DBEAFE" },
    { name: "Varanasi",  emoji: "🕯️", state: "Uttar Pradesh", tags: ["Spiritual","Ghats","Culture"], bg: "#FDF2F8" },
    { name: "Udaipur",   emoji: "🏙️", state: "Rajasthan",    tags: ["Lakes","Palaces","Romance"], bg: "#D1FAE5" },
    { name: "Manali",    emoji: "🏔️", state: "Himachal Pradesh", tags: ["Mountains","Snow","Trek"], bg: "#E0F2FE" },
    { name: "Coorg",     emoji: "☕", state: "Karnataka",    tags: ["Coffee","Nature","Misty"], bg: "#ECFDF5" },
    { name: "Rishikesh", emoji: "🧘", state: "Uttarakhand",  tags: ["Yoga","River","Adventure"], bg: "#FFF7ED" },
    { name: "Hampi",     emoji: "🗿", state: "Karnataka",    tags: ["Ruins","History","UNESCO"], bg: "#EDE9FE" },
  ],
  world: [
    { name: "Kyoto",     emoji: "⛩️", state: "Japan",        tags: ["Temples","Gardens","Zen"], bg: "#FDF2F8" },
    { name: "Lisbon",    emoji: "🚃", state: "Portugal",     tags: ["Trams","Seafood","Sunset"], bg: "#FEF3C7" },
    { name: "Bali",      emoji: "🌺", state: "Indonesia",    tags: ["Beaches","Temples","Wellness"], bg: "#D1FAE5" },
    { name: "Istanbul",  emoji: "🕌", state: "Turkey",       tags: ["Bazaars","Mosques","Bosphorus"], bg: "#DBEAFE" },
    { name: "Barcelona", emoji: "🎨", state: "Spain",        tags: ["Gaudí","Beach","Food"], bg: "#FFF7ED" },
    { name: "Prague",    emoji: "🏰", state: "Czech Republic", tags: ["Old Town","Beer","Gothic"], bg: "#EDE9FE" },
    { name: "Bangkok",   emoji: "🛺", state: "Thailand",     tags: ["Temples","Street Food","Markets"], bg: "#ECFDF5" },
    { name: "Rome",      emoji: "🏛️", state: "Italy",        tags: ["Ruins","Art","Pasta"], bg: "#E0F2FE" },
  ],
  hidden: [
    { name: "Hampi",     emoji: "🗿", state: "Karnataka, India",    tags: ["Ruins","Boulders","UNESCO"], bg: "#EDE9FE" },
    { name: "Spiti",     emoji: "🏔️", state: "Himachal Pradesh",   tags: ["Remote","Monasteries","Stargazing"], bg: "#E0F2FE" },
    { name: "Ziro",      emoji: "🌾", state: "Arunachal Pradesh",  tags: ["Tribal","Rice Fields","Music Fest"], bg: "#ECFDF5" },
    { name: "Majuli",    emoji: "🛶", state: "Assam, India",       tags: ["River Island","Masks","Culture"], bg: "#FEF3C7" },
    { name: "Pondicherry", emoji: "🌸", state: "Tamil Nadu, India", tags: ["French Quarter","Beaches","Yoga"], bg: "#FDF2F8" },
    { name: "Dholavira", emoji: "⚱️", state: "Gujarat, India",     tags: ["Harappan","UNESCO","Desert"], bg: "#FFF7ED" },
    { name: "Chopta",    emoji: "🌿", state: "Uttarakhand, India", tags: ["Mini Switzerland","Trek","Meadows"], bg: "#D1FAE5" },
    { name: "Mawlynnong", emoji: "🌺", state: "Meghalaya, India",  tags: ["Cleanest Village","Root Bridges","Waterfalls"], bg: "#DBEAFE" },
  ]
};

// ─── REAL ENTRY FEE DATA ────────────────────────────────────
// Based on actual typical Indian entry fees per category
const CATEGORY_ENTRY_FEES = {
  "Temple":   { typical: 0,   range: [0, 0],       note: "Free (most temples)" },
  "Museum":   { typical: 50,  range: [20, 500],     note: "Govt museums ₹20–₹100; private ₹200–₹500" },
  "Fort":     { typical: 35,  range: [0, 600],      note: "ASI sites ₹25–₹40; major forts ₹200–₹600" },
  "Waterfall":{ typical: 0,   range: [0, 50],       note: "Most free; some conservation fee ₹20–₹50" },
  "Hill":     { typical: 0,   range: [0, 100],      note: "Mostly free; hill stations may charge ₹50–₹100" },
  "Park":     { typical: 20,  range: [0, 100],      note: "Public parks free; national parks ₹20–₹100" },
  "Heritage": { typical: 40,  range: [20, 1100],    note: "ASI ₹25–₹40; Taj Mahal ₹1100 for foreigners" },
  "Lake":     { typical: 0,   range: [0, 50],       note: "Free; boat rides extra ₹50–₹200" },
  "Cave":     { typical: 30,  range: [15, 40],      note: "ASI caves ₹15–₹40" },
  "Beach":    { typical: 0,   range: [0, 0],        note: "Free (public beaches)" },
  "Nature":   { typical: 0,   range: [0, 100],      note: "Forest reserves may charge ₹50–₹100" },
};

// KNOWN_ENTRY_FEES loaded from known-entry-fees.js (300+ ASI / state schedules)

function getEntryFee(place) {
  const nameLower = place.name.toLowerCase();
  // Check known list first
  const fees = typeof KNOWN_ENTRY_FEES !== "undefined" ? KNOWN_ENTRY_FEES : {};
  for (const [key, fee] of Object.entries(fees)) {
    if (nameLower.includes(key)) return fee;
  }
  // Use category typical with a small deterministic variation
  const cfg = CATEGORY_ENTRY_FEES[place.category] || { typical: 20, range: [0, 100] };
  const seed = Math.abs(hashCode(place.name));
  const [min, max] = cfg.range;
  if (max === 0) return 0;
  // Pick one of the common fee points, not fully random
  const feeLevels =
    min === 0 && max === 0
      ? [0]
      : min === 0
        ? [0, Math.round(max / 4), Math.round((min + max) / 2), max]
        : [min, Math.round((min + max) / 2), max];
  return feeLevels[seed % feeLevels.length];
}

function getEffectivePrice(place) {
  if (place.priceData?.price != null && Number.isFinite(place.priceData.price)) {
    return place.priceData.price;
  }
  return place.cost ?? 0;
}

function priceBadgeLabel(source) {
  if (source === "wikidata" || source === "wikipedia" || source === "opentripmap") return "Live";
  return "Estimated";
}

function formatPriceLine(priceData, fallbackCost) {
  if (priceData) {
    const badge = priceBadgeLabel(priceData.source);
    const display = priceData.priceDisplay || (priceData.isFree ? "Free" : `₹${priceData.price}`);
    return { html: `${display}<span class="price-source-badge ${badge === "Live" ? "live" : "est"}">${badge}</span>`, text: display, badge };
  }
  const cost = fallbackCost ?? 0;
  const display = cost === 0 ? "Free" : `₹${cost}`;
  return { html: `${display}<span class="price-source-badge est">Estimated</span>`, text: display, badge: "Estimated" };
}

const PRICE_FETCH_TIMEOUT_MS = 3000;
const priceFetchQueue = { active: 0, waiters: [] };

function acquirePriceSlot() {
  return new Promise((resolve) => {
    const release = () => {
      priceFetchQueue.active--;
      const next = priceFetchQueue.waiters.shift();
      if (next) next();
    };
    if (priceFetchQueue.active < 3) {
      priceFetchQueue.active++;
      resolve(release);
    } else {
      priceFetchQueue.waiters.push(() => {
        priceFetchQueue.active++;
        resolve(release);
      });
    }
  });
}

const priceInflight = new Map();

async function fetchPlacePrice(place, { onUpdate } = {}) {
  if (!place?.name || !place.point?.lat) return null;
  const key = `${place.name}:${place.point.lat}:${place.point.lon}`;
  if (place.priceData?.source && place.priceData.source !== "pending") {
    onUpdate?.(place.priceData);
    return place.priceData;
  }
  if (priceInflight.has(key)) {
    return priceInflight.get(key).then((data) => {
      if (data) onUpdate?.(data);
      return data;
    });
  }

  const localEstimate = () => {
    const fee = getEntryFee(place);
    const cfg = CATEGORY_ENTRY_FEES[place.category] || { range: [0, 100], note: "" };
    const [min, max] = cfg.range;
    return {
      price: fee,
      currency: "INR",
      isFree: fee === 0,
      priceDisplay: fee === 0 ? "Free" : `₹${fee}`,
      priceRange: min === max && min === 0 ? "Free" : `₹${min}–₹${max}`,
      source: "estimate",
      note: cfg.note || "Local estimate",
    };
  };

  const run = async () => {
    const release = await acquirePriceSlot();
    try {
      const params = new URLSearchParams({
        name: place.name,
        lat: String(place.point.lat),
        lon: String(place.point.lon),
      });
      if (place.category) params.set("category", place.category);
      if (place.kinds) params.set("kinds", place.kinds);

      const fetchPromise = fetch(API.price(params)).then(async (res) => {
        if (!res.ok) throw new Error("price failed");
        return res.json();
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PRICE_FETCH_TIMEOUT_MS)
      );

      let data;
      try {
        data = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        if (err.message === "timeout") {
          const est = localEstimate();
          place.priceData = est;
          onUpdate?.(est);
          try {
            data = await fetchPromise;
          } catch {
            return est;
          }
        } else {
          const est = localEstimate();
          place.priceData = est;
          onUpdate?.(est);
          return est;
        }
      }

      if (data && Number.isFinite(data.price)) {
        place.priceData = data;
        place.cost = data.price;
        onUpdate?.(data);
        syncPlaceInCollections(place);
        return data;
      }
      const est = localEstimate();
      place.priceData = est;
      place.cost = est.price;
      onUpdate?.(est);
      return est;
    } finally {
      release();
      priceInflight.delete(key);
    }
  };

  const p = run();
  priceInflight.set(key, p);
  return p;
}

function syncPlaceInCollections(place) {
  const patch = (list) => {
    const i = list.findIndex((p) => p.name === place.name);
    if (i >= 0) {
      list[i].priceData = place.priceData;
      list[i].cost = place.cost;
    }
  };
  patch(globalPlaces);
  patch(plannerPlaces);
  savedPlaces.forEach((s, i) => {
    if (s.name === place.name) {
      savedPlaces[i] = { ...s, priceData: place.priceData, cost: place.cost };
    }
  });
  plannerDays.forEach((day) => {
    day.places.forEach((p, i) => {
      if (p.name === place.name) {
        day.places[i] = { ...p, priceData: place.priceData, cost: place.cost };
      }
    });
  });
  localStorage.setItem("tx_saved", JSON.stringify(savedPlaces));
  updateBudgetSummary();
}

function renderPriceShimmer() {
  return `<span class="price-shimmer" aria-busy="true"></span>`;
}

function updatePriceEl(el, place) {
  if (!el) return;
  const line = formatPriceLine(place.priceData, place.cost);
  el.innerHTML = place.priceData ? line.html : renderPriceShimmer();
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function buildMarkerPopup(place) {
  const crowd = place.crowd;
  const crowdLabel = { low: "Low Crowd", medium: "Moderate", high: "High Crowd" }[crowd.level];
  const priceText = place.priceData?.priceDisplay
    ?? (getEffectivePrice(place) === 0 ? "Free" : `₹${getEffectivePrice(place)}`);
  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:180px;padding:4px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">${place.name}</div>
      <div style="color:#918C80;font-size:11px;margin-bottom:8px">${place.category}</div>
      <div style="display:flex;gap:10px;font-size:12px;align-items:center;flex-wrap:wrap">
        <span>⭐ ${place.rating}</span>
        <span>💰 ${priceText}</span>
        <span style="color:${crowd.level === "low" ? "#1E6B44" : crowd.level === "medium" ? "#9A6216" : "#B83030"};font-weight:700">${crowdLabel.toUpperCase()}</span>
      </div>
    </div>`;
}

function refreshMiniCostForPlace(place) {
  const text = place.priceData?.priceDisplay
    ?? (getEffectivePrice(place) === 0 ? "Free" : `₹${getEffectivePrice(place)}`);
  document.querySelectorAll(".mini-cost").forEach((el) => {
    if (el.dataset.placeName === place.name) el.textContent = text;
  });
}

// Enhanced category crowd profiles with hourly patterns
const CATEGORY_CROWD_PROFILE = {
  "Temple":    { base: 55, peakHours: [7,8,18,19], offPeakHours: [12,13,14], weekendBoost: 20, hourlyProfile: [10,15,20,15,30,55,75,85,70,60,55,50,45,50,60,65,70,80,85,70,55,35,20,12] },
  "Museum":    { base: 40, peakHours: [11,12,14,15], offPeakHours: [8,9,17], weekendBoost: 25, hourlyProfile: [5,5,5,5,5,10,15,30,50,65,75,80,70,65,75,70,55,40,25,15,10,8,5,5] },
  "Fort":      { base: 50, peakHours: [10,11,15,16], offPeakHours: [7,8,17], weekendBoost: 30, hourlyProfile: [5,5,5,5,10,20,35,50,70,80,85,80,65,55,60,70,60,40,20,10,8,6,5,5] },
  "Waterfall": { base: 35, peakHours: [10,11,12,13], offPeakHours: [6,7,17], weekendBoost: 35, hourlyProfile: [5,5,5,5,10,20,40,55,70,80,85,85,80,65,50,40,35,25,15,10,8,6,5,5] },
  "Hill":      { base: 40, peakHours: [6,7,17,18], offPeakHours: [11,12,13], weekendBoost: 20, hourlyProfile: [30,40,50,35,25,30,55,65,50,40,35,30,28,30,35,40,55,65,50,35,20,15,12,25] },
  "Park":      { base: 45, peakHours: [7,8,17,18,19], offPeakHours: [11,12], weekendBoost: 30, hourlyProfile: [10,8,8,8,15,30,50,70,60,45,35,30,28,30,35,40,50,65,70,55,35,20,12,10] },
  "Heritage":  { base: 45, peakHours: [10,11,14,15], offPeakHours: [8,16], weekendBoost: 20, hourlyProfile: [5,5,5,5,10,20,35,55,70,80,85,75,65,60,70,75,60,40,20,12,8,6,5,5] },
  "Lake":      { base: 35, peakHours: [7,8,17,18], offPeakHours: [12,13], weekendBoost: 25, hourlyProfile: [20,15,12,10,15,25,45,60,50,40,35,30,28,30,35,40,50,60,55,40,25,18,15,18] },
  "Cave":      { base: 30, peakHours: [10,11,12], offPeakHours: [7,16,17], weekendBoost: 15, hourlyProfile: [5,5,5,5,8,15,25,40,60,75,80,75,70,60,50,40,30,20,12,8,6,5,5,5] },
  "Beach":     { base: 55, peakHours: [10,11,16,17], offPeakHours: [7,8], weekendBoost: 40, hourlyProfile: [10,8,8,8,10,15,25,35,50,65,75,70,60,55,60,70,75,65,50,35,20,15,12,10] },
  "Nature":    { base: 30, peakHours: [9,10,15,16], offPeakHours: [7,12], weekendBoost: 20, hourlyProfile: [10,8,8,8,12,20,35,50,65,70,65,55,45,45,55,65,60,45,30,18,12,10,8,10] },
};

function computeCrowd(place) {
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const month = now.getMonth(); // 0=Jan

  const cfg = CATEGORY_CROWD_PROFILE[place.category] || { base: 40, peakHours: [11,15], offPeakHours: [8,16], weekendBoost: 20, hourlyProfile: Array(24).fill(40) };

  // Base from hourly profile
  let score = cfg.hourlyProfile[hour] || cfg.base;

  // Weekend boost
  if (isWeekend) score += cfg.weekendBoost * 0.5;

  // Seasonal factor
  const seasonBoost = getSeasonalBoost(place.category, month);
  score = score * (1 + seasonBoost);

  // Unique place variance (deterministic per place name)
  const seed = hashCode(place.name);
  score += ((Math.abs(seed) % 18) - 9);

  score = Math.max(5, Math.min(96, Math.round(score)));
  const level = score < 38 ? "low" : score < 65 ? "medium" : "high";

  // Peak hint
  const isPeakHour = cfg.peakHours.includes(hour);
  const nextPeak = cfg.peakHours.find(h => h > hour);
  let peakHint;
  if (isPeakHour) {
    peakHint = `Currently at peak — try ${bestTimeHint(place.category)} for fewer crowds`;
  } else if (nextPeak) {
    const ampm = `${nextPeak > 12 ? nextPeak - 12 : nextPeak}${nextPeak >= 12 ? "pm" : "am"}`;
    peakHint = `Peak expected around ${ampm} · Best: ${bestTimeHint(place.category)}`;
  } else {
    peakHint = `Good time to visit · Best: ${bestTimeHint(place.category)}`;
  }

  // Hourly forecast for today (using hourly profile + variance)
  const hourlyForecast = cfg.hourlyProfile.map((v, h) => {
    let hv = v;
    if (isWeekend) hv += cfg.weekendBoost * 0.3;
    hv += ((Math.abs(seed + h) % 10) - 5);
    return Math.max(5, Math.min(96, Math.round(hv)));
  });

  return { level, score, peakHint, hourlyForecast, isPeakHour };
}

function getSeasonalBoost(category, month) {
  // Peak tourist season: Oct-Feb for most India places
  const peakMonths = [10, 11, 0, 1]; // Oct, Nov, Dec, Jan
  const offMonths = [5, 6]; // Jun, Jul (monsoon)
  if (offMonths.includes(month)) return -0.2;
  if (peakMonths.includes(month) && ["Heritage","Temple","Fort","Museum"].includes(category)) return 0.25;
  if ([3, 4].includes(month) && ["Beach","Waterfall"].includes(category)) return 0.15; // Apr-May beaches
  return 0;
}

function bestTimeHint(category) {
  const hints = {
    "Temple": "Early morning 6–8am", "Museum": "Weekday mornings",
    "Fort": "Weekday 8–10am", "Waterfall": "Early morning",
    "Hill": "Sunrise or sunset", "Park": "Weekday mornings",
    "Heritage": "Weekday 8–10am", "Lake": "Morning golden hour",
    "Cave": "Weekday midday", "Beach": "Early morning 7–9am",
    "Nature": "Weekday mornings",
  };
  return hints[category] || "Weekday mornings";
}

// ─── HOME PAGE CITY GRID ─────────────────────────────────────
let activeCityTab = "india";

function switchCityTab(tab, el) {
  activeCityTab = tab;
  document.querySelectorAll(".city-tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  renderCityGrid(tab);
}

function renderCityGrid(tab) {
  const cities = CITY_RECOMMENDATIONS[tab] || [];
  const grid = document.getElementById("city-grid");
  grid.innerHTML = cities.map(c => `
    <div class="city-card" onclick="goExplore('${c.name}')">
      <div class="city-card-img" style="background:${c.bg}">
        ${c.emoji}
        <span class="city-card-badge">Explore →</span>
      </div>
      <div class="city-card-body">
        <div class="city-card-name">${c.name}</div>
        <div class="city-card-state">${c.state}</div>
        <div class="city-card-tags">
          ${c.tags.map(t => `<span class="city-tag">${t}</span>`).join("")}
        </div>
      </div>
    </div>
  `).join("");
}

function goExplore(city) {
  showPage("explore");
  document.getElementById("cityInput").value = city;
  document.getElementById("heroInput").value = city;
  setTimeout(() => searchCity(), 200);
}

// ─── HERO AUTOCOMPLETE ───────────────────────────────────────
function handleHeroAutocomplete(val) {
  const list = document.getElementById("hero-autocomplete");
  if (!val.trim() || val.length < 2) { list.classList.remove("open"); return; }
  const matches = POPULAR_CITIES.filter(c => c.name.toLowerCase().startsWith(val.toLowerCase())).slice(0, 6);
  if (!matches.length) { list.classList.remove("open"); return; }
  list.innerHTML = matches.map(c => `
    <div class="ac-item" onclick="selectHeroCity('${c.name}')">
      <span class="ac-flag">${c.flag}</span>
      <span class="ac-name">${c.name}</span>
      <span class="ac-country">${c.country}</span>
    </div>
  `).join("");
  list.classList.add("open");
}

function selectHeroCity(name) {
  document.getElementById("heroInput").value = name;
  document.getElementById("hero-autocomplete").classList.remove("open");
  goExplore(name);
}

function heroSearch() {
  const val = document.getElementById("heroInput").value.trim();
  if (!val) { toast("Enter a city to explore"); return; }
  goExplore(val);
}

// ─── SIDEBAR AUTOCOMPLETE ────────────────────────────────────
function handleAutocomplete(val) {
  const list = document.getElementById("autocomplete-list");
  if (!val.trim() || val.length < 2) { list.classList.remove("open"); return; }
  const matches = POPULAR_CITIES.filter(c => c.name.toLowerCase().startsWith(val.toLowerCase())).slice(0, 5);
  if (!matches.length) { list.classList.remove("open"); return; }
  list.innerHTML = matches.map(c => `
    <div class="ac-item" onclick="selectCity('${c.name}')">
      <span class="ac-flag">${c.flag}</span>
      <span class="ac-name">${c.name}</span>
      <span class="ac-country">${c.country}</span>
    </div>
  `).join("");
  list.classList.add("open");
}

function selectCity(name) {
  document.getElementById("cityInput").value = name;
  document.getElementById("autocomplete-list").classList.remove("open");
  searchCity();
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#sidebar-search-container")) {
    document.getElementById("autocomplete-list")?.classList.remove("open");
  }
  if (!e.target.closest("#hero-search-container")) {
    document.getElementById("hero-autocomplete")?.classList.remove("open");
  }
});

// ─── PAGE NAVIGATION ─────────────────────────────────────────
let currentPage = "home";

function showPage(name) {
  const pageEl = document.getElementById(`page-${name}`);
  if (!pageEl) return;
  currentPage = name;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  pageEl.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));
  const navEl = document.getElementById(`nav-${name}`);
  if (navEl) navEl.classList.add("active");

  document.querySelectorAll(".mob-nav-item").forEach(a => a.classList.remove("active"));
  const mnavEl = document.getElementById(`mnav-${name}`);
  if (mnavEl) mnavEl.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "saved") renderSaved();
  if (name === "planner") {
    const plannerCityEl = document.getElementById("planner-city");
    if (plannerCityEl && !plannerCityEl.value.trim() && currentCity) {
      plannerCityEl.value = capitalize(currentCity);
    }
    if (!plannerPlaces.length && globalPlaces.length) {
      plannerPlaces = globalPlaces.slice(0, 30);
    }
    renderPlannerSidebar();
  }
  if (name === "trending") renderTrending();
  if (name === "explore") {
    if (!map) initMap(currentLat, currentLon);
  }
}

// ─── MAP ─────────────────────────────────────────────────────
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function initMap(lat = 18.5204, lon = 73.8567) {
  if (!map) {
    map = L.map("map", { zoomControl: false }).setView([lat, lon], 12);
    tileLayer = L.tileLayer(TILE_LIGHT, {
      attribution: "© OpenStreetMap contributors © CARTO", maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
  } else {
    map.setView([lat, lon], 12);
  }
  setTimeout(() => map?.invalidateSize(), 200);
}

function toggleMapStyle() {
  mapStyleDark = !mapStyleDark;
  const btn = document.getElementById("map-style-btn");
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(mapStyleDark ? TILE_DARK : TILE_LIGHT, {
    attribution: "© OpenStreetMap contributors © CARTO", maxZoom: 19
  }).addTo(map);
  btn.textContent = mapStyleDark ? "🌙 Dark" : "🗺 Standard";
  btn.classList.toggle("active", !mapStyleDark);
}

function fitMapToBounds() {
  if (currentBounds.length) map.fitBounds(currentBounds, { padding: [40, 40] });
}

function makeMarkerIcon(index, crowdLevel, isHot) {
  const colorMap = { low: "#1E6B44", medium: "#9A6216", high: "#B83030" };
  const dotColor = colorMap[crowdLevel] || "#918C80";
  const size = isHot ? 34 : 26;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${isHot?"#C4451A":"#fff"};color:${isHot?"#fff":"#1C1A15"};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:${isHot?"12px":"10px"};font-weight:700;box-shadow:0 3px 12px rgba(0,0,0,0.22);border:2.5px solid ${isHot?"rgba(255,255,255,0.8)":"#E2DAC9"};position:relative;">${index+1}
      <span style="position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:${dotColor};border:1.5px solid #fff;"></span>
    </div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2]
  });
}

// ─── SEARCH ──────────────────────────────────────────────────
async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) { toast("Enter a city name first"); return; }
  const gen = ++loadGeneration;
  exitMapFocusMode();
  document.getElementById("autocomplete-list").classList.remove("open");
  showPage("explore");
  toast(`Exploring ${city}…`);
  showSkeletons();
  try {
    const geo = await API.geocode(city);
    if (gen !== loadGeneration) return;
    currentCity = city;
    currentLat = geo.lat;
    currentLon = geo.lng;
    document.getElementById("map-badge").textContent = `📍 ${capitalize(city)}`;
    initMap(geo.lat, geo.lng);
    await Promise.all([
      loadPlaces(geo.lat, geo.lng, gen),
      loadWeather(geo.lat, geo.lng, gen)
    ]);
  } catch (e) {
    if (gen !== loadGeneration) return;
    toast("Couldn't find that city — try another");
    console.error(e);
  }
}

// ─── PLACES ──────────────────────────────────────────────────

// Only these OpenTripMap kind substrings are TOURIST places
const TOURIST_KINDS_WHITELIST = [
  "waterfall","mountain","hill_top","plateau","valley","gorge","volcano",
  "beach","cape","island","lake","river_waterfall","natural",
  /* religious kinds handled separately — deprioritized unless curated */
  "fort","castle","tower","ruins","archaeological_site","prehistoric","megalith",
  "museum","art_gallery","exhibition","planetarium","aquarium","zoo","botanical_garden",
  "monument","memorial","statue","mausoleum","tomb",
  "historic_architecture","palace","manor","estate",
  "national_park","nature_reserve","wildlife_park","safari","wildlife_sanctuary",
  "garden","amusement_park","theme_park","viewpoint","observation_deck",
  "cave","grotto","glacier","hot_spring","geyser","delta","lagoon","reef","cliff",
  "heritage","world_heritage","historic_district","old_town",
];

// Block ANY place whose name or kinds contains these — non-tourist
const BLOCKLIST_NAMES = [
  "college","university","school","institute","iit","nit","iim","hospital",
  "bank","atm","police","court","jail","prison","office","headquarters",
  "factory","plant","warehouse","depot","terminal","junction","railway station",
  "bus stand","airport","petrol","pump","service station","petrol pump",
  "hotel","lodge","inn","hostel","resort","homestay", // exclude accommodation from tourist places
  "mall","market","bazaar","shop","store","supermarket","hypermarket",
  "clinic","pharmacy","dispensary","medical","nursing home",
  "church hall","community hall","town hall","municipal",
  "residential","apartment","society","colony","sector",
  "cemetery","crematorium","burial",
  "flyover","bridge","highway","road","street","chowk","circle","roundabout",
];

const RELIGIOUS_KINDS = ["temple","church","cathedral","monastery","mosque","synagogue","pagoda","shrine"];
const PRIORITY_KINDS = ["monument","museum","fort","palace","ruins","archaeological","viewpoint","beach","national_park","waterfall","historic","heritage","world_heritage","amusement","tower","memorial","garden","zoo","aquarium"];

function isReligiousOnly(p) {
  const kinds = (p.kinds || "").toLowerCase();
  if (!RELIGIOUS_KINDS.some(k => kinds.includes(k))) return false;
  return !PRIORITY_KINDS.some(k => kinds.includes(k));
}

function isTouristPlace(p) {
  if (p._curated) return true;
  const kinds = (p.kinds || "").toLowerCase();
  const name  = (p.name  || "").toLowerCase();
  const hasGoodKind = TOURIST_KINDS_WHITELIST.some(k => kinds.includes(k));
  if (!hasGoodKind) return false;
  if (isReligiousOnly(p)) return false;
  const isBlocked = BLOCKLIST_NAMES.some(b => name.includes(b) || kinds.includes(b));
  if (isBlocked) return false;
  const nameTrimmed = name.trim();
  if (nameTrimmed.split(" ").length === 1 && nameTrimmed.length < 5) return false;
  return true;
}

function placeSortScore(p) {
  if (p._curated) return 1000;
  const kinds = (p.kinds || "").toLowerCase();
  const cat = p.category || "";
  if (PRIORITY_KINDS.some(k => kinds.includes(k))) return 200;
  if (["Heritage","Museum","Fort","Beach","Park","Waterfall","Hill","Cave","Lake","Nature"].includes(cat)) return 150;
  if (cat === "Temple" || RELIGIOUS_KINDS.some(k => kinds.includes(k))) return 20;
  return 80;
}

function enrichPlaces(raw) {
  const seen = new Set();
  return raw.filter(p => {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(p => {
    const seed = hashCode(p.name);
    const category = p.category || detectCategory(p.kinds || "");
    const crowd = computeCrowd({ name: p.name, category });
    const cost = getEntryFee({ name: p.name, category });
    return {
      ...p,
      rating: p.rating ?? +(4.0 + (Math.abs(seed) % 10) / 10).toFixed(1),
      cost,
      crowd,
      category
    };
  }).sort((a, b) => placeSortScore(b) - placeSortScore(a) || b.rating - a.rating);
}

function mergeWithCurated(apiPlaces, city) {
  const curated = typeof getCuratedPlaces === "function" ? getCuratedPlaces(city) : [];
  const seen = new Set(curated.map(p => p.name.toLowerCase().trim()));
  const extra = apiPlaces.filter(p => !seen.has(p.name.toLowerCase().trim()));
  return enrichPlaces([...curated, ...extra]);
}

function isStaleLoad(gen) {
  if (gen === BOOT_GENERATION) return loadGeneration > 0;
  return gen !== loadGeneration;
}

async function loadPlaces(lat = 18.5204, lon = 73.8567, gen) {
  const myGen = gen ?? loadGeneration;
  const isBoot = myGen === BOOT_GENERATION;
  if (isBoot && loadGeneration > 0) return;
  if (!mapFocusMode) clearMarkers();
  if (!isBoot) showSkeletons();

  try {
    const data = await API.places(lat, lon);
    if (isStaleLoad(myGen)) return;

    const apiValid = (Array.isArray(data) ? data : []).filter(p =>
      p.name?.trim() && p.point?.lat && p.point?.lon && p.kinds && isTouristPlace(p)
    );
    const valid = mergeWithCurated(apiValid, currentCity);
    if (isStaleLoad(myGen)) return;

    globalPlaces = valid;
    updateCrowdSummary(valid);

    const filtered = applyFilter(applySort(valid, activeSort), activeFilter);
    if (!mapFocusMode) displayPlaces(filtered);
    updateResultsBar(currentCity, filtered.length);
    renderSidebarList(filtered);
    if (!isBoot) showPage("explore");
  } catch (e) {
    if (isStaleLoad(myGen)) return;
    toast("Couldn't load places — check connection or try another city");
    document.getElementById("places").innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗺️</div>
        <h2>No results found</h2>
        <p>Try another city or refresh</p>
      </div>`;
    console.error(e);
  }
}

function updateCrowdSummary(places) {
  const low  = places.filter(p => p.crowd.level === "low").length;
  const med  = places.filter(p => p.crowd.level === "medium").length;
  const high = places.filter(p => p.crowd.level === "high").length;
  document.getElementById("scs-low").textContent = low;
  document.getElementById("scs-med").textContent = med;
  document.getElementById("scs-high").textContent = high;
  document.getElementById("sidebar-crowd-summary").classList.add("visible");
}

// ─── HOSTEL DATA ─────────────────────────────────────────────
// Realistic hostel chains & types present in Indian + global cities
const HOSTEL_CHAINS = [
  { name: "Zostel",         type: "Party Hostel",    emoji: "🎉", rating: 4.4, priceRange: [350, 700],  amenities: ["WiFi","Common Room","Bar","Events","AC Dorm"] },
  { name: "Backpacker Panda",type:"Social Hostel",   emoji: "🐼", rating: 4.3, priceRange: [400, 800],  amenities: ["WiFi","Kitchen","Lockers","Female Dorm"] },
  { name: "GoStel",          type: "Budget Hostel",  emoji: "🛏",  rating: 4.1, priceRange: [250, 500],  amenities: ["WiFi","Hot Water","Locker","Common Area"] },
  { name: "The Hosteller",   type: "Social Hostel",  emoji: "🏡", rating: 4.5, priceRange: [500, 900],  amenities: ["WiFi","Rooftop","Events","AC","Breakfast opt."] },
  { name: "Moustache Hostel",type: "Boutique Hostel",emoji: "👨", rating: 4.6, priceRange: [450, 850],  amenities: ["WiFi","Pool","Bar","Café","AC Dorm"] },
  { name: "Roadhouse Hostel",type: "Budget Hostel",  emoji: "🏠", rating: 4.2, priceRange: [300, 600],  amenities: ["WiFi","Lockers","Kitchen","Mixed Dorm"] },
  { name: "Treebo Hostel",   type: "Budget Hotel",   emoji: "🌳", rating: 4.0, priceRange: [500, 1000], amenities: ["WiFi","AC","24hr Reception","Hot Water"] },
  { name: "OYO Townhouse",   type: "Budget Hotel",   emoji: "🏩", rating: 3.9, priceRange: [600, 1200], amenities: ["WiFi","AC","Room Service","24hr Reception"] },
];

const HOSTEL_AREAS = {
  "mumbai":    ["Colaba","Bandra","Andheri","Fort Area","Juhu"],
  "delhi":     ["Paharganj","Karol Bagh","Connaught Place","Hauz Khas","Lajpat Nagar"],
  "bangalore": ["Koramangala","Indiranagar","MG Road","HSR Layout","Whitefield"],
  "pune":      ["Koregaon Park","Shivajinagar","Camp Area","Kothrud","Viman Nagar"],
  "jaipur":    ["MI Road","Bani Park","Sindhi Camp","Civil Lines","C-Scheme"],
  "goa":       ["Panaji","Calangute","Anjuna","Arambol","Vagator"],
  "hyderabad": ["Banjara Hills","Madhapur","Begumpet","Hitech City","Jubilee Hills"],
  "chennai":   ["T Nagar","Anna Nagar","Egmore","Mylapore","Adyar"],
  "kolkata":   ["Park Street","New Market","Esplanade","Tollygunge","Salt Lake"],
  "agra":      ["Taj Ganj","Sadar Bazar","Fatehabad Road","Civil Lines"],
  "varanasi":  ["Assi Ghat","Dashashwamedh","Bengali Tola","Lanka"],
  "udaipur":   ["City Palace Area","Fateh Sagar","Ambamata","Chetak"],
  "manali":    ["Old Manali","Mall Road","Vashisht","Aleo"],
  "rishikesh": ["Lakshman Jhula","Ram Jhula","Tapovan","High Bank"],
  "default":   ["City Centre","Old Town","Near Railway Station","Tourist Area","Market Area"],
};

let globalHostels = [];

function generateHostelsForCity(cityName) {
  const city = cityName.toLowerCase();
  const areas = HOSTEL_AREAS[city] || HOSTEL_AREAS["default"];
  const seed = Math.abs(hashCode(cityName));

  // Pick 6 hostels deterministically per city
  const count = 6;
  const hostels = [];
  for (let i = 0; i < count; i++) {
    const chain = HOSTEL_CHAINS[(seed + i * 3) % HOSTEL_CHAINS.length];
    const area  = areas[(seed + i) % areas.length];
    const price = chain.priceRange[0] + ((seed + i * 7) % (chain.priceRange[1] - chain.priceRange[0]));
    // Vary rating slightly per city
    const ratingVar = ((seed + i) % 5) * 0.1;
    const rating = Math.min(5.0, +(chain.rating + ratingVar - 0.2).toFixed(1));
    // Hostel-specific crowd (hostels tend to be busiest evenings)
    const hostelCrowd = computeCrowd({ name: chain.name + cityName, category: "Park" });

    hostels.push({
      id: `hostel-${i}`,
      name: `${chain.name} ${capitalize(cityName)}`,
      chain: chain.name,
      type: chain.type,
      emoji: chain.emoji,
      area,
      price: Math.round(price / 50) * 50, // round to nearest ₹50
      rating,
      amenities: chain.amenities,
      crowd: hostelCrowd,
      cityName,
    });
  }
  return hostels;
}

function loadHostels(cityName) {
  globalHostels = generateHostelsForCity(cityName);
  renderHostels(globalHostels);
}

function renderHostels(hostels) {
  const grid = document.getElementById("hostels-grid");
  if (!grid) return;
  if (!hostels.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏨</div><h2>No hostels found</h2><p>Try searching a city first</p></div>`;
    return;
  }

  grid.innerHTML = hostels.map((h, i) => {
    const crowdCls   = { low:"low-s", medium:"med-s", high:"high-s" }[h.crowd.level];
    const crowdLabel = { low:"Low", medium:"Moderate", high:"Busy" }[h.crowd.level];
    const isSaved = savedPlaces.some(s => s.name === h.name && s._isHostel);
    const rid = registerPlace({ ...h, _isHostel: true, cost: h.price, category: "Hostel", point: { lat: currentLat + ((i-3)*0.005), lon: currentLon + ((i-3)*0.005) } });

    return `
    <div class="hostel-card-full" style="animation-delay:${i*0.05}s">
      <div class="hcf-left">
        <div class="hcf-emoji">${h.emoji}</div>
        <div class="hcf-info">
          <div class="hcf-name">${h.name}</div>
          <div class="hcf-type">${h.type}</div>
          <div class="hcf-area">📍 ${h.area}</div>
          <div class="hcf-amenities">
            ${h.amenities.map(a => `<span class="hcf-tag">${a}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="hcf-right">
        <div class="hcf-rating">⭐ ${h.rating}</div>
        <div class="hcf-price">₹${h.price.toLocaleString("en-IN")}<span class="hcf-price-sub">/night</span></div>
        <div class="hcf-crowd-row">
          <span class="crowd-status ${crowdCls}"><span class="cs-dot"></span>${crowdLabel}</span>
        </div>
        <div class="hcf-actions">
          <button class="hcf-save-btn ${isSaved?'saved':''}" onclick="toggleHostelSave('${rid}',this)">
            ${isSaved?"💙 Saved":"🔖 Save"}
          </button>
          <button class="hcf-add-btn" onclick="addHostelToPlanner('${rid}')">✈ Add to Plan</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

function toggleHostelSave(rid, btn) {
  const h = getPlace(rid);
  if (!h) return;
  const idx = savedPlaces.findIndex(s => s.name === h.name && s._isHostel);
  if (idx === -1) {
    savedPlaces.push({ ...h, savedAt: Date.now(), savedCity: currentCity });
    btn.textContent = "💙 Saved"; btn.classList.add("saved");
    toast(`🔖 Saved: ${h.name}`);
  } else {
    savedPlaces.splice(idx, 1);
    btn.textContent = "🔖 Save"; btn.classList.remove("saved");
    toast(`Removed: ${h.name}`);
  }
  localStorage.setItem("tx_saved", JSON.stringify(savedPlaces));
  updateSavedBadge();
}

function addHostelToPlanner(rid) {
  addPlaceToDay(rid, 0);
  toast("🏨 Hostel added to Day 1 of your plan");
}
function kelvinToC(k) {
  return k > 120 ? k - 273.15 : k;
}

async function loadWeather(lat = 18.5204, lon = 73.8567, gen) {
  const myGen = gen ?? loadGeneration;
  if (myGen === BOOT_GENERATION && loadGeneration > 0) return;
  try {
    const w = await API.weather(lat, lon);
    if (isStaleLoad(myGen)) return;
    const temp = kelvinToC(w.main.temp).toFixed(1);
    const feelsLike = kelvinToC(w.main.feels_like).toFixed(1);
    weatherCache = {
      temp: `${temp}°C`, sky: w.weather[0].main,
      humidity: `${w.main.humidity}%`, wind: `${(w.wind.speed * 3.6).toFixed(1)} km/h`,
      feelsLike: `${feelsLike}°C`, description: capitalize(w.weather[0].description)
    };
    document.getElementById("sw-city-name").textContent = capitalize(currentCity);
    document.getElementById("sw-temp").textContent  = weatherCache.temp;
    document.getElementById("sw-sky").textContent   = weatherCache.sky;
    document.getElementById("sw-hum").textContent   = weatherCache.humidity;
    document.getElementById("sw-wind").textContent  = weatherCache.wind;
    document.getElementById("sw-feels").textContent = weatherCache.feelsLike;
    document.getElementById("sw-desc").textContent  = weatherCache.description;
    document.getElementById("sidebar-weather").classList.add("visible");
  } catch {
    if (isStaleLoad(myGen)) return;
    console.warn("Weather unavailable");
  }
}

// ─── DISPLAY PLACES ──────────────────────────────────────────
const STRIPE_COLORS = {
  "Temple":"#C4451A","Museum":"#2456A4","Fort":"#744210",
  "Waterfall":"#0D7A5F","Hill":"#1E6B44","Park":"#1E6B44",
  "Heritage":"#7B341E","Lake":"#1A6B8C","Cave":"#553C9A",
  "Beach":"#C05621","Nature":"#276749",
};
const CAT_BG = {
  "Temple":"rgba(196,69,26,0.1)","Museum":"rgba(36,86,164,0.1)","Fort":"rgba(116,66,16,0.1)",
  "Waterfall":"rgba(13,122,95,0.1)","Hill":"rgba(30,107,68,0.1)","Park":"rgba(30,107,68,0.1)",
  "Heritage":"rgba(123,52,30,0.1)","Lake":"rgba(26,107,140,0.1)","Cave":"rgba(85,60,154,0.1)",
  "Beach":"rgba(192,86,33,0.1)","Nature":"rgba(39,103,73,0.1)",
};

function displayPlaces(places) {
  if (!map) {
  console.error("Map not initialized");
  return;
}
  const container = document.getElementById("places");
  container.innerHTML = "";
  clearMarkers();
  currentBounds = [];

  if (!places.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔭</div><h2>No places match</h2><p>Try a different filter or sort</p></div>`;
    return;
  }

  places.slice(0, 30).forEach((place, i) => {
    const { lat, lon } = place.point;
    const isHot = i < 5;
    const crowd = place.crowd;
    const isSaved = savedPlaces.some(s => s.name === place.name);
    const stripeColor = STRIPE_COLORS[place.category] || "#918C80";
    const catBg = CAT_BG[place.category] || "rgba(145,140,128,0.1)";
    const catColor = stripeColor;
    const crowdLevelCls = { low: "low-s", medium: "med-s", high: "high-s" }[crowd.level];
    const crowdLabel = { low: "Low Crowd", medium: "Moderate", high: "High Crowd" }[crowd.level];

    currentBounds.push([lat, lon]);

    // Map marker
    const marker = L.marker([lat, lon], { icon: makeMarkerIcon(i, crowd.level, isHot) }).addTo(map);
    marker.bindPopup(buildMarkerPopup(place));
    marker.on("click", () => openModal(place));
    markers.push(marker);

    // Card
    const card = document.createElement("div");
    card.className = "place-card";
    card.style.animationDelay = `${i * 0.04}s`;

    card.innerHTML = `
      <div class="place-card-header">
        <span class="place-cat-badge" style="background:${catBg};color:${catColor}">${isHot ? "🔥 HOT" : place.category}</span>
        <div class="place-rating"><span class="stars">${renderStars(place.rating)}</span> ${place.rating}</div>
      </div>
      <div class="place-card-body">
        <div class="place-name">${place.name}</div>
        <div class="place-kind">${place.category} · #${i + 1} in ${capitalize(currentCity)}</div>
        <div class="place-stats">
          <div class="place-stat">
            <div class="place-stat-label">Entry Fee</div>
            <div class="place-stat-val price-stat-val" data-place-name="${escapeAttr(place.name)}">${renderPriceShimmer()}</div>
          </div>
          <div class="place-stat">
            <div class="place-stat-label">Weather</div>
            <div class="place-stat-val">${weatherCache?.temp ?? "—"} ${weatherCache?.sky ?? ""}</div>
          </div>
        </div>
        <div class="crowd-section">
          <div class="crowd-header">
            <span class="crowd-label">Crowd Now</span>
            <span class="crowd-status ${crowdLevelCls}">
              <span class="cs-dot"></span>${crowdLabel}
            </span>
          </div>
          <div class="crowd-track">
            <div class="crowd-fill ${crowd.level}" style="width:${crowd.score}%"></div>
          </div>
          <div class="crowd-hint">${crowd.peakHint}</div>
        </div>
        <div class="best-visit-hint">⏰ Best: ${bestTimeHint(place.category)}</div>
      </div>
      <div class="place-card-footer">
        <span class="pf-left">📍 ${place.kinds?.split(",")[0]?.replace(/_/g," ") ?? place.category}</span>
        <div class="pf-actions">
          <button class="save-btn ${isSaved ? 'saved' : ''}" data-name="${place.name}" title="${isSaved ? 'Unsave' : 'Save'}">
            ${isSaved ? '💙' : '🔖'}
          </button>
          <span class="details-link">Details →</span>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".save-btn")) return;
      openModal(place);
    });
    card.querySelector(".save-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSave(place, card.querySelector(".save-btn"));
    });

    const priceEl = card.querySelector(".price-stat-val");
    fetchPlacePrice(place, {
      onUpdate: () => {
        updatePriceEl(priceEl, place);
        refreshMiniCostForPlace(place);
        if (markers[i]) {
          markers[i].setPopupContent(buildMarkerPopup(place));
        }
      },
    });

    container.appendChild(card);
  });

  if (currentBounds.length) map.fitBounds(currentBounds, { padding: [40, 40] });
}

// ─── SIDEBAR MINI LIST ───────────────────────────────────────
function renderSidebarList(places) {
  const list = document.getElementById("sidebar-places-list");
  if (!places.length) { list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">No results</div>`; return; }

  list.innerHTML = places.slice(0, 25).map((p, i) => {
    const dotColor = { low: "#1E6B44", medium: "#9A6216", high: "#B83030" }[p.crowd.level];
    const isHot = i < 5;
    return `
      <div class="mini-card" onclick="openModal(window.__places__[${i}])">
        <div class="mini-card-num ${isHot ? 'hot' : ''}">${i + 1}</div>
        <div class="mini-card-info">
          <div class="mini-card-name">${p.name}</div>
          <div class="mini-card-sub">
            <span class="mini-crowd-dot" style="background:${dotColor}"></span>
            ${p.category}
          </div>
        </div>
        <div class="mini-cost" data-place-name="${escapeAttr(p.name)}">${p.priceData?.priceDisplay ?? (p.cost === 0 ? "Free" : "₹" + p.cost)}</div>
      </div>
    `;
  }).join("");

  // Store reference for onclick
  window.__places__ = places;
}

// ─── MODAL ───────────────────────────────────────────────────
const TRAVEL_TIPS = {
  "Temple":    "Remove footwear at the entrance. Early morning puja is a magical experience.",
  "Museum":    "Photography may require a ticket. Weekday mornings have the least crowds.",
  "Fort":      "Wear comfortable shoes — uneven terrain. Carry water and sunscreen.",
  "Waterfall": "Check monsoon advisories. Rocks can be slippery — exercise caution.",
  "Hill":      "Start early for sunrise. Carry warm layers — temperatures drop quickly.",
  "Park":      "Great for morning walks and picnics. Dogs usually welcome.",
  "Heritage":  "Book tickets online to skip queues, especially on weekends.",
  "Lake":      "Sunrise and sunset are magical. Boat rides often available nearby.",
  "Cave":      "Bring a torch. Watch head clearance. Great for hot-weather escapes.",
  "Beach":     "Check tide times before visiting. Lifeguards may not always be present.",
  "Nature":    "Stick to marked trails. Carry insect repellent, water and snacks.",
};

function openModal(place) {
  modalPlace = place;
  const crowd = place.crowd;
  const isSaved = savedPlaces.some(s => s.name === place.name);
  const stripeColor = STRIPE_COLORS[place.category] || "#918C80";
  const crowdLabel = { low: "🟢 Low Crowd", medium: "🟡 Moderate Crowd", high: "🔴 High Crowd" }[crowd.level];
  const crowdCls = { low: "low-s", medium: "med-s", high: "high-s" }[crowd.level];

  document.getElementById("modal-cat").textContent     = place.category.toUpperCase();
  document.getElementById("modal-title").textContent   = place.name;
  document.getElementById("modal-stars").textContent   = renderStars(place.rating);
  document.getElementById("modal-rating").textContent  = `${place.rating} / 5.0`;
  document.getElementById("modal-city").textContent    = capitalize(currentCity);
  const modalCostEl = document.getElementById("modal-cost");
  if (place.priceData) updatePriceEl(modalCostEl, place);
  else {
    modalCostEl.innerHTML = renderPriceShimmer();
    fetchPlacePrice(place, { onUpdate: () => updatePriceEl(modalCostEl, place) });
  }
  document.getElementById("modal-cat2").textContent    = place.category;
  document.getElementById("modal-best-time").textContent = bestTimeHint(place.category);
  document.getElementById("modal-weather").textContent = weatherCache?.temp ?? "—";
  document.getElementById("modal-weather-sub").textContent = weatherCache?.sky ?? "—";
  document.getElementById("modal-accent-bar").style.background = stripeColor;
  document.getElementById("modal-crowd-status").textContent = crowdLabel;
  document.getElementById("modal-crowd-status").className = `modal-crowd-status ${crowdCls}`;
  document.getElementById("modal-crowd-fill").style.width = `${crowd.score}%`;
  document.getElementById("modal-crowd-fill").className = `crowd-fill ${crowd.level}`;
  document.getElementById("modal-crowd-time").textContent = `Score: ${crowd.score}/100`;
  document.getElementById("modal-peak-hint").textContent = crowd.peakHint;
  document.getElementById("modal-tip").textContent = TRAVEL_TIPS[place.category] || "Great place worth visiting!";
  document.getElementById("modal-save-text").textContent = isSaved ? "💙 Saved!" : "🔖 Save";

  // Hourly forecast chart
  renderHourlyChart(crowd.hourlyForecast || []);

  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function renderHourlyChart(forecast) {
  const barsEl = document.getElementById("hourly-bars");
  const timesEl = document.getElementById("hourly-times");
  const currentHour = new Date().getHours();
  // Show 6am–10pm (hours 6–22)
  const hours = Array.from({length: 17}, (_, i) => i + 6);
  const vals = hours.map(h => forecast[h] || 40);
  const maxVal = Math.max(...vals, 1);

  const colorFn = v => v < 38 ? "#1E6B44" : v < 65 ? "#9A6216" : "#B83030";

  barsEl.innerHTML = hours.map((h, i) => {
    const v = vals[i];
    const pct = Math.round((v / maxVal) * 100);
    const isCurrent = h === currentHour;
    const ampm = h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;
    return `<div class="hbar ${isCurrent ? 'current' : ''}" 
      style="height:${pct}%;background:${isCurrent ? '#C4451A' : colorFn(v)};opacity:${isCurrent?1:0.65};"
      data-tip="${ampm}: ${v}% crowd" title="${ampm}: ${v}% crowd"></div>`;
  }).join("");

  // Show labels at every 3 hours
  timesEl.innerHTML = hours.map((h, i) => {
    const ampm = h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`;
    return `<div class="hourly-time">${i % 3 === 0 ? ampm : ""}</div>`;
  }).join("");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  modalPlace = null;
}

document.getElementById("modal-overlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

function toggleSaveFromModal() {
  if (!modalPlace) return;
  toggleSave(modalPlace, null);
  const isSaved = savedPlaces.some(s => s.name === modalPlace.name);
  document.getElementById("modal-save-text").textContent = isSaved ? "💙 Saved!" : "🔖 Save";
}


function makeFocusMarkerIcon() {
  return L.divIcon({
    className: "pulse-marker-wrap",
    html: `<span class="pulse-marker">📍</span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  });
}

function clearFocusMarker() {
  if (focusMarker && map) {
    map.removeLayer(focusMarker);
    focusMarker = null;
  }
}

function hideDirectionsPanel() {
  document.getElementById("directions-panel")?.classList.remove("visible");
  document.getElementById("map-section")?.classList.remove("focus-mode");
}

function showDirectionsPanel(place) {
  const crowd = place.crowd;
  const crowdLabel = { low: "🟢 Low crowd", medium: "🟡 Moderate crowd", high: "🔴 High crowd" }[crowd.level];
  document.getElementById("dp-name").textContent = place.name;
  document.getElementById("dp-category").textContent = place.category;
  document.getElementById("dp-crowd").textContent = crowdLabel || "—";
  document.getElementById("dp-best-time").textContent = `Best visit: ${bestTimeHint(place.category)}`;
  document.getElementById("directions-panel").classList.add("visible");
  document.getElementById("map-section").classList.add("focus-mode");
  setTimeout(() => map?.invalidateSize(), 350);
}

function showFocusOnMap(place) {
  if (!map || !place?.point) return;
  // Set state FIRST before any DOM changes
  focusedPlace = place;
  mapFocusMode = true;
  clearMarkers();
  clearFocusMarker();
  focusMarker = L.marker([place.point.lat, place.point.lon], { icon: makeFocusMarkerIcon() }).addTo(map);
  map.invalidateSize();
  map.flyTo([place.point.lat, place.point.lon], 16, { duration: 1.2 });
  // Show panel after invalidateSize settles — no exitMapFocusMode in between
  requestAnimationFrame(() => showDirectionsPanel(place));
}

function showAllPlacesOnMap() {
  exitMapFocusMode();
  const filtered = applyFilter(applySort(globalPlaces, activeSort), activeFilter);
  displayPlaces(filtered);
}

function openDirections() {
  const place = focusedPlace || modalPlace;
  if (!place?.point) return;
  const dest = `${place.point.lat},${place.point.lon}`;
  const openMaps = (origin) => {
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    window.open(url, "_blank");
  };
  if (!navigator.geolocation) {
    openMaps(null);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => openMaps(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => openMaps(null),
    { timeout: 8000, maximumAge: 60000 }
  );
}

function viewOnMapFromModal() {
  if (!modalPlace) return;
  const place = modalPlace;
  closeModal();
  // Set focus state BEFORE showPage so nothing can clear it
  focusedPlace = place;
  mapFocusMode = true;
  showPage("explore");
  // showPage no longer calls invalidateSize; map init happens here if needed
  if (!map) initMap(place.point.lat, place.point.lon);
  setTimeout(() => showFocusOnMap(place), 400);
}

function addModalPlaceToPlanner() {
  if (!modalPlace) return;
  if (plannerDays.length === 1) {
    closeModal();
    showPage("planner");
    addPlaceToDay(modalPlace, 0);
    return;
  }
  // Show day picker inline in modal
  const existing = document.getElementById("modal-day-picker");
  if (existing) { existing.remove(); return; }
  const picker = document.createElement("div");
  picker.id = "modal-day-picker";
  picker.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center";
  picker.innerHTML = plannerDays.map((_, i) => `<button class="modal-btn modal-btn-secondary" style="font-size:12px;padding:6px 12px" onclick="closeModal();showPage('planner');addPlaceToDay(window.__modalPlace__,${i})">Day ${i+1} +</button>`).join("");
  window.__modalPlace__ = modalPlace;
  document.querySelector(".modal-actions").after(picker);
  toast("Pick a day →");
}

// ─── SAVE SYSTEM ─────────────────────────────────────────────
function toggleSave(place, btn) {
  const idx = savedPlaces.findIndex(s => s.name === place.name);
  if (idx === -1) {
    savedPlaces.push({
  ...place,
  savedAt: Date.now(),
  savedCity: currentCity
});
    toast(`🔖 Saved: ${place.name}`);
    if (btn) { btn.textContent = "💙"; btn.classList.add("saved"); }
  } else {
    savedPlaces.splice(idx, 1);
    toast(`Removed: ${place.name}`);
    if (btn) { btn.textContent = "🔖"; btn.classList.remove("saved"); }
  }
  localStorage.setItem("tx_saved", JSON.stringify(savedPlaces));
  updateSavedBadge();
}

function updateSavedBadge() {
  const badge = document.getElementById("saved-badge");
  if (savedPlaces.length > 0) {
    badge.textContent = savedPlaces.length;
    badge.classList.add("show");
  } else {
    badge.classList.remove("show");
  }
}

// ─── SAVED PAGE ──────────────────────────────────────────────
function renderSaved() {
  const grid = document.getElementById("saved-grid");
  const cities = [...new Set(savedPlaces.map(p => p.savedCity))];
  const avgCost = savedPlaces.length ? Math.round(savedPlaces.reduce((a, p) => a + getEffectivePrice(p), 0) / savedPlaces.length) : 0;
  const lowCrowdCount = savedPlaces.filter(p => p.crowd?.level === "low").length;

  document.getElementById("stat-total").textContent  = savedPlaces.length;
  document.getElementById("stat-cities").textContent = cities.length;
  document.getElementById("stat-budget").textContent = `₹${avgCost}`;
  document.getElementById("stat-low").textContent    = lowCrowdCount;

  if (!savedPlaces.length) {
    grid.innerHTML = `
      <div class="saved-empty">
        <div class="se-icon">🔖</div>
        <h2>No saved places yet</h2>
        <p>Explore cities and save places you'd love to visit</p>
        <button class="btn-primary" onclick="showPage('explore')">Start Exploring →</button>
      </div>`;
    return;
  }

  grid.innerHTML = savedPlaces.map((place, i) => {
    const color = STRIPE_COLORS[place.category] || "#918C80";
    const crowdEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[place.crowd?.level] ?? "⚪";
    const date = new Date(place.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `
      <div class="saved-card" style="animation-delay:${i * 0.04}s">
        <div class="saved-card-stripe" style="background:${color}"></div>
        <div class="saved-card-body">
          <div class="saved-card-meta">
            <span class="saved-card-city">${capitalize(place.savedCity)}</span>
            <span class="saved-card-date">Saved ${date}</span>
          </div>
          <div class="saved-card-name">${place.name}</div>
          <div class="saved-card-cat">${place.category}</div>
          <div class="saved-card-tags">
            <span class="saved-tag">⭐ ${place.rating}</span>
            <span class="saved-tag">${place.cost === 0 ? '🆓 Free' : '₹'+place.cost}</span>
            <span class="saved-tag">${crowdEmoji} ${capitalize(place.crowd?.level ?? 'unknown')}</span>
          </div>
        </div>
        <div class="saved-card-footer">
          <button class="unsave-btn" onclick="unsavePlace('${place.name.replace(/'/g,"\\'")}')">✕ Remove</button>
          <button class="visit-map-btn" onclick="goToPlaceOnMap('${place.name.replace(/'/g,"\\'")}')">📍 View on Map →</button>
        </div>
      </div>`;
  }).join("");
}

function unsavePlace(name) {
  const idx = savedPlaces.findIndex(s => s.name === name);
  if (idx !== -1) {
    const removed = savedPlaces.splice(idx, 1)[0];
    localStorage.setItem("tx_saved", JSON.stringify(savedPlaces));
    updateSavedBadge();
    toast(`Removed: ${removed.name}`);
    renderSaved();
  }
}

function goToPlaceOnMap(name) {
  const place = savedPlaces.find(s => s.name === name);
  if (!place?.point) return;
  showPage("explore");
  setTimeout(() => showFocusOnMap(place), 400);
}

// ─── TRENDING ────────────────────────────────────────────────
const TRENDING_DATA = [
  { name: "Gateway of India",   city: "Mumbai",           emoji: "🏛", rating: 4.7, visits: 98,  spike: "+34%" },
  { name: "Amber Fort",         city: "Jaipur",           emoji: "🏰", rating: 4.8, visits: 95,  spike: "+28%" },
  { name: "Taj Mahal",          city: "Agra",             emoji: "🕌", rating: 4.9, visits: 100, spike: "+12%" },
  { name: "Ellora Caves",       city: "Aurangabad",       emoji: "🗿", rating: 4.7, visits: 76,  spike: "+41%" },
  { name: "Havelock Island",    city: "Andaman",          emoji: "🏝", rating: 4.8, visits: 84,  spike: "+55%" },
  { name: "Valley of Flowers",  city: "Uttarakhand",      emoji: "🌸", rating: 4.9, visits: 72,  spike: "+67%" },
  { name: "Coorg Coffee Estates",city:"Karnataka",        emoji: "☕", rating: 4.6, visits: 68,  spike: "+22%" },
  { name: "Pangong Tso",        city: "Ladakh",           emoji: "🏔", rating: 4.9, visits: 61,  spike: "+89%" },
  { name: "Dudhsagar Falls",    city: "Goa",              emoji: "💧", rating: 4.7, visits: 79,  spike: "+18%" },
  { name: "Ranthambore",        city: "Rajasthan",        emoji: "🦁", rating: 4.5, visits: 64,  spike: "+31%" },
  { name: "Ziro Valley",        city: "Arunachal Pradesh",emoji: "🌾", rating: 4.8, visits: 45,  spike: "+112%" },
  { name: "Majuli Island",      city: "Assam",            emoji: "🛶", rating: 4.6, visits: 52,  spike: "+76%" },
];
const TREND_BG = ["#FEF3C7","#DBEAFE","#D1FAE5","#FCE7F3","#EDE9FE","#FFEDD5","#F0FDF4","#E0F2FE","#FDF2F8","#ECFDF5","#FFF7ED","#F0F9FF"];

function renderTrending() {
  const grid = document.getElementById("trending-grid");
  grid.innerHTML = TRENDING_DATA.map((t, i) => `
    <div class="trend-card" style="animation-delay:${i * 0.05}s">
      <div class="trend-img" style="background:${TREND_BG[i % TREND_BG.length]}">
        <span>${t.emoji}</span>
        <span class="trend-rank">#${i + 1}</span>
        <span class="trend-spike">↑ ${t.spike}</span>
      </div>
      <div class="trend-body">
        <div class="trend-city">${t.city}</div>
        <div class="trend-name">${t.name}</div>
        <div class="trend-meta">
          <span>⭐ ${t.rating}</span>
          <span>👥 ${t.visits}% capacity</span>
        </div>
        <div class="trend-bar"><div class="trend-bar-fill" style="width:${t.visits}%"></div></div>
      </div>
    </div>
  `).join("");
}

// ─── PLACE REGISTRY (fixes broken onclick with special chars) ─
const PLACE_REGISTRY = {};
let _registryId = 0;
function registerPlace(place) {
  const id = "p" + (_registryId++);
  PLACE_REGISTRY[id] = place;
  return id;
}
function getPlace(id) { return PLACE_REGISTRY[id]; }

// ─── HOTEL DATA ──────────────────────────────────────────────
const HOTEL_TIERS = {
  budget: [
    { name: "OYO Rooms",       type: "Budget Hotel",   stars: 2, price: 600,  emoji: "🏨", amenities: ["WiFi","AC","Checkout 11am"] },
    { name: "Zostel / Hostel", type: "Hostel / Dorm",  stars: 2, price: 350,  emoji: "🛏", amenities: ["WiFi","Locker","Common Area"] },
    { name: "Treebo Budget",   type: "Budget Hotel",   stars: 2, price: 800,  emoji: "🏩", amenities: ["WiFi","AC","Breakfast opt."] },
    { name: "Guesthouse",      type: "Local Guesthouse",stars:1, price: 400,  emoji: "🏠", amenities: ["Fan","Hot Water","Homely"] },
  ],
  mid: [
    { name: "Ibis / Lemon Tree", type: "3-Star Hotel",   stars: 3, price: 2000, emoji: "🏨", amenities: ["WiFi","Pool","Breakfast","AC"] },
    { name: "FabHotel Plus",     type: "Boutique Hotel",  stars: 3, price: 1600, emoji: "🏩", amenities: ["WiFi","AC","Room Service"] },
    { name: "Treebo Trend",      type: "Business Hotel",  stars: 3, price: 1800, emoji: "🏦", amenities: ["WiFi","Gym","Breakfast"] },
    { name: "WelcomHeritage",    type: "Heritage Hotel",  stars: 3, price: 2500, emoji: "🏰", amenities: ["WiFi","Restaurant","AC"] },
  ],
  luxury: [
    { name: "Taj / ITC Hotels",    type: "5-Star Hotel",    stars: 5, price: 8000,  emoji: "🏰", amenities: ["Pool","Spa","Fine Dining","Butler"] },
    { name: "Marriott / Hyatt",    type: "5-Star Hotel",    stars: 5, price: 7000,  emoji: "🌟", amenities: ["Pool","Gym","Breakfast","Bar"] },
    { name: "Oberoi Group",        type: "Luxury Heritage", stars: 5, price: 12000, emoji: "💎", amenities: ["Spa","Pool","Concierge","Gourmet"] },
    { name: "The Leela Palace",    type: "Palace Hotel",    stars: 5, price: 10000, emoji: "🏯", amenities: ["Pool","Spa","Golf","Butler"] },
  ]
};

// Meal cost per day by hotel tier
const MEAL_COST_BY_TIER = { budget: 400, mid: 800, luxury: 2000 };
// Transport cost per day by category
const TRANSPORT_COST = { budget: 200, mid: 400, luxury: 800 };

let selectedHotelTier = "budget";
let selectedHotel = null;

function switchHotelTier(tier, el) {
  selectedHotelTier = tier;
  selectedHotel = null;
  document.querySelectorAll(".hotel-tier-tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  renderHotelGrid(tier);
  updateBudgetSummary();
}

function renderHotelGrid(tier) {
  const hotels = HOTEL_TIERS[tier] || [];
  const grid = document.getElementById("hotel-grid");
  grid.innerHTML = hotels.map((h, i) => {
    const id = `hotel-${tier}-${i}`;
    const starsStr = "★".repeat(h.stars) + "☆".repeat(5 - h.stars);
    return `
      <div class="hotel-card" id="${id}" onclick="selectHotel('${tier}',${i},'${id}')">
        <div class="hotel-emoji">${h.emoji}</div>
        <div class="hotel-stars">${starsStr}</div>
        <div class="hotel-name">${h.name}</div>
        <div class="hotel-type">${h.type}</div>
        <div class="hotel-price">₹${h.price.toLocaleString("en-IN")}<span class="hotel-price-sub">/night</span></div>
        <div class="hotel-amenities">
          ${h.amenities.map(a => `<span class="hotel-tag">${a}</span>`).join("")}
        </div>
      </div>`;
  }).join("");
}

function selectHotel(tier, idx, cardId) {
  selectedHotel = HOTEL_TIERS[tier][idx];
  document.querySelectorAll(".hotel-card").forEach(c => c.classList.remove("selected"));
  document.getElementById(cardId).classList.add("selected");
  updateBudgetSummary();
  toast(`🏨 ${selectedHotel.name} selected — ₹${selectedHotel.price.toLocaleString("en-IN")}/night`);
}
// Visit duration in minutes per category (for smart time slots)
const VISIT_DURATION = { Temple:45, Museum:90, Fort:120, Waterfall:60, Hill:75, Park:60, Heritage:90, Lake:45, Cave:60, Beach:60, Nature:60 };

let tripStartDate = null; // null = today

function getTripStartDate() {
  const el = document.getElementById("trip-start-date");
  if (el && el.value) return new Date(el.value + "T09:00:00");
  return new Date();
}

function initPlannerDays() {
  const days = parseInt(document.getElementById("planner-days").value) || 3;
  // Try to restore from localStorage
  const saved = localStorage.getItem("tx_itinerary");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      plannerDays = parsed.days || Array.from({ length: days }, () => ({ places: [] }));
      const savedDate = parsed.startDate;
      const el = document.getElementById("trip-start-date");
      if (el && savedDate) el.value = savedDate;
      renderDaysGrid();
      return;
    } catch {}
  }
  plannerDays = Array.from({ length: days }, () => ({ places: [] }));
  renderDaysGrid();
}

function savePlannerToStorage() {
  const el = document.getElementById("trip-start-date");
  localStorage.setItem("tx_itinerary", JSON.stringify({
    days: plannerDays,
    startDate: el ? el.value : ""
  }));
}

function addDay() {
  plannerDays.push({ places: [] });
  renderDaysGrid();
  renderPlannerSidebar(); // refresh day dropdowns in sidebar
}

function clearDay(di) {
  plannerDays[di].places = [];
  renderDaysGrid();
  savePlannerToStorage();
  toast(`Day ${di + 1} cleared`);
}

function resetTrip() {
  if (!confirm("Reset the entire trip? This cannot be undone.")) return;
  const days = parseInt(document.getElementById("planner-days").value) || 3;
  plannerDays = Array.from({ length: days }, () => ({ places: [] }));
  localStorage.removeItem("tx_itinerary");
  renderDaysGrid();
  toast("Trip reset");
}

function exportItinerary() {
  if (!plannerDays.some(d => d.places.length)) {
    toast("Add places to your itinerary first");
    return;
  }
  const startDate = getTripStartDate();
  const lines = plannerDays.map((day, di) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + di);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (!day.places.length) return `Day ${di + 1} (${dateStr}) — No places`;
    const slots = computeDayTimeSlots(day.places);
    const placeStr = day.places.map((p, pi) => {
      const t = slots[pi];
      const h = Math.floor(t / 60), m = t % 60;
      const ampm = h >= 12 ? "pm" : "am";
      const h12 = h > 12 ? h - 12 : h;
      return `${h12}${m ? ":" + String(m).padStart(2,"0") : ""}${ampm} ${p.name}`;
    }).join(" · ");
    return `Day ${di + 1} (${dateStr}) — ${placeStr}`;
  });
  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => toast("✅ Itinerary copied to clipboard!")).catch(() => {
    prompt("Copy your itinerary:", text);
  });
}

// Compute cumulative start times (minutes from midnight) for a day's places
function computeDayTimeSlots(places) {
  const START_HOUR = 9 * 60; // 9am in minutes
  const times = [];
  let cursor = START_HOUR;
  places.forEach(p => {
    times.push(cursor);
    const dur = VISIT_DURATION[p.category] || 75;
    const travel = 30; // avg travel between spots
    cursor += dur + travel;
  });
  return times;
}

function renderDaysGrid() {
  const grid = document.getElementById("days-grid");
  const startDate = getTripStartDate();
  const DAY_END = 20 * 60; // 8pm

  grid.innerHTML = plannerDays.map((day, di) => {
    const d = new Date(startDate); d.setDate(startDate.getDate() + di);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const timeSlots = computeDayTimeSlots(day.places);
    const lastSlotEnd = day.places.length
      ? timeSlots[day.places.length - 1] + (VISIT_DURATION[day.places[day.places.length - 1]?.category] || 75)
      : 9 * 60;
    const overrun = lastSlotEnd > DAY_END && day.places.length > 0;

    const slots = day.places.map((p, pi) => {
      const crowdEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[p.crowd?.level] ?? "⚪";
      const mins = timeSlots[pi];
      const h = Math.floor(mins / 60), m = mins % 60;
      const ampm = h >= 12 ? "pm" : "am";
      const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const timeStr = `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${ampm}`;
      const isFirst = pi === 0, isLast = pi === day.places.length - 1;
      return `<div class="day-slot">
        <span class="day-slot-time">${timeStr}</span>
        <span class="day-slot-name">${p.name}</span>
        <span class="day-slot-crowd">${crowdEmoji}</span>
        <div class="day-slot-actions">
          <button class="day-slot-move" onclick="movePlaceInDay(${di},${pi},-1)" ${isFirst ? "disabled" : ""} title="Move up">▲</button>
          <button class="day-slot-move" onclick="movePlaceInDay(${di},${pi},1)" ${isLast ? "disabled" : ""} title="Move down">▼</button>
          <button class="day-slot-remove" onclick="removeFromDay(${di},${pi})">✕</button>
        </div>
      </div>`;
    }).join("");

    const endH = Math.floor(lastSlotEnd / 60), endM = lastSlotEnd % 60;
    const endAmpm = endH >= 12 ? "pm" : "am";
    const endH12 = endH > 12 ? endH - 12 : endH;
    const endTimeStr = day.places.length
      ? `<span class="day-end-time ${overrun ? 'overrun' : ''}">Ends ~${endH12}${endM ? ":" + String(endM).padStart(2,"0") : ""}${endAmpm}${overrun ? " ⚠️ late" : ""}</span>`
      : "";

    return `
      <div class="day-card">
        <div class="day-card-header">
          <span class="day-card-title">Day ${di + 1}</span>
          <span class="day-card-date">${dateStr}</span>
          ${endTimeStr}
          <button class="day-clear-btn" onclick="clearDay(${di})" title="Clear day">Clear</button>
        </div>
        <div class="day-slots">
          ${slots || '<div class="day-add-more">Add places from the sidebar →</div>'}
        </div>
      </div>`;
  }).join("");

  updateBudgetSummary();
  savePlannerToStorage();
}

function movePlaceInDay(di, pi, dir) {
  const places = plannerDays[di].places;
  const newPi = pi + dir;
  if (newPi < 0 || newPi >= places.length) return;
  [places[pi], places[newPi]] = [places[newPi], places[pi]];
  renderDaysGrid();
}

function addPlaceToDay(placeOrId, dayIndex) {
  const place = typeof placeOrId === "string" ? getPlace(placeOrId) : placeOrId;
  if (!place) { toast("Could not add place — try again"); return; }
  if (dayIndex >= plannerDays.length) plannerDays.push({ places: [] });

  // Cross-day duplicate detection
  const existingDayIdx = plannerDays.findIndex(d => d.places.some(p => p.name === place.name));
  if (existingDayIdx !== -1) {
    if (existingDayIdx === dayIndex) {
      toast(`${place.name} is already in Day ${dayIndex + 1}`);
      return;
    }
    if (!confirm(`${place.name} is already in Day ${existingDayIdx + 1}. Add to Day ${dayIndex + 1} anyway?`)) return;
  }

  plannerDays[dayIndex].places.push(place);
  if (!place.priceData) {
    fetchPlacePrice(place, { onUpdate: () => { renderDaysGrid(); updateBudgetSummary(); } });
  }
  renderDaysGrid();
  renderPlannerSidebar(); // refresh dropdowns
  toast(`✅ ${place.name} → Day ${dayIndex + 1}`);
}

function removeFromDay(di, pi) {
  plannerDays[di].places.splice(pi, 1);
  renderDaysGrid();
}

function updateBudgetSummary() {
  const allPlaces = plannerDays.flatMap(d => d.places);
  const days = plannerDays.length;
  const nights = Math.max(days - 1, 1);

  // Entry fees
  const entryTotal = allPlaces.reduce((a, p) => a + getEffectivePrice(p), 0);
  const entryBreakdown = allPlaces.length
    ? allPlaces.map(p => { const pr = getEffectivePrice(p); return `${p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name}: ${pr === 0 ? "Free" : "₹" + pr}`; }).join(" · ")
    : "No places added yet";

  // Hotel (nights = days - 1, min 1)
  const hotelPerNight = selectedHotel ? selectedHotel.price : 0;
  const hotelTotal = hotelPerNight * nights;
  const plannerCityName = document.getElementById("planner-city")?.value?.trim() || capitalize(currentCity);
  const bookingLink = plannerCityName ? ` <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(plannerCityName)}" target="_blank" style="color:var(--burnt);font-size:10px">Search on Booking.com →</a>` : "";
  const hotelDetail = selectedHotel
    ? `${selectedHotel.name} · ₹${hotelPerNight.toLocaleString("en-IN")}/night × ${nights} night${nights !== 1 ? "s" : ""} (${days} day${days !== 1 ? "s" : ""})${bookingLink}`
    : `No hotel selected${bookingLink}`;

  // Meals
  const mealPerDay = MEAL_COST_BY_TIER[selectedHotelTier] || 600;
  const mealsTotal = mealPerDay * days;
  const mealsDetail = `₹${mealPerDay}/day × ${days} days (3 meals, ${selectedHotelTier} level)`;

  // Transport — per-hop × stops per day × tier
  const PER_HOP = { budget: 80, mid: 150, luxury: 300 };
  const perHop = PER_HOP[selectedHotelTier] || 80;
  const totalHops = plannerDays.reduce((sum, d) => sum + Math.max(d.places.length - 1, 0), 0) + days; // +1 base trip per day
  const transportTotal = perHop * totalHops;
  const transportDetail = `₹${perHop}/hop × ~${totalHops} trips (${days} day${days !== 1 ? "s" : ""})`;

  // Misc 8%
  const subtotal = entryTotal + hotelTotal + mealsTotal + transportTotal;
  const misc = Math.round(subtotal * 0.08);
  const total = subtotal + misc;

  document.getElementById("budget-entry").textContent     = `₹${entryTotal.toLocaleString("en-IN")}`;
  document.getElementById("budget-hotel").textContent     = `₹${hotelTotal.toLocaleString("en-IN")}`;
  document.getElementById("budget-transport").textContent = `₹${transportTotal.toLocaleString("en-IN")}`;
  document.getElementById("budget-meals").textContent     = `₹${mealsTotal.toLocaleString("en-IN")}`;
  document.getElementById("budget-misc").textContent      = `₹${misc.toLocaleString("en-IN")}`;
  document.getElementById("budget-total").textContent     = `₹${total.toLocaleString("en-IN")}`;

  const entryDetailEl = document.getElementById("budget-entry-detail");
  if (allPlaces.length) {
    entryDetailEl.style.display = "flex";
    document.getElementById("budget-entry-breakdown").textContent = entryBreakdown;
  } else {
    entryDetailEl.style.display = "none";
  }
  document.getElementById("budget-hotel-detail").innerHTML    = hotelDetail;
  document.getElementById("budget-transport-detail").textContent = transportDetail;
  document.getElementById("budget-meals-detail").textContent  = mealsDetail;

  const noteEl = document.getElementById("budget-note");
  noteEl.textContent = allPlaces.length === 0
    ? "Add places to your itinerary to get a full breakdown."
    : `Based on ${allPlaces.length} place${allPlaces.length > 1 ? "s" : ""}, ${days} day${days > 1 ? "s" : ""} (${nights} night${nights > 1 ? "s" : ""}), ${selectedHotelTier} tier.`;
}

async function plannerSearch() {
  const city = document.getElementById("planner-city").value.trim();
  if (!city) { toast("Enter a city for your trip"); return; }

  // Loading state
  const btn = document.querySelector(".planner-search-btn");
  const quickList = document.getElementById("planner-quick-list");
  if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
  quickList.innerHTML = Array(4).fill(0).map(() => `
    <div class="sp-item" style="opacity:0.4;pointer-events:none">
      <span class="sp-dot" style="background:#ccc"></span>
      <div class="sp-info"><div class="sp-name" style="background:#eee;height:14px;border-radius:4px;width:120px"></div><div class="sp-meta" style="background:#eee;height:11px;border-radius:4px;width:80px;margin-top:4px"></div></div>
    </div>`).join("");

  toast(`Loading places in ${city}…`);
  try {
    const geo = await API.geocode(city);
    const data = await API.places(geo.lat, geo.lng);

    const apiValid = data.filter(p => p.name?.trim() && p.point?.lat && p.kinds && isTouristPlace(p));
    const valid = mergeWithCurated(apiValid, city).slice(0, 30);

    plannerPlaces = valid;
    renderPlannerSidebar();
    toast(`Found ${valid.length} places in ${city}`);
  } catch(e) {
    toast("Couldn't load places — check city name");
    quickList.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:12px;text-align:center;">Search failed — try again</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Load Places"; }
  }
}

let plannerCategoryFilter = "all";

function setPlannerCategoryFilter(cat, el) {
  plannerCategoryFilter = cat;
  document.querySelectorAll(".planner-cat-chip").forEach(c => c.classList.remove("active"));
  if (el) el.classList.add("active");
  renderPlannerSidebar();
}

function renderPlannerSidebar() {
  const savedList = document.getElementById("planner-saved-list");
  const dotColor = { low: "#1E6B44", medium: "#9A6216", high: "#B83030" };

  // Saved Places panel
  if (savedPlaces.length) {
    savedList.innerHTML = savedPlaces.slice(0, 8).map(p => {
      const rid = registerPlace(p);
      return `
      <div class="sp-item">
        <span class="sp-dot" style="background:${dotColor[p.crowd?.level] || '#918C80'}"></span>
        <div class="sp-info">
          <div class="sp-name">${p.name}</div>
          <div class="sp-meta">${p.category} · ${getEffectivePrice(p) === 0 ? "Free" : "₹" + getEffectivePrice(p)}</div>
        </div>
        <select class="sp-day-picker" onchange="addPlaceToDay('${rid}', parseInt(this.value)); this.selectedIndex=0">
          <option value="">+ Add</option>
          ${plannerDays.map((_, i) => `<option value="${i}">Day ${i+1}</option>`).join("")}
        </select>
      </div>`;
    }).join("");
  } else {
    savedList.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:12px;text-align:center;">Save places on Explore to add here</div>`;
  }

  // Quick Add panel
  const quickList = document.getElementById("planner-quick-list");
  let allQuick = plannerPlaces.length ? plannerPlaces : globalPlaces.slice(0, 30);

  // Show sync note if using globalPlaces
  const syncNote = (plannerPlaces.length === 0 && globalPlaces.length > 0)
    ? `<div style="font-size:11px;color:var(--amber);padding:6px 12px 2px;font-style:italic">Showing places for ${capitalize(currentCity)} — search another city to change.</div>`
    : "";

  // Category filter chips
  const cats = [...new Set(allQuick.map(p => p.category))].slice(0, 5);
  const chipHtml = cats.length ? `<div class="planner-cat-chips">
    <span class="planner-cat-chip ${plannerCategoryFilter === "all" ? "active" : ""}" onclick="setPlannerCategoryFilter('all',this)">All</span>
    ${cats.map(c => `<span class="planner-cat-chip ${plannerCategoryFilter === c ? "active" : ""}" onclick="setPlannerCategoryFilter('${c}',this)">${c}</span>`).join("")}
  </div>` : "";

  // Apply filter
  let quickPlaces = plannerCategoryFilter === "all" ? allQuick : allQuick.filter(p => p.category === plannerCategoryFilter);

  if (quickPlaces.length) {
    const shown = quickPlaces.slice(0, 10);
    const remaining = quickPlaces.length - 10;
    quickList.innerHTML = syncNote + chipHtml + shown.map(p => {
      const rid = registerPlace(p);
      return `
      <div class="sp-item">
        <span class="sp-dot" style="background:${dotColor[p.crowd?.level] || '#918C80'}"></span>
        <div class="sp-info">
          <div class="sp-name">${p.name}</div>
          <div class="sp-meta">${p.category} · ${getEffectivePrice(p) === 0 ? "Free" : "₹" + getEffectivePrice(p)}</div>
        </div>
        <select class="sp-day-picker" onchange="addPlaceToDay('${rid}', parseInt(this.value)); this.selectedIndex=0">
          <option value="">+ Add</option>
          ${plannerDays.map((_, i) => `<option value="${i}">Day ${i+1}</option>`).join("")}
        </select>
      </div>`;
    }).join("") + (remaining > 0 ? `<div style="text-align:center;padding:8px 12px;font-size:11px;color:var(--muted)">+${remaining} more — filter by category</div>` : "");
  } else {
    quickList.innerHTML = syncNote + chipHtml + `<div style="font-size:12px;color:var(--muted);padding:12px;text-align:center;">No places match — try a different filter</div>`;
  }
}

// ─── FILTER & SORT ───────────────────────────────────────────
function applyFilter(places, filter) {

  switch(filter) {

    case "top":
      return [...places]
        .sort((a,b)=>b.rating-a.rating)
        .slice(0,12);

    case "cheap":
      return places.filter(p => {
        const pr = getEffectivePrice(p);
        return pr > 0 && pr < 200;
      });

    case "low":
      return places.filter(p => p.crowd.level === "low");

    case "nature":
      return places.filter(p =>
        ["Nature","Park","Waterfall","Lake","Cave","Hill","Beach"]
        .includes(p.category)
      );

    case "heritage":
      return places.filter(p =>
        ["Temple","Heritage","Museum","Fort"]
        .includes(p.category)
      );

    case "free":
      return places.filter(p =>
        getEffectivePrice(p) === 0
      );

    default:
      return places;
  }
}

function applySort(places, sort) {

  const arr = [...places];

  switch(sort) {

    case "rating":
      return arr.sort((a,b)=>b.rating-a.rating);

    case "cost_asc":
      return arr.sort((a,b)=>
        getEffectivePrice(a) - getEffectivePrice(b)
      );

    case "cost_desc":
      return arr.sort((a,b)=>
        getEffectivePrice(b) - getEffectivePrice(a)
      );

    case "crowd":
      return arr.sort((a,b)=>
        a.crowd.score - b.crowd.score
      );

    case "name":
      return arr.sort((a,b)=>
        a.name.localeCompare(b.name)
      );

    default:
      return arr;
  }
}

function exitMapFocusMode() {
  if (!mapFocusMode) return;
  mapFocusMode = false;
  focusedPlace = null;
  hideDirectionsPanel();
  clearFocusMarker();
}

function handleSort() {
  exitMapFocusMode();
  activeSort = document.getElementById("sort-select").value;
  const filtered = applyFilter(applySort(globalPlaces, activeSort), activeFilter);
  displayPlaces(filtered);
  renderSidebarList(filtered);
  updateResultsBar(currentCity, filtered.length);
}

// Filter chip clicks
document.querySelectorAll(".sf-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    exitMapFocusMode();
    document.querySelectorAll(".sf-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    const filtered = applyFilter(applySort(globalPlaces, activeSort), activeFilter);
    displayPlaces(filtered);
    renderSidebarList(filtered);
    updateResultsBar(currentCity, filtered.length);
  });
});

// ─── UI HELPERS ──────────────────────────────────────────────
function clearMarkers() { markers.forEach(m => map?.removeLayer(m)); markers = []; }

function showSkeletons() {
  document.getElementById("places").innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton">
      <div class="skel-line" style="height:12px;width:35%;margin-bottom:14px"></div>
      <div class="skel-line" style="height:22px;width:70%;margin-bottom:6px"></div>
      <div class="skel-line" style="height:11px;width:45%;margin-bottom:16px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="skel-block" style="height:50px;border-radius:10px"></div>
        <div class="skel-block" style="height:50px;border-radius:10px"></div>
      </div>
      <div class="skel-block" style="height:64px;border-radius:10px;margin-bottom:0"></div>
    </div>`).join("");
}

// ─── EXPLORE TABS ────────────────────────────────────────────
let activeExploreTab = "places";

function switchExploreTab(tab) {
  activeExploreTab = tab;
  document.querySelectorAll(".explore-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-places")?.classList.add("active");
  document.getElementById("panel-places").style.display = "block";
}

function sortHostels(sortBy) {
  let sorted = [...globalHostels];
  switch(sortBy) {
    case "price_asc":  sorted.sort((a,b) => a.price - b.price); break;
    case "price_desc": sorted.sort((a,b) => b.price - a.price); break;
    case "crowd":      sorted.sort((a,b) => a.crowd.score - b.crowd.score); break;
    default:           sorted.sort((a,b) => b.rating - a.rating);
  }
  renderHostels(sorted);
}

function updateResultsBar(city, count) {
  document.getElementById("city-name-label").textContent = capitalize(city);
  document.getElementById("count-tag").textContent = `${count} places`;
  document.getElementById("tab-places-count").textContent = count;
  document.getElementById("results-bar").classList.add("visible");
}

function detectCategory(kinds = "") {
  const k = kinds.toLowerCase();
  // Order matters — most specific first
  if (k.includes("waterfall") || k.includes("river_waterfall")) return "Waterfall";
  if (k.includes("beach") || k.includes("cape")) return "Beach";
  if (k.includes("cave") || k.includes("grotto")) return "Cave";
  if (k.includes("lake") || k.includes("lagoon")) return "Lake";
  if (k.includes("fort") || k.includes("castle") || k.includes("tower")) return "Fort";
  if (k.includes("temple") || k.includes("mosque") || k.includes("pagoda") || k.includes("shrine") || k.includes("cathedral") || k.includes("monastery")) return "Temple";
  if (k.includes("museum") || k.includes("art_gallery") || k.includes("exhibition") || k.includes("planetarium") || k.includes("aquarium")) return "Museum";
  if (k.includes("zoo") || k.includes("wildlife") || k.includes("safari") || k.includes("sanctuary")) return "Nature";
  if (k.includes("ruins") || k.includes("archaeological") || k.includes("prehistoric") || k.includes("megalith") || k.includes("mausoleum") || k.includes("memorial") || k.includes("monument") || k.includes("palace") || k.includes("heritage") || k.includes("historic")) return "Heritage";
  if (k.includes("mountain") || k.includes("hill") || k.includes("plateau") || k.includes("viewpoint") || k.includes("cliff")) return "Hill";
  if (k.includes("national_park") || k.includes("nature_reserve") || k.includes("botanical") || k.includes("garden") || k.includes("amusement") || k.includes("theme_park")) return "Park";
  if (k.includes("hot_spring") || k.includes("geyser") || k.includes("glacier") || k.includes("island") || k.includes("valley") || k.includes("delta")) return "Nature";
  return "Nature";
}

function renderStars(rating) {
  const full = Math.round(rating);
  return Array(5).fill(0).map((_,i)=>i<full?"★":"☆").join("");
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Keyboard
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ─── BOOT ────────────────────────────────────────────────────
(async function boot() {
  updateSavedBadge();
  renderCityGrid("india");
  initPlannerDays();
  renderHotelGrid("budget");
  renderTrending();
  // Initialize map
  initMap(18.5204, 73.8567);

  await Promise.all([
    loadPlaces(18.5204, 73.8567, BOOT_GENERATION),
    loadWeather(18.5204, 73.8567, BOOT_GENERATION)
  ]);
})();
