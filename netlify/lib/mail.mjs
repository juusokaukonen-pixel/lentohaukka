// Sähköpostin lähetys SMTP:llä (oletuksena Gmail). Ympäristömuuttujat:
//   SMTP_USER  – lähettäjän osoite, esim. lentohaukka.hinnat@gmail.com
//   SMTP_PASS  – Gmailin sovellussalasana (ei tilin tavallinen salasana)
//   SMTP_HOST / SMTP_PORT – valinnaiset, oletus smtp.gmail.com:465
//   MAIL_DAILY_CAP – valinnainen päiväkatto, oletus 400 (Gmailin raja on 500/vrk)
import nodemailer from "nodemailer";
import { getStore } from "@netlify/blobs";

const env = (k) => Netlify.env.get(k);
let transport = null;

export function mailConfigured() {
  return !!(env("SMTP_USER") && env("SMTP_PASS"));
}

function getTransport() {
  if (!transport) {
    const port = Number(env("SMTP_PORT") || 465);
    transport = nodemailer.createTransport({
      host: env("SMTP_HOST") || "smtp.gmail.com", port, secure: port === 465,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    });
  }
  return transport;
}

// Lähettää viestin, ellei päivän katto ole täynnä. Palauttaa true/false.
export async function sendMail({ to, subject, text, html, unsubscribe }) {
  if (!mailConfigured()) { console.log("SMTP_USER / SMTP_PASS puuttuu, viestiä ei lähetetty"); return false; }
  const store = getStore("alerts");
  const dayKey = `mailcount/${new Date().toISOString().slice(0, 10)}`;
  const sent = Number((await store.get(dayKey)) || 0);
  const cap = Number(env("MAIL_DAILY_CAP") || 400);
  if (sent >= cap) { console.log(`Päivän sähköpostikatto ${cap} täynnä`); return false; }
  const from = env("MAIL_FROM") || `Lentohaukka <${env("SMTP_USER")}>`;
  const headers = unsubscribe ? { "List-Unsubscribe": `<${unsubscribe}>` } : undefined;
  try {
    await getTransport().sendMail({ from, to, subject, text, html, headers });
  } catch (e) {
    console.log(`Lähetys epäonnistui: ${e.message}`);
    return false;
  }
  await store.set(dayKey, String(sent + 1));
  return true;
}

export const escHtml = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
