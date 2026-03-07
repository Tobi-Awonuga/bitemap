import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import AdminShell from './components/layout/AdminShell'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import PlaceDetailPage from './pages/PlaceDetailPage'
import SavedPlacesPage from './pages/SavedPlacesPage'
import VisitedPlacesPage from './pages/VisitedPlacesPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminPlacesPage from './pages/admin/AdminPlacesPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminReviewsPage from './pages/admin/AdminReviewsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected user routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/places/:id" element={<PlaceDetailPage />} />
              <Route path="/saved" element={<SavedPlacesPage />} />
              <Route path="/visited" element={<VisitedPlacesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users/:id" element={<UserProfilePage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/places" element={<AdminPlacesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
