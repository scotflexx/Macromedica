import { memo } from 'react'

interface TimeIndicatorProps {
  label: string
}

function TimeIndicator({ label }: TimeIndicatorProps) {
  return (
    <div className="my-2 px-4">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-blue-300" />
        <span className="text-xs font-medium text-blue-600">{label}</span>
        <span className="h-px flex-1 bg-blue-300" />
      </div>
      
    </div>
  )
}

export default memo(TimeIndicator)
