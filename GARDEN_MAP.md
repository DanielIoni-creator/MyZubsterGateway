# Urban Garden Map — `garden-map.html`

Interactive map of the MyZubster urban gardens: geolocation, garden data,
search, filters and data export.

Implements issue **#745 — 🌱 [BOUNTY] Mappa Orti Urbani - Geolocalizzazione**.

Delivered as a **self-contained static page** (`frontend/dist/garden-map.html`)
that follows the exact pattern already used in this repository for
`frontend/dist/garden.html`, `dashboard-*.html`, etc. — a single HTML file with
inline CSS and vanilla JavaScript, no build step. This keeps it deployable
exactly like the other product pages (Netlify publishes the repo root and serves
`/frontend/dist/garden-map.html`).

---

## Acceptance criteria (issue #745)

| # | Criterion | How it is met |
| --- | --- | --- |
| 1 | Interactive map | Leaflet 1.9 (CDN) + CARTO basemap, zoom + metric scale controls |
| 2 | Garden geolocation | one marker per garden + browser Geolocation API ("Trova orti vicini") |
| 3 | Garden data (name, area, crops) | normalized records surfaced in sidebar cards + detail panel |
| 4 | Search and filters | free-text search + city / crop / status facets |
| 5 | Data export | CSV / GeoJSON / JSON of the currently filtered set |

---

## Files

```
frontend/dist/garden-map.html   Self-contained page (markup + style + logic)
GARDEN_MAP.md                    This document
```

No backend changes. No new `npm` dependency — Leaflet is loaded from the
unpkg CDN inside the page, so this does **not** touch the already-out-of-sync
`package-lock.json`.

---

## Data source

The page resolves the gardens endpoint in this order (first one that returns a
non-empty, geolocated list wins; otherwise it falls back to the demo dataset):

1. `/api/gardens` — relative path; works behind the site's `/api` proxy.
2. `http://188.213.161.186:4000/api/gardens` — the endpoint given in the issue
   brief.

### Accepted payload shapes

The normalizer unwraps any of these envelopes:

```
[...]                      { data: [...] }          { gardens: [...] }
{ orti: [...] }            { features: [...] }       { items: [...] }   { results: [...] }
```

Each record is accepted in **both Italian and English field names** and coerced
into one canonical shape:

| Canonical | Accepted input keys |
| --- | --- |
| `id` | `id`, `_id`, `gardenId`, `slug` |
| `name` | `name`, `nome`, `title`, `titolo` |
| `city` | `city`, `citta`, `città`, `comune` |
| `region` | `region`, `regione`, `province` |
| `lat` / `lng` | `lat`/`latitude`/`latitudine`, `lng`/`lon`/`longitude`/`longitudine`, or GeoJSON `geometry.coordinates` (`[lng, lat]`) |
| `area` | `area`, `superficie`, `areaSqm`, `size` |
| `plots` | `plots`, `lotti`, `parcelle` |
| `crops` | `crops`, `colture`, `coltivazioni` (array or `;`-/`,`-delimited string) |
| `status` | `status`, `stato` — Italian values (`attivo`, `manutenzione`, `pianificato`, `inattivo`) map to `active` / `maintenance` / `planned` / `inactive` |
| `manager` | `manager`, `gestore`, `owner` |
| `updatedAt` | `updatedAt`, `updated_at`, `aggiornato` |

Records without usable coordinates are dropped (a marker without a position is
worse than none).

### Offline fallback

The fetch routine never throws. If every candidate fails (network/CORS/timeout)
or returns no geolocated garden, the page renders the bundled demo dataset of
**10 Italian gardens** and shows a non-blocking banner ("Dati dimostrativi")
explaining why. The map is therefore always usable — including in preview
deployments where the backend is unreachable. `orto-rimini-001` matches the
default garden id used by `UrbanGardenDashboard`, keeping the two pages
consistent.

---

## Features

**Map** — CARTO raster basemap (Voyager light / Dark Matter dark), zoom and
metric scale controls, `invalidateSize()` on a `ResizeObserver` so tiles never
leave grey gaps inside the responsive shell.

**Markers** — inline-SVG `divIcon` teardrops coloured by status (active /
maintenance / planned / inactive). The selected marker grows and is raised above
the rest; hover shows a name + city tooltip.

**Geolocation** — "Trova orti vicini" requests the browser position, drops a
pulsing user marker with an accuracy circle, flies the camera there, and
re-sorts the sidebar by great-circle distance (each card then shows km).
Permission-denied / unavailable / timeout errors are reported inline and the map
stays usable.

**Search & filters** — free-text search across name, city, region, manager and
crops, plus city / crop / status dropdowns built from the loaded data. Filters
drive the markers, the summary counters, the sidebar list **and** the export, so
the file always matches what is on screen; the camera refits to the filtered
bounds on every change.

**Detail panel** — name, place, status badge, area, plots, manager, last update,
crop chips, coordinates, distance from the visitor, and a link to
OpenStreetMap.

**Export** — generated client-side via `Blob` + object URL (nothing uploaded):

| Format | Notes |
| --- | --- |
| CSV | Italian headers, RFC 4180 escaping, UTF-8 BOM so Excel renders accents |
| GeoJSON | `FeatureCollection` of `Point` features, ready for QGIS / geojson.io |
| JSON | pretty-printed array of the filtered gardens |

Filename pattern: `orti-urban-YYYY-MM-DD.<ext>`.

**Theme** — light / dark / system toggle persisted in `localStorage`
(`mzg-map-theme`), which also swaps the basemap tiles. CSS variables are scoped
to the page wrapper, so the switch cannot leak into the rest of the site.

---

## How to preview

Open the file directly in a browser (internet access needed for the Leaflet CDN),
or serve the folder with any static server:

```bash
# from the repo root
python3 -m http.server 8080
# then visit http://localhost:8080/frontend/dist/garden-map.html
```

On the deployed site it is reachable at `/frontend/dist/garden-map.html`.

Local development needs no build and no `npm install` for this feature — Leaflet
loads from the CDN at runtime.

---

## Manual test checklist

- [ ] Page renders the map with markers, with and without the backend running
- [ ] Backend down → demo banner appears, map still usable
- [ ] Text search + city / crop / status filters narrow markers, list and counters
- [ ] `Azzera filtri` restores the full dataset
- [ ] Clicking a marker or a sidebar card opens the detail panel and centres the map
- [ ] `Trova orti vicini` asks for permission, shows the position, sorts by distance
- [ ] Denying permission shows an inline message and leaves the map usable
- [ ] CSV / GeoJSON / JSON downloads contain exactly the filtered gardens
- [ ] CSV opens in Excel with correct accented characters
- [ ] Light / dark / system toggle swaps tiles and survives a reload
- [ ] Layout holds at 1440 px, 1024 px and 375 px widths

---

## Reward

Per the issue, the bounty reward is **3,000 MYZ** (paid in MYZ / Tari token).
