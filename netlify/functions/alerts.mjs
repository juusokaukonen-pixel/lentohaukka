// Lentohaukka: sähköpostihälytysten tilaus, vahvistus ja peruutus.
//   POST   /api/alerts                    {email, watch, id?, token?} -> luo tai päivittää seurannan
//   GET    /api/alerts?id=&token=         -> seurannan tila (pending / active)
//   DELETE /api/alerts?id=&token=         -> poistaa seurannan
//   GET    /api/alerts/confirm?id=&t=     -> vahvistuslinkki sähköpostista
//   GET    /api/alerts/unsub?id=&t=       -> peruutuslinkki sähköpostista
import { sendMail, mailConfigured, escHtml } from "../lib/mail.mjs";
import {
  store, newToken, isEmail, emailHash, getSub, saveSub, deleteSub, cleanWatch, MAX_PER_EMAIL,
} from "../lib/subs.mjs";
import { describeWatch } from "../lib/describe.mjs";

const json = (o, status = 200) => Response.json(o, { status, headers: { "Cache-Control": "no-store" } });
const siteUrl = (req) => (Netlify.env.get("URL") || new URL(req.url).origin).replace(/\/$/, "");

function page(title, body) {
  return new Response(`<!doctype html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(title)} · Lentohaukka</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.2rem;line-height:1.5;color:#1b2430}a{color:#c2410c;font-weight:600}</style></head>
<body><h1>${escHtml(title)}</h1>${body}<p><a href="/">← Takaisin Lentohaukkaan</a></p></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && a === b;

async function sendConfirm(req, sub) {
  const link = `${siteUrl(req)}/api/alerts/confirm?id=${sub.id}&t=${sub.ct}`;
  const what = describeWatch(sub.watch);
  return sendMail({
    to: sub.email,
    subject: "Vahvista Lentohaukan hintahälytys",
    text: `Hei!\n\nVahvista hintahälytys avaamalla linkki:\n${link}\n\nSeuranta: ${what}\nHälytys, kun hinta on alle ${sub.watch.alert} €.\n\nJos et tilannut tätä, voit jättää viestin huomiotta. Osoitettasi ei käytetä mihinkään ilman vahvistusta.\n\nLentohaukka`,
    html: `<p>Hei!</p><p>Vahvista hintahälytys:</p><p><a href="${escHtml(link)}" style="display:inline-block;background:#c2410c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Vahvista hälytys</a></p>
<p><b>Seuranta:</b> ${escHtml(what)}<br>Hälytys, kun hinta on alle <b>${sub.watch.alert} €</b>.</p>
<p style="color:#667">Jos et tilannut tätä, voit jättää viestin huomiotta. Osoitettasi ei käytetä mihinkään ilman vahvistusta.</p>`,
  });
}

async function emailIndex(email) {
  const key = `email/${await emailHash(email)}`;
  const data = (await store().get(key, { type: "json" })) || { ids: [], confirms: [] };
  return { key, data };
}

async function create(req, body) {
  const email = String(body.email || "").trim();
  if (!isEmail(email)) return json({ error: "Tarkista sähköpostiosoite" }, 400);
  const { key, data } = await emailIndex(email);
  // Siivotaan poistuneet tilaukset indeksistä
  const alive = [];
  for (const id of data.ids) if (await getSub(id)) alive.push(id);
  if (alive.length >= MAX_PER_EMAIL) return json({ error: `Enintään ${MAX_PER_EMAIL} seurantaa per osoite` }, 429);
  // Vahvistusviestejä enintään 5 / osoite / vrk (estää roskapostituksen muille)
  const dayAgo = Date.now() - 864e5;
  const confirms = (data.confirms || []).filter((t) => t > dayAgo);
  if (confirms.length >= 5) return json({ error: "Liian monta vahvistusviestiä tähän osoitteeseen tänään" }, 429);

  // Jos osoite on jo vahvistettu toisessa seurannassa, uusi seuranta aktivoituu suoraan
  let verified = false;
  for (const id of alive) { const s = await getSub(id); if (s && s.status === "active") { verified = true; break; } }

  const sub = {
    id: newToken(), token: newToken(), ct: newToken(), email, status: verified ? "active" : "pending",
    created: new Date().toISOString(), watch: cleanWatch(body.watch), ref: null, last: null, sent: 0,
  };
  if (!verified) {
    const ok = await sendConfirm(req, sub);
    if (!ok) return json({ error: "Vahvistusviestin lähetys epäonnistui, yritä myöhemmin" }, 502);
    confirms.push(Date.now());
  }
  await saveSub(sub);
  await store().setJSON(key, { ids: [...alive, sub.id], confirms });
  return json({ id: sub.id, token: sub.token, status: sub.status });
}

async function update(req, sub, body) {
  sub.watch = cleanWatch(body.watch);
  sub.ref = null; sub.last = null; // uudet ehdot -> uusi vertailukohta
  const email = body.email != null ? String(body.email).trim() : sub.email;
  if (email.toLowerCase() !== sub.email.toLowerCase()) {
    // Osoitteen vaihto: vanha tilaus pois ja uusi vahvistettavaksi
    await deleteSub(sub.id);
    return create(req, { ...body, email });
  }
  await saveSub(sub);
  return json({ id: sub.id, token: sub.token, status: sub.status });
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "");
  const id = url.searchParams.get("id");

  if (path.endsWith("/confirm")) {
    const sub = await getSub(id);
    if (!sub || !same(url.searchParams.get("t"), sub.ct)) return page("Linkki ei kelpaa", "<p>Seurantaa ei löytynyt. Se on ehkä jo poistettu.</p>");
    if (sub.status !== "active") { sub.status = "active"; sub.confirmed = new Date().toISOString(); await saveSub(sub); }
    return page("Hälytys on päällä ✓", `<p>Saat sähköpostia, kun seurantasi hinta alittaa <b>${sub.watch.alert} €</b>.</p><p>${escHtml(describeWatch(sub.watch))}</p><p>Hinnat tarkistetaan aamulla ja iltapäivällä.</p>`);
  }
  if (path.endsWith("/unsub")) {
    const sub = await getSub(id);
    if (sub && same(url.searchParams.get("t"), sub.token)) await deleteSub(sub.id);
    return page("Hälytys peruttu", "<p>Et saa enää sähköpostia tästä seurannasta. Osoitteesi on poistettu tämän seurannan tiedoista.</p>");
  }

  if (req.method === "GET") {
    const sub = await getSub(id);
    if (!sub || !same(url.searchParams.get("token"), sub.token)) return json({ status: "gone" }, 404);
    return json({ status: sub.status, last: sub.last });
  }
  if (req.method === "DELETE") {
    const sub = await getSub(id);
    if (sub && same(url.searchParams.get("token"), sub.token)) await deleteSub(sub.id);
    return json({ ok: true });
  }
  if (req.method === "POST") {
    if (!mailConfigured()) return json({ error: "Sähköposti-ilmoitukset eivät ole vielä käytössä" }, 503);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Virheellinen pyyntö" }, 400); }
    if (body && body.id) {
      const sub = await getSub(body.id);
      if (sub && same(body.token, sub.token)) return update(req, sub, body);
    }
    return create(req, body || {});
  }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: ["/api/alerts", "/api/alerts/confirm", "/api/alerts/unsub"] };
