import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const normalizedAvatarUrl = avatarUrl.trim()
  const avatarUrlValid =
    normalizedAvatarUrl.length === 0 ||
    /^https?:\/\/.+/i.test(normalizedAvatarUrl)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setAvatarUrl(user.avatarUrl ?? '')
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    if (!avatarUrlValid) {
      setError('Avatar URL must start with http:// or https://')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      })
      setSuccess('Profile updated')
      setTimeout(() => navigate('/profile'), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600">
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Account settings</h1>
        <p className="text-sm text-slate-500 mb-6">Update your public profile details.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Standard production setup uses direct image upload (S3/Cloudinary). URL input is a temporary dev shortcut.
            </p>
          </div>

          {normalizedAvatarUrl && avatarUrlValid && (
            <div className="flex items-center gap-3">
              <img
                src={normalizedAvatarUrl}
                alt="Avatar preview"
                className="w-12 h-12 rounded-xl object-cover bg-slate-100"
              />
              <span className="text-xs text-slate-500">Avatar preview</span>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </div>
    </div>
  )
}
