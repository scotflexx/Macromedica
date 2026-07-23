import { memo } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { AgendaFreeItem } from './useAgenda'

interface FreeSlotRowProps {
  item: AgendaFreeItem
  onCreateAt?: (time: string) => void
}

function FreeSlotRow({ item, onCreateAt }: FreeSlotRowProps) {
  return (
    <button
      type="button"
      onClick={() => onCreateAt?.(item.time)}
      className="w-full text-left group grid h-10 grid-cols-[70px_24px_1fr] items-center px-4 transition-colors duration-150 hover:bg-gray-100 cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 border-b border-gray-200"
    >
      <div
        className={cn(
          'pr-3 text-right text-sm font-semibold tabular-nums text-gray-700 transition-colors group-hover:text-blue-600',
          item.isPast && 'text-gray-400',
          item.isNow && 'text-blue-600'
        )}
      >
        {item.time}
      </div>

      <div className="flex justify-center">
        <span className="h-3 w-3 rounded-full border border-gray-500 bg-white transition-colors group-hover:border-blue-500 group-hover:bg-blue-50" />
      </div>

      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-semibold text-gray-500 transition-colors group-hover:text-blue-600', item.isPast && 'text-gray-400')}>
          — Libre
        </span>

        <div className="inline-flex size-6 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-500 opacity-0 transition-all group-hover:opacity-100 shadow-sm">
          <Plus className="size-3.5" />
        </div>
      </div>
    </button>
  )
}

export default memo(FreeSlotRow)
