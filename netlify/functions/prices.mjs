// Lentohaukka: hakee halvimmat meno-paluulennot Travelpayouts / Aviasales Data API:sta.
// Token ja Partner ID luetaan Netlifyn ympäristömuuttujista TP_TOKEN ja TP_MARKER.
// Kutsu: /api/prices?origins=HEL,TLL&months=2026-12,2027-01

import { fetchOffers } from "../lib/tp.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const origins = (url.searchParams.get("origins") || "HEL")
    .split(",").map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{3}$/.test(s)).slice(0, 3);
  const months = (url.searchParams.get("months") || "")
    .split(",").map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s)).slice(0, 2);

  const oneWay = url.searchParams.get("trip") === "ow";
  const token = Netlify.env.get("TP_TOKEN");
  const marker = Netlify.env.get("TP_MARKER") || "";
  if (!token) return Response.json({ error: "TP_TOKEN puuttuu Netlifyn ympäristömuuttujista" }, { status: 500 });
  if (!origins.length || !months.length) return Response.json({ error: "origins ja months vaaditaan" }, { status: 400 });

  const jobs = [];
  for (const o of origins) for (const m of months) jobs.push([o, m]);

  const offers = {};
  const errors = [];
  await Promise.all(jobs.map(async ([o, m]) => {
    try {
      offers[`${o}|${m}`] = await fetchOffers(o, m, { oneWay, token, marker });
    } catch (e) {
      errors.push(`${o}|${m}: ${e.message}`);
    }
  }));

  return Response.json({ offers, errors, fetched: new Date().toISOString() }, {
    headers: {
      "Cache-Control": "public, max-age=600",
      "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
};

export const config = { path: "/api/prices" };
