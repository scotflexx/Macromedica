import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { badgeClass, stepState } from './SectionStepper'

// Two-colour system: neutral/dark for state, green only for "complete". The
// thin top border and the number badge share the stepper's state scheme
// (pending grey / active dark / complete green); there is no per-section hue.
const TOP = { pending: 'border-t-slate-300', active: 'border-t-blue-600', complete: 'border-t-green-600' }

export default function StageSection({ id, index, title, hint, filled, active, refEl, children }) {
  const state = stepState(active, filled)
  return (
    <motion.section
      id={id}
      ref={refEl}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: (index - 1) * 0.05 }}
      className={`rounded-2xl border border-t-[3px] bg-white shadow-sm transition-shadow duration-300 ${TOP[state]} ${active ? 'border-x-slate-300 border-b-slate-300 shadow-md ring-1 ring-slate-300' : 'border-x-slate-200 border-b-slate-200'}`}
    >
      <header className="flex items-center gap-2.5 rounded-t-[14px] border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
        <span data-state={state} className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold transition-colors ${badgeClass(state)}`}>
          {state === 'complete' ? <Check className="h-3 w-3" /> : index}
        </span>
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-slate-700">{title}</h2>
        {hint && <span className="hidden text-[11px] font-normal text-slate-400 md:inline">{hint}</span>}
        <AnimatePresence>
          {filled && (
            <motion.span key="filled" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Renseigné</motion.span>
          )}
        </AnimatePresence>
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </motion.section>
  )
}
