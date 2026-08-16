import React from 'react'
import { FileText } from 'lucide-react'

/**
 * ClinicalPeekPopover Component
 * Crisp light-themed popover providing mini patient chart info & expanded task details on hover.
 * Positioned DOWN (top-full mt-1.5) by default so details are never clipped by headers.
 */
export default function ClinicalPeekPopover({ task, children, position = 'bottom-start' }) {
  if (!task) return children

  // Format Patient Age & Gender mock
  const patientAgeGender = task.patientAgeGender || '34 ans, F'
  const patientCin = task.cin || 'AB-88419'
  const patientPhone = task.phone || '06 61 23 45 67'
  const lastAppointment = task.lastRdv || '12/07/2026 (Dr. Touggani)'

  // Category specific expanded detail mock logic
  const getExpandedDetail = () => {
    if (task.expandedDetail) return task.expandedDetail

    switch (task.category) {
      case 'resultats':
        return 'Glycémie à jeun: 1.25 g/L • Cholestérol LDL: 1.80 g/L (Limite pré-diabète)'
      case 'prescriptions':
        return 'Amlor 5mg (1cp/j) • Suivi HTA • En attente de signature numérique'
      case 'messages':
        return 'WhatsApp: "Bonjour Docteur, dois-je prendre mon médicament avec un verre d\'eau ?"'
      case 'urgences':
        return 'Tension artérielle 185/110 mmHg mesurée par l\'infirmière d\'accueil (Alerte vitale)'
      case 'facturation':
        return 'Règlement impayé consultation antérieure • Solde débiteur: 150 MAD'
      case 'cnss':
        return 'Dossier prise en charge CNOPS/CNSS en attente de pièces justificatives'
      case 'confirmations':
        return 'Confirmation RDV consultation demain à 10:30 (Rappel automatique envoyé)'
      default:
        return task.description || task.object || 'Aucun détail supplémentaire'
    }
  }

  const positionClasses = {
    'bottom-start': 'top-full mt-1.5 left-0',
    'bottom-end': 'top-full mt-1.5 right-0',
    'top-start': 'bottom-full mb-1.5 left-0',
    'top-end': 'bottom-full mb-1.5 right-0',
    'right-start': 'left-full ml-1.5 top-0',
    'left-start': 'right-full mr-1.5 top-0'
  }[position] || 'top-full mt-1.5 left-0'

  return (
    <div className="group relative">
      {children}

      {/* Popover Container - Positioned DOWN (below the card) */}
      <div
        className={`pointer-events-none absolute z-[100] hidden opacity-0 group-hover:block group-hover:opacity-100 transition-all duration-200 delay-150 w-72 p-3.5 bg-white border border-gray-200 shadow-xl rounded-xl ${positionClasses}`}
      >
        {/* Header: Patient Name + Age/Gender */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[11px] shrink-0">
              {task.patientName ? task.patientName.charAt(0) : 'P'}
            </div>
            <h4 className="text-sm font-bold text-gray-900 truncate">
              {task.patientName || 'Patient Inconnu'}
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 shrink-0 ml-1">
            {patientAgeGender}
          </span>
        </div>

        {/* Context Rows */}
        <div className="py-2 space-y-1 text-xs text-gray-600">
          {/* Row 1: Contact / ID */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">
              CIN: <strong className="text-gray-800 font-semibold">{patientCin}</strong>
            </span>
            <span className="text-gray-500 font-medium">
              Tél: <strong className="text-gray-800 font-semibold">{patientPhone}</strong>
            </span>
          </div>

          {/* Row 2: History */}
          <div className="text-[11px] text-gray-500 font-medium pt-0.5">
            Dernier RDV: <span className="text-gray-800 font-semibold">{lastAppointment}</span>
          </div>
        </div>

        {/* Body / Expanded Details Gray Block */}
        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
            <FileText size={11} className="text-blue-600" />
            <span>Détails & Observation</span>
          </div>
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            {getExpandedDetail()}
          </p>
        </div>
      </div>
    </div>
  )
}
