// Pure text helpers behind the suggestion chips, so the field text stays the
// single source of truth: a phrase is "selected" exactly when it appears in the
// text, and selecting/removing one edits that text.

export const toText = (item) => (typeof item === 'string' ? item : item.code ? `${item.text} (${item.code})` : item.text)

// Append `phrase` (skipped when already present) using the kind's joiner.
export function insertPhrase(value, phrase, joiner) {
  if (value.includes(phrase)) return value
  const base = value.replace(/\s+$/, '')
  return base ? base + joiner + phrase : phrase
}

// Remove the first occurrence of `phrase` together with one adjacent joiner, so
// no dangling ", " / blank line / double space is left behind.
export function removePhrase(value, phrase, joiner) {
  const i = value.indexOf(phrase)
  if (i < 0) return value
  let before = value.slice(0, i)
  let after = value.slice(i + phrase.length)
  if (before.endsWith(joiner)) before = before.slice(0, -joiner.length)
  else if (after.startsWith(joiner)) after = after.slice(joiner.length)
  return (before + after).trim()
}

// Suggestions from `groups` ([{ group, items }]) whose phrase appears in `value`,
// in the order they appear in the text. Each carries the (first) category it
// belongs to, so the panel can reopen on it.
export function findSelected(groups, value) {
  if (!value) return []
  const seen = new Map()
  for (const g of groups) {
    for (const it of g.items) {
      const text = toText(it)
      if (text && !seen.has(text) && value.includes(text)) seen.set(text, { text, group: g.group, at: value.indexOf(text) })
    }
  }
  return [...seen.values()].sort((a, b) => a.at - b.at)
}
