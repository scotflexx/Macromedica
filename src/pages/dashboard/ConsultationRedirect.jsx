import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Compatibility for stale /consultation/:id links (older builds, bookmarks).
// READ-ONLY: resolves the id as a visit, then as an appointment, using the
// signed-in user's own permissions (RLS). It never creates or updates anything.
// Returns { patientId, contextId } or null when nothing readable matches.
export async function resolveLegacyConsultationTarget(client, id) {
  if (!UUID_RE.test(String(id || ''))) return null

  const visit = await client.from('visits').select('id, patient_id').eq('id', id).maybeSingle()
  if (visit.error) throw visit.error
  if (visit.data?.patient_id) return { patientId: visit.data.patient_id, contextId: visit.data.id }

  const rdv = await client.from('rdv').select('id, patient_id').eq('id', id).maybeSingle()
  if (rdv.error) throw rdv.error
  if (rdv.data?.patient_id) return { patientId: rdv.data.patient_id, contextId: rdv.data.id }

  return null
}

// Same convention as the dashboard: visitId carries the visit or appointment id.
export function legacyRedirectUrl(target) {
  return `/patient-workspace/${encodeURIComponent(target.patientId)}?visitId=${encodeURIComponent(target.contextId)}`
}

export default function ConsultationRedirect() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const { notify } = useAppContext()
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  // Keyed on the route id only: notify() changes identity on every toast, so it
  // must not be an effect dependency (it would re-run the redirect).
  useEffect(() => {
    let cancelled = false
    setFailed(false)

    resolveLegacyConsultationTarget(supabase, visitId)
      .then((target) => {
        if (cancelled) return
        if (!target) {
          notifyRef.current?.({ title: 'Cette consultation n\'est plus disponible.', tone: 'info' })
          navigate('/dashboard', { replace: true })
          return
        }
        navigate(legacyRedirectUrl(target), { replace: true })
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[ConsultationRedirect] lookup failed', { code: error?.code, message: error?.message })
        setFailed(true)
      })

    return () => { cancelled = true }
  }, [visitId, attempt, navigate])

  if (failed) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
        <p className="text-[14px] font-semibold text-slate-900">Impossible d'ouvrir cette consultation</p>
        <p className="mt-1 text-[13px] text-slate-500">Vérifiez votre connexion puis réessayez.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/dashboard" replace className="flex h-9 items-center rounded-lg border border-slate-300 px-4 text-[13px] font-semibold text-slate-700">Tableau de bord</Link>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="h-9 rounded-lg bg-black px-4 text-[13px] font-semibold text-white">Réessayer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[60vh] items-center justify-center gap-2 text-[14px] text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> Ouverture de la consultation…
    </div>
  )
}
