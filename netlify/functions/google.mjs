// Lentohaukka: palauttaa tallennetut Google-hinnat sivulle. Ei tee SerpApi-hakuja.
import { getStore } from "@netlify/blobs";

export default async () => {
  const data = await getStore("google").get("HEL", { type: "json" });
  return Response.json(data || { origin: "HEL", updated: null, months: {} }, {
    headers: { "Cache-Control": "public, max-age=900" },
  });
};

export const config = { path: "/api/google" };
