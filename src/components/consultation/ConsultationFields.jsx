import { MedicalTextarea } from '../FocusMode'
import { vitalProblem } from '../../lib/encounterService'

export function FieldLabel({ children, required, hint }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-semibold text-slate-800">
        {children}{required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </span>
      {hint && <span className="text-[12px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function NarrativeField({ label, required, hint, value, onChange, placeholder, autoFocus, patientConsultations }) {
  return (
    <div>
      <FieldLabel required={required} hint={hint}>{label}</FieldLabel>
      <MedicalTextarea value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} patientConsultations={patientConsultations} />
    </div>
  )
}

// Previous measurement is shown next to the field and is only used if the doctor
// explicitly clicks "Utiliser": historical values never fill today's field.
function LastValue({ last, onUse }) {
  if (!last) return <p className="mt-1.5 min-h-[16px] text-[11.5px] text-slate-400">&nbsp;</p>
  return (
    <p className="mt-1.5 min-h-[16px] text-[11.5px] text-slate-400">
      Dernière : <span className="font-medium text-slate-500">{last.text}</span>{last.when ? ` · ${last.when}` : ''}
      {onUse && <button type="button" onClick={onUse} className="ml-1.5 font-semibold text-slate-500 underline hover:text-slate-800">Utiliser</button>}
    </p>
  )
}

export function VitalField({ label, unit, value, onChange, placeholder, vitalKey, last, onUseLast }) {
  const problem = vitalKey ? vitalProblem(vitalKey, value) : null
  return (
    <div className={`rounded-lg border bg-white px-3.5 pb-2 pt-3 ${problem ? 'border-amber-400' : 'border-slate-200'}`}>
      <span className="text-[12px] font-medium text-slate-500">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <input type="text" inputMode="decimal" value={value} onChange={onChange} placeholder={placeholder} aria-label={label} aria-invalid={Boolean(problem)}
          className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300" />
        {unit && <span className="shrink-0 text-xs font-medium text-slate-400">{unit}</span>}
      </div>
      {problem ? <p className="mt-1.5 min-h-[16px] text-[11.5px] font-medium text-amber-600">{problem}</p> : <LastValue last={last} onUse={last ? onUseLast : null} />}
    </div>
  )
}

export function BloodPressureField({ systolic, diastolic, onSystolicChange, onDiastolicChange, last, onUseLast }) {
  const filled = (v) => String(v).trim() !== ''
  const problem = vitalProblem('bloodPressureSystolic', systolic) || vitalProblem('bloodPressureDiastolic', diastolic)
    || (filled(systolic) && !filled(diastolic) ? 'Renseignez aussi la diastolique' : null)
    || (!filled(systolic) && filled(diastolic) ? 'Renseignez aussi la systolique' : null)
  return (
    <div className={`rounded-lg border bg-white px-3.5 pb-2 pt-3 ${problem ? 'border-amber-400' : 'border-slate-200'}`}>
      <span className="text-[12px] font-medium text-slate-500">Tension artérielle</span>
      <div className="flex items-baseline gap-2">
        <input type="text" inputMode="numeric" value={systolic} onChange={onSystolicChange} placeholder="120" aria-label="Tension systolique"
          className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300" />
        <span className="text-lg font-light text-slate-300">/</span>
        <input type="text" inputMode="numeric" value={diastolic} onChange={onDiastolicChange} placeholder="80" aria-label="Tension diastolique"
          className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300" />
        <span className="shrink-0 text-xs font-medium text-slate-400">mmHg</span>
      </div>
      {problem ? <p className="mt-1.5 min-h-[16px] text-[11.5px] font-medium text-amber-600">{problem}</p> : <LastValue last={last} onUse={last ? onUseLast : null} />}
    </div>
  )
}
