import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, ShieldAlert, Star, Trash2, XCircle } from 'lucide-react'
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

type AdminReviewReport = {
  id: string
  reason: string
  details?: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  reporter: { id: string; displayName: string; email: string }
  review: {
    id: string
    rating: number
    body?: string | null
    createdAt: string
    user: { id: string; displayName: string; email: string }
    place: { id: string; name: string; address: string }
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [reports, setReports] = useState<AdminReviewReport[]>([])
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'reviews' | 'reports'>('reviews')
  const [reportFilter, setReportFilter] = useState<'open' | 'resolved' | 'dismissed'>('open')

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

  useEffect(() => {
    if (activeTab !== 'reports') return
    setReportsLoading(true)
    api
      .get<AdminReviewReport[]>(`/api/admin/review-reports?status=${reportFilter}`)
      .then(setReports)
      .catch((err) => {
        setReports([])
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      })
      .finally(() => setReportsLoading(false))
  }, [activeTab, reportFilter])

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

  const handleReportDecision = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setModeratingReportId(reportId)
    try {
      await api.patch(`/api/admin/review-reports/${reportId}`, { status })
      setReports((prev) => prev.filter((report) => report.id !== reportId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status')
    } finally {
      setModeratingReportId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-slate-400 text-sm mt-1">{reviews.length} reviews total</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        {(['reviews', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'reviews' ? 'All Reviews' : 'Reports'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {activeTab === 'reviews' && (
        loading ? (
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
      )
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Report status filter */}
          <div className="flex items-center gap-1">
            {(['open', 'resolved', 'dismissed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setReportFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  reportFilter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No {reportFilter} reports.</p>
          ) : (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden divide-y divide-slate-700">
              {reports.map((report) => (
                <div key={report.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs text-amber-400 font-semibold uppercase tracking-wide">{report.reason}</span>
                        <span className="text-xs text-slate-500">{formatDate(report.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-300">
                        Reported by <span className="font-semibold">{report.reporter.displayName}</span> ({report.reporter.email}) on{' '}
                        <Link to={`/places/${report.review.place.id}`} className="text-orange-400 hover:text-orange-300">
                          {report.review.place.name}
                        </Link>
                      </p>
                      {report.details && <p className="text-xs text-slate-400">Details: {report.details}</p>}
                      {report.review.body && (
                        <p className="text-sm text-slate-200 italic bg-slate-700/50 rounded-lg px-3 py-2 mt-1">
                          "{report.review.body}"
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        By {report.review.user.displayName} · {report.review.rating}★
                      </p>
                    </div>
                    {reportFilter === 'open' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReportDecision(report.id, 'resolved')}
                          disabled={moderatingReportId === report.id}
                          className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 disabled:opacity-60 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg"
                        >
                          {moderatingReportId === report.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Resolve
                        </button>
                        <button
                          onClick={() => handleReportDecision(report.id, 'dismissed')}
                          disabled={moderatingReportId === report.id}
                          className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white disabled:opacity-60 bg-slate-700 px-2.5 py-1.5 rounded-lg"
                        >
                          <XCircle className="w-3 h-3" />
                          Dismiss
                        </button>
                      </div>
                    )}
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
