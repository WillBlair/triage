import { PDFParse } from 'pdf-parse'

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

const RECOMMEND_SYSTEM = `You are a clinical decision support AI.
Given a structured patient profile, recommend exactly 3 drug options.
Return JSON with this shape:
{
  "overallReasoning": "paragraph",
  "drugs": [
    {
      "name": "string",
      "dose": "string",
      "drugClass": "string",
      "fitScore": 0,
      "rationale": "2 sentences",
      "cautions": ["string"],
      "isRecommended": true
    }
  ]
}
Personalize to the profile. Keep it clinically plausible and concise. ${JSON_RESPONSE_RULE}`

const SIMULATION_SYSTEM = `You are a clinical simulation narrator.
Given a patient profile and one selected drug, produce an 8-week projection.
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
Keep values realistic and visually interesting for demo purposes. ${JSON_RESPONSE_RULE}`

const STREAM_SYSTEM = `You are generating visible clinical analysis notes for a doctor demo.
Write short high-level analysis sentences only.
No markdown, no bullets, no JSON.
Keep each sentence specific to the patient and selected drug.
These notes will be streamed live in a simulation UI.`

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
      return askClaudeJson(RECOMMEND_SYSTEM, profile)
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
