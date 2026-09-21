import { useMemo, useState } from 'react'
import { AlertTriangle, Plus, Search, X } from 'lucide-react'
import { DIAGNOSTICS, PLANS } from '../../data/clinicalSuggestions'
import { DOCUMENT_OPTIONS } from '../../lib/encounterService'
import { FieldLabel } from './ConsultationFields'
import Button from '../common/Button'
import Chip, { Tag } from '../common/Chip'
import IconButton from '../common/IconButton'

const clinicToday = () => new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' })
const inputCls = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300'
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// ---- allergy check (name-based, accent-insensitive) ----
export function allergyTokens(allergies) {
  return fold(allergies).split(/[,;/\n]+/).map((t) => t.trim()).filter((t) => t.length >= 3 && t !== 'aucune')
}
export function allergyMatch(name, tokens) {
  const n = fold(name).trim()
  if (n.length < 3) return null
  return tokens.find((t) => n.includes(t) || t.includes(n)) || null
}

// Visual weight follows real-world frequency, expressed with the shared Button:
//   primary -> used almost every consultation (Traitement, Actes): outlined
//   quiet   -> sometimes (Examens): ghost
//   faint   -> occasionally (Documents): small muted ghost
const ADD_VARIANTS = {
  primary: { variant: 'secondary', size: 'sm', className: '' },
  quiet: { variant: 'ghost', size: 'sm', className: '' },
  faint: { variant: 'ghost', size: 'xs', className: '!text-slate-400 hover:!text-slate-700' },
}

export function AddButton({ children, onClick, disabled, variant = 'quiet' }) {
  const v = ADD_VARIANTS[variant]
  return (
    <Button variant={v.variant} size={v.size} className={v.className} onClick={onClick} disabled={disabled}>
      <Plus className={variant === 'faint' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> {children}
    </Button>
  )
}

// Container for the blocks used in nearly every consultation.
export function Panel({ children }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">{children}</div>
}

const ALL_DIAGNOSES = DIAGNOSTICS.flatMap((g) => g.items).map((i) => (i.code ? `${i.text} (${i.code})` : i.text))

// Diagnoses: search the existing library or type free text; several allowed.
export function DiagnosisPicker({ items, onChange }) {
  const [text, setText] = useState('')
  const q = fold(text.trim())
  const matches = useMemo(() => (q.length < 2 ? [] : [...new Set(ALL_DIAGNOSES)].filter((d) => fold(d).includes(q) && !items.includes(d)).slice(0, 8)), [q, items])
  const add = (label) => {
    const t = label.trim()
    if (!t || items.some((x) => x.toLowerCase() === t.toLowerCase()) || items.length >= 30) return
    onChange([...items, t]); setText('')
  }
  return (
    <div>
      <FieldLabel hint="Facultatif · plusieurs possibles">Diagnostic / hypothèses</FieldLabel>
      {items.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{items.map((d) => <Tag key={d} label={d} onRemove={() => onChange(items.filter((x) => x !== d))}>{d}</Tag>)}</div>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input className={`${inputCls} pl-9`} value={text} onChange={(e) => setText(e.target.value)} aria-label="Rechercher ou saisir un diagnostic"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text) } }} placeholder="Rechercher ou saisir un diagnostic…" />
        {(matches.length > 0 || q.length >= 2) && (
          <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {matches.map((m) => (
              <li key={m}><button type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)} className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">{m}</button></li>
            ))}
            <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(text)} className="block w-full px-3 py-2 text-left text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Ajouter « {text.trim()} »</button></li>
          </ul>
        )}
      </div>
    </div>
  )
}

