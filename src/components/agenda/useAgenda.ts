import { useEffect, useMemo, useState } from 'react'
import { isSameDay, startOfDay } from 'date-fns'
import { AppointmentStatus } from '../../types/appointment'

export type AgendaAppointmentStatus = AppointmentStatus

export interface AgendaAppointmentInput {
  id: string
  time: string
  patientName: string
  patientNumber: string
  status: AgendaAppointmentStatus
}

export interface AgendaCalendarAppointmentInput extends AgendaAppointmentInput {
  date: string
}

type AgendaItemBase = {
  key: string
  time: string
  minutes: number
  isPast: boolean
  isNow: boolean
  isFuture: boolean
  overlapIndex: number
  overlapCount: number
}

export interface AgendaAppointmentItem extends AgendaItemBase {
  type: 'appointment'
  id: string
  patientName: string
  patientNumber: string
  status: AgendaAppointmentStatus
}

export interface AgendaFreeItem extends AgendaItemBase {
  type: 'free'
}

export interface AgendaTimeIndicatorItem {
  type: 'time-indicator'
  key: string
  time: string
  label: string
}

export type AgendaItem = AgendaAppointmentItem | AgendaFreeItem | AgendaTimeIndicatorItem

interface UseAgendaOptions {
  date: Date
  appointments: AgendaAppointmentInput[]
  startTime?: string
  endTime?: string
  slotMinutes?: number
  now?: Date
}

export const DEFAULT_START_TIME = '08:00'
export const DEFAULT_END_TIME = '18:00'
export const DEFAULT_SLOT_MINUTES = 15

export const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

export const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes)
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export const generateSlots = (startMinutes: number, endMinutes: number, stepMinutes: number) => {
  const slots: number[] = []

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += stepMinutes) {
    slots.push(minutes)
  }

  return slots
}

const useCurrentMinute = (override?: Date) => {
  const [currentTime, setCurrentTime] = useState(() => override ?? new Date())

  useEffect(() => {
    if (override) {
      setCurrentTime(override)
      return undefined
    }

    const updateNow = () => {
      setCurrentTime(new Date())
    }

    updateNow()

    const now = new Date()
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    let intervalId: number | undefined

    const timeoutId = window.setTimeout(() => {
      updateNow()
      intervalId = window.setInterval(updateNow, 60_000)
    }, msUntilNextMinute)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [override])

  return currentTime
}

export function useAgenda({
  date,
  appointments,
  startTime = DEFAULT_START_TIME,
  endTime = DEFAULT_END_TIME,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  now,
}: UseAgendaOptions) {
  const currentTime = useCurrentMinute(now)

  return useMemo(() => {
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)

    if (
      startMinutes === null ||
      endMinutes === null ||
      slotMinutes <= 0 ||
      endMinutes < startMinutes
    ) {
      return {
        items: [] as AgendaItem[],
        freeSlotCount: 0,
        appointmentCount: 0,
      }
    }

    const visibleAppointments = appointments
      .map((appointment, index) => {
        const minutes = parseTimeToMinutes(appointment.time)

        if (minutes === null || minutes < startMinutes || minutes > endMinutes) {
          return null
        }

        return {
          ...appointment,
          minutes,
          originalIndex: index,
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left!.minutes !== right!.minutes) {
          return left!.minutes - right!.minutes
        }

        return left!.originalIndex - right!.originalIndex
      }) as Array<AgendaAppointmentInput & { minutes: number; originalIndex: number }>

    const overlapsByMinute = new Map<number, number>()
    const appointmentsByMinute = new Map<number, Array<AgendaAppointmentInput & { minutes: number }>>()

    visibleAppointments.forEach((appointment) => {
      overlapsByMinute.set(
        appointment.minutes,
        (overlapsByMinute.get(appointment.minutes) ?? 0) + 1
      )

      const bucket = appointmentsByMinute.get(appointment.minutes) ?? []
      bucket.push(appointment)
      appointmentsByMinute.set(appointment.minutes, bucket)
    })

    const selectedDay = startOfDay(date).getTime()
    const currentDay = startOfDay(currentTime).getTime()
    const isToday = isSameDay(date, currentTime)
    const isPastDay = selectedDay < currentDay
    const isFutureDay = selectedDay > currentDay
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

    const baseItems: Array<AgendaAppointmentItem | AgendaFreeItem> = []

    generateSlots(startMinutes, endMinutes, slotMinutes).forEach((slotMinutesValue) => {
      const slotTime = formatMinutes(slotMinutesValue)
      const slotAppointments = appointmentsByMinute.get(slotMinutesValue)

      if (slotAppointments?.length) {
        slotAppointments.forEach((appointment, overlapIndex) => {
          baseItems.push({
            type: 'appointment',
            key: `appointment-${slotTime}-${appointment.id}`,
            id: appointment.id,
            time: slotTime,
            minutes: slotMinutesValue,
            patientName: appointment.patientName,
            patientNumber: appointment.patientNumber,
            status: appointment.status,
            isPast: false,
            isNow: false,
            isFuture: false,
            overlapIndex,
            overlapCount: overlapsByMinute.get(slotMinutesValue) ?? 1,
          })
        })
        return
      }

      baseItems.push({
        type: 'free',
        key: `free-${slotTime}`,
        time: slotTime,
        minutes: slotMinutesValue,
        isPast: false,
        isNow: false,
        isFuture: false,
        overlapIndex: 0,
        overlapCount: 1,
      })
    })

    let closestItemKey: string | null = null

    if (isToday && baseItems.length > 0) {
      closestItemKey = baseItems.reduce<string | null>((closest, item) => {
        if (!closest) {
          return item.key
        }

        const closestItem = baseItems.find((candidate) => candidate.key === closest)
        if (!closestItem) {
          return item.key
        }

        const closestDistance = Math.abs(closestItem.minutes - currentMinutes)
        const nextDistance = Math.abs(item.minutes - currentMinutes)

        if (nextDistance < closestDistance) {
          return item.key
        }

        if (nextDistance === closestDistance && item.minutes < closestItem.minutes) {
          return item.key
        }

        return closest
      }, baseItems[0]?.key ?? null)
    }

    const enrichedItems = baseItems.map((item) => ({
      ...item,
      isPast: isPastDay || (isToday && item.minutes < currentMinutes),
      isNow: Boolean(closestItemKey && item.key === closestItemKey),
      isFuture: isFutureDay || (isToday && item.minutes > currentMinutes),
    }))

    const items: AgendaItem[] = [...enrichedItems]

    if (isToday && enrichedItems.length > 0) {
      let lastPastOrPresentIndex = -1

      for (let index = enrichedItems.length - 1; index >= 0; index -= 1) {
        if (enrichedItems[index].minutes <= currentMinutes) {
          lastPastOrPresentIndex = index
          break
        }
      }

      items.splice(lastPastOrPresentIndex === -1 ? 0 : lastPastOrPresentIndex + 1, 0, {
        type: 'time-indicator',
        key: `time-indicator-${formatMinutes(currentMinutes)}`,
        time: formatMinutes(currentMinutes),
        label: `${formatMinutes(currentMinutes)} MAINTENANT`,
      })
    }

    return {
      items,
      freeSlotCount: baseItems.filter((item) => item.type === 'free').length,
      appointmentCount: visibleAppointments.length,
    }
  }, [appointments, currentTime, date, endTime, slotMinutes, startTime])
}
