import { useCallback, useEffect, useRef, useState } from 'react'
import {
  completeEncounter, finalizeNote, isNoteEmpty, normalizeNote, openEncounter, saveEncounter, voidEncounter,
} from '../lib/encounterService'

const AUTOSAVE_DELAY_MS = 1500

// Owns the server-side draft of one consultation: opens/resumes it, autosaves
// changes (debounced, one request at a time, optimistic version), and exposes
// flush/complete/discard. The caller keeps the field state and passes `note`.
export function useEncounterDraft({ patientId, visitId, active, note, onHydrate }) {
  const [state, setState] = useState({ status: 'idle', error: null, savedAt: null })
  const enc = useRef({ id: null, version: null })
  const lastSaved = useRef(null)
  const hydrated = useRef(false)
  const opening = useRef(false)
  const inflight = useRef(null)
  const timer = useRef(null)
  const noteRef = useRef(note)
  const onHydrateRef = useRef(onHydrate)
  noteRef.current = note
  onHydrateRef.current = onHydrate

  const snapshot = JSON.stringify(normalizeNote(note))

  // Reset when the patient changes (same component instance, different route param).
  useEffect(() => {
    enc.current = { id: null, version: null }
    lastSaved.current = null
    hydrated.current = false
    opening.current = false
    clearTimeout(timer.current)
    setState({ status: 'idle', error: null, savedAt: null })
  }, [patientId])

  useEffect(() => {
    if (!active || !patientId || state.status !== 'idle' || hydrated.current || opening.current) return
    opening.current = true
    setState((s) => ({ ...s, status: 'loading', error: null }))
    openEncounter(patientId, visitId || null)
      .then((row) => {
        enc.current = { id: row.id, version: row.version }
        const server = normalizeNote(row.note)
        if (!isNoteEmpty(server)) onHydrateRef.current?.(server)
        lastSaved.current = JSON.stringify(isNoteEmpty(server) ? server : normalizeNote(noteRef.current))
        hydrated.current = true
        setState({ status: 'ready', error: null, savedAt: isNoteEmpty(server) ? new Date(row.updated_at) : null })
      })
      .catch((error) => {
        setState({ status: 'open_error', error, savedAt: null })
      })
      .finally(() => { opening.current = false })
  }, [active, patientId, visitId, state.status])

  const persist = useCallback(async () => {
    if (!enc.current.id || !hydrated.current) return
    if (inflight.current) await inflight.current.catch(() => {})
    const body = normalizeNote(noteRef.current)
    const snap = JSON.stringify(body)
    if (snap === lastSaved.current) return
    const run = (async () => {
      setState((s) => ({ ...s, status: 'saving', error: null }))
      try {
        const row = await saveEncounter(enc.current.id, body, enc.current.version)
        enc.current.version = row.version
        lastSaved.current = snap
        setState({ status: 'saved', error: null, savedAt: new Date() })
      } catch (error) {
        setState((s) => ({ ...s, status: error.code === 'conflict' ? 'conflict' : 'error', error }))
        throw error
      }
    })()
    inflight.current = run
    try { await run } finally { if (inflight.current === run) inflight.current = null }
  }, [])

  useEffect(() => {
    if (!hydrated.current || snapshot === lastSaved.current) return undefined
    if (state.status === 'conflict') return undefined
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { persist().catch(() => {}) }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer.current)
  }, [snapshot, persist, state.status])

  useEffect(() => {
    const warn = (e) => {
      if (hydrated.current && (JSON.stringify(normalizeNote(noteRef.current)) !== lastSaved.current || inflight.current)) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    await persist()
  }, [persist])

  const complete = useCallback(async (billing) => {
    if (!enc.current.id) throw new Error('not ready')
    await flush()
    const result = await completeEncounter(enc.current.id, finalizeNote(noteRef.current), enc.current.version, billing)
    enc.current = { id: null, version: null }
    hydrated.current = false
    setState({ status: 'completed', error: null, savedAt: new Date() })
    return result
  }, [flush])

  const discard = useCallback(async () => {
    if (enc.current.id) await voidEncounter(enc.current.id)
    enc.current = { id: null, version: null }
    hydrated.current = false
    lastSaved.current = null
    setState({ status: 'discarded', error: null, savedAt: null })
  }, [])

  useEffect(() => {
    if (!active && state.status === 'discarded') setState({ status: 'idle', error: null, savedAt: null })
  }, [active, state.status])

  const retryOpen = useCallback(() => {
    opening.current = false
    hydrated.current = false
    setState({ status: 'idle', error: null, savedAt: null })
  }, [])

  // Transient failures (network, server hiccup) retry on their own; the note stays in memory.
  useEffect(() => {
    if (state.status !== 'error') return undefined
    const t = setTimeout(() => { persist().catch(() => {}) }, 6000)
    return () => clearTimeout(t)
  }, [state.status, persist])

  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const on = () => { setOffline(false); persist().catch(() => {}) }
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [persist])

  const isDirty = hydrated.current && snapshot !== lastSaved.current

  return { ...state, offline, ready: hydrated.current, isDirty, flush, complete, discard, retryOpen, retry: () => persist().catch(() => {}) }
}
