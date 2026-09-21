import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { animate, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Loader2, PanelLeft, X } from 'lucide-react'
import { getPatientMedications, getPatientVitals } from '../../lib/dossierApi'
import { DEPUIS_OPTIONS, EVOLUTION_OPTIONS, listCompletedEncounters } from '../../lib/encounterService'
import { computeProgress } from '../../lib/consultationProgress'
import { BillingPill, FieldLabel, NarrativeField } from './ConsultationFields'
import VitalsGrid from './VitalsGrid'
import SectionStepper from './SectionStepper'
import StageSection from './StageSection'
import Button from '../common/Button'
import Chip from '../common/Chip'
import IconButton from '../common/IconButton'
import { isAtBottom, pickActiveStep, scrollTargetFor } from './sectionScroll'
import { AddButton, DiagnosisPicker, DocumentToggles, ExamOrders, FollowUpBlock, Panel, TreatmentEditor, allergyMatch, allergyTokens } from './PlanBlocks'
import PatientContextSidebar from './PatientContextSidebar'
import { DiscardDialog, DoneScreen, FinalizeDialog } from './ConsultationDialogs'

const STEPS = [
  { id: 'subjectif', label: 'Motif & symptômes' },
  { id: 'objectif', label: 'Examen clinique' },
  { id: 'plan', label: 'Évaluation & conduite' },
]

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000)
  if (days === 0) return 'aujourd\'hui'
  if (days === 1) return 'hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
const calcBMI = (w, h) => {
  const wn = parseFloat(String(w).replace(',', '.'))
  const hn = parseFloat(String(h).replace(',', '.'))
  return wn && hn ? (wn / ((hn / 100) ** 2)).toFixed(1) : null
}

