import { useState, useEffect, useCallback } from 'react'

export type Coords = { lat: number; lng: number }
export type GeoPermission = 'idle' | 'granted' | 'denied' | 'prompt'
const GEO_CACHE_KEY = 'bm_geo_last_known'
const GEO_CACHE_TTL_MS = 10 * 60 * 1000

function readCachedCoords(): Coords | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { lat: number; lng: number; ts: number }
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng) || !Number.isFinite(parsed.ts)) {
      return null
    }
    if (Date.now() - parsed.ts > GEO_CACHE_TTL_MS) return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

function writeCachedCoords(coords: Coords) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...coords, ts: Date.now() }))
  } catch {
    // ignore storage errors
  }
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(() => readCachedCoords())
  const [permission, setPermission] = useState<GeoPermission>('idle')
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setPermission('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(next)
        writeCachedCoords(next)
        setPermission('granted')
        setError(null)
      },
      (err) => {
        setError(err.message)
        setPermission('denied')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 120_000 },
    )
  }, [])

  useEffect(() => {
    if (!navigator.permissions) return

    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      setPermission(status.state as GeoPermission)
      if (status.state === 'granted') requestLocation()

      status.onchange = () => {
        setPermission(status.state as GeoPermission)
        if (status.state === 'granted') requestLocation()
      }
    })
  }, [requestLocation])

  return { coords, permission, error, requestLocation }
}
