import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DISMISS_MS = 3500

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle2 className="w-4 h-4 shrink-0" />
  if (type === 'error') return <AlertCircle className="w-4 h-4 shrink-0" />
  return <Info className="w-4 h-4 shrink-0" />
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => {
        const next = [...prev, { id, type, message }]
        if (next.length > MAX_TOASTS) {
          const removed = next.splice(0, next.length - MAX_TOASTS)
          removed.forEach((t) => {
            const timer = timers.current.get(t.id)
            if (timer) {
              clearTimeout(timer)
              timers.current.delete(t.id)
            }
          })
        }
        return next
      })
      const timer = setTimeout(() => dismiss(id), DISMISS_MS)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium min-w-[240px] max-w-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            <ToastIcon type={toast.type} />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
