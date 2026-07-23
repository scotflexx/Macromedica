import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || 'https://mdercwnxdfogbymkoosu.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!key) {
  console.error('Need SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY in env')
  process.exit(1)
}

const sb = createClient(url, key)

async function main() {
  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('id, role, nom_complet, cabinet_id, clinic_id')
    .limit(10)

  console.log('profiles error:', pErr?.message)
  console.log('profiles:', JSON.stringify(profiles, null, 2))

  for (const p of profiles || []) {
    if (!p.cabinet_id) continue
    const { data: cabinet } = await sb.from('cabinets').select('id, tenant_id, nom').eq('id', p.cabinet_id).maybeSingle()
    const { data: clinic } = await sb.from('clinics').select('id, owner_id, name, nom').eq('id', p.cabinet_id).maybeSingle()
    console.log('\n--- profile', p.nom_complet, p.role, '---')
    console.log('  user id:', p.id)
    console.log('  cabinet_id:', p.cabinet_id, 'clinic_id:', p.clinic_id)
    console.log('  cabinet:', cabinet)
    console.log('  clinic:', clinic)
    console.log('  owner match cabinet.tenant_id:', cabinet?.tenant_id === p.id)
    console.log('  owner match clinic.owner_id:', clinic?.owner_id === p.id)
  }
}

main().catch(console.error)
