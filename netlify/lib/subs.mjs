// Hintahälytysten tilaukset Netlify Blobsissa (store "alerts", avain sub/<id>).
import { getStore } from "@netlify/blobs";
import { ORIGINS, MONTHS, PRICE_MAX, KM_MAX } from "../../public/engine.mjs";

export const MAX_PER_EMAIL = 10;
export const store = () => getStore("alerts");

export const newToken = () => crypto.randomUUID().replace(/-/g, "");
export const isEmail = (e) => typeof e === "string" && e.length <= 200 && /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i.test(e);

export async function emailHash(email) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getSub(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)) return null;
  return await store().get(`sub/${id}`, { type: "json" });
}
export const saveSub = (sub) => store().setJSON(`sub/${sub.id}`, sub);
export const deleteSub = (id) => store().delete(`sub/${id}`);

export async function listSubs() {
  const { blobs } = await store().list({ prefix: "sub/" });
  const out = [];
  for (const b of blobs) { const s = await store().get(b.key, { type: "json" }); if (s) out.push(s); }
  return out;
}

// Hyväksyy vain tunnetut hakuehdot oikeilla tyypeillä.
const nums = (a, ok) => (Array.isArray(a) ? [...new Set(a.map(Number).filter((v) => ok.includes(v)))].sort() : []);
const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
export function cleanSearch(s = {}) {
  const months = MONTHS.map((m) => m[0]);
  return {
    origin: ORIGINS[s.origin] ? s.origin : "HEL",
    month: months.includes(s.month) ? s.month : "all",
    maxPrice: num(s.maxPrice, 0, PRICE_MAX, PRICE_MAX),
    maxKm: num(s.maxKm, 0, KM_MAX, KM_MAX),
    minKm: num(s.minKm, 0, KM_MAX, 0),
    near: !!s.near,
    radius: num(s.radius, 0, 2000, 250),
    pl: nums(s.pl, [1, 2, 3, 4, 5]),
    rain: nums(s.rain, [0, 1, 2]), day: nums(s.day, [0, 1, 2]), night: nums(s.night, [0, 1, 2]),
    maxDirect: num(s.maxDirect, 0, 24, 0), maxStop: num(s.maxStop, 0, 48, 0),
    amOut: !!s.amOut, pmRet: !!s.pmRet, canna: !!s.canna,
    trip: s.trip === "ow" ? "ow" : "rt",
  };
}
export function cleanWatch(w = {}) {
  return {
    name: String(w.name || "").slice(0, 60),
    s: cleanSearch(w.s),
    alert: Math.round(num(w.alert, 10, 100000, 200)),
    drop: Math.round(num(w.drop, 0, 90, 0)),
    onlyNew: w.onlyNew !== false,
    fq: w.fq === 1 ? 1 : 0, // 0 = kahdesti päivässä, 1 = kerran päivässä (aamulla)
  };
}
