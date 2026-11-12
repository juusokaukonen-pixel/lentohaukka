// Lentohaukka: ajastettu hintatarkistus sähköpostihälytyksille.
// Ajetaan klo 06 ja 15 UTC (Suomessa aamulla ja iltapäivällä). Jokainen reitti/kuukausi haetaan
// Travelpayoutsista vain kerran ajoa kohden, vaikka sitä seuraisi moni.
import { MONTHS, DEST, search, originsFor, indexOffers } from "../../public/engine.mjs";
import { fetchOffers } from "../lib/tp.mjs";
import { listSubs, saveSub } from "../lib/subs.mjs";
import { sendMail, escHtml } from "../lib/mail.mjs";
import { describeWatch, monthName } from "../lib/describe.mjs";

const MAX_ITEMS = 5;

// Päättää, lähteekö hälytys. Puhdas funktio, testattavissa ilman verkkoa.
export function decide(sub, results, now = new Date()) {
  const w = sub.watch;
  const cur = results[0];
  if (!cur) return { send: false };
  const ref = sub.ref ?? cur.p;
  const limit = Math.max(w.alert, w.drop ? Math.floor(ref * (1 - w.drop / 100)) : 0);
  const hits = results.filter((r) => r.p <= limit);
  if (!hits.length) return { send: false, ref };
  const top = hits[0];
  if (w.onlyNew && sub.last) {
    const seen = new Set(sub.last.dests || [sub.last.d]);
    const newDest = hits.some((r) => !seen.has(r.d));
    if (top.p >= sub.last.p && !newDest) return { send: false, ref };
  }
  // Ilman "vain uudet" -valintaa: sama tilanne korkeintaan kerran vuorokaudessa
  if (!w.onlyNew && sub.last && top.p >= sub.last.p && now - new Date(sub.last.at) < 20 * 3600e3) return { send: false, ref };
  return { send: true, ref, hits: hits.slice(0, MAX_ITEMS), limit };
}

const d2 = (t) => (t && t.length >= 10 ? `${+t.slice(8, 10)}.${+t.slice(5, 7)}.` : "");

function buildMail(site, sub, hits) {
  const what = describeWatch(sub.watch);
  const unsub = `${site}/api/alerts/unsub?id=${sub.id}&t=${sub.token}`;
  const rows = hits.map((r) => {
    const D = DEST[r.d];
    const dates = r.live ? `${d2(r.live.dep)}${r.live.ret ? "–" + d2(r.live.ret) : ""}` : monthName(r.m).toLowerCase();
    const stops = r.live ? (r.live.tr === 0 ? "suora" : r.live.tr === 1 ? "1 välilasku" : `${r.live.tr} välilaskua`) : "";
    return { D, r, dates, stops, link: r.live && r.live.link };
  });
  const subject = `${hits[0].p} € ${DEST[hits[0].d][0]} – Lentohaukan hintahälytys`;
  const text = `Hinta alitti rajasi (${sub.watch.alert} €).\nSeuranta: ${what}\n\n` +
    rows.map(({ D, r, dates, stops, link }) => `${r.p} €  ${r.o} → ${D[0]} (${D[1]})  ${dates}  ${stops}${link ? `\n  ${link}` : ""}`).join("\n") +
    `\n\nHinnat ovat Aviasalesin välimuistista ja voivat muuttua. Tarkista hinta ennen varaamista.\nLopeta tämä hälytys: ${unsub}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#1b2430">
<p style="margin:0 0 4px;color:#667">Lentohaukka · hintahälytys</p>
<h2 style="margin:0 0 6px">Hinta alitti rajasi (${sub.watch.alert} €)</h2>
<p style="margin:0 0 16px;color:#445">${escHtml(what)}</p>
${rows.map(({ D, r, dates, stops, link }) => `<table role="presentation" width="100%" style="border:1px solid #e3e6ea;border-radius:10px;margin:0 0 10px;padding:10px 12px"><tr>
<td><b style="font-size:16px">${escHtml(D[0])}</b> <span style="color:#667">${escHtml(D[1])}</span><br><span style="color:#445;font-size:14px">${r.o} → ${r.d} · ${escHtml(dates)}${stops ? " · " + stops : ""}</span>
${link ? `<br><a href="${escHtml(link)}" style="color:#c2410c;font-weight:600;font-size:14px">Katso lento ja varaa →</a>` : ""}</td>
<td align="right" style="font-size:22px;font-weight:800;white-space:nowrap">${r.p} €</td></tr></table>`).join("")}
<p style="color:#667;font-size:13px">Hinnat ovat Aviasalesin välimuistista ja voivat muuttua. Tarkista hinta ennen varaamista.</p>
<p style="font-size:13px"><a href="${site}/" style="color:#445">Avaa Lentohaukka</a> · <a href="${escHtml(unsub)}" style="color:#445">Lopeta tämä hälytys</a></p></div>`;
  return { subject, text, html, unsub };
}

export async function run({ now = new Date(), getOffers, send, subs, persist, site }) {
  const morning = now.getUTCHours() < 12;
  const cache = new Map();
  const want = (o, m, trip) => {
    const k = `${o}|${m}|${trip}`;
    if (!cache.has(k)) cache.set(k, getOffers(o, m, trip).then(indexOffers).catch((e) => { console.log(`${k}: ${e.message}`); return null; }));
    return cache.get(k);
  };
  let checked = 0, mailed = 0;
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    if (sub.watch.fq === 1 && !morning) continue;
    const s = sub.watch.s;
    const os = originsFor(s);
    const months = s.month === "all" ? MONTHS.map((m) => m[0]) : [s.month];
    const maps = {};
    for (const o of os) for (const m of months) maps[`${o}|${m}|${s.trip}`] = await want(o, m, s.trip);
    const ctx = { mode: "live", offers: (o, d, m, trip) => { const t = maps[`${o}|${m}|${trip}`]; return t ? t[d] : undefined; } };
    const results = search({ ...s, maxPrice: 99999, origins: os }, ctx);
    checked++;
    const dcs = decide(sub, results, now);
    sub.lastCheck = now.toISOString();
    if (results[0]) sub.lastBest = results[0].p;
    if (dcs.ref != null && sub.ref == null) sub.ref = dcs.ref;
    if (dcs.send) {
      const m = buildMail(site, sub, dcs.hits);
      if (await send({ to: sub.email, subject: m.subject, text: m.text, html: m.html, unsubscribe: m.unsub })) {
        sub.last = { p: dcs.hits[0].p, d: dcs.hits[0].d, dests: dcs.hits.map((r) => r.d), at: now.toISOString() };
        sub.sent = (sub.sent || 0) + 1;
        mailed++;
      }
    }
    await persist(sub);
  }
  return { checked, mailed, fetched: cache.size };
}

export default async () => {
  const token = Netlify.env.get("TP_TOKEN");
  if (!token) { console.log("TP_TOKEN puuttuu, ohitetaan"); return; }
  const marker = Netlify.env.get("TP_MARKER") || "";
  const site = (Netlify.env.get("URL") || "https://liitohaukka.netlify.app").replace(/\/$/, "");
  const res = await run({
    getOffers: (o, m, trip) => fetchOffers(o, m, { oneWay: trip === "ow", token, marker }),
    send: sendMail, subs: await listSubs(), persist: saveSub, site,
  });
  console.log(`Tarkistettu ${res.checked} seurantaa, haettu ${res.fetched} hintalistaa, lähetetty ${res.mailed} viestiä`);
};

export const config = { schedule: "0 6,15 * * *" };
