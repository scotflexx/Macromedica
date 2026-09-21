import { Pill, TestTube2, Image as ImageIcon, FileCheck2, Activity, Info } from 'lucide-react'
import Badge from '../common/Badge'
import { StatutBadge } from '../facturation/ui'

// Dossier tabs backed by real data: ordonnances and examens come from the patient's completed
// consultations, factures from the billing (payments) data, scoped to this patient.

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const mad = (n) => `${(Number(n) || 0).toLocaleString('fr-FR')} MAD`

function Frame({ title, subtitle, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function Notice({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-xs text-slate-500">{description}</p>
    </div>
  )
}

function RecordCard({ icon: Icon, title, date, meta, children }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
            <span className="shrink-0 text-[12px] font-medium text-slate-400">{date}</span>
          </div>
          {meta && <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{meta}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </article>
  )
}

export function OrdonnancesList({ items, loading, extra }) {
  return (
    <Frame title="Ordonnances" subtitle="Prescriptions émises lors des consultations de ce patient">
      {loading ? <Notice icon={Activity} title="Chargement…" description="Récupération des ordonnances." />
        : items.length === 0 && !extra ? <Notice icon={Pill} title="Aucune ordonnance" description="Les traitements prescrits en consultation apparaîtront ici." />
        : (
          <div className="space-y-3">
            {items.map((ord) => (
              <RecordCard key={ord.id} icon={Pill} title={`Ordonnance du ${fmtDate(ord.date)}`} date={`${ord.lines.length} médicament${ord.lines.length > 1 ? 's' : ''}`}
                meta={[ord.motif && `Motif : ${ord.motif}`, ord.diagnostics?.length && `Diagnostic : ${ord.diagnostics.join(' ; ')}`].filter(Boolean).join(' · ')}>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {ord.lines.map((line, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                      <span className="text-[13px] font-semibold text-slate-800">{line.medicament}</span>
                      <span className="text-[12.5px] text-slate-500">{[line.posologie, line.duree].filter(Boolean).join(' · ') || 'Posologie non précisée'}</span>
                    </li>
                  ))}
                </ul>
              </RecordCard>
            ))}
            {extra}
          </div>
        )}
    </Frame>
  )
}

export function ExamensList({ items, loading, extra }) {
  return (
    <Frame title="Examens" subtitle="Examens complémentaires prescrits en consultation">
      {loading ? <Notice icon={Activity} title="Chargement…" description="Récupération des examens." />
        : items.length === 0 && !extra ? <Notice icon={TestTube2} title="Aucun examen" description="Les examens complémentaires prescrits en consultation apparaîtront ici." />
        : (
          <div className="space-y-3">
            {items.map((exa) => (
              <RecordCard key={exa.id} icon={TestTube2} title={`Examens du ${fmtDate(exa.date)}`} date={`${exa.items.length} examen${exa.items.length > 1 ? 's' : ''}`}
                meta={exa.motif && `Motif : ${exa.motif}`}>
                <div className="flex flex-wrap gap-1.5">
                  {exa.items.map((label, i) => <Badge key={i} tone="neutral" size="md">{label}</Badge>)}
                </div>
              </RecordCard>
            ))}
            {extra}
          </div>
        )}
    </Frame>
  )
}

// Imagerie has no storage yet (no table for images / reports). This is a feature gap, so the tab
// says so instead of showing a bare empty state. Imaging exams that were prescribed are listed under Examens.
export function ImagerieList({ extra }) {
  return (
    <Frame title="Imagerie" subtitle="Radiologie, échographies, IRM et scanners">
      {extra || (
        <Notice
          icon={ImageIcon}
          title="Pas encore disponible"
          description="Le stockage des images et comptes rendus d'imagerie n'est pas encore en place. Les examens d'imagerie prescrits en consultation figurent dans l'onglet Examens."
        />
      )}
    </Frame>
  )
}

export function FacturesList({ items, loading, error, extra, onOpenFacturation }) {
  return (
    <Frame title="Factures" subtitle="Facturation de ce patient dans le cabinet">
      {loading ? <Notice icon={Activity} title="Chargement…" description="Récupération des factures." />
        : error ? <Notice icon={Info} title="Factures indisponibles" description="Réessayez dans un instant." />
        : items.length === 0 && !extra ? <Notice icon={FileCheck2} title="Aucune facture" description="Les consultations facturées à ce patient apparaîtront ici." />
        : (
          <div className="space-y-3">
            {items.map((f) => {
              const reste = Math.max(0, f.montant - f.paye)
              return (
                <RecordCard key={f.id} icon={FileCheck2} title={f.numero} date={fmtDate(f.dateEmission)}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-500">
                      <span>Facturé <strong className="text-slate-900">{mad(f.montant)}</strong></span>
                      <span>Encaissé <strong className="text-slate-900">{mad(f.paye)}</strong></span>
                      {reste > 0 && <span>Reste <strong className="text-amber-700">{mad(reste)}</strong></span>}
                    </div>
                    <StatutBadge statut={f.statut} />
                  </div>
                </RecordCard>
              )
            })}
            {extra}
            {onOpenFacturation && (
              <button type="button" onClick={onOpenFacturation} className="text-[12.5px] font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800">
                Ouvrir la facturation
              </button>
            )}
          </div>
        )}
    </Frame>
  )
}
