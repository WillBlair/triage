# Triage

**Triage** is a clinical decision-support demo: upload a discharge or clinic PDF, get a structured patient snapshot via Claude, compare three drug regimens with rationale, then run an eight-week monitoring scenario for the one you pick. Outputs are **generative and illustrative**, not validated for real care.

## Demo flow

1. **Intake** — Upload a clinical PDF; the panel becomes a patient snapshot (problems, meds, labs).
2. **Compare** — Review three differentiated therapeutic rows and carry one forward.
3. **Monitor** — Run the model; the timeline chart renders first, then risk and follow-up summaries stream in below.

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, React Router 7, Vite 8, Tailwind CSS 4, D3 |
| Backend | Express 5 (ESM), multer, cors |
| AI | Anthropic Messages API (Claude) — PDF-as-document, JSON prompts, NDJSON streaming |
| Auth / DB | Supabase (doctor profiles, prescriptions, intake tokens, avatar storage) |
| Email | Resend |
| Testing | Vitest, jsdom, Testing Library, Supertest |
| Deploy | Vercel (serverless Express adapter) |

## Project structure

```
├── api/index.js              Vercel serverless entry point
├── server/
│   ├── index.js              Local Express entry (loads .env, listens on PORT)
│   ├── app.js                Express app factory (routes, middleware, error handler)
│   ├── recommendations.js    Anthropic AI service (parse PDF, recommend, simulate, summarize)
│   ├── intake.js             Tokenized patient intake API (Supabase or in-memory fallback)
│   └── email.js              Resend integration for intake emails
├── src/
│   ├── main.jsx              Client entry — React Router (intake route + main app)
│   ├── App.jsx               Doctor workspace (auth, onboarding, wizard flow)
│   ├── pages/IntakePage.jsx  Public patient intake form
│   ├── components/           UI components (intake, recommendations, simulation, follow-up, settings)
│   ├── hooks/                Custom hooks (usePatients, etc.)
│   ├── services/             API client and Supabase client
│   └── constants/            Navigation config, demo patients
├── lib/                      Shared utilities (drug sorting, used by server + client)
├── public/demo/              Static assets — avatars, drug icons
├── triage-bot/               Companion Discord bot (separate package — see triage-bot/README.md)
└── vercel.json               Vercel routing config
```

## Local setup

Requires **Node 18+**.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root (gitignored):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key — the server will not start without it |
| `VITE_SUPABASE_URL` | No | Supabase project URL (enables auth, profiles, prescriptions, intake persistence) |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key |
| `RESEND_API_KEY` | No | Resend key for sending intake emails |
| `PORT` | No | Server port (default `8787`) |
| `HOST` | No | Server bind address (default `0.0.0.0`) |
| `ALLOWED_ORIGINS` | No | Comma-separated browser origins allowed for CORS (e.g. `https://yourapp.vercel.app,http://localhost:5173`). When unset, all origins are allowed (fine for local dev; set in production when the API is used cross-origin). |
| `ANTHROPIC_TIMEOUT_MS` | No | Max time in ms for each Anthropic API request (default `180000`). |

Without Supabase credentials the app still runs — intake tokens fall back to in-memory storage and auth/profile features are unavailable.

### 3. Run

```bash
npm run dev          # Express API + Vite dev server (proxy /api → localhost:8787)
```

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start API and Vite concurrently |
| `npm run server` | API only |
| `npm run client` | Vite dev server only |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Preview the production build (still proxies `/api`) |
| `npm test` | Run Vitest |
| `npm run lint` | ESLint |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/parse-document` | Upload a PDF → Claude → structured patient profile |
| POST | `/api/recommend` | Patient profile → three drug regimen recommendations |
| POST | `/api/simulate` | Profile + chosen recommendation → eight-week monitoring scenario (NDJSON stream) |
| POST | `/api/summarize-checkin` | Symptoms + free text → plain-text check-in summary |
| POST | `/api/prescriptions` | Save a prescription run (requires Supabase) |
| GET | `/api/prescriptions` | List prescription runs (`?doctorId=` optional) |
| POST | `/api/intake-tokens` | Create a magic-link intake record |
| GET | `/api/intake/:token` | Fetch intake config for a patient link |
| POST | `/api/intake/:token/submit` | Submit the patient intake form |
| GET | `/api/intake-tokens/:token/status` | Doctor-facing: intake status + submission data |
| DELETE | `/api/intake-tokens/:token` | Revoke an intake link |
| POST | `/api/send-intake-email` | Send an intake link via Resend |

## Deployment (Vercel)

`vercel.json` rewrites `/api/*` to the serverless adapter at `api/index.js` and everything else to `index.html`. Set server-side secrets (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, Supabase credentials) in the Vercel dashboard. `VITE_*` variables must be available at **build time** for the client bundle.

## Triage Bot

The `triage-bot/` directory contains a companion Discord bot for post-appointment patient follow-up. It has its own `package.json` and setup instructions — see [`triage-bot/README.md`](triage-bot/README.md).

## Prototype boundaries

- Not a diagnostic device; not clinically validated.
- Demo content depends on the PDF you upload — the UI is generic enough to narrate different clinical scenarios.
- Always ensure compliance with applicable healthcare privacy regulations before deploying in any production context.
