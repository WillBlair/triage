const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function readJson(response) {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload
}

export async function parseDocument(file) {
  const formData = new FormData()
  formData.append('document', file)

  const response = await fetch('/api/parse-document', {
    method: 'POST',
    body: formData,
  })

  const payload = await readJson(response)
  return payload.profile
}

export async function getRecommendations(profile) {
  const response = await fetch('/api/recommend', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ profile }),
  })

  const payload = await readJson(response)
  return payload.recommendations
}

export async function runSimulation(profile, recommendation, onEvent) {
  const response = await fetch('/api/simulate', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ profile, recommendation }),
  })

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Monitoring scenario request failed.')
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
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      onEvent(JSON.parse(line))
    }
  }
}

export async function savePrescription({ doctorId, patientProfile, selectedDrug, allRecommendations, simulation }) {
  const response = await fetch('/api/prescriptions', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ doctorId, patientProfile, selectedDrug, allRecommendations, simulation }),
  })

  return readJson(response)
}
