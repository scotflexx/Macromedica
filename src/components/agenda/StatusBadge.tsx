import { memo } from 'react'
import { cn } from '../../lib/utils'
import type { AgendaAppointmentStatus } from './useAgenda'

interface StatusBadgeProps {
  status: AgendaAppointmentStatus
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  CONFIRME: {
    label: 'Confirmé',
    className: 'bg-green-100 text-green-700',
  },
  A_CONFIRMER: {
    label: 'À confirmer',
    className: 'bg-amber-100 text-amber-700',
  },
  PLANIFIE: {
    label: 'À confirmer',
    className: 'bg-amber-100 text-amber-700',
  },
  ANNULE: {
    label: 'Annulé',
    className: 'bg-red-100 text-red-700',
  },
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_STYLES[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

export default memo(StatusBadge)
