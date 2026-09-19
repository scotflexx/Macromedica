import { useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { SUGGESTIONS_BY_KIND } from '../../data/clinicalSuggestions'

const PAGE = 18
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const toText = (item) => (typeof item === 'string' ? item : item.code ? `${item.text} (${item.code})` : item.text)

export default function SuggestionPanel({ kind, value, onChange }) {
  const cfg = SUGGESTIONS_BY_KIND[kind]
  const [group, setGroup] = useState(cfg.data[0].group)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const items = useMemo(() => {
    const q = norm(query.trim())
    if (q) {
      return [...new Set(cfg.data.flatMap((g) => g.items).map(toText))].filter((t) => norm(t).includes(q))
    }
    const g = cfg.data.find((x) => x.group === group) || cfg.data[0]
    return [...new Set(g.items.map(toText))]
  }, [cfg, group, query])

  const insert = (text) => {
    if (value.includes(text)) return
    const base = value.replace(/\s+$/, '')
    onChange(base ? base + cfg.joiner + text : text)
  }

  const visible = items.slice(0, limit)

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
            placeholder="Rechercher une suggestion…"
            aria-label="Rechercher une suggestion"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {!query && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Catégories">
          {cfg.data.map((g) => (
            <button
              key={g.group}
              type="button"
              role="tab"
              aria-selected={group === g.group}
              onClick={() => { setGroup(g.group); setLimit(PAGE) }}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${group === g.group ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}
            >
              {g.group}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">Aucune suggestion. Saisissez librement dans le champ ci-dessus.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((text) => {
            const used = value.includes(text)
            return (
              <button
                key={text}
                type="button"
                aria-pressed={used}
                onClick={() => insert(text)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-left text-[12.5px] font-medium transition-colors ${used ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}
              >
                {used ? <Check className="h-3 w-3 flex-shrink-0" /> : <Plus className="h-3 w-3 flex-shrink-0 text-slate-400" />}
                {text}
              </button>
            )
          })}
        </div>
      )}

      {items.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} className="mt-2.5 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900">
          Afficher plus ({items.length - limit})
        </button>
      )}
    </div>
  )
}
