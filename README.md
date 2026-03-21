# Triage

**GitHub “About” description (232 chars):**  
`Clinical decision-support demo: upload one PDF, extract a patient snapshot (problems, meds, labs), compare three AI-ranked regimens, and run an eight-week projection with a timeline chart, risks, and effects. React, Express, Claude.`

Hackathon prototype for a narrow clinical workflow: **one PDF chart in** → structured patient snapshot → **three comparable regimens** → **eight-week projection** with risks and pearls.

## Demo flow

1. **Intake** — Upload a single clinical PDF; the panel becomes a patient snapshot (problems, meds, labs).
2. **Decide** — Pick one therapeutic row to carry forward.
3. **Simulate** — Run the model; the **timeline chart renders first**, then risk and effect summaries below.

## Local setup

- **Node 18+** recommended.
- **`ANTHROPIC_API_KEY`** — required for live parse, recommendations, and simulation. Without it, the server uses built-in demo data (`server/mockData.js`).
- Legacy env name **`VITE_ANTHROPIC_API_KEY`** is still read as a fallback but prefer `ANTHROPIC_API_KEY`.

```bash
npm install
npm run dev
```

Other commands: `npm run build`, `npm test`, `npm run client` / `npm run server` for front or API only.

## Prototype boundaries

- Not a diagnostic device; not clinically validated.
- Framed for **hypertension-style medication decisions** in the mock content; the UI is generic enough to narrate other wedges.
