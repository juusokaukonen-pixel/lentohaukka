# Lentohaukka

Lentohintojen haku ja seuranta: hinta, etäisyys, lentoaika, kohdemaan hintataso, ilmasto ja lomat.

- `public/index.html` – sivusto
- `public/engine.mjs` – yhteinen hakulogiikka ja kohdedata (sivu + hälytykset)
- `netlify/functions/prices.mjs` – Travelpayouts / Aviasales -hinnat (`/api/prices`)
- `netlify/functions/google-daily.mjs` – ajastettu: Google Flights -hinnat Helsingistä kerran päivässä (SerpApi), tallennus Netlify Blobsiin
- `netlify/functions/google.mjs` – palauttaa tallennetut Google-hinnat (`/api/google`)
- `netlify/functions/alerts.mjs` – sähköpostihälytysten tilaus, vahvistus ja peruutus (`/api/alerts`)
- `netlify/functions/alerts-check.mjs` – ajastettu: tarkistaa seurannat klo 06 ja 15 UTC ja lähettää hälytykset
- `netlify/lib/` – yhteiset apumoduulit (Travelpayouts-haku, sähköposti, tilaukset)

Netlifyn ympäristömuuttujat:
- `TP_TOKEN` – Travelpayouts API-token (salainen)
- `TP_MARKER` – Travelpayouts Partner ID
- `SERPAPI_KEY` – SerpApi API-avain (salainen)
- `SMTP_USER` – hälytysten lähettäjäosoite, esim. erillinen Gmail-tili
- `SMTP_PASS` – Gmailin sovellussalasana (salainen)
- valinnaiset: `SMTP_HOST`, `SMTP_PORT` (oletus smtp.gmail.com:465), `MAIL_FROM`, `MAIL_DAILY_CAP` (oletus 400/vrk)

Google-haku pysyy SerpApin ilmaistasossa: 6 hakua päivässä, katto 240 hakua kuukaudessa.

Sähköpostihälytykset: tilaaja vahvistaa osoitteensa linkistä (double opt-in). Tilaukset ovat Netlify Blobsissa (store `alerts`). Jokaisessa viestissä on peruutuslinkki ja List-Unsubscribe-otsake. Varauslinkit sisältävät Travelpayouts-markerin.
