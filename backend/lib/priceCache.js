const fs = require("fs");
const path = require("path");
const { PRICE_CACHE_TTL_MS } = require("../config");

const CACHE_FILE = path.join(__dirname, "..", "price-cache.json");
const memory = new Map();
let saveTimer = null;

function loadFromDisk() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    const now = Date.now();
    for (const [key, entry] of Object.entries(raw)) {
      if (entry?.data && now - (entry.ts || 0) < PRICE_CACHE_TTL_MS) {
        memory.set(key, entry);
      }
    }
  } catch (err) {
    console.warn("Price cache load failed:", err.message);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const obj = Object.fromEntries(memory);
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), "utf8");
    } catch (err) {
      console.warn("Price cache save failed:", err.message);
    }
  }, 400);
}

function get(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= PRICE_CACHE_TTL_MS) {
    memory.delete(key);
    scheduleSave();
    return null;
  }
  return entry.data;
}

function set(key, data) {
  memory.set(key, { data, ts: Date.now() });
  scheduleSave();
  return data;
}

loadFromDisk();

module.exports = { get, set, cacheKey: (name, lat, lon) =>
  `price:${String(name).toLowerCase().trim()}:${Number(lat).toFixed(4)}:${Number(lon).toFixed(4)}`
};
