import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  Pill,
  Stethoscope,
  User,
  Phone,
  Heart,
  Droplets,
  Thermometer,
  Scale,
  Ruler,
  ChevronRight,
  Download,
  Printer,
  FileCheck2,
  TestTube2,
  Image as ImageIcon,
  Microscope,
  CheckCircle2,
  X,
  Plus,
  Sparkles,
  Brain,
  ListChecks,
  ClipboardList,
  BookOpen,
  MoreHorizontal,
  Share2,
  FilePlus,
  Save,
  CalendarClock,
  Check,
  Wind,
  Zap,
  Shield,
  Calculator,
  Info,
  ContactRound,
  HeartPulse,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

import { getDocuments, getOrdonnances, getPatientById, getPatientClinicalFields } from '../../lib/api'
import { VISIT_STATUSES } from '../../lib/workflow'
import { useFocusMode } from '../../hooks/useFocusMode'
import ConsultationSheet from '../../components/consultation/ConsultationSheet'
import AddItemModal from '../../components/consultation/AddItemModal'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { Card } from '../../components/facturation/ui'
import { isConsultationLive } from '../../lib/consultationProgress'
import { useActeSuggestions } from '../../lib/acteSuggestions'
import { recordActeUse, usageScope } from '../../lib/acteUsage'
import { useEncounterDraft } from '../../hooks/useEncounterDraft'
import { getOpenDraft, listCompletedEncounters, normalizeNote } from '../../lib/encounterService'
import { ordonnancesFromEncounters, examensFromEncounters } from '../../lib/patientRecords'
import { fetchFactures } from '../../components/facturation/api'
import { OrdonnancesList, ExamensList, ImagerieList, FacturesList } from '../../components/Patient/DossierRecords'
import { Backdrop, FocusableCard, MedicalTextarea } from '../../components/FocusMode'
import PreparationChecklist from '../../components/consultation/PreparationChecklist'
import FsePatientTab from '../../components/cnss/FsePatientTab' // [FSE TAB]

// --- Mock Data ---
const MOCK_ALERTS = [
  { id: 1, type: 'allergy', label: 'Allergie pénicilline', severity: 'critical' },
  { id: 2, type: 'chronic', label: 'Diabète type 2', severity: 'warning' },
]

const MOCK_MEDICATIONS = [
  { id: 1, name: 'Metformine 850mg', dosage: '1 cp matin & soir', compliance: 'good' },
  { id: 2, name: 'Ramipril 5mg', dosage: '1 cp le soir', compliance: 'good' },
]

const MOCK_RESULTS = [
  { id: 1, type: 'Glycémie', value: '1,2 g/L', date: '14 juin 2026', status: 'normal' },
  { id: 2, type: 'Tension', value: '120/80 mmHg', date: '14 juin 2026', status: 'normal' },
]


const DOCUMENTS = [
  { id: 1, type: 'prescription', name: 'Ordonnance', date: '19 juin 2026', doctor: 'Dr. Benali' },
  { id: 2, type: 'lab', name: 'Bilan sanguin (NFS)', date: '14 juin 2026', doctor: 'Dr. Touggani' },
  { id: 3, type: 'imaging', name: 'Échographie abdominale', date: '20 mai 2026', doctor: 'Dr. Benali' },
]

// --- Helper Functions ---
function calcAge(dateStr) {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Number.isFinite(age) && age >= 0 ? age : null
}

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, mins, secs].map(v => String(v).padStart(2, '0')).join(':')
}

function getGenderLabel(sexe) {
  if (sexe === 'homme') return 'Homme'
  if (sexe === 'femme') return 'Femme'
  return 'Non renseigné'
}

function formatPatientSince(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function calcBMI(weightKg, heightCm) {
  const w = parseFloat(weightKg)
  const h = parseFloat(heightCm)
  if (!w || !h) return null
  const bmi = w / ((h / 100) ** 2)
  return bmi.toFixed(1)
}


function PatientInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[14px] font-semibold text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

function PatientSidebar({ patient, age, chronicDisease, currentTreatment, emergencyContact }) {
  const initials = `${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}`.toUpperCase()
  const allergies = patient.allergies?.trim()
  const hasAllergies = allergies && allergies.toLowerCase() !== 'aucune'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-600 px-6 py-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight tracking-tight">
              {patient.prenom} {patient.nom}
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 font-medium">
              {age !== null ? `${age} ans` : 'Âge non renseigné'} • {getGenderLabel(patient.sexe)}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 px-5">
        <PatientInfoRow icon={Droplets} label="Groupe sanguin" value={patient.groupe_sanguin || '—'} />
        <PatientInfoRow icon={Phone} label="Téléphone" value={patient.telephone || '—'} />
        <PatientInfoRow icon={Shield} label="Assurance" value={patient.mutuelle || patient.assurance || '—'} />
        <PatientInfoRow icon={Calendar} label="Patient depuis" value={formatPatientSince(patient.created_at)} />
      </div>

      <div className="px-5 py-4">
        <div className={`rounded-xl border p-4 ${hasAllergies ? 'border-red-200 bg-red-50' : 'border-red-100 bg-red-50/50'}`}>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className={hasAllergies ? 'text-red-500' : 'text-red-400'} />
            <span className={`text-sm font-bold ${hasAllergies ? 'text-red-700' : 'text-red-600'}`}>Allergies</span>
          </div>
          <p className={`text-sm font-medium leading-relaxed ${hasAllergies ? 'text-red-800' : 'text-red-700/80'}`}>
            {hasAllergies ? allergies : 'Non renseignées'}
          </p>
        </div>
      </div>

      <div className="space-y-0 border-t border-slate-100 px-5 pb-5">
        <PatientInfoRow icon={HeartPulse} label="Maladies chroniques" value={chronicDisease} />
        <PatientInfoRow icon={Pill} label="Traitement actuel" value={currentTreatment} />
        <PatientInfoRow icon={ContactRound} label="Contact d'urgence" value={emergencyContact} />
      </div>
    </div>
  )
}



// --- Timeline Event Component ---
const SUB_ITEM_ICONS = {
  lab: TestTube2,
  medication: Pill,
  exam: Activity,
}

