import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Search, Bell, ChevronDown, User, Calendar, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  DUE_DATE_PRESETS,
  REMINDER_PRESETS,
  computeDueDate,
  computeReminderDate,
} from '../../lib/taskHelpers'

// ─── Default assignees (in real app, comes from clinic staff) ─────────────────
const DEFAULT_ASSIGNEES = [
  { id: 'me',       label: 'Moi',           role: 'doctor'    },
  { id: 'sec_01',   label: 'Secrétaire',    role: 'secretary' },
  { id: 'doc_001',  label: 'Dr Ahmed',      role: 'doctor'    },
  { id: 'doc_002',  label: 'Dr Karim',      role: 'doctor'    },
]

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  title: '',
  notes: '',
  type: '',
  priority: 'NORMAL',
  dueDatePreset: 'TODAY',
  customDueDate: '',
  assignedTo: 'me',
  reminderEnabled: false,
  reminderPreset: '1H',
  customReminderDate: '',
}

// ─── Shared input style (inline, guaranteed) ──────────────────────────────────
const PRIMARY = '#2563eb'
const PRIMARY_DARK = '#1d4ed8'
const TEXT = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'

const INPUT_STYLE = {
  width: '100%',
  height: '44px',
  padding: '0 12px',
  borderRadius: '6px',
  border: `1px solid ${BORDER}`,
  fontSize: '13px',
  fontWeight: 400,
  color: TEXT,
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
}

const SELECT_STYLE = {
  ...INPUT_STYLE,
  paddingLeft: '34px',
  paddingRight: '28px',
  appearance: 'none',
  cursor: 'pointer',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
}

const SECTION_STYLE = {
  display: 'grid',
  gap: '12px',
  padding: '0 0 14px',
  borderBottom: `1px solid ${BORDER}`,
}

const SECTION_HEADER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '-2px',
}

const SECTION_TITLE_STYLE = {
  margin: 0,
  color: TEXT,
  fontSize: '13px',
  fontWeight: 700,
  lineHeight: 1.2,
}

const TWO_COLUMN_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form) {
  const errors = {}
  if (!form.title || form.title.trim().length < 3) {
    errors.title = 'La tâche doit contenir au moins 3 caractères.'
  } else if (form.title.trim().length > 150) {
    errors.title = 'Maximum 150 caractères.'
  }
  if (!form.type) {
    errors.type = 'Veuillez sélectionner un type de tâche.'
  }
  return errors
}

