import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Loader2, PanelLeft, Plus, Sparkles, X } from 'lucide-react'
import { getPatientMedications, getPatientVitals } from '../../lib/dossierApi'
import { DEPUIS_OPTIONS, EVOLUTION_OPTIONS, VITAL_KEYS, vitalProblem } from '../../lib/encounterService'
import { BloodPressureField, FieldLabel, NarrativeField, VitalField } from './ConsultationFields'
import { DiagnosisPicker, DocumentToggles, ExamOrders, FollowUpBlock, TreatmentEditor, allergyMatch, allergyTokens } from './PlanBlocks'
import PatientContextSidebar from './PatientContextSidebar'
import SuggestionPanel from './SuggestionPanel'
import { DiscardDialog, DoneScreen, FinalizeDialog } from './ConsultationDialogs'

const STEPS = [
  { id: 'subjectif', label: 'Motif & symptômes' },
  { id: 'objectif', label: 'Examen clinique' },
  { id: 'plan', label: 'Évaluation & conduite' },
]

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '')
const calcBMI = (w, h) => {
  const wn = parseFloat(String(w).replace(',', '.'))
  const hn = parseFloat(String(h).replace(',', '.'))
  return wn && hn ? (wn / ((hn / 100) ** 2)).toFixed(1) : null
}

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t) }, [intervalMs])
  return now
}

