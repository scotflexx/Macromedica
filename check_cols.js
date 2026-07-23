import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mdercwnxdfogbymkoosu.supabase.co',
  'sb_publishable_nuVHtbOv_eNBAuyqixbn0A_KTZFcvKb'
)

async function check() {
  const { data, error } = await supabase.rpc('get_schema_columns')
  console.log("We can't use RPC if not defined, let's just query rdv and get 1 row to see keys.")
  const { data: rdvData, error: rdvError } = await supabase.from('rdv').select('*').limit(1)
  console.log('rdv error:', rdvError)
  if (rdvData && rdvData.length > 0) {
    console.log('Columns:', Object.keys(rdvData[0]))
  } else {
    console.log('No rows in rdv, cannot infer schema this way. Data:', rdvData)
  }
}

check()
