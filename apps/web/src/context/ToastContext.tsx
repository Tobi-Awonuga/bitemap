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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex w-[min(92vw,26rem)] flex-col gap-3 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-surface animate-toast-in pointer-events-auto w-full px-4 py-3 text-sm text-white ${
              toast.type === 'success'
                ? 'toast-success'
                : toast.type === 'error'
                ? 'toast-error'
                : 'toast-info'
            }`}
          >
            <div className="relative flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                  toast.type === 'success'
                    ? 'toast-accent-success'
                    : toast.type === 'error'
                    ? 'toast-accent-error'
                    : 'toast-accent-info'
                }`}
              >
                <ToastIcon type={toast.type} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="pr-2 text-[14px] font-medium leading-5 text-white/92">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/8 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
