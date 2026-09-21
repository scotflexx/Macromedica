import { useState } from 'react'
import { BloodPressureField, VitalField } from './ConsultationFields'
import { vitalFlag } from '../../lib/vitalsRanges'

const GROUP = { bloodPressureSystolic: 'bloodPressure', bloodPressureDiastolic: 'bloodPressure' }
const groupOf = (key) => GROUP[key] || key

// Today's vitals. Fixed field order (nothing jumps while typing); hierarchy is
// visual: missing = dashed and quiet, normal = recedes, abnormal = red left
// border + coloured number + tag. A value copied with "Utiliser" carries an
// explicit "Valeur reportée" tag until the doctor edits it (UI-only, not saved).
export default function VitalsGrid({ vitals, setVital, applyLast, lastVitals, when, age }) {
  const v = vitals
  const [reported, setReported] = useState({})
  const flag = (key) => vitalFlag(key, v, age)
  const last = (raw, suffix) => (raw != null && raw !== '' ? { text: `${raw}${suffix}`, when } : null)
  const [lastSys, lastDia] = String(lastVitals?.blood_pressure || '').split('/')
  const tag = when || 'visite précédente'

  const clear = (group) => setReported((r) => {
    if (!(group in r)) return r
    const next = { ...r }
    delete next[group]
    return next
  })
  const edit = (key) => (e) => { clear(groupOf(key)); return setVital(key)(e) }
  const use = (group, apply) => () => { apply(); setReported((r) => ({ ...r, [group]: tag })) }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
      <BloodPressureField systolic={v.bloodPressureSystolic} diastolic={v.bloodPressureDiastolic}
        onSystolicChange={edit('bloodPressureSystolic')} onDiastolicChange={edit('bloodPressureDiastolic')}
        flag={flag('bloodPressure')} reported={reported.bloodPressure} previousSystolic={lastSys}
        last={lastVitals?.blood_pressure ? { text: `${lastVitals.blood_pressure}`, when } : null}
        onUseLast={use('bloodPressure', () => { if (lastSys && lastDia) { applyLast('bloodPressureSystolic', lastSys.trim()); applyLast('bloodPressureDiastolic', lastDia.trim()) } })} />
      <VitalField vitalKey="heartRate" label="FC" unit="bpm" value={v.heartRate} onChange={edit('heartRate')} placeholder="ex. 72"
        flag={flag('heartRate')} reported={reported.heartRate} previous={lastVitals?.heart_rate} last={last(lastVitals?.heart_rate, ' bpm')}
        onUseLast={use('heartRate', () => applyLast('heartRate', lastVitals.heart_rate))} />
      <VitalField vitalKey="temperature" label="Température" unit="°C" value={v.temperature} onChange={edit('temperature')} placeholder="ex. 37"
        flag={flag('temperature')} reported={reported.temperature} previous={lastVitals?.temperature} last={last(lastVitals?.temperature, ' °C')}
        onUseLast={use('temperature', () => applyLast('temperature', lastVitals.temperature))} />
      <VitalField vitalKey="oxygenSaturation" label="SpO₂" unit="%" value={v.oxygenSaturation} onChange={edit('oxygenSaturation')} placeholder="ex. 98"
        flag={flag('oxygenSaturation')} reported={reported.oxygenSaturation} previous={lastVitals?.spo2} last={last(lastVitals?.spo2, ' %')}
        onUseLast={use('oxygenSaturation', () => applyLast('oxygenSaturation', lastVitals.spo2))} />
      <VitalField vitalKey="weight" label="Poids" unit="kg" value={v.weight} onChange={edit('weight')} placeholder="ex. 70" reported={reported.weight} previous={lastVitals?.weight}
        last={last(lastVitals?.weight, ' kg')} onUseLast={use('weight', () => applyLast('weight', lastVitals.weight))} />
      <VitalField vitalKey="height" label="Taille" unit="cm" value={v.height} onChange={edit('height')} placeholder="ex. 170" reported={reported.height} previous={lastVitals?.height}
        last={last(lastVitals?.height, ' cm')} onUseLast={use('height', () => applyLast('height', lastVitals.height))} />
    </div>
  )
}
