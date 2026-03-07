import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import PlaceDetailPage from './pages/PlaceDetailPage'
import SavedPlacesPage from './pages/SavedPlacesPage'
import VisitedPlacesPage from './pages/VisitedPlacesPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/places/:id" element={<PlaceDetailPage />} />
          <Route path="/saved" element={<SavedPlacesPage />} />
          <Route path="/visited" element={<VisitedPlacesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
