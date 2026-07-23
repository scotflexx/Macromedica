import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, FileText, Pill, MessageSquare, Plus } from 'lucide-react'
import AddTaskModal from '../../components/forms/AddTaskModal'
import {
  getCategoryColor,
  getCategoryIcon,
  taskToLegacy,
  loadTasks,
  saveTasks,
} from '../../lib/taskHelpers'

// Reusable Button component with hover/pressed effects
function ButtonWithEffect({ 
  children, 
  onClick, 
  isActive = false, 
  activeBg = '#1e293b', 
  activeText = '#ffffff', 
  activeBorder = '#0f172a',
  defaultBg = '#ffffff', 
  defaultText = '#475569', 
  defaultBorder = '#e2e8f0',
  hoverBg = '#f8fafc', 
  hoverBorder = '#cbd5e1',
  shadowColor = 'rgba(148,163,184,0.15)',
  ...rest 
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-[0.625rem] font-semibold text-sm"
      style={{
        backgroundColor: isActive ? activeBg : (hovered ? hoverBg : defaultBg),
        color: isActive ? activeText : defaultText,
        border: '2px solid ' + (isActive ? activeBorder : (hovered ? hoverBorder : defaultBorder)),
        padding: '0.625rem 1rem',
        minHeight: '44px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        whiteSpace: 'nowrap',
        fontSize: '14px',
        width: 'auto',
        fontWeight: 'bold',
        transform: pressed ? 'translateY(-1px) scale(0.98)' : hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? `0 6px 16px -4px ${shadowColor}` : 'none',
        ...rest.style
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      {...rest}
    >
      {children}
    </button>
  )
}

function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)

  // Handle new Task schema submission: convert to legacy display shape
  const handleTaskSubmit = (task) => {
    const legacyTask = taskToLegacy(task)
    setTasks((prev) => [{
      ...legacyTask,
      icon: getCategoryIcon(legacyTask.category),
    }, ...prev])
    // Persist
    const existing = loadTasks()
    saveTasks([task, ...existing])
    setShowAddModal(false)
  }
  
  const [tasks, setTasks] = useState([
    {
      id: 1,
      category: 'urgences',
      patientName: 'Meryem Tazi',
      description: 'Tension artérielle 185/110',
      metadata: 'En consultation',
      actionText: 'Traiter',
      icon: AlertCircle,
      status: 'En consultation'
    },
    {
      id: 2,
      category: 'resultats',
      patientName: 'Sarah Benali',
      description: 'ECG reçu',
      metadata: "Aujourd'hui",
      actionText: 'Consulter',
      icon: FileText
    },
    {
      id: 3,
      category: 'resultats',
      patientName: 'Marc Dupont',
      description: 'Bilan sanguin en attente',
      metadata: "Aujourd'hui",
      actionText: 'Consulter',
      icon: FileText
    },
    {
      id: 4,
      category: 'prescriptions',
      patientName: 'Ahmed Benali',
      description: 'Ordonnance antihypertenseurs',
      metadata: 'À signer',
      actionText: 'Signer',
      icon: Pill
    },
    {
      id: 5,
      category: 'prescriptions',
      patientName: 'Fatima El Amrani',
      description: 'Renouvellement',
      metadata: 'À signer',
      actionText: 'Signer',
      icon: Pill
    },
    {
      id: 6,
      category: 'messages',
      patientName: 'Soufiane Kadiri',
      description: 'Message reçu',
      metadata: 'Il y a 2h',
      actionText: 'Répondre',
      icon: MessageSquare
    },
    {
      id: 7,
      category: 'messages',
      patientName: 'Meryem Tazi',
      description: 'Question sur le traitement',
      metadata: 'Il y a 4h',
      actionText: 'Répondre',
      icon: MessageSquare
    }
  ])

  const getCategoryColor = (category) => {
    switch(category) {
      case 'urgences': return { 
        bg: '#fef2f2', 
        text: '#dc2626', 
        badge: '#ef4444',
        hoverBadge: '#dc2626',
        shadow: 'rgba(239,68,68,0.15)'
      }
      case 'resultats': return { 
        bg: '#eff6ff', 
        text: '#2563eb', 
        badge: '#3b82f6',
        hoverBadge: '#2563eb',
        shadow: 'rgba(59,130,246,0.15)'
      }
      case 'prescriptions': return { 
        bg: '#fffbeb', 
        text: '#d97706', 
        badge: '#f59e0b',
        hoverBadge: '#d97706',
        shadow: 'rgba(245,158,11,0.15)'
      }
      case 'messages': return { 
        bg: '#f1f5f9', 
        text: '#64748b', 
        badge: '#94a3b8',
        hoverBadge: '#64748b',
        shadow: 'rgba(148,163,184,0.15)'
      }
      default: return { 
        bg: '#f1f5f9', 
        text: '#64748b', 
        badge: '#94a3b8',
        hoverBadge: '#64748b',
        shadow: 'rgba(148,163,184,0.15)'
      }
    }
  }

  const categories = [
    { key: 'urgences', label: 'Urgences', icon: AlertCircle, count: tasks.filter(t => t.category === 'urgences').length },
    { key: 'resultats', label: 'Résultats à consulter', icon: FileText, count: tasks.filter(t => t.category === 'resultats').length },
    { key: 'prescriptions', label: 'Ordonnances à signer', icon: Pill, count: tasks.filter(t => t.category === 'prescriptions').length },
    { key: 'messages', label: 'Messages patients', icon: MessageSquare, count: tasks.filter(t => t.category === 'messages').length },
  ]

  // Get initial category from search params
  const initialCategory = searchParams.get('category') || 'all'
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  
  // Update active category when search params change
  useEffect(() => {
    const category = searchParams.get('category') || 'all'
    setActiveCategory(category)
  }, [searchParams])
  
  // Update search params when active category changes
  const handleCategoryChange = (category) => {
    setActiveCategory(category)
    if (category === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ category })
    }
  }

  const filteredTasks = activeCategory === 'all' ? tasks : tasks.filter(t => t.category === activeCategory)

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tâches</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Gérez toutes vos tâches du jour</p>
        </div>
        <ButtonWithEffect
          onClick={() => setShowAddModal(true)}
          defaultBg="#2563eb"
          defaultText="#ffffff"
          defaultBorder="#60a5fa"
          hoverBg="#1e40af"
          hoverBorder="#1e3a8a"
          shadowColor="rgba(37,99,235,0.15)"
        >
          <div className="flex items-center gap-2">
            <Plus size={18} />
            Nouvelle tâche
          </div>
        </ButtonWithEffect>
      </div>

      {/* Category Filters */}
      <div className="flex gap-3 mb-6">
        <ButtonWithEffect
          onClick={() => handleCategoryChange('all')}
          isActive={activeCategory === 'all'}
          activeBg="#1e293b"
          activeText="#ffffff"
          activeBorder="#0f172a"
          shadowColor="rgba(30,41,59,0.15)"
        >
          Toutes
        </ButtonWithEffect>

        {categories.map(cat => {
          const Icon = cat.icon
          const colors = getCategoryColor(cat.key)
          return (
            <ButtonWithEffect
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              isActive={activeCategory === cat.key}
              activeBg="#1e293b"
              activeText="#ffffff"
              activeBorder="#0f172a"
              shadowColor="rgba(30,41,59,0.15)"
            >
              <div className="flex items-center gap-2">
                <Icon size={16} />
                {cat.label}
                <span 
                  className="ml-1 text-xs px-2 py-0.5 rounded-full" 
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {cat.count}
                </span>
              </div>
            </ButtonWithEffect>
          )
        })}
      </div>

      {/* Task List */}
      <div className="rounded-[21px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] overflow-hidden">
        {filteredTasks.map(task => {
          const colors = getCategoryColor(task.category)
          const Icon = task.icon
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div 
                className="w-10 h-10 flex items-center justify-center rounded-[10px] flex-shrink-0"
                style={{ backgroundColor: colors.bg }}
              >
                <Icon size={20} style={{ color: colors.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{task.patientName}</p>
                  <span className="text-xs text-slate-400">{task.metadata}</span>
                  {task.status && (
                    <span 
                      className="text-xs font-semibold px-2 py-0.5 rounded-full" 
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {task.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{task.description}</p>
              </div>
              <ButtonWithEffect
                style={{ width: '120px' }}
                defaultBg={colors.badge}
                defaultText="#ffffff"
                defaultBorder={colors.badge}
                hoverBg={colors.hoverBadge}
                hoverBorder={colors.hoverBadge}
                shadowColor={colors.shadow}
              >
                {task.actionText}
              </ButtonWithEffect>
            </div>
          )
        })}
        {filteredTasks.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500 font-medium">Aucune tâche dans cette catégorie</p>
          </div>
        )}
      </div>
      
      {/* Add Task Modal — redesigned */}
      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleTaskSubmit}
      />
    </div>
  )
}

export default TasksPage
