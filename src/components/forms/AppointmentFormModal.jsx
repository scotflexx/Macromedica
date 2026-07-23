
import React, { useState, useEffect, useMemo } from 'react'
import { Loader2, Calendar, ChevronDown, User, Phone, Lock, AlertTriangle, UserPlus, FileText } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import Modal from '../common/Modal'
import { useAppContext } from '../../context/AppContext'
import { useCabinetId } from '../../hooks/useCabinetId'
import { createPatient, createRdv, getPatients, updateRdv as apiUpdateRdv } from '../../lib/api'

// Helper Functions for Appointment Meta
const META_PREFIX = '__AGENDA_META__'

const parseAppointmentMeta = (notes) => {
  if (!notes) {
    return {
      clinicalContext: '',
    }
  }

  if (!notes.startsWith(META_PREFIX)) {
    return {
      clinicalContext: notes,
    }
  }

  try {
    return JSON.parse(notes.slice(META_PREFIX.length))
  } catch {
    return {
      clinicalContext: '',
    }
  }
}

const buildAppointmentMeta = (notes, overrides) => {
  const current = parseAppointmentMeta(notes)
  return `${META_PREFIX}${JSON.stringify({
    confirmationState: current.confirmationState || 'PLANIFIE',
    confirmedAt: current.confirmedAt || null,
    confirmedBy: current.confirmedBy || null,
    clinicalContext: current.clinicalContext || '',
    patientName: current.patientName || '',
    phone: current.phone || '',
    type: current.type || 'Consultation',
    ...overrides,
  })}`
}

// Mock Data
const patientsExistants = [
  { id: '1', nom: 'Fontaine', prenom: 'Marie-Claire', telephone: '0612345678', derniereVisite: '19 juin 2026', alertes: 1 },
  { id: '2', nom: 'Bertrand', prenom: 'Jean-Pierre', telephone: '0623456789', derniereVisite: '15 juin 2026', alertes: 0 },
  { id: '3', nom: 'Dupont', prenom: 'Marc', telephone: '0634567890', derniereVisite: '10 juin 2026', alertes: 0 },
  { id: '4', nom: 'Bernhardt', prenom: 'Sarah', telephone: '0645678901', derniereVisite: '05 juin 2026', alertes: 0 }
]

const typesRDV = [
  'Consultation',
  'Suivi',
  'Première consultation',
  'Urgence',
  'Contrôle post-opératoire',
  'Bilan annuel'
]

const mutuelles = [
  'Aucune',
  'CNSS',
  'RAMED',
  'CNOPS',
  'Assurance privée',
  'Autre'
]

// Generate time slots every 15 minutes from 08:00 to 17:45
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 8; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    }
  }
  return slots
}
const timeSlots = generateTimeSlots()

// Helper Functions
const parseName = (fullName) => {
  const trimmed = fullName.trim()
  if (!trimmed) return { prenom: '', nom: '' }
  // Remove titles like "Dr.", "M.", "Mme"
  const cleaned = trimmed.replace(/^(Dr\.?|M\.?|Mme\.?|Mr\.?|Ms\.?)\s*/i, '')
  const parts = cleaned.split(' ')
  if (parts.length === 1) {
    return { prenom: parts[0], nom: '' }
  }
  const nom = parts.pop() || ''
  const prenom = parts.join(' ')
  return { prenom, nom }
}

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '')
  let formatted = ''
  
  if (digits.startsWith('212')) {
    formatted = '+212 '
    const rest = digits.slice(3)
    for (let i = 0; i < rest.length && i < 9; i++) {
      if (i === 1 || i === 3 || i === 5 || i === 7) formatted += ' '
      formatted += rest[i]
    }
  } else {
    for (let i = 0; i < digits.length && i < 10; i++) {
      if (i > 0 && i % 2 === 0) formatted += ' '
      formatted += digits[i]
    }
  }
  return formatted
}

