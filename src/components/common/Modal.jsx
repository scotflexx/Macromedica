
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function Modal({ open, title, description, children, footer, onClose, width = 'max-w-md', noScroll = false }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onMouseDown={onClose}>
      <div 
        className={`bg-white relative w-full rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden ${width} flex flex-col ${noScroll ? '' : 'max-h-[85vh]'}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {(title || description) ? (
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6] flex-shrink-0">
            <div>
              {title ? <h2 className="text-[#111827] font-semibold text-[17px]">{title}</h2> : null}
              {description ? <p className="text-slate-600 font-medium text-sm mt-1">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] border-none bg-transparent text-[#9CA3AF] cursor-pointer flex items-center justify-center transition-all hover:bg-[#F3F4F6] hover:text-[#374151]"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        ) : null}
        <div className={`${noScroll ? 'px-5 py-5' : 'flex-1 overflow-y-auto px-6 py-4'}`}>
          {children}
        </div>
        {footer ? (
          <div className="flex-shrink-0 px-5 py-4 border-t border-[#F3F4F6] bg-white">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
