import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getTenantSecretaryId } from '../../lib/tenantService'
import { normalizeRole } from '../../lib/rbac'

const INVITE_STEPS = [
  'Saisissez l\'email professionnel de votre secrétaire',
  'Elle reçoit un lien d\'invitation par email',
  'Accès au tableau de bord, agenda et facturation',
]

function emailLooksValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default function SecretaryManagementSection({ cabinetId, notify, userRole }) {
  const isDoctor = normalizeRole(userRole) === 'doctor' || userRole === 'docteur'

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [secretary, setSecretary] = useState(null)
  const [secLoading, setSecLoading] = useState(true)
  const sessionRef = useRef(null)

  const loadSecretary = useCallback(async () => {
    if (!cabinetId) {
      setSecretary(null)
      setSecLoading(false)
      return
    }
    setSecLoading(true)
    try {
      const secretaryId = await getTenantSecretaryId(cabinetId)
      if (!secretaryId) {
        setSecretary(null)
        return
      }
      const { data: secProfile } = await supabase
        .from('profiles')
        .select('id, nom_complet, role')
        .eq('id', secretaryId)
        .maybeSingle()
      setSecretary(secProfile || null)
    } catch {
      setSecretary(null)
    } finally {
      setSecLoading(false)
    }
  }, [cabinetId])

  useEffect(() => {
    loadSecretary()
  }, [loadSecretary])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleInvite = async (event) => {
    event?.preventDefault()

    if (!isDoctor) return

    if (!cabinetId) {
      notify({
        title: 'Cabinet manquant',
        description: 'Reconnectez-vous ou exécutez fix_cabinet_owner.sql dans Supabase.',
        tone: 'error',
      })
      return
    }

    const email = inviteEmail.trim().toLowerCase()
    if (!emailLooksValid(email)) {
      notify({ title: 'Email invalide', description: 'Saisissez une adresse email valide.', tone: 'error' })
      return
    }

    setInviteLoading(true)
    setInviteSuccess(false)

    try {
      let session = sessionRef.current
      if (!session?.access_token) {
        const { data } = await supabase.auth.getSession()
        session = data.session
        sessionRef.current = session
      }
      if (!session?.access_token) throw new Error('Session expirée — reconnectez-vous.')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-secretary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Échec de l'invitation")

      setInviteSuccess(true)
      setInviteEmail('')
      notify({
        title: 'Invitation envoyée',
        description: `Un email a été envoyé à ${email}.`,
        variant: 'success',
      })

      if (result.secretary_id) {
        setSecretary({
          id: result.secretary_id,
          nom_complet: email.split('@')[0],
          role: 'secretaire',
        })
        loadSecretary()
      }

      window.setTimeout(() => setInviteSuccess(false), 4000)
    } catch (err) {
      notify({ title: 'Erreur', description: err.message, tone: 'error' })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!secretary) return
    if (!window.confirm(`Révoquer l'accès de ${secretary.nom_complet || 'cette secrétaire'} ?`)) return

    setRevokeLoading(true)
    try {
      let session = sessionRef.current
      if (!session?.access_token) {
        const { data } = await supabase.auth.getSession()
        session = data.session
      }
      if (!session?.access_token) throw new Error('Session expirée')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-secretary`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ secretary_id: secretary.id }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Échec de la révocation')
      }

      setSecretary(null)
      notify({ title: 'Accès révoqué', description: 'La secrétaire a été retirée.', variant: 'success' })
    } catch (err) {
      notify({ title: 'Erreur', description: err.message, tone: 'error' })
    } finally {
      setRevokeLoading(false)
    }
  }

  if (!isDoctor) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Équipe d&apos;accueil</h3>
              <p className="text-sm text-slate-500">Géré par le praticien titulaire</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-8 text-center text-sm text-slate-500">
          Seul le médecin peut inviter ou révoquer une secrétaire.
        </div>
      </section>
    )
  }

  const emailValid = emailLooksValid(inviteEmail)
  const canSubmit = emailValid && !inviteLoading && !secretary

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/90 via-white to-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <Users size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Gestion secrétaire</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Accueil, file d&apos;attente et facturation
              </p>
            </div>
          </div>
          {!secLoading && (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                secretary
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {secretary ? 'Poste occupé' : 'Poste vacant'}
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {secLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
          </div>
        ) : secretary ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50/50 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
                {(secretary.nom_complet || 'S')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">
                  {secretary.nom_complet || 'Secrétaire'}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <ShieldCheck size={14} />
                  Accès actif — 1 secrétaire max
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRevoke}
              disabled={revokeLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[0.99] disabled:opacity-60"
            >
              {revokeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4" />
              )}
              {revokeLoading ? 'Révocation...' : "Révoquer l'accès"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* How it works */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Sparkles size={14} className="text-blue-600" />
                Comment ça marche
              </div>
              <ol className="space-y-2.5">
                {INVITE_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Invite form */}
            <form onSubmit={handleInvite} className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Email professionnel
                </span>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={2}
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      setInviteSuccess(false)
                    }}
                    placeholder="marie.dupont@votrecabinet.ma"
                    disabled={inviteLoading}
                    className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:opacity-60 ${
                      emailValid
                        ? 'border-blue-300 ring-2 ring-blue-500/10'
                        : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
                    }`}
                  />
                  {emailValid && !inviteLoading && (
                    <CheckCircle2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
                  )}
                </div>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
                  inviteSuccess
                    ? 'bg-emerald-600 shadow-emerald-600/25'
                    : 'bg-blue-600 shadow-blue-600/25 hover:bg-blue-700'
                }`}
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : inviteSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Invitation envoyée
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Inviter la secrétaire
                  </>
                )}
              </button>
            </form>

            {!cabinetId && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Votre profil n&apos;est pas lié à un cabinet — l&apos;invitation ne pourra pas aboutir.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
