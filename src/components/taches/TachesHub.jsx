import React, { useState } from 'react'
import {
  ShieldCheck,
  Kanban,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  LayoutGrid
} from 'lucide-react'
import Tooltip from './ui/Tooltip'
import GatekeeperStandardView from './GatekeeperStandardView'
import KanbanMatrixView from './KanbanMatrixView'

export default function TachesHub({
  tasks,
  visibleTasks,
  filteredTasks,
  emergencyTasks,
  selectedTask,
  selectedTaskId,
  setSelectedTaskId,
  activeCategory,
  handleCategoryChange,
  searchQuery,
  setSearchQuery,
  roleView,
  setRoleView,
  isBatchMode,
  setIsBatchMode,
  isProcessing,
  handleResolveTask,
  handleApproveAndSend,
  handleArchive,
  handleSignNextPrescription,
  handleSendReply,
  handleAdminResolve,
  remainingPrescriptionCount,
  handleManualRefresh,
  isSpinning,
  setShowAddModal,
  notify
}) {
  // Navigation State: Two Production Views (Mode Standard Triage vs Mode Matrice Kanban)
  const [viewMode, setViewMode] = useState('standard') // 'standard' | 'matrix'

  return (
    <div className="w-full space-y-5">
      {/* 🚀 CLEAN NATIVE TOP HEADER WITH INTEGRATED MODE TOGGLE SWITCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Tâches & Hub Clinique</h1>
            <Tooltip content="Actualiser les données du fil de triage">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
              >
                <RefreshCw size={16} className={isSpinning ? 'animate-spin text-blue-600' : ''} />
              </button>
            </Tooltip>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200/80">
              {roleView === 'doctor' ? 'Vue Docteur' : 'Vue Secrétariat'}
            </span>
          </div>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Suivi clinique en temps réel, triage prioritaire et gestion des flux de soins
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 1. Clean Native UI Toggle (Segmented Control) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck size={14} className={viewMode === 'standard' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Mode Standard (Triage)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban size={14} className={viewMode === 'matrix' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Mode Matrice (Kanban)</span>
            </button>
          </div>

          {/* 2. Role Switcher Button */}
          <Tooltip content="Basculer entre la vue Docteur (dossiers médicaux, ordonnances) et la vue Secrétaire (CNSS, RDV, factures)">
            <button
              type="button"
              onClick={() => setRoleView(v => v === 'doctor' ? 'secretary' : 'doctor')}
              className="h-10 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm text-xs flex items-center gap-1.5"
            >
              <SlidersHorizontal size={15} className="text-blue-600" />
              <span>{roleView === 'doctor' ? 'Vue Secrétaire' : 'Vue Docteur'}</span>
            </button>
          </Tooltip>

          {/* 3. Primary Action Button (Nouvelle Tâche) */}
          <Tooltip content="Créer une nouvelle tâche de suivi clinique ou secrétariat">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-xs flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Nouvelle tâche</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* RENDER SELECTED VIEW MODE */}
      {viewMode === 'standard' ? (
        <GatekeeperStandardView
          tasks={tasks}
          selectedTask={selectedTask}
          selectedTaskId={selectedTaskId}
          setSelectedTaskId={setSelectedTaskId}
          roleView={roleView}
          handleResolveTask={handleResolveTask}
          handleApproveAndSend={handleApproveAndSend}
          handleArchive={handleArchive}
          handleSignNextPrescription={handleSignNextPrescription}
          handleSendReply={handleSendReply}
          handleAdminResolve={handleAdminResolve}
          isProcessing={isProcessing}
          notify={notify}
        />
      ) : (
        <KanbanMatrixView
          tasks={tasks}
          roleView={roleView}
          handleResolveTask={handleResolveTask}
          notify={notify}
        />
      )}
    </div>
  )
}
