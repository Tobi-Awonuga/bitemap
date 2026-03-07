import { useState } from 'react'
import { Bookmark, Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

export type Place = {
  id: string
  name: string
  cuisine?: string | null
  address: string
  avgRating: number
  reviewCount: number
  imageUrl?: string | null
  isSaved?: boolean
}

const GRADIENTS = [
  'from-slate-700 to-slate-900',
  'from-pink-400 to-rose-500',
  'from-amber-500 to-orange-600',
  'from-emerald-400 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-cyan-400 to-sky-600',
  'from-red-400 to-rose-600',
]

function gradientFor(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

type Props = {
  place: Place
  showVisitedBadge?: boolean
  visitedDate?: string
  onSaveChange?: (placeId: string, saved: boolean) => void
}

export default function PlaceCard({ place, showVisitedBadge, visitedDate, onSaveChange }: Props) {
  const [saved, setSaved] = useState(place.isSaved ?? false)
  const [toggling, setToggling] = useState(false)

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    try {
      if (saved) {
        await api.del(`/api/saves/${place.id}`)
        setSaved(false)
        onSaveChange?.(place.id, false)
      } else {
        await api.post('/api/saves', { placeId: place.id })
        setSaved(true)
        onSaveChange?.(place.id, true)
      }
    } catch {
      // keep state unchanged on error
    } finally {
      setToggling(false)
    }
  }

  const gradient = gradientFor(place.id)
  const rating = typeof place.avgRating === 'number' ? place.avgRating : 0

  return (
    <Link
      to={`/places/${place.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
    >
      {/* Image / hero area */}
      <div
        className={`relative h-44 flex-shrink-0 ${!place.imageUrl ? `bg-gradient-to-br ${gradient}` : 'bg-slate-200'}`}
      >
        {place.imageUrl && (
          <img
            src={place.imageUrl}
            alt={place.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/10" />

        {/* Rating */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-slate-900">
            {rating > 0 ? rating.toFixed(1) : '—'}
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={toggling}
          className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform disabled:opacity-60"
          aria-label={saved ? 'Unsave place' : 'Save place'}
        >
          <Bookmark
            className={`w-4 h-4 transition-colors ${
              saved ? 'fill-orange-500 text-orange-500' : 'text-slate-500'
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
          {place.cuisine && (
            <span className="inline-block mt-1 text-xs font-medium text-orange-500 bg-orange-50 rounded-full px-2.5 py-0.5">
              {place.cuisine}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{place.address}</span>
        </div>

        <p className="text-xs text-slate-400">
          {place.reviewCount > 0
            ? `${place.reviewCount.toLocaleString()} review${place.reviewCount !== 1 ? 's' : ''}`
            : 'No reviews yet'}
        </p>

        {visitedDate && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-auto">
            Visited {visitedDate}
          </p>
        )}
      </div>
    </Link>
  )
}
