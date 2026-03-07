import { useState, useEffect } from 'react'
import { Loader2, Shield, User, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

type AdminUser = {
  id: string
  email: string
  displayName: string
  role: 'user' | 'admin'
  createdAt: string
  saveCount: number
  visitCount: number
  reviewCount: number
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<AdminUser[]>('/api/admin/users')
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setUpdatingId(user.id)
    try {
      await api.patch(`/api/admin/users/${user.id}`, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Delete "${user.displayName}"? All their data will be removed.`)) return
    setDeletingId(user.id)
    try {
      await api.del(`/api/admin/users/${user.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{users.length} registered users</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUser?.id
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/50 transition-colors"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-semibold">{getInitials(user.displayName)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                          {user.role === 'admin' && (
                            <span className="text-xs font-medium text-orange-400 bg-orange-400/10 rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-slate-500 shrink-0">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Stats + actions */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
                        <span>{user.visitCount} visits</span>
                        <span>{user.saveCount} saves</span>
                        <span>{user.reviewCount} reviews</span>
                      </div>
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={updatingId === user.id || isCurrentUser}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-600 text-slate-300 hover:border-orange-400 hover:text-orange-400"
                        title={isCurrentUser ? "Can't change your own role" : `Make ${user.role === 'admin' ? 'regular user' : 'admin'}`}
                      >
                        {updatingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : user.role === 'admin' ? (
                          <User className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.id || isCurrentUser}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isCurrentUser ? "Can't delete yourself" : 'Delete user'}
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
