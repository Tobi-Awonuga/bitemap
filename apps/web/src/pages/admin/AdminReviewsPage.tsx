import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, ShieldAlert, Star, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

type AdminReview = {
  id: string
  rating: number
  body?: string | null
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
  resolvedAt?: string | null
  reporter: { id: string; displayName: string; email: string }
  resolver?: { id: string; displayName: string; email: string } | null
  review: {
    id: string
    rating: number
    body?: string | null
    createdAt: string
    user: { id: string; displayName: string; email: string }
    place: { id: string; name: string; address: string }
  }
}

type PaginatedResponse<T> = {
  data: T[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [reports, setReports] = useState<AdminReviewReport[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'reviews' | 'reports'>('reviews')
  const [reportFilter, setReportFilter] = useState<'open' | 'resolved' | 'dismissed'>('open')
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviewOffset, setReviewOffset] = useState(0)
  const [reviewLimit] = useState(20)
  const [reportTotal, setReportTotal] = useState(0)
  const [reportOffset, setReportOffset] = useState(0)
  const [reportLimit] = useState(20)

  const loadReviews = (nextOffset = 0) => {
    setReviewsLoading(true)
    const params = new URLSearchParams({
      limit: String(reviewLimit),
      offset: String(nextOffset),
    })

    api
      .get<PaginatedResponse<AdminReview>>(`/api/admin/reviews?${params.toString()}`)
      .then((res) => {
        setReviews(res.data)
        setReviewTotal(res.pagination.total)
        setReviewOffset(res.pagination.offset)
        setError(null)
      })
      .catch((err) => {
        setReviews([])
        setReviewTotal(0)
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      })
      .finally(() => setReviewsLoading(false))
  }

  const loadReports = (nextOffset = 0, nextFilter = reportFilter) => {
    setReportsLoading(true)
    const params = new URLSearchParams({
      status: nextFilter,
      limit: String(reportLimit),
      offset: String(nextOffset),
    })

    api
      .get<PaginatedResponse<AdminReviewReport>>(`/api/admin/review-reports?${params.toString()}`)
      .then((res) => {
        setReports(res.data)
        setReportTotal(res.pagination.total)
        setReportOffset(res.pagination.offset)
        setError(null)
      })
      .catch((err) => {
        setReports([])
        setReportTotal(0)
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      })
      .finally(() => setReportsLoading(false))
  }

  useEffect(() => {
    loadReviews(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab !== 'reports') return
    loadReports(0, reportFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this review?')) return
    setDeletingId(id)
    try {
      await api.del(`/api/admin/reviews/${id}`)
      const nextTotal = Math.max(0, reviewTotal - 1)
      const nextOffset = nextTotal > 0 && reviewOffset >= nextTotal ? Math.max(0, reviewOffset - reviewLimit) : reviewOffset
      loadReviews(nextOffset)
      if (activeTab === 'reports') {
        loadReports(reportOffset, reportFilter)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteReportedReview = async (report: AdminReviewReport) => {
    if (!confirm(`Delete the reported review on "${report.review.place.name}"?`)) return
    setModeratingReportId(report.id)
    try {
      await api.del(`/api/admin/reviews/${report.review.id}`)
      const nextTotal = Math.max(0, reportTotal - 1)
      const nextOffset = nextTotal > 0 && reportOffset >= nextTotal ? Math.max(0, reportOffset - reportLimit) : reportOffset
      loadReports(nextOffset, reportFilter)
      loadReviews(reviewOffset)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reported review')
    } finally {
      setModeratingReportId(null)
    }
  }

  const handleReportDecision = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setModeratingReportId(reportId)
    try {
      await api.patch(`/api/admin/review-reports/${reportId}`, { status })
      const nextTotal = Math.max(0, reportTotal - 1)
      const nextOffset = nextTotal > 0 && reportOffset >= nextTotal ? Math.max(0, reportOffset - reportLimit) : reportOffset
      loadReports(nextOffset, reportFilter)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status')
    } finally {
      setModeratingReportId(null)
    }
  }

  const reviewRangeEnd = Math.min(reviewOffset + reviews.length, reviewTotal)
  const reportRangeEnd = Math.min(reportOffset + reports.length, reportTotal)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-slate-400 text-sm mt-1">
          {activeTab === 'reviews' ? `${reviewTotal} reviews total` : `${reportTotal} ${reportFilter} reports`}
        </p>
      </div>

      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        {(['reviews', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'reviews' ? 'All Reviews' : 'Reports'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {activeTab === 'reviews' && (
        reviewsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">No reviews yet.</p>
          </div>
        ) : (
          <>
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
                        {review.body && <p className="text-sm text-slate-300 line-clamp-2">{review.body}</p>}
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {reviewOffset + 1}-{reviewRangeEnd} of {reviewTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadReviews(Math.max(0, reviewOffset - reviewLimit))}
                  disabled={reviewOffset === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadReviews(reviewOffset + reviewLimit)}
                  disabled={reviewOffset + reviewLimit >= reviewTotal}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
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
            <>
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
                          By {report.review.user.displayName} · {report.review.rating}?
                        </p>
                      </div>
                      {reportFilter === 'open' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDeleteReportedReview(report)}
                            disabled={moderatingReportId === report.id}
                            className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-60 bg-red-500/10 px-2.5 py-1.5 rounded-lg"
                          >
                            {moderatingReportId === report.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete Review
                          </button>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {reportOffset + 1}-{reportRangeEnd} of {reportTotal}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadReports(Math.max(0, reportOffset - reportLimit), reportFilter)}
                    disabled={reportOffset === 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadReports(reportOffset + reportLimit, reportFilter)}
                    disabled={reportOffset + reportLimit >= reportTotal}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
