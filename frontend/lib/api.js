const BASE = process.env.NEXT_PUBLIC_API_BASE_URL

// Calls the backend, parses JSON, and throws a real Error (with code/status)
// when the server refuses — so components can surface the message.
export async function apiFetch(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json() : null

  if (!res.ok) {
    const err = new Error(payload?.error?.message ?? `Request failed (${res.status})`)
    err.code = payload?.error?.code
    err.status = res.status
    throw err
  }
  return payload
}