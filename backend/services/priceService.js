const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { OPENTRIPMAP_KEY, PRICE_CACHE_TTL_MS = 30 * 60 * 1000 } = require("../config");

const PRICE_CACHE_FILE = path.join(__dirname, "../price-cache.json");
const cache = new Map();

function loadDiskCache() {
  try {
    if (!fs.existsSync(PRICE_CACHE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(PRICE_CACHE_FILE, "utf8"));
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) {
      if (v?.ts && now - v.ts < PRICE_CACHE_TTL_MS) cache.set(k, v);
    }
  } catch {}
}

function persistEntry(key, entry) {
  try {
    let disk = {};
    if (fs.existsSync(PRICE_CACHE_FILE)) disk = JSON.parse(fs.readFileSync(PRICE_CACHE_FILE, "utf8"));
    disk[key] = entry;
    fs.writeFileSync(PRICE_CACHE_FILE, JSON.stringify(disk));
  } catch {}
}

loadDiskCache();

const CATEGORY_ESTIMATES = {
  Temple:    { min: 0,    max: 0,    typical: 0,   note: "Most temples are free to enter" },
  Museum:    { min: 20,   max: 500,  typical: 50,  note: "Govt museums ₹20–₹100; private ₹200–₹500" },
  Fort:      { min: 25,   max: 600,  typical: 35,  note: "ASI sites ₹25–₹40; major forts ₹200–₹600" },
  Waterfall: { min: 0,    max: 50,   typical: 0,   note: "Most free; some conservation fee ₹20–₹50" },
  Hill:      { min: 0,    max: 100,  typical: 0,   note: "Mostly free; hill stations may charge ₹50–₹100" },
  Park:      { min: 0,    max: 100,  typical: 20,  note: "Public parks free; national parks ₹20–₹100" },
  Heritage:  { min: 25,   max: 1100, typical: 40,  note: "ASI ₹25–₹40; premium sites up to ₹1100" },
  Lake:      { min: 0,    max: 50,   typical: 0,   note: "Free; boat rides extra" },
  Cave:      { min: 15,   max: 40,   typical: 30,  note: "ASI caves ₹15–₹40" },
  Beach:     { min: 0,    max: 0,    typical: 0,   note: "Public beaches are free" },
  Nature:    { min: 0,    max: 100,  typical: 0,   note: "Forest reserves may charge ₹50–₹100" },
};

function fmt(n) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

function buildResponse({ price, isFree, priceRange, source, note }) {
  const free = isFree || price === 0;
  return { price: free ? 0 : Math.round(price), currency: "INR", isFree: free,
    priceDisplay: free ? "Free" : fmt(price), priceRange: priceRange || (free ? "Free" : fmt(price)),
    source, note: note || "" };
}

function parsePriceFromText(text) {
  if (!text) return null;
  if (/\b(no\s+entry\s+fee|entry\s+free|admission\s+free|free\s+entry|free\s+admission)\b/i.test(text))
    return { price: 0, isFree: true };
  const range = text.match(/(?:₹|Rs\.?\s*|INR\s*)([\d,]+)\s*[–\-—to]+\s*(?:₹|Rs\.?\s*|INR\s*)?([\d,]+)/i);
  if (range) { const lo = parseInt(range[1].replace(/,/g,"")); const hi = parseInt(range[2].replace(/,/g,"")); return { price: Math.round((lo+hi)/2), priceRange:`${fmt(lo)}–${fmt(hi)}`, isFree:lo===0&&hi===0 }; }
  const single = text.match(/(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d+)?)/i);
  if (single) { const p = parseFloat(single[1].replace(/,/g,"")); return { price: p, isFree: p===0 }; }
  return null;
}

async function fetchWikipediaPrice(name) {
  const title = encodeURIComponent(name.trim().replace(/\s+/g,"_"));
  const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { timeout: 6000, validateStatus: s => s < 500 });
  if (res.status === 404) return null;
  return parsePriceFromText(res.data?.extract || "");
}

async function fetchWikidataPrice(name) {
  const sr = await axios.get("https://www.wikidata.org/w/api.php", { params: { action:"wbsearchentities", search:name, language:"en", format:"json", limit:3 }, timeout:6000 });
  const entity = sr.data?.search?.[0]; if (!entity?.id) return null;
  const er = await axios.get("https://www.wikidata.org/w/api.php", { params: { action:"wbgetentities", ids:entity.id, props:"claims", format:"json" }, timeout:6000 });
  const claims = er.data?.entities?.[entity.id]?.claims?.P2555; if (!claims?.length) return null;
  const mv = claims[0].mainsnak.datavalue?.value;
  if (mv?.amount != null) { const amt = Math.abs(parseFloat(mv.amount)); return { price: amt, isFree: amt===0, note:"From Wikidata" }; }
  return null;
}

async function fetchOtmPrice(name, lat, lon) {
  const br = await axios.get("https://api.opentripmap.com/0.1/en/places/radius", { params: { lat, lon, radius:500, name, apikey:OPENTRIPMAP_KEY, limit:1 }, timeout:6000 });
  const xid = br.data?.features?.[0]?.properties?.xid; if (!xid) return null;
  const dr = await axios.get(`https://api.opentripmap.com/0.1/en/places/xid/${xid}`, { params: { apikey:OPENTRIPMAP_KEY }, timeout:6000 });
  const texts = [dr.data?.info?.descr, dr.data?.wikipedia_extracts?.text].filter(Boolean);
  for (const t of texts) { const p = parsePriceFromText(t); if (p) return { ...p, note:"From OpenTripMap" }; }
  return null;
}

function estimateByCategory(category) {
  const cat = CATEGORY_ESTIMATES[category] || CATEGORY_ESTIMATES.Nature;
  const priceRange = cat.min === 0 && cat.max === 0 ? "Free" : `${fmt(cat.min)}–${fmt(cat.max)}`;
  return buildResponse({ price: cat.typical, isFree: cat.typical === 0 && cat.max === 0, priceRange, source: "estimate", note: cat.note });
}

async function resolvePlacePrice({ name, lat, lon, category = "Nature" }) {
  const key = `price:${name.toLowerCase()}:${parseFloat(lat).toFixed(4)}:${parseFloat(lon).toFixed(4)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL_MS) return cached.data;

  let result;
  try { const wd = await fetchWikidataPrice(name); if (wd) result = buildResponse({ ...wd, source:"wikidata" }); } catch {}
  if (!result) { try { const wi = await fetchWikipediaPrice(name); if (wi) result = buildResponse({ ...wi, source:"wikipedia" }); } catch {} }
  if (!result) { try { const otm = await fetchOtmPrice(name, lat, lon); if (otm) result = buildResponse({ ...otm, source:"opentripmap" }); } catch {} }
  if (!result) result = estimateByCategory(category);

  const record = { data: result, ts: Date.now() };
  cache.set(key, record);
  persistEntry(key, record);
  return result;
}

module.exports = { resolvePlacePrice };
