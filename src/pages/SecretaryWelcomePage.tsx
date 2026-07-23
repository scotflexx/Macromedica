import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Loader2,
  Lock,
  Sparkles,
  User,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'
import { needsSecretaryOnboarding } from '../lib/onboarding'
import { normalizeRole } from '../lib/rbac'

const FEATURES = [
  { icon: LayoutDashboard, label: 'File d\'attente en direct' },
  { icon: CalendarDays, label: 'Agenda des rendez-vous' },
  { icon: CreditCard, label: 'Encaissements & facturation' },
]

export default function SecretaryWelcomePage() {
  const { user, profile, isInitializing, isAuthenticated } = useAppContext()

  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const establishSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (!session && window.location.hash.includes('access_token')) {
          await new Promise((r) => setTimeout(r, 400))
          const retry = await supabase.auth.getSession()
          if (!retry.data.session) {
            throw new Error('Impossible de valider le lien d\'invitation.')
          }
        }

        if (!cancelled) {
          if (!session && !window.location.hash.includes('access_token')) {
            setSessionError('Ce lien est invalide ou a expiré. Demandez une nouvelle invitation à votre médecin.')
          }
          setSessionReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setSessionError(err.message || 'Lien d\'invitation invalide.')
          setSessionReady(true)
        }
      }
    }

    if (!isInitializing) {
      establishSession()
    }

    return () => { cancelled = true }
  }, [isInitializing])

  useEffect(() => {
    if (profile?.nom_complet && !prenom && !nom) {
      const parts = profile.nom_complet.trim().split(/\s+/)
      if (parts.length >= 2) {
        setPrenom(parts[0])
        setNom(parts.slice(1).join(' '))
      }
    }
  }, [profile, prenom, nom])

  if (isInitializing || !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f9f9]">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Préparation de votre espace...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user && profile && !needsSecretaryOnboarding(user, profile)) {
    return <Navigate to="/dashboard" replace />
  }

  if (sessionError && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 animated-mesh-bg">
        <div className="glass-card-morphism max-w-md rounded-[32px] p-8 text-center">
          <p className="text-lg font-bold text-slate-900">Lien expiré</p>
          <p className="mt-2 text-sm text-slate-500">{sessionError}</p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
          >
            Aller à la connexion
          </a>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const trimmedPrenom = prenom.trim()
    const trimmedNom = nom.trim()
    const fullName = [trimmedPrenom, trimmedNom].filter(Boolean).join(' ')

    if (!trimmedPrenom || !trimmedNom) {
      setFormError('Veuillez saisir votre prénom et votre nom.')
      return
    }
    if (password.length < 8) {
      setFormError('Le mot de passe doit contenir au minimum 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !authUser) throw new Error('Session expirée — rouvrez le lien reçu par email.')

      const { error: authUpdateError } = await supabase.auth.updateUser({
        password,
        data: {
          nom_complet: fullName,
          first_name: trimmedPrenom,
          last_name: trimmedNom,
          role: 'secretaire',
          onboarding_complete: true,
        },
      })
      if (authUpdateError) throw authUpdateError

      const cabinetId = authUser.user_metadata?.cabinet_id || authUser.user_metadata?.clinic_id || profile?.cabinet_id

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authUser.id,
        nom_complet: fullName,
        first_name: trimmedPrenom,
        last_name: trimmedNom,
        role: 'secretaire',
        cabinet_id: cabinetId || null,
        clinic_id: cabinetId || null,
      }, { onConflict: 'id' })

      if (profileError) throw profileError

      setDone(true)
      window.setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossible de finaliser votre inscription.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const roleOk = normalizeRole(profile?.role || user?.user_metadata?.role) === 'secretary'
    || user?.user_metadata?.role === 'secretaire'

  return (
    <div className="min-h-screen animated-mesh-bg relative overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Bienvenue sur MacroMedica
          </h1>
          <p className="mt-2 text-base font-medium text-slate-500">
            {roleOk
              ? 'Votre cabinet vous a invitée. Complétez votre profil pour accéder à l\'espace d\'accueil.'
              : 'Finalisez votre compte pour rejoindre l\'équipe.'}
          </p>
          {user?.email && (
            <p className="mt-3 inline-block rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-blue-800 ring-1 ring-blue-100">
              {user.email}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-3 gap-2"
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/60 bg-white/70 px-2 py-3 text-center shadow-sm backdrop-blur-sm"
            >
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-blue-600" />
              <p className="text-[10px] font-bold leading-tight text-slate-600">{label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card-morphism rounded-[32px] p-8"
        >
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <p className="mt-4 text-xl font-black text-slate-900">Compte activé !</p>
              <p className="mt-2 text-sm text-slate-500">Redirection vers votre tableau de bord...</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Prénom</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                      autoFocus
                      placeholder="Marie"
                      className="w-full border-0 bg-transparent text-sm font-medium outline-none"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Nom</span>
                  <input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    placeholder="Dupont"
                    className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">Mot de passe</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="8 caractères minimum"
                    className="w-full border-0 bg-transparent text-sm font-medium outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">Confirmer le mot de passe</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Répétez le mot de passe"
                    className="w-full border-0 bg-transparent text-sm font-medium outline-none"
                  />
                </div>
              </label>

              {formError && (
                <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activation...
                  </>
                ) : (
                  <>
                    Accéder à mon espace
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
