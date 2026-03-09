import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { api } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [delivery, setDelivery] = useState<'email' | 'dev-link' | 'unavailable' | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    setResetUrl(null)
    setHint(null)
    setDelivery(null)
    try {
      const res = await api.post<{
        message: string
        resetUrl?: string
        hint?: string
        delivery?: 'email' | 'dev-link' | 'unavailable'
      }>('/api/auth/forgot-password', { email })
      setMessage(res.message)
      if (res.hint) setHint(res.hint)
      if (res.delivery) setDelivery(res.delivery)
      if (res.resetUrl) setResetUrl(res.resetUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div>
          <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your email and we will send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
          {delivery === 'email' && (
            <p className="text-xs text-slate-500">Check your inbox and spam folder for the reset message.</p>
          )}
          {resetUrl && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-xs font-medium text-orange-700 mb-1">Development reset link</p>
              <p className="text-xs text-orange-700 break-all">
                <a href={resetUrl} className="underline hover:no-underline">{resetUrl}</a>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
