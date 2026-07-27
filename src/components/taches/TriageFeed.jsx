import React from 'react'
import { AlertCircle, FileText, Pill, MessageSquare, Plus, Zap, CheckCircle2, Building2, UserCheck, CreditCard } from 'lucide-react'
import StickyTriageBanner from './StickyTriageBanner'

export default function TriageFeed({
  tasks = [],
  emergencyTasks = [],
  selectedTaskId,
  onSelectTask,
  activeCategory,
  onCategoryChange,
  isBatchMode,
  onToggleBatchMode,
  onOpenAddModal,
  userRole = 'doctor',
  roleView = 'doctor',
  onToggleRoleView
}) {
  const isDoctorView = roleView === 'doctor'

  // Categories based on active role view
  const categories = isDoctorView ? [
    { key: 'urgences', label: 'Urgences', icon: AlertCircle, count: tasks.filter(t => t.category === 'urgences').length },
    { key: 'resultats', label: 'Résultats', icon: FileText, count: tasks.filter(t => t.category === 'resultats').length },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill, count: tasks.filter(t => t.category === 'prescriptions').length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: tasks.filter(t => t.category === 'messages').length },
  ] : [
    { key: 'facturation', label: 'Facturation', icon: CreditCard, count: tasks.filter(t => t.category === 'facturation').length },
    { key: 'confirmations', label: 'Confirmations', icon: UserCheck, count: tasks.filter(t => t.category === 'confirmations').length },
    { key: 'cnss', label: 'CNSS', icon: Building2, count: tasks.filter(t => t.category === 'cnss').length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: tasks.filter(t => t.category === 'messages').length },
  ]

  const filteredTasks = activeCategory === 'all'
    ? tasks
    : tasks.filter(t => t.category === activeCategory)

  // Deduplicate: Exclude emergency tasks from standard feed list so emergency patients are not duplicated
  const emergencyTaskIds = new Set(emergencyTasks.map(t => t.id))
  const nonEmergencyFilteredTasks = filteredTasks.filter(t => !emergencyTaskIds.has(t.id))

  const prescriptionCount = tasks.filter(t => t.category === 'prescriptions').length

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'urgences': return 'bg-red-100 text-red-700 border-red-200'
      case 'resultats': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'prescriptions': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'messages': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'facturation': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'confirmations': return 'bg-sky-100 text-sky-800 border-sky-200'
      case 'cnss': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'urgences': return 'Urgence'
      case 'resultats': return 'Bilan Sanguin'
      case 'prescriptions': return 'À signer'
      case 'messages': return 'Message'
      case 'facturation': return 'Facturation'
      case 'confirmations': return 'RDV'
      case 'cnss': return 'CNSS'
      default: return 'Tâche'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Top Fixed Header Section (Non-scrolling area) */}
      <div className="p-3 border-b border-slate-200/80 space-y-2.5 shrink-0 bg-slate-50/50">
        {/* Mode Rafale (Batch Signing) Banner */}
        {isDoctorView && (activeCategory === 'prescriptions' || activeCategory === 'all') && prescriptionCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2.5 rounded-xl text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-200 fill-amber-200" />
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider block">Mode Rafale (Tout Signer)</span>
                <span className="text-[10px] text-amber-100 font-medium">{prescriptionCount} ordonnance(s) en attente</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleBatchMode}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all shadow-xs ${
                isBatchMode
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-white text-amber-900 hover:bg-amber-50'
              }`}
            >
              {isBatchMode ? '✓ ACTIF' : '⚡ Activer'}
            </button>
          </div>
        )}

        {/* Filter Tabs Header */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Toutes ({tasks.length})
          </button>

          {categories.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryChange(cat.key)}
                className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Fixed Emergency Triage Banner at top of feed */}
        {activeCategory === 'all' || activeCategory === 'urgences' ? (
          <StickyTriageBanner
            emergencyTasks={emergencyTasks}
            onSelectTask={onSelectTask}
          />
        ) : null}
      </div>

      {/* Middle Feed Task List Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Feed Cards */}
        {nonEmergencyFilteredTasks.length === 0 && emergencyTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-xs font-bold text-slate-700">Aucune tâche en attente</p>
            <p className="text-[11px] text-slate-400 mt-1">Vous avez traité toutes les tâches dans cette catégorie.</p>
          </div>
        ) : (
          nonEmergencyFilteredTasks.map(task => {
            const isSelected = selectedTaskId === task.id
            const badgeClass = getBadgeStyle(task.category)
            const categoryLabel = getCategoryLabel(task.category)
            const initial = task.patientName ? task.patientName.charAt(0).toUpperCase() : 'P'

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400/40'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
                )}

                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    task.category === 'urgences' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                  }`}>
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{task.patientName}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">{task.metadata || 'À l\'instant'}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mb-1.5">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${badgeClass}`}>
                        {categoryLabel}
                      </span>

                      {task.status && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
