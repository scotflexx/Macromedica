import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Microscope,
  Pill,
  AlertTriangle,
  MoreHorizontal,
  Printer,
  Share2,
  Stethoscope,
  Info,
  X,
  FilePlus,
  CheckCircle2,
  User,
  Heart,
  Activity,
  Clock,
  Save,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPatientById, getConsultationsByPatient, getRdv } from '../../lib/api'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { MOCK_PATIENTS } from '../../lib/mockData'

// Mock Timeline Data (4 nodes as requested)
const TIMELINE_EVENTS = [
  {
    id: '1',
    type: 'urgency',
    date: '19 juin 2026',
    time: '14:30',
    title: 'Urgence Douleurs Abdominales',
    doctor: 'Dr. Benali',
    summary: 'Patient admis pour douleurs abdominales aiguës. Analyses sanguines effectuées. Prise en charge immédiate.',
    details: `
- Symptômes: Douleurs abdominales diffuses, nausées
- Examen physique: Tendresse au niveau de l'épigastre
- Analyses: Leucocytes 12G/L, CRP 45 mg/L
- Traitement: Antalgiques, repos
- Suivi: Rendez-vous dans 7 jours
    `,
    tags: ['Analyses', 'Douleur']
  },
  {
    id: '2',
    type: 'lab',
    date: '14 juin 2026',
    time: '09:00',
    title: 'Analyses Sanguines',
    doctor: 'Dr. Touggani',
    summary: 'Biologie standard, formule sanguine complète, glycémie à jeun.',
    details: `
- Hémoglobine: 14,2 g/dL
- Glycémie à jeun: 1,2 g/L
- Cholestérol total: 1,9 g/L
- Triglycérides: 1,1 g/L
- Conclusion: Bilan dans les normes, surveiller glycémie
    `,
    tags: ['Bilan']
  },
  {
    id: '3',
    type: 'consultation',
    date: '10 juin 2026',
    time: '10:30',
    title: 'Consultation Annuelle',
    doctor: 'Dr. Benali',
    summary: 'Bilan de santé annuel. Tension 120/80. Poids stable. À revoir dans 6 mois.',
    details: `
- Poids: 78 kg
- Taille: 1,75 m
- IMC: 25,5
- Tension artérielle: 120/80 mmHg
- Fréquence cardiaque: 72 bpm
- Recommandations: Continuer régime équilibré, activité physique régulière
    `,
    tags: ['Suivi', 'Bilan']
  },
  {
    id: '4',
    type: 'prescription',
    date: '10 juin 2026',
    time: '11:00',
    title: 'Prescription Médicamenteuse',
    doctor: 'Dr. Benali',
    summary: 'Metformine 500mg — 2x/jour. Oméprazole 20mg — 1x/jour le matin.',
    details: `
- Metformine 500mg: 1 comprimé matin et soir au repas
- Oméprazole 20mg: 1 comprimé le matin avant le petit-déjeuner
- Durée: 3 mois renouvelable
- Rendez-vous de contrôle: dans 3 mois
    `,
    tags: []
  }
]

// Helpers
function calcAge(dateStr) {
  if (!dateStr) return 34 // Default realistic age if no date
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  // Ensure age is positive
  return age > 0 ? age : 34
}

