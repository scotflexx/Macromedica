import { FilePlus2, Plus, UserRoundPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../../context/AppContext'

const ACTIONS = [
  { id: 'patient', icon: UserRoundPlus, label: 'Nouveau Patient' },
  { id: 'appointment', icon: Plus, label: 'Nouveau RDV' },
  { id: 'invoice', icon: FilePlus2, label: 'Nouvelle Facture' }
]

function MenuItem({ id, icon: Icon, label, onClick, openDelay, closeDelay, open }) {
  const [ripples, setRipples] = useState([])
  const [isClicking, setIsClicking] = useState(false)

  const handleMouseDown = (e) => {
    setIsClicking(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setRipples([...ripples, { x, y, id: Date.now() }])
  }

  const handleMouseUp = () => {
    if (!isClicking) return
    setIsClicking(false)
    setTimeout(() => onClick(id), 100)
  }

  return (
    <div
      className="group relative flex items-center justify-end"
      style={{
        animation: open
          ? `menu-enter 0.4s cubic-bezier(0.34,1.56,0.64,1) ${openDelay}ms both`
          : `menu-exit 0.2s ease ${closeDelay}ms both`,
      }}
    >
      <span className="absolute right-[calc(100%+16px)] opacity-0 translate-x-[8px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap rounded-[10px] bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow-md pointer-events-none">
        {label}
      </span>
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsClicking(false)}
        className="menu-item ripple-container relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-xl ring-1 ring-slate-100/50 outline-none"
        style={{
          transform: isClicking ? 'scale(0.95)' : '',
          transition: isClicking ? 'transform 0.1s ease' : 'all 0.18s ease'
        }}
      >
        <span className="menu-icon-wrapper relative z-10 flex items-center justify-center">
          <Icon className="h-[22px] w-[22px] text-blue-700" />
        </span>
        {ripples.map(r => (
          <span
            key={r.id}
            className="ripple"
            style={{ left: r.x, top: r.y, width: 60, height: 60, marginLeft: -30, marginTop: -30 }}
            onAnimationEnd={() => setRipples(old => old.filter(i => i.id !== r.id))}
          />
        ))}
      </button>
    </div>
  )
}

function FloatingActionButton() {
  const { openGlobalModal } = useAppContext()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isIdle, setIsIdle] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    let t1, t2;
    if (open) {
      setMounted(true)
      setIsIdle(false)
    } else {
      t1 = setTimeout(() => setMounted(false), 300)
      t2 = setTimeout(() => setIsIdle(true), 250)
    }
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [open])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleAction = (id) => {
    openGlobalModal(id)
    setOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes fab-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(59,130,246,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 35px rgba(59,130,246,0.7); }
        }
        @keyframes fab-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes menu-icon-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes menu-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes menu-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(10px) scale(0.9); }
        }
        @keyframes backdrop-enter {
          from { opacity: 0; }
          to { opacity: 0.15; }
        }
        @keyframes backdrop-exit {
          from { opacity: 0.15; }
          to { opacity: 0; }
        }
        
        .fab-main {
          transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.2s ease;
        }
        .fab-main.fab-open {
          transform: scale(1.1);
          box-shadow: 0 0 40px rgba(59,130,246,0.5);
          background-color: #2563EB;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fab-idle-state {
          animation: fab-pulse 3s ease infinite;
        }
        .fab-idle-state:hover {
          animation: none !important;
          transform: scale(1.15) !important;
          box-shadow: 0 0 40px rgba(59,130,246,0.8) !important;
          background-color: #3B82F6 !important;
        }
        
        .fab-icon-spin {
          display: inline-block;
          animation: fab-spin 8s linear infinite;
        }
        .fab-idle-state:hover .fab-icon-spin {
          animation-play-state: paused;
        }
        
        .menu-item:hover {
          transform: translateX(4px) scale(1.03);
          background-color: #f8fafc;
        }
        .menu-item:hover .menu-icon-wrapper {
          animation: menu-icon-bounce 0.3s ease;
        }
        
        .ripple-container {
          overflow: hidden;
          position: relative;
        }
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple-anim 0.5s ease-out;
          background-color: rgba(59,130,246,0.15);
          pointer-events: none;
        }
        @keyframes ripple-anim {
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>

      {mounted && (
        <div
          className="fixed inset-0 z-[55] bg-slate-900"
          style={{ animation: open ? 'backdrop-enter 0.25s ease forwards' : 'backdrop-exit 0.2s ease forwards' }}
          onClick={() => setOpen(false)}
        />
      )}

      <div ref={ref} className="fixed bottom-6 right-6 z-[60]">
        {mounted && (
          <div className="absolute bottom-full right-0 mb-5 flex flex-col gap-4">
            {ACTIONS.map((action, i) => {
              const openDelay = (ACTIONS.length - 1 - i) * 60
              const closeDelay = i * 30
              return (
                <MenuItem
                  key={action.id}
                  {...action}
                  open={open}
                  openDelay={openDelay}
                  closeDelay={closeDelay}
                  onClick={handleAction}
                />
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((c) => !c)}
          className={`fab-main relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl outline-none ${open ? 'fab-open' : (isIdle ? 'fab-idle-state' : '')}`}
        >
          <div
            className="flex items-center justify-center"
            style={{
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: open ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.25s ease'
            }}
          >
            <span className={`text-[32px] font-light leading-none ${open ? '' : 'fab-icon-spin'}`}>
              ✦
            </span>
          </div>
        </button>
      </div>
    </>
  )
}

export default FloatingActionButton
