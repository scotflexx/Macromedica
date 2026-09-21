import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { MedicalTextarea } from '../FocusMode'
import { vitalProblem } from '../../lib/encounterService'
import SuggestionsTrigger from './SuggestionsTrigger'
import SelectedSuggestions from './SelectedSuggestions'
import { SUGGESTIONS_BY_KIND } from '../../data/clinicalSuggestions'
import { findSelected, removePhrase } from '../../lib/suggestionText'
import Button from '../common/Button'

export function FieldLabel({ children, required, hint, action, emphasis = false }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className={emphasis ? 'text-[14.5px] font-bold text-slate-900' : 'text-[13px] font-semibold text-slate-900'}>
        {children}{required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </span>
      <span className="flex items-center gap-3">
        {hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
        {action}
      </span>
    </div>
  )
}

// Says what the amount is used for; deliberately a badge, not an optionality hint.
export function BillingPill({ children = 'Facturé à la caisse' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      <Banknote className="h-3 w-3" /> {children}
    </span>
  )
}

// Text areas start compact and grow with their content (browsers without
// field-sizing simply keep the resizable minimum height).
// Focus is the dark brand colour (border + caret), scoped here so the shared
// .medical-textarea styles used elsewhere are untouched.
const DARK_FOCUS = '[&_.medical-textarea]:caret-slate-900 focus-within:border-slate-900'
const SIZES = {
  sm: `${DARK_FOCUS} [&_.medical-textarea]:min-h-[76px] [&_.medical-textarea]:max-h-[320px] [&_.medical-textarea]:[field-sizing:content]`,
  md: `${DARK_FOCUS} [&_.medical-textarea]:min-h-[76px] [&_.medical-textarea]:max-h-[320px] [&_.medical-textarea]:[field-sizing:content]`,
  lg: `${DARK_FOCUS} [&_.medical-textarea]:min-h-[76px] [&_.medical-textarea]:max-h-[320px] [&_.medical-textarea]:[field-sizing:content]`,
}

export function NarrativeField({
  label, required, hint, value, onChange, placeholder, autoFocus, patientConsultations,
  size = 'md', emphasis = false, suggestKind,
}) {
  // The panel's open state and category live here so the tags below the textarea
  // can reopen it on the category a phrase belongs to.
  const cfg = suggestKind ? SUGGESTIONS_BY_KIND[suggestKind] : null
  const [panelOpen, setPanelOpen] = useState(false)
  const [group, setGroup] = useState(cfg ? cfg.data[0].group : null)
  const selected = cfg ? findSelected(cfg.data, value) : []
  return (
    <div>
      <FieldLabel required={required} hint={hint} emphasis={emphasis}
        action={suggestKind ? <SuggestionsTrigger kind={suggestKind} value={value} onChange={onChange} open={panelOpen} onOpenChange={setPanelOpen} group={group} onGroupChange={setGroup} /> : null}>
        {label}
      </FieldLabel>
      <div className={emphasis ? 'rounded-xl ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-slate-900' : ''}>
        <MedicalTextarea className={SIZES[size] || SIZES.md} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} patientConsultations={patientConsultations} />
      </div>
      {cfg && <SelectedSuggestions items={selected} onOpen={(s) => { setGroup(s.group); setPanelOpen(true) }} onRemove={(s) => onChange(removePhrase(value, s.text, cfg.joiner))} />}
    </div>
  )
}

