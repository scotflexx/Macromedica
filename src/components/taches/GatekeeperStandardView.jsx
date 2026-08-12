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
  ChevronRight,
  Phone,
  CreditCard,
  X,
  FileCheck
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

  // Payment Collection Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [sendReceiptWhatsApp, setSendReceiptWhatsApp] = useState(true)

  // Patient Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

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
        description: `La tâche administrative de ${task.patientName} a été transmise au Médecin.`,
        variant: 'success'
      })
      handleResolveTask(task.id, 'Escaladée au médecin')
    })
  }

  const handleConfirmPayment = () => {
    if (!selectedTask) return
    setIsPaymentModalOpen(false)

    triggerActionAndAdvance(() => {
      notify?.({
        title: 'Encaissement Réussi 💳',
        description: `Règlement de 300 MAD enregistré pour ${selectedTask.patientName} (${paymentMethod.toUpperCase()}). Reçu envoyé par WhatsApp.`,
        variant: 'success'
      })
      handleResolveTask(selectedTask.id, `Encaissement effectué pour ${selectedTask.patientName}.`)
    })
  }

  const handleContactPatient = () => {
    setIsContactModalOpen(true)
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

          {/* Filter Pills with Flex-Wrap (No Horizontal Scroll) */}
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
              Sélectionnez une tâche dans le fil de triage pour consulter les détails.
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
                  onApproveAndSend={() => triggerActionAndAdvance(() => handleResolveTask(selectedTask.id))}
                  onArchive={() => triggerActionAndAdvance(() => handleArchive(selectedTask))}
                  isProcessing={isProcessing}
                />
              )}

              {selectedTask.category === 'prescriptions' && (
                <PrescriptionViewer
                  task={selectedTask}
                  onSignNext={() => triggerActionAndAdvance(() => handleSignNextPrescription(selectedTask))}
                  onEdit={() => {}}
                  isBatchMode={false}
                  batchRemainingCount={1}
                  isProcessing={isProcessing}
                />
              )}

              {selectedTask.category === 'messages' && (
                <PatientMessageViewer
                  task={selectedTask}
                  onSendReply={(replyText) => triggerActionAndAdvance(() => handleSendReply(selectedTask, replyText))}
                  isProcessing={isProcessing}
                />
              )}

              {(selectedTask.category === 'urgences' ||
                selectedTask.category === 'facturation' ||
                selectedTask.category === 'confirmations' ||
                selectedTask.category === 'cnss') && (
                <AdminTaskViewer
                  task={selectedTask}
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
                  {selectedTask.category === 'facturation'
                    ? 'Règlement en attente. Cliquer sur "Encaisser le règlement" pour ouvrir le sous-module d\'encaissement rapide et valider la facture.'
                    : selectedTask.category === 'cnss'
                    ? 'Dossier CNSS/CNOPS prêt pour télétransmission. Cliquer sur "Valider & Transmettre" pour archiver.'
                    : selectedTask.category === 'confirmations'
                    ? 'Le patient attend la confirmation de son RDV. Transmettre la validation et notifier par SMS/WhatsApp.'
                    : selectedTask.category === 'urgences'
                    ? 'Tension critique (185/110 mmHg). Transmettre en priorité au médecin et planifier un ECG.'
                    : 'Dossier médical vérifié par le système. Cliquez sur le bouton principal pour traiter et clôturer.'}
                </p>
              </div>
            </div>

            {/* 🚀 REFACTORED CONSOLIDATED ACTION BAR (CONTEXT-AWARE PRIMARY + SECONDARY HELPERS) */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 shrink-0 flex items-center justify-between gap-2.5 flex-wrap">
              {/* SECONDARY HELPER ACTIONS */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Contacter le patient */}
                <Tooltip position="top-start" content="Appeler ou envoyer un message WhatsApp au patient">
                  <button
                    type="button"
                    onClick={handleContactPatient}
                    className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                  >
                    <Phone size={14} className="text-blue-600" />
                    <span>📞 Contacter</span>
                  </button>
                </Tooltip>

                {/* 2. Escalader au Médecin (Secretary View Only) */}
                {!isDoctorView && (
                  <Tooltip position="top-start" content="Transmettre ce dossier au médecin avec priorité haute">
                    <button
                      type="button"
                      onClick={() => handleEscalateToDoctor(selectedTask)}
                      className="h-9 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <ArrowUpRight size={14} className="text-amber-600" />
                      <span>↗️ Escalader au Médecin</span>
                    </button>
                  </Tooltip>
                )}

                {/* 3. Archiver (Silent Archive) */}
                <Tooltip position="top-start" content="Archiver silencieusement la tâche au dossier">
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleArchive(selectedTask))}
                    className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                  >
                    <Archive size={14} className="text-slate-500" />
                    <span>📁 Archiver</span>
                  </button>
                </Tooltip>
              </div>

              {/* CONTEXT-AWARE PRIMARY ACTION BUTTON */}
              <div className="ml-auto shrink-0">
                {/* A. FACTURATION / IMPAYÉ -> 💳 Encaisser le règlement */}
                {(selectedTask.category === 'facturation' || selectedTask.category === 'impaye') && (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <CreditCard size={16} />
                    <span>💳 Encaisser le règlement</span>
                  </button>
                )}

                {/* B. CNSS / DOSSIER -> ✅ Valider & Transmettre */}
                {(selectedTask.category === 'cnss' || selectedTask.category === 'dossier') && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleResolveTask(selectedTask.id, `Dossier CNSS de ${selectedTask.patientName} transmis.`))}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <FileCheck size={16} />
                    <span>✅ Valider & Transmettre</span>
                  </button>
                )}

                {/* C. CONFIRMATIONS / MESSAGES -> 💬 Répondre / Confirmer RDV */}
                {(selectedTask.category === 'confirmations' || (selectedTask.category === 'messages' && !isDoctorView)) && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleResolveTask(selectedTask.id, `RDV/Message confirmé pour ${selectedTask.patientName}.`))}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>💬 Répondre / Confirmer RDV</span>
                  </button>
                )}

                {/* D. PRESCRIPTIONS (Doctor View) -> ⚡ Valider & Signer l'ordonnance */}
                {selectedTask.category === 'prescriptions' && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleSignNextPrescription(selectedTask))}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>⚡ Valider & Signer l'ordonnance</span>
                  </button>
                )}

                {/* E. RESULTATS (Doctor View) -> 🔬 Valider le compte-rendu */}
                {selectedTask.category === 'resultats' && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleResolveTask(selectedTask.id, `Bilan/Résultat de ${selectedTask.patientName} approuvé.`))}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>🔬 Valider le compte-rendu</span>
                  </button>
                )}

                {/* F. URGENCES -> 🚨 Traiter l'urgence */}
                {selectedTask.category === 'urgences' && (
                  <button
                    type="button"
                    onClick={() => triggerActionAndAdvance(() => handleResolveTask(selectedTask.id, `Urgence médicale de ${selectedTask.patientName} prise en charge.`))}
                    disabled={isProcessing}
                    className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs shadow-md shadow-red-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  >
                    <AlertCircle size={16} />
                    <span>🚨 Traiter l'urgence</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 PAYMENT COLLECTION MODAL (`💳 Encaisser le règlement`) */}
      {isPaymentModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Encaissement du Règlement</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Facturation & Secrétariat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Patient & Amount Details Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Patient:</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedTask.patientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-emerald-200/60 pt-2">
                <span className="text-slate-500 font-semibold">Montant à encaisser:</span>
                <span className="font-black text-emerald-700 text-base">300 MAD</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Mode de paiement</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  💵 Espèces
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tpe')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === 'tpe'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  💳 TPE / Carte
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('virement')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === 'virement'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🏦 Virement
                </button>
              </div>
            </div>

            {/* Send Receipt WhatsApp Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={sendReceiptWhatsApp}
                onChange={(e) => setSendReceiptWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs text-slate-700 font-semibold">
                Envoyer le reçu électronique par WhatsApp au patient
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 size={16} />
                <span>Confirmer l'Encaissement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 PATIENT CONTACT MODAL */}
      {isContactModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900">📞 Contacter {selectedTask.patientName}</h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.open(`https://wa.me/212600000000?text=Bonjour%20${encodeURIComponent(selectedTask.patientName)},%20concernant%20votre%20dossier%20médical...`, '_blank')
                  setIsContactModalOpen(false)
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                💬 Envoyer un Message WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open('tel:+212600000000')
                  setIsContactModalOpen(false)
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                📞 Appeler sur le Téléphone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