function SaveStatus({ draft }) {
  const now = useNow(10000)
  const { status, savedAt, isDirty, offline } = draft
  let tone = 'text-slate-500'
  let content = null
  if (status === 'loading') content = <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ouverture…</>
  else if (status === 'conflict') {
    tone = 'text-red-600'
    content = <><AlertTriangle className="h-3.5 w-3.5" /> Modifiée dans une autre fenêtre <button type="button" onClick={() => window.location.reload()} className="ml-1 underline">Recharger</button></>
  } else if (offline || status === 'error') {
    tone = 'text-amber-600'
    content = <><AlertTriangle className="h-3.5 w-3.5" /> Enregistrement en attente <button type="button" onClick={draft.retry} className="ml-1 underline">Réessayer</button></>
  } else if (status === 'saving') content = <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
  else if (isDirty) content = <>Modifications en cours…</>
  else if (savedAt) {
    tone = 'text-emerald-600'
    const secs = Math.max(0, Math.round((now - savedAt.getTime()) / 1000))
    content = <><Check className="h-3.5 w-3.5" /> {secs < 45 ? 'Enregistré il y a quelques secondes' : `Enregistré à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</>
  } else if (status === 'ready') content = <>Brouillon prêt</>
  return <div role="status" aria-live="polite" className={`flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${tone}`}>{content}</div>
}

function Suggestions({ kind, value, onChange, label = 'Suggestions rapides' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
        <Sparkles className="h-3.5 w-3.5" /> {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2"><SuggestionPanel kind={kind} value={value} onChange={onChange} /></div>}
    </div>
  )
}

function ChipChoice({ label, options, value, onChange }) {
  return (
    <div>
      <span className="mb-1 block text-[12px] font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(value === o ? '' : o)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${value === o ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ id, index, title, refEl, children }) {
  return (
    <section id={id} ref={refEl} className="scroll-mt-16 space-y-5">
      <h2 className="flex items-center gap-2.5 text-[15.5px] font-bold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{index}</span>{title}
      </h2>
      {children}
    </section>
  )
}

export default function ConsultationSheet({
  open, onClose, patient, age, patientId, note, setNote, draft, acts = [],
  onAddActe, onCompleted, onDiscarded, onOpenContext, patientConsultations, startInReview = false,
}) {
  const [mode, setMode] = useState('note')
  const [activeStep, setActiveStep] = useState('subjectif')
  const [showFinalize, setShowFinalize] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [result, setResult] = useState(null)
  const [contextOpen, setContextOpen] = useState(false)
  const scrollRef = useRef(null)
  const inFlight = useRef(false)
  const refs = { subjectif: useRef(null), objectif: useRef(null), plan: useRef(null) }

  useEffect(() => {
    if (open) { setMode('note'); setActionError(null); setResult(null); setShowFinalize(startInReview); setShowDiscard(false) }
  }, [open, startInReview])

  const vitalsQ = useQuery({ queryKey: ['consult-ctx-vitals', patientId], queryFn: () => getPatientVitals(patientId), enabled: open && Boolean(patientId) })
  const medsQ = useQuery({ queryKey: ['consult-ctx-meds', patientId], queryFn: () => getPatientMedications(patientId), enabled: open && Boolean(patientId) })
  const lastVitals = useMemo(() => {
    const rows = Array.isArray(vitalsQ.data) ? [...vitalsQ.data] : []
    rows.sort((a, b) => new Date(b.date_mesure) - new Date(a.date_mesure))
    return rows[0] || null
  }, [vitalsQ.data])
  const activeMeds = useMemo(() => (Array.isArray(medsQ.data) ? medsQ.data.filter((m) => m.status === 'Actif') : []), [medsQ.data])

  const v = note.vitals
  const setField = (key) => (value) => setNote((n) => ({ ...n, [key]: value }))
  const setVital = (key) => (e) => setNote((n) => ({ ...n, vitals: { ...n.vitals, [key]: e.target.value } }))
  const applyLastVital = (key, value) => setNote((n) => ({ ...n, vitals: { ...n.vitals, [key]: String(value) } }))
  const bmi = calcBMI(v.weight, v.height)

  const when = lastVitals ? fmtDate(lastVitals.date_mesure) : ''
  const last = (raw, suffix) => (raw != null && raw !== '' ? { text: `${raw}${suffix}`, when } : null)
  const [lastSys, lastDia] = String(lastVitals?.blood_pressure || '').split('/')

  const hasVitals = VITAL_KEYS.some((k) => String(v[k] || '').trim())
  const has = {
    subjectif: Boolean(note.motif.trim() || note.histoire.trim() || note.depuis || note.evolution),
    objectif: hasVitals || Boolean(note.examen.trim()),
    plan: Boolean(note.diagnostics.length || note.conduite.trim() || note.traitements.some((r) => r.medicament.trim()) || note.examens.length || note.followUpDate || note.followUpNotes.trim() || note.documents.length),
  }
  const vitalIssues = VITAL_KEYS.filter((k) => vitalProblem(k, v[k]))
  const bpIncomplete = Boolean(String(v.bloodPressureSystolic).trim()) !== Boolean(String(v.bloodPressureDiastolic).trim())
  const blockers = []
  if (!note.motif.trim()) blockers.push('motif de consultation')
  if (vitalIssues.length || bpIncomplete) blockers.push('constantes vitales valides')
  if (!draft.ready) blockers.push('chargement du brouillon')
  const tokens = allergyTokens(patient?.allergies)
  const allergyHits = note.traitements.map((r) => allergyMatch(r.medicament, tokens)).filter(Boolean)
  const patientName = `${patient?.prenom || ''} ${patient?.nom || ''}`.trim()

  const goBack = async () => {
    if (mode === 'done') { onCompleted?.(result); return }
    try { await draft.flush() } catch {
      if (!window.confirm('Les dernières modifications n\'ont pas pu être enregistrées. Quitter quand même ?')) return
    }
    onClose()
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (showFinalize && !busy) setShowFinalize(false)
      else if (showDiscard && !busy) setShowDiscard(false)
      else if (!showFinalize && !showDiscard) goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const goTo = (id) => {
    setActiveStep(id)
    requestAnimationFrame(() => refs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const onScroll = () => {
    const box = scrollRef.current
    if (!box) return
    let cur = 'subjectif'
    for (const s of STEPS) { const el = refs[s.id].current; if (el && el.offsetTop - 90 <= box.scrollTop) cur = s.id }
    setActiveStep(cur)
  }

  const finalize = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setActionError(null)
    try {
      const res = await draft.complete()
      setResult(res); setShowFinalize(false); setMode('done')
    } catch (e) {
      setActionError(e?.message || 'Impossible de terminer la consultation.')
    } finally { setBusy(false); inFlight.current = false }
  }

  const discard = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setActionError(null)
    try { await draft.discard(); setShowDiscard(false); onDiscarded?.() } catch (e) { setActionError(e?.message || 'Impossible d\'abandonner le brouillon.') } finally { setBusy(false); inFlight.current = false }
  }

  if (!open) return null

  const loading = draft.status === 'loading' || draft.status === 'idle'
  const openError = draft.status === 'open_error'
  const sidebar = (cls) => (
    <PatientContextSidebar className={cls} patient={patient} age={age} meds={activeMeds}
      medsState={medsQ.isLoading ? 'loading' : medsQ.isError ? 'error' : 'ok'} lastVitals={lastVitals}
      vitalsState={vitalsQ.isLoading ? 'loading' : vitalsQ.isError ? 'error' : 'ok'} onOpenContext={onOpenContext} />
  )
  const actesTotal = acts.reduce((s, a) => s + (Number(a.montant) || 0), 0)

  return (
    <div role="dialog" aria-modal="true" aria-label="Nouvelle consultation" className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
      <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={goBack} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour au dossier</span>
          </button>
          <button type="button" onClick={() => setContextOpen(true)} aria-label="Contexte patient" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"><PanelLeft className="h-4 w-4" /></button>
          <p className="truncate text-[14px] font-bold text-slate-900">Nouvelle consultation · {patientName}</p>
        </div>
        {mode !== 'done' && (
          <div className="flex flex-shrink-0 items-center gap-3 sm:gap-4">
            <SaveStatus draft={draft} />
            {draft.ready && <button type="button" onClick={() => { setActionError(null); setShowDiscard(true) }} className="hidden text-[12.5px] font-semibold text-slate-400 hover:text-red-600 md:block">Abandonner</button>}
            <button type="button" disabled={!draft.ready} onClick={() => { setActionError(null); setShowFinalize(true) }}
              className="h-9 rounded-[0.625rem] bg-black px-3.5 text-[13px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              <span className="hidden sm:inline">Terminer la consultation</span><span className="sm:hidden">Terminer</span>
            </button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebar('hidden w-[280px] flex-shrink-0 border-r border-slate-200 lg:block')}

        <div ref={scrollRef} onScroll={onScroll} className="min-w-0 flex-1 overflow-y-auto">
          {openError ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-[14px] font-semibold text-slate-900">Consultation indisponible</p>
              <p className="mt-1 text-[13px] text-slate-500">{draft.error?.message}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-300 px-4 text-[13px] font-semibold text-slate-700">Retour au dossier</button>
                <button type="button" onClick={draft.retryOpen} className="h-9 rounded-lg bg-black px-4 text-[13px] font-semibold text-white">Réessayer</button>
              </div>
            </div>
          ) : mode === 'done' ? (
            <DoneScreen note={note} patientName={patientName} result={result} onContinue={() => onCompleted?.(result)} />
          ) : loading && !draft.ready ? (
            <div className="flex h-full items-center justify-center gap-2 text-[14px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement de la consultation…</div>
          ) : (
            <div className="mx-auto max-w-[760px] px-5 pb-28">
              <nav aria-label="Sections" className="sticky top-0 z-10 -mx-5 mb-7 flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-5 py-2.5 backdrop-blur">
                {STEPS.map((s, i) => (
                  <button key={s.id} type="button" onClick={() => goTo(s.id)} aria-current={activeStep === s.id ? 'step' : undefined}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${activeStep === s.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                    <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold ${has[s.id] ? 'bg-emerald-500 text-white' : activeStep === s.id ? 'bg-white/20' : 'bg-slate-200'}`}>
                      {has[s.id] ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                ))}
              </nav>

              <div className="space-y-12">
                <SectionHeading id="subjectif" index={1} title="Motif & symptômes" refEl={refs.subjectif}>
                  <div>
                    <NarrativeField label="Motif de consultation" required value={note.motif} onChange={setField('motif')} autoFocus patientConsultations={patientConsultations}
                      placeholder="Décrivez brièvement le motif principal de consultation..." />
                    <Suggestions kind="motif" value={note.motif} onChange={setField('motif')} />
                  </div>
                  <div>
                    <NarrativeField label="Symptômes / histoire actuelle" value={note.histoire} onChange={setField('histoire')} patientConsultations={patientConsultations}
                      placeholder="Début, évolution, intensité, facteurs aggravants ou soulageants, traitements déjà essayés..." />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ChipChoice label="Depuis" options={DEPUIS_OPTIONS} value={note.depuis} onChange={setField('depuis')} />
                      <ChipChoice label="Évolution" options={EVOLUTION_OPTIONS} value={note.evolution} onChange={setField('evolution')} />
                    </div>
                    <Suggestions kind="histoire" value={note.histoire} onChange={setField('histoire')} />
                  </div>
                </SectionHeading>

                <SectionHeading id="objectif" index={2} title="Examen clinique" refEl={refs.objectif}>
                  <div>
                    <FieldLabel hint={bmi ? `IMC ${bmi}` : 'Mesures d\'aujourd\'hui'}>Constantes</FieldLabel>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <BloodPressureField systolic={v.bloodPressureSystolic} diastolic={v.bloodPressureDiastolic}
                        onSystolicChange={setVital('bloodPressureSystolic')} onDiastolicChange={setVital('bloodPressureDiastolic')}
                        last={lastVitals?.blood_pressure ? { text: `${lastVitals.blood_pressure}`, when } : null}
                        onUseLast={() => { if (lastSys && lastDia) { applyLastVital('bloodPressureSystolic', lastSys.trim()); applyLastVital('bloodPressureDiastolic', lastDia.trim()) } }} />
                      <VitalField vitalKey="heartRate" label="FC" unit="bpm" value={v.heartRate} onChange={setVital('heartRate')} placeholder="72" last={last(lastVitals?.heart_rate, ' bpm')} onUseLast={() => applyLastVital('heartRate', lastVitals.heart_rate)} />
                      <VitalField vitalKey="temperature" label="Température" unit="°C" value={v.temperature} onChange={setVital('temperature')} placeholder="37" last={last(lastVitals?.temperature, ' °C')} onUseLast={() => applyLastVital('temperature', lastVitals.temperature)} />
                      <VitalField vitalKey="oxygenSaturation" label="SpO₂" unit="%" value={v.oxygenSaturation} onChange={setVital('oxygenSaturation')} placeholder="98" last={last(lastVitals?.spo2, ' %')} onUseLast={() => applyLastVital('oxygenSaturation', lastVitals.spo2)} />
                      <VitalField vitalKey="weight" label="Poids" unit="kg" value={v.weight} onChange={setVital('weight')} placeholder="70" last={last(lastVitals?.weight, ' kg')} onUseLast={() => applyLastVital('weight', lastVitals.weight)} />
                      <VitalField vitalKey="height" label="Taille" unit="cm" value={v.height} onChange={setVital('height')} placeholder="170" last={last(lastVitals?.height, ' cm')} onUseLast={() => applyLastVital('height', lastVitals.height)} />
                    </div>
                  </div>
                  <div>
                    <NarrativeField label="Examen clinique" value={note.examen} onChange={setField('examen')} patientConsultations={patientConsultations}
                      placeholder="Observations et éléments pertinents de l'examen clinique..." />
                    <Suggestions kind="examen" value={note.examen} onChange={setField('examen')} />
                  </div>
                </SectionHeading>

                <SectionHeading id="plan" index={3} title="Évaluation & conduite" refEl={refs.plan}>
                  <DiagnosisPicker items={note.diagnostics} onChange={setField('diagnostics')} />
                  <div>
                    <NarrativeField label="Conduite à tenir" hint="Facultatif" value={note.conduite} onChange={setField('conduite')} patientConsultations={patientConsultations}
                      placeholder="Décision clinique, recommandations, surveillance..." />
                    <Suggestions kind="plan" value={note.conduite} onChange={setField('conduite')} />
                  </div>
                  <TreatmentEditor rows={note.traitements} onChange={setField('traitements')} allergies={patient?.allergies} ordonnance={note.ordonnance} onOrdonnance={setField('ordonnance')} />
                  <ExamOrders items={note.examens} onChange={setField('examens')} />
                  {(acts.length > 0 || onAddActe) && (
                    <div>
                      <FieldLabel hint="Facturé à la caisse">Actes de la séance</FieldLabel>
                      {acts.length > 0 && (
                        <ul className="mb-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                          {acts.map((a) => <li key={a.id} className="flex justify-between px-3 py-2 text-[13.5px]"><span>{a.name}</span><span className="font-semibold">{Number(a.montant || 0).toLocaleString('fr-FR')} MAD</span></li>)}
                          <li className="flex justify-between bg-slate-50 px-3 py-2 text-[13px] font-bold"><span>Total</span><span>{actesTotal.toLocaleString('fr-FR')} MAD</span></li>
                        </ul>
                      )}
                      {onAddActe && <button type="button" onClick={onAddActe} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Plus className="h-4 w-4" /> Ajouter un acte</button>}
                    </div>
                  )}
                  <DocumentToggles items={note.documents} onChange={setField('documents')} />
                  <FollowUpBlock date={note.followUpDate} notes={note.followUpNotes} onDate={setField('followUpDate')} onNotes={setField('followUpNotes')} />
                </SectionHeading>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setContextOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col bg-white shadow-xl">
            <button type="button" onClick={() => setContextOpen(false)} aria-label="Fermer le contexte" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            {sidebar('flex-1 pt-10')}
          </div>
        </div>
      )}

      {showFinalize && (
        <FinalizeDialog note={note} blockers={blockers} allergyHits={allergyHits} submitting={busy} error={actionError}
          onCancel={() => setShowFinalize(false)} onConfirm={finalize} />
      )}
      {showDiscard && <DiscardDialog busy={busy} error={actionError} onCancel={() => setShowDiscard(false)} onConfirm={discard} />}
    </div>
  )
}
