import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchDoctorProfile(userId) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('id, user_id, display_name, specialty, hospital, npi, workspace_name, onboarded, avatar_url')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine for new users
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
      avatarUrl: data.avatar_url || '',
    },
    workspaceName: data.workspace_name || '',
    onboarded: data.onboarded === true,
  }
}

export async function upsertDoctorProfile(userId, { doctorProfile, workspaceName, onboarded }) {
  const row = {
    user_id: userId,
    display_name: doctorProfile?.displayName || '',
    specialty: doctorProfile?.specialty || '',
    hospital: doctorProfile?.hospital || '',
    npi: doctorProfile?.npi || '',
    workspace_name: workspaceName ?? '',
    onboarded: onboarded ?? false,
    updated_at: new Date().toISOString(),
  }

  if (doctorProfile?.avatarUrl !== undefined) {
    row.avatar_url = doctorProfile.avatarUrl || null
  }

  const { error } = await supabase
    .from('doctor_profiles')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    console.error('Error saving doctor profile:', error)
  }
  return !error
}

export async function uploadDoctorAvatar(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    return null
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data?.publicUrl || null
}
