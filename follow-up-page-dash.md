# Draft A — Follow Up Page (Dashboard Layout)

## Overview
A two-section dashboard that combines metric summary cards at the top
with a two-panel split view below. Left panel shows all patients with
check-in statuses. Right panel shows full detail for the selected patient.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ CARE PLAN                                           │
│ Follow up                                           │
│ Check-in status and real-time patient responses.    │
│                                                     │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│ │ Total     │ │ Completed │ │ Flagged   │          │
│ │ sent: 4   │ │ 2         │ │ 1 (red)   │          │
│ └───────────┘ └───────────┘ └───────────┘          │
├──────────────────┬──────────────────────────────────┤
│ LEFT PANEL       │ RIGHT PANEL (detail)             │
│ Patient list     │                                  │
│                  │ [Avatar] Rita Kim                │
│ 🔴 Rita Kim      │ Atorvastatin 20mg · email        │
│ Atorvastatin     │ [Emergency flag badge]           │
│ Flag · 1 day ago │                                  │
│                  │ SYMPTOMS                         │
│ James Morris     │ [Chest tightness] [Breathing]    │
│ Metformin        │                                  │
│ Done · 2hrs ago  │ PATIENT NOTE                     │
│                  │ "Started feeling tightness..."   │
│ Sara Patel       │                                  │
│ Lisinopril       │ [View conversation (5 msgs)]     │
│ Pending · 5hrs   │ [Resend check-in]                │
│                  │                                  │
│ Tom Nguyen       │ Completed · 1 day ago            │
│ Warfarin         │                                  │
│ Sent · 3hrs ago  │                                  │
└──────────────────┴──────────────────────────────────┘
```

---

## Metric Cards

| Card | Value | Notes |
|------|-------|-------|
| Total sent | Count of all prescriptions with check-in triggered | Updates via Supabase Realtime |
| Completed | Count of checkin_responses with completed status | Updates via Supabase Realtime |
| Flagged | Count where emergency_flagged = true | Shown in red (#A32D2D) if > 0 |

---

## Left Panel — Patient List

### Data source
- Pulls from the same `patients` table used by View Existing Patient Profiles
- Joined with `prescriptions` and `checkin_responses` tables
- Shared Supabase query — not duplicated

### Sort order
1. Emergency flagged patients — always top
2. Pending
3. Sent
4. Completed

### Patient row contents
- Avatar circle with initials
- Patient full name
- Medication name (from prescriptions table)
- Status badge (see below)
- Timestamp of last check-in

### Status badges
| Status | Badge color | Background tint |
|--------|------------|-----------------|
| Emergency flag | Red (#791F1F on #FCEBEB) | Red tint (#FCEBEB), red border (#F09595) |
| Completed | Blue (#0C447C on #E6F1FB) | Default surface |
| Pending | Amber (#633806 on #FAEEDA) | Default surface |
| Sent | Teal (#0F6E56 on #E1F5EE) | Default surface |

### Real-time triggers (Supabase Realtime)
- New patient added → row appears instantly
- Prescription updated → medication name updates
- Check-in response received → status badge updates
- Emergency flag triggered → patient moves to top, badge turns red

---

## Right Panel — Detail View

### Empty state
When no patient is selected:
- Center-aligned text: "Select a patient to view their check-in details"
- Muted secondary color

### Selected patient state
| Element | Details |
|---------|---------|
| Avatar | Initials circle, color matches status tint |
| Name | 15px, font-weight 500 |
| Medication + email | 12px, secondary color |
| Status badge | Matches left panel badge |
| Symptoms | Pill tags, surface background |
| Patient note | Quoted text in surface background box |
| Timestamp | Muted, bottom of content |
| View conversation button | Teal outline button, shows message count e.g. "(5 msgs)" |
| Resend check-in button | Neutral outline button |

### Real-time behavior
- If a new response arrives for the currently selected patient,
  the detail panel updates without requiring re-selection

---

## Check-In Trigger Logic

### Automatic
- Triggered when a new row is inserted into `prescriptions`
- Inserts into `checkin_queue` table
- TESTING_MODE=true → scheduled_for = now()
- TESTING_MODE=false → scheduled_for = now() + 24 hours

### Manual
- "Send check-in" button available in the detail panel
- Allows doctor to manually trigger at any time for selected patient

---

## Supabase Tables Required

### checkin_queue
```sql
create table if not exists checkin_queue (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid references prescriptions(id),
  patient_email text not null,
  scheduled_for timestamptz not null,
  sent boolean default false
);
```

### Realtime subscriptions needed
- prescriptions → INSERT, UPDATE
- checkin_responses → INSERT, UPDATE
- patients → INSERT
- checkin_queue → INSERT

---

## Visual Style
- Matches existing app: teal (#1D9E75), same card styles, same sidebar
- Font: same as existing app (Anthropic Sans or system sans)
- Card border: 0.5px solid border-tertiary
- Card radius: border-radius-lg
- Surface background for secondary elements
- No gradients, no shadows

---

## Connection to View Existing Patient Profiles
- Both pages share the same Supabase patients query
- Implemented as a shared hook (e.g. usePatients)
- Any patient added via Add New Patient appears on Follow Up in real time
- No page refresh required
