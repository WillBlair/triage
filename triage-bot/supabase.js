/**
 * supabase.js — Shared Supabase client for the Triage bot.
 * Uses the service role key so it can bypass RLS for server-side operations.
 *
 * SQL SCHEMA REFERENCE:
 *   prescriptions(id, patient_email, medication_name, prescribed_at, checked_in, discord_user_id)
 *   discord_users(id, email, discord_user_id)
 *   checkin_responses(id, prescription_id, discord_user_id, symptoms_selected, free_text_response, emergency_flagged, completed_at)
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isConfigured = url.startsWith("https://") && key.length > 10;

if (!isConfigured) {
  console.warn(
    "[Triage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — " +
    "Supabase features (Realtime, check-in logging) are disabled. " +
    "Set both in .env to enable them."
  );
}

let _supabase = null;

if (isConfigured) {
  // Pass `accessToken` as a custom async function so the Realtime client always
  // sends the service-role JWT in every phx_join payload, even after WebSocket
  // reconnects. Without this, the default auth callback returns null for
  // service-role keys (no active Supabase Auth session), and the server never
  // acknowledges the channel subscription.
  // Node.js <22 requires an explicit WebSocket transport for Realtime.
  // Without it, the client can send messages but never receives replies,
  // causing all channel subscriptions to time out silently.
  _supabase = createClient(url, key, {
    auth: { persistSession: false },
    realtime: {
      transport: ws,
      accessToken: async () => key,
    },
  });
  // Pre-set accessTokenValue so the phx_join includes access_token synchronously
  // (the async callback resolves too late when the join fires at connection time).
  _supabase.realtime.accessTokenValue = key;
}

export const supabase = _supabase;
