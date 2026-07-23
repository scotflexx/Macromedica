import { useState, useEffect } from 'react'
import { usePin } from '../../context/PinContext'
import { useAppContext } from '../../context/AppContext'
import { Lock, Loader2, Delete, ShieldAlert } from 'lucide-react'

export default function PinLock({ children }) {
  const { isUnlocked, unlockPin } = usePin()
  const { profile } = useAppContext()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const pinEnabled = localStorage.getItem(`pin_enabled_${profile?.id}`) === 'true'

  // Auto-submit when length === 4
  useEffect(() => {
    if (pin.length === 4) {
      handleVerify(pin)
    }
  }, [pin])

  // Handle physical keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if unlocked
      if (isUnlocked()) return
      
      if (/\d/.test(e.key) && pin.length < 4) {
        setPin(prev => prev + e.key)
        setError(null)
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1))
        setError(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pin, isUnlocked])

  const handleVerify = async (pinCode) => {
    setLoading(true)
    setError(null)
    try {
      await unlockPin(pinCode)
    } catch (err) {
      setError(err.message || 'Code PIN incorrect')
      setPin('') // Reset on failure
    } finally {
      setLoading(false)
    }
  }

  const appendNum = (n) => {
    if (pin.length < 4) {
      setPin(prev => prev + n)
      setError(null)
    }
  }

  const deleteNum = () => {
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }

  // If unlocked OR pin is not enabled OR user is secretaire, render children directly
  if (isUnlocked() || !pinEnabled || profile?.role === 'secretaire') {
    return <>{children}</>
  }

  // Otherwise, render the lock overlay over blurred children
  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center overflow-hidden rounded-2xl">
      {/* Blurred background content */}
      <div className="absolute inset-0 filter blur-md opacity-30 select-none pointer-events-none">
        {children}
      </div>
      
      {/* Lock UI */}
      <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] p-8 max-w-sm w-full mx-4 flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6 shadow-inner">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 mb-2">Zone sécurisée</h2>
        <p className="text-sm text-slate-500 text-center mb-8">
          Veuillez saisir votre code PIN à 4 chiffres pour accéder à ces données
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < pin.length 
                  ? 'bg-blue-600 scale-110 shadow-[0_0_12px_rgba(59,130,246,0.5)]' 
                  : 'bg-slate-200'
              }`} 
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold bg-rose-50 px-4 py-2 rounded-xl mb-6 w-full justify-center">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {loading && (
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-6" />
        )}

        {/* Virtual Numpad */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full px-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => appendNum(num)}
              className="w-16 h-16 rounded-full text-2xl font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 transition-colors mx-auto"
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space for alignment */}
          <button
            onClick={() => appendNum(0)}
            className="w-16 h-16 rounded-full text-2xl font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 transition-colors mx-auto"
          >
            0
          </button>
          <button
            onClick={deleteNum}
            className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 transition-colors mx-auto"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
