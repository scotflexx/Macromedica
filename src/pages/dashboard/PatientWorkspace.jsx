import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  Pill,
  Stethoscope,
  Clock,
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
  Play,
  Square,
  Plus,
  Sparkles,
  Brain,
  ListChecks,
  ClipboardList,
  BookOpen,
  Edit3,
  Save,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPatientById } from '../../lib/api'
import { MOCK_PATIENTS } from '../../lib/mockData'

// Mock data
const MOCK_PATIENT = {
  id: 'pat_1',
  prenom: 'Karima',
  nom: 'Benali',
  date_naissance: '1992-03-15',
  sexe: 'F',
  assurance: 'CNSS',
  telephone: '06 12 34 56 78',
  groupe_sanguin: 'A+',
  poids: 68,
  taille: 165,
  contact_urgence: 'Ahmed Benali - 06 98 76 54 32',
}

const MOCK_ALERTS = [
  { id: 1, type: 'allergy', label: 'Allergie pénicilline', severity: 'critical' },
  { id: 2, type: 'chronic', label: 'Diabète type 2', severity: 'warning' },
]

const MOCK_MEDICATIONS = [
  { id: 1, name: 'Metformine 850mg', dosage: '1 cp matin & soir', compliance: 'good' },
  { id: 2, name: 'Ramipril 5mg', dosage: '1 cp le soir', compliance: 'good' },
]

const MOCK_RESULTS = [
  { id: 1, type: 'Glycémie', value: '1.2 g/L', date: '14 juin 2026', status: 'normal' },
  { id: 2, type: 'Tension', value: '120/80 mmHg', date: '14 juin 2026', status: 'normal' },
]

const TIMELINE_EVENTS = [
  {
    id: 1,
    type: 'consultation',
    date: '19 juin 2026',
    time: '14:30',
    title: 'Urgence Douleurs Abdominales',
    doctor: 'Dr. Benali',
    summary: 'Patient admis pour douleurs abdominales aiguës.',
  },
  {
    id: 2,
    type: 'lab',
    date: '14 juin 2026',
    time: '09:00',
    title: 'Analyses Sanguines',
    doctor: 'Dr. Touggani',
    summary: 'Biologie standard, formule sanguine complète.',
  },
  {
    id: 3,
    type: 'prescription',
    date: '10 juin 2026',
    time: '11:00',
    title: 'Prescription Médicamenteuse',
    doctor: 'Dr. Benali',
    summary: 'Metformine 500mg — 2x/jour.',
  },
]

const DOCUMENTS = [
  { id: 1, type: 'prescription', name: 'Ordonnance du 15/06/2026', date: '15 juin 2026', doctor: 'Dr. Benali' },
  { id: 2, type: 'lab', name: 'Bilan NFS – 22/05/2026', date: '22 mai 2026', doctor: 'Dr. Touggani' },
  { id: 3, type: 'imaging', name: 'Écho abdominale', date: '20 mai 2026', doctor: 'Dr. Benali' },
]

// Helper functions
function calcAge(dateStr) {
  if (!dateStr) return 34
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : 34
}

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, mins, secs].map(v => String(v).padStart(2, '0')).join(':')
}

