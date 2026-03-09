import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, KeyRound, Loader2, Save, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import UserAvatar from '../components/ui/UserAvatar'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedAvatarUrl = avatarUrl.trim()
  const avatarUrlValid =
    normalizedAvatarUrl.length === 0 ||
    /^https?:\/\/.+/i.test(normalizedAvatarUrl) ||
    normalizedAvatarUrl.startsWith('data:image/')

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
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      })
      showToast('Profile updated', 'success')
      setTimeout(() => navigate('/profile'), 500)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      setError('Please upload a PNG, JPG, WEBP, or GIF image')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Profile image must be 2MB or smaller')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      if (!value.startsWith('data:image/')) {
        setError('Could not read image file')
        return
      }
      setAvatarUrl(value)
      setError(null)
    }
    reader.onerror = () => {
      setError('Could not read image file')
    }
    reader.readAsDataURL(file)
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)
    if (!currentPassword) {
      setPwError('Current password is required')
      return
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPwError('New password must contain uppercase, lowercase, and a number')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }
    setPwSaving(true)
    try {
      await api.patch('/api/users/me/password', { currentPassword, newPassword })
      showToast('Password updated successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setPwSaving(false)
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
          <div className="flex items-center gap-4">
            <UserAvatar
              name={displayName || user.displayName}
              avatarUrl={normalizedAvatarUrl || user.avatarUrl}
              className="w-16 h-16 rounded-2xl"
              textClassName="text-xl"
            />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-xl cursor-pointer transition-colors">
                <ImagePlus className="w-4 h-4" />
                Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              </label>
              {(normalizedAvatarUrl || user.avatarUrl) && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="Your name"
            />
          </div>

          <p className="text-xs text-slate-500">
            Use Upload photo to set your avatar. Images are currently stored directly with your profile.
          </p>

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
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Change password</h2>
        <p className="text-sm text-slate-500 mb-6">Update your account password.</p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="Your current password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="8+ chars, uppercase, lowercase, number"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>

          {pwError && <p className="text-sm text-red-500">{pwError}</p>}

          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  )
}
