import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { DEMO_PATIENTS } from '../constants/demoPatients'

/**
 * Shared hook — used by both Patient Library and Follow Up Dashboard.
 * Fetches patients from Supabase, merges with demo patients,
 * and subscribes to Realtime for live updates.
 *
 * Supabase `patients` table schema:
 *   id, user_id, name, dob, sex, mrn, concerns (text[]), notes (text),
 *   email, phone, chief_concern, profile (jsonb),
 *   created_at, updated_at
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

      if (doctorId) query = query.eq('user_id', doctorId)

      const { data, error } = await query
      if (error) {
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
      chartLabel: row.name || 'Patient',
      avatarSrc: '',
      profile: {
        patientName: row.name || '',
        age: row.profile?.age ?? (row.dob ? Math.floor((Date.now() - new Date(row.dob).getTime()) / (365.25 * 24 * 3600_000)) : null),
        sex: row.sex || row.profile?.sex || '',
        chiefConcern: row.chief_concern || (row.concerns || []).join(', ') || row.profile?.chiefConcern || '',
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
  const p = entry.profile || {}

  const row = {
    user_id: doctorId || null,
    name: p.patientName || 'Unknown',
    dob: p.dob || null,
    sex: p.sex || null,
    mrn: p.mrn || null,
    concerns: p.chiefConcern ? p.chiefConcern.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
    notes: p.summary || '',
  }

  // Add optional columns if they exist on the table (added via ALTER TABLE)
  const optionalFields = {
    email: p.email || null,
    phone: p.phone || null,
    chief_concern: p.chiefConcern || null,
    profile: p,
  }

  const { error, data } = await supabase
    .from('patients')
    .insert({ ...row, ...optionalFields })
    .select('id')
    .single()

  if (error) {
    // If optional columns don't exist, retry without them
    if (error.code === 'PGRST204' || error.message?.includes('column')) {
      const { error: retryError, data: retryData } = await supabase
        .from('patients')
        .insert(row)
        .select('id')
        .single()
      if (retryError) {
        console.error('[savePatientToSupabase] insert error:', retryError)
        return null
      }
      return retryData?.id ?? null
    }
    console.error('[savePatientToSupabase] insert error:', error)
    return null
  }
  return data?.id ?? null
}
