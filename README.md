# Triage

**Triage** is a small **clinical decision-support demo** (hackathon-style): a three-step wizard that ingests **one discharge or clinic PDF**, uses **Claude** to build a structured patient snapshot, surfaces **three comparable drug regimens** with short rationale, then runs an **eight-week “what-if” projection** for the option you select—timeline chart first, then risk scores, side effects, and clinical pearls.

**Summary:** React (Vite) front end, Express API, Anthropic Messages API for parse, recommendations, and simulation (NDJSON stream with visible analysis chunks plus final structured projection). Outputs are **generative and illustrative**, not validated for real care.

## Demo flow

1. **Intake** — Upload a single clinical PDF; the panel becomes a patient snapshot (problems, meds, labs).
2. **Decide** — Pick one therapeutic row to carry forward.
3. **Simulate** — Run the model; the **timeline chart renders first**, then risk and effect summaries below.

## Local setup

- **Node 18+** recommended.
- **`ANTHROPIC_API_KEY`** — required. Add it to `.env` in the project root (file is gitignored). The API will not start without it.

```bash
npm install
npm run dev
```

Other commands: `npm run build`, `npm test`, `npm run client` / `npm run server` for front or API only.

## Prototype boundaries

- Not a diagnostic device; not clinically validated.
- Demo content depends on the PDF you upload; the UI is generic enough to narrate different clinical wedges.
