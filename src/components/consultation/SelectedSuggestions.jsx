import { AnimatePresence, motion } from 'framer-motion'
import { Tag } from '../common/Chip'

// The suggestions currently in a field's text, shown as small removable tags
// under the textarea (visible even when the suggestions panel is closed).
// Clicking a tag reopens the panel on that phrase's category; its x removes the
// phrase from the text. Green = confirmed/active, same as the checked chips in
// the panel.
// items: [{ text, group }]
export default function SelectedSuggestions({ items, onOpen, onRemove }) {
  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <motion.div key="selected" role="list" aria-label="Suggestions sélectionnées"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
          className="overflow-hidden">
          <div className="flex flex-wrap gap-1.5 pt-2">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((s) => (
                <motion.span key={s.text} role="listitem" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
                  className="inline-flex max-w-full">
                  <Tag tone="success" label={s.text} title={`${s.text} — voir la catégorie « ${s.group} »`} onSelect={() => onOpen(s)} onRemove={() => onRemove(s)}>{s.text}</Tag>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
