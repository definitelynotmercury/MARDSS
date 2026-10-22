import { getToken } from './auth'
import { BASE_URL } from './config'

const authHeaders = (extra = {}) => ({
    Authorization: `Bearer ${getToken()}`,
    ...extra,
})

export async function apiGet(path) {
    const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.json()
}

export async function apiPost(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.json()
}

export async function apiBlob(path) {
    const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
    return res.blob()
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