// Treatments (high frequency): framed panel, strong label, primary add button.
// No empty rows by default; a row appears on demand.
export function TreatmentEditor({ rows, onChange, allergies, ordonnance, onOrdonnance }) {
  const tokens = allergyTokens(allergies)
  const setRow = (i, key, value) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  return (
    <Panel>
      <FieldLabel emphasis>Traitement</FieldLabel>
      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const hit = allergyMatch(r.medicament, tokens)
          return (
            <div key={i}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_1fr_auto]">
                <input className={inputCls} value={r.medicament} onChange={(e) => setRow(i, 'medicament', e.target.value)} placeholder="Médicament" aria-label={`Médicament ${i + 1}`} />
                <input className={inputCls} value={r.posologie} onChange={(e) => setRow(i, 'posologie', e.target.value)} placeholder="Posologie" aria-label={`Posologie ${i + 1}`} />
                <input className={inputCls} value={r.duree} onChange={(e) => setRow(i, 'duree', e.target.value)} placeholder="Durée" aria-label={`Durée ${i + 1}`} />
                <IconButton size="lg" label={`Retirer le traitement ${i + 1}`} className="hover:!text-red-600" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></IconButton>
              </div>
              {hit && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Allergie déclarée : « {hit} ». Vérifiez avant de prescrire.</p>}
            </div>
          )
        })}
      </div>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${rows.length ? 'mt-3' : ''}`}>
        <AddButton variant="primary" onClick={() => onChange([...rows, { medicament: '', posologie: '', duree: '' }])} disabled={rows.length >= 30}>Ajouter un traitement</AddButton>
        {rows.some((r) => r.medicament.trim()) && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-600">
            <input type="checkbox" checked={ordonnance} onChange={(e) => onOrdonnance(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
            Remettre une ordonnance
          </label>
        )}
      </div>
    </Panel>
  )
}

const QUICK_EXAMS = (PLANS.find((g) => g.group === 'Examens complémentaires')?.items || []).map((t) => t.replace(/\.$/, ''))

// Exams (sometimes): standard weight, hidden behind "+ Ajouter un examen" until needed.
export function ExamOrders({ items, onChange }) {
  const [open, setOpen] = useState(items.length > 0)
  const [text, setText] = useState('')
  const add = (label) => {
    const t = label.trim()
    if (!t || items.some((x) => x.toLowerCase() === t.toLowerCase()) || items.length >= 30) return
    onChange([...items, t])
  }
  const submit = () => { add(text); setText('') }
  return (
    <Panel>
      <FieldLabel hint="Facultatif">Examens complémentaires</FieldLabel>
      {items.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{items.map((x) => <Tag key={x} label={x} onRemove={() => onChange(items.filter((y) => y !== x))}>{x}</Tag>)}</div>}
      {!open ? (
        <AddButton onClick={() => setOpen(true)}>Ajouter un examen</AddButton>
      ) : (
        <div>
          <div className="flex gap-2">
            <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} placeholder="Ex. NFS, radiographie… (Entrée pour valider)" aria-label="Ajouter un examen" autoFocus={items.length === 0} />
            <Button variant="primary" size="sm" className="h-10" onClick={submit}>Ajouter</Button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_EXAMS.filter((q) => !items.includes(q)).slice(0, 10).map((q) => (
              <Chip key={q} icon={Plus} size="md" onClick={() => add(q)}>{q}</Chip>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

// Documents (occasionally): deliberately the quietest block.
export function DocumentToggles({ items, onChange }) {
  const [open, setOpen] = useState(items.length > 0)
  const toggle = (d) => onChange(items.includes(d) ? items.filter((x) => x !== d) : [...items, d])
  return (
    <Panel>
      <FieldLabel hint="Occasionnel">Documents à remettre</FieldLabel>
      {!open ? <AddButton variant="faint" onClick={() => setOpen(true)}>Ajouter un document</AddButton> : (
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_OPTIONS.map((d) => {
            const on = items.includes(d)
            return (
              <Chip key={d} role="checkbox" size="md" selected={on} onClick={() => toggle(d)}>{d}</Chip>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const QUICK_FOLLOW = [['1 semaine', 7], ['2 semaines', 14], ['1 mois', 30], ['3 mois', 90]]

export function FollowUpBlock({ date, notes, onDate, onNotes }) {
  const today = clinicToday()
  return (
    <div>
      <FieldLabel hint="Facultatif">Suivi</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-slate-700" htmlFor="followup-date">Prochain contrôle</label>
          <input id="followup-date" type="date" min={today} value={date} onChange={(e) => onDate(e.target.value)} className={inputCls} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {QUICK_FOLLOW.map(([label, days]) => (
              <Chip key={label} selected={date === addDays(today, days)} onClick={() => onDate(addDays(today, days))}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-slate-700" htmlFor="followup-notes">Consignes / suivi</label>
          <textarea id="followup-notes" rows={3} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Ex. revoir si la fièvre persiste, résultats à apporter…"
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
      </div>
    </div>
  )
}
