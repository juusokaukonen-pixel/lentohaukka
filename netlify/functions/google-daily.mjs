// Lentohaukka: hakee kerran päivässä Google Flightsin "Explore"-hinnat Helsingistä (SerpApi).
// Pysyy SerpApin ilmaistasossa: enintään 6 hakua päivässä ja kova kuukausikatto.
import { getStore } from "@netlify/blobs";

const ORIGIN = "HEL";
const MONTHS_AHEAD = 6;        // tämä ja seuraavat 5 kuukautta
const MONTHLY_CAP = 240;       // SerpApin ilmaistaso on 250 hakua / kk

function nextMonths(now, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async () => {
  const key = Netlify.env.get("SERPAPI_KEY");
  if (!key) { console.log("SERPAPI_KEY puuttuu, ohitetaan"); return; }

  const store = getStore("google");
  const now = new Date();
  const usageKey = `usage-${now.toISOString().slice(0, 7)}`;
  let used = Number((await store.get(usageKey)) || 0);

  const prev = (await store.get(ORIGIN, { type: "json" })) || { months: {} };
  const months = nextMonths(now, MONTHS_AHEAD);
  const result = { origin: ORIGIN, updated: now.toISOString(), months: {} };

  for (const ym of months) {
    if (used >= MONTHLY_CAP) { console.log("Kuukausikatto täynnä, käytetään vanhaa dataa"); break; }
    const qs = new URLSearchParams({
      engine: "google_travel_explore", departure_id: ORIGIN, month: String(Number(ym.slice(5))),
      travel_duration: "2", currency: "EUR", hl: "en", gl: "fi", api_key: key,
    });
    used++;
    try {
      const r = await fetch(`https://serpapi.com/search.json?${qs}`);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      result.months[ym] = (j.destinations || []).map((x) => ({
        code: x.destination_airport?.code || null,
        name: x.name, price: x.flight_price ?? null,
        start: x.start_date || null, end: x.end_date || null,
        stops: x.number_of_stops ?? null, dur: x.flight_duration ?? null, airline: x.airline || null,
      })).filter((x) => x.code && x.price != null);
    } catch (e) {
      console.log(`${ym}: ${e.message}`);
    }
  }
  // Säilytä vanha data kuukausille, joiden haku epäonnistui
  for (const ym of months) if (!result.months[ym] && prev.months?.[ym]) result.months[ym] = prev.months[ym];

  await store.set(usageKey, String(used));
  await store.setJSON(ORIGIN, result);
  console.log(`Valmis. Hakuja tässä kuussa: ${used}/${MONTHLY_CAP}`);
};

export const config = { schedule: "0 3 * * *" }; // joka päivä klo 03 UTC (5–6 Suomen aikaa)
