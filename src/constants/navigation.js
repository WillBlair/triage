export const SECTION = {
  ADD_PATIENT: 'add-patient',
  PROFILES: 'profiles',
  RECOMMENDATIONS: 'recommendations',
  SIMULATION: 'simulation',
  PRESCRIPTION: 'prescription',
  FOLLOW_UP: 'follow-up',
  SETTINGS: 'settings',
  DOCTOR_PROFILE: 'doctor-profile',
}

export const SIDEBAR_NAV = [
  { id: SECTION.ADD_PATIENT, label: 'Add new patient' },
  { id: SECTION.PROFILES, label: 'View existing patient profiles' },
  { id: SECTION.RECOMMENDATIONS, label: 'Drug comparison' },
  { id: SECTION.SIMULATION, label: 'Monitoring & follow-up' },
  { id: SECTION.PRESCRIPTION, label: 'Draft handoff' },
  { id: SECTION.FOLLOW_UP, label: 'Follow up' },
]
