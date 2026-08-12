import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { AlertCircle, FileText, Pill, MessageSquare } from 'lucide-react'
import AddTaskModal from '../../components/forms/AddTaskModal'
import { taskToLegacy, loadTasks, saveTasks } from '../../lib/taskHelpers'
import TachesHub from '../../components/taches/TachesHub'

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, canonicalRole, devRoleOverride, notify, updateVisitStatus, visits = [] } = useAppContext()

  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)

  // Role view toggle (doctor vs secretary)
  const isUserDoctor = (canonicalRole || role) === 'doctor' || (canonicalRole || role) === 'docteur' || devRoleOverride === 'doctor'
  const [roleView, setRoleView] = useState(isUserDoctor ? 'doctor' : 'secretary')

  // Initial mock tasks matching rich requirements
  const [tasks, setTasks] = useState([
    {
      id: 'task_01',
      category: 'urgences',
      patientName: 'Meryem Tazi',
      description: 'Tension artérielle 185/110',
      metadata: 'Salle d\'attente',
      actionText: 'Traiter',
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
      status: 'Nouveau'
    },
    {
      id: 'task_03',
      category: 'resultats',
      patientName: 'Marc Dupont',
      description: 'ECG & Bilan Lipidique en attente',
      metadata: 'Aujourd\'hui 08:45',
      actionText: 'Consulter',
      status: 'À relire'
    },
    {
      id: 'task_04',
      category: 'prescriptions',
      patientName: 'Ahmed Benali',
      description: 'Ordonnance antihypertenseurs (Amlor 5mg)',
      metadata: 'À signer',
      actionText: 'Signer',
      status: 'À signer'
    },
    {
      id: 'task_05',
      category: 'prescriptions',
      patientName: 'Fatima El Amrani',
      description: 'Renouvellement Diabète & HTA',
      metadata: 'À signer',
      actionText: 'Signer',
      status: 'À signer'
    },
    {
      id: 'task_06',
      category: 'messages',
      patientName: 'Soufiane Kadiri',
      description: 'Question sur effets secondaires du traitement',
      metadata: 'Il y a 2h',
      actionText: 'Répondre',
      status: 'Nouveau'
    },
    {
      id: 'task_07',
      category: 'messages',
      patientName: 'Meryem Tazi',
      description: 'Demande d\'adaptation d\'ordonnance',
      metadata: 'Il y a 4h',
      actionText: 'Répondre',
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
    },
    {
      id: 'task_10',
      category: 'cnss',
      patientName: 'Lina Mansouri',
      description: 'Dossier prise en charge CNOPS à transmettre',
      metadata: 'Secrétariat',
      actionText: 'Transmettre',
      status: 'En attente'
    },
    {
      id: 'task_11',
      category: 'facturation',
      patientName: 'Mehdi Cherkaoui',
      description: 'Règlement Impayé Consultation',
      metadata: 'Secrétariat',
      actionText: 'Relancer',
      status: 'Impayé'
    }
  ])

  // Real-time listener for automated Facturation <-> Tasks Sync
  useEffect(() => {
    const handlePaymentsChanged = () => {
      // Find pending or partial payment visits that need secretary task attention
      const billingVisits = (visits || []).filter(v => v.status === 'billing' || (v.remaining_balance && v.remaining_balance > 0))
      
      if (billingVisits.length === 0) return

      setTasks(prevTasks => {
        const existingTaskIds = new Set(prevTasks.map(t => t.id))
        const newBillingTasks = billingVisits
          .filter(v => !existingTaskIds.has(v.id) && !existingTaskIds.has(`task_${v.id}`))
          .map(v => ({
            id: `task_${v.id}`,
            visit_id: v.id,
            category: 'facturation',
            patientName: v.patients ? `${v.patients.prenom || ''} ${v.patients.nom || ''}`.trim() : (v.patient_name || 'Patient'),
            description: `Facture / Reste à régler (${v.remaining_balance || v.billing_amount || 300} MAD)`,
            metadata: 'Facturation',
            actionText: 'Régler',
            status: 'À régler',
            amount: v.billing_amount || 300
          }))

        return newBillingTasks.length > 0 ? [...newBillingTasks, ...prevTasks] : prevTasks
      })
    }

    window.addEventListener('mm:payments-changed', handlePaymentsChanged)
    return () => window.removeEventListener('mm:payments-changed', handlePaymentsChanged)
  }, [visits])

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

  const handleManualRefresh = () => {
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 600)
  }

  // Filter tasks based on role view & search query
  const doctorTaskCategories = ['urgences', 'resultats', 'prescriptions', 'messages']
  const secretaryTaskCategories = ['facturation', 'confirmations', 'cnss']

  const isDoctorView = roleView === 'doctor'

  const visibleTasks = tasks.filter(t => {
    const matchesRole = isDoctorView
      ? doctorTaskCategories.includes(t.category)
      : secretaryTaskCategories.includes(t.category)

    if (!matchesRole) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        t.patientName?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      )
    }

    return true
  })

  const filteredTasks = activeCategory === 'all'
    ? visibleTasks
    : visibleTasks.filter(t => t.category === activeCategory)

  const emergencyTasks = visibleTasks.filter(t => t.category === 'urgences')

  const selectedTask = filteredTasks.find(t => t.id === selectedTaskId) || filteredTasks[0] || null

  useEffect(() => {
    if (!selectedTask && filteredTasks.length > 0) {
      setSelectedTaskId(filteredTasks[0].id)
    }
  }, [filteredTasks, selectedTask])

  // 🚀 AUTOMATED TASK RESOLUTION & FACTURATION SYNC
  const handleResolveTask = (taskId, successMessage = 'Tâche traitée avec succès') => {
    setIsProcessing(true)
    const targetTask = tasks.find(t => t.id === taskId)

    // Synchronize Facturation payment state if resolving a billing/facturation task
    if (targetTask && (targetTask.category === 'facturation' || targetTask.visit_id)) {
      const vId = targetTask.visit_id || targetTask.id
      if (updateVisitStatus) {
        updateVisitStatus(vId, 'completed', {
          amount: targetTask.amount || 300,
          reste: 0,
          method: 'cash'
        })
      }
      window.dispatchEvent(new CustomEvent('mm:payments-changed'))
    }

    setTimeout(() => {
      setTasks(prev => {
        const remaining = prev.filter(t => t.id !== taskId)
        
        const currentIdx = filteredTasks.findIndex(t => t.id === taskId)
        const nextTask = filteredTasks[currentIdx + 1] || filteredTasks[currentIdx - 1] || remaining[0]

        if (nextTask) {
          setSelectedTaskId(nextTask.id)
        } else {
          setSelectedTaskId(null)
        }

        return remaining
      })

      notify?.({
        title: 'Tâche terminée & Synchronisée ⚡',
        description: successMessage,
        variant: 'success'
      })

      setIsProcessing(false)
    }, 200)
  }

  const handleApproveAndSend = (task, message) => {
    handleResolveTask(task.id, `Résultat approuvé & message WhatsApp/SMS transmis à ${task.patientName}.`)
  }

  const handleArchive = (task) => {
    handleResolveTask(task.id, `Résultat archivé au dossier médical de ${task.patientName}.`)
  }

  const handleSignNextPrescription = (task) => {
    const remainingPrescriptions = tasks.filter(t => t.category === 'prescriptions' && t.id !== task.id)
    if (isBatchMode && remainingPrescriptions.length > 0) {
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

  const remainingPrescriptionCount = tasks.filter(t => t.category === 'prescriptions').length

  return (
    <>
      <TachesHub
        tasks={tasks}
        visibleTasks={visibleTasks}
        filteredTasks={filteredTasks}
        emergencyTasks={emergencyTasks}
        selectedTask={selectedTask}
        selectedTaskId={selectedTaskId}
        setSelectedTaskId={setSelectedTaskId}
        activeCategory={activeCategory}
        handleCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleView={roleView}
        setRoleView={setRoleView}
        isBatchMode={isBatchMode}
        setIsBatchMode={setIsBatchMode}
        isProcessing={isProcessing}
        handleResolveTask={handleResolveTask}
        handleApproveAndSend={handleApproveAndSend}
        handleArchive={handleArchive}
        handleSignNextPrescription={handleSignNextPrescription}
        handleSendReply={handleSendReply}
        handleAdminResolve={handleAdminResolve}
        remainingPrescriptionCount={remainingPrescriptionCount}
        handleManualRefresh={handleManualRefresh}
        isSpinning={isSpinning}
        setShowAddModal={setShowAddModal}
        notify={notify}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleTaskSubmit}
      />
    </>
  )
}