function AppointmentFormModal({
  open,
  onClose,
  appointment,
  onSuccess,
  initialDate,
  initialTime
}) {
  const { notify } = useAppContext()
  const { cabinetId } = useCabinetId()
  const queryClient = useQueryClient()

  // State Management
  const [modalState, setModalState] = useState('existing')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  
  // Button hover/pressed state
  const [cancelHovered, setCancelHovered] = useState(false)
  const [cancelPressed, setCancelPressed] = useState(false)
  const [submitHovered, setSubmitHovered] = useState(false)
  const [submitPressed, setSubmitPressed] = useState(false)

  // Form Data State
  const [rdvRapideForm, setRdvRapideForm] = useState({
    nomPrenom: '',
    telephone: '',
    motif: '',
    date: '',
    heure: '08:00',
    type: 'Première consultation',
    notes: ''
  })

  const [dossierCompletForm, setDossierCompletForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    dateNaissance: '',
    sexe: '',
    cin: '',
    adresse: '',
    mutuelle: 'Aucune',
    motif: '',
    date: '',
    heure: '08:00',
    type: 'Première consultation',
    notes: ''
  })

  const [existingForm, setExistingForm] = useState({
    patientId: '',
    telephone: '',
    motif: '',
    date: '',
    heure: '08:00',
    type: 'Consultation',
    notes: ''
  })

  // Initialize Data
  useEffect(() => {
    if (open) {
      const today = new Date()
      const initialDateValue = initialDate || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      setModalState('existing')
      setSearchQuery('')
      setSelectedPatient(null)
      setShowDropdown(false)
      setTouched({})
      setErrors({})
      
      if (appointment) {
        setSearchQuery(`${appointment.patients?.prenom || ''} ${appointment.patients?.nom || ''}`)
        setSelectedPatient(appointment.patients)
        const dt = new Date(appointment.date_rdv)
        const datePart = !isNaN(dt) ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : initialDateValue
        const timePart = !isNaN(dt) ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` : initialTime || '08:00'
        
        setExistingForm({
          patientId: appointment.patientId,
          telephone: appointment.patients?.telephone || '',
          motif: '',
          date: datePart,
          heure: timePart,
          type: appointment.motif || 'Consultation',
          notes: ''
        })
      } else {
        setExistingForm({
          patientId: '',
          telephone: '',
          motif: '',
          date: initialDateValue,
          heure: initialTime || '08:00',
          type: 'Consultation',
          notes: ''
        })

        setRdvRapideForm({
          nomPrenom: '',
          telephone: '',
          motif: '',
          date: initialDateValue,
          heure: initialTime || '08:00',
          type: 'Première consultation',
          notes: ''
        })

        setDossierCompletForm({
          nom: '',
          prenom: '',
          telephone: '',
          dateNaissance: '',
          sexe: '',
          cin: '',
          adresse: '',
          mutuelle: 'Aucune',
          motif: '',
          date: initialDateValue,
          heure: initialTime || '08:00',
          type: 'Première consultation',
          notes: ''
        })
      }
    }
  }, [open, appointment, initialDate, initialTime])

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return []
    return patientsExistants.filter(p => 
      `${p.prenom} ${p.nom}`.toLowerCase().includes(query) || 
      (p.telephone || '').includes(query)
    )
  }, [searchQuery])

  // Handle Patient Selection
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
    setSearchQuery(`${patient.prenom} ${patient.nom}`)
    setExistingForm(prev => ({ 
      ...prev, 
      patientId: patient.id, 
      telephone: patient.telephone,
      type: 'Consultation'
    }))
    setShowDropdown(false)
  }

  // Handle Search Input Change
  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setSelectedPatient(null)
    setShowDropdown(true)

    setTimeout(() => {
      if (value.trim() && selectedPatient === null) {
        const filtered = patientsExistants.filter(p => 
          `${p.prenom} ${p.nom}`.toLowerCase().includes(value.toLowerCase()) || 
          (p.telephone || '').includes(value)
        )
        if (filtered.length === 0) {
          setModalState('invitation')
          setShowDropdown(false)
        } else {
          setModalState('existing')
          setShowDropdown(true)
        }
      }
    }, 300)
  }

  // Handle RDV Rapide
  const handleRdvRapide = () => {
    const parsed = parseName(searchQuery)
    setRdvRapideForm(prev => ({ 
      ...prev, 
      nomPrenom: searchQuery.trim(),
      prenom: parsed.prenom,
      nom: parsed.nom
    }))
    setModalState('rdv-rapide')
  }

  // Handle Dossier Complet
  const handleDossierComplet = () => {
    const parsed = parseName(searchQuery)
    setDossierCompletForm(prev => ({
      ...prev,
      prenom: parsed.prenom,
      nom: parsed.nom
    }))
    setModalState('dossier-complet')
  }

  // Handle Return to Invitation
  const handleReturnToInvitation = () => {
    setModalState('invitation')
  }

  // Handle Return to Search
  const handleReturnToSearch = () => {
    setModalState('existing')
    setSearchQuery('')
    setSelectedPatient(null)
  }

  // Validation Functions
  const validateExisting = () => {
    const newErrors = {}
    if (!selectedPatient) newErrors.searchQuery = 'Veuillez sélectionner un patient'
    if (!existingForm.date) newErrors.date = 'Date requise'
    if (!existingForm.heure) newErrors.heure = 'Heure requise'
    if (!existingForm.motif.trim()) newErrors.motif = 'Motif requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateRdvRapide = () => {
    const newErrors = {}
    if (!rdvRapideForm.nomPrenom.trim()) newErrors.nomPrenom = 'Nom & Prénom requis'
    if (!rdvRapideForm.telephone.trim()) newErrors.telephone = 'Téléphone requis'
    if (!rdvRapideForm.date) newErrors.date = 'Date requise'
    if (!rdvRapideForm.heure) newErrors.heure = 'Heure requise'
    if (!rdvRapideForm.motif.trim()) newErrors.motif = 'Motif requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateDossierComplet = () => {
    const newErrors = {}
    if (!dossierCompletForm.nom.trim()) newErrors.nom = 'Nom requis'
    if (!dossierCompletForm.prenom.trim()) newErrors.prenom = 'Prénom requis'
    if (!dossierCompletForm.telephone.trim()) newErrors.telephone = 'Téléphone requis'
    if (!dossierCompletForm.date) newErrors.date = 'Date requise'
    if (!dossierCompletForm.heure) newErrors.heure = 'Heure requise'
    if (!dossierCompletForm.motif.trim()) newErrors.motif = 'Motif requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let successMessage = 'Rendez-vous créé avec succès'
      
      if (modalState === 'existing') {
        if (!validateExisting()) return
        
        if (appointment) {
          const currentNotes = appointment.notes
          const newNotes = buildAppointmentMeta(currentNotes, {
            type: existingForm.type,
          })
          await apiUpdateRdv(appointment.id, {
            patient_id: existingForm.patientId,
            date_rdv: new Date(`${existingForm.date}T${existingForm.heure}:00`).toISOString(),
            status: 'confirme',
            notes: newNotes,
          })
        } else {
          const newNotes = buildAppointmentMeta(null, {
            type: existingForm.type,
          })
          await createRdv({
            cabinet_id: cabinetId,
            rappel_envoye: false,
            patient_id: existingForm.patientId,
            date_rdv: new Date(`${existingForm.date}T${existingForm.heure}:00`).toISOString(),
            status: 'confirme',
            notes: newNotes,
          })
        }
      } else if (modalState === 'rdv-rapide') {
        if (!validateRdvRapide()) return

        const { prenom, nom } = parseName(rdvRapideForm.nomPrenom)
        
        const createdPatient = await createPatient({
          cabinet_id: cabinetId,
          prenom,
          nom,
          telephone: rdvRapideForm.telephone.replace(/\s/g, ''),
          status: 'prospect'
        })

        const newNotes = buildAppointmentMeta(null, {
          type: rdvRapideForm.type,
        })
        await createRdv({
          cabinet_id: cabinetId,
          rappel_envoye: false,
          patient_id: createdPatient.id,
          date_rdv: new Date(`${rdvRapideForm.date}T${rdvRapideForm.heure}:00`).toISOString(),
          status: 'confirme',
          notes: newNotes,
        })
        
        successMessage = 'Rendez-vous créé — Le patient sera enregistré à l\'arrivée'
      } else if (modalState === 'dossier-complet') {
        if (!validateDossierComplet()) return

        const createdPatient = await createPatient({
          cabinet_id: cabinetId,
          nom: dossierCompletForm.nom,
          prenom: dossierCompletForm.prenom,
          telephone: dossierCompletForm.telephone.replace(/\s/g, ''),
          date_naissance: dossierCompletForm.dateNaissance || null,
          sexe: dossierCompletForm.sexe || null,
          cin: dossierCompletForm.cin || null,
          adresse: dossierCompletForm.adresse || null,
          mutuelle: dossierCompletForm.mutuelle,
          status: 'actif'
        })

        const newNotes = buildAppointmentMeta(null, {
          type: dossierCompletForm.type,
        })
        await createRdv({
          cabinet_id: cabinetId,
          rappel_envoye: false,
          patient_id: createdPatient.id,
          date_rdv: new Date(`${dossierCompletForm.date}T${dossierCompletForm.heure}:00`).toISOString(),
          status: 'confirme',
          notes: newNotes,
        })
        
        successMessage = 'Patient et rendez-vous créés avec succès'
      }

      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      
      notify({
        title: 'Succès',
        description: successMessage
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
      console.error('Error creating appointment:', errorMsg)
      notify({
        title: 'Erreur',
        description: `Impossible d'enregistrer le rendez-vous: ${errorMsg}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Input styles
  const inputClass = "w-full h-[44px] px-3 bg-white border border-[#E5E7EB] rounded-[10px] text-[#111827] text-[14px] font-medium placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-[#D1D5DB]"
  const labelClass = "block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]"

  // Footer buttons
  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        style={{
          backgroundColor: cancelHovered ? '#F9FAFB' : '#FFFFFF',
          color: '#374151',
          border: `2px solid ${cancelHovered ? '#D1D5DB' : '#E5E7EB'}`,
          padding: '0.625rem 1.25rem',
          minHeight: '44px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          whiteSpace: 'nowrap',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 'auto',
          flex: 1,
          transform: cancelPressed ? 'translateY(-1px) scale(0.98)' : cancelHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: cancelHovered ? '0 6px 16px -4px rgba(148, 163, 184, 0.15)' : 'none',
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={() => setCancelHovered(true)}
        onMouseLeave={() => { setCancelHovered(false); setCancelPressed(false); }}
        onMouseDown={() => setCancelPressed(true)}
        onMouseUp={() => setCancelPressed(false)}
      >
        Annuler
      </button>
      {modalState !== 'invitation' && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: submitHovered ? '#2563EB' : '#3B82F6',
            color: '#FFFFFF',
            border: `2px solid ${submitHovered ? '#1E40AF' : '#60A5FA'}`,
            padding: '0.625rem 1.25rem',
            minHeight: '44px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            fontWeight: 'bold',
            width: 'auto',
            flex: 1,
            transform: submitPressed ? 'translateY(-1px) scale(0.98)' : submitHovered ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: submitHovered ? '0 6px 16px -4px rgba(37, 99, 235, 0.15)' : 'none',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={() => setSubmitHovered(true)}
          onMouseLeave={() => { setSubmitHovered(false); setSubmitPressed(false); }}
          onMouseDown={() => setSubmitPressed(true)}
          onMouseUp={() => setSubmitPressed(false)}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Création...
            </>
          ) : (
            modalState === 'existing' ? (
              appointment ? 'Modifier' : 'Créer le rendez-vous'
            ) : modalState === 'rdv-rapide' ? (
              'Créer le RDV'
            ) : (
              'Créer patient et RDV'
            )
          )}
        </button>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalState === 'dossier-complet' ? "Nouveau patient · Rendez-vous" : "Nouveau rendez-vous"}
      width="max-w-[520px]"
      footer={footer}
      noScroll={modalState !== 'dossier-complet'}
    >
      <div className="space-y-4">
        {/* Links de retour */}
        {(modalState === 'rdv-rapide' || modalState === 'dossier-complet') && (
          <button
            type="button"
            onClick={handleReturnToInvitation}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← Revenir au choix du mode
          </button>
        )}

        {modalState === 'invitation' && (
          <button
            type="button"
            onClick={handleReturnToSearch}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← Revenir à la recherche
          </button>
        )}

        {/* -------------------------- ÉTAT 1 : EXISTANT -------------------------- */}
        {modalState === 'existing' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Patient</label>
              <div className="relative">
                <div className={`${inputClass} flex items-center gap-3 ${
                  touched.searchQuery && errors.searchQuery ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
                }`}>
                  <User size={18} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => {
                      setTouched(prev => ({ ...prev, searchQuery: true }))
                      setTimeout(() => setShowDropdown(false), 200)
                    }}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
                {touched.searchQuery && errors.searchQuery && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.searchQuery}</p>
                )}

                {/* Search Dropdown */}
                {showDropdown && filteredPatients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        type="button"
                        onMouseDown={() => handleSelectPatient(patient)}
                        className="flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {patient.prenom} {patient.nom}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{patient.telephone}</span>
                          {patient.derniereVisite && (
                            <>
                              <span>•</span>
                              <span>Dernière visite: {patient.derniereVisite}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mini Résumé Patient */}
            {selectedPatient && (
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPatient.alertes > 0
                    ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold ${
                    selectedPatient.alertes > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedPatient.prenom[0]}{selectedPatient.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">
                      {selectedPatient.prenom} {selectedPatient.nom}
                    </p>
                    <p className="text-xs text-slate-500">
                      Dernière visite: {selectedPatient.derniereVisite}
                    </p>
                    {selectedPatient.alertes > 0 && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} />
                        {selectedPatient.alertes} alerte{selectedPatient.alertes > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Téléphone</label>
              <div className="relative">
                <div className={`${inputClass} flex items-center gap-3 bg-[#F9FAFB]`}>
                  <Phone size={18} className="text-[#9CA3AF] flex-shrink-0" />
                  <input
                    type="text"
                    value={selectedPatient?.telephone || ''}
                    readOnly
                    aria-readonly="true"
                    className="w-full bg-transparent outline-none text-[#6B7280] text-[14px]"
                  />
                  <Lock size={16} className="text-[#9CA3AF] flex-shrink-0 cursor-help" title="Depuis le dossier" />
                </div>
              </div>
            </div>

            {/* Shared fields for existing patient */}
            <div>
              <label className={labelClass}>Motif</label>
              <textarea
                value={existingForm.motif}
                onChange={(e) => setExistingForm(prev => ({ ...prev, motif: e.target.value }))}
                placeholder="Motif du RDV..."
                className={cn(inputClass, "h-[80px] py-3 resize-none")}
              />
              {touched.motif && errors.motif && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.motif}</p>
              )}
            </div>

            {/* Date + Heure + Type in 3 columns */}
            <div className="grid grid-cols-[140px_100px_1fr] gap-[10px]">
              <div>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={existingForm.date}
                    onChange={(e) => setExistingForm(prev => ({ ...prev, date: e.target.value }))}
                    className={cn(inputClass, "pr-10")}
                  />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {touched.date && errors.date && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Heure</label>
                <div className="relative">
                  <select
                    value={existingForm.heure}
                    onChange={(e) => setExistingForm(prev => ({ ...prev, heure: e.target.value }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {touched.heure && errors.heure && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.heure}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <div className="relative">
                  <select
                    value={existingForm.type}
                    onChange={(e) => setExistingForm(prev => ({ ...prev, type: e.target.value }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {typesRDV.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------- ÉTAT 2 : INVITATION -------------------------- */}
        {modalState === 'invitation' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Patient</label>
              <div className="relative">
                <div className={`${inputClass} flex items-center gap-3`}>
                  <User size={18} className="text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => {
                      if (filteredPatients.length > 0) setModalState('existing')
                      setShowDropdown(true)
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
                {showDropdown && filteredPatients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        type="button"
                        onMouseDown={() => handleSelectPatient(patient)}
                        className="flex w-full flex-col border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {patient.prenom} {patient.nom}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{patient.telephone}</span>
                          {patient.derniereVisite && (
                            <>
                              <span>•</span>
                              <span>Dernière visite: {patient.derniereVisite}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Carte d'invitation */}
            <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User size={24} className="text-slate-700" />
                </div>
              </div>
              <p className="text-sm text-slate-700 font-medium mb-1">
                Ce patient n'est pas encore dans votre base
              </p>
              <p className="text-xs text-slate-600 mb-5">
                Comment souhaitez-vous créer ce rendez-vous ?
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRdvRapide}
                  className="w-full p-4 rounded-lg bg-blue-600 text-white text-left transition-all hover:bg-blue-700 hover:-translate-y-0.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">RDV rapide par téléphone</p>
                      <p className="text-xs text-blue-100">Nom · Téléphone · Motif</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDossierComplet}
                  className="w-full p-4 rounded-lg bg-white border border-slate-300 text-slate-800 text-left transition-all hover:bg-slate-50 hover:border-slate-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText size={20} className="text-slate-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Dossier complet</p>
                      <p className="text-xs text-slate-500">Toutes les informations</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------- ÉTAT 3A : RDV RAPIDE -------------------------- */}
        {modalState === 'rdv-rapide' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nom & Prénom</label>
              <div className={`${inputClass} flex items-center gap-3 ${
                touched.nomPrenom && errors.nomPrenom ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
              }`}>
                <User size={18} className="text-slate-500" />
                <input
                  type="text"
                  value={rdvRapideForm.nomPrenom}
                  onChange={(e) => setRdvRapideForm(prev => ({ ...prev, nomPrenom: e.target.value }))}
                  onBlur={() => setTouched(prev => ({ ...prev, nomPrenom: true }))}
                  className="w-full bg-transparent outline-none"
                />
              </div>
              {touched.nomPrenom && errors.nomPrenom && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.nomPrenom}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Téléphone</label>
              <div className={`${inputClass} flex items-center gap-3 ${
                touched.telephone && errors.telephone ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
              }`}>
                <Phone size={18} className="text-slate-500" />
                <input
                  type="text"
                  value={rdvRapideForm.telephone}
                  onChange={(e) => setRdvRapideForm(prev => ({ ...prev, telephone: formatPhoneNumber(e.target.value) }))}
                  onBlur={() => setTouched(prev => ({ ...prev, telephone: true }))}
                  placeholder="06 12 34 56 78"
                  className="w-full bg-transparent outline-none"
                />
              </div>
              {touched.telephone && errors.telephone && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.telephone}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Motif</label>
              <textarea
                value={rdvRapideForm.motif}
                onChange={(e) => setRdvRapideForm(prev => ({ ...prev, motif: e.target.value }))}
                onBlur={() => setTouched(prev => ({ ...prev, motif: true }))}
                placeholder="Motif du RDV..."
                className={cn(inputClass, "h-[80px] py-3 resize-none")}
              />
              {touched.motif && errors.motif && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.motif}</p>
              )}
            </div>

            {/* Date + Heure + Type in 3 columns */}
            <div className="grid grid-cols-[140px_100px_1fr] gap-[10px]">
              <div>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={rdvRapideForm.date}
                    onChange={(e) => setRdvRapideForm(prev => ({ ...prev, date: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, date: true }))}
                    className={cn(inputClass, "pr-10")}
                  />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {touched.date && errors.date && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Heure</label>
                <div className="relative">
                  <select
                    value={rdvRapideForm.heure}
                    onChange={(e) => setRdvRapideForm(prev => ({ ...prev, heure: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, heure: true }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {touched.heure && errors.heure && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.heure}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <div className="relative">
                  <select
                    value={rdvRapideForm.type}
                    onChange={(e) => setRdvRapideForm(prev => ({ ...prev, type: e.target.value }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {typesRDV.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------- ÉTAT 3B : DOSSIER COMPLET -------------------------- */}
        {modalState === 'dossier-complet' && (
          <div className="space-y-[14px]">
            {/* Nom & Prénom */}
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className={labelClass}>Nom</label>
                <input
                  type="text"
                  value={dossierCompletForm.nom}
                  onChange={(e) => setDossierCompletForm(prev => ({ ...prev, nom: e.target.value }))}
                  onBlur={() => setTouched(prev => ({ ...prev, nom: true }))}
                  className={cn(inputClass, touched.nom && errors.nom ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : '')}
                />
                {touched.nom && errors.nom && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.nom}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Prénom</label>
                <input
                  type="text"
                  value={dossierCompletForm.prenom}
                  onChange={(e) => setDossierCompletForm(prev => ({ ...prev, prenom: e.target.value }))}
                  onBlur={() => setTouched(prev => ({ ...prev, prenom: true }))}
                  className={cn(inputClass, touched.prenom && errors.prenom ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : '')}
                />
                {touched.prenom && errors.prenom && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.prenom}</p>
                )}
              </div>
            </div>

            {/* Téléphone & CIN */}
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className={labelClass}>Téléphone</label>
                <div className={`${inputClass} flex items-center gap-3 ${
                  touched.telephone && errors.telephone ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
                }`}>
                  <Phone size={18} className="text-[#9CA3AF] flex-shrink-0" />
                  <input
                    type="text"
                    value={dossierCompletForm.telephone}
                    onChange={(e) => setDossierCompletForm(prev => ({ ...prev, telephone: formatPhoneNumber(e.target.value) }))}
                    onBlur={() => setTouched(prev => ({ ...prev, telephone: true }))}
                    placeholder="06 12 34 56 78"
                    className="w-full bg-transparent outline-none text-[14px]"
                  />
                </div>
                {touched.telephone && errors.telephone && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.telephone}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>CIN</label>
                <input
                  type="text"
                  value={dossierCompletForm.cin}
                  onChange={(e) => setDossierCompletForm(prev => ({ ...prev, cin: e.target.value }))}
                  placeholder="AB123456"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Date de naissance & Sexe */}
            <div className="grid grid-cols-[1fr_1fr] gap-[10px]">
              <div>
                <label className={labelClass}>Date de naissance</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dossierCompletForm.dateNaissance}
                    onChange={(e) => setDossierCompletForm(prev => ({ ...prev, dateNaissance: e.target.value }))}
                    className={cn(inputClass, "pr-10")}
                  />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Sexe</label>
                <div className="flex gap-[10px]" role="radiogroup" aria-label="Sexe du patient">
                  <button
                    type="button"
                    onClick={() => setDossierCompletForm(prev => ({ ...prev, sexe: 'homme' }))}
                    className={cn(
                      "flex-1 h-[44px] px-4 rounded-[10px] text-[14px] font-medium transition-all flex items-center justify-center",
                      dossierCompletForm.sexe === 'homme'
                        ? "bg-[#EFF6FF] border border-[#3B82F6] text-[#3B82F6] font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:border-[#D1D5DB]"
                    )}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierCompletForm(prev => ({ ...prev, sexe: 'femme' }))}
                    className={cn(
                      "flex-1 h-[44px] px-4 rounded-[10px] text-[14px] font-medium transition-all flex items-center justify-center",
                      dossierCompletForm.sexe === 'femme'
                        ? "bg-[#EFF6FF] border border-[#3B82F6] text-[#3B82F6] font-semibold"
                        : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:border-[#D1D5DB]"
                    )}
                  >
                    Femme
                  </button>
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label className={labelClass}>Adresse</label>
              <textarea
                value={dossierCompletForm.adresse}
                onChange={(e) => setDossierCompletForm(prev => ({ ...prev, adresse: e.target.value }))}
                placeholder="12 Rue des Lilas, Casablanca"
                className={cn(inputClass, "h-[70px] py-3 resize-none")}
              />
            </div>

            {/* Mutuelle */}
            <div>
              <label className={labelClass}>Mutuelle</label>
              <div className="relative">
                <select
                  value={dossierCompletForm.mutuelle}
                  onChange={(e) => setDossierCompletForm(prev => ({ ...prev, mutuelle: e.target.value }))}
                  className={cn(inputClass, "appearance-none pr-10")}
                >
                  {mutuelles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>

            {/* Motif du RDV */}
            <div>
              <label className={labelClass}>Motif du RDV</label>
              <textarea
                value={dossierCompletForm.motif}
                onChange={(e) => setDossierCompletForm(prev => ({ ...prev, motif: e.target.value }))}
                onBlur={() => setTouched(prev => ({ ...prev, motif: true }))}
                placeholder="Motif du RDV..."
                className={cn(inputClass, "h-[70px] py-3 resize-none")}
              />
              {touched.motif && errors.motif && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.motif}</p>
              )}
            </div>

            {/* Date + Heure + Type */}
            <div className="grid grid-cols-[140px_100px_1fr] gap-[10px]">
              <div>
                <label className={labelClass}>Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dossierCompletForm.date}
                    onChange={(e) => setDossierCompletForm(prev => ({ ...prev, date: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, date: true }))}
                    className={cn(inputClass, "pr-10")}
                  />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
                {touched.date && errors.date && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Heure</label>
                <div className="relative">
                  <select
                    value={dossierCompletForm.heure}
                    onChange={(e) => setDossierCompletForm(prev => ({ ...prev, heure: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, heure: true }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
                {touched.heure && errors.heure && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.heure}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <div className="relative">
                  <select
                    value={dossierCompletForm.type}
                    onChange={(e) => setDossierCompletForm(prev => ({ ...prev, type: e.target.value }))}
                    className={cn(inputClass, "appearance-none pr-10")}
                  >
                    {typesRDV.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AppointmentFormModal