// Components matching Dashboard style
function StatCard({ icon: Icon, iconWrap, iconColor, label, value, suffix = '' }) {
  return (
    <div className="flex items-center justify-between rounded-[21px] border border-[#e2e8f0] bg-white px-5 py-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)] transition hover:-translate-y-[1px]">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${iconWrap}`}>
          <Icon className={iconColor} size={25} strokeWidth={2.1} />
        </div>
        <p className="text-sm font-medium text-slate-600">
          {label}
        </p>
      </div>
      <div className="flex items-end gap-1.5">
        <p className="text-4xl font-bold text-slate-900 leading-none">
          {value}
        </p>
        {suffix && (
          <p className="pb-1 text-base font-semibold text-slate-600">
            {suffix}
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  let bgClass = 'bg-slate-100'
  let textClass = 'text-slate-600'
  let label = 'Non commencé'
  
  if (status === 'in_progress') {
    bgClass = 'bg-blue-50'
    textClass = 'text-blue-700'
    label = 'En cours'
  } else if (status === 'completed') {
    bgClass = 'bg-emerald-50'
    textClass = 'text-emerald-700'
    label = 'Terminé'
  }
  
  const className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ' + bgClass + ' ' + textClass
  
  return (
    <span className={className}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {label}
    </span>
  )
}

function Chip({ children, color = 'blue' }) {
  let colorClass = 'bg-blue-50 text-blue-700 border-blue-200'
  
  if (color === 'emerald') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (color === 'amber') {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200'
  } else if (color === 'red') {
    colorClass = 'bg-red-50 text-red-700 border-red-200'
  }
  
  const className = 'px-2.5 py-1 rounded-full text-xs font-medium border ' + colorClass
  
  return (
    <span className={className}>
      {children}
    </span>
  )
}

function AlertItem({ label, severity }) {
  let colorClass = 'bg-red-50 border-red-200 text-red-700'
  
  if (severity === 'warning') {
    colorClass = 'bg-amber-50 border-amber-200 text-amber-700'
  }
  
  const className = 'flex items-center gap-3 p-3 rounded-xl border ' + colorClass
  
  return (
    <div className={className}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function TimelineEvent({ event, index }) {
  let bgClass = 'bg-blue-50'
  let textClass = 'text-blue-600'
  let Icon = Stethoscope
  
  if (event.type === 'consultation') {
    bgClass = 'bg-blue-50'
    textClass = 'text-blue-600'
    Icon = Stethoscope
  } else if (event.type === 'lab') {
    bgClass = 'bg-emerald-50'
    textClass = 'text-emerald-600'
    Icon = Microscope
  } else if (event.type === 'prescription') {
    bgClass = 'bg-amber-50'
    textClass = 'text-amber-600'
    Icon = Pill
  } else if (event.type === 'urgency') {
    bgClass = 'bg-red-50'
    textClass = 'text-red-600'
    Icon = AlertTriangle
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-8 pb-8 last:pb-0"
    >
      <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 z-10" />
      {index !== TIMELINE_EVENTS.length - 1 && (
        <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-slate-200" />
      )}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl ' + bgClass + ' flex items-center justify-center'}>
              <Icon className={'w-5 h-5 ' + textClass} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">{event.title}</h4>
              <p className="text-sm text-slate-500">{event.date} · {event.doctor}</p>
            </div>
          </div>
          <Chip>{event.type}</Chip>
        </div>
        <p className="text-sm text-slate-600">{event.summary}</p>
      </div>
    </motion.div>
  )
}

function DocumentCard({ doc }) {
  const iconMap = {
    prescription: FileCheck2,
    lab: TestTube2,
    imaging: ImageIcon,
  }
  const Icon = iconMap[doc.type] || FileText

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
          <Icon className="w-6 h-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
      <h4 className="font-semibold text-slate-800 mb-1">{doc.name}</h4>
      <p className="text-sm text-slate-500">{doc.date} · {doc.doctor}</p>
    </div>
  )
}

function QuickNoteField({ title, placeholder, value, onChange, icon: Icon }) {
  return (
    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
      />
    </div>
  )
}

// Main Component
export default function PatientWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [consultationStatus, setConsultationStatus] = useState('not_started')
  const [consultationStartTime, setConsultationStartTime] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [showAutosave, setShowAutosave] = useState(false)
  
  // New state for futuristic layout
  const [consultationNotes, setConsultationNotes] = useState({
    anamnese: '',
    examen: '',
    diagnostic: '',
    traitement: '',
    prescription: '',
  })
  
  const [vitals, setVitals] = useState({
    poids: MOCK_PATIENT.poids,
    taille: MOCK_PATIENT.taille,
    tension: '120/80',
    temperature: '36.8',
    frequency: '78',
  })

  // Timer effect
  useEffect(() => {
    let interval
    if (consultationStatus === 'in_progress' && consultationStartTime) {
      interval = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - new Date(consultationStartTime).getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [consultationStatus, consultationStartTime])

  // Autosave effect
  useEffect(() => {
    if (consultationStatus === 'in_progress') {
      const timeout = setTimeout(() => {
        setShowAutosave(true)
        setTimeout(() => setShowAutosave(false), 2000)
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [consultationNotes, consultationStatus])

  const handleStartConsultation = () => {
    setConsultationStatus('in_progress')
    setConsultationStartTime(new Date().toISOString())
  }

  const handleEndConsultation = () => {
    setConsultationStatus('completed')
    setConsultationStartTime(null)
    setTimerSeconds(0)
  }

  const patient = MOCK_PATIENT
  const age = calcAge(patient.date_naissance)
  const bmi = vitals.poids / Math.pow(vitals.taille / 100, 2)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc] px-6 py-4">
        <div className="max-w-[1800px] mx-auto">
          <div className="bg-white border border-[#e2e8f0] rounded-[21px] px-6 py-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
            <div className="flex items-center justify-between">
              {/* Left: Back + Patient Info */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#2563eb] to-[#14b8a6] flex items-center justify-center text-white font-bold text-lg">
                    {patient.prenom[0]}{patient.nom[0]}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {patient.prenom} {patient.nom}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-medium text-slate-600">
                        {age} ans • {patient.sexe === 'F' ? 'Femme' : 'Homme'} • {patient.assurance}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm text-slate-500">Patient ID: {patient.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Status + Timer + CTA */}
              <div className="flex items-center gap-4">
                <StatusBadge status={consultationStatus} />
                {consultationStatus === 'in_progress' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                )}
                {consultationStatus === 'not_started' ? (
                  <button
                    onClick={handleStartConsultation}
                    className="flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-white rounded-[12px] font-semibold hover:bg-blue-700 transition-all shadow-[0_6px_16px_rgba(37,99,235,0.25)]"
                  >
                    <Play className="w-4 h-4" />
                    Commencer la consultation
                  </button>
                ) : consultationStatus === 'in_progress' ? (
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-[12px] font-semibold hover:bg-amber-600 transition-all shadow-[0_6px_16px_rgba(245,158,11,0.25)]">
                      <Plus className="w-4 h-4" />
                      + Acte
                    </button>
                    <button
                      onClick={handleEndConsultation}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-[12px] font-semibold hover:bg-emerald-700 transition-all shadow-[0_6px_16px_rgba(5,150,105,0.25)]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Terminer
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Chips */}
            <div className="flex items-center gap-2 mt-5">
              <Chip color="blue">CNSS</Chip>
              <Chip color="amber">Diabétique</Chip>
              <Chip color="red">Allergie PCN</Chip>
            </div>
          </div>
        </div>
      </header>

      {/* Autosave indicator */}
      <AnimatePresence>
        {showAutosave && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-28 right-6 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Brouillon enregistré
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 pb-10">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Patient Snapshot Sidebar (Sticky) */}
          <div className="col-span-12 lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-[140px] space-y-6">
              {/* Patient Snapshot */}
              <div className="bg-white rounded-[21px] border border-[#e2e8f0] shadow-[0_5px_16px_rgba(15,23,42,0.045)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e2e8f0]">
                  <h3 className="text-sm font-semibold text-slate-800">Patient Snapshot</h3>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Age</p>
                      <p className="text-base font-semibold text-slate-800">{age} ans</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Groupe sanguin</p>
                      <p className="text-base font-semibold text-slate-800">{patient.groupe_sanguin}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Poids</p>
                      <p className="text-base font-semibold text-slate-800">{vitals.poids} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Taille</p>
                      <p className="text-base font-semibold text-slate-800">{vitals.taille} cm</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1">IMC</p>
                      <p className="text-base font-semibold text-slate-800">{bmi.toFixed(1)} kg/m²</p>
                    </div>
                  </div>

                  {/* Medical Alerts */}
                  <div className="pt-5 border-t border-[#e2e8f0]">
                    <p className="text-xs font-semibold text-slate-500 mb-3">Alertes</p>
                    <div className="space-y-2">
                      {MOCK_ALERTS.map(alert => (
                        <div key={alert.id} className="flex items-center gap-2 p-3 rounded-xl border bg-amber-50 border-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">{alert.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Treatment */}
                  <div className="pt-5 border-t border-[#e2e8f0]">
                    <p className="text-xs font-semibold text-slate-500 mb-3">Traitement actuel</p>
                    <div className="space-y-2">
                      {MOCK_MEDICATIONS.map(med => (
                        <div key={med.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <Pill className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                            <p className="text-xs text-slate-500">{med.dosage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Results */}
              <div className="bg-white rounded-[21px] border border-[#e2e8f0] shadow-[0_5px_16px_rgba(15,23,42,0.045)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e2e8f0]">
                  <h3 className="text-sm font-semibold text-slate-800">Résultats récents</h3>
                </div>
                <div className="p-6 space-y-3">
                  {MOCK_RESULTS.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{result.type}</p>
                        <p className="text-xs text-slate-500">{result.date}</p>
                      </div>
                      <span className="text-base font-semibold text-emerald-700">{result.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Consultation Workspace */}
          <div className="col-span-12 lg:col-span-9 order-1 lg:order-2">
            <AnimatePresence mode="wait">
              {consultationStatus === 'not_started' ? (
                <motion.div
                  key="not-started"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-[21px] border border-[#e2e8f0] p-16 text-center shadow-[0_5px_16px_rgba(15,23,42,0.045)]"
                >
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <Stethoscope className="w-12 h-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Consultation non commencée
                  </h3>
                  <p className="text-base text-slate-500 mb-8 max-w-md mx-auto">
                    Cliquez sur "Commencer la consultation" pour accéder à l'espace de travail clinique
                  </p>
                  <button
                    onClick={handleStartConsultation}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#2563eb] text-white rounded-[14px] font-semibold hover:bg-blue-700 transition-all shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
                  >
                    <Play className="w-5 h-5" />
                    Commencer la consultation
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="in-progress"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Vitals Section */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Poids</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{vitals.poids} <span className="text-sm text-slate-500">kg</span></p>
                    </div>
                    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Ruler className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Taille</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{vitals.taille} <span className="text-sm text-slate-500">cm</span></p>
                    </div>
                    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Tension</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{vitals.tension} <span className="text-sm text-slate-500">mmHg</span></p>
                    </div>
                    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Thermometer className="w-5 h-5 text-amber-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Température</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{vitals.temperature} <span className="text-sm text-slate-500">°C</span></p>
                    </div>
                    <div className="rounded-[21px] border border-[#e2e8f0] bg-white p-5 shadow-[0_5px_16px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-red-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Fréquence</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{vitals.frequency} <span className="text-sm text-slate-500">bpm</span></p>
                    </div>
                  </div>

                  {/* Notes Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <QuickNoteField
                      title="Anamnèse"
                      placeholder="Motif de consultation, historique..."
                      icon={BookOpen}
                      value={consultationNotes.anamnese}
                      onChange={(val) => setConsultationNotes(prev => ({...prev, anamnese: val}))}
                    />
                    <QuickNoteField
                      title="Examen clinique"
                      placeholder="Signes cliniques, observations..."
                      icon={Stethoscope}
                      value={consultationNotes.examen}
                      onChange={(val) => setConsultationNotes(prev => ({...prev, examen: val}))}
                    />
                    <QuickNoteField
                      title="Diagnostic"
                      placeholder="Diagnostic principal, différentiels..."
                      icon={Brain}
                      value={consultationNotes.diagnostic}
                      onChange={(val) => setConsultationNotes(prev => ({...prev, diagnostic: val}))}
                    />
                    <QuickNoteField
                      title="Traitement"
                      placeholder="Plan thérapeutique, recommandations..."
                      icon={Pill}
                      value={consultationNotes.traitement}
                      onChange={(val) => setConsultationNotes(prev => ({...prev, traitement: val}))}
                    />
                  </div>

                  {/* Prescription Note */}
                  <QuickNoteField
                    title="Prescription"
                    placeholder="Ordonnance..."
                    icon={FileCheck2}
                    value={consultationNotes.prescription}
                    onChange={(val) => setConsultationNotes(prev => ({...prev, prescription: val}))}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-2">
                    <button
                      onClick={handleEndConsultation}
                      className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-[14px] font-semibold hover:bg-emerald-700 transition-all shadow-[0_8px_24px_rgba(5,150,105,0.35)]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Terminer la consultation
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-800 rounded-[14px] font-semibold hover:bg-slate-200 transition-all">
                      <Save className="w-5 h-5" />
                      Sauvegarder
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
