/**
 * logger.js — Logs completed sessions to a local responses.json file
 * and persists them to Supabase.
 * Platform-agnostic. The local JSON log is a fallback; Supabase is the source of truth.
 *
 * SQL SCHEMA REFERENCE:
 *   checkin_responses(id, prescription_id, discord_user_id, symptoms_selected, free_text_response, emergency_flagged, completed_at)
 *   prescriptions(id, checked_in)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { supabase } from "./supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, "responses.json");

/**
 * Anonymizes a Discord user ID via SHA-256 hash.
 * @param {string} userId
 * @returns {string}
 */
function anonymizeId(userId) {
  return crypto.createHash("sha256").update(userId).digest("hex");
}

/**
 * Reads the current log array from disk (or returns [] if none).
 * @returns {object[]}
 */
function readLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Appends a completed session entry to responses.json and saves to Supabase.
 * Also marks the linked prescription as checked_in = true.
 *
 * @param {object}      session
 * @param {string}      session.userId           Raw Discord user ID (hashed for local log)
 * @param {string[]}    session.symptoms         Array of symptom values selected
 * @param {string}      session.freeText         Free-text follow-up response
 * @param {boolean}     session.emergencyFlag    Whether emergency flag was triggered
 * @param {string|null} session.prescriptionId   Supabase prescription UUID (may be null)
 */
export async function logSession({ userId, symptoms, freeText, emergencyFlag, prescriptionId, claudeResponse }) {
  const entry = {
    timestamp: new Date().toISOString(),
    userHash: anonymizeId(String(userId)),
    symptoms,
    freeText: freeText ?? "",
    emergencyFlag: Boolean(emergencyFlag),
    prescriptionId: prescriptionId ?? null,
  };

  // Persist to local JSON file (fallback / audit trail)
  const log = readLog();
  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), "utf8");

  // Persist to Supabase checkin_responses (skipped if Supabase is not configured)
  if (supabase) {
    const { data: crData, error: insertError } = await supabase
      .from("checkin_responses")
      .insert({
        prescription_id: prescriptionId ?? null,
        discord_user_id: String(userId),
        symptoms_selected: symptoms,
        free_text_response: freeText ?? "",
        emergency_flagged: Boolean(emergencyFlag),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Triage Logger] Failed to save to checkin_responses:", insertError.message);
    }

    // Save conversation messages so the doctor can view the full transcript
    if (crData?.id) {
      const now = new Date();
      const msgs = [];

      // Bot greeting
      msgs.push({
        checkin_response_id: crData.id,
        sender: "bot",
        message: "Hi! I'm Triage, your post-appointment check-in assistant. How are you feeling since your last visit?",
        sent_at: new Date(now.getTime() - 30000).toISOString(),
      });

      // Patient symptom selection
      if (symptoms.length > 0) {
        const labels = symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(", ");
        msgs.push({
          checkin_response_id: crData.id,
          sender: "patient",
          message: `I've been experiencing: ${labels}`,
          sent_at: new Date(now.getTime() - 20000).toISOString(),
        });
      }

      // Patient free text
      if (freeText) {
        msgs.push({
          checkin_response_id: crData.id,
          sender: "patient",
          message: freeText,
          sent_at: new Date(now.getTime() - 10000).toISOString(),
        });
      }

      // Bot Claude response
      if (claudeResponse) {
        msgs.push({
          checkin_response_id: crData.id,
          sender: "bot",
          message: claudeResponse,
          sent_at: now.toISOString(),
        });
      }

      // Emergency flag message
      if (emergencyFlag) {
        msgs.push({
          checkin_response_id: crData.id,
          sender: "bot",
          message: "I want to make sure you're safe right now. If you're experiencing severe symptoms, please call 911 or go to your nearest emergency room immediately. Your doctor has also been notified.",
          sent_at: new Date(now.getTime() + 1000).toISOString(),
        });
      }

      const { error: msgError } = await supabase
        .from("conversation_messages")
        .insert(msgs);

      if (msgError) {
        console.error("[Triage Logger] Failed to save conversation_messages:", msgError.message);
      }
    }

    // Mark the linked prescription as checked in
    if (prescriptionId) {
      const { error: updateError } = await supabase
        .from("prescriptions")
        .update({ checked_in: true })
        .eq("id", prescriptionId);

      if (updateError) {
        console.error("[Triage Logger] Failed to update prescriptions.checked_in:", updateError.message);
      }
    }
  }

  return entry;
}

const SYMPTOM_LABELS = {
  nausea: "Nausea or upset stomach",
  dizziness: "Dizziness or lightheadedness",
  fatigue: "Fatigue or low energy",
  headache: "Headache",
  rash: "Rash or skin changes",
  sleep: "Difficulty sleeping",
  none: "No side effects — feeling fine",
  other: "Something else",
};
