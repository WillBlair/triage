import { PDFParse } from 'pdf-parse'
import { sortDrugsByModelFitRank } from '../lib/sortRecommendationDrugs.js'

const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || ''

const JSON_RESPONSE_RULE =
  'Return ONLY valid JSON with no markdown, no preamble, and no extra commentary.'

const PARSE_SYSTEM = `You are a clinical intake parser.
Extract a concise structured patient profile from a medical PDF.
Return JSON with this shape:
{
  "patientName": "string",
  "age": "number or null",
  "sex": "string",
  "chiefConcern": "string",
  "summary": "2-3 sentence summary",
  "diagnoses": ["string"],
  "medications": ["string"],
  "allergies": ["string"],
  "vitals": [{ "label": "string", "value": "string" }],
  "labs": [{ "label": "string", "value": "string" }],
  "sourceHighlights": ["string"]
}
Only include information supported by the document text. ${JSON_RESPONSE_RULE}`

const RECOMMEND_SYSTEM = `You are a clinical decision support AI focused on arterial blood pressure.
Given a structured patient profile, compare exactly 3 plausible options that address hypertension, hypotension,
orthostatic symptoms related to antihypertensives, resistant hypertension, or BP diagnostic clarification
(e.g. out-of-office monitoring) as the profile warrants. Stay within this BP scope—do not pivot to unrelated
primary disease management (e.g. diabetes-only or pulmonary-only plans) unless the chart lacks any BP angle.
Return JSON with this shape:
{
  "overallReasoning": "string — at most 2 short sentences, under 220 characters total",
  "drugs": [
    {
      "name": "string",
      "dose": "string",
      "drugClass": "string — short label only, e.g. ARB",
      "fitScore": "integer 0–100, higher = stronger patient-specific fit; best option highest",
      "rationale": "string — exactly ONE tight sentence, max ~18 words; no second sentence",
      "cautions": ["string — max 2 items; each item one short phrase, max ~10 words"],
      "isNominalFit": false
    }
  ]
}
Rules:
- Present differentiated options rather than a single winner.
- Assign each option an integer "fitScore" from 0–100 for this patient (higher = stronger model-assessed fit). Use clearly separated values (e.g. 88, 72, 61) so rank order is obvious.
- The option with "isNominalFit": true must have the highest fitScore of the three.
- Order the "drugs" array by descending fitScore (best option first). The UI shows rank 1 for the first row.
- Mark at most one option with "isNominalFit": true, and only when it represents the model's nominal fit for demo purposes.
- Do not imply autonomous prescribing or that the clinician must choose the nominal fit.
- Brevity is required: UI shows compact cards. If you write long text, it will be trimmed—prefer sparse, scannable wording.
- Personalize to the profile; keep clinically plausible; put the single highest-yield caution in cautions (omit minor caveats).
${JSON_RESPONSE_RULE}`

const SIMULATION_SYSTEM = `You are a clinical monitoring and follow-up scenario narrator.
Given a patient profile and one selected contrast option, produce an 8-week educational monitoring scenario.
Return JSON with this shape:
{
  "summary": "paragraph",
  "projectedMetric": "string",
  "targetRange": { "low": 0, "high": 0 },
  "weeks": [
    { "week": 0, "label": "Now", "value": 162, "riskScore": 70, "sideEffectScore": 20 }
  ],
  "sideEffects": [
    { "effect": "string", "probability": 0, "severity": "mild|moderate|high", "note": "string" }
  ],
  "riskScores": [{ "label": "string", "score": 0 }],
  "takeaways": ["string"]
}
Rules:
- Keep values realistic and visually useful for demo purposes.
- Use educational, decision-support language only; do not write as an order or directive.
- Focus on expected trajectory, monitoring considerations, and follow-up pearls for discussion.
${JSON_RESPONSE_RULE}`

const STREAM_SYSTEM = `You are generating visible clinical analysis notes for a doctor demo.
Write short high-level analysis sentences only.
No markdown, no bullets, no JSON.
Keep each sentence specific to the patient and selected contrast option.
These notes will be streamed live in a monitoring scenario UI.`

async function askClaudeJson(system, payload, maxTokens = 1800) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  })

  if (!response.ok) {
    throw new Error((await response.text()) || 'Claude request failed.')
  }

  const data = await response.json()
  return JSON.parse(data.content?.[0]?.text || '{}')
}

async function* streamVisibleAnalysis(payload) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: STREAM_SYSTEM,
      stream: true,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || 'Claude stream failed.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .find((entry) => entry.startsWith('data: ') && entry !== 'data: [DONE]')

      if (!line) {
        continue
      }

      const payloadJson = JSON.parse(line.replace('data: ', ''))

      if (payloadJson.type === 'content_block_delta' && payloadJson.delta?.text) {
        yield payloadJson.delta.text
      }
    }
  }
}

export function createAiService() {
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Add it to your .env file (see README).',
    )
  }

  return {
    async parseDocument(fileBuffer) {
      const parser = new PDFParse({ data: fileBuffer })

      try {
        const parsed = await parser.getText()
        return askClaudeJson(PARSE_SYSTEM, {
          documentText: parsed.text.slice(0, 120000),
        })
      } finally {
        await parser.destroy()
      }
    },
    async createRecommendations(profile) {
      const raw = await askClaudeJson(RECOMMEND_SYSTEM, profile, 1000)
      return {
        ...raw,
        drugs: sortDrugsByModelFitRank(raw.drugs ?? []),
      }
    },
    async *streamSimulation({ profile, recommendation }) {
      for await (const chunk of streamVisibleAnalysis({ profile, recommendation })) {
        yield { type: 'thinking', chunk }
      }

      const simulation = await askClaudeJson(SIMULATION_SYSTEM, {
        profile,
        recommendation,
      })

      yield { type: 'result', simulation }
    },
  }
}
