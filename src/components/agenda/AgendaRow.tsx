import { memo } from 'react'
import { cn } from '../../lib/utils'
import type { AgendaAppointmentItem } from './useAgenda'

interface AgendaRowProps {
  item: AgendaAppointmentItem
  onSelectAppointment?: (id: string) => void
}

function AgendaRow({ item, onSelectAppointment }: AgendaRowProps) {
  // Helper to strip dossier prefix if present
  const displayName = item.patientName.replace(/^(Dossier\s*#?\d+\s*-\s*|#\d+\s*-\s*)/i, '').trim()

  const statusConfig: Record<string, { border: string; bg: string; label: string; labelColor: string; dotColor: string }> = {
    CONFIRME: {
      border: 'border border-blue-200',
      bg: 'bg-blue-50',
      label: 'Confirmé',
      labelColor: 'text-blue-600',
      dotColor: 'bg-blue-500',
    },
    A_CONFIRMER: {
      border: 'border border-amber-200',
      bg: 'bg-amber-50',
      label: 'À confirmer',
      labelColor: 'text-amber-600',
      dotColor: 'bg-amber-500',
    },
    PLANIFIE: {
      border: 'border border-amber-200',
      bg: 'bg-amber-50',
      label: 'À confirmer',
      labelColor: 'text-amber-600',
      dotColor: 'bg-amber-500',
    },
    ANNULE: {
      border: 'border border-red-200',
      bg: 'bg-red-50',
      label: 'Annulé',
      labelColor: 'text-red-600',
      dotColor: 'bg-red-500',
    },
    ARRIVE: {
      border: 'border border-green-200',
      bg: 'bg-green-50',
      label: 'Arrivé',
      labelColor: 'text-green-600',
      dotColor: 'bg-green-500',
    },
  }

  const config = statusConfig[item.status] || statusConfig.PLANIFIE

  return (
    <button
      type="button"
      onClick={() => onSelectAppointment?.(item.id)}
      className="group grid h-10 w-full grid-cols-[70px_24px_1fr] items-center px-4 text-left transition-colors duration-150 hover:bg-gray-100 bg-gray-50 border-b border-gray-200"
    >
      <div
        className={cn(
          'pr-3 text-right text-sm font-semibold tabular-nums text-gray-700',
          item.overlapIndex > 0 && 'text-transparent',
          item.isPast && 'text-gray-400',
          item.isNow && item.overlapIndex === 0 && 'text-blue-600'
        )}
      >
        {item.time}
      </div>

      <div className="flex justify-center">
        <span className={cn("h-3 w-3 rounded-full", config.dotColor)} />
      </div>

      <div
        className="flex items-center"
        style={{
          marginTop: item.overlapIndex > 0 ? `${item.overlapIndex * 3}px` : undefined,
        }}
      >
        <div
          className={cn(
            'flex h-8 flex-1 items-center justify-between rounded-lg px-3 shadow-sm transition-colors',
            config.border,
            config.bg,
            item.isPast && 'opacity-70'
          )}
        >
          <span className="truncate text-sm font-semibold text-gray-900">{displayName}</span>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider ml-2", config.labelColor)}>
            {config.label}
          </span>
        </div>
      </div>
    </button>
  )
}

export default memo(AgendaRow)
