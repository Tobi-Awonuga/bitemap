import { useState } from 'react'
import { Settings, Bookmark, CheckCircle, Star, MapPin, ChevronRight, LogOut } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'

const USER = {
  name: 'Tobi Awonuga',
  email: 'tobi@example.com',
  initials: 'TA',
  bio: 'Food explorer. Always chasing the next great bite.',
  joinedDate: 'March 2026',
}

const STATS = [
  { label: 'Saved', value: 3, icon: Bookmark },
  { label: 'Visited', value: 3, icon: CheckCircle },
  { label: 'Reviews', value: 2, icon: Star },
]

const RECENT_SAVES: Place[] = [
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
    id: '4',
    name: 'The Clove Club',
    cuisine: 'British',
    address: 'Shoreditch Town Hall, EC1V',
    rating: 4.6,
    reviewCount: 567,
    gradient: 'from-emerald-400 to-teal-600',
    saved: true,
  },
]

type Tab = 'saved' | 'visited'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('saved')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">{USER.initials}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{USER.name}</h1>
              <p className="text-sm text-slate-500">{USER.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400">Member since {USER.joinedDate}</span>
              </div>
            </div>
          </div>
          <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Bio */}
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{USER.bio}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
        {[
          { label: 'Edit Profile', icon: Settings },
          { label: 'Saved Places', icon: Bookmark },
          { label: 'Visited Places', icon: CheckCircle },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      {/* Tabs — recent activity */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(['saved', 'visited'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RECENT_SAVES.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-sm font-medium transition-colors">
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  )
}
