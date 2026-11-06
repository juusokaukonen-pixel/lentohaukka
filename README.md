# Lentohaukka

Lentohintojen haku ja seuranta: hinta, etäisyys, lentoaika, kohdemaan hintataso, ilmasto ja lomat.

- `index.html` – sivusto
- `netlify/functions/prices.mjs` – hakee oikeat hinnat Travelpayouts / Aviasales Data API:sta (`/api/prices`)

Netlifyn ympäristömuuttujat:
- `TP_TOKEN` – Travelpayouts API-token (salainen)
- `TP_MARKER` – Travelpayouts Partner ID

Jos funktio ei vastaa, sivu käyttää esimerkkidataa.
