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

// Components
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

function InfoCard({ title, children, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
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

function SOAPSection({ letter, title, children, isExpanded, onToggle }) {
  let bgClass = 'bg-blue-100'
  let textClass = 'text-blue-600'
  
  if (letter === 'S') {
    bgClass = 'bg-blue-100'
    textClass = 'text-blue-600'
  } else if (letter === 'O') {
    bgClass = 'bg-emerald-100'
    textClass = 'text-emerald-600'
  } else if (letter === 'A') {
    bgClass = 'bg-purple-100'
    textClass = 'text-purple-600'
  } else if (letter === 'P') {
    bgClass = 'bg-amber-100'
    textClass = 'text-amber-600'
  }

  const chevronClass = isExpanded ? 'rotate-90' : ''
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={'w-10 h-10 rounded-xl ' + bgClass + ' flex items-center justify-center'}>
            <span className={textClass + ' font-bold'}>{letter}</span>
          </div>
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        <ChevronRight className={'w-5 h-5 text-slate-400 transition-transform ' + chevronClass} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-slate-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

// Main Component
export default function PatientWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [consultationStatus, setConsultationStatus] = useState('not_started')
  const [consultationStartTime, setConsultationStartTime] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [soapSections, setSoapSections] = useState({
    S: false,
    O: false,
    A: false,
    P: false,
  })
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })
  const [showAutosave, setShowAutosave] = useState(false)

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
  }, [soapData, consultationStatus])

  const handleStartConsultation = () => {
    setConsultationStatus('in_progress')
    setConsultationStartTime(new Date().toISOString())
    setSoapSections({ S: true, O: false, A: false, P: false })
  }

  const handleEndConsultation = () => {
    setConsultationStatus('completed')
    setConsultationStartTime(null)
    setTimerSeconds(0)
  }

  const toggleSoapSection = (section) => {
    setSoapSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const patient = MOCK_PATIENT
  const age = calcAge(patient.date_naissance)
  const bmi = patient.poids / Math.pow(patient.taille / 100, 2)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              {/* Left: Back + Patient Info */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/patients')}
                  className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {patient.prenom} {patient.nom}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-600">
                      {age} ans • {patient.sexe === 'F' ? 'Femme' : 'Homme'} • {patient.assurance}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-500">Patient ID: {patient.id}</span>
                  </div>
                </div>
              </div>

              {/* Right: Status + CTA */}
              <div className="flex items-center gap-4">
                <StatusBadge status={consultationStatus} />
                {consultationStatus === 'in_progress' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium text-blue-700">
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                )}
                {consultationStatus === 'not_started' ? (
                  <button
                    onClick={handleStartConsultation}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                  >
                    Commencer la consultation
                  </button>
                ) : (
                  <button
                    onClick={handleEndConsultation}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                  >
                    Terminer
                  </button>
                )}
              </div>
            </div>

            {/* Chips */}
            <div className="flex items-center gap-2 mt-4">
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
            className="fixed top-24 right-6 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Brouillon enregistré
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Main Content */}
          <div className="col-span-12 lg:col-span-8">
            {/* Tabs */}
            <div className="bg-slate-100 rounded-xl p-1 inline-flex mb-6">
              {['overview', 'timeline', 'documents'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Patient Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoCard title="Patient Summary" icon={User}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Age</p>
                          <p className="text-sm font-semibold text-slate-800">{age} ans</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Sexe</p>
                          <p className="text-sm font-semibold text-slate-800">{patient.sexe === 'F' ? 'Femme' : 'Homme'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Assurance</p>
                          <p className="text-sm font-semibold text-slate-800">{patient.assurance}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                          <p className="text-sm font-semibold text-slate-800">{patient.telephone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Groupe sanguin</p>
                          <p className="text-sm font-semibold text-slate-800">{patient.groupe_sanguin}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Contact urgence</p>
                          <p className="text-sm font-semibold text-slate-800 truncate">{patient.contact_urgence}</p>
                        </div>
                      </div>
                    </InfoCard>

                    <InfoCard title="Medical Alerts" icon={AlertTriangle}>
                      <div className="space-y-2">
                        {MOCK_ALERTS.map(alert => (
                          <AlertItem key={alert.id} label={alert.label} severity={alert.severity} />
                        ))}
                      </div>
                    </InfoCard>

                    <InfoCard title="Current Treatment" icon={Pill}>
                      <div className="space-y-3">
                        {MOCK_MEDICATIONS.map(med => (
                          <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                              <p className="text-xs text-slate-500">{med.dosage}</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 />
                          </div>
                        ))}
                      </div>
                    </InfoCard>

                    <InfoCard title="Recent Results" icon={Heart}>
                      <div className="space-y-3">
                        {MOCK_RESULTS.map(result => (
                          <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{result.type}</p>
                              <p className="text-xs text-slate-500">{result.date}</p>
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{result.value}</span>
                          </div>
                        ))}
                      </div>
                    </InfoCard>
                  </div>

                  {/* Consultation Section */}
                  {consultationStatus === 'not_started' ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        No consultation has been started
                      </h3>
                      <p className="text-sm text-slate-500 mb-6">
                        Start a consultation to document the patient visit
                      </p>
                      <button
                        onClick={handleStartConsultation}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Commencer la consultation
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800">Consultation en cours</h2>
                      </div>
                      
                      <SOAPSection
                        letter="S"
                        title="Subjective"
                        isExpanded={soapSections.S}
                        onToggle={() => toggleSoapSection('S')}
                      >
                        <textarea
                          value={soapData.subjective}
                          onChange={(e) => setSoapData(prev => ({ ...prev, subjective: e.target.value }))}
                          placeholder="Patient's chief complaint, history of present illness..."
                          className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </SOAPSection>

                      <SOAPSection
                        letter="O"
                        title="Objective"
                        isExpanded={soapSections.O}
                        onToggle={() => toggleSoapSection('O')}
                      >
                        <textarea
                          value={soapData.objective}
                          onChange={(e) => setSoapData(prev => ({ ...prev, objective: e.target.value }))}
                          placeholder="Physical examination findings, vital signs, lab results..."
                          className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </SOAPSection>

                      <SOAPSection
                        letter="A"
                        title="Assessment"
                        isExpanded={soapSections.A}
                        onToggle={() => toggleSoapSection('A')}
                      >
                        <textarea
                          value={soapData.assessment}
                          onChange={(e) => setSoapData(prev => ({ ...prev, assessment: e.target.value }))}
                          placeholder="Diagnosis, differential diagnosis..."
                          className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </SOAPSection>

                      <SOAPSection
                        letter="P"
                        title="Plan"
                        isExpanded={soapSections.P}
                        onToggle={() => toggleSoapSection('P')}
                      >
                        <textarea
                          value={soapData.plan}
                          onChange={(e) => setSoapData(prev => ({ ...prev, plan: e.target.value }))}
                          placeholder="Treatment plan, follow-up, prescriptions..."
                          className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </SOAPSection>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6">Patient Timeline</h2>
                    <div className="space-y-0">
                      {TIMELINE_EVENTS.map((event, index) => (
                        <TimelineEvent key={event.id} event={event} index={index} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'documents' && (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                        Add Document
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {DOCUMENTS.map(doc => (
                        <DocumentCard key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Sticky Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Patient Snapshot */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">Patient Snapshot</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Age</p>
                      <p className="text-sm font-semibold text-slate-800">{age} ans</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Assurance</p>
                      <p className="text-sm font-semibold text-slate-800">{patient.assurance}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Poids</p>
                      <p className="text-sm font-semibold text-slate-800">{patient.poids} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Taille</p>
                      <p className="text-sm font-semibold text-slate-800">{patient.taille} cm</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1">IMC</p>
                      <p className="text-sm font-semibold text-slate-800">{bmi.toFixed(1)} kg/m²</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Alertes</p>
                    <div className="space-y-2">
                      {MOCK_ALERTS.map(alert => (
                        <div key={alert.id} className="flex items-center gap-2 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="text-slate-700">{alert.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Traitement actuel</p>
                    <div className="space-y-2">
                      {MOCK_MEDICATIONS.map(med => (
                        <div key={med.id} className="text-sm text-slate-700">
                          {med.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer Card (during consultation) */}
              {consultationStatus === 'in_progress' && (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-800">Consultation Timer</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{formatTimer(timerSeconds)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
