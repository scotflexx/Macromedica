// Per-device usage counter for actes typed into the "Ajouter un acte" modal.
//
// Why it exists: actes added during a consultation are not persisted anywhere
// yet (PatientWorkspace "Branchement futur"; nothing reads `sessionActes`), so
// there is no server-side record of which actes a doctor really uses. Until that
// exists, counting here makes "most used" real from the first acte a doctor adds.
// It stores only acte names, amounts and counts (no patient data), keyed by
// clinic + user so one browser shared by two accounts or clinics never mixes.
// Server-side tables (facture_lignes, actes_catalogue) are merged on top in
// acteSuggestions.js.
const MAX_ENTRIES = 100
const keyOf = (scope) => `mm-actes-usage:${scope}`
const fold = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const usageScope = (clinicId, userId) => (clinicId && userId ? `${clinicId}:${userId}` : null)

// -> [{ label, count, price, last }]  (never throws: storage may be unavailable)
export function readActeUsage(scope) {
  if (!scope) return []
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(scope)) || '[]')
    return Array.isArray(raw)
      ? raw.filter((e) => e && typeof e.label === 'string' && e.label.trim()).map((e) => ({ label: e.label, count: Number(e.count) || 1, price: Number(e.price) || 0, last: Number(e.last) || 0 }))
      : []
  } catch { return [] }
}

export function recordActeUse(scope, { name, montant }) {
  const label = String(name || '').trim().replace(/\s+/g, ' ')
  if (!scope || !label) return
  try {
    const list = readActeUsage(scope)
    const k = fold(label)
    const price = Number(montant) || 0
    const hit = list.find((e) => fold(e.label) === k)
    if (hit) { hit.count += 1; hit.last = Date.now(); hit.label = label; if (price > 0) hit.price = price } else list.push({ label, count: 1, price, last: Date.now() })
    list.sort((a, b) => b.count - a.count || b.last - a.last)
    localStorage.setItem(keyOf(scope), JSON.stringify(list.slice(0, MAX_ENTRIES)))
  } catch { /* storage unavailable: suggestions just don't learn on this device */ }
}
