// Pure helpers for the sticky section navigation, kept free of React/DOM so the
// rules can be tested on their own.
//
// All positions are measured relative to the scroll box's own top edge
// (getBoundingClientRect deltas), never with offsetTop: the scroll box is not a
// positioned element, so a section's offsetTop is measured from the full-screen
// dialog instead and is off by the header height.

// Height reserved at the top of the scroll box for the sticky tab bar (~53px)
// plus a small breathing gap.
export const SCROLL_OFFSET = 64

const SPY_SLACK = 8

// tops: [{ id, top }] in document order, `top` = section top relative to the
// scroll box viewport. Active step = the last section whose top has reached the
// tab bar. At the very end of the scroll range the last section wins, because
// a short final section can never be scrolled up to the tab bar.
export function pickActiveStep(tops, { atBottom = false } = {}) {
  if (!tops.length) return null
  if (atBottom) return tops[tops.length - 1].id
  let current = tops[0].id
  for (const t of tops) if (t.top <= SCROLL_OFFSET + SPY_SLACK) current = t.id
  return current
}

// Where to scroll so `sectionTop` lands just under the tab bar, clamped to the
// scrollable range.
export function scrollTargetFor(sectionTop, scrollTop, maxScroll) {
  return Math.min(Math.max(scrollTop + sectionTop - SCROLL_OFFSET, 0), Math.max(maxScroll, 0))
}

export function isAtBottom(scrollTop, maxScroll) {
  return maxScroll > 0 && scrollTop >= maxScroll - 2
}
