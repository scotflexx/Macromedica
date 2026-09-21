import { useState } from 'react'
import { Activity, AlertTriangle, Check, ChevronDown, ChevronsLeft, ChevronsRight, ClipboardList, ExternalLink, History, Pill } from 'lucide-react'
import { normalizeNote } from '../../lib/encounterService'
import Button from '../common/Button'
import IconButton from '../common/IconButton'

const fmtDate = (d, withYear = false) => (d
  ? new Date(d).toLocaleDateString('fr-FR', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
  : '')

function Sparkline({ values }) {
  if (values.length < 2) return null
  const w = 72
  const h = 22
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [pad + (i * (w - 2 * pad)) / (values.length - 1), h - pad - ((v - min) / span) * (h - 2 * pad)])
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="flex-shrink-0 text-slate-400">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" className="fill-slate-800" />
    </svg>
  )
}

// A section that has real data: solid dark icon + label, count, expandable in
// place. Sections differ by icon and label only (no per-card colour); the
// muted EmptyRow below is the "non renseigné" counterpart.
function Section({ icon: Icon, title, badge, summary, open, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50">
        <Icon className="h-4 w-4 flex-shrink-0 text-slate-800" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-bold text-slate-800">{title}</span>
            {badge != null && badge > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{badge}</span>}
          </span>
          {!open && summary && <span className="mt-0.5 block truncate text-[12px] text-slate-500">{summary}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">{children}</div>}
    </section>
  )
}

// A section with nothing to show: a quiet, non-interactive row.
function EmptyRow({ icon: Icon, title, text }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 px-3 py-2">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
      <p className="min-w-0 truncate text-[12px] text-slate-400"><span className="font-semibold text-slate-500">{title}</span> · {text}</p>
    </div>
  )
}

const Muted = ({ children }) => <p className="text-[13px] text-slate-400">{children}</p>

function TrendRow({ label, value, unit, series }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11.5px] text-slate-400">{label}</p>
        <p className="text-[14px] font-bold text-slate-900">{value}{unit && <span className="ml-0.5 text-[11.5px] font-medium text-slate-400">{unit}</span>}</p>
      </div>
      <Sparkline values={series} />
    </div>
  )
}

function PriorItem({ enc }) {
  const [open, setOpen] = useState(false)
  const n = normalizeNote(enc.note)
  const dx = n.diagnostics.join(' ; ')
  const rx = n.traitements.filter((r) => r.medicament.trim()).map((r) => r.medicament).join(', ')
  return (
    <li className="rounded-md border border-slate-100 bg-slate-50/60">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[11.5px] font-semibold text-slate-500">{fmtDate(enc.completed_at || enc.started_at, true)}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
        <span className={`mt-0.5 block text-[13px] font-semibold text-slate-800 ${open ? '' : 'line-clamp-2'}`}>{n.motif || 'Consultation'}</span>
        {!open && dx && <span className="mt-0.5 block truncate text-[12px] text-slate-500">{dx}</span>}
      </button>
      {open && (
        <dl className="space-y-1.5 px-2.5 pb-2.5 text-[12.5px] text-slate-600">
          {dx && <div><dt className="font-semibold text-slate-500">Diagnostic</dt><dd>{dx}</dd></div>}
          {n.conduite.trim() && <div><dt className="font-semibold text-slate-500">Conduite</dt><dd className="whitespace-pre-wrap">{n.conduite}</dd></div>}
          {rx && <div><dt className="font-semibold text-slate-500">Traitement</dt><dd>{rx}</dd></div>}
          {(n.followUpDate || n.followUpNotes.trim()) && (
            <div><dt className="font-semibold text-slate-500">Suivi</dt><dd>{[n.followUpDate && fmtDate(`${n.followUpDate}T12:00:00`, true), n.followUpNotes.trim()].filter(Boolean).join(' · ')}</dd></div>
          )}
        </dl>
      )}
    </li>
  )
}

