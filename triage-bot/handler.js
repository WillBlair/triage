/**
 * handler.js — Core conversation logic for Triage.
 * Platform-agnostic: receives and returns plain objects.
 * Only index.js is Discord-specific.
 */

import Anthropic from "@anthropic-ai/sdk";
import { SYMPTOMS, shouldFlag } from "./checklist.js";
import {
  SYSTEM_PROMPT,
  personalizedGreeting,
  FOLLOWUP_PROMPT,
  EMERGENCY_MESSAGE,
  CLOSING_MESSAGE,
} from "./prompt.js";
import { logSession } from "./logger.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * In-memory session store keyed by user ID.
 * Shape: { stage: "checklist"|"freetext"|"done", symptoms: string[] }
 */
const sessions = new Map();

/**
 * Builds a Claude response for free-text follow-up using the Anthropic API.
 * @param {string[]} symptoms   Selected symptom values
 * @param {string}   freeText   User's free-text message
 * @returns {Promise<string>}
 */
async function buildClaudeResponse(symptoms, freeText) {
  const selectedLabels = symptoms
    .map((v) => SYMPTOMS.find((s) => s.value === v)?.label ?? v)
    .join(", ");

  const userMessage = [
    `The patient selected the following symptoms: ${selectedLabels || "none"}.`,
    freeText ? `They added: "${freeText}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return message.content[0].text;
}

// ---------------------------------------------------------------------------
// Public API — called by platform-specific adapters (e.g. index.js)
// ---------------------------------------------------------------------------

/**
 * Returns the greeting text and symptom list data for the checklist stage.
 * Call this when the user initiates a /checkin command or a Realtime trigger fires.
 *
 * @param {string}      userId
 * @param {string|null} [prescriptionId] — Supabase prescription UUID, if triggered by Realtime
 * @returns {{ greeting: string, symptoms: { value: string, label: string }[] }}
 */
/**
 * @param {string}      userId
 * @param {string|null} [prescriptionId]
 * @param {string|null} [patientName]    — Display name sourced from Discord or a DB lookup.
 */
export function startCheckin(userId, prescriptionId = null, patientName = null) {
  sessions.set(userId, { stage: "checklist", symptoms: [], prescriptionId, patientName });
  return { greeting: personalizedGreeting(patientName), symptoms: SYMPTOMS };
}

/**
 * Processes the symptom selections submitted via the select menu.
 * Returns the follow-up prompt text.
 *
 * @param {string}   userId
 * @param {string[]} selectedValues
 * @returns {{ followup: string }}
 */
export function handleSymptomSelection(userId, selectedValues) {
  const session = sessions.get(userId) ?? { stage: "checklist", symptoms: [] };
  session.symptoms = selectedValues;
  session.stage = "freetext";
  sessions.set(userId, session);
  return { followup: FOLLOWUP_PROMPT };
}

/**
 * Processes the user's free-text follow-up message.
 * Calls Claude, evaluates emergency flag, logs the session, and returns
 * the full response payload.
 *
 * @param {string} userId
 * @param {string} freeText
 * @returns {Promise<{
 *   claudeResponse: string,
 *   emergencyFlag: boolean,
 *   emergencyMessage: string | null,
 *   closing: string
 * }>}
 */
export async function handleFreeText(userId, freeText) {
  const session = sessions.get(userId) ?? { stage: "freetext", symptoms: [], prescriptionId: null };

  // Keep stage as "freetext" so the 5-minute inactivity window in index.js
  // can accept follow-up messages before closing the session.
  sessions.set(userId, session);

  const emergencyFlag = shouldFlag(session.symptoms, freeText);

  const [claudeResponse] = await Promise.all([
    buildClaudeResponse(session.symptoms, freeText),
  ]);

  session.lastClaudeResponse = claudeResponse;
  sessions.set(userId, session);

  await logSession({
    userId,
    symptoms: session.symptoms,
    freeText,
    emergencyFlag,
    prescriptionId: session.prescriptionId ?? null,
    claudeResponse,
  });

  return {
    claudeResponse,
    emergencyFlag,
    emergencyMessage: emergencyFlag ? EMERGENCY_MESSAGE : null,
  };
}

/**
 * Finalises a session: logs it and marks it done.
 * Called by the platform adapter (index.js) when the inactivity timeout fires.
 *
 * @param {string} userId
 * @param {string} [lastFreeText]
 * @returns {Promise<{ closing: string }>}
 */
export async function finalizeSession(userId, lastFreeText = "") {
  const session = sessions.get(userId);
  if (!session) return { closing: CLOSING_MESSAGE };

  session.stage = "done";
  sessions.set(userId, session);

  await logSession({
    userId,
    symptoms: session.symptoms,
    freeText: lastFreeText,
    emergencyFlag: shouldFlag(session.symptoms, lastFreeText),
    prescriptionId: session.prescriptionId ?? null,
    claudeResponse: session.lastClaudeResponse,
  });

  return { closing: CLOSING_MESSAGE };
}

/**
 * Returns the current session stage for a user, or null if no session exists.
 * @param {string} userId
 * @returns {"checklist"|"freetext"|"done"|null}
 */
export function getSessionStage(userId) {
  return sessions.get(userId)?.stage ?? null;
}

/**
 * Clears the session for a user (e.g. after completion or on error).
 * @param {string} userId
 */
export function clearSession(userId) {
  sessions.delete(userId);
}
