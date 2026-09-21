// Single source of truth for "outside the usual range" vitals. Import these
// constants (not copies of the numbers) anywhere a vital needs a threshold:
// the vitals grid and any future checklist rule about abnormal vitals.
//
// Indicative reference limits at rest; a value is flagged when it is strictly
// outside [low, high] (boundaries are normal). Flags are visual only: they never
// block anything and are not stored.
//
// Age handling:
//  - temperature and SpO2 use the same limits at every age, so they are always
//    checked, even when the patient's age is unknown;
//  - blood pressure and heart rate limits are ADULT limits. They are skipped for
//    a patient known to be under 16 (children have different ranges) and applied
//    when the age is 16+ or unknown.
//  - weight and height have no reference range on their own (BMI is derived
//    elsewhere), so they are never flagged here.
export const ADULT_MIN_AGE = 16

export const VITAL_RANGES = {
  bloodPressure: {
    systolic: { low: 90, high: 140 },
    diastolic: { low: 60, high: 90 },
  },
  heartRate: { low: 60, high: 100 },
  temperature: { low: 35, high: 38 },
  oxygenSaturation: { low: 95 }, // no upper limit
}

const AGE_INDEPENDENT = new Set(['temperature', 'oxygenSaturation'])

const num = (x) => {
  const v = parseFloat(String(x ?? '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

export function isAdultAge(age) {
  return typeof age === 'number' && age >= ADULT_MIN_AGE
}

function applies(key, age) {
  if (AGE_INDEPENDENT.has(key)) return true
  if (age == null) return true // unknown age: use adult limits rather than hide an alert
  return isAdultAge(age)
}

// Returns { level: 'high' | 'low', label } or null.
// `key` is one of: bloodPressure | heartRate | temperature | oxygenSaturation.
export function vitalFlag(key, values, age) {
  if (!applies(key, age)) return null
  switch (key) {
    case 'bloodPressure': {
      const sys = num(values.bloodPressureSystolic)
      const dia = num(values.bloodPressureDiastolic)
      if (sys == null || dia == null) return null
      const r = VITAL_RANGES.bloodPressure
      if (sys > r.systolic.high || dia > r.diastolic.high) return { level: 'high', label: 'Élevée' }
      if (sys < r.systolic.low || dia < r.diastolic.low) return { level: 'low', label: 'Basse' }
      return null
    }
    case 'heartRate': {
      const v = num(values.heartRate)
      if (v == null) return null
      const r = VITAL_RANGES.heartRate
      if (v > r.high) return { level: 'high', label: 'Élevée' }
      if (v < r.low) return { level: 'low', label: 'Basse' }
      return null
    }
    case 'temperature': {
      const v = num(values.temperature)
      if (v == null) return null
      const r = VITAL_RANGES.temperature
      if (v > r.high) return { level: 'high', label: 'Fièvre' }
      if (v < r.low) return { level: 'low', label: 'Basse' }
      return null
    }
    case 'oxygenSaturation': {
      const v = num(values.oxygenSaturation)
      if (v == null) return null
      return v < VITAL_RANGES.oxygenSaturation.low ? { level: 'low', label: 'Basse' } : null
    }
    default:
      return null
  }
}
