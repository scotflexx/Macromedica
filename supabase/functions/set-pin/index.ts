import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
import { setTenantPinHash, userManagesTenant, ensureTenantForProfile } from "../_shared/tenant.ts"

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
    if (!pin) throw new Error("Le PIN est requis.")

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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, cabinet_id, clinic_id')
      .eq('id', user.id)
      .single()

    const tenant = await ensureTenantForProfile(supabaseAdmin, { ...profile, id: user.id })
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Aucun cabinet lié à votre profil." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const canManage = await userManagesTenant(supabaseAdmin, user.id, tenant.id)
    if (!canManage) {
      return new Response(JSON.stringify({ error: "Accès refusé. Vous n'êtes pas le propriétaire de ce cabinet." }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(pin, salt)
    await setTenantPinHash(supabaseAdmin, tenant, hash)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
