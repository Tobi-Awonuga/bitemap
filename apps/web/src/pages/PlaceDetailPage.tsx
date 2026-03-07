import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Bookmark, CheckCircle, Navigation, Clock, Phone } from 'lucide-react'

const MOCK_PLACE = {
  id: '1',
  name: 'Nobu London',
  cuisine: 'Japanese',
  address: '19 Old Park Lane, Mayfair, London W1K 1LB',
  rating: 4.8,
  reviewCount: 892,
  gradient: 'from-slate-700 to-slate-900',
  hours: 'Mon–Sat: 12pm – 10:30pm',
  phone: '+44 20 7447 4747',
  description:
    'Nobu London is a world-renowned Japanese restaurant offering signature dishes like black cod with miso alongside an innovative cocktail menu. Set in the iconic Metropolitan Hotel, the experience is as premium as it gets.',
  tags: ['Japanese', 'Fine Dining', 'Sushi', 'Omakase'],
  saved: false,
}

const MOCK_REVIEWS = [
  { id: '1', author: 'Alex M.', rating: 5, date: 'Feb 2026', body: 'Absolutely incredible. The black cod is worth every penny. Service was flawless.' },
  { id: '2', author: 'Sarah K.', rating: 4, date: 'Jan 2026', body: 'Beautiful ambience and excellent food. A bit pricey but a special occasion staple.' },
  { id: '3', author: 'James T.', rating: 5, date: 'Dec 2025', body: 'One of the best Japanese restaurants in London. The omakase menu is a must-try.' },
]

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const place = { ...MOCK_PLACE, id: id ?? '1' }

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Hero */}
      <div className={`relative h-72 md:h-80 bg-gradient-to-br ${place.gradient} rounded-b-3xl overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Rating badge */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-slate-900">{place.rating}</span>
          <span className="text-xs text-slate-500">({place.reviewCount.toLocaleString()})</span>
        </div>
      </div>

      {/* Content card */}
      <div className="mx-4 -mt-6 relative">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Name + tags */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{place.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-orange-500 bg-orange-50 rounded-full px-3 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              <Bookmark className="w-4 h-4" />
              Save
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              <CheckCircle className="w-4 h-4" />
              Mark Visited
            </button>
            <button className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0">
              <Navigation className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Address</p>
                <p className="text-sm text-slate-900">{place.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Hours</p>
                <p className="text-sm text-slate-900">{place.hours}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Phone</p>
                <p className="text-sm text-slate-900">{place.phone}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">About</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{place.description}</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900">Reviews</h2>
            <button className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              Write a review
            </button>
          </div>
          <div className="space-y-5">
            {MOCK_REVIEWS.map((review) => (
              <div key={review.id} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">{review.author[0]}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{review.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">{review.date}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
