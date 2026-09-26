# HydroLog v1

Offline-first farm log for hydroponic growers in India. English + Hindi, no account, no server.

## Features
- **Crop recipes**: 14 crops (lettuce, palak, methi, dhaniya, basil, pudina, pak choi, kale, tomato, cucumber, capsicum, chilli, strawberry, microgreens) with EC/pH by growth stage.
- **Dosing calculator**: the A+B dose to top up a tank to target, or how much to drain if the tank is too strong. It accounts for the EC of the fill water, which matters for borewell water. It also estimates pH up/down doses.
- **Daily log**: EC/TDS, pH, temperatures, top-ups and issue tags. Each reading is graded against the target for the batch's current stage.
- **Farm dashboard**: shows each batch's crop day, stage, days to harvest and alerts. You can share a summary to WhatsApp.
- Supports **EC, TDS ppm 500-scale, and 700-scale** meters.
- **Calibration** for your own nutrient brand and pH products.
- **JSON backup/restore and CSV export**. All data stays on the device.

## Run it
- Quickest: double-click `index.html`. Everything works except install/offline caching.
- Full (installable, works offline): serve the folder over HTTP, e.g.
  `python -m http.server 8765` then open http://localhost:8765.
  To use it on a phone, host the folder on any static host with HTTPS (Netlify, GitHub Pages, Cloudflare Pages) and choose "Add to Home screen".

## Code
- `js/crops.js`: recipe data. Edit ranges here.
- `js/calc.js`: dosing, unit and grading maths. Pure functions with no DOM.
- `js/store.js`: localStorage persistence.
- `js/i18n.js`: English/Hindi strings.
- `js/app.js`: screens and routing.
- `sw.js`: offline cache. Bump `CACHE` when you ship changes.
