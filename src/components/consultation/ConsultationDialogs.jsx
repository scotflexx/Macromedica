import { Check, Loader2 } from 'lucide-react'

function Overlay({ children, onClose, label }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
    </div>
  )
}

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[92px_1fr] gap-2 py-2 text-[13.5px]">
    <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <span className="min-w-0 whitespace-pre-wrap break-words text-slate-800">{children || <span className="text-slate-400">Non renseigné</span>}</span>
  </div>
)

const fmtDay = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export function FinalizeDialog({ note, blockers, allergyHits, handoffText, submitting, error, onCancel, onConfirm }) {
  const treatments = note.traitements.filter((r) => r.medicament.trim())
  const follow = [note.followUpDate && fmtDay(note.followUpDate), note.followUpNotes.trim()].filter(Boolean).join(' · ')
  return (
    <Overlay onClose={submitting ? undefined : onCancel} label="Terminer la consultation">
      <h2 className="text-[17px] font-bold text-slate-900">Terminer la consultation ?</h2>
      <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
        <Row label="Motif">{note.motif.trim()}</Row>
        <Row label="Diagnostic">{note.diagnostics.join(' ; ')}</Row>
        <Row label="Traitement">{treatments.map((r) => [r.medicament, r.posologie, r.duree].filter(Boolean).join(' · ')).join('\n')}</Row>
        <Row label="Suivi">{follow}</Row>
      </div>
      {blockers.length > 0 && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-[13px] text-amber-800">À compléter : {blockers.join(', ')}.</p>}
      {allergyHits.length > 0 && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-700">Ordonnance à vérifier : allergie déclarée ({[...new Set(allergyHits)].join(', ')}).</p>}
      {handoffText && <p className="mt-3 text-[12.5px] text-slate-500">{handoffText}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={submitting} className="h-10 rounded-[0.625rem] border-2 border-[#cbd5e1] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-[#f1f5f9] disabled:opacity-50">Annuler</button>
        <button type="button" onClick={onConfirm} disabled={blockers.length > 0 || submitting}
          className="flex h-10 items-center gap-2 rounded-[0.625rem] bg-[#2563eb] px-5 text-[13px] font-bold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-40">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Terminer la consultation
        </button>
      </div>
    </Overlay>
  )
}

export function DiscardDialog({ busy, error, onCancel, onConfirm }) {
  return (
    <Overlay onClose={busy ? undefined : onCancel} label="Abandonner la consultation">
      <h2 className="text-[17px] font-bold text-slate-900">Abandonner cette consultation ?</h2>
      <p className="mt-2 text-[13.5px] text-slate-600">Le brouillon en cours (motif, examen, diagnostic, traitement…) sera supprimé. Cette action est définitive. Pour simplement quitter et reprendre plus tard, utilisez « Retour au dossier ».</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="h-10 rounded-[0.625rem] border-2 border-[#cbd5e1] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-[#f1f5f9] disabled:opacity-50">Continuer la consultation</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="flex h-10 items-center gap-2 rounded-[0.625rem] bg-red-600 px-5 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Abandonner
        </button>
      </div>
    </Overlay>
  )
}

const HANDOFF_TEXT = {
  billing: 'Le patient a été envoyé à la caisse (à encaisser).',
  completed: 'Aucun paiement requis : la visite est clôturée.',
  none: 'Consultation enregistrée au dossier du patient.',
}

export function DoneScreen({ note, patientName, result, onContinue }) {
  const treatments = note.traitements.filter((r) => r.medicament.trim())
  const follow = [note.followUpDate && fmtDay(note.followUpDate), note.followUpNotes.trim()].filter(Boolean).join(' · ')
  const items = [
    ['Diagnostic', note.diagnostics.join(' ; ')],
    ['Traitement', treatments.map((r) => [r.medicament, r.posologie, r.duree].filter(Boolean).join(' · ')).join('\n')],
    ['Ordonnance', note.ordonnance && treatments.length ? `${treatments.length} médicament(s)` : ''],
    ['Examens', note.examens.join(' · ')],
    ['Suivi', follow],
    ['Documents', note.documents.join(' · ')],
  ]
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-5 w-5" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-slate-900">Consultation terminée</h1>
          <p className="text-[13px] text-slate-500">{patientName}</p>
        </div>
      </div>
      <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
        {items.map(([label, text]) => <Row key={label} label={label}>{text || <span className="text-slate-300">—</span>}</Row>)}
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-600" role="status">{HANDOFF_TEXT[result?.handoff] || HANDOFF_TEXT.none}</p>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onContinue} className="h-10 rounded-[0.625rem] bg-black px-5 text-[13px] font-bold text-white hover:bg-slate-800">
          {result?.handoff === 'none' ? 'Retour au dossier' : 'Retour au tableau de bord'}
        </button>
      </div>
    </div>
  )
}
