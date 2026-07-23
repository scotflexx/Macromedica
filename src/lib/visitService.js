import { supabase } from './supabase'

const VISIT_SELECT = `
  *,
  patients:patient_id(id, nom, prenom, telephone, allergies, mutuelle),
  doctor:doctor_id(id, nom_complet, first_name, last_name, role),
  rdv:rdv_id(id, date_rdv, notes)
`

export async function getDoctors(clinicId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nom_complet, first_name, last_name, role, status')
    .eq('cabinet_id', clinicId)
    .in('role', ['doctor', 'docteur', 'medecin', 'médecin'])
    .order('nom_complet', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getTodayVisits(clinicId) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' })
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('clinic_id', clinicId)
    .eq('queue_date', today)
    .in('status', ['waiting', 'called', 'consultation', 'billing', 'completed'])
    .order('queue_number', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

export async function getDoctorQueue(clinicId, doctorId) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' })
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('queue_date', today)
    .in('status', ['waiting', 'called'])
    .order('queue_number', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

export async function addAppointmentToWaitingRoom(rdvId, doctorId) {
  const { data, error } = await supabase.rpc('create_visit_from_rdv', {
    p_rdv_id: rdvId,
    p_doctor_id: doctorId,
  })

  if (error) throw error
  return data
}

export async function callPatient(visitId) {
  const { data, error } = await supabase.rpc('call_patient', {
    p_visit_id: visitId,
  })

  if (error) throw error
  return data
}

export async function openConsultation(visitId) {
  const { data, error } = await supabase.rpc('open_consultation', {
    p_visit_id: visitId,
  })

  if (error) throw error
  return data
}

export async function refreshConsultationLock(consultationId) {
  const { data, error } = await supabase.rpc('refresh_consultation_lock', {
    p_consultation_id: consultationId,
  })

  if (error) throw error
  return data
}

export async function releaseConsultationLock(consultationId) {
  const { error } = await supabase.rpc('release_consultation_lock', {
    p_consultation_id: consultationId,
  })

  if (error) throw error
}

export async function completeConsultation(consultationId, payload) {
  const { data, error } = await supabase.rpc('complete_consultation', {
    p_consultation_id: consultationId,
    p_chief_complaint: payload.chiefComplaint || '',
    p_diagnosis: payload.diagnosis || '',
    p_treatment: payload.treatment || '',
    p_notes: payload.notes || '',
    p_billing_amount: Number(payload.billingAmount || 0),
    p_billing_type: payload.billingType || 'cash',
  })

  if (error) throw error
  return data
}

export async function autosaveConsultation(consultationId, draft) {
  const { error } = await supabase
    .from('consultations')
    .update({
      chief_complaint: draft.chiefComplaint || '',
      notes: draft.history || '',
      diagnosis: draft.primaryDiagnosis || '',
      treatment: draft.treatmentPlan || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultationId)

  if (error) throw error
}


export async function getConsultationByVisit(visitId) {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      visits:visit_id(*, patients:patient_id(id, nom, prenom, telephone, allergies, mutuelle))
    `)
    .eq('visit_id', visitId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getBillingQueue(clinicId) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      visits:visit_id(*, patients:patient_id(id, nom, prenom, telephone, mutuelle)),
      consultations:consultation_id(id, billing_type, billing_amount, created_at)
    `)
    .eq('clinic_id', clinicId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).filter((payment) => payment.visits?.status === 'billing')
}

export async function processVisitPayment(visitId, method, amount) {
  const { data, error } = await supabase.rpc('process_visit_payment', {
    p_visit_id: visitId,
    p_method: method,
    p_amount: Number(amount || 0),
  })

  if (error) throw error
  return data
}

export async function createWalkInVisit(patientId, doctorId) {
  const { data, error } = await supabase.rpc('create_walk_in_visit', {
    p_patient_id: patientId,
    p_doctor_id: doctorId,
  })

  if (error) throw error
  return data
}

export async function reassignVisitDoctor(visitId, doctorId) {
  const { data, error } = await supabase.rpc('reassign_visit_doctor', {
    p_visit_id: visitId,
    p_doctor_id: doctorId,
  })

  if (error) throw error
  return data
}

export async function cancelVisit(visitId, reason = null) {
  const { data, error } = await supabase.rpc('cancel_visit', {
    p_visit_id: visitId,
    p_reason: reason,
  })

  if (error) throw error
  return data
}

export async function adminOverrideConsultationLock(consultationId) {
  const { data, error } = await supabase.rpc('admin_override_consultation_lock', {
    p_consultation_id: consultationId,
  })

  if (error) throw error
  return data
}

export async function getTodayVisitForPatient(clinicId, patientId) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' })
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .eq('queue_date', today)
    .in('status', ['scheduled', 'arrived', 'waiting', 'called', 'consultation', 'billing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export function subscribeClinicVisits(clinicId, onChange) {
  return supabase
    .channel(`clinic:${clinicId}:visits`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'visits', filter: `clinic_id=eq.${clinicId}` },
      onChange
    )
    .subscribe()
}

export function subscribeClinicPayments(clinicId, onChange) {
  return supabase
    .channel(`clinic:${clinicId}:payments`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `clinic_id=eq.${clinicId}` },
      onChange
    )
    .subscribe()
}
