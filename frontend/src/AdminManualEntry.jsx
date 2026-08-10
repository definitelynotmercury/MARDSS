import { useState, useEffect } from 'react'
import { getToken } from './auth'
import { BASE_URL } from './config'
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function AdminManualEntry() {
  const currentYear = new Date().getFullYear()
  const START_YEAR = 2023
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(1)
  const [municipalities, setMunicipalities] = useState([])
  const [assistanceTypes, setAssistanceTypes] = useState([])
  const [grid, setGrid] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  // Fetch municipalities and assistance types once on mount
  useEffect(() => {
    const token = getToken()
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${BASE_URL}/api/municipalities`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/api/assistance_types`, { headers }).then(r => r.json()),
    ]).then(([munis, types]) => {
      setMunicipalities(munis)
      setAssistanceTypes(types)
    })
  }, [])

    // Fetch existing data when year or month changes
    useEffect(() => {
    if (municipalities.length === 0 || assistanceTypes.length === 0) return

    const token = getToken()
    setLoading(true)
    setResult(null)

    fetch(`${BASE_URL}/api/admin/monthly-data?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(r => r.json())
        .then(rows => {
        const newGrid = {}

        // Initialize all cells to 0 first
        for (const muni of municipalities) {
            for (const type of assistanceTypes) {
            newGrid[`${type.type_id}_${muni.municipality_id}`] = 0
            }
        }

        // Overwrite with actual values from DB
        for (const row of rows) {
            newGrid[`${row.assistance_type_id}_${row.municipality_id}`] = row.request_count
        }

        setGrid(newGrid)
        })
        .finally(() => setLoading(false))
    }, [year, month, municipalities, assistanceTypes])

    const handleCellChange = (typeId, muniId, value) => {
    const parsed = parseInt(value, 10)
    setGrid(prev => ({
        ...prev,
        [`${typeId}_${muniId}`]: isNaN(parsed) ? 0 : parsed
    }))
    }

    const [latest, setLatest] = useState(null) // { year, month }

    useEffect(() => {
    const token = getToken()
    fetch(`${BASE_URL}/api/analytics/latest_month`, {
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(r => r.json())
        .then(data => setLatest(data))
    }, [])

    // Last selectable month = latest month with data + 1
    const maxAllowed = (() => {
    if (!latest) return null
    let { year: y, month: m } = latest
    m += 1
    if (m > 12) { m = 1; y += 1 }
    return { year: y, month: m }
    })()

    const isMonthAllowed = (y, m) => {
    if (!maxAllowed) return true
    if (y < maxAllowed.year) return true
    if (y === maxAllowed.year) return m <= maxAllowed.month
    return false
    }

    useEffect(() => {
    if (!maxAllowed) return
    if (!isMonthAllowed(year, month)) {
        setYear(maxAllowed.year)
        setMonth(maxAllowed.month)
    }
    }, [maxAllowed]) // eslint-disable-line react-hooks/exhaustive-deps
    
    const handleSubmit = async () => {
    const token = getToken()
    setSaving(true)
    setResult(null)

    const entries = []
    for (const muni of municipalities) {
        for (const type of assistanceTypes) {
        entries.push({
            assistance_type_id: type.type_id,
            municipality_id: muni.municipality_id,
            request_count: grid[`${type.type_id}_${muni.municipality_id}`] ?? 0
        })
        }
    }

    try {
        const res = await fetch(`${BASE_URL}/api/admin/manual-entry`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ year, month, entries })
        })
        const data = await res.json()
        if (res.ok) {
        setResult({ success: true, message: data.message })
        } else {
        setResult({ success: false, message: data.error || 'Save failed' })
        }
    } catch {
        setResult({ success: false, message: 'Could not reach the server' })
    } finally {
        setSaving(false)
    }
    }

    const handleDelete = async () => {
        if (!window.confirm(`Delete all data for ${MONTHS[month - 1]} ${year}? This cannot be undone.`)) return

        const token = getToken()
        setResult(null)

        try {
            const res = await fetch(`${BASE_URL}/api/admin/delete-monthly-data`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ year, month })
            })
            const data = await res.json()
            if (res.ok) {
                setResult({ success: true, message: data.message })
                setGrid({})
            } else {
                setResult({ success: false, message: data.error || 'Delete failed' })
            }
        } catch {
            setResult({ success: false, message: 'Could not reach the server' })
        }
    }

        const yearOptions = (() => {
            const upperBound = maxAllowed ? maxAllowed.year : new Date().getFullYear()
            const years = []
            for (let y = START_YEAR; y <= upperBound; y++) {
                years.push(y)
            }
            return years
        })()

  return (
        <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold text-gray-700 mb-4">Manual Data Entry</h1>

        {/* Year and Month selectors */}
        <div className="flex items-center gap-4 mb-6">
        <div>
            <label className="text-sm text-gray-500 block mb-1">Year</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value, 10))} className="border rounded px-3 py-2 text-sm">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>

        <div>
            <label className="text-sm text-gray-500 block mb-1">Month</label>
            <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value, 10))}
                className="border rounded px-3 py-2 text-sm"
                >
                {MONTHS.map((name, i) => {
                    const m = i + 1
                    if (!isMonthAllowed(year, m)) return null
                    return <option key={m} value={m}>{name}</option>
                })}
                </select>
        </div>

        <div className="mt-5">
            <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
            {saving ? 'Saving...' : 'Save Entry'}
            </button>
        </div>
        <div className="mt-5 flex gap-2">
        <button
            onClick={handleDelete}
            disabled={saving || loading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500 disabled:opacity-50 text-sm"
        >
            Delete Month
        </button>
    </div>
        </div>

        {/* Result message */}
        {result && (
        <div className={`mb-4 px-4 py-3 rounded text-sm border ${
            result.success
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-red-50 border-red-300 text-red-700'
        }`}>
            {result.message}
        </div>
        )}

        {/* Grid */}
        {loading ? (
        <p className="text-sm text-gray-400">Loading data...</p>
        ) : (
        <div className="overflow-auto max-h-[60vh]">
            <table className="text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-white">
                <tr>
                <th className="border border-gray-200 px-2 py-1 text-left bg-gray-50 min-w-[140px]">
                    Municipality
                </th>
                {assistanceTypes.map(type => (
                    <th
                    key={type.type_id}
                    className="border border-gray-200 px-2 py-1 bg-gray-50 min-w-[90px] text-center"
                    >
                    {type.type_name}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody>
                {municipalities.map(muni => (
                <tr key={muni.municipality_id} className="hover:bg-blue-50">
                    <td className="border border-gray-200 px-2 py-1 font-medium text-gray-700 sticky left-0 bg-white">
                    {muni.municipality_name}
                    </td>
                    {assistanceTypes.map(type => (
                    <td key={type.type_id} className="border border-gray-200 p-0">
                        <input
                        type="number"
                        min="0"
                        value={grid[`${type.type_id}_${muni.municipality_id}`] ?? 0}
                        onChange={e => handleCellChange(type.type_id, muni.municipality_id, e.target.value)}
                        className="w-full px-1 py-1 text-center focus:outline-none focus:bg-blue-100"
                        />
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        )}
    </div>
  )
}

export default AdminManualEntry