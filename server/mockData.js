export const mockParsedProfile = {
  patientName: 'Margaret Chen',
  age: 68,
  sex: 'Female',
  chiefConcern: 'Persistent uncontrolled hypertension',
  summary:
    '68-year-old woman with hypertension, type 2 diabetes, and stage 3 CKD. Recent clinic packet shows persistent systolic blood pressure elevation despite current outpatient therapy.',
  diagnoses: ['Hypertension', 'Type 2 diabetes', 'Chronic kidney disease stage 3'],
  medications: ['Lisinopril 20 mg daily', 'Metformin 1000 mg BID', 'Atorvastatin 40 mg nightly'],
  allergies: ['Sulfa antibiotics'],
  vitals: [
    { label: 'Blood pressure', value: '162/94 mmHg' },
    { label: 'Heart rate', value: '78 bpm' },
    { label: 'Weight', value: '72 kg' },
  ],
  labs: [
    { label: 'eGFR', value: '52 mL/min' },
    { label: 'HbA1c', value: '7.2%' },
    { label: 'ALT', value: '26 U/L' },
  ],
  sourceHighlights: [
    'Persistent systolic readings above goal across recent visits.',
    'Current ACE inhibitor therapy already in place.',
    'Kidney function and diabetes status affect add-on medication choice.',
  ],
}

export const mockRecommendations = {
  overallReasoning:
    'This profile favors an add-on antihypertensive that lowers systolic pressure without worsening kidney function or duplicating renin-angiotensin blockade. Amlodipine is the cleanest first pick, with thiazide-type therapy and ARB substitution as secondary scenarios.',
  drugs: [
    {
      name: 'Amlodipine',
      dose: '5 mg daily',
      drugClass: 'Calcium channel blocker',
      fitScore: 92,
      rationale:
        'Strong expected BP reduction, safe with current ACE inhibitor use, and no clear conflict with renal function.',
      cautions: ['Watch for edema and headache.'],
      isRecommended: true,
    },
    {
      name: 'Chlorthalidone',
      dose: '12.5 mg daily',
      drugClass: 'Thiazide-like diuretic',
      fitScore: 78,
      rationale:
        'Good antihypertensive efficacy, but metabolic effects and sulfa-history discussion make it less clean as the first choice.',
      cautions: ['Monitor sodium, potassium, and glucose.'],
      isRecommended: false,
    },
    {
      name: 'Losartan',
      dose: '50 mg daily',
      drugClass: 'ARB',
      fitScore: 63,
      rationale:
        'Could be useful if moving off ACE inhibitor therapy, but is not a clean add-on to existing lisinopril.',
      cautions: ['Avoid ACE + ARB combination therapy.'],
      isRecommended: false,
    },
  ],
}

export const mockSimulation = {
  summary:
    'Amlodipine shows the strongest projected systolic decline over 8 weeks while keeping renal and electrolyte risk comparatively low.',
  visibleThinking: [
    'Reading baseline profile and identifying the main treatment problem: uncontrolled systolic hypertension.',
    'Checking whether the current regimen already contains an ACE inhibitor or ARB to avoid unsafe duplication.',
    'Comparing add-on options based on kidney function, diabetes, side-effect burden, and likely speed of blood pressure improvement.',
    'Projecting 8-week trend and highlighting the risk trade-offs that matter for this patient.',
  ],
  projectedMetric: 'Systolic blood pressure',
  targetRange: { low: 124, high: 136 },
  weeks: [
    { week: 0, label: 'Now', value: 162, riskScore: 74, sideEffectScore: 18 },
    { week: 1, label: 'Wk 1', value: 157, riskScore: 69, sideEffectScore: 20 },
    { week: 2, label: 'Wk 2', value: 151, riskScore: 61, sideEffectScore: 22 },
    { week: 4, label: 'Wk 4', value: 144, riskScore: 53, sideEffectScore: 24 },
    { week: 6, label: 'Wk 6', value: 138, riskScore: 46, sideEffectScore: 24 },
    { week: 8, label: 'Wk 8', value: 133, riskScore: 38, sideEffectScore: 23 },
  ],
  sideEffects: [
    { effect: 'Peripheral edema', probability: 18, severity: 'moderate', note: 'Most likely after dose exposure accumulates.' },
    { effect: 'Headache', probability: 11, severity: 'mild', note: 'Often transient during initiation.' },
    { effect: 'Flushing', probability: 6, severity: 'mild', note: 'Low-likelihood tolerability issue.' },
  ],
  riskScores: [
    { label: 'Renal strain', score: 24 },
    { label: 'Drug interaction', score: 14 },
    { label: 'Adherence friction', score: 20 },
    { label: 'Overall adverse event risk', score: 29 },
  ],
  takeaways: [
    'Projected blood pressure reaches the target band by week 8.',
    'Risk profile is driven more by edema than by organ toxicity.',
    'No major interaction red flags with the current medication list.',
  ],
}
