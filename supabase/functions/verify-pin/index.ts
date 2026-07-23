import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
import { loadTenant } from "../_shared/tenant.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pin, clinic_id, cabinet_id } = await req.json()
    const tenantId = cabinet_id || clinic_id
    if (!pin || !tenantId) throw new Error("Le PIN et cabinet_id sont requis.")

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const tenant = await loadTenant(supabaseAdmin, tenantId)
    if (!tenant?.pinHash) {
      return new Response(JSON.stringify({ error: "Aucun PIN n'a été défini pour ce cabinet." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const isValid = await bcrypt.compare(String(pin), tenant.pinHash)

    if (isValid) {
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: "Code PIN incorrect." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
