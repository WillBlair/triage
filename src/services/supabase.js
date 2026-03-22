import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchDoctorProfile(userId) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('display_name, specialty, hospital, npi, workspace_name, onboarded')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching doctor profile:', error)
    return null
  }
  if (!data) return null

  return {
    doctorProfile: {
      displayName: data.display_name || '',
      specialty: data.specialty || '',
      hospital: data.hospital || '',
      npi: data.npi || '',
    },
    workspaceName: data.workspace_name || '',
    onboarded: data.onboarded || false,
  }
}

export async function upsertDoctorProfile(userId, { doctorProfile, workspaceName, onboarded }) {
  const { error } = await supabase
    .from('doctor_profiles')
    .upsert({
      id: userId,
      display_name: doctorProfile?.displayName || '',
      specialty: doctorProfile?.specialty || '',
      hospital: doctorProfile?.hospital || '',
      npi: doctorProfile?.npi || '',
      workspace_name: workspaceName ?? '',
      onboarded: onboarded ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

  if (error) {
    console.error('Error saving doctor profile:', error)
  }
  return !error
}