// Only a boolean UI preference is stored locally; no patient data.
const CTX_KEY = 'mm-consult-context-collapsed'
const readCollapsed = () => { try { return localStorage.getItem(CTX_KEY) === '1' } catch { return false } }
const writeCollapsed = (v) => { try { localStorage.setItem(CTX_KEY, v ? '1' : '0') } catch { /* storage unavailable */ } }

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
    content = <><AlertTriangle className="h-3.5 w-3.5" /> Modifiée dans une autre fenêtre <Button variant="link" className="ml-1" onClick={() => window.location.reload()}>Recharger</Button></>
  } else if (offline || status === 'error') {
    tone = 'text-slate-900'
    content = <><AlertTriangle className="h-3.5 w-3.5" /> Enregistrement en attente <Button variant="link" className="ml-1" onClick={draft.retry}>Réessayer</Button></>
  } else if (status === 'saving') content = <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
  else if (isDirty) content = <>Modifications en cours…</>
  else if (savedAt) {
    tone = 'text-green-800'
    const secs = Math.max(0, Math.round((now - savedAt.getTime()) / 1000))
    content = <><Check className="h-3.5 w-3.5" /> {secs < 45 ? 'Enregistré il y a quelques secondes' : `Enregistré à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</>
  } else if (status === 'ready') content = <>Brouillon prêt</>
  return <div role="status" aria-live="polite" className={`flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${tone}`}>{content}</div>
}

// Quick optional helpers: small, quiet by default, tied to their field.
function ChipChoice({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {options.map((o) => (
        <Chip key={o} role="radio" selected={value === o} onClick={() => onChange(value === o ? '' : o)}>{o}</Chip>
      ))}
    </div>
  )
}

export default function ConsultationSheet({
  open, onClose, patient, age, patientId, note, setNote, draft, acts = [], billingAmount = 0, visitLinked = false,
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
  const [ctxCollapsed, setCtxCollapsed] = useState(readCollapsed)
  const scrollRef = useRef(null)
  const scrollAnim = useRef(null)
  const spyPausedUntil = useRef(0)
  const reduceMotion = useReducedMotion()
  const inFlight = useRef(false)
  const refs = { subjectif: useRef(null), objectif: useRef(null), plan: useRef(null) }

  useEffect(() => {
    if (open) { setMode('note'); setActionError(null); setResult(null); setShowFinalize(startInReview); setShowDiscard(false) }
  }, [open, startInReview])

  const vitalsQ = useQuery({ queryKey: ['consult-ctx-vitals', patientId], queryFn: () => getPatientVitals(patientId), enabled: open && Boolean(patientId) })
  const medsQ = useQuery({ queryKey: ['consult-ctx-meds', patientId], queryFn: () => getPatientMedications(patientId), enabled: open && Boolean(patientId) })
  const encountersQ = useQuery({ queryKey: ['encounters', patientId], queryFn: () => listCompletedEncounters(patientId), enabled: open && Boolean(patientId) })
  const vitalsRows = useMemo(() => {
    const rows = Array.isArray(vitalsQ.data) ? [...vitalsQ.data] : []
    rows.sort((a, b) => new Date(b.date_mesure) - new Date(a.date_mesure))
    return rows
  }, [vitalsQ.data])
  const lastVitals = vitalsRows[0] || null
  const activeMeds = useMemo(() => (Array.isArray(medsQ.data) ? medsQ.data.filter((m) => m.status === 'Actif') : []), [medsQ.data])

  const v = note.vitals
  const setField = (key) => (value) => setNote((n) => ({ ...n, [key]: value }))
  const setVital = (key) => (e) => setNote((n) => ({ ...n, vitals: { ...n.vitals, [key]: e.target.value } }))
  const applyLastVital = (key, value) => setNote((n) => ({ ...n, vitals: { ...n.vitals, [key]: String(value) } }))
  const bmi = calcBMI(v.weight, v.height)

  const when = lastVitals ? fmtDate(lastVitals.date_mesure) : ''

  // One derivation feeds the stepper, stage cards, sidebar (X/N + readiness line)
  // and the finalize dialog's blockers (see lib/consultationProgress).
  const progress = computeProgress(note, { ready: draft.ready })
  const { has, blockers } = progress
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

  // Tab click -> one Framer Motion scroll of the scroll box. While it runs, the
  // scroll-spy is suspended (otherwise it re-highlights every section the page
  // passes through), and any manual scroll input cancels it immediately.
  const measureSections = () => {
    const box = scrollRef.current
    if (!box) return null
    const boxTop = box.getBoundingClientRect().top
    const tops = STEPS.map((st) => ({ id: st.id, top: refs[st.id].current ? refs[st.id].current.getBoundingClientRect().top - boxTop : Infinity }))
    return { box, tops, maxScroll: box.scrollHeight - box.clientHeight }
  }
  const cancelNav = () => { scrollAnim.current?.stop(); scrollAnim.current = null; spyPausedUntil.current = 0 }
  useEffect(() => cancelNav, [])

  const goTo = (id) => {
    const m = measureSections()
    const target = m?.tops.find((t) => t.id === id)
    if (!m || !target || target.top === Infinity) return
    cancelNav()
    setActiveStep(id)
    const to = scrollTargetFor(target.top, m.box.scrollTop, m.maxScroll)
    const dist = Math.abs(to - m.box.scrollTop)
    if (dist < 1) return
    if (reduceMotion) { m.box.scrollTop = to; spyPausedUntil.current = performance.now() + 150; return }
    const duration = Math.min(0.6, 0.25 + dist / 4000)
    // Safety net: even if the animation never reports completion, the spy resumes.
    spyPausedUntil.current = performance.now() + duration * 1000 + 400
    scrollAnim.current = animate(m.box.scrollTop, to, {
      duration, ease: [0.32, 0.72, 0, 1],
      onUpdate: (y) => { m.box.scrollTop = y },
      onComplete: () => { scrollAnim.current = null; spyPausedUntil.current = performance.now() + 150 },
    })
  }
  const onScroll = () => {
    if (performance.now() < spyPausedUntil.current) return
    const m = measureSections()
    if (!m) return
    const id = pickActiveStep(m.tops, { atBottom: isAtBottom(m.box.scrollTop, m.maxScroll) })
    if (id) setActiveStep(id)
  }

  const finalize = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setActionError(null)
    try {
      const res = await draft.complete({ billingAmount: visitLinked ? billingAmount : null, billingType: 'cash' })
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
  const toggleCtx = () => setCtxCollapsed((c) => { writeCollapsed(!c); return !c })
  const sidebar = (cls, { collapsible }) => (
    <PatientContextSidebar className={cls} patient={patient} age={age} meds={activeMeds}
      medsState={medsQ.isLoading ? 'loading' : medsQ.isError ? 'error' : 'ok'}
      vitalsRows={vitalsRows} vitalsState={vitalsQ.isLoading ? 'loading' : vitalsQ.isError ? 'error' : 'ok'}
      encounters={encountersQ.data || []} encountersState={encountersQ.isLoading ? 'loading' : encountersQ.isError ? 'error' : 'ok'}
      progress={progress} onSelectStep={goTo}
      collapsed={collapsible && ctxCollapsed} onToggleCollapsed={collapsible ? toggleCtx : undefined} onOpenDossier={onOpenContext} />
  )
  const actesTotal = acts.reduce((s, a) => s + (Number(a.montant) || 0), 0)

  return (
    <div role="dialog" aria-modal="true" aria-label="Nouvelle consultation" className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
      <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} aria-label="Retour au dossier">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour au dossier</span>
          </Button>
          <IconButton size="md" label="Contexte patient" onClick={() => setContextOpen(true)} className="lg:hidden"><PanelLeft className="h-4 w-4" /></IconButton>
          <p className="truncate text-[14px] font-bold text-slate-900">Nouvelle consultation · {patientName}</p>
        </div>
        {mode !== 'done' && (
          <div className="flex flex-shrink-0 items-center gap-3 sm:gap-4">
            <SaveStatus draft={draft} />
            {draft.ready && <Button variant="ghost" size="sm" className="!hidden md:!inline-flex hover:!text-red-600" onClick={() => { setActionError(null); setShowDiscard(true) }}>Abandonner</Button>}
            <Button variant="primary" size="sm" disabled={!draft.ready} onClick={() => { setActionError(null); setShowFinalize(true) }}>
              <span className="hidden sm:inline">Terminer la consultation</span><span className="sm:hidden">Terminer</span>
            </Button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebar(`hidden flex-shrink-0 border-r border-slate-200 transition-[width] duration-200 lg:flex ${ctxCollapsed ? 'w-[64px]' : 'w-[304px]'}`, { collapsible: true })}

        <div ref={scrollRef} onScroll={onScroll} onWheel={cancelNav} onTouchStart={cancelNav} onPointerDown={cancelNav} className="min-w-0 flex-1 overflow-y-auto">
          {openError ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-[14px] font-semibold text-slate-900">Consultation indisponible</p>
              <p className="mt-1 text-[13px] text-slate-500">{draft.error?.message}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Retour au dossier</Button>
                <Button variant="primary" size="sm" onClick={draft.retryOpen}>Réessayer</Button>
              </div>
            </div>
          ) : mode === 'done' ? (
            <DoneScreen note={note} patientName={patientName} result={result} onContinue={() => onCompleted?.(result)} />
          ) : loading && !draft.ready ? (
            <div className="flex h-full items-center justify-center gap-2 text-[14px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement de la consultation…</div>
          ) : (
            <div className="mx-auto max-w-[1160px] px-5 pb-24 lg:px-8">
              <SectionStepper steps={STEPS} activeId={activeStep} filled={has} onSelect={goTo} />

              <div className="space-y-6">
                <StageSection id="subjectif" index={1} title="Motif & symptômes" hint="Pourquoi le patient consulte aujourd'hui"
                  filled={has.subjectif} active={activeStep === 'subjectif'} refEl={refs.subjectif}>
                  <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <NarrativeField emphasis size="lg" required label="Motif de consultation" value={note.motif} onChange={setField('motif')} autoFocus suggestKind="motif"
                      patientConsultations={patientConsultations} placeholder="Décrivez brièvement le motif principal de consultation..." />
                    <div>
                      <NarrativeField size="lg" label="Symptômes / histoire actuelle" value={note.histoire} onChange={setField('histoire')} suggestKind="histoire"
                        patientConsultations={patientConsultations} placeholder="Début, évolution, intensité, facteurs aggravants ou soulageants, traitements déjà essayés..." />
                      <div className="mt-2 space-y-1.5">
                        <ChipChoice label="Depuis" options={DEPUIS_OPTIONS} value={note.depuis} onChange={setField('depuis')} />
                        <ChipChoice label="Évolution" options={EVOLUTION_OPTIONS} value={note.evolution} onChange={setField('evolution')} />
                      </div>
                    </div>
                  </div>
                </StageSection>

                <StageSection id="objectif" index={2} title="Examen clinique" hint="Constantes et observations"
                  filled={has.objectif} active={activeStep === 'objectif'} refEl={refs.objectif}>
                  <div>
                    <FieldLabel hint={bmi ? `IMC ${bmi}` : 'Mesures d\'aujourd\'hui'}>Constantes</FieldLabel>
                    <VitalsGrid vitals={v} setVital={setVital} applyLast={applyLastVital} lastVitals={lastVitals} when={when} age={age} />
                  </div>
                  <NarrativeField size="sm" label="Examen clinique" value={note.examen} onChange={setField('examen')} suggestKind="examen"
                    patientConsultations={patientConsultations} placeholder="Observations et éléments pertinents de l'examen clinique..." />
                </StageSection>

                <StageSection id="plan" index={3} title="Évaluation & conduite" hint="Diagnostic, traitement et suite"
                  filled={has.plan} active={activeStep === 'plan'} refEl={refs.plan}>
                  <div className="grid items-start gap-x-6 gap-y-5 xl:grid-cols-2">
                    <div className="space-y-5">
                      <DiagnosisPicker items={note.diagnostics} onChange={setField('diagnostics')} />
                      <NarrativeField size="sm" label="Conduite à tenir" hint="Facultatif" value={note.conduite} onChange={setField('conduite')} suggestKind="plan"
                        patientConsultations={patientConsultations} placeholder="Décision clinique, recommandations, surveillance..." />
                      <FollowUpBlock date={note.followUpDate} notes={note.followUpNotes} onDate={setField('followUpDate')} onNotes={setField('followUpNotes')} />
                    </div>
                    <div className="space-y-5">
                      <TreatmentEditor rows={note.traitements} onChange={setField('traitements')} allergies={patient?.allergies} ordonnance={note.ordonnance} onOrdonnance={setField('ordonnance')} />
                      {(acts.length > 0 || onAddActe) && (
                        <Panel>
                          <FieldLabel emphasis action={<BillingPill />}>Actes de la séance</FieldLabel>
                          {acts.length > 0 && (
                            <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                              {acts.map((a) => <li key={a.id} className="flex justify-between px-3 py-2 text-[13.5px]"><span>{a.name}</span><span className="font-semibold">{Number(a.montant || 0).toLocaleString('fr-FR')} MAD</span></li>)}
                              <li className="flex justify-between bg-slate-50 px-3 py-2 text-[13px] font-bold"><span>Total</span><span>{actesTotal.toLocaleString('fr-FR')} MAD</span></li>
                            </ul>
                          )}
                          {onAddActe && <AddButton variant="primary" onClick={onAddActe}>Ajouter un acte</AddButton>}
                        </Panel>
                      )}
                      <ExamOrders items={note.examens} onChange={setField('examens')} />
                      <DocumentToggles items={note.documents} onChange={setField('documents')} />
                    </div>
                  </div>
                </StageSection>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setContextOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col bg-white shadow-xl">
            <IconButton label="Fermer le contexte" onClick={() => setContextOpen(false)} className="absolute right-2 top-2"><X className="h-4 w-4" /></IconButton>
            {sidebar('flex-1 pt-10', { collapsible: false })}
          </div>
        </div>
      )}

      {showFinalize && (
        <FinalizeDialog note={note} blockers={blockers} allergyHits={allergyHits} submitting={busy} error={actionError}
          handoffText={visitLinked ? `Le patient sera envoyé à la caisse (montant proposé : ${billingAmount.toLocaleString('fr-FR')} MAD).` : 'Consultation non liée à une visite : enregistrée au dossier, sans passage en caisse.'}
          onCancel={() => setShowFinalize(false)} onConfirm={finalize} />
      )}
      {showDiscard && <DiscardDialog busy={busy} error={actionError} onCancel={() => setShowDiscard(false)} onConfirm={discard} />}
    </div>
  )
}