// Timeline Event Component
function TimelineEvent({ event, index, onViewDetails }) {
  const getEventConfig = () => {
    switch (event.type) {
      case 'urgency':
        return {
          color: '#EF4444',
          label: 'Urgence',
          icon: <AlertTriangle size={16} />
        }
      case 'lab':
        return {
          color: '#3B82F6',
          label: 'Laboratoire',
          icon: <Microscope size={16} />
        }
      case 'consultation':
        return {
          color: '#10B981',
          label: 'Consultation',
          icon: <Stethoscope size={16} />
        }
      case 'prescription':
        return {
          color: '#F59E0B',
          label: 'Ordonnance',
          icon: <Pill size={16} />
        }
      default:
        return {
          color: '#6B7280',
          label: 'Autre',
          icon: <FileText size={16} />
        }
    }
  }

  const config = getEventConfig()

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.32, 0.72, 0, 1]
      }}
      className="relative pl-16 pb-10 last:pb-0"
      aria-label={`${config.label} du ${event.date}: ${event.title}`}
    >
      {/* Vertical Line (starts after first dot, ends before last) */}
      {index !== TIMELINE_EVENTS.length - 1 && (
        <div
          className="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-200"
        />
      )}

      {/* Dot */}
      <motion.div
        whileHover={{ scale: 1.15 }}
        className="absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-[3px] bg-white shadow-lg"
        style={{
          borderColor: config.color,
          boxShadow: `0 0 0 8px ${config.color}10`
        }}
      >
        <div style={{ color: config.color }}>
          {config.icon}
        </div>
      </motion.div>

      {/* Content Card */}
      <motion.div
        whileHover={{ x: 4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.1em]">
              {event.date} · {event.doctor}
            </p>
            <h3 className="text-base font-semibold text-slate-900 mt-1">
              {event.title}
            </h3>
          </div>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: `${config.color}10`,
              color: config.color
            }}
          >
            {config.label}
          </span>
        </div>

        <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-2">
          {event.summary}
        </p>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => onViewDetails(event)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Voir détails →
          </button>

          {event.tags.length > 0 && (
            <div className="flex gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.article>
  )
}

// Quick Action Button Component
function QuickAction({ icon, title, description, isPrimary, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-200 hover:shadow-[0_5px_16px_rgba(15,23,42,0.045)] group"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-all ${isPrimary ? 'bg-blue-100' : 'bg-slate-100'}`}>
        <div className={`text-slate-500 group-hover:text-blue-600 transition-all ${isPrimary ? 'text-blue-600' : ''}`}>
          {icon}
        </div>
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  )
}

