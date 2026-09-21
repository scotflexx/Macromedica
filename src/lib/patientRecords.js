import { normalizeNote } from './encounterService'

// Dossier records derived from a patient's completed consultations (clinical_encounters).
// The consultation flow stores prescribed treatments and complementary exams inside each
// encounter's note, not in the legacy `documents` table, so the dossier tabs read them here.
// Input: the rows of listCompletedEncounters(patientId) (already scoped to one patient).

const encounterDate = (enc) => enc.completed_at || enc.started_at

// One ordonnance per consultation that prescribed at least one treatment.
export function ordonnancesFromEncounters(encounters = []) {
  return encounters.flatMap((enc) => {
    const note = normalizeNote(enc.note)
    const lines = note.traitements
      .filter((row) => row.medicament.trim())
      .map((row) => ({ medicament: row.medicament.trim(), posologie: row.posologie?.trim() || '', duree: row.duree?.trim() || '' }))
    if (lines.length === 0) return []
    return [{
      id: `ord-${enc.id}`,
      date: encounterDate(enc),
      motif: note.motif.split('\n')[0].trim(),
      diagnostics: note.diagnostics,
      lines,
    }]
  })
}

// One entry per consultation that ordered at least one complementary exam.
export function examensFromEncounters(encounters = []) {
  return encounters.flatMap((enc) => {
    const note = normalizeNote(enc.note)
    const items = note.examens.map((x) => String(x).trim()).filter(Boolean)
    if (items.length === 0) return []
    return [{ id: `exa-${enc.id}`, date: encounterDate(enc), motif: note.motif.split('\n')[0].trim(), items }]
  })
}
