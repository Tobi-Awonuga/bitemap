import { useState, useEffect, useCallback } from 'react'

export type Coords = { lat: number; lng: number }
export type GeoPermission = 'idle' | 'granted' | 'denied' | 'prompt'

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
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
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPermission('granted')
        setError(null)
      },
      (err) => {
        setError(err.message)
        setPermission('denied')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
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
