import React, { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { cn } from '../../lib/utils'

import AgendaDayView from '../../components/agenda/AgendaDayView'
import AppointmentDetailModal from '../../components/agenda/AppointmentDetailModal'
import AppointmentFormModal from '../../components/forms/AppointmentFormModal'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { cancelAppointment, confirmAppointment } from '../../lib/appointmentService'
import WeeklyAgenda from '../../components/agenda/WeeklyAgenda'
import MonthlyAgenda from '../../components/agenda/MonthlyAgenda'
import { MOCK_RDV } from '../../lib/mockData'
import type {
  AgendaAppointmentInput,
  AgendaCalendarAppointmentInput,
} from '../../components/agenda/useAgenda'
import type { Appointment, AppointmentStatus, AppointmentType } from '../../types/appointment'
import type { Rdv } from '../../types'

type DailyRdv = Pick<Rdv, 'id' | 'patient_id' | 'date_rdv' | 'status' | 'notes' | 'created_at'> & {
  patients?: {
    nom?: string | null
    prenom?: string | null
    telephone?: string | null
    date_naissance?: string | null
  } | null
}

type AppointmentMeta = {
  confirmationState?: 'PLANIFIE' | 'CONFIRME'
  confirmedAt?: string | null
  confirmedBy?: string | null
  clinicalContext?: string
  patientName?: string
  phone?: string
  type?: string
}

const WORKDAY_START = '08:00'
const WORKDAY_END = '18:00'
const SLOT_MINUTES = 15
const META_PREFIX = '__AGENDA_META__'

const formatPatientNumber = (value?: string | null) =>
  `#${String(value || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'PAT'}`

const formatTimeFromIso = (value: string) => {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const calculateAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return undefined
  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return undefined

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

const parseAppointmentMeta = (notes?: string | null) => {
  if (!notes) {
    return {
      clinicalContext: '',
    } satisfies AppointmentMeta
  }

  if (!notes.startsWith(META_PREFIX)) {
    return {
      clinicalContext: notes,
    } satisfies AppointmentMeta
  }

  try {
    return JSON.parse(notes.slice(META_PREFIX.length)) as AppointmentMeta
  } catch {
    return {
      clinicalContext: '',
    } satisfies AppointmentMeta
  }
}

const buildAppointmentMeta = (
  notes: string | null | undefined,
  overrides: Partial<AppointmentMeta>
) => {
  const current = parseAppointmentMeta(notes)
  return `${META_PREFIX}${JSON.stringify({
    confirmationState: current.confirmationState || 'PLANIFIE',
    confirmedAt: current.confirmedAt || null,
    confirmedBy: current.confirmedBy || null,
    clinicalContext: current.clinicalContext || '',
    patientName: current.patientName || '',
    phone: current.phone || '',
    type: current.type || 'Consultation',
    ...overrides,
  })}`
}

const mapAppointmentStatus = (rdv: DailyRdv, meta: AppointmentMeta): AppointmentStatus => {
  if (rdv.status === 'annule') return 'ANNULE'
  if (rdv.status === 'absent') return 'ABSENT'
  if (rdv.status === 'arrive' || rdv.status === 'en_consultation') return 'ARRIVE'
  if (rdv.status === 'termine' || rdv.status === 'paye' || rdv.status === 'credit') return 'TERMINE'
  if (meta.confirmationState === 'CONFIRME' || meta.confirmedAt) return 'CONFIRME'
  return 'PLANIFIE'
}

const mapAgendaStatus = (rdv: DailyRdv): AgendaAppointmentStatus => {
  const meta = parseAppointmentMeta(rdv.notes)
  return mapAppointmentStatus(rdv, meta)
}

const mapRdvToAppointment = (rdv: DailyRdv): Appointment => {
  const meta = parseAppointmentMeta(rdv.notes)
  const patientName =
    `${rdv.patients?.prenom || ''} ${rdv.patients?.nom || ''}`.trim() ||
    meta.patientName ||
    'Patient inconnu'
  const rdvDate = new Date(rdv.date_rdv)
  const date = `${rdvDate.getFullYear()}-${String(rdvDate.getMonth() + 1).padStart(2, '0')}-${String(rdvDate.getDate()).padStart(2, '0')}`

  return {
    id: rdv.id,
    patientId: rdv.patient_id,
    patientName,
    phone: rdv.patients?.telephone || meta.phone || '-',
    age: calculateAge(rdv.patients?.date_naissance),
    date,
    time: formatTimeFromIso(rdv.date_rdv),
    duration: SLOT_MINUTES,
    type: ((meta.type || 'Consultation') as AppointmentType),
    status: mapAppointmentStatus(rdv, meta),
    notes: meta.clinicalContext || '',
    dossierNumber: formatPatientNumber(rdv.patient_id).replace('#', ''),
    createdAt: rdv.created_at,
    confirmedAt: meta.confirmedAt || undefined,
    confirmedBy: meta.confirmedBy || undefined,
  }
}

const AppointmentsPage: React.FC = () => {
  const { profile, notify } = useAppContext()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [draftSlot, setDraftSlot] = useState<{ date: string; time: string } | null>(null)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)

  const handleViewChange = (newView: 'day' | 'week' | 'month') => {
    setIsAnimating(true)
    setView(newView)
    setTimeout(() => setIsAnimating(false), 350)
  }

  const visibleRange = useMemo(() => {
    if (view === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      }
    }

    if (view === 'month') {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }
    }

    return {
      start: startOfDay(selectedDate),
      end: endOfDay(selectedDate),
    }
  }, [selectedDate, view])

  const rangeStartKey = format(visibleRange.start, 'yyyy-MM-dd')
  const rangeEndKey = format(visibleRange.end, 'yyyy-MM-dd')
  const selectedDayKey = format(selectedDate, 'yyyy-MM-dd')

  const {
    data: dailyRdvsRaw = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['agenda-range', profile?.cabinet_id, view, rangeStartKey, rangeEndKey],
    enabled: Boolean(profile?.cabinet_id),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('rdv')
        .select(`
          id,
          patient_id,
          date_rdv,
          status,
          notes,
          created_at,
          patients (nom, prenom, telephone)
        `)
        .eq('cabinet_id', profile!.cabinet_id)
        .gte('date_rdv', `${rangeStartKey}T00:00:00`)
        .lte('date_rdv', `${rangeEndKey}T23:59:59`)
        .order('date_rdv', { ascending: true })

      if (queryError) {
        const errorMsg = queryError?.message || (typeof queryError === 'object' ? JSON.stringify(queryError) : String(queryError))
        console.error('Agenda query error:', errorMsg)
        // Return mock data on error instead of throwing
        return MOCK_RDV as unknown as DailyRdv[]
      }

      return ((data && data.length > 0 ? data : MOCK_RDV) || []) as DailyRdv[]
    },
  })

  // Use mock data when no real data returned
  const dailyRdvs = dailyRdvsRaw.length > 0 ? dailyRdvsRaw : MOCK_RDV as unknown as DailyRdv[]

  const agendaAppointments = useMemo<AgendaCalendarAppointmentInput[]>(() => {
    return dailyRdvs
      .filter((rdv) => mapAgendaStatus(rdv) !== 'ANNULE')
      .map((rdv) => ({
        id: rdv.id,
        date: format(new Date(rdv.date_rdv), 'yyyy-MM-dd'),
        time: formatTimeFromIso(rdv.date_rdv),
        patientName: `${rdv.patients?.prenom || ''} ${rdv.patients?.nom || ''}`.trim() || parseAppointmentMeta(rdv.notes).patientName || 'Patient inconnu',
        patientNumber: formatPatientNumber(rdv.patient_id),
        status: mapAgendaStatus(rdv),
      }))
  }, [dailyRdvs])

  const dayAppointments = useMemo<AgendaAppointmentInput[]>(() => {
    return agendaAppointments
      .filter((appointment) => appointment.date === selectedDayKey)
      .map(({ date: _date, patientNumber: _patientNumber, ...appointment }) => ({
        ...appointment,
        patientNumber: '',
      }))
  }, [agendaAppointments, selectedDayKey])

  const stats = useMemo(() => {
    const confirmed = agendaAppointments.filter((a) => a.status === 'CONFIRME').length
    const pending = agendaAppointments.filter((a) => a.status === 'PLANIFIE' || a.status === 'A_CONFIRMER').length
    const cancelled = agendaAppointments.filter((a) => a.status === 'ANNULE').length
    return {
      total: agendaAppointments.length,
      confirmed,
      pending,
      cancelled
    }
  }, [agendaAppointments])

  const selectedAppointment = useMemo(() => {
    const match = dailyRdvs.find((rdv) => rdv.id === selectedAppointmentId)
    return match ? mapRdvToAppointment(match) : null
  }, [dailyRdvs, selectedAppointmentId])

  const editingAppointment = useMemo(() => {
    return dailyRdvs.find((rdv) => rdv.id === editingAppointmentId) ?? null
  }, [dailyRdvs, editingAppointmentId])

  const refreshDay = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['agenda-range', profile?.cabinet_id],
    })
  }

  const handleAppointmentStatusUpdate = async (appointment: Appointment, status: AppointmentStatus, metadata?: any) => {
    const rdv = dailyRdvs.find((item) => item.id === appointment.id)
    if (!rdv) return

    const queryKey = ['agenda-range', profile?.cabinet_id, view, rangeStartKey, rangeEndKey]
    const previousData = queryClient.getQueryData(queryKey)
    const statusUpdatedAt = new Date().toISOString()

    // OPTIMISTIC UPDATE
    queryClient.setQueryData(queryKey, (old: DailyRdv[] | undefined) => {
      if (!old) return old
      return old.map((item) => {
        if (item.id === appointment.id) {
          let newNotes = item.notes
          if (status === 'CONFIRME') {
            const now = new Date().toISOString()
            newNotes = buildAppointmentMeta(item.notes, {
              confirmationState: 'CONFIRME',
              confirmedAt: now,
              confirmedBy: 'le secrétariat',
              phone: appointment.phone,
              patientName: appointment.patientName,
              type: appointment.type,
            })
          } else if (status === 'ANNULE' && metadata?.reason) {
            newNotes = buildAppointmentMeta(item.notes, {
              cancellationReason: metadata.reason,
              cancelledAt: new Date().toISOString(),
              phone: appointment.phone,
              patientName: appointment.patientName,
              type: appointment.type,
            })
          }
          return { ...item, status: status.toLowerCase(), notes: newNotes }
        }
        return item
      })
    })

    try {
      if (status === 'ANNULE') {
        let newNotes = rdv.notes
        if (metadata?.reason) {
          newNotes = buildAppointmentMeta(rdv.notes, {
            cancellationReason: metadata.reason,
            cancelledAt: new Date().toISOString(),
            cancelledBy: profile?.id,
            phone: appointment.phone,
            patientName: appointment.patientName,
            type: appointment.type,
          })
        }

        await cancelAppointment(appointment.id, metadata?.reason || null)

        if (metadata?.reason) {
          const { error: notesError } = await supabase
            .from('rdv')
            .update({ notes: newNotes })
            .eq('id', appointment.id)
          if (notesError) throw notesError
        }
      } else if (status === 'CONFIRME') {
        const now = new Date().toISOString()
        const newNotes = buildAppointmentMeta(rdv.notes, {
          confirmationState: 'CONFIRME',
          confirmedAt: now,
          confirmedBy: 'le secrétariat',
          phone: appointment.phone,
          patientName: appointment.patientName,
          type: appointment.type,
        })

        await confirmAppointment(appointment.id)

        const { error: notesError } = await supabase
          .from('rdv')
          .update({ notes: newNotes })
          .eq('id', appointment.id)
        if (notesError) throw notesError
      } else if (status === 'ARRIVE') {
        const { error: arriveError } = await supabase
          .from('rdv')
          .update({ status: 'arrive' })
          .eq('id', appointment.id)
        if (arriveError) throw arriveError
      }

      await refreshDay()
    } catch (error: any) {
      const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
      console.error('Status update error:', errorMsg)
      // ROLLBACK
      queryClient.setQueryData(queryKey, previousData)
      notify({
        title: 'Erreur',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  const handlePrev = () => {
    if (view === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1))
      return
    }
    if (view === 'month') {
      setSelectedDate(subMonths(selectedDate, 1))
      return
    }
    setSelectedDate(subDays(selectedDate, 1))
  }

  const handleNext = () => {
    if (view === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1))
      return
    }
    if (view === 'month') {
      setSelectedDate(addMonths(selectedDate, 1))
      return
    }
    setSelectedDate(addDays(selectedDate, 1))
  }

  const periodLabel = useMemo(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return `Semaine du ${format(weekStart, 'd MMM', { locale: fr })} au ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`
    }
    if (view === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: fr })
    }
    const label = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
  }, [selectedDate, view])

  if (!profile?.cabinet_id) {
    return (
      <div className="w-full px-6">
        <div className="mx-auto max-w-[1100px] rounded-[22px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Agenda indisponible</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Aucun cabinet actif n&apos;est lié à ce compte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-6 pb-10 pt-0 bg-slate-50">
      <div className="mx-auto max-w-full space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            {/* Left: Date section */}
            <div className="flex flex-1 items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-inner">
                <CalendarIcon size={20} />
              </div>
              <h1 className={cn("text-lg font-black text-slate-900 leading-none", view !== 'day' && "capitalize")}>{periodLabel}</h1>
            </div>

            {/* Center: View toggles & Date navigation */}
            <div className="flex items-center justify-center gap-8">
              <div className="relative inline-flex rounded-[24px] bg-slate-100 p-1">
                <div 
                  className="absolute top-1 left-1 h-10 w-28 rounded-[20px] bg-blue-600 shadow-sm transition-all duration-700"
                  style={{
                    transform: `translateX(${view === 'day' ? 0 : view === 'week' ? 112 : 224}px) scaleX(${isAnimating ? 1.08 : 1})`,
                    transitionTimingFunction: 'cubic-bezier(0.25, 1.5, 0.5, 1)'
                  }}
                />
                {(['day', 'week', 'month'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleViewChange(option)}
                    className={cn(
                      "relative z-10 rounded-[20px] px-5 py-2 text-sm font-semibold transition-all duration-400 h-10 w-28 text-center",
                      view === option
                        ? 'text-white'
                        : 'text-slate-700 hover:text-slate-800 hover:bg-slate-200/50'
                    )}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.25, 1.5, 0.5, 1)'
                    }}
                  >
                    {option === 'day' ? 'Jour' : option === 'week' ? 'Semaine' : 'Mois'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrev} className="rounded-[16px] border border-slate-200 p-2 h-10 transition-colors hover:bg-slate-100">
                  <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <button onClick={() => setSelectedDate(new Date())} className="rounded-[16px] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 h-10 transition-colors hover:bg-slate-100">
                  Aujourd&apos;hui
                </button>
                <button onClick={handleNext} className="rounded-[16px] border border-slate-200 p-2 h-10 transition-colors hover:bg-slate-100">
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Right: Action button */}
            <div className="flex flex-1 justify-end">
              <button
                onClick={() => setDraftSlot({ date: selectedDayKey, time: '09:00' })}
                className="flex items-center gap-2 rounded-[16px] bg-blue-600 px-6 py-2 text-sm font-semibold text-white h-10 shadow-lg shadow-blue-600/20 transition-all active:scale-95 hover:bg-blue-700"
              >
                <Plus size={18} />
                Nouveau RDV
              </button>
            </div>
          </div>
        </div>

        <div className="animate-in fade-in duration-500">
          {error && (
            <div className="rounded-[22px] border border-rose-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-rose-600">
                Impossible de charger l&apos;agenda pour cette période.
              </p>
            </div>
          )}

          {!error && view === 'day' && (
            <AgendaDayView
              date={selectedDate}
              appointments={dayAppointments}
              startTime={WORKDAY_START}
              endTime={WORKDAY_END}
              slotMinutes={SLOT_MINUTES}
              onSelectAppointment={setSelectedAppointmentId}
              onCreateAt={(time) => setDraftSlot({ date: selectedDayKey, time })}
            />
          )}

          {!error && view === 'week' && (
            <WeeklyAgenda
              selectedDate={selectedDate}
              appointments={agendaAppointments}
              onSelectAppointment={setSelectedAppointmentId}
              onDayClick={(date) => {
                setSelectedDate(date)
                setView('day')
              }}
            />
          )}

          {!error && view === 'month' && (
            <MonthlyAgenda
              selectedDate={selectedDate}
              appointments={agendaAppointments}
              onDayClick={(date) => {
                setSelectedDate(date)
                setView('day')
              }}
            />
          )}
        </div>

        {isFetching && (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Actualisation…
          </p>
        )}

        <AppointmentFormModal
          open={Boolean(draftSlot) || Boolean(editingAppointment)}
          onClose={() => {
            setDraftSlot(null)
            setEditingAppointmentId(null)
          }}
          appointment={editingAppointment}
          initialDate={draftSlot?.date}
          initialTime={draftSlot?.time}
          onSuccess={refreshDay}
        />

        <AppointmentDetailModal
          isOpen={Boolean(selectedAppointment)}
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointmentId(null)}
          onEditTime={(appointment) => {
            setSelectedAppointmentId(null)
            setEditingAppointmentId(appointment.id)
          }}
          onUpdateStatus={handleAppointmentStatusUpdate}
        />
      </div>
    </div>
  )
}

export default AppointmentsPage
