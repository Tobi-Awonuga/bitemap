import { useState, useEffect } from 'react'
import { Loader2, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

type AdminReview = {
  id: string
  rating: number
  body?: string
  createdAt: string
  user: { id: string; displayName: string; email: string }
  place: { id: string; name: string; address: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<AdminReview[]>('/api/admin/reviews')
      .then(setReviews)
      .catch((err) => {
        setReviews([])
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this review?')) return
    setDeletingId(id)
    try {
      await api.del(`/api/admin/reviews/${id}`)
      setReviews((prev) => prev.filter((r) => r.id !== id))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-slate-400 text-sm mt-1">{reviews.length} reviews total</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm">No reviews yet.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-700">
            {reviews.map((review) => (
              <div key={review.id} className="px-5 py-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{review.user.displayName}</span>
                      <span className="text-slate-500 text-xs">reviewed</span>
                      <Link
                        to={`/places/${review.place.id}`}
                        className="text-sm font-medium text-orange-400 hover:text-orange-300 truncate"
                      >
                        {review.place.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600 fill-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.body && (
                      <p className="text-sm text-slate-300 line-clamp-2">{review.body}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{review.user.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={deletingId === review.id}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                    aria-label="Delete review"
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
