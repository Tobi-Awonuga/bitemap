import { Bookmark, Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export type Place = {
  id: string
  name: string
  cuisine: string
  address: string
  rating: number
  reviewCount: number
  gradient: string
  saved?: boolean
}

type Props = {
  place: Place
  showVisitedBadge?: boolean
  visitedDate?: string
}

export default function PlaceCard({ place, showVisitedBadge, visitedDate }: Props) {
  return (
    <Link
      to={`/places/${place.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
    >
      {/* Image area */}
      <div className={`relative h-44 bg-gradient-to-br ${place.gradient} flex-shrink-0`}>
        <div className="absolute inset-0 bg-black/10" />

        {/* Rating */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-slate-900">{place.rating.toFixed(1)}</span>
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Bookmark
            className={`w-4 h-4 transition-colors ${
              place.saved ? 'fill-orange-500 text-orange-500' : 'text-slate-500'
            }`}
          />
        </button>

        {/* Visited badge */}
        {showVisitedBadge && (
          <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-xs font-semibold rounded-full px-2.5 py-1">
            Visited
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-orange-500 transition-colors">
            {place.name}
          </h3>
          <span className="inline-block mt-1 text-xs font-medium text-orange-500 bg-orange-50 rounded-full px-2.5 py-0.5">
            {place.cuisine}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{place.address}</span>
        </div>

        <p className="text-xs text-slate-400">{place.reviewCount.toLocaleString()} reviews</p>

        {visitedDate && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-auto">
            Visited {visitedDate}
          </p>
        )}
      </div>
    </Link>
  )
}
