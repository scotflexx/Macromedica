import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

// Badge states, identical for every step (and mirrored in StageSection):
//   complete -> green check      active -> dark/filled number      pending -> neutral grey number
export function badgeClass(state, onDark = false) {
  if (state === 'complete') return 'bg-green-600 text-white'
  if (state === 'active') return onDark ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
  return 'bg-slate-200 text-slate-600'
}

export function stepState(active, filled) {
  return filled ? 'complete' : active ? 'active' : 'pending'
}

// The one navigation pattern: a sticky bar that drives an animated scroll and
// stays synced with the section in view. `filled` maps step id -> has data.
// Progress is carried by the badges themselves (green check per completed
// section) and by the sidebar's "Consultation en cours" panel; there is no
// separate progress strip.
// Below `sm` only the active tab shows its label so all tabs fit without a
// horizontal scroll; every tab keeps an accessible name.
export default function SectionStepper({ steps, activeId, filled, onSelect }) {
  return (
    <nav aria-label="Sections" className="sticky top-0 z-10 -mx-5 mb-6 border-b border-slate-200 bg-slate-50/95 px-5 pt-2.5 backdrop-blur lg:-mx-8 lg:px-8">
      <div className="flex gap-1 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((s, i) => {
          const active = activeId === s.id
          const state = stepState(active, filled[s.id])
          return (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)} aria-current={active ? 'step' : undefined} aria-label={s.label} title={s.label} data-state={state}
              className={`relative flex flex-shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors sm:px-3.5 ${active ? 'text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
              {active && (
                <motion.span layoutId="stepper-active-pill" className="absolute inset-0 rounded-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold transition-colors ${badgeClass(state, active)}`}>
                {state === 'complete' ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={`relative ${active ? '' : 'hidden sm:inline'}`}>{s.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
