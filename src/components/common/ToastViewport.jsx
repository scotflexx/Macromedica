
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { cn } from '../../lib/utils'

function ToastViewport() {
  const { toasts, dismissToast } = useAppContext()

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={cn(
            "pointer-events-auto relative bg-white border-l-4 rounded-lg shadow-lg p-4 pr-10 transition-all duration-300 animate-in slide-in-from-right",
            toast.tone === 'error' ? 'border-red-500' : 'border-green-500'
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", 
              toast.tone === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            )}>
              {toast.tone === 'error' ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div>
              {toast.title && <p className="font-semibold text-gray-900">{toast.title}</p>}
              {toast.description && <p className="text-sm text-gray-700 font-medium mt-1">{toast.description}</p>}
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => dismissToast(toast.id)} 
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport
