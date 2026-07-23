export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-base font-semibold uppercase tracking-[0.25em] text-blue-700/80">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-lg text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export const AppButton = ({ children, onClick, className = '', variant = 'primary', disabled = false, type = 'button' }) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-slate-200/10',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-50 shadow-none',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function StatCard({ label, value, helper, trend, color = 'blue' }) {
  const colorStyles = {
    teal: 'bg-blue-50 text-blue-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="surface-card interactive px-[24px] py-[20px]" style={{ height: "auto" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-[500] text-[#64748b]">{label}</p>
          <p className="mt-1 text-[36px] font-[800] leading-[1.1] whitespace-nowrap text-slate-950">{value}</p>
        </div>
        {trend ? (
          <span className={`rounded-full px-2 py-1 text-[12px] font-[600] ${colorStyles[color] || colorStyles.blue}`}>{trend}</span>
        ) : null}
      </div>
      {helper ? <p className="mt-2 text-[13px] text-[#94a3b8]">{helper}</p> : null}
    </div>
  )
}

export const ContentCard = ({ title, subtitle, children, className = '', action = null }) => {
  return (
    <div className={`glass-card-morphism p-6 rounded-[28px] border border-white shadow-xl ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h3 className="text-xl font-black text-slate-900 leading-tight">{title}</h3>}
            {subtitle && <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatusBadge({ children, tone = 'neutral' }) {
  const styles = {
    danger: 'bg-rose-50 text-rose-700',
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  }

  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${styles[tone]}`}>{children}</span>
}

