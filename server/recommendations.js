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

const SIMULATION_SYSTEM = `You are a clinical simulation engine for a doctor decision-support tool.
Given a patient profile and one selected drug, produce a detailed 8-week BP projection.

Use the patient's actual data:
- Start the BP curve from their real discharge/current BP value
- Apply the selected drug's known mechanism and expected mmHg reduction timeline
- Factor in comorbidities (T2DM, CKD, obesity, retinopathy, LVH if present)
- Flag any NSAID use (ibuprofen) as a high-severity interaction that blunts antihypertensive effect
- Flag ACE-I allergy if present — never recommend ACE inhibitors
- Include hyperkalemia risk if ARB is selected and patient has concurrent K+ monitoring needs
- Target range should reflect clinical goal (typically 120-130 systolic for hypertension with end-organ damage)

Return JSON with this exact shape:
{
  "summary": "2-3 sentence clinical narrative specific to this patient and drug",
  "projectedMetric": "Systolic BP (mmHg)",
  "targetRange": { "low": 120, "high": 130 },
  "weeks": [
    { "week": 0, "label": "Now", "value": 158 },
    { "week": 1, "label": "Wk 1", "value": 152 },
    { "week": 2, "label": "Wk 2", "value": 147 },
    { "week": 3, "label": "Wk 3", "value": 143 },
    { "week": 4, "label": "Wk 4", "value": 139 },
    { "week": 5, "label": "Wk 5", "value": 136 },
    { "week": 6, "label": "Wk 6", "value": 133 },
    { "week": 7, "label": "Wk 7", "value": 131 },
    { "week": 8, "label": "Wk 8", "value": 128 }
  ],
  "sideEffects": [
    { "effect": "string", "probability": 0, "severity": "mild|moderate|high", "note": "string" }
  ],
  "riskScores": [
    { "label": "string", "score": 0 }
  ],
  "interactions": [
    { "source": "string", "target": "string", "severity": "none|mild|moderate|high", "note": "string" }
  ],
  "currentMeds": ["string"],
  "flags": [
    { "type": "warning|info|critical", "label": "string", "detail": "string" }
  ],
  "takeaways": ["string"]
}

For riskScores use 0-100 scale. Include risks like: Hyperkalemia, Renal impairment, Hypotension, NSAID interaction, Adherence risk.
For interactions list all pairwise drug pairs from currentMeds + selected drug.
For flags surface critical issues like NSAID conflict, allergy contraindications, monitoring requirements.
currentMeds should be the patient's full medication list including the new drug.
Keep BP values realistic — start from actual patient BP, trend toward target over 8 weeks.
${JSON_RESPONSE_RULE}`

const STREAM_SYSTEM = `You are a clinical AI narrating a live simulation for a doctor.
Write 4-6 short analysis sentences streamed one at a time.
Be specific to the patient's actual data — mention their real BP values, medications, comorbidities, and the selected drug.
Call out any critical flags like NSAID interactions, allergy conflicts, or monitoring requirements.
No markdown, no bullets, no JSON. Plain sentences only.
End with what the doctor should watch for at the 4-week follow-up.`

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
  const raw = data.content?.[0]?.text || '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
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
