import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { AlertCircle, FileText, Pill, MessageSquare, Plus } from 'lucide-react'
import AddTaskModal from '../../components/forms/AddTaskModal'
import { taskToLegacy, loadTasks, saveTasks } from '../../lib/taskHelpers'

import TriageFeed from '../../components/taches/TriageFeed'
import LabResultViewer from '../../components/taches/LabResultViewer'
import PrescriptionViewer from '../../components/taches/PrescriptionViewer'
import PatientMessageViewer from '../../components/taches/PatientMessageViewer'
import AdminTaskViewer from '../../components/taches/AdminTaskViewer'

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, canonicalRole, devRoleOverride, notify } = useAppContext()

  const [showAddModal, setShowAddModal] = useState(false)

  // Role view toggle (doctor vs secretary)
  const isUserDoctor = (canonicalRole || role) === 'doctor' || (canonicalRole || role) === 'docteur' || devRoleOverride === 'doctor'
  const [roleView, setRoleView] = useState(isUserDoctor ? 'doctor' : 'secretary')

  // Initial mock tasks matching rich 3-pane requirements
  const [tasks, setTasks] = useState([
    {
      id: 'task_01',
      category: 'urgences',
      patientName: 'Meryem Tazi',
      description: 'Tension artérielle 185/110',
      metadata: 'Salle d\'attente',
      actionText: 'Traiter',
      icon: AlertCircle,
      status: 'En consultation',
      labData: [
        { param: 'Tension Artérielle', value: '185/110 mmHg', norm: '120/80 mmHg', status: 'high', label: 'CRITIQUE' },
        { param: 'Fréquence Cardiaque', value: '102 bpm', norm: '60-90 bpm', status: 'high', label: 'ÉLEVÉ' },
      ]
    },
    {
      id: 'task_02',
      category: 'resultats',
      patientName: 'Sarah Benali',
      description: 'Bilan sanguin complet & HbA1c',
      metadata: 'Aujourd\'hui 09:30',
      actionText: 'Consulter',
      icon: FileText,
      status: 'Nouveau'
    },
    {
      id: 'task_03',
      category: 'resultats',
      patientName: 'Marc Dupont',
      description: 'ECG & Bilan Lipidique en attente',
      metadata: 'Aujourd\'hui 08:45',
      actionText: 'Consulter',
      icon: FileText,
      status: 'À relire'
    },
    {
      id: 'task_04',
      category: 'prescriptions',
      patientName: 'Ahmed Benali',
      description: 'Ordonnance antihypertenseurs (Amlor 5mg)',
      metadata: 'À signer',
      actionText: 'Signer',
      icon: Pill,
      status: 'À signer'
    },
    {
      id: 'task_05',
      category: 'prescriptions',
      patientName: 'Fatima El Amrani',
      description: 'Renouvellement Diabète & HTA',
      metadata: 'À signer',
      actionText: 'Signer',
      icon: Pill,
      status: 'À signer'
    },
    {
      id: 'task_06',
      category: 'messages',
      patientName: 'Soufiane Kadiri',
      description: 'Question sur effets secondaires du traitement',
      metadata: 'Il y a 2h',
      actionText: 'Répondre',
      icon: MessageSquare,
      status: 'Nouveau'
    },
    {
      id: 'task_07',
      category: 'messages',
      patientName: 'Meryem Tazi',
      description: 'Demande d\'adaptation d\'ordonnance',
      metadata: 'Il y a 4h',
      actionText: 'Répondre',
      icon: MessageSquare,
      status: 'En attente'
    },
    {
      id: 'task_08',
      category: 'facturation',
      patientName: 'Omar Bennani',
      description: 'Anomalie de facturation Mutuelle CNSS',
      metadata: 'Secrétariat',
      actionText: 'Vérifier',
      status: 'Anomalie'
    },
    {
      id: 'task_09',
      category: 'confirmations',
      patientName: 'Karim Amrani',
      description: 'Demande de confirmation RDV Demain',
      metadata: 'Secrétariat',
      actionText: 'Confirmer',
      status: 'À valider'
    }
  ])

  // Category filter state
  const initialCategory = searchParams.get('category') || 'all'
  const [activeCategory, setActiveCategory] = useState(initialCategory)

  // Selection & Mode Rafale State
  const [selectedTaskId, setSelectedTaskId] = useState('task_01')
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Update active category when URL params change
  useEffect(() => {
    const category = searchParams.get('category') || 'all'
    setActiveCategory(category)
  }, [searchParams])

  const handleCategoryChange = (category) => {
    setActiveCategory(category)
    if (category === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ category })
    }
  }

  // Filter tasks based on role view
  const doctorTaskCategories = ['urgences', 'resultats', 'prescriptions', 'messages']
  const secretaryTaskCategories = ['facturation', 'confirmations', 'cnss', 'messages']

  const visibleTasks = tasks.filter(t => {
    if (roleView === 'doctor') {
      return doctorTaskCategories.includes(t.category)
    } else {
      return secretaryTaskCategories.includes(t.category)
    }
  })

  const emergencyTasks = visibleTasks.filter(t => t.category === 'urgences')

  // Find currently selected task
  const selectedTask = visibleTasks.find(t => t.id === selectedTaskId) || visibleTasks[0] || null

  // Ensure valid selection when feed updates
  useEffect(() => {
    if (!selectedTask && visibleTasks.length > 0) {
      setSelectedTaskId(visibleTasks[0].id)
    }
  }, [visibleTasks, selectedTask])

  // Task Resolution Handler: removes completed task and focuses next task in queue
  const handleResolveTask = (taskId, successMessage = 'Tâche traitée avec succès') => {
    setIsProcessing(true)
    setTimeout(() => {
      setTasks(prev => {
        const remaining = prev.filter(t => t.id !== taskId)
        
        // Find next task to auto-focus
        const currentIdx = visibleTasks.findIndex(t => t.id === taskId)
        const nextTask = visibleTasks[currentIdx + 1] || visibleTasks[currentIdx - 1] || remaining[0]

        if (nextTask) {
          setSelectedTaskId(nextTask.id)
        } else {
          setSelectedTaskId(null)
        }

        return remaining
      })

      notify?.({
        title: 'Tâche terminée',
        description: successMessage,
        variant: 'success'
      })

      setIsProcessing(false)
    }, 200)
  }

  // Action handlers
  const handleApproveAndSend = (task, message) => {
    handleResolveTask(task.id, `Résultat approuvé & message WhatsApp/SMS transmis à ${task.patientName}.`)
  }

  const handleArchive = (task) => {
    handleResolveTask(task.id, `Résultat archivé au dossier médical de ${task.patientName}.`)
  }

  const handleSignNextPrescription = (task) => {
    const remainingPrescriptions = tasks.filter(t => t.category === 'prescriptions' && t.id !== task.id)
    if (isBatchMode && remainingPrescriptions.length > 0) {
      // Advance to next prescription automatically in batch mode
      setSelectedTaskId(remainingPrescriptions[0].id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
      notify?.({
        title: 'Ordonnance signée ⚡',
        description: `Ordonnance de ${task.patientName} signée. Passage à la suivante (${remainingPrescriptions.length} restante(s)).`,
        variant: 'success'
      })
    } else {
      handleResolveTask(task.id, `Ordonnance de ${task.patientName} signée électroniquement.`)
      if (isBatchMode) setIsBatchMode(false)
    }
  }

  const handleSendReply = (task, reply) => {
    handleResolveTask(task.id, `Réponse transmise avec succès à ${task.patientName}.`)
  }

  const handleAdminResolve = (task) => {
    handleResolveTask(task.id, `Dossier administratif de ${task.patientName} validé et transmis.`)
  }

  const handleTaskSubmit = (newTask) => {
    const legacyTask = taskToLegacy(newTask)
    const formattedTask = {
      ...legacyTask,
      id: `task_${Date.now()}`
    }
    setTasks(prev => [formattedTask, ...prev])
    setSelectedTaskId(formattedTask.id)

    const existing = loadTasks()
    saveTasks([newTask, ...existing])
    setShowAddModal(false)

    notify?.({
      title: 'Nouvelle tâche créée',
      description: `Tâche créée pour ${formattedTask.patientName}.`,
      variant: 'success'
    })
  }

  // Count remaining prescriptions for Mode Rafale counter
  const remainingPrescriptionCount = tasks.filter(t => t.category === 'prescriptions').length

  return (
    <div className="w-full space-y-4">
      {/* Top Page Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Tâches & Hub Clinique</span>
            <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-200">
              {roleView === 'doctor' ? 'Vue Docteur' : 'Vue Secrétariat'}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Triage prioritaire des urgences, résultats, prescriptions et messages patients
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRoleView(v => v === 'doctor' ? 'secretary' : 'doctor')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
            title="Basculer la vue"
          >
            <span>{roleView === 'doctor' ? '🔁 Vue Secrétaire' : '🔁 Vue Docteur'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Nouvelle tâche</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Left Pane: Triage Feed (~40% width) */}
        <div className="lg:col-span-5 h-full rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col">
          <TriageFeed
            tasks={visibleTasks}
            emergencyTasks={emergencyTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            isBatchMode={isBatchMode}
            onToggleBatchMode={() => setIsBatchMode(!isBatchMode)}
            onOpenAddModal={() => setShowAddModal(true)}
            userRole={role}
            roleView={roleView}
            onToggleRoleView={() => setRoleView(v => v === 'doctor' ? 'secretary' : 'doctor')}
          />
        </div>

        {/* Right Pane: Action Viewer Panel (~60% width) */}
        <div className="lg:col-span-7 h-full rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col">
          {!selectedTask ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="text-4xl mb-3">🩺</div>
              <h3 className="text-base font-bold text-slate-800">Aucune tâche sélectionnée</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Sélectionnez une tâche dans le fil de triage à gauche pour afficher son espace d'action.
              </p>
            </div>
          ) : (
            <>
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
                  onEdit={() => notify?.({ title: 'Éditeur', description: 'Ouverture de l\'éditeur d\'ordonnance...' })}
                  isBatchMode={isBatchMode}
                  batchRemainingCount={remainingPrescriptionCount}
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
                  onContact={() => notify?.({ title: 'Appel', description: `Appel du patient ${selectedTask.patientName}...` })}
                  isProcessing={isProcessing}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleTaskSubmit}
      />
    </div>
  )
}
