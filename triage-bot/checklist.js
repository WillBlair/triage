/**
 * checklist.js — Symptom checklist definitions.
 * Platform-agnostic: returns plain data structures only.
 */

export const SYMPTOMS = [
  { value: "nausea", label: "Nausea or upset stomach" },
  { value: "dizziness", label: "Dizziness or lightheadedness" },
  { value: "fatigue", label: "Fatigue or low energy" },
  { value: "headache", label: "Headache" },
  { value: "rash", label: "Rash or skin changes" },
  { value: "sleep", label: "Difficulty sleeping" },
  { value: "none", label: "No side effects — feeling fine" },
  { value: "other", label: "Something else (I'll describe below)" },
];

/** Keywords that trigger an emergency flag regardless of symptom count. */
export const EMERGENCY_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "cant breathe",
  "swelling",
  "severe",
];

/**
 * Returns true if the session should be flagged as an emergency.
 * @param {string[]} selectedValues - symptom value strings chosen by the user
 * @param {string} freeText - optional free-text response from the user
 */
export function shouldFlag(selectedValues, freeText = "") {
  if (selectedValues.length >= 3) return true;

  const lower = freeText.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}
