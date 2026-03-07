import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, Loader2, AlertCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

type AdminPlace = {
  id: string
  name: string
  cuisine?: string | null
  address: string
  avgRating: number
  reviewCount: number
  saveCount: number
  createdAt: string
}

type NewPlace = {
  name: string
  cuisine: string
  description: string
  address: string
  latitude: string
  longitude: string
  priceLevel: string
  imageUrl: string
}

const emptyForm: NewPlace = {
  name: '', cuisine: '', description: '', address: '',
  latitude: '', longitude: '', priceLevel: '', imageUrl: '',
}

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewPlace>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<AdminPlace[]>('/api/admin/places')
      .then(setPlaces)
      .catch((err) => {
        setPlaces([])
        setError(err instanceof Error ? err.message : 'Failed to load places')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name,
        cuisine: form.cuisine || undefined,
        description: form.description || undefined,
        address: form.address,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        priceLevel: form.priceLevel ? parseInt(form.priceLevel) : undefined,
        imageUrl: form.imageUrl || undefined,
      }
      const place = await api.post<AdminPlace>('/api/places', payload)
      setPlaces((prev) => [{ ...place, avgRating: 0, reviewCount: 0, saveCount: 0 }, ...prev])
      setError(null)
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add place')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await api.del(`/api/admin/places/${id}`)
      setPlaces((prev) => prev.filter((p) => p.id !== id))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete place')
    } finally {
      setDeletingId(null)
    }
  }

  const field = (key: keyof NewPlace) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Places</h1>
          <p className="text-slate-400 text-sm mt-1">{places.length} places in the database</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null) }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Place
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">New Place</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Name *', key: 'name' as const, required: true },
              { label: 'Cuisine', key: 'cuisine' as const },
              { label: 'Address *', key: 'address' as const, required: true },
              { label: 'Latitude *', key: 'latitude' as const, required: true, type: 'number' },
              { label: 'Longitude *', key: 'longitude' as const, required: true, type: 'number' },
              { label: 'Price Level (1-4)', key: 'priceLevel' as const, type: 'number' },
              { label: 'Image URL', key: 'imageUrl' as const },
            ].map(({ label, key, required, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                <input
                  type={type ?? 'text'}
                  {...field(key)}
                  required={required}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 placeholder:text-slate-600"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea
                {...field('description')}
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 resize-none placeholder:text-slate-600"
              />
            </div>
            {formError && (
              <div className="sm:col-span-2 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Place
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-sm px-4">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {places.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">No places yet. Add the first one!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {places.map((place) => (
                <div key={place.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/50 transition-colors">
                  <div className="min-w-0">
                    <Link
                      to={`/places/${place.id}`}
                      className="text-sm font-semibold text-white hover:text-orange-400 transition-colors truncate block"
                    >
                      {place.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-0.5">
                      {place.cuisine && (
                        <span className="text-xs text-orange-400">{place.cuisine}</span>
                      )}
                      <span className="text-xs text-slate-500 truncate">{place.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-white">
                        {Number(place.avgRating) > 0 ? Number(place.avgRating).toFixed(1) : '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{place.reviewCount} reviews</span>
                    <button
                      onClick={() => handleDelete(place.id, place.name)}
                      disabled={deletingId === place.id}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {deletingId === place.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
