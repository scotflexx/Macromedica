import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mdercwnxdfogbymkoosu.supabase.co',
  'sb_publishable_nuVHtbOv_eNBAuyqixbn0A_KTZFcvKb'
)

async function check() {
  const { data, error } = await supabase
    .from('rdv')
    .select(`
      id,
      patient_id,
      date_rdv,
      status,
      fake_column_123
    `)
    .eq('cabinet_id', '11111111-1111-1111-1111-111111111111')
    .limit(1)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data:', data)
  }
}

check()
