require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { rateLimit } = require("express-rate-limit");
const {
  OPENCAGE_KEY,
  OPENTRIPMAP_KEY,
  OPENWEATHER_KEY,
  CACHE_TTL_MS,
  PORT,
} = require("./config");
const { resolvePlacePrice } = require("./services/priceService");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));

const cache = new Map();

function cached(key, fetchFn, ttl = CACHE_TTL_MS) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data);
  return fetchFn().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again in a minute" },
});

const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Price API rate limit — try again shortly" },
});

app.get("/geocode", async (req, res) => {
  const city = req.query.city?.trim();
  if (!city) return res.status(400).json({ error: "City is required" });

  try {
    const data = await cached(`geocode:${city.toLowerCase()}`, () =>
      axios
        .get("https://api.opencagedata.com/geocode/v1/json", {
          params: { q: city, key: OPENCAGE_KEY, limit: 1, no_annotations: 1 },
          timeout: 8000,
        })
        .then((r) => {
          const loc = r.data.results[0]?.geometry;
          if (!loc) throw new Error("No results found");
          return { lat: loc.lat, lng: loc.lng, formatted: r.data.results[0].formatted };
        })
    );
    res.json(data);
  } catch (err) {
    console.error("Geocode error:", err.message);
    res.status(500).json({ error: "Could not geocode city" });
  }
});

app.get("/places",  async (req, res) => {
  const lat = parseFloat(req.query.lat) || 18.5204;
  const lon = parseFloat(req.query.lon) || 73.8567;
  const delta = 0.35;
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLon = lon - delta;
  const maxLon = lon + delta;

  try {
    const data = await cached(`places:${lat.toFixed(2)}:${lon.toFixed(2)}`, () =>
      axios
        .get("https://api.opentripmap.com/0.1/en/places/bbox", {
          params: {
            lon_min: minLon,
            lon_max: maxLon,
            lat_min: minLat,
            lat_max: maxLat,
            format: "json",
            limit: 500,
            apikey: OPENTRIPMAP_KEY,
          },
          timeout: 12000,
        })
        .then((r) => r.data)
    );
    res.json(data);
  } catch (err) {
    console.error("Places error:", err.message);
    res.status(500).json({ error: "Could not fetch places" });
  }
});

app.get("/weather", async (req, res) => {
  const lat = parseFloat(req.query.lat) || 18.5204;
  const lon = parseFloat(req.query.lon) || 73.8567;

  try {
    const data = await cached(`weather:${lat.toFixed(2)}:${lon.toFixed(2)}`, () =>
      axios
        .get("https://api.openweathermap.org/data/2.5/weather", {
          params: { lat, lon, appid: OPENWEATHER_KEY },
          timeout: 8000,
        })
        .then((r) => r.data)
    );
    res.json(data);
  } catch (err) {
    console.error("Weather error:", err.message);
    res.status(500).json({ error: "Could not fetch weather" });
  }
});

app.get("/price",  async (req, res) => {
  const name = req.query.name?.trim();
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const category = req.query.category?.trim() || undefined;
  const kinds = req.query.kinds || "";

  if (!name) return res.status(400).json({ error: "name query param is required" });
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "lat and lon query params are required" });
  }

  try {
    const data = await resolvePlacePrice({ name, lat, lon, category, kinds });
    res.json(data);
  } catch (err) {
    console.error("Price error:", err.message);
    res.status(500).json({ error: "Could not resolve entry price" });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "../frontend/index.html")));

app.listen(PORT, () => console.log(`✅ TravelX server running on http://localhost:${PORT}`));