const SUB_ITEM_STATUS_STYLES = {
  'Terminé': 'bg-slate-100 text-slate-600 border-slate-200',
  'Actif': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

// Completed consultations (clinical_encounters) -> history cards. Summary on the
// card; the full note is one click away in the details modal.
function encounterToEvent(enc) {
  const n = normalizeNote(enc.note)
  const done = new Date(enc.completed_at || enc.started_at)
  const v = n.vitals
  const withUnit = (x, u) => (String(x).trim() ? `${String(x).trim()}${u}` : '')
  const line = (label, text) => (String(text || '').trim() ? `${label}\n${String(text).trim()}` : '')
  const treatments = n.traitements.filter((r) => r.medicament.trim())
  const details = [
    line('Motif', [n.motif, n.depuis && `Depuis : ${n.depuis}`, n.evolution && `Évolution : ${n.evolution}`].filter(Boolean).join(' · ')),
    line('Symptômes / histoire', n.histoire),
    line('Examen clinique', n.examen),
    line('Diagnostic', n.diagnostics.join(' ; ')),
    line('Conduite à tenir', n.conduite),
    line('Traitement', treatments.map((r) => [r.medicament, r.posologie, r.duree].filter(Boolean).join(' · ')).join('\n')),
    line('Examens', n.examens.join(' · ')),
    line('Suivi', [n.followUpDate && new Date(`${n.followUpDate}T12:00:00`).toLocaleDateString('fr-FR'), n.followUpNotes].filter(Boolean).join(' · ')),
    line('Documents', n.documents.join(' · ')),
  ].filter(Boolean).join('\n\n')
  return {
    id: enc.id,
    type: 'consultation',
    date: done.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: done.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    title: n.motif.split('\n')[0].trim() || 'Consultation',
    category: 'Consultation',
    doctor: '',
    diagnosis: n.diagnostics.join(' ; '),
    summary: n.motif,
    details,
    // The whole recorded note, by section, for the details modal (empty sections are hidden there).
    sections: {
      motif: [n.motif, n.depuis && `Depuis : ${n.depuis}`, n.evolution && `Évolution : ${n.evolution}`].filter(Boolean).join(' · '),
      histoire: String(n.histoire || '').trim(),
      examen: String(n.examen || '').trim(),
      diagnostics: n.diagnostics,
      conduite: String(n.conduite || '').trim(),
      traitements: treatments.map((r) => ({ medicament: r.medicament.trim(), posologie: r.posologie?.trim() || '', duree: r.duree?.trim() || '' })),
      examens: n.examens,
      documents: n.documents,
      suivi: { date: n.followUpDate || '', notes: String(n.followUpNotes || '').trim() },
      constantes: [
        v.bloodPressureSystolic && v.bloodPressureDiastolic ? { label: 'Tension', value: `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` } : null,
        String(v.heartRate || '').trim() ? { label: 'Pouls', value: `${v.heartRate} bpm` } : null,
        String(v.temperature || '').trim() ? { label: 'Température', value: `${v.temperature} °C` } : null,
        String(v.oxygenSaturation || '').trim() ? { label: 'SpO₂', value: `${v.oxygenSaturation} %` } : null,
        String(v.weight || '').trim() ? { label: 'Poids', value: `${v.weight} kg` } : null,
        String(v.height || '').trim() ? { label: 'Taille', value: `${v.height} cm` } : null,
      ].filter(Boolean),
    },
    tags: [],
    vitals: {
      temp: withUnit(v.temperature, ' °C'),
      bp: v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '',
      hr: v.heartRate,
      weight: withUnit(v.weight, ' kg'),
    },
    subItems: [
      ...treatments.map((r) => ({ type: 'medication', name: r.medicament, detail: [r.posologie, r.duree].filter(Boolean).join(' · '), status: null })),
      ...n.examens.map((x) => ({ type: 'exam', name: x, detail: '', status: null })),
    ],
  }
}

function TimelineEvent({ event, index, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getEventConfig = () => {
    switch (event.type) {
      case 'urgency': return { label: 'Urgence', color: 'text-red-600' }
      case 'lab': return { label: 'Laboratoire', color: 'text-emerald-600' }
      case 'consultation': return { label: 'Consultation', color: 'text-blue-600' }
      case 'imaging': return { label: 'Imagerie', color: 'text-sky-600' }
      case 'prescription': return { label: 'Ordonnance', color: 'text-purple-600' }
      default: return { label: 'Autre', color: 'text-slate-500' }
    }
  }

  const config = getEventConfig()
  const hasVitals = event.vitals && Object.values(event.vitals).some(Boolean)
  const hasSubItems = event.subItems?.length > 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="relative w-full pl-8 pb-3.5 last:pb-0"
    >
      <span className="absolute left-[5px] top-[15px] z-10 w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
      <div
        className={`w-full rounded-[0.625rem] border-2 bg-white shadow-sm transition-all duration-200 ${
          isExpanded ? 'border-slate-300 shadow-md' : 'border-[#e2e8f0] hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full text-left px-4 py-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-1.5 min-w-0">
              <ChevronRight
                className={`w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
              <h3 className="text-[14.5px] font-bold text-slate-900 leading-snug truncate">
                {event.title}
              </h3>
            </div>
            <span className="shrink-0 text-[12px] font-medium text-slate-400">{event.date}</span>
          </div>
          <p className={`mt-1 pl-[22px] text-[12.5px] font-semibold ${config.color}`}>
            {event.category || config.label}
          </p>
          {event.diagnosis && (
            <p className="mt-1.5 pl-[22px] text-[13px] text-slate-500">
              Diagnostic : <span className="font-semibold text-slate-800">{event.diagnosis}</span>
            </p>
          )}
        </button>

        {isExpanded && (hasVitals || hasSubItems || event.details) && (
          <div className="px-4 pb-3.5 pl-[46px] space-y-2.5">
            {hasVitals && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {event.vitals.temp && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-medium">T {event.vitals.temp}</span>
                )}
                {event.vitals.bp && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-medium">BP {event.vitals.bp}</span>
                )}
                {event.vitals.hr && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-medium">HR {event.vitals.hr}</span>
                )}
                {event.vitals.weight && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-medium">{event.vitals.weight}</span>
                )}
              </div>
            )}

            {hasSubItems && (
              <div className="space-y-2">
                {event.subItems.map((item, i) => {
                  const Icon = SUB_ITEM_ICONS[item.type] || FileText
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{item.name}</p>
                        {item.detail && <p className="text-[12px] text-slate-500 truncate">{item.detail}</p>}
                      </div>
                      {item.status && (
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            SUB_ITEM_STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {event.details && (
              <button
                onClick={() => onViewDetails(event)}
                className="text-[12.5px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Voir la note complète →
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}

// --- Quick Action Component ---
function QuickAction({ icon, title, description, isPrimary, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 group text-left"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-all ${isPrimary ? 'bg-blue-50' : 'bg-slate-50'}`}>
        <div className={`transition-all ${isPrimary ? 'text-blue-600' : 'text-slate-500'} group-hover:text-blue-600`}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-slate-800 leading-tight">{title}</p>
        <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all shrink-0" />
    </button>
  )
}

// --- Event Details Modal ---
// Same labeled-section pattern as the finish-consultation summary (MOTIF / DIAGNOSTIC / TRAITEMENT /
// SUIVI), for a consultation that is already recorded. Sections with nothing recorded are hidden.
function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-3 text-[13.5px]">
      <span className="pt-0.5 text-[12px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="min-w-0 whitespace-pre-wrap break-words text-slate-800">{children}</div>
    </div>
  )
}

// Relative wording for the follow-up date, so the actionable part reads at a glance.
function followUpTiming(dateStr) {
  const target = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)
  if (days === 0) return { label: "Aujourd'hui", tone: 'amber' }
  if (days > 0) return { label: `Dans ${days} jour${days > 1 ? 's' : ''}`, tone: 'neutral' }
  return { label: `Dépassé de ${-days} jour${-days > 1 ? 's' : ''}`, tone: 'amber' }
}

function EventDetailsModal({ event, onClose }) {
  const getEventConfig = () => {
    switch (event.type) {
      case 'urgency': return { color: '#EF4444', label: 'Urgence', icon: <AlertTriangle size={18} /> }
      case 'lab': return { color: '#3B82F6', label: 'Laboratoire', icon: <Microscope size={18} /> }
      case 'consultation': return { color: '#10B981', label: 'Consultation', icon: <Stethoscope size={18} /> }
      case 'prescription': return { color: '#F59E0B', label: 'Ordonnance', icon: <Pill size={18} /> }
      default: return { color: '#6B7280', label: 'Autre', icon: <FileText size={18} /> }
    }
  }
  const config = getEventConfig()
  const s = event.sections

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const followUp = s?.suivi?.date || s?.suivi?.notes ? s.suivi : null
  const timing = followUp?.date ? followUpTiming(followUp.date) : null
  const hasRows = s && (s.motif || s.histoire || s.examen || s.diagnostics.length || s.conduite || s.traitements.length || s.examens.length || s.documents.length)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[21px] bg-white shadow-[0_12px_48px_rgba(0,0,0,0.12)]"
      >
        <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <div style={{ color: config.color }}>{config.icon}</div>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{event.title}</h2>
              <p className="text-xs text-slate-500">{event.date} à {event.time}{event.doctor ? ` • ${event.doctor}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            {event.tags?.map(tag => (
              <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
            ))}
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: `${config.color}10`, color: config.color }}
            >
              {config.label}
            </span>
          </div>

          {s ? (
            <>
              {/* Constantes: the vitals shown on the collapsed card, carried into the note */}
              {s.constantes.length > 0 && (
                <Card tone="muted" className="p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Constantes</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {s.constantes.map((c) => (
                      <span key={c.label} className="inline-flex items-baseline gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</span>
                        <span className="text-[13px] font-bold text-slate-800">{c.value}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* The recorded note, section by section */}
              {hasRows ? (
                <Card tone="muted" className="divide-y divide-slate-200 px-5 py-2">
                  {s.motif && <DetailRow label="Motif">{s.motif}</DetailRow>}
                  {s.histoire && <DetailRow label="Symptômes">{s.histoire}</DetailRow>}
                  {s.examen && <DetailRow label="Examen clinique">{s.examen}</DetailRow>}
                  {s.diagnostics.length > 0 && (
                    <DetailRow label="Diagnostic">
                      <ul className="space-y-1">{s.diagnostics.map((d) => <li key={d}>{d}</li>)}</ul>
                    </DetailRow>
                  )}
                  {s.conduite && <DetailRow label="Conduite à tenir">{s.conduite}</DetailRow>}
                  {s.traitements.length > 0 && (
                    <DetailRow label="Traitement">
                      <ul className="space-y-1.5">
                        {s.traitements.map((t, i) => (
                          <li key={i}>
                            <span className="font-semibold">{t.medicament}</span>
                            {(t.posologie || t.duree) && <span className="text-slate-500"> · {[t.posologie, t.duree].filter(Boolean).join(' · ')}</span>}
                          </li>
                        ))}
                      </ul>
                    </DetailRow>
                  )}
                  {s.examens.length > 0 && (
                    <DetailRow label="Examens">
                      <div className="flex flex-wrap gap-1.5">{s.examens.map((x) => <Badge key={x} tone="neutral" size="md">{x}</Badge>)}</div>
                    </DetailRow>
                  )}
                  {s.documents.length > 0 && (
                    <DetailRow label="Documents">
                      <div className="flex flex-wrap gap-1.5">{s.documents.map((x) => <Badge key={x} tone="neutral" size="md">{x}</Badge>)}</div>
                    </DetailRow>
                  )}
                </Card>
              ) : (
                !s.constantes.length && !followUp && <p className="text-sm italic text-slate-500">Aucune information saisie pour cette consultation.</p>
              )}

              {/* Suivi: the one actionable item (a future date), set apart from the historical fields */}
              {followUp && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] ring-1 ring-blue-200">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-wide text-blue-700">Suivi</span>
                      {timing && <Badge tone={timing.tone}>{timing.label}</Badge>}
                    </div>
                    {followUp.date && (
                      <p className="mt-1 text-[15px] font-bold text-slate-900">
                        {new Date(`${followUp.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {followUp.notes && <p className="mt-1 whitespace-pre-wrap break-words text-[13.5px] text-slate-700">{followUp.notes}</p>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xs font-semibold text-slate-900">Détails</h3>
              <pre className="whitespace-pre-wrap rounded-xl border border-[#e2e8f0] bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-600">
                {event.details}
              </pre>
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 p-5 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
          <Button variant="primary" onClick={() => { try { window.print() } catch(e){} }}>Imprimer</Button>
        </div>
      </motion.div>
    </div>
  )
}

// --- Simple Modal ---
function SimpleModal({ title, description, icon, onClose, onSave, children, saveText = "Enregistrer", footer = null }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-xl bg-white rounded-[21px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-700">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex items-center justify-between gap-2 p-5 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex-1">{footer}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={onSave}>{saveText}</Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// --- Success Modal ---
function SuccessModal({ message, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-sm bg-white rounded-[21px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden p-5 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">Succès !</h2>
        <p className="text-xs text-slate-600 mb-5">{message}</p>
        <Button variant="primary" className="w-full" onClick={onClose}>Continuer</Button>
      </motion.div>
    </div>
  )
}

// --- Status Badge ---
function StatusBadge({ status }) {
  let bgClass = 'bg-slate-100'
  let textClass = 'text-slate-600'
  let label = 'Non commencé'
  if (status === 'in_progress') { bgClass = 'bg-blue-50'; textClass = 'text-blue-700'; label = 'En cours' }
  else if (status === 'completed') { bgClass = 'bg-emerald-50'; textClass = 'text-emerald-700'; label = 'Terminé' }
  const className = 'flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium ' + bgClass + ' ' + textClass
  return (
    <span className={className}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {label}
    </span>
  )
}

// --- Chip ---
function Chip({ children, color = 'blue' }) {
  let colorClass = 'bg-blue-50 text-blue-700 border-blue-200'
  if (color === 'emerald') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  else if (color === 'amber') colorClass = 'bg-amber-50 text-amber-700 border-amber-200'
  else if (color === 'red') colorClass = 'bg-red-50 text-red-700 border-red-200'
  const className = 'px-2 py-0.5 rounded-full text-[10px] font-medium border ' + colorClass
  return <span className={className}>{children}</span>
}

// --- Alert Item ---
function AlertItem({ label, severity }) {
  let colorClass = 'bg-red-50 border-red-200 text-red-700'
  let iconColor = 'text-red-600'
  if (severity === 'warning') { colorClass = 'bg-amber-50 border-amber-200 text-amber-700'; iconColor = 'text-amber-600' }
  const className = 'flex items-center gap-2 p-2 rounded-lg border ' + colorClass
  return (
    <div className={className}>
      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  )
}

// --- Document Card ---
function DocumentCard({ doc }) {
  const iconMap = { prescription: FileCheck2, lab: TestTube2, imaging: ImageIcon }
  const iconStyleMap = {
    prescription: 'bg-blue-50 border-blue-100 text-blue-600',
    lab: 'bg-violet-50 border-violet-100 text-violet-600',
    imaging: 'bg-orange-50 border-orange-100 text-orange-600',
  }
  const Icon = iconMap[doc.type] || FileText
  const iconStyle = iconStyleMap[doc.type] || 'bg-slate-50 border-slate-200 text-slate-500'
  return (
    <div role="button" tabIndex={0} aria-label={`Ouvrir le document : ${doc.name}`} className="group h-[208px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${iconStyle}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex gap-1.5">
          <button type="button" aria-label={`Télécharger ${doc.name}`} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <h4 className="text-[14px] font-semibold text-slate-900 mb-1 leading-tight line-clamp-2 min-h-[2.5rem]">{doc.name}</h4>
      <p className="text-[12px] text-slate-500 font-medium">{doc.date} • {doc.doctor}</p>
      <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 opacity-80 transition-opacity group-hover:opacity-100">
        Ouvrir <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  )
}


// --- Empty State Component ---
function EmptyState({ title, description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  )
}

function DossierRecordList({ title, subtitle, icon: Icon, items, loading, emptyTitle, emptyDescription, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p></div></div>
    {loading ? <EmptyState icon={Activity} title="Chargement…" description="Récupération des éléments du dossier." /> : items.length === 0 ? <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} /> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{items.map((item) => <button key={item.id} type="button" className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"><div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-slate-900">{item.nom_fichier || item.name || item.type_document || title}</p><p className="mt-1 text-[12px] text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Document du dossier'}</p></div><ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-600" /></div></button>)}</div>}
  </div>
}



// --- Main Component ---
export default function PatientWorkspace() {
  const navigate = useNavigate()
  const { id: patientIdParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const startConsultation = searchParams.get('startConsultation') === 'true'
  const visitId = searchParams.get('visitId')
  const { profile, updateVisitStatus, notify } = useAppContext()
  
  const { activeCardId, isActive, enterFocusMode, exitFocusMode } = useFocusMode()

  // --- State ---
  const actionParam = searchParams.get('action')
  const [activeTab, setActiveTab] = useState('Historique')
  const reduceMotion = useReducedMotion()
  const [consultationStatus, setConsultationStatus] = useState(startConsultation ? 'in_progress' : 'not_started')
  const allowLeaveRef = useRef(false)
  const [showPatientSidebar, setShowPatientSidebar] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showModal, setShowModal] = useState(searchParams.get('action') || null)
  const acteScope = usageScope(profile?.clinic_id || profile?.cabinet_id, profile?.id)
  const acteSuggestionsQ = useActeSuggestions(showModal === 'addActe', acteScope)
  const [showSuccess, setShowSuccess] = useState(null)
  const [showConsultationModal, setShowConsultationModal] = useState(startConsultation)

  // --- Form States ---
  const [prescriptionForm, setPrescriptionForm] = useState({ medications: '', notes: '' })
  const [labForm, setLabForm] = useState({ type: '', notes: '' })
  const [reportForm, setReportForm] = useState({ title: '', content: '' })
  const [documentForm, setDocumentForm] = useState({ name: '', type: '' })
  const [acteForm, setActeForm] = useState({ name: '', description: '', montant: '' })
  // --- Session actes (local, sprint actuel — persistance Supabase à faire séparément) ---
  // Structure: { id: string, name: string, description: string, montant: number }
  // ⚠️ Branchement futur : au handleConfirmEndConsultation, passer sessionActes au service
  //    d'encaissement (ex: comme billing_amount = sessionActesTotal ou lignes JSON)
  const [sessionActes, setSessionActes] = useState([])

  // --- Consultation Notes State ---
  const [note, setNote] = useState(() => normalizeNote({}))
  const [reviewRequested, setReviewRequested] = useState(false)
  const queryClient = useQueryClient()
  // Existing billing rule: acts total, otherwise the default consultation fee.
  const actesTotal = sessionActes.reduce((sum, a) => sum + a.montant, 0)
  const billingAmount = actesTotal > 0 ? actesTotal : 300

  // --- Query Patient Data ---
  const { data: patient, isLoading: loadingPatient, isError: patientLoadFailed, error: patientLoadError, refetch: retryPatientLoad } = useQuery({
    queryKey: ['patient', patientIdParam],
    queryFn: async () => {
      try {
        const data = await getPatientById(patientIdParam)
        if (!data) return null
        // antecedents/allergies/groupe_sanguin are doctor/admin-only and
        // come from a separate RPC — getPatientById no longer carries them
        // (see mm_get_patient_clinical / migration 20260912070000).
        const clinical = await getPatientClinicalFields(patientIdParam)
        return clinical ? { ...data, ...clinical } : data
      } catch (err) {
        console.error('Supabase fetch failed:', err)
        throw err
      }
    },
    enabled: !!patientIdParam,
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 mins cache
  })

  // --- Timer Effect ---
  useEffect(() => {
    let interval
    if (consultationStatus === 'in_progress') {
      interval = setInterval(() => { setTimerSeconds(prev => prev + 1) }, 1000)
    }
    return () => clearInterval(interval)
  }, [consultationStatus])

  // --- Consultations du patient (pour suggestions historiques) ---
  const patientConsultations = useMemo(() => {
    return [].map(ev => ({
      id: ev.id,
      type: ev.type,
      date: ev.date,
      reason: ev.title,
      notes: ev.details || ev.summary,
      diagnosis: ev.title,
      plan: ev.tags?.join(', ') || '',
      symptoms: ev.summary,
      clinicalExam: ev.details,
      assessment: ev.details
    }))
  }, [])

  // --- Handlers ---
  const handleStartConsultation = useCallback(() => {
    allowLeaveRef.current = false
    setConsultationStatus('in_progress')
    setReviewRequested(false)
    setShowConsultationModal(true)
  }, [])

  const handleEndConsultation = useCallback(() => {
    setReviewRequested(true)
    setShowConsultationModal(true)
  }, [])

  const handleConfirmEndConsultation = useCallback((result) => {
    const handoff = result?.handoff || 'none'
    // The consultation is finalized (saved server-side): leaving is intended. Set
    // before navigating because the blocker below still sees 'in_progress' until
    // the next render.
    allowLeaveRef.current = true
    setTimerSeconds(0)
    // The consultation is finished: nothing of it may linger. Clear the in-memory
    // note (so it can never seed another draft) and the cached open draft (so the
    // "Consultation en cours / Reprendre" banner cannot flash from a stale cache).
    setNote(normalizeNote({}))
    queryClient.setQueryData(['encounter-draft', patientIdParam], null)
    queryClient.invalidateQueries({ queryKey: ['encounters', patientIdParam] })
    queryClient.invalidateQueries({ queryKey: ['patient-factures'] })
    queryClient.invalidateQueries({ queryKey: ['encounter-draft', patientIdParam] })
    queryClient.invalidateQueries({ queryKey: ['consult-ctx-vitals', patientIdParam] })
    if (handoff === 'none') {
      setConsultationStatus('not_started')
      notify({ title: 'Consultation enregistrée', description: 'Ajoutée à l\'historique du patient.', tone: 'success' })
      return
    }
    setConsultationStatus('completed')
    if (visitId) {
      updateVisitStatus(visitId, handoff === 'billing' ? VISIT_STATUSES.BILLING : VISIT_STATUSES.COMPLETED, {
        amount: handoff === 'billing' ? billingAmount : 0,
        remaining_balance: handoff === 'billing' ? billingAmount : 0,
        sessionActes,
      })
    }
    notify({
      title: 'Consultation terminée',
      description: handoff === 'billing' ? 'Le patient a été envoyé à la caisse.' : 'Aucun paiement requis.',
      tone: 'success',
    })
    // replace: the "?startConsultation=true" entry must not stay in history, or Back would
    // silently start a new consultation on this patient.
    navigate('/dashboard', { replace: true })
  }, [visitId, updateVisitStatus, notify, navigate, sessionActes, queryClient, patientIdParam, billingAmount])

  const handleSavePrescription = useCallback(() => {
    setShowModal(null)
    setShowSuccess('Ordonnance créée avec succès !')
    setPrescriptionForm({ medications: '', notes: '' })
  }, [])

  const handleSaveLab = useCallback(() => {
    setShowModal(null)
    setShowSuccess('Demande d\'analyses envoyée !')
    setLabForm({ type: '', notes: '' })
  }, [])

  const handleSaveReport = useCallback(() => {
    setShowModal(null)
    setShowSuccess('Compte-rendu enregistré !')
    setReportForm({ title: '', content: '' })
  }, [])

  const handleSaveDocument = useCallback(() => {
    setShowModal(null)
    setShowSuccess('Document ajouté !')
    setDocumentForm({ name: '', type: '' })
  }, [])

  const handleSaveActe = useCallback(() => {
    const montantNum = parseFloat(acteForm.montant) || 0
    if (acteForm.name.trim()) {
      recordActeUse(acteScope, { name: acteForm.name, montant: montantNum })
      queryClient.invalidateQueries({ queryKey: ['acte-suggestions'] })
      setSessionActes(prev => [
        ...prev,
        { id: `acte_${Date.now()}`, name: acteForm.name.trim(), description: acteForm.description.trim(), montant: montantNum }
      ])
    }
    setShowModal(null)
    setShowSuccess('Acte ajouté avec succès !')
    setActeForm({ name: '', description: '', montant: '' })
  }, [acteForm, acteScope, queryClient])

  const encountersQ = useQuery({
    queryKey: ['encounters', patientIdParam],
    queryFn: () => listCompletedEncounters(patientIdParam),
    enabled: Boolean(patientIdParam),
  })
  const openDraftQ = useQuery({
    queryKey: ['encounter-draft', patientIdParam],
    queryFn: () => getOpenDraft(patientIdParam),
    enabled: Boolean(patientIdParam) && !showConsultationModal,
    refetchOnMount: 'always',
  })
  const timelineEvents = useMemo(() => (encountersQ.data || []).map(encounterToEvent), [encountersQ.data])
  const documentsQ = useQuery({
    queryKey: ['patient-documents', patientIdParam],
    queryFn: () => getDocuments(patientIdParam),
    enabled: Boolean(patientIdParam),
  })
  const ordonnancesQ = useQuery({
    queryKey: ['patient-ordonnances', profile?.cabinet_id, patientIdParam],
    queryFn: () => getOrdonnances(profile.cabinet_id, patientIdParam),
    enabled: Boolean(profile?.cabinet_id && patientIdParam),
  })
  // Real dossier data. Ordonnances / examens come from this patient's completed consultations;
  // factures from the billing data (payments) for this patient in this clinic.
  const clinicId = profile?.clinic_id || profile?.cabinet_id
  const derivedOrdonnances = useMemo(() => ordonnancesFromEncounters(encountersQ.data || []), [encountersQ.data])
  const derivedExamens = useMemo(() => examensFromEncounters(encountersQ.data || []), [encountersQ.data])
  const facturesQ = useQuery({
    queryKey: ['patient-factures', clinicId, patientIdParam],
    queryFn: () => fetchFactures(clinicId, patientIdParam),
    enabled: Boolean(clinicId && patientIdParam),
  })
  const documents = documentsQ.data || []
  const documentsByKind = useMemo(() => ({
    examens: documents.filter((doc) => /exam|analyse|laboratoire|bilan/i.test(doc.type_document || doc.nom_fichier || '')),
    imagerie: documents.filter((doc) => /imagerie|radio|irm|scanner|echo/i.test(doc.type_document || doc.nom_fichier || '')),
    factures: documents.filter((doc) => /facture|recu|paiement/i.test(doc.type_document || doc.nom_fichier || '')),
  }), [documents])

  const draft = useEncounterDraft({
    patientId: patientIdParam,
    visitId,
    active: showConsultationModal,
    note,
    onHydrate: setNote,
  })

  // --- Derived Values ---
  const age = patient ? calcAge(patient.date_naissance) : null
  const initials = patient ? `${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}`.toUpperCase() : ''
  const chronicDisease = patient?.antecedents || '—'
  const currentTreatment = '—'
  const emergencyContact = patient?.contact_urgence || '—'
  // "En consultation" (timer, + Acte, ring) only while a real consultation is live: the sheet is
  // open or an open draft exists. A leftover 'in_progress' flag alone (e.g. from the URL) is not enough.
  const isConsultationActive = isConsultationLive({ status: consultationStatus, sheetOpen: showConsultationModal, hasOpenDraft: Boolean(openDraftQ.data), fetchingDraft: openDraftQ.isFetching })

  // --- Blocage navigation interne (React Router useBlocker) ---
  // Bloque dès qu'une consultation est active, indépendamment de isDirty, sauf
  // quand la consultation vient d'être terminée (allowLeaveRef, voir plus haut).
  // Only leaving this page is guarded (a search-param change on the same page is not).
  const blocker = useBlocker(({ currentLocation, nextLocation }) => consultationStatus === 'in_progress' && !allowLeaveRef.current && currentLocation.pathname !== nextLocation.pathname)

  // "?startConsultation=true" only means "open the sheet on arrival". Drop it once consumed so
  // reloading, or coming back with the browser's Back button, cannot silently start another one.
  useEffect(() => {
    if (startConsultation) setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('startConsultation'); return n }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Enregistrer et quitter" : écrit le brouillon en cours (même chemin que l'autosave).
  const handleManualSave = useCallback(() => draft.flush(), [draft.flush])

  // --- Blocage fermeture onglet / rafraîchissement ---
  useEffect(() => {
    const handler = (e) => {
      if (consultationStatus === 'in_progress') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [consultationStatus])

  // --- Loading State ---
  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Chargement du dossier...</p>
        </div>
      </div>
    )
  }

  if (patientLoadFailed || !patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-bold text-red-900">Erreur de chargement du dossier</h1>
          <p className="mt-2 text-sm text-red-800">{patientLoadError?.message || 'Patient introuvable.'}</p>
          <button onClick={() => retryPatientLoad()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Réessayer</button>
          <button onClick={() => navigate('/dashboard')} className="mt-3 block w-full text-sm font-semibold text-red-800">Retour au tableau de bord</button>
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Espace Patient" className="min-h-screen bg-[#f8fafc] flex flex-col pb-5">
      {/* Backdrop for Focus Mode */}
      <Backdrop isVisible={isActive} onClick={exitFocusMode} />
      {/* --- Breadcrumb Style Top Bar --- */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="sticky top-0 z-50 bg-[#f8fafc]/95 backdrop-blur-sm px-6 pt-4 pb-3 border-b border-slate-200"
      >
        <div className="w-full flex justify-between items-center relative gap-5">
          <div className="flex items-center min-w-0 flex-1">
            {/* Retour Patients */}
            <button
              onClick={() => navigate('/dashboard')}
              aria-label="Retour à la liste des patients"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
              <span className="text-[13.5px] font-medium text-slate-500 group-hover:text-slate-700">Patients</span>
            </button>
          </div>

          {/* Center: Statut de consultation / Timer */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10 hidden md:flex">
            {isConsultationActive && (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-2.5 select-none bg-white/60 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-sm pointer-events-auto"
              >
                {/* Indicateur actif */}
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                </span>

                <span className="font-bold text-[14px] text-slate-700 tracking-tight">
                  En consultation
                </span>

                <span className="font-mono text-[15px] font-extrabold tabular-nums tracking-tighter text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  {formatTimer(timerSeconds)}
                </span>
              </motion.div>
            )}
          </div>

          {/* Bloc actions côté droit */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isConsultationActive ? (
              <>

                {/* Badge total actes — lecture seule, masqué si 0 */}
                {sessionActes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="h-10 px-3.5 rounded-[0.625rem] flex items-center gap-2 select-none"
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                    title={`${sessionActes.length} acte${sessionActes.length > 1 ? 's' : ''} : ${sessionActes.map(a => a.name).join(', ')}`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-[13px] text-slate-700 tabular-nums">
                      {sessionActes.reduce((sum, a) => sum + a.montant, 0).toLocaleString('fr-FR')} MAD
                    </span>
                  </motion.div>
                )}

                {/* Terminer : ouvre la revue de fin de consultation (récapitulatif + confirmation) */}
                <Button variant="primary" size="sm" className="h-10" onClick={handleEndConsultation}>
                  <Save className="w-4 h-4" />
                  Terminer la consultation
                </Button>
              </>
            ) : (
              <>
                <Button variant="accent" size="sm" className="h-10" onClick={handleStartConsultation}>
                  <Plus className="w-4 h-4" />
                  Nouvelle consultation
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* --- Patient Identification Bar --- */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="w-full px-6 pt-4"
      >
        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="relative flex-shrink-0">
            <Avatar
              seed={patient.id || patientIdParam}
              initials={initials}
              size="lg"
              className={isConsultationActive ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
            />
            {isConsultationActive && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[17px] font-bold text-slate-900 tracking-tight truncate">
                {patient.prenom} {patient.nom}
              </h1>
              <span className="text-[13px] text-slate-400 font-medium">
                {age !== null ? `${age} ans` : null}
              </span>
              <span className="text-[12px] text-slate-400">•</span>
              <span className="text-[13px] text-slate-500 font-medium">
                {getGenderLabel(patient.sexe)}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1 text-[12.5px] text-slate-500">
              {patient.telephone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {patient.telephone}
                </span>
              )}
              {patient.cin && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium">{patient.cin}</span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                Depuis {formatPatientSince(patient.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:gap-2">
            {patient.groupe_sanguin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-[12.5px] font-bold">
              <Droplets className="w-3.5 h-3.5 text-rose-500" />
              {patient.groupe_sanguin}
            </span>
            )}

            {(patient.allergies && patient.allergies.trim() && patient.allergies.toLowerCase() !== 'aucune') ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-[12.5px] font-semibold" title={patient.allergies}>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="truncate max-w-[140px]">{patient.allergies}</span>
            </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 text-[12.5px] font-medium opacity-75">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Aucune allergie
            </span>
            )}

            {chronicDisease && chronicDisease !== '—' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[12.5px] font-semibold" title={chronicDisease}>
              <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate max-w-[160px]">{chronicDisease}</span>
            </span>
            ) : null}

            {(patient.mutuelle || patient.assurance) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 text-[12.5px] font-semibold" title={patient.mutuelle || patient.assurance}>
              <Shield className="w-3.5 h-3.5 text-sky-500" />
              <span className="truncate max-w-[120px]">{patient.mutuelle || patient.assurance}</span>
            </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* --- Main Content Layout --- */}
      <main className="flex-1 w-full px-6 py-5 w-full">
        <div className="w-full">
          {/* --- Main Content --- */}
          <div className="space-y-5 w-full">
            {/* Tabs Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <nav role="tablist" className="flex w-full gap-1 rounded-2xl bg-gray-100 p-1 shadow-inner overflow-x-auto scrollbar-hide">
                {[
                  { label: 'Historique', icon: Activity },
                  { label: 'Ordonnances', icon: Pill, count: derivedOrdonnances.length + (ordonnancesQ.data?.length || 0) },
                  { label: 'Examens', icon: TestTube2, count: derivedExamens.reduce((n, e) => n + e.items.length, 0) + documentsByKind.examens.length },
                  { label: 'Imagerie', icon: ImageIcon, count: documentsByKind.imagerie.length },
                  { label: 'Factures', icon: FileCheck2, count: (facturesQ.data?.length || 0) + documentsByKind.factures.length },
                  { label: 'FSE CNSS', icon: FileText }, // [FSE TAB]
                ].map(({ label: tab, icon: Icon, count }) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-xl transition-colors duration-200 ${
                      activeTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {activeTab === tab && (
                      // One shared pill that glides between tabs (same motion as the Facturation tabs)
                      <motion.span
                        layoutId="dossier-tab-pill"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                        className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                      <Icon className="h-3.5 w-3.5" />
                      {tab}
                      {count ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/80 text-slate-500'}`}>{count}</span> : null}
                    </span>
                  </button>
                ))}
              </nav>
            </motion.div>

            {/* --- Tab Content --- */}
            {/* Same transition as the Facturation tabs: the outgoing tab fades out, the next fades in
                while rising 8px (~0.2 s). Off with prefers-reduced-motion. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
              >
                {/* --- History Content --- */}
                {activeTab === 'Historique' && (
                  <div className="space-y-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-[16px] font-bold text-slate-900">
                            Parcours de soins
                          </h2>
                          <p className="text-[13px] text-slate-500 mt-0.5">
                            Chronologie des consultations, actes et ordonnances
                          </p>
                        </div>
                      </div>
                    {openDraftQ.data && !showConsultationModal && (
                      <div className="flex items-center justify-between gap-3 rounded-[0.625rem] border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-[13.5px] text-amber-900"><span className="font-bold">Consultation en cours</span> · brouillon enregistré à {new Date(openDraftQ.data.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <button onClick={handleStartConsultation} className="h-9 rounded-lg bg-black px-4 text-[13px] font-bold text-white hover:bg-slate-800">Reprendre</button>
                      </div>
                    )}
                    {/* Timeline */}
                    {timelineEvents.length > 0 ? (
                      <div className="relative w-full pt-1 before:absolute before:left-[9px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
                        {timelineEvents.map((event, index) => (
                          <TimelineEvent
                            key={event.id}
                            event={event}
                            index={index}
                            onViewDetails={setSelectedEvent}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={CalendarClock}
                        title={encountersQ.isLoading ? 'Chargement…' : encountersQ.isError ? 'Historique indisponible' : 'Aucune consultation enregistrée'}
                        description={encountersQ.isError ? 'Réessayez dans un instant.' : 'Les consultations terminées apparaîtront ici.'}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'Ordonnances' && (
                  <OrdonnancesList
                    items={derivedOrdonnances}
                    loading={encountersQ.isLoading}
                    extra={(ordonnancesQ.data || []).length > 0 ? <DossierRecordList title="Ordonnances importées" subtitle="Documents du dossier" icon={Pill} items={ordonnancesQ.data} loading={false} emptyTitle="" emptyDescription="" tone="violet" /> : null}
                  />
                )}

                {activeTab === 'Examens' && (
                  <ExamensList
                    items={derivedExamens}
                    loading={encountersQ.isLoading}
                    extra={documentsByKind.examens.length > 0 ? <DossierRecordList title="Résultats importés" subtitle="Documents du dossier" icon={TestTube2} items={documentsByKind.examens} loading={false} emptyTitle="" emptyDescription="" tone="emerald" /> : null}
                  />
                )}

                {activeTab === 'Imagerie' && (
                  <ImagerieList
                    extra={documentsByKind.imagerie.length > 0 ? <DossierRecordList title="Documents d’imagerie" subtitle="Documents du dossier" icon={ImageIcon} items={documentsByKind.imagerie} loading={false} emptyTitle="" emptyDescription="" tone="sky" /> : null}
                  />
                )}

                {activeTab === 'Factures' && (
                  <FacturesList
                    items={facturesQ.data || []}
                    loading={facturesQ.isLoading}
                    error={facturesQ.isError}
                    onOpenFacturation={() => navigate('/facturation')}
                    extra={documentsByKind.factures.length > 0 ? <DossierRecordList title="Documents de paiement" subtitle="Documents du dossier" icon={FileCheck2} items={documentsByKind.factures} loading={false} emptyTitle="" emptyDescription="" tone="blue" /> : null}
                  />
                )}

                {/* [FSE TAB] — Remove this block + the import + the tab entry above to fully revert */}
                {activeTab === 'FSE CNSS' && (
                  <FsePatientTab patient={patient} profile={profile} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* --- Modals --- */}

      <ConsultationSheet
        open={showConsultationModal}
        onClose={() => { setShowConsultationModal(false); setReviewRequested(false); openDraftQ.refetch() }}
        patient={patient}
        age={age}
        patientId={patientIdParam}
        note={note}
        setNote={setNote}
        draft={draft}
        acts={sessionActes}
        billingAmount={billingAmount}
        visitLinked={Boolean(visitId)}
        startInReview={reviewRequested}
        onAddActe={() => setShowModal('addActe')}
        onOpenContext={() => setShowPatientSidebar(true)}
        onCompleted={(result) => { setShowConsultationModal(false); setReviewRequested(false); handleConfirmEndConsultation(result) }}
        onDiscarded={() => { setNote(normalizeNote({})); setConsultationStatus('not_started'); setShowConsultationModal(false); setReviewRequested(false); openDraftQ.refetch() }}
        patientConsultations={patientConsultations}
      />

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
        {showModal === 'prescription' && (
          <SimpleModal
            title="Nouvelle Ordonnance"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<Pill size={18} />}
            onClose={() => setShowModal(null)}
            onSave={handleSavePrescription}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Médicaments
                </label>
                <textarea
                  value={prescriptionForm.medications}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  rows={4}
                  placeholder="Ex: Metformine 500mg 2x/jour"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  rows={2}
                  placeholder="Instructions supplémentaires..."
                />
              </div>
            </div>
          </SimpleModal>
        )}
        {showModal === 'lab' && (
          <SimpleModal
            title="Demande d'Analyses"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<Microscope size={18} />}
            onClose={() => setShowModal(null)}
            onSave={handleSaveLab}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Type d'analyses
                </label>
                <select
                  value={labForm.type}
                  onChange={(e) => setLabForm({ ...labForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                >
                  <option value="">Sélectionner...</option>
                  <option value="blood">Sanguin</option>
                  <option value="urine">Urinaire</option>
                  <option value="imaging">Imagerie</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={labForm.notes}
                  onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  rows={4}
                  placeholder="Détails sur les analyses à effectuer..."
                />
              </div>
            </div>
          </SimpleModal>
        )}
        {showModal === 'report' && (
          <SimpleModal
            title="Nouveau Compte-Rendu"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<FileText size={18} />}
            onClose={() => setShowModal(null)}
            onSave={handleSaveReport}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Titre
                </label>
                <input
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  placeholder="Ex: Consultation du 19/06/2026"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contenu
                </label>
                <textarea
                  value={reportForm.content}
                  onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  rows={6}
                  placeholder="Rédigez votre compte-rendu ici..."
                />
              </div>
            </div>
          </SimpleModal>
        )}
        {showModal === 'document' && (
          <SimpleModal
            title="Ajouter un Document"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<FilePlus size={18} />}
            onClose={() => setShowModal(null)}
            onSave={handleSaveDocument}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom du document
                </label>
                <input
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                  placeholder="Ex: Résultats d'analyses"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Type de document
                </label>
                <select
                  value={documentForm.type}
                  onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] bg-slate-50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs"
                >
                  <option value="">Sélectionner...</option>
                  <option value="lab">Analyses</option>
                  <option value="report">Compte-rendu</option>
                  <option value="prescription">Ordonnance</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-6 text-center bg-slate-50">
                <FileText className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  Glissez-déposez un fichier ou cliquez pour parcourir
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  PDF, PNG, JPG (max 10MB)
                </p>
              </div>
            </div>
          </SimpleModal>
        )}
        {blocker.state === 'blocked' && (
          <SimpleModal
            title="Quitter la consultation ?"
            description="Des données non enregistrées sont présentes"
            icon={<AlertTriangle size={18} />}
            onClose={() => blocker.reset()}
            onSave={async () => {
              try {
                await handleManualSave()
              } catch {
                notify({ title: 'Enregistrement impossible', description: 'Le brouillon n\'a pas pu être enregistré. Vérifiez la connexion puis réessayez.', tone: 'error' })
                return
              }
              blocker.proceed()
            }}
            saveText="Enregistrer et quitter"
            footer={
              <Button variant="link" className="!text-[13px] text-red-600" onClick={() => blocker.proceed()}>
                Quitter sans enregistrer
              </Button>
            }
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              La session de consultation reste active en arrière-plan, mais les informations saisies dans ce formulaire <span className="font-medium text-slate-800">(motif, examen, constantes)</span> ne sont pas encore enregistrées.
              <br /><br />
              Enregistrez avant de quitter pour ne rien perdre.
            </p>
          </SimpleModal>
        )}
        {showModal === 'addActe' && (
          <AddItemModal
            type="acte"
            subtitle={`Pour ${patient.prenom} ${patient.nom}`}
            values={acteForm}
            onChange={setActeForm}
            onSave={handleSaveActe}
            onClose={() => setShowModal(null)}
            suggestions={acteSuggestionsQ.data || []}
          />
        )}
        {showSuccess && (
          <SuccessModal message={showSuccess} onClose={() => setShowSuccess(null)} />
        )}
      </AnimatePresence>

      {/* Modal Dossier Patient */}
      {showPatientSidebar && (
        <SimpleModal
          title="Informations Patient"
          onClose={() => setShowPatientSidebar(false)}
          saveText="Fermer"
          onSave={() => setShowPatientSidebar(false)}
        >
          <div className="pt-2">
            <PatientSidebar
              patient={patient}
              age={age}
              chronicDisease={chronicDisease}
              currentTreatment={currentTreatment}
              emergencyContact={emergencyContact}
            />
          </div>
        </SimpleModal>
      )}
    </section>
  )
}
