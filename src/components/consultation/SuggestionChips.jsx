import { Sparkles, Building2, Stethoscope, Search, Activity, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const ICONS = {
  usage: Sparkles,
  catalogue: Building2,
  default: Stethoscope,
  typed: Search,
}

// Organized, categorized quick-pick grid for consultation acts
// items: [{ key, label, hint?, values }]; `selectedKey` marks the current pick.
export default function SuggestionChips({
  label = 'Les plus fréquents',
  items,
  selectedKey,
  onPick,
  groupKey = 'usage',
  className = '',
}) {
  if (!items?.length) return null

  const GroupIcon = ICONS[groupKey] || Activity

  return (
    <div className={cn('space-y-1.5', className)} role="group" aria-label={label}>
      <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-1.5">
          <GroupIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>{label}</span>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          {items.length} acte{items.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((it) => {
          const isSelected = selectedKey === it.key
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onPick(it)}
              className={cn(
                'flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer group',
                isSelected
                  ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 border-slate-200/70 hover:bg-blue-50/40 hover:border-blue-200 text-slate-800'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors text-xs',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200/80 group-hover:border-blue-300 group-hover:text-blue-600'
                  )}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[12.5px] font-semibold truncate leading-tight">
                  {it.label}
                </span>
              </div>

              {it.hint && (
                <span
                  className={cn(
                    'text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums shrink-0 ml-1.5 whitespace-nowrap transition-colors',
                    isSelected
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-slate-600 border border-slate-200/70 group-hover:border-blue-200 group-hover:text-blue-700'
                  )}
                >
                  {it.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