// ─── Patient autocomplete ─────────────────────────────────────────────────────
function PatientSearch({ value, patientName, onChange, locked, patients = [] }) {
  const [query, setQuery] = useState(patientName || '')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = patients.filter(
    (p) =>
      query.length >= 1 &&
      `${p.prenom} ${p.nom}`.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setQuery(patientName || '')
  }, [patientName])

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (locked && patientName) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '44px',
          padding: '0 12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          color: '#374151',
          fontSize: '13px',
        }}
        aria-label="Patient sélectionné"
      >
        <User size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
        <span style={{ fontWeight: 600 }}>{patientName}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '11px',
          fontWeight: 500,
          color: '#6b7280',
          backgroundColor: '#e5e7eb',
          padding: '2px 8px',
          borderRadius: '100px',
        }}>
          Consultation en cours
        </span>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={13}
          style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('', '')
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher"
          aria-label="Patient (optionnel)"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          style={{ ...INPUT_STYLE, paddingLeft: '32px', paddingRight: value ? '36px' : '12px' }}
        />
        {value && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setQuery('')
              onChange('', '')
              inputRef.current?.focus()
            }}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              width: '20px', height: '20px', borderRadius: '50%', border: 'none',
              backgroundColor: '#e5e7eb', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Effacer le patient"
          >
            <X size={10} style={{ color: '#6b7280' }} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: '176px',
              overflowY: 'auto', zIndex: 20,
            }}
            role="listbox"
          >
            {filtered.map((p) => {
              const fullName = `${p.prenom} ${p.nom}`
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={value === p.id}
                  onClick={() => {
                    setQuery(fullName)
                    onChange(p.id, fullName)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8' }}>
                      {`${p.prenom[0]}${p.nom[0]}`.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{fullName}</p>
                    {p.telephone && (
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{p.telephone}</p>
                    )}
                  </div>
                  {value === p.id && (
                    <Check size={13} style={{ marginLeft: 'auto', color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * AddTaskModal — redesigned medical task creation modal.
 *
 * Props:
 *   open           – boolean, whether the modal is visible
 *   onClose        – () => void
 *   onSubmit       – (task: Task) => void
 *   context        – optional { patientId, patientName, consultationId } when opened from consultation
 *   currentUser    – optional { id, label, role } for smart defaults
 *   patients       – optional Patient[] from AppContext for autocomplete
 *   assignees      – optional staff list; defaults to DEFAULT_ASSIGNEES
 */
function AutoGrowTextarea({ value, onChange, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(68, el.scrollHeight)}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={2}
      style={{
        ...INPUT_STYLE,
        minHeight: '68px',
        height: '68px',
        padding: '9px 12px',
        resize: 'none',
        lineHeight: 1.45,
        overflow: 'hidden',
      }}
      {...props}
    />
  )
}

function AddTaskModal({
  open,
  onClose,
  onSubmit,
  context = null,
  currentUser = null,
  patients = [],
  assignees = DEFAULT_ASSIGNEES,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const titleRef = useRef(null)
  const modalRef = useRef(null)

  // Build patient list for autocomplete
  const patientList = patients.length > 0
    ? patients
    : [
        { id: 'pat_01', nom: 'Benali', prenom: 'Ahmed', telephone: '+212 661 82 11 54' },
        { id: 'pat_02', nom: 'Chraibi', prenom: 'Fatima', telephone: '+212 623 45 67 81' },
        { id: 'pat_03', nom: 'El Amrani', prenom: 'Fatima', telephone: '' },
        { id: 'pat_04', nom: 'Benali', prenom: 'Sarah', telephone: '' },
        { id: 'pat_05', nom: 'Dupont', prenom: 'Marc', telephone: '' },
        { id: 'pat_06', nom: 'Kadiri', prenom: 'Soufiane', telephone: '' },
        { id: 'pat_07', nom: 'Tazi', prenom: 'Meryem', telephone: '' },
      ]

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return
    const defaultAssignee = currentUser?.id || assignees[0]?.id || 'me'
    const baseForm = {
      ...EMPTY_FORM,
      assignedTo: defaultAssignee,
    }
    if (context?.patientId) {
      baseForm.patientId = context.patientId
      baseForm.patientName = context.patientName || ''
    }
    setForm(baseForm)
    setErrors({})
    setTouched({})
    setTimeout(() => {
      if (context?.patientId) {
        titleRef.current?.focus()
      }
    }, 120)
  }, [open, context, currentUser, assignees])

  // Keyboard support
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  const isValid = useCallback(() => {
    const errs = validate(form)
    return Object.keys(errs).length === 0
  }, [form])

  const handleSubmit = () => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched({ title: true, type: true })
      return
    }

    const dueDate = computeDueDate(form.dueDatePreset, form.customDueDate)
    const reminderAt = form.reminderEnabled
      ? computeReminderDate(form.reminderPreset, form.customReminderDate)
      : undefined

    const task = {
      id: `task_${Date.now()}`,
      patientId: form.patientId || undefined,
      patientName: form.patientName || undefined,
      consultationId: context?.consultationId || undefined,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      type: form.type,
      priority: form.priority,
      status: 'NEW',
      dueDate,
      assignedTo: form.assignedTo,
      reminderAt,
      createdBy: currentUser?.id || 'me',
      createdAt: new Date().toISOString(),
    }
    onSubmit(task)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
  }

  const valid = isValid()

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle tâche"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: 'calc(100vh - 40px)',
          boxShadow: '0 20px 48px rgba(15,23,42,0.14), 0 2px 10px rgba(15,23,42,0.06)',
          border: `1px solid ${BORDER}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '16px 22px 10px',
          flexShrink: 0,
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2 }}>
              Nouvelle tâche
            </h2>
            <p style={{ fontSize: '13px', color: MUTED, margin: '3px 0 0', fontWeight: 400 }}>
              {context?.patientName
                ? `Consultation — ${context.patientName}`
                : 'Ajouter une tâche médicale ou administrative'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: '24px', height: '24px', borderRadius: '6px', border: 'none',
              backgroundColor: '#f9fafb', color: MUTED, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: '16px', marginTop: '2px',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', padding: '14px 22px 12px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1', paddingBottom: '2px' }}>
              <h3 style={SECTION_TITLE_STYLE}>Details</h3>
            </div>

            {/* ── 1. Patient ─────────────────────────────────────────────── */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>
                Patient <span style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 }}>— optionnel</span>
              </label>
              <PatientSearch
                value={form.patientId}
                patientName={form.patientName}
                locked={Boolean(context?.patientId)}
                patients={patientList}
                onChange={(id, name) => {
                  setField('patientId', id)
                  setField('patientName', name)
                }}
              />
            </div>

            {/* ── 2. Titre ───────────────────────────────────────────────── */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="task-title" style={LABEL_STYLE}>
                Tâche <span style={{ color: '#3b82f6' }}>*</span>
              </label>
              <input
                id="task-title"
                ref={titleRef}
                type="text"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                onBlur={() => {
                  setTouched((p) => ({ ...p, title: true }))
                  const errs = validate({ ...form })
                  setErrors((p) => ({ ...p, title: errs.title }))
                }}
                placeholder="Ex: Bilan sanguin"
                maxLength={150}
                aria-required="true"
                aria-invalid={touched.title && Boolean(errors.title)}
                style={{
                  ...INPUT_STYLE,
                  borderColor: touched.title && errors.title ? '#ef4444' : BORDER,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                {touched.title && errors.title ? (
                  <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.title}</span>
                ) : <span />}
                {form.title.length > 100 && (
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{form.title.length}/150</span>
                )}
              </div>
            </div>

            {/* ── 3. Catégorie ───────────────────────────────────────────── */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>
                Catégorie <span style={{ color: '#3b82f6' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="group" aria-label="Type de tâche">
                {TASK_TYPES.map((t) => {
                  const Icon = t.icon
                  const selected = form.type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setField('type', t.value)
                        setErrors((p) => ({ ...p, type: undefined }))
                      }}
                      aria-pressed={selected}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '30px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: `1px solid ${selected ? PRIMARY : BORDER}`,
                        backgroundColor: selected ? PRIMARY : '#fff',
                        color: selected ? '#fff' : '#374151',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <Icon size={11} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
              {touched.type && errors.type && (
                <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '4px' }}>{errors.type}</span>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', padding: '4px 0 2px', borderTop: `1px solid ${BORDER}` }}>
              <h3 style={SECTION_TITLE_STYLE}>Planning</h3>
            </div>

            {/* ── 4. Priorité (col 1) ────────────────────────────────────── */}
            <div>
              <label style={LABEL_STYLE}>Priorité</label>
              <div style={{ display: 'flex', gap: '6px' }} role="group" aria-label="Priorité">
                {TASK_PRIORITIES.map((p) => {
                  const selected = form.priority === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setField('priority', p.value)}
                      aria-pressed={selected}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        height: '32px',
                        borderRadius: '5px',
                        border: `1px solid ${selected ? p.border : '#e5e7eb'}`,
                        backgroundColor: selected ? p.bg : '#fff',
                        color: selected ? p.color : '#9ca3af',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: selected ? p.color : '#d1d5db',
                      }} />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 5. Échéance (col 2) ─────────────────────────────────────── */}
            <div>
              <label htmlFor="due-date" style={LABEL_STYLE}>Échéance</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <select
                  id="due-date"
                  value={form.dueDatePreset}
                  onChange={(e) => setField('dueDatePreset', e.target.value)}
                  style={SELECT_STYLE}
                >
                  {DUE_DATE_PRESETS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
              {form.dueDatePreset === 'CUSTOM' && (
                <input
                  type="date"
                  value={form.customDueDate}
                  onChange={(e) => setField('customDueDate', e.target.value)}
                  style={{ ...INPUT_STYLE, marginTop: '6px' }}
                />
              )}
            </div>

            {/* ── 6. Responsable (col 1) ──────────────────────────────────── */}
            <div style={{ gridColumn: '1 / -1', padding: '4px 0 2px', borderTop: `1px solid ${BORDER}` }}>
              <h3 style={SECTION_TITLE_STYLE}>Assignment & Notes</h3>
            </div>

            <div>
              <label htmlFor="assignee" style={LABEL_STYLE}>Responsable</label>
              <div style={{ position: 'relative' }}>
                <User size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <select
                  id="assignee"
                  value={form.assignedTo}
                  onChange={(e) => setField('assignedTo', e.target.value)}
                  style={SELECT_STYLE}
                >
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* ── 7. Rappel (col 2) ───────────────────────────────────────── */}
            <div>
              <label style={LABEL_STYLE}>Rappel</label>
              <button
                type="button"
                onClick={() => setField('reminderEnabled', !form.reminderEnabled)}
                aria-pressed={form.reminderEnabled}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: `1px solid ${form.reminderEnabled ? PRIMARY : BORDER}`,
                  backgroundColor: form.reminderEnabled ? '#eff6ff' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{
                  width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                  border: `1.5px solid ${form.reminderEnabled ? PRIMARY : '#d1d5db'}`,
                  backgroundColor: form.reminderEnabled ? PRIMARY : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {form.reminderEnabled && (
                    <Check size={9} style={{ color: '#fff' }} strokeWidth={3} />
                  )}
                </span>
                <Bell size={13} style={{ color: form.reminderEnabled ? PRIMARY : '#9ca3af' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: form.reminderEnabled ? PRIMARY_DARK : MUTED }}>
                  {form.reminderEnabled ? 'Rappel activé' : 'Aucun rappel'}
                </span>
              </button>
            </div>

            {/* ── Expanded Reminder Presets ────────────────────────────────── */}
            {form.reminderEnabled && (
              <div style={{
                gridColumn: '1 / -1',
                backgroundColor: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: '6px',
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {REMINDER_PRESETS.map((r) => {
                    const selected = form.reminderPreset === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setField('reminderPreset', r.value)}
                        aria-pressed={selected}
                        style={{
                          height: '26px',
                          padding: '0 10px',
                          borderRadius: '5px',
                          border: `1px solid ${selected ? PRIMARY : BORDER}`,
                          backgroundColor: selected ? '#eff6ff' : '#fff',
                          color: selected ? PRIMARY : MUTED,
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    )
                  })}
                </div>
                {form.reminderPreset === 'CUSTOM' && (
                  <input
                    type="datetime-local"
                    value={form.customReminderDate}
                    onChange={(e) => setField('customReminderDate', e.target.value)}
                    style={{ ...INPUT_STYLE, marginTop: '8px' }}
                  />
                )}
              </div>
            )}

            {/* ── 8. Notes ────────────────────────────────────────────────── */}
            <div style={{ gridColumn: '1 / -1', order: 9 }}>
              <label htmlFor="task-notes" style={LABEL_STYLE}>
                Notes <span style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 }}>— optionnel</span>
              </label>
              <AutoGrowTextarea
                id="task-notes"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Contexte utile"
              />
            </div>

          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '10px 22px',
          borderTop: `1px solid ${BORDER}`,
          flexShrink: 0,
          backgroundColor: '#f9fafb',
          borderRadius: '0 0 12px 12px',
        }}>
          <FooterButton variant="ghost" onClick={onClose}>
            Annuler
          </FooterButton>
          <FooterButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!valid}
            onMouseEnter={() => {
              if (!valid) {
                setTouched({ title: true, type: true })
                setErrors(validate(form))
              }
            }}
          >
            Créer la tâche
          </FooterButton>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Footer buttons ───────────────────────────────────────────────────────────
function FooterButton({ children, onClick, variant = 'ghost', disabled = false, onMouseEnter }) {
  const [hovered, setHovered] = useState(false)

  const baseStyle = {
    flex: 1,
    height: '38px',
    padding: '0 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s ease',
    opacity: disabled ? 0.5 : 1,
  }

  const primaryStyle = {
    ...baseStyle,
    backgroundColor: hovered && !disabled ? PRIMARY_DARK : PRIMARY,
    color: '#fff',
    boxShadow: !disabled ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
  }

  const ghostStyle = {
    ...baseStyle,
    backgroundColor: hovered ? '#f3f4f6' : '#fff',
    color: '#374151',
    border: `1px solid ${BORDER}`,
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={variant === 'primary' ? primaryStyle : ghostStyle}
      onMouseEnter={() => {
        setHovered(true)
        onMouseEnter?.()
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

export default AddTaskModal