// Event Details Modal Component
function EventDetailsModal({ event, onClose }) {
  const getEventConfig = () => {
    switch (event.type) {
      case 'urgency':
        return {
          color: '#EF4444',
          label: 'Urgence',
          icon: <AlertTriangle size={20} />
        }
      case 'lab':
        return {
          color: '#3B82F6',
          label: 'Laboratoire',
          icon: <Microscope size={20} />
        }
      case 'consultation':
        return {
          color: '#10B981',
          label: 'Consultation',
          icon: <Stethoscope size={20} />
        }
      case 'prescription':
        return {
          color: '#F59E0B',
          label: 'Ordonnance',
          icon: <Pill size={20} />
        }
      default:
        return {
          color: '#6B7280',
          label: 'Autre',
          icon: <FileText size={20} />
        }
    }
  }

  const config = getEventConfig()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-white rounded-[21px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <div style={{ color: config.color }}>
                {config.icon}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {event.title}
              </h2>
              <p className="text-sm text-slate-500">
                {event.date} à {event.time} · {event.doctor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${config.color}10`,
                color: config.color
              }}
            >
              {config.label}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Détails
          </h3>
          <pre className="whitespace-pre-wrap text-sm text-slate-600 bg-slate-50 p-4 rounded-xl font-sans leading-relaxed border border-[#e2e8f0]">
            {event.details}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 bg-white border border-[#e2e8f0] rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm text-white bg-[#2563eb] border border-[#2563eb] rounded-xl font-medium hover:bg-blue-700 hover:border-blue-700 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
          >
            Imprimer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Simple Modal Component for Quick Actions
function SimpleModal({ title, description, icon, color, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-xl bg-white rounded-[21px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}10` }}
            >
              <div style={{ color }}>
                {icon}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-slate-500">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {children}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 bg-white border border-[#e2e8f0] rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm text-white bg-[#2563eb] border border-[#2563eb] rounded-xl font-medium hover:bg-blue-700 hover:border-blue-700 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
          >
            Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Success Modal Component
function SuccessModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-sm bg-white rounded-[21px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Succès !</h2>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm text-white bg-[#2563eb] border border-[#2563eb] rounded-xl font-medium hover:bg-blue-700 hover:border-blue-700 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
        >
          Continuer
        </button>
      </motion.div>
    </div>
  )
}

export default function PatientProfileView({ patientId, onBack }) {
  const navigate = useNavigate()
  const { profile } = useAppContext()
  const [activeTab, setActiveTab] = useState('Historique')
  const [activeFilter, setActiveFilter] = useState('Tout')
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showModal, setShowModal] = useState(null)
  const [showSuccess, setShowSuccess] = useState(null)

  // Form states for quick actions
  const [prescriptionForm, setPrescriptionForm] = useState({ medications: '', notes: '' })
  const [labForm, setLabForm] = useState({ type: '', notes: '' })
  const [reportForm, setReportForm] = useState({ title: '', content: '' })
  const [documentForm, setDocumentForm] = useState({ name: '', type: '' })
  const [idCopied, setIdCopied] = useState(false)

  // Queries
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (patientId && (patientId.startsWith('pat_') || !patientId.includes('-'))) {
        const mockP = MOCK_PATIENTS.find(p => p.id === patientId)
        if (mockP) return mockP
      }
      try {
        const data = await getPatientById(patientId)
        if (!data) throw new Error('Patient not found in DB')
        return data
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to mock:', err)
        const mockP = MOCK_PATIENTS[0] // Default mock patient
        return mockP
      }
    },
    enabled: !!patientId,
    retry: 1,
  })

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', 'patient', patientId],
    queryFn: async () => {
      if (patientId && (patientId.startsWith('pat_') || !patientId.includes('-'))) {
        return []
      }
      try {
        return await getConsultationsByPatient(patientId)
      } catch (err) {
        console.warn('Failed to fetch consultations, returning empty:', err)
        return []
      }
    },
    enabled: !!patientId,
  })

  const { data: allRdvs = [] } = useQuery({
    queryKey: ['rdv', profile?.cabinet_id],
    queryFn: getRdv,
    enabled: !!profile?.cabinet_id,
  })

  // Filter timeline events
  const filteredTimeline = useMemo(() => {
    if (activeFilter === 'Tout') return TIMELINE_EVENTS
    const filterMap = {
      'Consultations': 'consultation',
      'Analyses': 'lab',
      'Urgences': 'urgency'
    }
    return TIMELINE_EVENTS.filter(event => event.type === filterMap[activeFilter])
  }, [activeFilter])

  // Handle saving quick actions
  const handleSavePrescription = () => {
    setShowModal(null)
    setShowSuccess('Ordonnance créée avec succès !')
    setPrescriptionForm({ medications: '', notes: '' })
  }

  const handleSaveLab = () => {
    setShowModal(null)
    setShowSuccess('Demande d\'analyses envoyée !')
    setLabForm({ type: '', notes: '' })
  }

  const handleSaveReport = () => {
    setShowModal(null)
    setShowSuccess('Compte-rendu enregistré !')
    setReportForm({ title: '', content: '' })
  }

  const handleSaveDocument = () => {
    setShowModal(null)
    setShowSuccess('Document ajouté !')
    setDocumentForm({ name: '', type: '' })
  }

  if (loadingPatient || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Chargement du dossier...</p>
        </div>
      </div>
    )
  }

  const age = calcAge(patient.date_naissance)
  const lastVisit = TIMELINE_EVENTS[0]?.date
  const nextRdv = 'À planifier'

  return (
    <section aria-label="Dossier patient" className="min-h-screen bg-[#f8fafc] flex flex-col pb-6">
      {/* --- Header --- */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-[#f8fafc] px-6 pt-4 pb-3"
      >
        <div className="max-w-[1800px] mx-auto flex items-center justify-between bg-white border border-[#e2e8f0] px-6 py-5 rounded-[21px] shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              aria-label="Retour à la liste des patients"
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] flex items-center justify-center text-white font-bold text-lg">
                {patient.prenom?.[0] || 'P'}{patient.nom?.[0] || ''}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {patient.prenom} {patient.nom}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-medium text-slate-600">
                    {age} ans • {patient.sexe === 'homme' ? 'Masculin' : patient.sexe === 'femme' ? 'Féminin' : 'Non renseigné'} • {patient.mutuelle || 'Non renseigné'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">Patient ID: {patient.id?.split('-')[0] || patient.id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100" role="status">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              En cours
            </span>
            <button
              aria-label="Terminer la consultation"
              className="h-10 px-5 bg-white text-slate-700 border border-[#e2e8f0] rounded-[12px] font-medium hover:bg-slate-50 hover:border-slate-400 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
              onClick={() => navigate('/dashboard')}
            >
              Terminer
            </button>
          </div>
        </div>
      </motion.header>

      {/* --- Main Layout --- */}
      <main className="flex-1 max-w-[1800px] mx-auto px-6 py-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Column: Résumé, Actions, Alertes */}
          <div className="space-y-6">
            {/* Patient Snapshot */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-[21px] p-6 shadow-[0_5px_16px_rgba(15,23,42,0.045)] border border-[#e2e8f0]"
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em] mb-4">
                PATIENT SNAPSHOT
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Dernière visite
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{lastVisit}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Dr. Benali</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Prochain RDV
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{nextRdv}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Alertes
                  </p>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-amber-50 border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-900">Allergie PCN</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-amber-50 border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-900">Diabète type 2</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="w-full mt-6 py-2 text-xs text-blue-600 font-semibold hover:text-blue-700 transition-all flex items-center justify-center gap-1"
                onClick={() => setActiveTab('Informations')}
              >
                Modifier informations →
              </button>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white rounded-[21px] p-6 shadow-[0_5px_16px_rgba(15,23,42,0.045)] border border-[#e2e8f0]"
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em] mb-4">
                ACTIONS RAPIDES
              </p>
              <div className="space-y-2">
                <QuickAction
                  icon={<Pill size={18} />}
                  title="Ordonnance"
                  description="Créer une prescription"
                  isPrimary={true}
                  onClick={() => setShowModal('prescription')}
                />
                <QuickAction
                  icon={<Microscope size={18} />}
                  title="Analyses"
                  description="Demander un bilan"
                  onClick={() => setShowModal('lab')}
                />
                <QuickAction
                  icon={<FileText size={18} />}
                  title="Compte-rendu"
                  description="Éditer un CR"
                  onClick={() => setShowModal('report')}
                />
                <QuickAction
                  icon={<FilePlus size={18} />}
                  title="Document"
                  description="Ajouter un fichier"
                  onClick={() => setShowModal('document')}
                />
                <QuickAction
                  icon={<Calendar size={18} />}
                  title="Planifier suivi"
                  description="Nouveau rendez-vous"
                  onClick={() => navigate('/agenda')}
                />
              </div>
            </motion.div>

            {/* Recent Results */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white rounded-[21px] p-6 shadow-[0_5px_16px_rgba(15,23,42,0.045)] border border-[#e2e8f0]"
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em] mb-4">
                RÉSULTATS RÉCENTS
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Glycémie</p>
                    <p className="text-[10px] text-slate-500">14 juin 2026</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">1,2 g/L</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Tension</p>
                    <p className="text-[10px] text-slate-500">14 juin 2026</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">120/80</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Main Content */}
          <div className="space-y-6 md:col-span-2 lg:col-span-1">
            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <nav role="tablist" className="bg-slate-100 rounded-xl p-1 inline-flex">
                {['Informations', 'Historique', 'Documents'].map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-[10px] transition-all ${
                      activeTab === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'Historique' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Parcours de soins
                        </h2>
                      </div>
                      <div className="relative flex items-center gap-2">
                        {['Tout', 'Consultations', 'Analyses', 'Urgences'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                              activeFilter === filter
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-600 border border-[#e2e8f0] hover:bg-slate-50'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                        <div className="relative ml-auto">
                          <button
                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                            className="w-9 h-9 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {showMoreOptions && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="absolute right-0 top-full mt-2 w-40 bg-white rounded-[16px] shadow-[0_5px_16px_rgba(15,23,42,0.045)] border border-[#e2e8f0] z-50"
                              >
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-t-[16px]">
                                  <Printer className="w-4 h-4" />
                                  Imprimer
                                </button>
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-[#e2e8f0] rounded-b-[16px]">
                                  <Share2 className="w-4 h-4" />
                                  Partager
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative pt-2">
                      {filteredTimeline.map((event, index) => (
                        <TimelineEvent
                          key={event.id}
                          event={event}
                          index={index}
                          onViewDetails={setSelectedEvent}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Informations' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[21px] border border-[#e2e8f0] p-6 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Détails du Patient
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            Nom Complet
                          </p>
                          <p className="text-sm text-slate-800 font-medium">
                            {patient.nom} {patient.prenom}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            Téléphone
                          </p>
                          <p className="text-sm text-slate-800 font-medium">
                            {patient.telephone || 'Non renseigné'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            Mutuelle
                          </p>
                          <p className="text-sm text-blue-700 font-medium">
                            {patient.mutuelle || 'Non renseigné'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            CIN
                          </p>
                          <p className="text-sm text-slate-800 font-medium">
                            {patient.cin || 'Non renseigné'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            Âge
                          </p>
                          <p className="text-sm text-slate-800 font-medium">{age} ans</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1.5">
                            Sexe
                          </p>
                          <p className="text-sm text-slate-800 font-medium">
                            {patient.sexe === 'homme'
                              ? 'Masculin'
                              : patient.sexe === 'femme'
                              ? 'Féminin'
                              : 'Non renseigné'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Documents' && (
                  <div className="text-center py-16 bg-white rounded-[21px] border border-[#e2e8f0] shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                    <div className="text-slate-400 text-sm">
                      Contenu des documents
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Event Details Modal */}
        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}

        {/* Prescription Modal */}
        {showModal === 'prescription' && (
          <SimpleModal
            title="Nouvelle Ordonnance"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<Pill size={20} />}
            color="#F59E0B"
            onClose={() => setShowModal(null)}
            onSave={handleSavePrescription}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Médicaments
                </label>
                <textarea
                  value={prescriptionForm.medications}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  rows={4}
                  placeholder="Ex: Metformine 500mg 2x/jour"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  rows={2}
                  placeholder="Instructions supplémentaires..."
                />
              </div>
            </div>
          </SimpleModal>
        )}

        {/* Lab Modal */}
        {showModal === 'lab' && (
          <SimpleModal
            title="Demande d'Analyses"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<Microscope size={20} />}
            color="#3B82F6"
            onClose={() => setShowModal(null)}
            onSave={handleSaveLab}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type d'analyses
                </label>
                <select
                  value={labForm.type}
                  onChange={(e) => setLabForm({ ...labForm, type: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Sélectionner...</option>
                  <option value="blood">Sanguin</option>
                  <option value="urine">Urinaire</option>
                  <option value="imaging">Imagerie</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={labForm.notes}
                  onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  rows={4}
                  placeholder="Détails sur les analyses à effectuer..."
                />
              </div>
            </div>
          </SimpleModal>
        )}

        {/* Report Modal */}
        {showModal === 'report' && (
          <SimpleModal
            title="Nouveau Compte-Rendu"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<FileText size={20} />}
            color="#10B981"
            onClose={() => setShowModal(null)}
            onSave={handleSaveReport}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre
                </label>
                <input
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Ex: Consultation du 19/06/2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contenu
                </label>
                <textarea
                  value={reportForm.content}
                  onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  rows={6}
                  placeholder="Rédigez votre compte-rendu ici..."
                />
              </div>
            </div>
          </SimpleModal>
        )}

        {/* Document Modal */}
        {showModal === 'document' && (
          <SimpleModal
            title="Ajouter un Document"
            description={`Pour ${patient.prenom} ${patient.nom}`}
            icon={<FilePlus size={20} />}
            color="#6B7280"
            onClose={() => setShowModal(null)}
            onSave={handleSaveDocument}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du document
                </label>
                <input
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Ex: Résultats d'analyses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type de document
                </label>
                <select
                  value={documentForm.type}
                  onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e2e8f0] bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Sélectionner...</option>
                  <option value="lab">Analyses</option>
                  <option value="report">Compte-rendu</option>
                  <option value="prescription">Ordonnance</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="border-2 border-dashed border-[#e2e8f0] rounded-[16px] p-8 text-center bg-slate-50">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Glissez-déposez un fichier ou cliquez pour parcourir
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF, PNG, JPG (max 10MB)
                </p>
              </div>
            </div>
          </SimpleModal>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <SuccessModal
            message={showSuccess}
            onClose={() => setShowSuccess(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
