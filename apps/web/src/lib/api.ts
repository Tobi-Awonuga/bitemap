const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export function getToken(): string | null {
  return localStorage.getItem('bm_token')
}

export function setToken(token: string): void {
  localStorage.setItem('bm_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('bm_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (res.status === 204) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  let body: { error?: string } & Record<string, unknown>
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
  } else {
    const text = await res.text().catch(() => '')
    body = { error: text || `HTTP ${res.status}` }
  }

  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
