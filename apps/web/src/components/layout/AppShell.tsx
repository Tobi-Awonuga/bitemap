import { Outlet, NavLink } from 'react-router-dom'

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">BiteMap</span>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/saved">Saved</NavLink>
          <NavLink to="/visited">Visited</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
