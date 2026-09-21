import { forwardRef } from 'react'

// Icon-only button: one radius, four sizes, three looks. `label` is required
// (it becomes aria-label and tooltip).
//   ghost  -> quiet until hovered (collapse, close, remove)
//   soft   -> light grey fill (modal close, dictation)
//   onDark / onSuccess -> for use inside a dark / green pill (tag remove)
// `alert` is the reserved red state (e.g. dictation currently recording).
const SIZES = {
  xs: 'h-5 w-5 rounded-full',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-10 w-10 rounded-lg',
}
const LOOKS = {
  ghost: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
  soft: 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
  onDark: 'text-white hover:bg-white/20',
  onSuccess: 'text-green-800 hover:bg-green-200',
}
const ALERT = 'bg-red-100 text-red-600 ring-1 ring-red-300 animate-pulse'

const IconButton = forwardRef(function IconButton({ label, size = 'sm', look = 'ghost', alert = false, className = '', type = 'button', children, ...rest }, ref) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label}
      className={`inline-flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40 ${SIZES[size]} ${alert ? ALERT : LOOKS[look]} ${className}`} {...rest}>
      {children}
    </button>
  )
})

export default IconButton
