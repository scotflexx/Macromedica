import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import SuggestionPanel from './SuggestionPanel'
import Button from '../common/Button'

// The one "Suggestions" affordance for every free-text field. It always lives in
// the field's label row (right side) and always behaves the same way: a popover
// anchored under the trigger, holding the searchable suggestion chips grouped
// in scrollable categories. Picking a chip inserts it into the field; the
// popover stays open so several can be added, and closes on Escape, an outside
// click, or the trigger again.
//
// Open state and active category are owned by the field (controlled) so the
// selected-suggestion tags under the textarea can reopen the panel on a
// specific category.
export default function SuggestionsTrigger({ kind, value, onChange, open, onOpenChange, group, onGroupChange }) {
  const box = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) onOpenChange(false) }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onOpenChange(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onOpenChange])

  return (
    <span ref={box} className="relative inline-flex">
      <Button variant={open ? 'primary' : 'ghost'} size="xs" className="gap-1 !px-1.5 !font-medium" onClick={() => onOpenChange(!open)} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup="dialog">
        <Sparkles className="h-3 w-3" /> Suggestions
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div id={panelId} role="dialog" aria-label="Suggestions"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-30 mt-1.5 w-[min(580px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
            <SuggestionPanel bare kind={kind} value={value} onChange={onChange} group={group} onGroupChange={onGroupChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
