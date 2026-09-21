import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

// The app's dropdown (replaces the browser's native <select>). Same field look as the other inputs
// (rounded, 44px, blue focus ring); the menu opens with a short animation and supports the keyboard
// (arrows, Enter, Escape). `avatars` shows an initials disc per option (people: doctors, patients).
//   options: [{ value, label, description? }]      value: the selected option's value ('' = none)
const initialsOf = (label) => String(label || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

export default function Select({
  value, onChange, options = [], placeholder = 'Sélectionner…', icon: Icon, avatars = false,
  emptyText = 'Aucun choix disponible', disabled = false, className = '', 'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const listId = useId()
  const reduceMotion = useReducedMotion()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const openMenu = () => { if (disabled) return; setActive(selectedIndex >= 0 ? selectedIndex : 0); setOpen(true) }
  const choose = (opt) => { onChange(opt.value); setOpen(false) }

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) choose(options[active]) }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex h-[44px] w-full items-center gap-2.5 rounded-xl border bg-white px-3.5 text-left text-sm font-medium outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10'
        }`}
      >
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 origin-top overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
          >
            {options.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-400">{emptyText}</li>}
            {options.map((opt, i) => {
              const isSelected = opt.value === value
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-700' : active === i ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {avatars && (
                    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {initialsOf(opt.label)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{opt.label}</span>
                    {opt.description && <span className="block truncate text-xs font-normal text-slate-500">{opt.description}</span>}
                  </span>
                  {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-blue-600" strokeWidth={2.5} />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
