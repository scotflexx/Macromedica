// A static, read-only pill for a fact about an item (a date, a count, a state). Chips are the
// interactive counterpart (toggles / quick picks); use Badge when nothing is clickable.
//   neutral -> quiet grey     amber -> attention (aged / carried over)
const TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
}
const SIZES = { sm: 'px-2 py-0.5 text-[11.5px]', md: 'px-2.5 py-1 text-[12.5px]' }

export default function Badge({ tone = 'neutral', size = 'sm', icon: Icon, className = '', children, ...rest }) {
  return (
    <span {...rest} className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${SIZES[size]} ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {children}
    </span>
  )
}
