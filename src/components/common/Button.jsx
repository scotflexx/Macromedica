import { forwardRef } from 'react'

// The dashboard's button system, extracted from the "Commencer" / "Historique"
// buttons on the dashboard so every screen shares one shape and one interaction:
// 0.625rem radius, 2px border, 250ms ease, lift on hover, small press-down on
// click. `md` carries the exact geometry/motion that was inline there; `sm` and `xs`
// keep the same shape/motion at toolbar and inline sizes.
//
//   accent    -> the blue call to action ("Commencer", "Nouvelle consultation")
//   accentOutline -> like secondary, in the accent blue (blue border and text, white fill) ("Arrivée sans RDV")
//   primary   -> the dark primary action ("Terminer la consultation", modal "Enregistrer")
//   success   -> green: finalizing actions only ("Confirmer et terminer" in the finish-consultation
//                modal, the payment modal's confirm). Deliberate exceptions; do not use elsewhere.
//   secondary -> "Annuler", "Historique" (white, slate outline)
//   ghost     -> no fill/border until hovered (quiet toolbar actions)
//   danger    -> destructive confirmation (red is functional, not decorative)
//   link      -> inline text action (underlined, no box)
//
// The sibling families are Chip (toggles/tags) and IconButton (icon-only).
const BASE = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.625rem] border-2 font-bold '
  + 'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:-translate-y-px active:scale-[0.98] '
  + 'disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0'

const SIZES = {
  md: 'px-4 py-2.5 min-h-[44px] text-[14px]',
  sm: 'px-3.5 py-1.5 min-h-[36px] text-[13px]',
  xs: 'px-2.5 py-1 min-h-[28px] text-[12px]',
}

const VARIANTS = {
  accent: 'border-[#60A5FA] bg-[#2563EB] text-white hover:border-[#1E3A8A] hover:bg-[#1E40AF] hover:shadow-[0_6px_16px_-4px_rgba(37,99,235,0.15)]',
  accentOutline: 'border-[#60A5FA] bg-white text-[#2563EB] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:shadow-[0_6px_16px_-4px_rgba(37,99,235,0.15)]',
  primary: 'border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700 hover:shadow-[0_6px_16px_-4px_rgba(37,99,235,0.25)]',
  dark: 'border-slate-700 bg-slate-900 text-white hover:border-black hover:bg-slate-800 hover:shadow-[0_6px_16px_-4px_rgba(15,23,42,0.25)]',
  success: 'border-green-700 bg-green-600 text-white hover:border-green-800 hover:bg-green-700 hover:shadow-[0_6px_16px_-4px_rgba(22,163,74,0.25)]',
  secondary: 'border-[#CBD5E1] bg-white text-[#334155] hover:border-[#94A3B8] hover:bg-[#F1F5F9] hover:shadow-[0_6px_16px_-4px_rgba(148,163,184,0.15)]',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'border-red-700 bg-red-600 text-white hover:border-red-800 hover:bg-red-700 hover:shadow-[0_6px_16px_-4px_rgba(220,38,38,0.25)]',
}

const LINK = 'inline-flex items-center gap-1 font-semibold text-[12.5px] text-current underline underline-offset-2 transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:opacity-50'

// Icon-only: the same button, squared to its height. Pass aria-label / title (no visible text).
const ICON_SIZES = {
  md: 'h-[44px] w-[44px] text-[14px]',
  sm: 'h-9 w-9 text-[13px]',
  xs: 'h-7 w-7 text-[12px]',
}

const Button = forwardRef(function Button({ variant = 'primary', size = 'md', iconOnly = false, className = '', type = 'button', children, ...rest }, ref) {
  const sizeCls = iconOnly ? (ICON_SIZES[size] || ICON_SIZES.md) : (SIZES[size] || SIZES.md)
  const cls = variant === 'link' ? LINK : `${BASE} ${sizeCls} ${VARIANTS[variant] || VARIANTS.primary}`
  return <button ref={ref} type={type} className={`${cls} ${className}`} {...rest}>{children}</button>
})

export default Button
