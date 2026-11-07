# Lentohaukka

Lentohintojen haku ja seuranta: hinta, etäisyys, lentoaika, kohdemaan hintataso, ilmasto ja lomat.

- `public/index.html` – sivusto
- `netlify/functions/prices.mjs` – Travelpayouts / Aviasales -hinnat (`/api/prices`)
- `netlify/functions/google-daily.mjs` – ajastettu: Google Flights -hinnat Helsingistä kerran päivässä (SerpApi), tallennus Netlify Blobsiin
- `netlify/functions/google.mjs` – palauttaa tallennetut Google-hinnat (`/api/google`)

Netlifyn ympäristömuuttujat:
- `TP_TOKEN` – Travelpayouts API-token (salainen)
- `TP_MARKER` – Travelpayouts Partner ID
- `SERPAPI_KEY` – SerpApi API-avain (salainen)

Google-haku pysyy SerpApin ilmaistasossa: 6 hakua päivässä, katto 240 hakua kuukaudessa.
