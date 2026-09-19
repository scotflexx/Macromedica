import { supabase } from './supabase'

export const VITAL_KEYS = [
  'bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate', 'temperature',
  'respiratoryRate', 'oxygenSaturation', 'weight', 'height',
]

// Same ranges the database enforces on completion (mm_complete_encounter).
export const VITAL_RANGES = {
  bloodPressureSystolic: [40, 300],
  bloodPressureDiastolic: [20, 200],
  heartRate: [20, 300],
  temperature: [25, 45],
  oxygenSaturation: [0, 100],
  weight: [0.3, 500],
  height: [20, 260],
}

export function vitalProblem(key, raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const normalized = text.replace(',', '.')
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(normalized)) return 'Valeur invalide'
  const n = Number(normalized)
  const range = VITAL_RANGES[key]
  if (range && (n < range[0] || n > range[1])) return `Valeur attendue entre ${range[0]} et ${range[1]}`
  return null
}

const MAX_ROWS = 30
const MAX_TEXT = 500
export const DOCUMENT_OPTIONS = ['Certificat médical', 'Arrêt de travail', 'Courrier au confrère', 'Compte-rendu de consultation']
export const DEPUIS_OPTIONS = ['Aujourd\'hui', 'Quelques jours', '1 semaine', 'Plusieurs semaines', 'Autre']
export const EVOLUTION_OPTIONS = ['Stable', 'En amélioration', 'En aggravation', 'Fluctuante']

const str = (x) => (typeof x === 'string' ? x : x == null ? '' : String(x))
const strList = (x) => (Array.isArray(x) ? x.map(str).map((t) => t.trim().slice(0, MAX_TEXT)).filter(Boolean).slice(0, MAX_ROWS) : [])
const treatmentRows = (x) => (Array.isArray(x)
  ? x.filter((r) => r && typeof r === 'object').slice(0, MAX_ROWS).map((r) => ({
      medicament: str(r.medicament).slice(0, MAX_TEXT),
      posologie: str(r.posologie).slice(0, MAX_TEXT),
      duree: str(r.duree).slice(0, MAX_TEXT),
    }))
  : [])

// Canonical shape + key order, so JSON.stringify comparison is stable.
// Blank treatment rows are kept while editing and removed by finalizeNote().
// Older drafts used `diagnostic` (text), `traitement`/`plan` (text),
// `ordonnance` (rows) and `followUp` (delay); they are mapped forward here.
export function normalizeNote(raw) {
  const n = raw && typeof raw === 'object' ? raw : {}
  const v = n.vitals && typeof n.vitals === 'object' ? n.vitals : {}
  const vitals = {}
  for (const k of VITAL_KEYS) vitals[k] = str(v[k])
  const legacyFollowUp = str(n.followUp).trim()
  return {
    motif: str(n.motif),
    depuis: str(n.depuis),
    evolution: str(n.evolution),
    histoire: str(n.histoire),
    vitals,
    examen: str(n.examen),
    diagnostics: strList(n.diagnostics?.length ? n.diagnostics : (str(n.diagnostic).trim() ? [n.diagnostic] : [])),
    conduite: str(n.conduite ?? n.traitement ?? n.plan),
    traitements: treatmentRows(n.traitements ?? (Array.isArray(n.ordonnance) ? n.ordonnance : [])),
    ordonnance: n.ordonnance === true,
    examens: strList(n.examens),
    followUpDate: str(n.followUpDate),
    followUpNotes: str(n.followUpNotes) || (legacyFollowUp && legacyFollowUp !== 'Aucun' ? `Contrôle dans ${legacyFollowUp}` : ''),
    documents: strList(n.documents),
  }
}

export function finalizeNote(raw) {
  const n = normalizeNote(raw)
  const traitements = n.traitements.filter((r) => r.medicament.trim())
  return { ...n, traitements, ordonnance: n.ordonnance && traitements.length > 0 }
}

export function isNoteEmpty(note) {
  const n = normalizeNote(note)
  return !(n.motif.trim() || n.depuis || n.evolution || n.histoire.trim() || n.examen.trim() || n.diagnostics.length
    || n.conduite.trim() || n.traitements.some((r) => r.medicament.trim()) || n.examens.length
    || n.followUpDate || n.followUpNotes.trim() || n.documents.length
    || VITAL_KEYS.some((k) => n.vitals[k].trim()))
}

const ERROR_MAP = [
  ['version conflict', 'conflict', 'Cette consultation a été modifiée dans une autre fenêtre. Rechargez la page pour récupérer la dernière version.'],
  ['motif required', 'motif_required', 'Le motif de consultation est obligatoire.'],
  ['invalid vitals', 'invalid_vitals', 'Une constante vitale est invalide ou hors plage. Vérifiez les valeurs saisies.'],
  ['not editable', 'not_editable', 'Cette consultation est déjà terminée ou abandonnée.'],
  ['not authorized', 'forbidden', 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.'],
  ['not authenticated', 'forbidden', 'Votre session a expiré. Reconnectez-vous.'],
  ['cross-clinic', 'forbidden', 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.'],
  ['note too large', 'too_large', 'La note est trop volumineuse pour être enregistrée.'],
  ['failed to fetch', 'network', 'Connexion indisponible. Vos données restent affichées et seront enregistrées dès le retour du réseau.'],
  ['networkerror', 'network', 'Connexion indisponible. Vos données restent affichées et seront enregistrées dès le retour du réseau.'],
]

export class EncounterError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'EncounterError'
    this.code = code
  }
}

function toEncounterError(error) {
  const raw = String(error?.message || '').toLowerCase()
  for (const [needle, code, message] of ERROR_MAP) {
    if (raw.includes(needle)) return new EncounterError(code, message)
  }
  console.error('[encounter] unexpected error', { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint })
  return new EncounterError('unknown', 'Une erreur est survenue. Vos données restent affichées, réessayez dans un instant.')
}

async function rpc(name, args) {
  let res
  try {
    res = await supabase.rpc(name, args)
  } catch (e) {
    throw toEncounterError(e)
  }
  if (res.error) throw toEncounterError(res.error)
  return res.data
}

export const openEncounter = (patientId, visitId = null) =>
  rpc('mm_open_encounter', { p_patient_id: patientId, p_visit_id: visitId })

export const saveEncounter = (id, note, expectedVersion) =>
  rpc('mm_save_encounter', { p_id: id, p_note: note, p_expected_version: expectedVersion })

export const completeEncounter = (id, note, expectedVersion) =>
  rpc('mm_complete_encounter', { p_id: id, p_note: note, p_expected_version: expectedVersion })

export const voidEncounter = (id) => rpc('mm_void_encounter', { p_id: id })

// Read side (RLS: the owning doctor / clinic admin only).
export async function listCompletedEncounters(patientId) {
  const { data, error } = await supabase
    .from('clinical_encounters')
    .select('id, note, started_at, completed_at, doctor_id')
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100)
  if (error) throw toEncounterError(error)
  return data || []
}

export async function getOpenDraft(patientId) {
  const { data, error } = await supabase
    .from('clinical_encounters')
    .select('id, updated_at, note')
    .eq('patient_id', patientId)
    .eq('status', 'draft')
    .maybeSingle()
  if (error) throw toEncounterError(error)
  return data
}
