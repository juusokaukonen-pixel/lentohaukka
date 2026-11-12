// Travelpayouts / Aviasales Data API: yhteinen haku /api/prices-funktiolle ja hintahälytyksille.
const API = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

// Palauttaa listan tarjouksia muodossa {d,a,p,tr,dur,dep,ret,al,link} tai heittää virheen.
export async function fetchOffers(origin, month, { oneWay = false, token, marker = "" }) {
  const qs = new URLSearchParams({
    origin, departure_at: month, one_way: oneWay ? "true" : "false", unique: "false",
    sorting: "price", direct: "false", currency: "eur", limit: "1000", page: "1",
  });
  const r = await fetch(`${API}?${qs}`, { headers: { "X-Access-Token": token, "Accept-Encoding": "gzip" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (!j.success || !Array.isArray(j.data)) throw new Error("ei dataa");
  return j.data.map((x) => {
    let link = x.link ? `https://www.aviasales.com${x.link}` : null;
    if (link && marker) link += (link.includes("?") ? "&" : "?") + "marker=" + encodeURIComponent(marker);
    return {
      d: x.destination, a: x.destination_airport, p: x.price,
      tr: x.transfers, dur: x.duration_to, dep: x.departure_at, ret: x.return_at,
      al: x.airline, link,
    };
  });
}