const toNum = (x) => {
  const n = parseFloat(String(x ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Direction vs the previous measurement: arrow + signed delta. Neutral on
// purpose (a change is information, not an alert; alerts come from the ranges).
function Trend({ current, previous }) {
  const cur = toNum(current)
  const prev = toNum(previous)
  if (cur == null || prev == null) return null
  const d = Math.round((cur - prev) * 10) / 10
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→'
  const text = d === 0 ? 'stable' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`
  return <span data-trend={arrow} title="Variation depuis la mesure précédente" className="shrink-0 font-semibold text-slate-600">{arrow} {text}</span>
}

// Previous measurement is shown under the field and is only used if the doctor
// explicitly clicks "Utiliser": historical values never fill today's field. When
// today's value exists, the trend vs that measurement sits on the same line.
function LastValue({ last, onUse, current, previous }) {
  if (!last) return null
  return (
    <p className="flex min-h-[15px] items-baseline justify-between gap-2 text-[11px] text-slate-400">
      <span className="min-w-0 truncate">
        Dernière : <span className="font-medium text-slate-500">{last.text}</span>{last.when ? ` · ${last.when}` : ''}
        {onUse && <Button variant="link" className="ml-1.5 !text-[11px] text-slate-500" onClick={onUse}>Utiliser</Button>}
      </span>
      <Trend current={current} previous={previous} />
    </p>
  )
}

// status: 'missing' (dashed, quiet) | 'ok' (recedes) | 'abnormal' (the reserved
// alert colour: red left border + number) | 'problem' (implausible/malformed
// input: neutral dark, it is a typing issue, not a clinical alert).
const BOX = {
  missing: 'border-dashed border-slate-300 bg-white/60',
  ok: 'border-slate-200 bg-slate-50',
  abnormal: 'border-red-200 border-l-[4px] border-l-red-600 bg-red-50/60',
  problem: 'border-slate-900 bg-white',
}

// Empty fields show a quiet, small, normal-weight hint so a placeholder is never
// mistaken for a (greyed-out) value.
const INPUT = 'w-full min-w-0 bg-transparent text-xl font-bold leading-tight outline-none placeholder:text-[15px] placeholder:font-normal placeholder:text-slate-300'
const VALUE_TONE = { abnormal: 'text-red-700', ok: 'text-slate-800', missing: 'text-slate-900', problem: 'text-slate-900' }

function FlagTag({ flag }) {
  if (!flag) return null
  return (
    <span className="rounded-full bg-red-100 px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide text-red-800">
      {flag.level === 'high' ? '↑' : '↓'} {flag.label}
    </span>
  )
}

// A value the doctor copied from a previous visit (not measured today).
function ReportedTag({ text }) {
  if (!text) return null
  return <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-200">Valeur reportée · {text}</span>
}

export function VitalField({ label, unit, value, onChange, placeholder, vitalKey, last, onUseLast, flag, reported, previous }) {
  const problem = vitalKey ? vitalProblem(vitalKey, value) : null
  const filled = String(value).trim() !== ''
  const status = problem ? 'problem' : !filled ? 'missing' : flag ? 'abnormal' : 'ok'
  return (
    <div className={`rounded-lg border px-3 pb-1 pt-1.5 transition-colors ${BOX[status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className={`text-[11.5px] font-semibold leading-tight ${status === 'missing' ? 'text-slate-500' : 'text-slate-600'}`}>{label}</span>
        <span className="flex flex-wrap items-center gap-1">
          {filled && <ReportedTag text={reported} />}
          {!problem && <FlagTag flag={flag} />}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <input type="text" inputMode="decimal" value={value} onChange={onChange} placeholder={placeholder} aria-label={label} aria-invalid={Boolean(problem)}
          className={`${INPUT} ${VALUE_TONE[status]}`} />
        {unit && <span className="shrink-0 text-[11px] font-medium text-slate-400">{unit}</span>}
      </div>
      {problem ? <p className="mt-0.5 min-h-[15px] text-[11px] font-medium text-slate-700">{problem}</p> : <LastValue last={last} onUse={last ? onUseLast : null} current={value} previous={previous} />}
    </div>
  )
}

export function BloodPressureField({ systolic, diastolic, onSystolicChange, onDiastolicChange, last, onUseLast, flag, reported, previousSystolic }) {
  const filled = (v) => String(v).trim() !== ''
  const problem = vitalProblem('bloodPressureSystolic', systolic) || vitalProblem('bloodPressureDiastolic', diastolic)
    || (filled(systolic) && !filled(diastolic) ? 'Renseignez aussi la diastolique' : null)
    || (!filled(systolic) && filled(diastolic) ? 'Renseignez aussi la systolique' : null)
  const any = filled(systolic) || filled(diastolic)
  const status = problem ? 'problem' : !any ? 'missing' : flag ? 'abnormal' : 'ok'
  return (
    <div className={`rounded-lg border px-3 pb-1 pt-1.5 transition-colors ${BOX[status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className={`text-[11.5px] font-semibold leading-tight ${status === 'missing' ? 'text-slate-500' : 'text-slate-600'}`}>Tension</span>
        <span className="flex flex-wrap items-center gap-1">
          {any && <ReportedTag text={reported} />}
          {!problem && <FlagTag flag={flag} />}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <input type="text" inputMode="numeric" value={systolic} onChange={onSystolicChange} placeholder="120" aria-label="Tension systolique"
          className={`${INPUT} ${VALUE_TONE[status]}`} />
        <span className="text-lg font-light text-slate-300">/</span>
        <input type="text" inputMode="numeric" value={diastolic} onChange={onDiastolicChange} placeholder="80" aria-label="Tension diastolique"
          className={`${INPUT} ${VALUE_TONE[status]}`} />
        <span className="shrink-0 text-[11px] font-medium text-slate-400">mmHg</span>
      </div>
      {problem ? <p className="mt-0.5 min-h-[15px] text-[11px] font-medium text-slate-700">{problem}</p> : <LastValue last={last} onUse={last ? onUseLast : null} current={systolic} previous={previousSystolic} />}
    </div>
  )
}
