import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, Bell, Settings, Search, Stethoscope, Calendar, FileText, Plus, 
  Printer, Share, CreditCard, Droplets, Target, Activity, Zap,
  StickyNote, FolderOpen, Trash2, Eye, Upload, Paperclip, ClipboardList
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { AppButton } from '../../components/dashboard/DashboardPrimitives'
import { getPatientById, getConsultationsByPatient, getRdv, getDocuments } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { useCabinetId } from '../../hooks/useCabinetId'
import { isValidTransition, RDV_STATUSES } from '../../lib/workflow'

// ── Helpers ──
function calcAge(dateStr) {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDateFull(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Casablanca'
  }).toUpperCase()
}

export default function PatientProfileView({ patientId, onBack }) {
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const { cabinetId } = useCabinetId()
  const [activeTab, setActiveTab] = useState('Historique')
  const [notesText, setNotesText] = useState('')

  // ── Queries ──
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId
  })

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', 'patient', patientId],
    queryFn: () => getConsultationsByPatient(patientId),
    enabled: !!patientId
  })

  // We reuse getRdv but filter it client-side since API doesn't have getRdvByPatient
  const { data: allRdvs = [] } = useQuery({
    queryKey: ['rdv', profile?.cabinet_id],
    queryFn: getRdv,
    enabled: !!profile?.cabinet_id
  })

  // Ordonnances for this patient
  const { data: ordonnances = [] } = useQuery({
    queryKey: ['ordonnances', 'patient', patientId, cabinetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`*, consultations (notes, date_consult)`)
        .eq('patient_id', patientId)
        .eq('type_document', 'ordonnance')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!patientId && !!cabinetId
  })

  // All documents for this patient
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', 'patient', patientId],
    queryFn: () => getDocuments(patientId),
    enabled: !!patientId
  })

  // Non-ordonnance documents (scans, reports, etc.)
  const nonOrdonnanceDocs = useMemo(() => 
    documents.filter(d => d.type_document !== 'ordonnance'),
  [documents])

  // ── Computed Data ──
  const patientRdvs = useMemo(() => allRdvs.filter(r => r.patient_id === patientId), [allRdvs, patientId])

  const activeTodayRdv = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayRdvs = patientRdvs.filter(r => r.date_rdv?.startsWith(today))
    const overflow = todayRdvs.find(r => r.status && r.status !== RDV_STATUSES.ABSENT && r.status !== RDV_STATUSES.PAID)
    return overflow || null
  }, [patientRdvs])
  const finances = useMemo(() => {
    let paye = 0, du = 0
    consultations.forEach(c => {
      const montant = parseFloat(c.montant) || 0
      if (c.statut === 'paye') paye += montant
      if (c.statut === 'credit') du += montant
    })
    return { paye, du, total: paye + du }
  }, [consultations])

  const nextRdv = useMemo(() => {
    const now = new Date()
    const upcoming = patientRdvs.filter(r => new Date(r.date_rdv) > now && (r.status || r.statut) !== 'annule')
    upcoming.sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv))
    return upcoming[0] || null
  }, [patientRdvs])

  const timelineEvents = useMemo(() => {
    const events = []
    consultations.forEach(c => {
      events.push({
        id: c.id,
        type: 'consultation',
        date: new Date(c.date_consult),
        title: 'Consultation',
        notes: c.motif || c.notes || 'Consultation générale',
        status: c.statut,
        color: 'teal', // Maps to green dot
        badge: c.motif ? c.motif.substring(0, 15).toUpperCase() : 'CONSULTATION'
      })
    })
    // Add logic later if we fetch Ordonnances or Documents directly
    events.sort((a, b) => b.date - a.date)
    return events
  }, [consultations])

  // ── Render Helpers ──
  if (loadingPatient || !patient) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const age = calcAge(patient.date_naissance)
  const sexDisplay = patient.sexe === 'homme' ? 'Homme' : patient.sexe === 'femme' ? 'Femme' : 'Non précisé'
  const initials = `${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}`.toUpperCase()

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] -mt-4 -mx-4 overflow-hidden bg-slate-50/50">
      
      {/* ── 1. Top Navigation Bar ── */}
      <header className="h-[76px] flex items-center justify-between px-8 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <h1 className="text-[20px] font-black tracking-tight text-slate-800">MacroMedica<span className="text-teal-600">.</span></h1>
        </div>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher un patient..."
              className="w-full h-11 bg-slate-50 border-transparent rounded-[16px] pl-11 pr-4 text-[14px] text-slate-700 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 mr-4">
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[9px] font-extrabold tracking-wider">DOSSIER PATIENT V2</span>
              </div>
              <p className="text-[13px] font-bold text-slate-900">Dr. {profile?.nom || 'Docteur'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 shadow-sm border-2 border-white flex items-center justify-center text-white font-bold text-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* ── 2. Left Sidebar (Identity Card) ── */}
        <aside className="w-full lg:w-[320px] bg-white border-r border-slate-100 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-[32px] bg-teal-50 flex items-center justify-center text-[32px] font-bold text-teal-700 shadow-inner">
                {initials || 'P'}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-500 text-white text-[10px] font-extrabold tracking-wider rounded-full shadow-[0_4px_12px_rgba(20,184,166,0.3)] border-2 border-white">
                ACTIF
              </div>
            </div>
            <h2 className="text-[22px] font-black text-slate-900 leading-tight">{patient.prenom} {patient.nom}</h2>
            <p className="text-[14px] text-slate-500 font-medium mt-1">
              {age ? `${age} ans` : '-'} • {sexDisplay} • ID: {patient.id?.split('-')[0]}
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {patient.group_sanguin && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] font-bold text-rose-700 flex-1">{patient.group_sanguin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Computed Dynamic Workflow CTA */}
          {(() => {
            if (!activeTodayRdv) {
              return (
                <button disabled className="w-full h-[48px] bg-slate-100 text-slate-400 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed">
                  Aucun RDV actif aujourd'hui
                </button>
              )
            }
            const { status, id } = activeTodayRdv

            if (profile?.role === 'docteur') {
              if (status === RDV_STATUSES.ARRIVED) {
                return (
                  <button onClick={async () => { await supabase.from('rdv').update({ status: RDV_STATUSES.IN_CONSULTATION }).eq('id', id); navigate(`/consultation/${id}`) }} className="w-full h-[48px] bg-teal-600 hover:bg-teal-700 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(13,148,136,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    <Stethoscope className="w-4 h-4" /> Démarrer consultation
                  </button>
                )
              }
              if (status === RDV_STATUSES.IN_CONSULTATION) {
                return (
                  <button onClick={() => navigate(`/consultation/${id}`)} className="w-full h-[48px] bg-orange-500 hover:bg-orange-600 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(249,115,22,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    <Stethoscope className="w-4 h-4" /> Reprendre consultation
                  </button>
                )
              }
              return (
                 <button disabled className="w-full h-[48px] bg-slate-100 text-slate-400 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed uppercase text-[11px] tracking-wider">
                   Patient: {status}
                 </button>
              )
            }

            if (profile?.role === 'secretaire') {
              if (!status || status === RDV_STATUSES.SCHEDULED) {
                return (
                  <button onClick={async () => { await supabase.from('rdv').update({ status: RDV_STATUSES.ARRIVED }).eq('id', id) }} className="w-full h-[48px] bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    Marquer comme arrivé
                  </button>
                )
              }
              if (status === RDV_STATUSES.COMPLETED) {
                return (
                  <button onClick={() => navigate(`/facturation`)} className="w-full h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[16px] font-bold text-[14px] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    Encaisser la consultation
                  </button>
                )
              }
              return (
                 <button disabled className="w-full h-[48px] bg-blue-50 text-blue-500 border border-blue-200 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed uppercase tracking-wider">
                   En cours ({status})
                 </button>
              )
            }

            return null
          })()}

          {/* Medical Alerts (Mocked based on notes if no native support) */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alertes Médicales</h3>
            <div className="space-y-2">
              {patient.mutuelle === 'CNOPS' && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-[1px]" />
                  <p className="text-[13px] font-semibold text-amber-800 leading-snug">Patient affilié CNOPS - Vérifier prise en charge spéciale.</p>
                </div>
              )}
              {patient.notes?.toLowerCase().includes('allergie') && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-[1px]" />
                  <p className="text-[13px] font-semibold text-rose-800 leading-snug">Allergie signalée dans les notes du dossier.</p>
                </div>
              )}
              {!patient.mutuelle && !patient.notes?.toLowerCase().includes('allergie') && (
                <p className="text-[13px] text-slate-400 italic">Aucune alerte médicale majeure enregistrée.</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex flex-col items-center justify-center p-3 rounded-[16px] bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-100 group">
                <Calendar className="w-5 h-5 mb-1.5 opacity-70 group-hover:opacity-100" />
                <span className="text-[11px] font-bold">Planifier</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 rounded-[16px] bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-100 group">
                <FileText className="w-5 h-5 mb-1.5 opacity-70 group-hover:opacity-100" />
                <span className="text-[11px] font-bold">Ordonnance</span>
              </button>
            </div>
            <button className="w-full mt-2 flex items-center justify-center gap-2 p-3 rounded-[16px] bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-100">
              <Plus className="w-4 h-4" />
              <span className="text-[12px] font-bold">Ajouter un document</span>
            </button>
          </div>

          {/* Contact Quick Info */}
          <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                  <span className="text-[12px]">📞</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Téléphone</p>
                  <p className="text-[13px] font-semibold text-slate-700">{patient.telephone || 'Non renseigné'}</p>
                </div>
              </div>
              {patient.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                    <span className="text-[12px]">✉️</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                    <p className="text-[13px] font-semibold text-slate-700 truncate max-w-[180px]">{patient.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── 3. Main Content Area (Tabs) ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          {/* Header & Tabs */}
          <div className="px-8 pt-8 pb-4 bg-white border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[28px] font-black tracking-tight text-slate-900">
                  Dossier <span className="text-teal-600">Patient</span>
                </h2>
                <p className="text-[14px] text-slate-500 mt-1">Suivi médical complet et historique clinique</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Share className="w-4 h-4" />
                </button>
                <button className="h-10 px-5 flex items-center justify-center gap-2 rounded-[14px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(13,148,136,0.2)] ml-2 transition-all">
                  <Plus className="w-4 h-4" />
                  Nouvel acte
                </button>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2">
              {['Informations', 'Historique', 'Consultations', 'Ordonnances', 'Documents', 'Notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-[12px] text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'Informations' && <span>ℹ️</span>}
                  {tab === 'Historique' && <Activity className="w-4 h-4 opacity-70" />}
                  {tab === 'Consultations' && <Stethoscope className="w-4 h-4 opacity-70" />}
                  {tab === 'Ordonnances' && <FileText className="w-4 h-4 opacity-70" />}
                  {tab === 'Documents' && <FolderOpen className="w-4 h-4 opacity-70" />}
                  {tab === 'Notes' && <StickyNote className="w-4 h-4 opacity-70" />}
                  {tab}
                  {tab === 'Ordonnances' && ordonnances.length > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      activeTab === tab ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
                    }`}>{ordonnances.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'Historique' && (
              <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[18px] font-bold text-slate-900">Parcours de soins</h3>
                  <button className="text-[13px] font-bold text-teal-600 hover:text-teal-700">Voir tout l'historique →</button>
                </div>

                <div className="relative pl-6">
                  {/* Vertical Timeline Line */}
                  <div className="absolute top-4 bottom-8 left-2.5 w-0.5 bg-slate-200" />

                  <div className="space-y-8">
                    {timelineEvents.map((evt, idx) => {
                      const isLast = idx === timelineEvents.length - 1
                      const isCredit = evt.status === 'credit'
                      return (
                        <div key={evt.id} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${
                            isCredit ? 'bg-rose-500' : 'bg-teal-500'
                          }`} />
                          
                          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold text-slate-400 w-24">{formatDateFull(evt.date)}</span>
                                <h4 className="text-[15px] font-bold text-slate-900">{evt.title}</h4>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                                  isCredit ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'
                                }`}>
                                  {!isCredit && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                                  {isCredit ? 'IMPAYÉ' : evt.badge}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-4 ml-0 sm:ml-28">
                              {evt.notes}
                            </p>
                            
                            <div className="flex items-center gap-3 ml-0 sm:ml-28">
                              <button className="text-[12px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-1.5 rounded-[10px] transition-colors">
                                Détails de visite
                              </button>
                              <button className="text-[12px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-1.5 rounded-[10px] transition-colors">
                                Facture
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {timelineEvents.length === 0 && (
                      <div className="p-8 text-center bg-white rounded-[24px] border border-dashed border-slate-200">
                        <p className="text-[14px] text-slate-500">Aucun événement enregistré pour ce patient.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Informations' && (
              <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-slate-900">Détails du Patient</h3>
                  <button className="text-[13px] font-bold text-teal-600 bg-teal-50 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors">
                    Modifier les informations
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Identité & Contact Card */}
                  <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <span className="text-[16px]">👤</span>
                      </div>
                      <h4 className="text-[15px] font-bold text-slate-900">Identité & Contact</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nom Complet</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.nom} {patient.prenom}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date de naissance</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.date_naissance ? formatDateFull(patient.date_naissance) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">CIN / Passeport</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.cin || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Téléphone</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.telephone || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.email || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Adresse Complète</p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.adresse || '-'}</p>
                        <p className="text-[13px] text-slate-500 mt-0.5">{patient.ville || ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profil Médical Card */}
                  <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                        <span className="text-[16px]">❤️</span>
                      </div>
                      <h4 className="text-[15px] font-bold text-slate-900">Profil Médical</h4>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Groupe Sanguin</p>
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 font-black text-[16px] border border-rose-100">
                            {patient.groupe_sanguin || '-'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sexe</p>
                          <div className="inline-flex items-center px-4 h-12 rounded-2xl bg-slate-50 text-slate-700 font-bold text-[14px] border border-slate-100">
                            {patient.sexe === 'homme' ? 'Masculin' : patient.sexe === 'femme' ? 'Féminin' : '-'}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-[16px] bg-amber-50/50 border border-amber-100/50">
                        <p className="text-[11px] font-bold text-amber-600/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Allergies
                        </p>
                        <p className="text-[14px] font-semibold text-slate-800">{patient.allergies || 'Aucune allergie signalée'}</p>
                      </div>

                      <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Antécédents Médicaux</p>
                        <p className="text-[14px] font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{patient.antecedents || 'Aucun antécédent particulier signalé dans le dossier.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Administratif & Assurance Card */}
                  <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <span className="text-[16px]">🛡️</span>
                      </div>
                      <h4 className="text-[15px] font-bold text-slate-900">Administratif & Assurance</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Couverture Médicale</p>
                        <p className="text-[15px] font-bold text-emerald-700">{patient.mutuelle || 'Non renseigné'}</p>
                      </div>
                      <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date d'inscription</p>
                        <p className="text-[14px] font-semibold text-slate-800">{formatDateFull(patient.created_at)}</p>
                      </div>
                      <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Statut du Dossier</p>
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold mt-1">
                          Dossier Actif
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
            
            {/* ── CONSULTATIONS TAB ── */}
            {activeTab === 'Consultations' && (
              <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-slate-900">Historique des Consultations</h3>
                  <span className="text-[13px] font-bold text-slate-400">{consultations.length} consultation{consultations.length !== 1 ? 's' : ''}</span>
                </div>

                {consultations.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 text-center border border-dashed border-slate-200">
                    <Stethoscope className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-[15px] font-semibold text-slate-500">Aucune consultation enregistrée</p>
                    <p className="text-[13px] text-slate-400 mt-1">Les consultations apparaîtront ici automatiquement.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {consultations.map(c => {
                      const isPaid = c.statut === 'paye'
                      const isCredit = c.statut === 'credit'
                      let parsedNotes = null
                      try { parsedNotes = c.notes ? JSON.parse(c.notes) : null } catch(e) {}

                      return (
                        <div key={c.id} className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                isCredit ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'
                              }`}>
                                <Stethoscope className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-slate-900">{c.motif || 'Consultation'}</h4>
                                <p className="text-[12px] text-slate-400 mt-0.5">{formatDateFull(c.date_consult)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.montant && (
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                  isPaid ? 'bg-teal-50 text-teal-700' : isCredit ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                                }`}>
                                  {Number(c.montant).toLocaleString('fr-FR')} MAD
                                </span>
                              )}
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPaid ? 'bg-emerald-50 text-emerald-700' : isCredit ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {isPaid ? 'Payé' : isCredit ? 'Impayé' : c.statut || 'En cours'}
                              </span>
                            </div>
                          </div>
                          {(c.notes || parsedNotes) && (
                            <div className="ml-[52px] p-3 bg-slate-50 rounded-xl">
                              <p className="text-[13px] text-slate-600 leading-relaxed">
                                {parsedNotes?.diagnostic || parsedNotes?.motif || c.notes?.substring(0, 200)}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ORDONNANCES TAB ── */}
            {activeTab === 'Ordonnances' && (
              <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-slate-900">Ordonnances</h3>
                  <span className="text-[13px] font-bold text-slate-400">{ordonnances.length} ordonnance{ordonnances.length !== 1 ? 's' : ''}</span>
                </div>

                {ordonnances.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 text-center border border-dashed border-slate-200">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-[15px] font-semibold text-slate-500">Aucune ordonnance pour ce patient</p>
                    <p className="text-[13px] text-slate-400 mt-1">Les ordonnances créées lors des consultations apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ordonnances.map(doc => {
                      let parsedData = {}
                      try {
                        if (doc.consultations?.notes) parsedData = JSON.parse(doc.consultations.notes)
                      } catch(e) {}
                      const meds = parsedData?.medicaments || []

                      return (
                        <div key={doc.id} className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <ClipboardList className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-[15px] font-bold text-slate-900">Ordonnance</h4>
                                <p className="text-[12px] text-slate-400 mt-0.5">
                                  {formatDateFull(doc.consultations?.date_consult || doc.created_at)}
                                  {parsedData?.medecin && <span> · Dr. {parsedData.medecin}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-colors" title="Imprimer">
                                <Printer className="w-4 h-4" />
                              </button>
                              <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Voir">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {meds.length > 0 && (
                            <div className="ml-[52px] space-y-1.5">
                              {meds.slice(0, 4).map((m, i) => (
                                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
                                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-800 truncate">{m.nom}</p>
                                    <p className="text-[11px] text-slate-400">{m.posologie}{m.duree ? ` — ${m.duree}` : ''}</p>
                                  </div>
                                </div>
                              ))}
                              {meds.length > 4 && (
                                <p className="text-[12px] text-slate-400 font-medium ml-7">+ {meds.length - 4} autre{meds.length - 4 > 1 ? 's' : ''} médicament{meds.length - 4 > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS / SCANS TAB ── */}
            {activeTab === 'Documents' && (
              <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-slate-900">Documents & Scans</h3>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(13,148,136,0.2)] transition-all">
                    <Upload className="w-4 h-4" /> Ajouter un document
                  </button>
                </div>

                {nonOrdonnanceDocs.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 text-center border border-dashed border-slate-200">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-[15px] font-semibold text-slate-500">Aucun document ou scan</p>
                    <p className="text-[13px] text-slate-400 mt-1">Ajoutez des résultats d'analyses, radiographies ou autres documents médicaux.</p>
                    <button className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] transition-colors">
                      <Upload className="w-4 h-4" /> Télécharger un fichier
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nonOrdonnanceDocs.map(doc => (
                      <div key={doc.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-900 truncate">{doc.nom || doc.type_document || 'Document'}</p>
                          <p className="text-[12px] text-slate-400 mt-0.5">{formatDateFull(doc.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-teal-600 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── NOTES MÉDICALES TAB ── */}
            {activeTab === 'Notes' && (
              <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[18px] font-bold text-slate-900">Notes Médicales</h3>
                </div>

                {/* Existing notes from patient record */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-500">
                      <StickyNote className="w-5 h-5" />
                    </div>
                    <h4 className="text-[15px] font-bold text-slate-900">Notes du dossier</h4>
                  </div>
                  <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                    <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {patient.notes || 'Aucune note enregistrée dans le dossier du patient.'}
                    </p>
                  </div>
                </div>

                {/* Antécédents */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <h4 className="text-[15px] font-bold text-slate-900">Antécédents médicaux</h4>
                  </div>
                  <div className="p-4 rounded-[16px] bg-slate-50 border border-slate-100">
                    <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {patient.antecedents || 'Aucun antécédent particulier.'}
                    </p>
                  </div>
                </div>

                {/* Allergies */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                      <span className="text-[16px]">⚠️</span>
                    </div>
                    <h4 className="text-[15px] font-bold text-slate-900">Allergies</h4>
                  </div>
                  <div className={`p-4 rounded-[16px] border ${
                    patient.allergies ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${
                      patient.allergies ? 'text-rose-800 font-semibold' : 'text-slate-500'
                    }`}>
                      {patient.allergies || 'Aucune allergie signalée.'}
                    </p>
                  </div>
                </div>

                {/* Quick note textarea */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                      <Plus className="w-5 h-5" />
                    </div>
                    <h4 className="text-[15px] font-bold text-slate-900">Ajouter une note rapide</h4>
                  </div>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Écrivez une observation, un rappel ou un commentaire médical..."
                    className="w-full h-32 p-4 rounded-[16px] bg-slate-50 border border-slate-200 text-[14px] text-slate-700 outline-none resize-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all placeholder:text-slate-400"
                  />
                  <div className="flex justify-end mt-3">
                    <button className="px-5 py-2.5 rounded-[14px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(13,148,136,0.2)] transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Enregistrer la note
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── 4. Right Sidebar (Metrics & Financials) ── */}
        <aside className="w-full lg:w-[320px] p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-slate-50/50 lg:border-l border-slate-100">
          
          {/* Indicateurs Clés */}
          <div className="bg-slate-900 text-white rounded-[24px] p-6 mb-6 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-teal-400" />
              <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-200">Indicateurs clés</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[12px] font-semibold text-slate-400">IMC (BMI)</span>
                  <span className="text-[20px] font-bold text-white">24.2</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full w-[60%] bg-teal-400 rounded-full" />
                </div>
                <p className="text-[10px] text-teal-400 font-medium tracking-wide">Poids idéal pour sa taille</p>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-800/50 rounded-[16px] p-3 border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tension</p>
                  <p className="text-[18px] font-bold">13/8</p>
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-[16px] p-3 border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Glycémie</p>
                  <p className="text-[18px] font-bold">1.02 <span className="text-[12px] font-normal text-slate-400">g/l</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Finances du Patient */}
          <div className="bg-white rounded-[24px] p-6 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2">
              Finances du Patient
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Versé</p>
                <p className="text-[28px] font-black text-teal-600 tracking-tight leading-none">{finances.paye.toLocaleString()} <span className="text-[14px]">MAD</span></p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solde Dû</p>
                <p className="text-[28px] font-black text-rose-500 tracking-tight leading-none">{finances.du.toLocaleString()} <span className="text-[14px]">MAD</span></p>
              </div>
            </div>
            
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[13px] transition-colors">
              <Zap className="w-4 h-4" />
              Effectuer un versement
            </button>
          </div>

          {/* Prochains RDV */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4">Prochains Rendez-vous</h3>
            
            {nextRdv ? (
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center min-w-[56px] h-[64px] bg-teal-50 rounded-[14px] border border-teal-100">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{new Date(nextRdv.date_rdv).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                  <span className="text-[20px] font-black text-teal-700 leading-none">{new Date(nextRdv.date_rdv).getDate()}</span>
                </div>
                <div className="py-1">
                  <h4 className="text-[14px] font-bold text-slate-900 mb-1">{nextRdv.notes || 'Consultation'}</h4>
                  <p className="text-[12px] font-medium text-slate-500">{new Date(nextRdv.date_rdv).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Cabinet</p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[13px] text-slate-400 font-medium">Aucun rendez-vous à venir</p>
                <button className="mt-3 text-[12px] font-bold text-teal-600">Planifier maintenant</button>
              </div>
            )}
          </div>

        </aside>

      </div>
    </div>
  )
}
