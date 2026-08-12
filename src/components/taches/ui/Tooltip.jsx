import React from 'react'

export default function Tooltip({ content, children, position = 'top-start' }) {
  if (!content) return children

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    'top-start': 'bottom-full mb-2 left-0',
    'top-end': 'bottom-full mb-2 right-0',
    bottom: 'top-full mt-2 left-0',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  }[position] || 'bottom-full mb-2 left-0'

  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={`pointer-events-none absolute z-50 hidden opacity-0 group-hover:block group-hover:opacity-100 transition-all duration-200 ${positionClasses}`}
      >
        <div className="bg-slate-900/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-xl w-max max-w-xs whitespace-normal leading-snug text-left border border-slate-700/80 backdrop-blur-xs">
          {content}
        </div>
      </div>
    </div>
  )
}
