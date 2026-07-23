import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export type TenantRecord = {
  id: string
  ownerId: string | null
  secretaryId: string | null
  pinHash: string | null
  source: 'cabinets' | 'clinics'
}

const DOCTOR_ROLES = ['docteur', 'doctor', 'medecin', 'médecin', 'admin']

export function isDoctorRole(role: string | null | undefined) {
  const value = String(role || '').toLowerCase()
  return DOCTOR_ROLES.includes(value)
}

export function resolveProfileTenantId(
  profile: { cabinet_id?: string | null; clinic_id?: string | null }
): string | null {
  return profile.cabinet_id || profile.clinic_id || null
}

/** Resolve the real clinic owner (doctor auth user id) for a tenant/cabinet id. */
export async function resolveTenantOwnerId(
  supabaseAdmin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('owner_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (clinic?.owner_id) {
    return clinic.owner_id
  }

  const { data: cabinet } = await supabaseAdmin
    .from('cabinets')
    .select('tenant_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (cabinet?.tenant_id) {
    const { data: tenantProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, cabinet_id')
      .eq('id', cabinet.tenant_id)
      .maybeSingle()

    if (tenantProfile && isDoctorRole(tenantProfile.role)) {
      return tenantProfile.id
    }
  }

  const { data: doctorProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('cabinet_id', tenantId)
    .in('role', DOCTOR_ROLES)
    .limit(1)
    .maybeSingle()

  return doctorProfile?.id ?? null
}

/** Authoritative check: can this user manage the tenant (invite secretary, set PIN, etc.) */
export async function userManagesTenant(
  supabaseAdmin: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, cabinet_id, clinic_id')
    .eq('id', userId)
    .maybeSingle()

  if (!profile || !isDoctorRole(profile.role)) {
    return false
  }

  const linkedIds = [profile.cabinet_id, profile.clinic_id].filter(Boolean)
  if (linkedIds.includes(tenantId)) {
    return true
  }

  const resolvedOwner = await resolveTenantOwnerId(supabaseAdmin, tenantId)
  if (resolvedOwner === userId) {
    return true
  }

  const { data: cabinet } = await supabaseAdmin
    .from('cabinets')
    .select('tenant_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (cabinet?.tenant_id === userId) {
    return true
  }

  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('owner_id')
    .eq('id', tenantId)
    .maybeSingle()

  return clinic?.owner_id === userId
}

export async function loadTenant(
  supabaseAdmin: SupabaseClient,
  tenantId: string
): Promise<TenantRecord | null> {
  if (!tenantId) return null

  const { data: cabinet } = await supabaseAdmin
    .from('cabinets')
    .select('id, tenant_id, secretaire_id, pin_hash')
    .eq('id', tenantId)
    .maybeSingle()

  if (cabinet) {
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('owner_id, secretary_id, pin_hash')
      .eq('id', cabinet.id)
      .maybeSingle()

    const ownerId = (await resolveTenantOwnerId(supabaseAdmin, cabinet.id))
      ?? cabinet.tenant_id
      ?? clinic?.owner_id
      ?? null

    return {
      id: cabinet.id,
      ownerId,
      secretaryId: cabinet.secretaire_id ?? clinic?.secretary_id ?? null,
      pinHash: cabinet.pin_hash ?? clinic?.pin_hash ?? null,
      source: 'cabinets',
    }
  }

  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('id, owner_id, secretary_id, pin_hash')
    .eq('id', tenantId)
    .maybeSingle()

  if (clinic) {
    const ownerId = clinic.owner_id ?? (await resolveTenantOwnerId(supabaseAdmin, clinic.id))

    return {
      id: clinic.id,
      ownerId: ownerId ?? null,
      secretaryId: clinic.secretary_id ?? null,
      pinHash: clinic.pin_hash ?? null,
      source: 'clinics',
    }
  }

  return null
}

/** Create missing cabinets/clinics rows for a doctor profile (self-heal orphan cabinet_id). */
async function upsertClinicRow(
  supabaseAdmin: SupabaseClient,
  id: string,
  ownerId: string,
  label: string
) {
  const attempts: Record<string, unknown>[] = [
    { id, owner_id: ownerId, name: label },
    { id, owner_id: ownerId, nom: label },
    { id, owner_id: ownerId },
  ]

  for (const row of attempts) {
    const { error } = await supabaseAdmin
      .from('clinics')
      .upsert(row, { onConflict: 'id' })

    if (!error) return
    const msg = String(error.message || '')
    if (!msg.includes('column') && error.code !== '42703') {
      throw error
    }
  }
}

/**
 * Load tenant or auto-create cabinets/clinics rows when profile references a missing id.
 * Fixes "Cabinet introuvable" without requiring manual SQL.
 */
export async function ensureTenantForProfile(
  supabaseAdmin: SupabaseClient,
  profile: {
    id: string
    role?: string | null
    cabinet_id?: string | null
    clinic_id?: string | null
    nom_complet?: string | null
  }
): Promise<TenantRecord | null> {
  if (!profile?.id || !isDoctorRole(profile.role)) {
    return null
  }

  let tenantId = resolveProfileTenantId(profile)
  const label = profile.nom_complet || 'MacroMedica'

  if (tenantId) {
    const existing = await loadTenant(supabaseAdmin, tenantId)
    if (existing) return existing

    const { error: cabinetError } = await supabaseAdmin
      .from('cabinets')
      .upsert({
        id: tenantId,
        tenant_id: profile.id,
        nom: label,
      }, { onConflict: 'id' })

    if (cabinetError) {
      console.error('ensureTenantForProfile cabinet upsert:', cabinetError)
      throw cabinetError
    }

    await upsertClinicRow(supabaseAdmin, tenantId, profile.id, label)

    await supabaseAdmin
      .from('profiles')
      .update({ cabinet_id: tenantId, clinic_id: tenantId })
      .eq('id', profile.id)

    return loadTenant(supabaseAdmin, tenantId)
  }

  const { data: newCabinet, error: createError } = await supabaseAdmin
    .from('cabinets')
    .insert({
      tenant_id: profile.id,
      nom: label,
    })
    .select('id')
    .single()

  if (createError || !newCabinet?.id) {
    console.error('ensureTenantForProfile cabinet create:', createError)
    throw createError || new Error('Impossible de créer le cabinet')
  }

  tenantId = newCabinet.id

  await upsertClinicRow(supabaseAdmin, tenantId, profile.id, label)

  await supabaseAdmin
    .from('profiles')
    .update({ cabinet_id: tenantId, clinic_id: tenantId })
    .eq('id', profile.id)

  return loadTenant(supabaseAdmin, tenantId)
}

export async function setTenantSecretary(
  supabaseAdmin: SupabaseClient,
  tenant: TenantRecord,
  secretaryId: string | null
) {
  if (tenant.source === 'cabinets') {
    const { error } = await supabaseAdmin
      .from('cabinets')
      .update({ secretaire_id: secretaryId })
      .eq('id', tenant.id)
    if (error) throw error
  }

  const { error: clinicError } = await supabaseAdmin
    .from('clinics')
    .update({ secretary_id: secretaryId })
    .eq('id', tenant.id)

  if (clinicError && tenant.source === 'clinics') {
    throw clinicError
  }
}

export async function setTenantPinHash(
  supabaseAdmin: SupabaseClient,
  tenant: TenantRecord,
  pinHash: string
) {
  if (tenant.source === 'cabinets') {
    const { error } = await supabaseAdmin
      .from('cabinets')
      .update({ pin_hash: pinHash })
      .eq('id', tenant.id)
    if (error) throw error
  }

  const { error: clinicError } = await supabaseAdmin
    .from('clinics')
    .update({ pin_hash: pinHash })
    .eq('id', tenant.id)

  if (clinicError && tenant.source === 'clinics') {
    throw clinicError
  }
}
