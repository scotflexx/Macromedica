import { supabase } from './supabase'

export async function getTenantSecretaryId(tenantId) {
  if (!tenantId) return null

  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('secretaire_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (cabinet?.secretaire_id) return cabinet.secretaire_id

  const { data: clinic } = await supabase
    .from('clinics')
    .select('secretary_id')
    .eq('id', tenantId)
    .maybeSingle()

  return clinic?.secretary_id ?? null
}
