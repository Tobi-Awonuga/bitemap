import { Search, SlidersHorizontal, Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const SIDEBAR_PLACES = [
  { id: '1', name: 'Nobu London', cuisine: 'Japanese', rating: 4.8, distance: '0.3 mi', gradient: 'from-slate-700 to-slate-900' },
  { id: '2', name: 'Sketch', cuisine: 'Contemporary', rating: 4.7, distance: '0.5 mi', gradient: 'from-pink-400 to-rose-500' },
  { id: '3', name: 'Dishoom', cuisine: 'Indian', rating: 4.9, distance: '0.8 mi', gradient: 'from-amber-500 to-orange-600' },
  { id: '4', name: 'The Clove Club', cuisine: 'British', rating: 4.6, distance: '1.1 mi', gradient: 'from-emerald-400 to-teal-600' },
  { id: '5', name: 'Brat', cuisine: 'Basque', rating: 4.8, distance: '1.4 mi', gradient: 'from-blue-500 to-indigo-600' },
]

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full sm:w-80 lg:w-96 flex flex-col bg-white border-r border-slate-100 shrink-0 overflow-hidden">
        {/* Search + filter */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search on map..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 transition-colors">
              <SlidersHorizontal className="w-3 h-3" />
              Filters
            </button>
            {['Japanese', 'Italian', 'Vegan'].map((tag) => (
              <button
                key={tag}
                className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-orange-50 hover:text-orange-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400 font-medium">
            <span className="text-slate-900 font-semibold">{SIDEBAR_PLACES.length}</span> places nearby
          </p>
        </div>

        {/* Place list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {SIDEBAR_PLACES.map((place) => (
            <Link
              key={place.id}
              to={`/places/${place.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${place.gradient} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-500 transition-colors truncate">
                  {place.name}
                </p>
                <p className="text-xs text-orange-500 font-medium">{place.cuisine}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-700">{place.rating}</span>
                </div>
                <div className="flex items-center gap-0.5 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  {place.distance}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* Map area */}
      <div className="flex-1 relative bg-slate-200 overflow-hidden hidden sm:block">
        {/* Grid pattern to simulate a map */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94a3b8 1px, transparent 1px),
              linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Road-like lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-200">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Interactive map</p>
              <p className="text-sm text-slate-400 mt-1">Map integration coming soon</p>
            </div>
          </div>
        </div>

        {/* Mock place pins */}
        <div className="absolute top-1/4 left-1/3">
          <div className="relative group cursor-pointer">
            <div className="bg-white rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-slate-800">Nobu</span>
            </div>
          </div>
        </div>
        <div className="absolute top-1/3 left-1/2">
          <div className="relative group cursor-pointer">
            <div className="bg-orange-500 rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform">
              <span className="text-xs font-semibold text-white">Sketch</span>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-2/3">
          <div className="relative group cursor-pointer">
            <div className="bg-white rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-slate-800">Dishoom</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
