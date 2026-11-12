// Lyhyt suomenkielinen kuvaus seurannasta sähköpostia varten.
import { ORIGINS, MONTHS, PRICE_MAX, KM_MAX } from "../../public/engine.mjs";

const fmt = (n) => n.toLocaleString("fi-FI");
export const monthName = (m) => ((MONTHS.find((x) => x[0] === m) || [0, m])[1]);

export function describeWatch(w) {
  const s = w.s;
  const parts = [`${ORIGINS[s.origin][0]}${s.near ? ` + ${s.radius} km` : ""}`];
  if (s.trip === "ow") parts.push("vain meno");
  if (s.maxPrice < PRICE_MAX) parts.push(`alle ${s.maxPrice} €`);
  if (s.minKm && s.maxKm < KM_MAX) parts.push(`${fmt(s.minKm)}–${fmt(s.maxKm)} km`);
  else if (s.minKm) parts.push(`yli ${fmt(s.minKm)} km`);
  else if (s.maxKm < KM_MAX) parts.push(`alle ${fmt(s.maxKm)} km`);
  parts.push(s.month === "all" ? "joustava aika" : monthName(s.month).toLowerCase());
  const extra = [s.pl.length && s.pl.length < 5, s.rain.length && s.rain.length < 3, s.day.length && s.day.length < 3,
    s.night.length && s.night.length < 3, s.maxDirect, s.maxStop, s.amOut, s.pmRet, s.canna].filter(Boolean).length;
  if (extra) parts.push(`+ ${extra} lisäehtoa`);
  return (w.name ? `${w.name}: ` : "") + parts.join(" · ");
}
