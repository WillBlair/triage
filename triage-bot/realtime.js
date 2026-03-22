/**
 * realtime.js — Platform-agnostic Supabase Realtime listener.
 * Watches the prescriptions table for INSERT events and triggers
 * a check-in callback when a matching Discord user is found.
 *
 * SQL SCHEMA REFERENCE:
 *   prescriptions(id, patient_email, medication_name, prescribed_at, checked_in, discord_user_id)
 *   discord_users(id, email, discord_user_id)
 *
 * Only this file and supabase.js interact with Supabase directly.
 * The onMatch callback is platform-specific and lives in index.js.
 */

const CHECK_IN_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Starts a Supabase Realtime subscription on the prescriptions table.
 * When a new prescription is inserted, looks up the patient's Discord account
 * by email and fires onMatch. In TESTING_MODE the callback fires immediately;
 * otherwise it is scheduled for 24 hours later.
 *
 * @param {object}   opts
 * @param {import("@supabase/supabase-js").SupabaseClient} opts.supabase
 * @param {(match: { discordUserId: string, prescriptionId: string, medicationName: string }) => Promise<void>} opts.onMatch
 * @param {boolean}  [opts.testingMode=false]
 * @returns The Supabase RealtimeChannel instance.
 */
export function startRealtimeListener({ supabase, onMatch, testingMode = false }) {
  const channel = supabase
    .channel("prescriptions-inserts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "prescriptions" },
      async (payload) => {
        const { id: prescriptionId, patient_email, medication_name } = payload.new;

        console.log(
          `[Triage Realtime] New prescription detected — email: ${patient_email}, medication: ${medication_name}`
        );

        if (!patient_email) {
          console.log("[Triage Realtime] No patient_email on row — skipping");
          return;
        }

        // Look up the patient's Discord account by email
        const { data, error } = await supabase
          .from("discord_users")
          .select("discord_user_id")
          .eq("email", patient_email.trim().toLowerCase())
          .maybeSingle();

        if (error) {
          console.error(
            "[Triage Realtime] Error looking up discord_users:",
            error.message
          );
          return;
        }

        if (!data) {
          console.log(
            `[Triage Realtime] No Discord match for email: ${patient_email} — skipping`
          );
          return;
        }

        const trigger = () =>
          onMatch({
            discordUserId: data.discord_user_id,
            prescriptionId,
            medicationName: medication_name,
          }).catch((err) =>
            console.error("[Triage Realtime] onMatch error:", err)
          );

        if (testingMode) {
          console.log(
            `[Triage Realtime] TESTING_MODE — triggering check-in immediately for ${data.discord_user_id}`
          );
          trigger();
        } else {
          console.log(
            `[Triage Realtime] Check-in scheduled in 24 hours for Discord user ${data.discord_user_id}`
          );
          setTimeout(trigger, CHECK_IN_DELAY_MS);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error("[Triage Realtime] Subscription error:", err.message);
      } else {
        console.log(`[Triage Realtime] Status: ${status}`);
      }
    });

  return channel;
}
