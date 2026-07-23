import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import {
  isDoctorRole,
  ensureTenantForProfile,
  setTenantSecretary,
  userManagesTenant,
  resolveProfileTenantId,
} from "../_shared/tenant.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
      .select('id, role, cabinet_id, clinic_id, nom_complet')
      .eq('id', user.id)
      .single()

    if (!profile || !isDoctorRole(profile.role)) {
      return new Response(JSON.stringify({ error: 'Seul le docteur peut gérer les secrétaires' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = req.method === 'POST' || req.method === 'DELETE'
      ? await req.json()
      : {}

    const targetTenantId = resolveProfileTenantId(profile)
      || body.cabinet_id
      || body.clinic_id

    let tenant
    try {
      tenant = await ensureTenantForProfile(supabaseAdmin, profile)
    } catch (ensureError) {
      console.error('ensureTenantForProfile failed', ensureError)
      return new Response(JSON.stringify({
        error: 'Impossible de préparer votre cabinet. Réessayez ou contactez le support.',
        detail: ensureError?.message,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!tenant) {
      return new Response(JSON.stringify({
        error: "Votre compte n'est pas lié à un cabinet. Déconnectez-vous et reconnectez-vous.",
        profileCabinetId: profile.cabinet_id,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (targetTenantId && tenant.id !== targetTenantId) {
      console.warn('tenant id healed', { was: targetTenantId, now: tenant.id })
    }

    const canManage = await userManagesTenant(supabaseAdmin, user.id, tenant.id)
    if (!canManage) {
      console.error('invite-secretary denied', { userId: user.id, tenantId: tenant.id, profile })
      return new Response(JSON.stringify({
        error: "Vous n'êtes pas propriétaire de cette clinique",
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (req.method === 'POST') {
      const { email } = body
      if (!email) {
        return new Response(JSON.stringify({ error: "L'email est requis" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (tenant.secretaryId) {
        return new Response(JSON.stringify({ error: 'Une secrétaire est déjà associée. Révoquez-la d\'abord.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${(Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'http://localhost:5173').replace(/\/$/, '')}/bienvenue-secretaire`,
        data: {
          role: 'secretaire',
          clinic_id: tenant.id,
          cabinet_id: tenant.id,
          nom_complet: email.split('@')[0],
          onboarding_complete: false,
        }
      })

      if (inviteErr) throw inviteErr

      if (inviteData?.user?.id) {
        await setTenantSecretary(supabaseAdmin, tenant, inviteData.user.id)

        await supabaseAdmin.from('profiles').upsert({
          id: inviteData.user.id,
          cabinet_id: tenant.id,
          clinic_id: tenant.id,
          role: 'secretaire',
          nom_complet: email.split('@')[0],
        }, { onConflict: 'id' })
      }

      return new Response(JSON.stringify({
        message: 'Invitation envoyée avec succès',
        secretary_id: inviteData?.user?.id || null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (req.method === 'DELETE') {
      const { secretary_id } = body

      if (!secretary_id) {
        return new Response(JSON.stringify({ error: 'secretary_id est requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await setTenantSecretary(supabaseAdmin, tenant, null)

      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(secretary_id)
      if (deleteErr) {
        console.error('Delete user error:', deleteErr)
      }

      return new Response(JSON.stringify({ message: 'Accès secrétaire révoqué' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
