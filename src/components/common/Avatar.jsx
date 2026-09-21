import { cn } from '../../lib/utils'

// Initials avatar for a person. Each one gets a soft tint from the app's own palette, chosen from a
// stable seed (the patient id), so the same patient has the same color everywhere they appear.
// Children render inside (e.g. a small status badge positioned absolutely).
const TONES = [
  'from-blue-100 to-blue-200 text-blue-700 ring-blue-200',
  'from-violet-100 to-violet-200 text-violet-700 ring-violet-200',
  'from-emerald-100 to-emerald-200 text-emerald-700 ring-emerald-200',
  'from-amber-100 to-amber-200 text-amber-700 ring-amber-200',
  'from-pink-100 to-pink-200 text-pink-700 ring-pink-200',
  'from-sky-100 to-sky-200 text-sky-700 ring-sky-200',
]

const SIZES = {
  sm: 'h-10 w-10 rounded-full text-[13px]',
  md: 'h-11 w-11 rounded-full text-[14px]',
  lg: 'h-14 w-14 rounded-2xl text-[18px]',
}

const toneFor = (seed) => {
  const s = String(seed || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

export default function Avatar({ seed, initials, size = 'md', className = '', children, ...rest }) {
  return (
    <div
      {...rest}
      className={cn(
        'relative flex flex-shrink-0 items-center justify-center bg-gradient-to-br font-extrabold tracking-tight shadow-sm ring-1',
        SIZES[size] || SIZES.md,
        toneFor(seed),
        className
      )}
    >
      {initials || '?'}
      {children}
    </div>
  )
}