// Reference panel: nothing here edits historical data and nothing opens a modal.
// Priority order: allergy alert, then blocks that have real data (accent stripe,
// count, expandable in place), then a quiet "Non renseigné" group of empty rows.
export default function PatientContextSidebar({
  patient, age, meds, medsState, vitalsRows = [], vitalsState, encounters = [], encountersState,
  collapsed = false, onToggleCollapsed, onOpenDossier, progress = null, onSelectStep, className = '',
}) {
  const [open, setOpen] = useState({})
  const allergies = patient?.allergies?.trim()
  const allergiesKnown = Boolean(allergies) && allergies.toLowerCase() !== 'aucune'
  const antecedents = patient?.antecedents?.trim()
  const initials = `${patient?.prenom?.[0] || ''}${patient?.nom?.[0] || ''}`.toUpperCase()
  const genre = patient?.sexe === 'homme' ? 'Homme' : patient?.sexe === 'femme' ? 'Femme' : null
  const name = `${patient?.prenom || ''} ${patient?.nom || ''}`.trim()

  const last = vitalsRows[0] || null
  const chrono = [...vitalsRows].reverse().slice(-6)
  const num = (x) => { const v = parseFloat(String(x).replace(',', '.')); return Number.isFinite(v) ? v : null }
  const series = (fn) => chrono.map(fn).filter((v) => v != null)
  const sys = (row) => num(String(row.blood_pressure || '').split('/')[0])
  const bmi = last && num(last.weight) && num(last.height) ? (num(last.weight) / ((num(last.height) / 100) ** 2)).toFixed(1) : null

  // Every data-bearing block starts open; the doctor collapses what they don't need.
  const isOpen = (k) => (k in open ? open[k] : true)
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !isOpen(k) }))

  if (collapsed) {
    return (
      <aside aria-label="Contexte patient (réduit)" className={`flex flex-col items-center gap-3 bg-white py-4 ${className}`}>
        <IconButton label="Afficher le contexte patient" onClick={onToggleCollapsed}><ChevronsRight className="h-4 w-4" /></IconButton>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-[13px] font-bold text-white" title={name}>
          {initials}
          {allergiesKnown && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-white" title={`Allergies : ${allergies}`}><AlertTriangle className="h-2.5 w-2.5 text-white" /></span>}
        </div>
      </aside>
    )
  }

  const loading = (state) => state === 'loading'
  const errored = (state) => state === 'error'
  const blocks = []
  const empties = []

  // Traitements
  if (meds.length > 0) {
    blocks.push(
      <Section key="traitements" icon={Pill}title="Traitements" badge={meds.length} summary={meds.map((m) => m.medication_name).join(', ')}
        open={isOpen('traitements')} onToggle={() => toggle('traitements')}>
        <ul className="space-y-2">
          {meds.map((m) => (
            <li key={m.id} className="text-[13px]">
              <p className="font-semibold text-slate-800">{m.medication_name}</p>
              <p className="text-[12px] text-slate-500">{[m.dosage, m.posology, m.start_date && `depuis ${fmtDate(m.start_date, true)}`].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      </Section>,
    )
  } else empties.push(<EmptyRow key="traitements" icon={Pill} title="Traitements" text={loading(medsState) ? 'chargement…' : errored(medsState) ? 'indisponible' : 'aucun traitement actif'} />)

  // Constantes
  if (last) {
    blocks.push(
      <Section key="constantes" icon={Activity}title="Dernières constantes"
        summary={`${fmtDate(last.date_mesure, true)}${last.blood_pressure ? ` · TA ${last.blood_pressure}` : ''}`}
        open={isOpen('constantes')} onToggle={() => toggle('constantes')}>
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-medium text-slate-400">Mesure du {fmtDate(last.date_mesure, true)}{chrono.length > 1 ? ` · tendance sur ${chrono.length} mesures` : ''}</p>
          <TrendRow label="Tension" value={last.blood_pressure} unit="mmHg" series={series(sys)} />
          <TrendRow label="Fréquence cardiaque" value={last.heart_rate} unit="bpm" series={series((r) => num(r.heart_rate))} />
          <TrendRow label="Température" value={last.temperature} unit="°C" series={series((r) => num(r.temperature))} />
          <TrendRow label="SpO₂" value={last.spo2} unit="%" series={series((r) => num(r.spo2))} />
          <TrendRow label="Poids" value={last.weight} unit="kg" series={series((r) => num(r.weight))} />
          <div className="flex gap-4 text-[12.5px] text-slate-600">
            {last.height != null && <span>Taille <b className="text-slate-800">{last.height}</b> cm</span>}
            {bmi && <span>IMC <b className="text-slate-800">{bmi}</b></span>}
          </div>
        </div>
      </Section>,
    )
  } else empties.push(<EmptyRow key="constantes" icon={Activity} title="Constantes" text={loading(vitalsState) ? 'chargement…' : errored(vitalsState) ? 'indisponible' : 'aucune mesure enregistrée'} />)

  // Antécédents
  if (antecedents) {
    blocks.push(
      <Section key="antecedents" icon={ClipboardList}title="Antécédents" summary={antecedents}
        open={isOpen('antecedents')} onToggle={() => toggle('antecedents')}>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{antecedents}</p>
      </Section>,
    )
  } else empties.push(<EmptyRow key="antecedents" icon={ClipboardList} title="Antécédents" text="non renseignés" />)

  // Consultations précédentes
  if (encounters.length > 0) {
    blocks.push(
      <Section key="historique" icon={History}title="Consultations précédentes" badge={encounters.length}
        summary={normalizeNote(encounters[0].note).motif || 'Consultation'} open={isOpen('historique')} onToggle={() => toggle('historique')}>
        <ul className="space-y-1.5">{encounters.slice(0, 5).map((e) => <PriorItem key={e.id} enc={e} />)}</ul>
      </Section>,
    )
  } else empties.push(<EmptyRow key="historique" icon={History} title="Consultations" text={loading(encountersState) ? 'chargement…' : errored(encountersState) ? 'indisponible' : 'aucune enregistrée'} />)

  return (
    <aside aria-label="Contexte patient" className={`flex flex-col bg-white ${className}`}>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-[14px] font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[14.5px] font-bold text-slate-900">{name}</p>
            <p className="text-[12.5px] text-slate-500">{[age != null ? `${age} ans` : 'Âge non renseigné', genre].filter(Boolean).join(' · ')}</p>
          </div>
          {onToggleCollapsed && (
            <IconButton label="Réduire le contexte patient" onClick={onToggleCollapsed} className="!hidden lg:!inline-flex"><ChevronsLeft className="h-4 w-4" /></IconButton>
          )}
        </div>

        {allergiesKnown ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 ring-1 ring-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">Allergies</p>
              <p className="break-words text-[13px] font-semibold text-red-900">{allergies}</p>
            </div>
          </div>
        ) : (
          <EmptyRow icon={AlertTriangle} title="Allergies" text="non renseignées, à vérifier" />
        )}

        {blocks}

        {empties.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {blocks.length > 0 && <p className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-300">Non renseigné</p>}
            {empties}
          </div>
        )}
      </div>

      {progress && (
        <div className="border-t border-slate-100 px-3 py-2.5">
          <p className="mb-1.5 flex items-center justify-between px-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
            <span>Consultation en cours</span>
            <span className="font-semibold normal-case tracking-normal text-slate-400">{progress.filledCount}/{progress.total}</span>
          </p>
          <ul className="space-y-0.5">
            {progress.sections.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSelectStep?.(s.id)} className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50">
                  {s.filled
                    ? <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><Check className="h-2.5 w-2.5" /></span>
                    : <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border border-slate-300" />}
                  <span className="min-w-0">
                    <span className={`block text-[12px] font-semibold ${s.filled ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                    {s.detail && <span className="block truncate text-[11.5px] text-slate-500">{s.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p data-status={progress.status} className="mt-2 border-t border-slate-100 px-1 pt-2 text-[11.5px] text-slate-500">
            {progress.status === 'blocked' && <><span className="font-semibold text-slate-700">Pour terminer :</span> {progress.blockers.join(', ')}</>}
            {progress.status === 'partial' && <><span className="font-semibold text-slate-700">Peut être terminée</span> · à compléter : {progress.missing.join(', ')}</>}
            {progress.status === 'complete' && <span className="font-semibold text-green-800">Prête à être terminée</span>}
          </p>
        </div>
      )}

      {onOpenDossier && (
        <div className="border-t border-slate-100 p-3">
          <Button variant="ghost" size="sm" className="w-full" onClick={onOpenDossier}>
            <ExternalLink className="h-3.5 w-3.5" /> Dossier patient complet
          </Button>
        </div>
      )}
    </aside>
  )
}
