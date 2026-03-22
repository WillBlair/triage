# Triage

**Triage** is a small **clinical decision-support demo** (hackathon-style): a three-step wizard that ingests **one discharge or clinic PDF**, uses **Claude** to build a structured patient snapshot, surfaces **three comparable drug regimens** with short rationale, then runs an **eight-week monitoring and follow-up scenario** for the option you select.

**Summary:** React (Vite) front end, Express API, Anthropic Messages API for parse, comparison generation, and monitoring scenarios (NDJSON stream with visible analysis chunks plus final structured projection). Outputs are **generative and illustrative**, not validated for real care.

## Demo flow

1. **Intake** — Upload a single clinical PDF; the panel becomes a patient snapshot (problems, meds, labs).
2. **Compare** — Review three differentiated therapeutic rows and carry one forward.
3. **Monitor** — Run the model; the **timeline chart renders first**, then risk and follow-up summaries below.

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
