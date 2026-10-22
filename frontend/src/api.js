import { getToken } from './auth'
import { BASE_URL } from './config'
import { mockGet, mockPost, mockBlob } from './mockData'

// Fake data is on by default for UI work. Set VITE_USE_MOCK=false to hit the real backend.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${getToken()}`,
    ...extra,
})

export async function apiGet(path) {
    if (USE_MOCK) return mockGet(path)
    const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.json()
}

export async function apiPost(path, body) {
    if (USE_MOCK) return mockPost(path, body)
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.json()
}

export async function apiBlob(path) {
    if (USE_MOCK) return mockBlob(path)
    const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.blob()
}

export function downloadBlob(blob, filename) {
    const name = blob.type === 'text/csv' ? filename.replace(/\.\w+$/, '.csv') : filename
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}
