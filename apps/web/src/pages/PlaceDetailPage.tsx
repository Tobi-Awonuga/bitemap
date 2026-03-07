import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, MapPin, Bookmark, CheckCircle, Navigation, Loader2, AlertCircle, Send, Pencil, Trash2,
} from 'lucide-react'
import { api } from '../lib/api'

type ReviewUser = { id: string; displayName: string; avatarUrl?: string | null }
type ReviewRow = { id: string; rating: number; body?: string | null; createdAt: string; user: ReviewUser }
type UserReview = { id: string; rating: number; body?: string | null }

type PlaceDetail = {
  id: string
  name: string
  cuisine?: string | null
  description?: string | null
  address: string
  latitude: number
  longitude: number
  priceLevel?: number | null
  imageUrl?: string | null
  avgRating: number
  reviewCount: number
  isSaved: boolean
  isVisited: boolean
  visitId: string | null
  userReview: UserReview | null
  reviews: ReviewRow[]
}

const GRADIENTS = [
  'from-slate-700 to-slate-900', 'from-pink-400 to-rose-500', 'from-amber-500 to-orange-600',
  'from-emerald-400 to-teal-600', 'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
]
function gradientFor(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [savePending, setSavePending] = useState(false)
  const [visitPending, setVisitPending] = useState(false)

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDeleting, setReviewDeleting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const refreshPlace = async (placeId: string) => {
    const updated = await api.get<PlaceDetail>(`/api/places/${placeId}`)
    setPlace(updated)
  }

  useEffect(() => {
    if (!id) return
    api
      .get<PlaceDetail>(`/api/places/${id}`)
      .then(setPlace)
      .catch(() => setError('Could not load place.'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleSave = async () => {
    if (!place || savePending) return
    setSavePending(true)
    try {
      if (place.isSaved) {
        await api.del(`/api/saves/${place.id}`)
        setPlace((p) => p && { ...p, isSaved: false })
      } else {
        await api.post('/api/saves', { placeId: place.id })
        setPlace((p) => p && { ...p, isSaved: true })
      }
    } finally {
      setSavePending(false)
    }
  }

  const toggleVisit = async () => {
    if (!place || visitPending) return
    setVisitPending(true)
    try {
      if (place.isVisited && place.visitId) {
        await api.del(`/api/visits/${place.visitId}`)
        setPlace((p) => p && { ...p, isVisited: false, visitId: null })
      } else {
        const visit = await api.post<{ id: string }>('/api/visits', { placeId: place.id })
        setPlace((p) => p && { ...p, isVisited: true, visitId: visit.id })
      }
    } finally {
      setVisitPending(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!place) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      if (place.userReview) {
        await api.patch(`/api/reviews/${place.userReview.id}`, { rating: reviewRating, body: reviewBody })
      } else {
        await api.post('/api/reviews', { placeId: place.id, rating: reviewRating, body: reviewBody })
      }
      await refreshPlace(place.id)
      setShowReviewForm(false)
      setReviewBody('')
      setReviewRating(5)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const startReviewEditor = () => {
    if (!place) return
    setReviewError(null)
    setReviewRating(place.userReview?.rating ?? 5)
    setReviewBody(place.userReview?.body ?? '')
    setShowReviewForm(true)
  }

  const handleDeleteReview = async () => {
    if (!place?.userReview || reviewDeleting) return
    setReviewDeleting(true)
    setReviewError(null)
    try {
      await api.del(`/api/reviews/${place.userReview.id}`)
      await refreshPlace(place.id)
      setShowReviewForm(false)
      setReviewBody('')
      setReviewRating(5)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setReviewDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (error || !place) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-4">{error ?? 'Place not found'}</p>
        <Link to="/" className="text-orange-500 hover:text-orange-600 font-medium text-sm">
          ← Back to Discover
        </Link>
      </div>
    )
  }

  const gradient = gradientFor(place.id)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Hero */}
      <div
        className={`relative h-72 md:h-80 rounded-b-3xl overflow-hidden ${!place.imageUrl ? `bg-gradient-to-br ${gradient}` : 'bg-slate-200'}`}
      >
        {place.imageUrl && (
          <img src={place.imageUrl} alt={place.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />

        <button
          onClick={handleBack}
          className="absolute top-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-slate-900">
            {place.avgRating > 0 ? Number(place.avgRating).toFixed(1) : '—'}
          </span>
          {place.reviewCount > 0 && (
            <span className="text-xs text-slate-500">({place.reviewCount.toLocaleString()})</span>
          )}
        </div>
      </div>

      {/* Content card */}
      <div className="mx-4 -mt-6 relative">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Name + tags */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{place.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {place.cuisine && (
                <span className="text-xs font-medium text-orange-500 bg-orange-50 rounded-full px-3 py-1">
                  {place.cuisine}
                </span>
              )}
              {place.priceLevel && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                  {'£'.repeat(place.priceLevel)}
                </span>
              )}
              {place.isVisited && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-3 py-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Visited
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={toggleSave}
              disabled={savePending}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 ${
                place.isSaved
                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${place.isSaved ? 'fill-orange-600' : ''}`} />
              {place.isSaved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={toggleVisit}
              disabled={visitPending}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 ${
                place.isVisited
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {place.isVisited ? 'Visited ✓' : 'Mark Visited'}
            </button>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
              aria-label="Get directions"
            >
              <Navigation className="w-4 h-4 text-slate-600" />
            </a>
          </div>

          {/* Address */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Address</p>
                <p className="text-sm text-slate-900">{place.address}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {place.description && (
            <div className="pt-2 border-t border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">About</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{place.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900">
              Reviews{' '}
              {place.reviewCount > 0 && (
                <span className="text-slate-400 font-normal">({place.reviewCount})</span>
              )}
            </h2>
            {place.isVisited && (
              <button
                onClick={() => {
                  if (place.userReview) {
                    startReviewEditor()
                    return
                  }
                  setReviewError(null)
                  setShowReviewForm((v) => !v)
                }}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                {place.userReview ? 'Edit your review' : showReviewForm ? 'Cancel' : 'Write a review'}
              </button>
            )}
            {!place.isVisited && (
              <span className="text-xs text-slate-400">Visit first to review</span>
            )}
          </div>

          {/* Review form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mb-6 p-4 bg-slate-50 rounded-xl space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Your rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-white rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none transition-all"
              />
              {reviewError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {reviewError}
                </p>
              )}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {place.userReview ? 'Save changes' : 'Submit review'}
              </button>
            </form>
          )}

          {/* User's own review */}
          {place.userReview && (
            <div className="mb-5 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i <= place.userReview!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-orange-500 font-medium ml-2">Your review</span>
              </div>
              {place.userReview.body && (
                <p className="text-sm text-slate-700">{place.userReview.body}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={startReviewEditor}
                  className="text-xs text-orange-600 font-medium inline-flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={handleDeleteReview}
                  disabled={reviewDeleting}
                  className="text-xs text-red-600 font-medium inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {reviewDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* All reviews */}
          {place.reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No reviews yet. Be the first!
            </p>
          ) : (
            <div className="space-y-5">
              {place.reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {getInitials(review.user.displayName)}
                        </span>
                      </div>
                      <Link
                        to={`/users/${review.user.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {review.user.displayName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                  {review.body && (
                    <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
