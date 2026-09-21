import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { SUGGESTIONS_BY_KIND } from '../../data/clinicalSuggestions'
import { insertPhrase, toText } from '../../lib/suggestionText'
import Button from '../common/Button'
import Chip from '../common/Chip'
import IconButton from '../common/IconButton'

const PAGE = 18
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Category tabs: one row that scrolls sideways. A fade + chevron on each edge
// that still has hidden tabs makes it obvious more categories exist (and the
// chevron scrolls for mice without a horizontal wheel). The active tab is kept
// in view, e.g. when the panel is reopened from a selected-suggestion tag.
function CategoryTabs({ groups, group, onGroupChange }) {
  const row = useRef(null)
  const tabs = useRef({})
  const [edge, setEdge] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = row.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, groups])

  useEffect(() => {
    const el = row.current
    const tab = tabs.current[group]
    if (!el || !tab) return
    el.scrollTo({ left: Math.max(0, tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2), behavior: 'smooth' })
  }, [group])

  const nudge = (dir) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.7, behavior: 'smooth' })
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }

  return (
    <div className="relative mb-2.5">
      <div ref={row} onScroll={measure} role="tablist" aria-label="Catégories" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <Chip key={g.group} ref={(n) => { tabs.current[g.group] = n }} role="tab" size="md" selected={group === g.group} className="flex-shrink-0" onClick={() => onGroupChange(g.group)}>
            {g.group}
          </Chip>
        ))}
      </div>
      <AnimatePresence>
        {edge.left && (
          <motion.div key="l" data-edge="left" {...fade} className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center bg-gradient-to-r from-white via-white/90 to-transparent">
            <IconButton size="xs" look="soft" label="Catégories précédentes" onClick={() => nudge(-1)} className="pointer-events-auto"><ChevronLeft className="h-3 w-3" /></IconButton>
          </motion.div>
        )}
        {edge.right && (
          <motion.div key="r" data-edge="right" {...fade} className="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent">
            <IconButton size="xs" look="soft" label="Catégories suivantes" onClick={() => nudge(1)} className="pointer-events-auto"><ChevronRight className="h-3 w-3" /></IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// `bare` drops the framed background so the panel can live inside a popover.
// The active category is owned by the caller (so a selected-suggestion tag can
// reopen the panel on it); it falls back to the first category.
export default function SuggestionPanel({ kind, value, onChange, bare = false, group: groupProp, onGroupChange }) {
  const cfg = SUGGESTIONS_BY_KIND[kind]
  const [ownGroup, setOwnGroup] = useState(cfg.data[0].group)
  const group = groupProp ?? ownGroup
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const pickGroup = (g) => { (onGroupChange || setOwnGroup)(g); setLimit(PAGE) }

  const items = useMemo(() => {
    const q = norm(query.trim())
    if (q) {
      return [...new Set(cfg.data.flatMap((g) => g.items).map(toText))].filter((t) => norm(t).includes(q))
    }
    const g = cfg.data.find((x) => x.group === group) || cfg.data[0]
    return [...new Set(g.items.map(toText))]
  }, [cfg, group, query])

  const insert = (text) => onChange(insertPhrase(value, text, cfg.joiner))

  const visible = items.slice(0, limit)

  return (
    <div className={bare ? '' : 'rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5'}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
            placeholder="Rechercher une suggestion…"
            aria-label="Rechercher une suggestion"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {!query && <CategoryTabs groups={cfg.data} group={group} onGroupChange={pickGroup} />}

      {visible.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">Aucune suggestion. Saisissez librement dans le champ ci-dessus.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((text) => {
            const used = value.includes(text)
            return (
              <Chip key={text} selected={used} tone="success" size="md" icon={used ? Check : Plus} className="text-left" onClick={() => insert(text)}>
                {text}
              </Chip>
            )
          })}
        </div>
      )}

      {items.length > limit && (
        <Button variant="link" className="mt-2.5 text-slate-600" onClick={() => setLimit(limit + PAGE)}>
          Afficher plus ({items.length - limit})
        </Button>
      )}
    </div>
  )
}
