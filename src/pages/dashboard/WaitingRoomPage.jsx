import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { RDV_STATUSES, isValidTransition } from '../../lib/workflow'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Megaphone, Bell, Building2, MoreVertical, Loader2
} from 'lucide-react'

/* ─── Helpers ─── */
const TZ = 'Africa/Casablanca'

const formatTime = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

const getInitials = (prenom, nom) =>
  `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`

const AVATAR_COLORS = [
  'bg-blue-50 text-blue-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-violet-50 text-violet-700',
  'bg-cyan-50 text-cyan-700',
]
const getAvatarTheme = (id) => {
  const idx = id ? String(id).charCodeAt(0) % AVATAR_COLORS.length : 0
  return AVATAR_COLORS[idx]
}

/* ─── Custom Hooks ─── */
function useLiveWaitTime(since) {
  const [mins, setMins] = useState(0)
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    const update = () => {
      if (!since) return
      const diff = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000))
      setMins(Math.floor(diff / 60))
      setSecs(diff % 60)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [since])

  return { mins, secs, formatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` }
}

/* ─── SVG Progress Circle ─── */
function ProgressCircle({ since, maxMinutes = 60 }) {
  const { mins, secs, formatted } = useLiveWaitTime(since)
  
  // Progress ratio
  const totalMins = mins + (secs / 60)
  const progress = Math.min(1, totalMins / maxMinutes)
  
  const r = 80 // Larger radius for the new design
  const c = 2 * Math.PI * r
  const offset = c * (1 - progress)

  return (
    <div className="relative flex items-center justify-center py-6">
      <svg width="200" height="200" viewBox="0 0 200 200" className="shrink-0">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle
          cx="100" cy="100" r={r} fill="none"
          stroke="#0F6E56" strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          className="transition-all duration-1000 ease-linear"
        />
        {/* Texts inside circle */}
        <text x="100" y="95" textAnchor="middle" dominantBaseline="central"
          className="fill-[#1B3B36] text-4xl font-extrabold font-sans tabular-nums tracking-tight">
          {formatted}
        </text>
        <text x="100" y="125" textAnchor="middle" dominantBaseline="central"
          className="fill-slate-400 text-[10px] font-bold tracking-widest uppercase">
          Temps écoulé
        </text>
      </svg>
    </div>
  )
}

/* ─── Note Sidebar (From Original) ─── */
function NoteSidebar({ open, onClose, rdvId, currentNotes }) {
  const [notes, setNotes] = useState(currentNotes || '')
  const [saving, setSaving] = useState(false)
  const { notify } = useApp()

  useEffect(() => { setNotes(currentNotes || '') }, [currentNotes])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('rdv').update({ notes }).eq('id', rdvId)
    if (error) notify({ title: 'Erreur', description: error.message, tone: 'error' })
    else { notify({ title: 'Note enregistrée' }); onClose() }
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
        className="relative w-[400px] bg-white shadow-2xl h-full flex flex-col border-l border-slate-100"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-[#1B3B36]">Notes de consultation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 p-6">
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full h-full min-h-[300px] rounded-2xl border-2 border-slate-100 p-5 text-sm resize-none focus:outline-none focus:border-[#0F6E56] transition-colors shadow-sm"
            placeholder="Saisissez vos observations ici..."
          />
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button onClick={save} disabled={saving}
            className="w-full py-4 rounded-xl bg-[#0F6E56] text-white font-bold text-sm hover:bg-[#0d5e4a] disabled:opacity-50 transition-colors shadow-lg shadow-[#0F6E56]/20 cursor-pointer border-0">
            {saving ? 'Enregistrement en cours...' : 'Enregistrer la note'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function WaitingRoomPage() {
  const { profile, notify, rdvList, isInitializing } = useApp()
  const isDoctor = profile?.role === 'docteur'
  const [noteSidebar, setNoteSidebar] = useState({ open: false, rdvId: null, notes: '' })
  
  // Data derived exactly as before
  const todayRdv = rdvList

  const enAttente = useMemo(() =>
    todayRdv.filter(r => r.status === RDV_STATUSES.ARRIVED || r.status === RDV_STATUSES.WAITING)
      .sort((a, b) => new Date(a.updated_at || a.date_rdv) - new Date(b.updated_at || b.date_rdv)),
    [todayRdv]
  )

  const prochainPatient = enAttente[0] || null
  const resteAttente = enAttente.slice(1)

  const enConsultation = useMemo(() =>
    todayRdv.filter(r => r.status === RDV_STATUSES.IN_CONSULTATION),
    [todayRdv]
  )

  const planifies = useMemo(() =>
    todayRdv.filter(r => r.status === RDV_STATUSES.SCHEDULED)
      .sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv)),
    [todayRdv]
  )

  /* Stats calculation */
  const patientsJour = todayRdv.length
  const attenteAvg = useMemo(() => {
    if (enAttente.length === 0) return 0
    const now = Date.now()
    const total = enAttente.reduce((sum, r) => {
      const t = new Date(r.updated_at || r.date_rdv).getTime()
      return sum + Math.max(0, Math.floor((now - t) / 60000))
    }, 0)
    return Math.round(total / enAttente.length)
  }, [enAttente])

  /* Status transitions */
  const transitionStatus = async (rdvId, targetStatus) => {
    const { data: current, error: fetchErr } = await supabase
      .from('rdv').select('status').eq('id', rdvId).single()
    if (fetchErr || !current) {
      notify({ title: 'Erreur', description: 'Impossible de lire le RDV', tone: 'error' })
      return false
    }
    try {
      isValidTransition(current.status, targetStatus)
    } catch (err) {
      notify({ title: 'Transition invalide', description: err.message, tone: 'error' })
      return false
    }
    const { error } = await supabase.from('rdv').update({ status: targetStatus }).eq('id', rdvId)
    if (error) {
      notify({ title: 'Erreur DB', description: error.message, tone: 'error' })
      return false
    }
    return true
  }

  const appellerSuivant = async () => {
    if (!prochainPatient) return
    const ok = await transitionStatus(prochainPatient.id, RDV_STATUSES.IN_CONSULTATION)
    if (ok) {
      notify({ title: 'Patient appelé', description: `${prochainPatient.patients?.prenom} ${prochainPatient.patients?.nom} est en consultation.` })
    }
  }

  const terminerConsultation = async (rdvId) => {
    const ok = await transitionStatus(rdvId, RDV_STATUSES.TO_BE_PAID)
    if (ok) notify({ title: 'Consultation terminée' })
  }

  if (isInitializing && todayRdv.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F6E56]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full font-[system-ui,Inter,sans-serif] px-4 lg:px-10 py-8"
         style={{ background: '#EAF3F0' }}> 
         {/* Using a very soft mint background to match mockup */}

      {/* ──── HEADER & STATS ROW ──── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 w-full">
        <div>
          <h1 className="text-4xl font-light text-[#1B3B36] tracking-tight mb-2">Flux Patients</h1>
          <p className="text-[#6C857E] text-sm md:text-base font-medium">Optimisez la gestion de votre patientèle en temps réel.</p>
        </div>
        
        <div className="flex flex-wrap items-stretch gap-4">
          {/* Stat 1 */}
          <div className="bg-white rounded-3xl px-6 pt-5 pb-4 flex flex-col justify-center items-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] min-w-[110px]">
            <span className="text-[9px] font-extrabold text-[#94A3B8] uppercase tracking-widest text-center leading-tight mb-1">Attente<br/>moyenne</span>
            <div className="text-[#0F6E56]">
                <span className="text-[28px] font-extrabold leading-none">{attenteAvg}</span>
                <span className="text-sm font-bold ml-1">min</span>
            </div>
          </div>
          
          {/* Stat 2 */}
          <div className="bg-white rounded-3xl px-6 pt-5 pb-4 flex flex-col justify-center items-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] min-w-[110px]">
             <span className="text-[9px] font-extrabold text-[#94A3B8] uppercase tracking-widest text-center leading-tight mb-1">Patients<br/>du jour</span>
             <span className="text-[28px] font-extrabold text-[#1B3B36] leading-none">{patientsJour}</span>
          </div>

          {/* Stat 3 */}
          <div className="bg-white rounded-3xl px-6 pt-5 pb-4 flex flex-col justify-center items-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] min-w-[110px]">
             <span className="text-[9px] font-extrabold text-[#94A3B8] uppercase tracking-widest text-center leading-tight mb-1">Taux<br/>satisfaction</span>
             <div className="text-[#1B3B36]">
                <span className="text-[28px] font-extrabold leading-none">98</span>
                <span className="text-sm font-bold">%</span>
             </div>
          </div>

          {/* Action Button */}
          <button
            onClick={appellerSuivant}
            disabled={!prochainPatient}
            className="bg-[#0F6E56] text-white rounded-[24px] px-8 py-4 flex items-center justify-center gap-3 font-bold hover:bg-[#0d5e4a] shadow-xl shadow-[#0F6E56]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
          >
            <Megaphone size={18} />
            <span className="text-[13px] tracking-wider uppercase leading-tight text-left">Appeler<br/>Suivant</span>
          </button>
        </div>
      </div>

      {/* ──── 3 COLUMNS ──── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        
        {/* ═══ COLONNE 1: En attente ═══ */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
            <h2 className="text-lg font-bold text-[#1B3B36]">En attente</h2>
            <span className="bg-[#E2E8F0] text-[#64748B] text-[11px] font-bold px-3 py-1 rounded-full">{enAttente.length} patients</span>
          </div>
          
          <motion.div layout className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-hide">
            <AnimatePresence initial={false}>
            {resteAttente.map(rdv => {
              const p = rdv.patients
              const initials = getInitials(p?.prenom, p?.nom)
              const waitMins = Math.max(0, Math.floor((Date.now() - new Date(rdv.updated_at || rdv.date_rdv).getTime()) / 60000))
              const isLongWait = waitMins >= 20
              // Assuming "SUIVI" or "CONSULTATION" based on data, fallback to "CONSULTATION"
              const motif = rdv.motif || (waitMins % 2 === 0 ? "SUIVI" : "CONSULTATION") // Mock variation for visuals

              return (
                <motion.div
                  key={rdv.id}
                  layout
                  {...queueCardMotion}
                  className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-transparent hover:border-[#0F6E56]/10 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarTheme(rdv.id)}`}>
                      {initials}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      {/* Name & Pill Row */}
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-[#1B3B36] text-[16px] truncate">{p?.prenom} {p?.nom}</div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0F6E56] bg-[#E8F3F0] px-2.5 py-1 rounded-md">
                          {motif}
                        </span>
                      </div>
                      
                      {/* Arrival Time */}
                      <div className="text-[12px] font-medium text-[#94A3B8] mb-4">
                        Arrivée à {formatTime(rdv.updated_at || rdv.date_rdv)}
                      </div>
                      
                      {/* Wait Time & Dot */}
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Clock size={14} className="opacity-70" />
                          <span className="text-[13px] font-semibold tracking-wide">
                            Attente : {waitMins} min
                          </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isLongWait ? 'bg-red-500' : 'bg-[#0F6E56]'}`} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
            {resteAttente.length === 0 && (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/50 backdrop-blur-sm rounded-[28px] p-8 text-center border border-dashed border-[#CBD5E1]"
              >
                <p className="text-[#94A3B8] font-medium text-sm">Prêt pour le prochain patient</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ═══ COLONNE 2: Prochain patient ═══ */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]" />
            <h2 className="text-lg font-bold text-[#1B3B36]">Prochain patient</h2>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {prochainPatient ? (() => {
               const p = prochainPatient.patients
               const initials = getInitials(p?.prenom, p?.nom)
               const dossierNum = `#MT-${String(prochainPatient.id).slice(0, 4).toUpperCase()}`
               // We need a specific hook just for this card so it updates every second without re-rendering the whole massive list
               const ArrivalTime = ({ since }) => {
                 const { mins } = useLiveWaitTime(since)
                 return <span>En attente depuis {mins} minutes</span>
               }

               return (
                 <>
                   {/* Main Big Card */}
                   <motion.div
                     key={prochainPatient.id}
                     layout
                     {...queueCardMotion}
                     className="bg-white rounded-[32px] overflow-hidden shadow-[0_20px_40px_rgba(15,110,86,0.06)] relative flex flex-col items-center pt-10 pb-8 px-6 border border-white/50"
                   >
                     {/* Background Chevron Decoration */}
                     <div className="absolute top-8 right-8 text-slate-100 flex gap-1 pointer-events-none">
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m9 18 6-6-6-6"/></svg>
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 -ml-5"><path d="m9 18 6-6-6-6"/></svg>
                     </div>

                     {/* Avatar */}
                     <div className="relative mb-6">
                        <div className={`w-[90px] h-[90px] rounded-full flex items-center justify-center text-3xl font-extrabold shadow-md border-4 border-white ${getAvatarTheme(prochainPatient.id)}`}>
                          {initials}
                        </div>
                     </div>

                     {/* Name & Dossier */}
                     <h3 className="text-[26px] font-extrabold text-[#1B3B36] mb-1">{p?.prenom} {p?.nom}</h3>
                     <p className="text-[11px] font-extrabold text-[#0F6E56] tracking-[0.2em] uppercase mb-8">DOSSIER {dossierNum}</p>

                     {/* Details Pills */}
                     <div className="flex gap-4 w-full justify-center mb-10">
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Urgence</span>
                           <span className="text-[14px] font-bold text-[#E11D48]">Non</span>
                        </div>
                        <div className="w-[1px] h-10 bg-slate-100" />
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Heure RDV</span>
                           <span className="text-[14px] font-bold text-[#1B3B36]">{formatTime(prochainPatient.date_rdv)}</span>
                        </div>
                     </div>

                     {/* CTA Button */}
                     <button
                        onClick={appellerSuivant}
                        className="w-full max-w-[280px] py-[18px] rounded-[20px] bg-[#0F6E56] text-white font-extrabold text-[15px] hover:bg-[#0d5e4a] transition-all shadow-xl shadow-[#0F6E56]/20 flex items-center justify-center gap-3 cursor-pointer border-none group"
                     >
                       <Bell size={20} className="group-hover:animate-wiggle" />
                       APPELER MAINTENANT
                     </button>

                     <p className="text-[13px] font-medium text-[#94A3B8] mt-6">
                       <ArrivalTime since={prochainPatient.updated_at || prochainPatient.date_rdv} />
                     </p>
                   </motion.div>

                   {/* Note de réception (Outside card) */}
                   <div className="bg-[#E4EDE9] rounded-[24px] p-6 text-left border border-white/50">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px] font-bold">i</div>
                       <span className="text-[10px] font-black text-[#6C857E] uppercase tracking-widest">Note de réception</span>
                     </div>
                     <p className="text-[14px] text-[#4F635D] font-medium leading-relaxed italic">
                       "{prochainPatient.notes || 'Aucune note spécifique n\'a été ajoutée par l\'accueil pour ce patient.'}"
                     </p>
                   </div>
                 </>
               )
            })() : (
               <div className="flex-1 flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-[32px] border-2 border-dashed border-[#CBD5E1]">
                 <p className="text-[#64748B] font-semibold text-sm">La file est vide</p>
               </div>
            )}
          </div>
        </div>

        {/* ═══ COLONNE 3: En consultation ═══ */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#64748B]" />
            <h2 className="text-lg font-bold text-[#1B3B36]">En consultation</h2>
          </div>

          <div className="flex-1 flex flex-col gap-6 overflow-hidden pr-2 pb-4 scrollbar-hide">
            
            {/* Consultation Card */}
            {enConsultation.length > 0 ? (
              <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)] relative">
                {/* Top badges */}
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-[#E2E8F0] text-[#475569] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    En cours
                  </span>
                  <div className="flex items-center gap-1.5 text-[#94A3B8]">
                    <Building2 size={12} />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest">Cabinet 1</span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="flex items-center gap-4 mb-2">
                  <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${getAvatarTheme(enConsultation[0].id)}`}>
                    {getInitials(enConsultation[0].patients?.prenom, enConsultation[0].patients?.nom)}
                  </div>
                  <div>
                    <h4 className="text-[18px] font-extrabold text-[#1B3B36] leading-tight">
                      {enConsultation[0].patients?.prenom} {enConsultation[0].patients?.nom}
                    </h4>
                    <p className="text-[13px] text-[#94A3B8] font-medium mt-1">
                      Motif : {enConsultation[0].motif || 'Consultation générale'}
                    </p>
                  </div>
                </div>

                {/* Big Circle Timer */}
                <div className="flex justify-center my-2 scale-90 sm:scale-100 origin-center">
                   <ProgressCircle since={enConsultation[0].updated_at || enConsultation[0].date_rdv} maxMinutes={30} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  {isDoctor && (
                    <button
                      onClick={() => setNoteSidebar({ open: true, rdvId: enConsultation[0].id, notes: enConsultation[0].notes })}
                      className="flex-1 py-[14px] rounded-[16px] bg-white border-[2px] border-slate-200 text-[#64748B] font-bold text-[13px] hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      AJOUTER NOTE
                    </button>
                  )}
                  <button
                    onClick={() => terminerConsultation(enConsultation[0].id)}
                    className="flex-1 py-[16px] rounded-[16px] bg-[#E2E8F0] text-[#1B3B36] font-bold text-[13px] hover:bg-slate-300 transition-colors cursor-pointer border-none"
                  >
                    TERMINER
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/40 backdrop-blur-sm rounded-[32px] p-8 text-center border-2 border-dashed border-[#CBD5E1]">
                <p className="text-[#64748B] font-semibold text-sm">Aucune consultation en cours</p>
              </div>
            )}

            {/* Planifiés Prochainement List */}
            {planifies.length > 0 && (
              <div className="mt-4 flex-1 flex flex-col min-h-0">
                <h5 className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-widest pl-2 mb-4">Planifiés prochainement</h5>
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                  {planifies.slice(0, 5).map(rdv => (
                    <div key={rdv.id} className="bg-white rounded-[16px] px-5 py-4 flex items-center shadow-sm">
                      <span className="text-[#94A3B8] font-bold text-[14px] w-14 shrink-0">{formatTime(rdv.date_rdv)}</span>
                      <span className="text-[#1B3B36] font-semibold text-[15px] truncate flex-1 ml-2">
                        {rdv.patients?.prenom} {rdv.patients?.nom}
                      </span>
                      <button className="text-[#CBD5E1] hover:text-[#94A3B8] p-1 cursor-pointer bg-transparent border-none">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      <AnimatePresence>
        {noteSidebar.open && (
          <NoteSidebar
            open={noteSidebar.open}
            rdvId={noteSidebar.rdvId}
            currentNotes={noteSidebar.notes}
            onClose={() => setNoteSidebar({ open: false, rdvId: null, notes: '' })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
