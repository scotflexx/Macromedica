import React, { useState } from 'react'
import {
  ShieldCheck,
  Stethoscope,
  UserCheck,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  FileText,
  AlertCircle,
  Pill,
  Sparkles,
  Search,
  ArrowRight,
  Send,
  Archive,
  User,
  Clock,
  ChevronRight
} from 'lucide-react'
import Tooltip from './ui/Tooltip'
import LabResultViewer from './LabResultViewer'
import PrescriptionViewer from './PrescriptionViewer'
import PatientMessageViewer from './PatientMessageViewer'
import AdminTaskViewer from './AdminTaskViewer'

export default function GatekeeperStandardView({
  tasks = [],
  selectedTask,
  selectedTaskId,
  setSelectedTaskId,
  roleView = 'doctor',
  handleResolveTask,
  handleApproveAndSend,
  handleArchive,
  handleSignNextPrescription,
  handleSendReply,
  handleAdminResolve,
  isProcessing = false,
  notify
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const isDoctorView = roleView === 'doctor'

  // Strict Role Segregation
  const doctorCategories = ['urgences', 'resultats', 'prescriptions', 'messages']
  const secretaryCategories = ['facturation', 'confirmations', 'cnss']

  const roleFilteredTasks = tasks.filter(t =>
    isDoctorView
      ? doctorCategories.includes(t.category)
      : secretaryCategories.includes(t.category)
  )

  const searchFilteredTasks = roleFilteredTasks.filter(t => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      t.patientName?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    )
  })

  const visibleTasks = activeCategory === 'all'
    ? searchFilteredTasks
    : searchFilteredTasks.filter(t => t.category === activeCategory)

  // Categories list for filter pills (Role-aware)
  const categoriesList = isDoctorView
    ? [
        { id: 'all', label: 'Toutes les tâches' },
        { id: 'urgences', label: '🚨 Urgences' },
        { id: 'resultats', label: '🔬 Labo & Examens' },
        { id: 'prescriptions', label: '💊 Ordonnances' },
        { id: 'messages', label: '💬 Messages Cliniques' }
      ]
    : [
        { id: 'all', label: 'Toutes les tâches' },
        { id: 'facturation', label: '💳 Factures & Impayés' },
        { id: 'confirmations', label: '📅 RDV à Valider' },
        { id: 'cnss', label: '🛡️ Mutuelle & CNSS' }
      ]

  // Auto-advance helper for zero-click workflow
  const triggerActionAndAdvance = (actionFn) => {
    if (!selectedTask) return
    const currentIdx = visibleTasks.findIndex(t => t.id === selectedTask.id)
    const nextTask = visibleTasks[currentIdx + 1] || visibleTasks[currentIdx - 1] || null

    actionFn()

    if (nextTask) {
      setSelectedTaskId(nextTask.id)
    } else {
      const remaining = visibleTasks.filter(t => t.id !== selectedTask.id)
      setSelectedTaskId(remaining[0]?.id || null)
    }
  }

  const handleEscalateToDoctor = (task) => {
    triggerActionAndAdvance(() => {
      notify?.({
        title: 'Tâche Escaladée 🩺',
        description: `La tâche administrative de ${task.patientName} a été transmise au Docteur.`,
        variant: 'success'
      })
      handleResolveTask(task.id, 'Escaladée au médecin')
    })
  }

  const handleApproveAndClose = (task) => {
    triggerActionAndAdvance(() => {
      handleResolveTask(task.id, `Tâche de ${task.patientName} approuvée et clôturée.`)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-14rem)] min-h-[620px]">
      {/* LEFT LIST PANE (40% width / 5 cols) */}
      <div className="lg:col-span-5 h-full rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Pane Header & Search */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDoctorView ? (
                <Stethoscope size={16} className="text-blue-600" />
              ) : (
                <UserCheck size={16} className="text-emerald-600" />
              )}
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isDoctorView ? 'Flux Clinique Docteur' : 'Flux Administratif Secrétaire'}
              </h3>
            </div>
            <span className="bg-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {visibleTasks.length} Tâche(s)
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher patient, description..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* 🚀 FILTER PILLS WITH FLEX-WRAP (NO HORIZONTAL SCROLL) */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {categoriesList.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task List Items Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {visibleTasks.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-xs font-bold text-slate-700">Aucune tâche en attente</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isDoctorView ? 'Le fil clinique est à jour.' : 'Le fil administratif est à jour.'}
              </p>
            </div>
          ) : (
            visibleTasks.map(t => {
              const isSelected = selectedTaskId === t.id
              const isUrgent = t.category === 'urgences' || t.isUrgent || t.status === 'CRITIQUE'

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-400/40'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUrgent && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Urgent" />
                      )}
                      <h4 className="text-xs font-bold text-slate-900 truncate">{t.patientName}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{t.metadata}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mb-2">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isUrgent
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : t.category === 'prescriptions'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : t.category === 'resultats'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {t.category.toUpperCase()}
                    </span>

                    <span className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 transition-transform">
                      <span>Consulter</span>
                      <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT DETAIL PANE (60% width / 7 cols) */}
      <div className="lg:col-span-7 h-full rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
        {!selectedTask ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 text-center">
            <div className="text-4xl mb-2">🩺</div>
            <p className="text-sm font-bold text-slate-800">Aucune tâche sélectionnée</p>
            <p className="text-xs text-slate-400 mt-1">
              Sélectionnez une tâche dans le fil de triage pour consulter les détails et exécuter les actions.
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Header Details Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">{selectedTask.patientName}</h3>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                    {selectedTask.category.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedTask.description}</p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium block">{selectedTask.metadata}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {selectedTask.status || 'En attente'}
                </span>
              </div>
            </div>

            {/* Task Content Viewer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTask.category === 'resultats' && (
                <LabResultViewer
                  task={selectedTask}
                  onApproveAndSend={() => handleApproveAndClose(selectedTask)}
                  onArchive={() => handleArchive(selectedTask)}
                  isProcessing={isProcessing}
                />
              )}

              {selectedTask.category === 'prescriptions' && (
                <PrescriptionViewer
                  task={selectedTask}
                  onSignNext={() => handleSignNextPrescription(selectedTask)}
                  onEdit={() => {}}
                  isBatchMode={false}
                  batchRemainingCount={1}
                  isProcessing={isProcessing}
                />
              )}

              {selectedTask.category === 'messages' && (
                <PatientMessageViewer
                  task={selectedTask}
                  onSendReply={(replyText) => handleSendReply(selectedTask, replyText)}
                  isProcessing={isProcessing}
                />
              )}

              {(selectedTask.category === 'urgences' ||
                selectedTask.category === 'facturation' ||
                selectedTask.category === 'confirmations' ||
                selectedTask.category === 'cnss') && (
                <AdminTaskViewer
                  task={selectedTask}
                  onResolve={() => handleAdminResolve(selectedTask)}
                  onContact={() => {}}
                  isProcessing={isProcessing}
                />
              )}

              {/* AI Recommendation Box */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 rounded-xl border border-indigo-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Recommandation IA (Gemini 2.5 Flash)
                  </h4>
                </div>
                <p className="text-xs text-indigo-900/90 font-medium leading-relaxed">
                  {selectedTask.category === 'urgences'
                    ? 'Patient présente une HTA critique (185/110 mmHg). Transmettre en priorité au médecin et planifier un ECG immédiat.'
                    : selectedTask.category === 'resultats'
                    ? 'Résultats biologiques dans les normes. Valider et envoyer le compte-rendu automatiquement par WhatsApp.'
                    : selectedTask.category === 'prescriptions'
                    ? 'Ordonnance vérifiée et conforme à l\'historique médical du patient. Prête pour signature électronique.'
                    : selectedTask.category === 'facturation'
                    ? 'Anomalie de télétransmission CNSS détectée. Vérifier l\'immatriculation du patient et revalider la facture.'
                    : 'Dossier administratif vérifié. Cliquer sur l\'action ci-dessous pour valider sans ouvrir de sous-formulaire.'}
                </p>
              </div>
            </div>

            {/* 🚀 UPGRADED PRIMARY ACTION BUTTONS FOOTER (ZERO-CLICK WORKFLOW) */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 shrink-0 flex items-center justify-between gap-3 flex-wrap">
              {/* Secondary Escalation for Secretary */}
              {!isDoctorView && (
                <Tooltip position="top-start" content="Transmettre ce dossier administratif pour avis médical au docteur">
                  <button
                    type="button"
                    onClick={() => handleEscalateToDoctor(selectedTask)}
                    className="h-10 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                  >
                    <ArrowUpRight size={15} className="text-amber-600" />
                    <span>[ ↗️ Escalader au Médecin ]</span>
                  </button>
                </Tooltip>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => triggerActionAndAdvance(() => handleArchive(selectedTask))}
                  className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                >
                  <Archive size={15} className="text-slate-500" />
                  <span>[ 📁 Archiver ]</span>
                </button>

                {selectedTask.category === 'messages' && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleSendReply(selectedTask, 'Réponse type transmise'))}
                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-95"
                  >
                    <Send size={15} />
                    <span>[ 💬 Répondre & Clôturer ]</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApproveAndClose(selectedTask)}
                  disabled={isProcessing}
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>[ ✅ Approuver & Clôturer ]</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
