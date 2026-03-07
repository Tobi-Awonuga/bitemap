import { Search, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'

const MOCK_PLACES: Place[] = [
  {
    id: '1',
    name: 'Nobu London',
    cuisine: 'Japanese',
    address: '19 Old Park Lane, Mayfair',
    rating: 4.8,
    reviewCount: 892,
    gradient: 'from-slate-700 to-slate-900',
    saved: false,
  },
  {
    id: '2',
    name: 'Sketch',
    cuisine: 'Contemporary',
    address: '9 Conduit Street, Mayfair',
    rating: 4.7,
    reviewCount: 1204,
    gradient: 'from-pink-400 to-rose-500',
    saved: true,
  },
  {
    id: '3',
    name: 'Dishoom',
    cuisine: 'Indian',
    address: "12 Upper St Martin's Lane",
    rating: 4.9,
    reviewCount: 3401,
    gradient: 'from-amber-500 to-orange-600',
    saved: false,
  },
  {
    id: '4',
    name: 'The Clove Club',
    cuisine: 'British',
    address: 'Shoreditch Town Hall, EC1V',
    rating: 4.6,
    reviewCount: 567,
    gradient: 'from-emerald-400 to-teal-600',
    saved: true,
  },
  {
    id: '5',
    name: 'Brat',
    cuisine: 'Basque',
    address: '4 Redchurch Street, E2',
    rating: 4.8,
    reviewCount: 743,
    gradient: 'from-blue-500 to-indigo-600',
    saved: false,
  },
  {
    id: '6',
    name: 'St. John',
    cuisine: 'British',
    address: '26 St John Street, EC1M',
    rating: 4.7,
    reviewCount: 891,
    gradient: 'from-violet-500 to-purple-600',
    saved: false,
  },
]

const TRENDING_TAGS = [
  'All', 'Italian', 'Japanese', 'Burgers', 'Vegan', 'Indian', 'Brunch', 'Cocktail Bars', 'Omakase', 'Fine Dining',
]

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 overflow-hidden px-8 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/25 via-transparent to-transparent" />
        <div className="relative max-w-xl">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            <span>London, UK</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
            What are you<br />
            <span className="text-orange-400">craving today?</span>
          </h1>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-xl shadow-black/20">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search places, cuisines, dishes..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none py-2"
              />
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Trending tags */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Trending</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TRENDING_TAGS.map((tag, i) => (
            <button
              key={tag}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                i === 0
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Popular near you */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">Popular Near You</h2>
          </div>
          <button className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            See all
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_PLACES.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>

      {/* Recently added */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Recently Added</h2>
          <button className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            See all
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...MOCK_PLACES].reverse().slice(0, 3).map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>
    </div>
  )
}
