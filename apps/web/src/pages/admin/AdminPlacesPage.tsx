import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, Loader2, AlertCircle, X, Pencil } from 'lucide-react'
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
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewPlace>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingPlace, setEditingPlace] = useState<AdminPlace | null>(null)
  const [editForm, setEditForm] = useState<NewPlace>(emptyForm)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadPlaces = (nextOffset = 0) => {
    setLoading(true)
    api
      .get<{ data: AdminPlace[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(
        `/api/admin/places?limit=${limit}&offset=${nextOffset}`,
      )
      .then((res) => {
        setPlaces(res.data)
        setTotal(res.pagination.total)
        setOffset(res.pagination.offset)
      })
      .catch((err) => {
        setPlaces([])
        setTotal(0)
        setError(err instanceof Error ? err.message : 'Failed to load places')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPlaces(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(null)
      setForm(emptyForm)
      setShowForm(false)
      loadPlaces(0)
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
      setError(null)
      loadPlaces(Math.max(0, Math.min(offset, Math.max(total - 1, 0))))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete place')
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (place: AdminPlace) => {
    setEditingPlace(place)
    setEditForm({
      name: place.name,
      cuisine: place.cuisine ?? '',
      description: '',
      address: place.address,
      latitude: '',
      longitude: '',
      priceLevel: '',
      imageUrl: '',
    })
    setEditError(null)
  }

  const closeEdit = () => {
    setEditingPlace(null)
    setEditError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlace) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        cuisine: editForm.cuisine || undefined,
        description: editForm.description || undefined,
        address: editForm.address || undefined,
        imageUrl: editForm.imageUrl || undefined,
      }
      if (editForm.latitude) payload.latitude = parseFloat(editForm.latitude)
      if (editForm.longitude) payload.longitude = parseFloat(editForm.longitude)
      if (editForm.priceLevel) payload.priceLevel = parseInt(editForm.priceLevel)

      const updated = await api.patch<AdminPlace>(`/api/places/${editingPlace.id}`, payload)
      setPlaces((prev) => prev.map((p) => (p.id === editingPlace.id ? { ...p, ...updated } : p)))
      setError(null)
      closeEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update place')
    } finally {
      setEditSubmitting(false)
    }
  }

  const editField = (key: keyof NewPlace) => ({
    value: editForm[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm((f) => ({ ...f, [key]: e.target.value })),
  })

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
          <p className="text-slate-400 text-sm mt-1">{total} places in the database</p>
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
                      onClick={() => openEdit(place)}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                      title="Edit place"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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

      {/* Edit modal */}
      {editingPlace && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeEdit}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Edit Place</h2>
              <button onClick={closeEdit} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Name *', key: 'name' as const, required: true },
                { label: 'Cuisine', key: 'cuisine' as const },
                { label: 'Address', key: 'address' as const },
                { label: 'Latitude (leave blank to keep)', key: 'latitude' as const, type: 'number' },
                { label: 'Longitude (leave blank to keep)', key: 'longitude' as const, type: 'number' },
                { label: 'Price Level (1-4)', key: 'priceLevel' as const, type: 'number' },
                { label: 'Image URL', key: 'imageUrl' as const },
              ].map(({ label, key, required, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                  <input
                    type={type ?? 'text'}
                    {...editField(key)}
                    required={required}
                    className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 placeholder:text-slate-600"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <textarea
                  {...editField('description')}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 resize-none placeholder:text-slate-600"
                />
              </div>
              {editError && (
                <div className="sm:col-span-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {editError}
                </div>
              )}
              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Save Changes
                </button>
                <button type="button" onClick={closeEdit} className="text-slate-400 hover:text-white text-sm px-4">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {offset + 1}-{Math.min(offset + places.length, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPlaces(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => loadPlaces(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
