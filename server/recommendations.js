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
      "rationale": "string — 1-2 cohesive sentences of detailed clinical rationale explaining the fit",
      "cautions": ["string — 1-2 items; clinical warnings or monitoring needs"],
      "estimatedCost": "string — e.g. 'Est. $10/mo', 'Est. $4-10/mo', 'Tier 1'",
      "guidelineCitation": "string — very brief, e.g. 'ACC/AHA 2017: First-line for HTN/Diabetes'",
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
- Provide thorough, clinical reasoning in the rationale. Only the guidelineCitation and estimatedCost need to be strictly brief.
- Personalize to the profile; keep clinically plausible.
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
- Ensure the trajectory is clinically logical (e.g., if reducing a BP med dose to treat orthostatic hypotension, BP might rise slightly; if adding a med, BP should drop). Explain this explicitly in the summary.

Return JSON with this exact shape:
{
  "summary": "2-3 sentence clinical narrative explicitly naming the patient. Explain exactly why their trajectory is moving in the charted direction with this specific drug.",
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

export function createAiService() {
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Add it to your .env file (see README).',
    )
  }

  return {
    async parseDocument(fileBuffer) {
      // Send the PDF directly to Claude — no local parsing needed
      const base64Pdf = Buffer.from(fileBuffer).toString('base64')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1800,
          system: PARSE_SYSTEM,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Pdf,
                },
              },
              {
                type: 'text',
                text: 'Parse this clinical document and return the structured JSON profile.',
              },
            ],
          }],
        }),
      })

      if (!response.ok) {
        throw new Error((await response.text()) || 'Claude PDF parse request failed.')
      }

      const data = await response.json()
      const raw = data.content?.[0]?.text || '{}'
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return JSON.parse(cleaned)
    },
    async createRecommendations(profile) {
      const raw = await askClaudeJson(RECOMMEND_SYSTEM, profile, 1000)
      return {
        ...raw,
        drugs: sortDrugsByModelFitRank(raw.drugs ?? []),
      }
    },
    async summarizeCheckin({ symptoms, freeText, medicationName }) {
      const symptomLabels = {
        nausea: 'Nausea or upset stomach',
        dizziness: 'Dizziness or lightheadedness',
        fatigue: 'Fatigue or low energy',
        headache: 'Headache',
        rash: 'Rash or skin changes',
        sleep: 'Difficulty sleeping',
        none: 'No side effects — feeling fine',
        other: 'Something else',
      }
      const labeledSymptoms = (symptoms ?? [])
        .map((s) => symptomLabels[s] ?? s)
        .join(', ')
      const userContent = [
        `Medication: ${medicationName || 'unknown'}`,
        `Symptoms selected: ${labeledSymptoms || 'none'}`,
        freeText ? `Patient message: "${freeText}"` : '',
      ]
        .filter(Boolean)
        .join('\n')
      const CHECKIN_SUMMARY_SYSTEM = `You are a clinical AI reviewing a post-prescription check-in response from a patient.
Given the medication, symptoms selected, and free-text description, write a brief clinical summary (2-3 sentences) that a clinician can quickly scan to assess the patient's status.
Focus on whether symptoms are expected for this medication, any concerning patterns, and recommended next steps if warranted.
Be concise and clinical. Do not diagnose or prescribe. Return plain text only — no markdown, no JSON.`
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: CHECKIN_SUMMARY_SYSTEM,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      if (!response.ok) {
        throw new Error((await response.text()) || 'Claude request failed.')
      }
      const data = await response.json()
      return data.content?.[0]?.text?.trim() ?? ''
    },
    async *streamSimulation({ profile, recommendation }) {
      const simulation = await askClaudeJson(SIMULATION_SYSTEM, {
        profile,
        recommendation,
      })

      yield { type: 'result', simulation }
    },
  }
}
