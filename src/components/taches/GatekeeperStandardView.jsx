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
import ClinicalPeekPopover from './ui/ClinicalPeekPopover'
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
    const currentIdx = visibleTasks.findIndex(t => t.id === selectedTaskId)
    const nextTask = visibleTasks[currentIdx + 1] || visibleTasks[currentIdx - 1] || null

    actionFn()

    if (nextTask) {
      setSelectedTaskId(nextTask.id)
    }
  }

  // Payment Confirmation Action Handler
  const handleConfirmPayment = () => {
    if (!selectedTask) return
    setIsPaymentModalOpen(false)

    triggerActionAndAdvance(() => {
      handleAdminResolve(selectedTask)
      notify?.({
        title: 'Encaissement Effectué 💳',
        description: `Paiement enregistré pour ${selectedTask.patientName}. Reçu ${sendReceiptWhatsApp ? 'et notif WhatsApp transmis.' : 'enregistré.'}`,
        variant: 'success'
      })
    })
  }

  return (
    <div className="space-y-4 relative">
      {/* FILTER & SEARCH TOP HEADER BAR */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
            {isDoctorView ? <Stethoscope size={18} /> : <UserCheck size={18} />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              {isDoctorView ? 'Fil Clinique Docteur' : 'Fil Administratif Secrétariat'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isDoctorView ? 'Triage prioritaire & signatures médicales' : 'Validation des encaissements & RDV'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher patient..."
              className="h-8.5 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-full sm:w-52"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* SINGLE-LINE FILTER PILLS WITH TOOLTIPS */}
          <div className="bg-slate-100/90 rounded-xl p-1 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border border-slate-200/60">
            {categoriesList.map(cat => {
              const isActive = activeCategory === cat.id
              const count = cat.id === 'all'
                ? searchFilteredTasks.length
                : searchFilteredTasks.filter(t => t.category === cat.id).length

              return (
                <Tooltip key={cat.id} content={`Filtrer par ${cat.label}`}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2-COLUMN SPLIT MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-16rem)] min-h-[580px]">
        {/* LEFT TRIAGE FEED (40% width / 5 cols) */}
        <div className="lg:col-span-5 h-full rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>Dossiers à Traiter</span>
            </span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              {visibleTasks.length} Tâches
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
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
                  <ClinicalPeekPopover key={t.id} task={t} position="right-start">
                    <div
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
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

                      <p className="text-xs text-slate-600 font-medium truncate mt-0.5 block line-clamp-1 mb-2">
                        {t.description || t.object || t.details || 'Aucune description'}
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
                  </ClinicalPeekPopover>
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
              {/* STICKY CONTEXT HEADER WITH RELEVANT ACTION BUTTONS */}
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {selectedTask.patientName?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{selectedTask.patientName}</h4>
                    <p className="text-[10px] text-slate-300 truncate">
                      {selectedTask.category.toUpperCase()} • {selectedTask.metadata || 'À traiter'}
                    </p>
                  </div>
                </div>

                {/* 🚀 RELEVANT & NON-REDUNDANT ACTION BUTTONS PER TASK CATEGORY */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Facturation / Impayé -> Encaisser Button */}
                  {selectedTask.category === 'facturation' && (
                    <Tooltip position="top-end" content="Ouvrir le formulaire d'encaissement et émettre la facture">
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <CreditCard size={14} />
                        <span>[ Encaisser 150 MAD ]</span>
                      </button>
                    </Tooltip>
                  )}

                  {/* Resultats Labo -> Valider & Transmettre Button */}
                  {selectedTask.category === 'resultats' && (
                    <Tooltip position="top-end" content="Valider le bilan et envoyer le compte-rendu au patient via WhatsApp">
                      <button
                        type="button"
                        onClick={() => triggerActionAndAdvance(() => handleApproveAndSend(selectedTask, 'Bilan validé.'))}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send size={14} />
                        <span>[ Valider & Transmettre ]</span>
                      </button>
                    </Tooltip>
                  )}

                  {/* Prescriptions -> Signer & Transmettre Button */}
                  {selectedTask.category === 'prescriptions' && (
                    <Tooltip position="top-end" content="Signer numériquement l'ordonnance et l'envoyer au smartphone du patient">
                      <button
                        type="button"
                        onClick={() => triggerActionAndAdvance(() => handleSignNextPrescription(selectedTask))}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Pill size={14} />
                        <span>[ Signer & Transmettre ]</span>
                      </button>
                    </Tooltip>
                  )}

                  {/* Inter-Role Handoff Buttons */}
                  {!isDoctorView ? (
                    <Tooltip position="top-end" content="Transférer le fil médical au bureau du médecin">
                      <button
                        type="button"
                        onClick={() => triggerActionAndAdvance(() => {
                          handleResolveTask(selectedTask.id, `Tâche transférée au Docteur.`)
                        })}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1"
                      >
                        <ArrowUpRight size={14} />
                        <span>Escalader au Médecin</span>
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip position="top-end" content="Renvoyer l'instruction au secrétariat pour RDV ou caisse">
                      <button
                        type="button"
                        onClick={() => triggerActionAndAdvance(() => {
                          handleResolveTask(selectedTask.id, `Renvoyé au Secrétariat pour suivi.`)
                        })}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1"
                      >
                        <span>↩️ Renvoyer Secrétariat</span>
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* ACTIVE VIEWER COMPONENT */}
              <div className="flex-1 overflow-y-auto">
                {selectedTask.category === 'resultats' && (
                  <LabResultViewer
                    task={selectedTask}
                    onApproveAndSend={handleApproveAndSend}
                    onArchive={handleArchive}
                    isProcessing={isProcessing}
                  />
                )}

                {selectedTask.category === 'prescriptions' && (
                  <PrescriptionViewer
                    task={selectedTask}
                    onSignNext={handleSignNextPrescription}
                    onEdit={() => {}}
                    isBatchMode={false}
                    batchRemainingCount={1}
                    isProcessing={isProcessing}
                  />
                )}

                {selectedTask.category === 'messages' && (
                  <PatientMessageViewer
                    task={selectedTask}
                    onSendReply={handleSendReply}
                    isProcessing={isProcessing}
                  />
                )}

                {(selectedTask.category === 'urgences' || selectedTask.category === 'facturation' || selectedTask.category === 'confirmations' || selectedTask.category === 'cnss') && (
                  <AdminTaskViewer
                    task={selectedTask}
                    onResolve={handleAdminResolve}
                    onContact={() => setIsContactModalOpen(true)}
                    isProcessing={isProcessing}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ENCAISSEMENT PAYMENT MODAL */}
      {isPaymentModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-emerald-600" size={20} />
                <h3 className="text-sm font-bold text-slate-900">Encaissement & Règlement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Patient:</span>
                <span>{selectedTask.patientName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Acte / Honoraires:</span>
                <span>Consultation Médicale</span>
              </div>
              <div className="flex justify-between font-black text-emerald-700 pt-1 border-t border-slate-200 text-sm">
                <span>Montant à Encaisser:</span>
                <span>150 MAD</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Mode de Paiement:</label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'check'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === method
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {method === 'cash' ? 'Espèces' : method === 'card' ? 'Carte TPE' : 'Chèque'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="receiptCheck"
                checked={sendReceiptWhatsApp}
                onChange={(e) => setSendReceiptWhatsApp(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="receiptCheck" className="text-xs font-medium text-slate-700">
                Transmettre le reçu de paiement par WhatsApp
              </label>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>Valider Encaissement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT CONTACT MODAL */}
      {isContactModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Phone className="text-blue-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">Contacter {selectedTask.patientName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <a
                href={`tel:0661234567`}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 flex items-center justify-between transition-all font-bold text-slate-800"
              >
                <span>Appeler Directement (06 61 23 45 67)</span>
                <Phone size={15} className="text-blue-600" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsContactModalOpen(false)
                  notify?.({
                    title: 'WhatsApp Ouvert 💬',
                    description: `Canal WhatsApp prêt pour ${selectedTask.patientName}.`,
                    variant: 'info'
                  })
                }}
                className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-between transition-all font-bold text-emerald-900"
              >
                <span>Envoyer un Message WhatsApp</span>
                <MessageSquare size={15} className="text-emerald-600" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
