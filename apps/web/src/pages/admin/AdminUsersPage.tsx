import { useState, useEffect } from 'react'
import { Loader2, Search, Shield, User, Trash2, UserX, UserCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import UserAvatar from '../../components/ui/UserAvatar'

type AdminUser = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string | null
  role: 'user' | 'admin'
  isActive: boolean
  deactivatedAt?: string | null
  createdAt: string
  saveCount: number
  visitCount: number
  reviewCount: number
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')

  useEffect(() => {
    api
      .get<AdminUser[]>('/api/admin/users')
      .then(setUsers)
      .catch((err) => {
        setUsers([])
        setError(err instanceof Error ? err.message : 'Failed to load users')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setUpdatingId(user.id)
    try {
      await api.patch(`/api/admin/users/${user.id}`, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
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
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleActive = async (user: AdminUser) => {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Reactivate'} "${user.displayName}"?`)) return
    setStatusUpdatingId(user.id)
    try {
      const updated = await api.patch<Pick<AdminUser, 'id' | 'isActive' | 'deactivatedAt'>>(`/api/admin/users/${user.id}`, {
        isActive: !user.isActive,
      })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{users.length} registered users</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'user', 'admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {role === 'all' ? 'All' : role === 'admin' ? 'Admins' : 'Users'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">{search || roleFilter !== 'all' ? 'No users match your filter.' : 'No users found.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/50 transition-colors"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={user.displayName}
                        avatarUrl={user.avatarUrl}
                        className="w-9 h-9 shrink-0"
                        textClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                          {user.role === 'admin' && (
                            <span className="text-xs font-medium text-orange-400 bg-orange-400/10 rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          )}
                          {!user.isActive && (
                            <span className="text-xs font-medium text-red-300 bg-red-400/10 rounded-full px-2 py-0.5 shrink-0">
                              Deactivated
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
                        onClick={() => toggleActive(user)}
                        disabled={statusUpdatingId === user.id || isCurrentUser}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-600 text-slate-300 hover:border-red-400 hover:text-red-300"
                        title={isCurrentUser ? "Can't change your own status" : user.isActive ? 'Deactivate account' : 'Reactivate account'}
                      >
                        {statusUpdatingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : user.isActive ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        {user.isActive ? 'Deactivate' : 'Reactivate'}
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
