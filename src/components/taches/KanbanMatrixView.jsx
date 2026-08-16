import React, { useState } from 'react'
import {
  CheckSquare,
  Square,
  CheckCircle2,
  ArrowRight,
  FastForward,
  Kanban,
  Sparkles,
  AlertCircle,
  Clock,
  Archive,
  RotateCcw,
  Building2,
  FileCheck
} from 'lucide-react'
import Tooltip from './ui/Tooltip'
import ClinicalPeekPopover from './ui/ClinicalPeekPopover'

export default function KanbanMatrixView({
  tasks = [],
  roleView = 'doctor',
  handleResolveTask,
  notify
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [matrixTasks, setMatrixTasks] = useState([
    // Medical Tasks (Vue Docteur)
    { id: 'm1', patientName: 'Hind Boukili', category: 'prescriptions', description: 'Ordonnance Amlor 5mg (HTA)', column: 'col2', time: '09:15', isUrgent: false, isDoctorOnly: true, cin: 'AB-99412', phone: '06 61 44 22 11' },
    { id: 'm2', patientName: 'Youssef Idrissi', category: 'prescriptions', description: 'Renouvellement Diabète HbA1c', column: 'col2', time: '09:40', isUrgent: false, isDoctorOnly: true, cin: 'CD-11204', phone: '06 62 88 99 00' },
    { id: 'm3', patientName: 'Karim Amrani', category: 'resultats', description: 'Bilan sanguin complet & lipides', column: 'col1', time: '08:30', isUrgent: false, isDoctorOnly: true, cin: 'EF-33491', phone: '06 63 55 44 33' },
    { id: 'm4', patientName: 'Meryem Tazi', category: 'urgences', description: 'Tension 185/110 mmHg (Urgence)', column: 'col2', time: '10:05', isUrgent: true, isDoctorOnly: true, cin: 'AB-88419', phone: '06 61 23 45 67' },
    { id: 'm5', patientName: 'Omar Bennani', category: 'messages', description: 'Question sur posologie antibiotique', column: 'col3', time: '11:20', isUrgent: false, isDoctorOnly: true, cin: 'GH-77812', phone: '06 64 11 22 33' },
    { id: 'm7', patientName: 'Fatima El Amrani', category: 'prescriptions', description: 'Renouvellement Diabète & HTA', column: 'col2', time: '11:45', isUrgent: false, isDoctorOnly: true, cin: 'JK-44109', phone: '06 65 99 88 77' },

    // Administrative Tasks (Vue Secrétaire)
    { id: 's1', patientName: 'Sarah Benali', category: 'facturation', description: 'Anomalie Dossier Mutuelle CNSS', column: 'col2', time: 'Hier', isUrgent: false, isDoctorOnly: false, cin: 'LM-22019', phone: '06 66 33 22 11' },
    { id: 's2', patientName: 'Ahmed Bennani', category: 'confirmations', description: 'Demande de confirmation RDV Demain', column: 'col1', time: '09:00', isUrgent: false, isDoctorOnly: false, cin: 'NO-55821', phone: '06 67 44 55 66' },
    { id: 's3', patientName: 'Lina Mansouri', category: 'cnss', description: 'Prise en charge CNOPS à transmettre', column: 'col2', time: '10:30', isUrgent: false, isDoctorOnly: false, cin: 'PQ-99102', phone: '06 68 77 66 55' },
    { id: 's4', patientName: 'Mehdi Cherkaoui', category: 'facturation', description: 'Règlement Impayé Consultation', column: 'col3', time: '11:00', isUrgent: false, isDoctorOnly: false, cin: 'RS-33890', phone: '06 69 11 00 22' }
  ])

  const isDoctorView = roleView === 'doctor'
  const doctorCategories = ['urgences', 'resultats', 'prescriptions', 'messages']
  const secretaryCategories = ['facturation', 'confirmations', 'cnss']

  const roleFilteredMatrixTasks = matrixTasks.filter(t =>
    isDoctorView ? doctorCategories.includes(t.category) : secretaryCategories.includes(t.category)
  )

  const toggleSelect = (id) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    )
  }

  const handleBatchSign = () => {
    if (selectedTaskIds.length === 0) return

    setMatrixTasks(prev =>
      prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, column: 'col3' } : t)
    )

    notify?.({
      title: 'Validation en Lot Effectuée ⚡',
      description: `${selectedTaskIds.length} ordonnance(s) signée(s) & transmise(s) au patient par WhatsApp.`,
      variant: 'success'
    })

    setSelectedTaskIds([])
  }

  const advanceCard = (task) => {
    setMatrixTasks(prev =>
      prev.map(t => {
        if (t.id !== task.id) return t

        let nextCol = t.column

        if (t.column === 'col1') {
          nextCol = 'col2'
          notify?.({
            title: 'Tâche Qualifiée',
            description: `Transmise à la colonne de validation.`,
            variant: 'success'
          })
        } else if (t.column === 'col2') {
          if (isDoctorView) {
            nextCol = 'col3'
            notify?.({
              title: 'Décision Validée 📱',
              description: `Ordonnance signée. Notification WhatsApp transmise à ${task.patientName}.`,
              variant: 'success'
            })
          } else {
            nextCol = 'col4'
            notify?.({
              title: 'Dossier Administratif Validé',
              description: `La tâche de ${task.patientName} a été clôturée.`,
              variant: 'success'
            })
          }
        }

        return { ...t, column: nextCol }
      })
    )
  }

  const handleManualClose = (taskId) => {
    setMatrixTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, column: 'col4' } : t)
    )
    notify?.({
      title: 'Tâche Clôturée',
      description: 'Le dossier a été archivé.',
      variant: 'success'
    })
  }

  const handleReopenTask = (taskId) => {
    setMatrixTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, column: 'col2' } : t)
    )
    notify?.({
      title: 'Tâche Rouverte',
      description: 'Le dossier est repassé en validation.',
      variant: 'success'
    })
  }

  const columns = [
    {
      id: 'col1',
      title: '1. À Trier (IA)',
      bgColor: 'bg-amber-50/50 border-amber-200/80',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      count: roleFilteredMatrixTasks.filter(t => t.column === 'col1').length
    },
    {
      id: 'col2',
      title: isDoctorView ? '2. Validation Docteur' : '2. Action Secrétariat',
      bgColor: 'bg-blue-50/50 border-blue-200/80',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      count: roleFilteredMatrixTasks.filter(t => t.column === 'col2').length
    },
    {
      id: 'col3',
      title: '3. En Cours (Patient)',
      bgColor: 'bg-purple-50/50 border-purple-200/80',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      count: roleFilteredMatrixTasks.filter(t => t.column === 'col3').length
    },
    {
      id: 'col4',
      title: '4. Clôturé / Archivé',
      bgColor: 'bg-emerald-50/50 border-emerald-200/80',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      count: roleFilteredMatrixTasks.filter(t => t.column === 'col4').length
    }
  ]

  const col2SelectedCount = selectedTaskIds.length
  const pendingAdminCount = roleFilteredMatrixTasks.filter(t => t.column !== 'col4').length

  return (
    <div className="space-y-4 relative">
      {/* STICKY TOOLBAR */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-3.5 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border border-indigo-900/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold shrink-0">
            {isDoctorView ? <FastForward size={20} className="text-amber-400" /> : <Building2 size={20} className="text-emerald-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                KANBAN CARE-FLOW MATRIX
              </h3>
              <span className={`text-white text-[10px] font-black px-2 py-0.5 rounded-full ${
                isDoctorView ? 'bg-amber-500' : 'bg-emerald-600'
              }`}>
                {isDoctorView ? 'Vue Clinique Docteur' : 'Vue Secrétariat Administrateur'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              {isDoctorView
                ? 'Cochez les ordonnances pour valider la signature en lot 1-clic.'
                : 'Suivi et traitement des dossiers mutuelles, factures impayées et RDV.'}
            </p>
          </div>
        </div>

        {/* ROLE RESTRICTION BANNER */}
        {isDoctorView ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-200">
              ⚡ {col2SelectedCount} Sélectionnée(s)
            </span>

            <Tooltip position="top-end" content="Signe électroniquement les ordonnances et transmet le reçu au patient">
              <button
                type="button"
                onClick={handleBatchSign}
                disabled={col2SelectedCount === 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>[ Valider & Signer la Sélection ({col2SelectedCount}) ]</span>
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 shrink-0">
            <FileCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-extrabold text-white">
              Tâches Administratives en Attente: <span className="text-amber-400 font-black">{pendingAdminCount}</span>
            </span>
          </div>
        )}
      </div>

      {/* 4-COLUMN KANBAN MATRIX WITH CLINICAL PEEK HOVER POPOVERS OPENING DOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 h-[calc(100vh-17rem)] min-h-[550px]">
        {columns.map((col, colIdx) => {
          const colTasks = roleFilteredMatrixTasks.filter(t => t.column === col.id)
          // Position popover opening DOWN below the card (bottom-start or bottom-end)
          const popoverPos = colIdx >= 2 ? 'bottom-end' : 'bottom-start'

          return (
            <div
              key={col.id}
              className={`h-full rounded-2xl border p-2.5 flex flex-col ${col.bgColor}`}
            >
              {/* Column Header */}
              <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 mb-2.5 flex items-center justify-between font-bold text-xs shadow-2xs shrink-0">
                <span className="text-slate-800 font-black text-[11px]">{col.title}</span>
                <span className={`px-2 py-0.5 rounded-full font-black text-[10px] border ${col.badgeColor}`}>
                  {col.count}
                </span>
              </div>

              {/* Column Cards Feed */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-[11px] font-medium border-2 border-dashed border-slate-200/80 rounded-xl bg-white/50">
                    Aucune tâche
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isChecked = selectedTaskIds.includes(task.id)
                    const isUrgent = task.isUrgent || task.category === 'urgences'

                    return (
                      <ClinicalPeekPopover key={task.id} task={task} position={popoverPos}>
                        <div
                          className={`p-2.5 rounded-xl border transition-all bg-white shadow-2xs space-y-1.5 ${
                            isChecked
                              ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30'
                              : isUrgent
                              ? 'border-red-300 bg-red-50/10'
                              : 'border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start gap-1.5">
                            {/* Checkbox ONLY in Vue Docteur for Column 2 */}
                            {isDoctorView && col.id === 'col2' && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(task.id)}
                                className="text-slate-400 hover:text-amber-600 mt-0.5 shrink-0"
                              >
                                {isChecked ? (
                                  <CheckSquare size={15} className="text-amber-600" />
                                ) : (
                                  <Square size={15} />
                                )}
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isUrgent && (
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Urgent" />
                                  )}
                                  <h4 className="text-[11px] font-bold text-slate-900 truncate">
                                    {task.patientName}
                                  </h4>
                                </div>
                                <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                                  {task.time}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-600 font-medium line-clamp-2 mt-0.5 block">
                                {task.description || task.object || task.details || 'Aucune description'}
                              </p>
                            </div>
                          </div>

                          {/* Card Action Footer */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-1">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              isUrgent
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {task.category.toUpperCase()}
                            </span>

                            {(col.id === 'col1' || col.id === 'col2') && (
                              <button
                                type="button"
                                onClick={() => advanceCard(task)}
                                className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded flex items-center gap-0.5 transition-colors border border-blue-200/60"
                              >
                                <span>Avancer</span>
                                <ArrowRight size={10} />
                              </button>
                            )}

                            {col.id === 'col3' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-extrabold text-purple-800 bg-purple-100/90 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>En attente patient</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleManualClose(task.id)}
                                  className="text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  Clôturer
                                </button>
                              </div>
                            )}

                            {col.id === 'col4' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleReopenTask(task.id)}
                                  className="text-[9px] font-bold text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                >
                                  <RotateCcw size={9} />
                                  <span>Rouvrir</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </ClinicalPeekPopover>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
