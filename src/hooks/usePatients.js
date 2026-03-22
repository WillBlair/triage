import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { DEMO_PATIENTS } from '../constants/demoPatients'

/**
 * Shared hook — used by both Patient Library and Follow Up Dashboard.
 * Fetches patients from Supabase, merges with demo patients,
 * and subscribes to Realtime for live updates.
 */
export default function usePatients(doctorId) {
  const [dbPatients, setDbPatients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPatients = useCallback(async () => {
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (doctorId) query = query.eq('doctor_id', doctorId)

      const { data, error } = await query
      if (error) {
        // Table may not exist yet — fail silently
        console.warn('[usePatients] fetch error:', error.message)
        setDbPatients([])
      } else {
        setDbPatients(data ?? [])
      }
    } catch {
      setDbPatients([])
    }
    setLoading(false)
  }, [doctorId])

  useEffect(() => {
    fetchPatients()
    const channel = supabase
      .channel('patients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, fetchPatients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPatients])

  // Convert Supabase rows to the same shape as DEMO_PATIENTS entries
  const savedPatients = useMemo(() => {
    return dbPatients.map((row) => ({
      id: row.id,
      chartLabel: row.patient_name,
      avatarSrc: '',
      profile: {
        patientName: row.patient_name || '',
        age: row.profile?.age ?? null,
        sex: row.profile?.sex || row.sex || '',
        chiefConcern: row.profile?.chiefConcern || row.chief_concern || '',
        summary: row.profile?.summary || '',
        diagnoses: row.profile?.diagnoses || [],
        medications: row.profile?.medications || [],
        allergies: row.profile?.allergies || [],
        vitals: row.profile?.vitals || [],
        labs: row.profile?.labs || [],
        sourceHighlights: row.profile?.sourceHighlights || [],
        email: row.email || row.profile?.email || '',
        phone: row.phone || row.profile?.phone || '',
        mrn: row.mrn || row.profile?.mrn || '',
        dob: row.dob || row.profile?.dob || '',
      },
    }))
  }, [dbPatients])

  // All patients = Supabase rows + demo patients
  const allPatients = useMemo(
    () => [...savedPatients, ...DEMO_PATIENTS],
    [savedPatients],
  )

  return { allPatients, savedPatients, demoPatients: DEMO_PATIENTS, loading, refetch: fetchPatients }
}

/**
 * Save a patient entry to Supabase.
 * Called from AddPatientIntake when a new patient is merged.
 */
export async function savePatientToSupabase(doctorId, entry) {
  const profile = entry.profile || {}
  const { error, data } = await supabase
    .from('patients')
    .insert({
      doctor_id: doctorId || null,
      patient_name: profile.patientName || 'Unknown',
      email: profile.email || null,
      phone: profile.phone || null,
      mrn: profile.mrn || null,
      dob: profile.dob || null,
      sex: profile.sex || null,
      chief_concern: profile.chiefConcern || null,
      profile: profile, // full profile as JSONB
    })
    .select('id')
    .single()

  if (error) {
    console.error('[savePatientToSupabase] insert error:', error)
    return null
  }
  return data?.id ?? null
}
