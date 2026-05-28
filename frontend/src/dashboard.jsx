import { useState, useEffect } from 'react'
import Layout from './Layout'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, LabelList
} from 'recharts'

const BASE_URL = 'http://127.0.0.1:5000'



function Dashboard() {
    const generateColors = (count) =>
        Array.from({ length: count }, (_, i) => `hsl(${(i * 360) / count}, 55%, 60%)`)

    // Filter options
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    const [selectedYear, setSelectedYear] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')

    // KPI
    const [kpi, setKpi] = useState(null)

    // Charts
    const [trendData, setTrendData] = useState([])
    const [barData, setBarData] = useState([])
    const [typeTotals, setTypeTotals] = useState([])
    const [pieData, setPieData] = useState([])

    // Line chart filters
    const [topN, setTopN] = useState(5)
    const [selectedLineType, setSelectedLineType] = useState('ALL')

    // Pie chart filters
    const [topNPie, setTopNPie] = useState(5)
    const [selectedPieAssistanceType, setSelectedPieAssistanceType] = useState('ALL')
    const [selectedPieYear, setSelectedPieYear] = useState('ALL')

    //barchart filters
    const [selectedBarYear, setSelectedBarYear] = useState('ALL')

    // Irregularities
    const [irregularities, setIrregularities] = useState([])

    // Narrative
    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    // ── Initial load ───────────────────────────────────────────────────────
    useEffect(() => {
        const fetchStatic = async () => {
            const [muniRes, typeRes, irregsRes, trendRes, typeTotalsRes] = await Promise.all([
                fetch(`${BASE_URL}/api/municipalities`),
                fetch(`${BASE_URL}/api/assistance_types`),
                fetch(`${BASE_URL}/api/dashboard/irregularities`),
                fetch(`${BASE_URL}/api/dashboard/trend`),
                fetch(`${BASE_URL}/api/dashboard/type-totals`),
            ])
            setMunicipalities(await muniRes.json())
            setTypes(await typeRes.json())
            setIrregularities(await irregsRes.json())
            setTrendData(await trendRes.json())
            setTypeTotals(await typeTotalsRes.json())
        }
        fetchStatic()
    }, [])

    // ── Pie data refetches when pie filters change ─────────────────────────
    useEffect(() => {
    const fetchPie = async () => {
        const res = await fetch(
            `${BASE_URL}/api/dashboard/pie?top_n=${topNPie}&type=${selectedPieAssistanceType}&year=${selectedPieYear}`
        )
        setPieData(await res.json())
    }
    fetchPie()
    }, [topNPie, selectedPieAssistanceType, selectedPieYear])

    useEffect(() => {
        const fetchBar = async () => {
            const res = await fetch(
                `${BASE_URL}/api/dashboard/barchart?year=${selectedBarYear}`
            )
            setBarData(await res.json())
        }
        fetchBar()
    }, [selectedBarYear])

    // ── KPI refetches when global filters change ───────────────────────────
    useEffect(() => {
        const fetchKpi = async () => {
            const res = await fetch(
                `${BASE_URL}/api/dashboard/kpi?year=${selectedYear}&municipality=${selectedMunicipality}&type=${selectedType}`
            )
            setKpi(await res.json())
        }
        fetchKpi()
    }, [selectedYear, selectedMunicipality, selectedType])

    // ── Narrative ──────────────────────────────────────────────────────────
    const generateNarrative = async () => {
    setNarrativeLoading(true)
    setNarrative('')
    const res = await fetch(`${BASE_URL}/api/dashboard/narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            kpi,
            irregularities,
            trend: trendData,
            pieData,
            barData,
            filters: {
                // global
                year: selectedYear,
                municipality: selectedMunicipality,
                type: selectedType,
                // line chart
                lineType: selectedLineType,
                topN,
                // pie chart
                pieYear: selectedPieYear,
                pieType: selectedPieAssistanceType,
                topNPie,
                // bar chart
                barYear: selectedBarYear,
            }
        })
    })
    const data = await res.json()
    setNarrative(data.narrative)
    setNarrativeLoading(false)
}

    // ── Year options ───────────────────────────────────────────────────────
    const years = []
    let y = 2023
    while (y < new Date().getFullYear()) years.push(y++)

    // ── Line chart: filter typeTotals by topN or specific type ────────────
    const visibleTypes = selectedLineType !== 'ALL'
        ? typeTotals.filter(t => t.name === selectedLineType)
        : typeTotals.slice(0, topN)

    const lineChartColors = generateColors(visibleTypes.length)
    const pieChartColors = generateColors(pieData.length)

    const renderLabel = ({ x, y, value, index }) => {
        if (index !== trendData.length - 1) return null;
        return (
            <text x={x - 35} y={y + 15} fill="#555" fontSize={14} textAnchor="start">
                {value}
            </text>
        );
    };

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
        const total = pieData.reduce((sum, d) => sum + d.value, 0);
        const RADIAN = Math.PI / 180;
        const sliceAngle = (value / total) * 360;
        if (sliceAngle < 20) return null;

        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                {value.toLocaleString()}
            </text>
        );
    };

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Dashboard</h1>
            <p className="text-sm text-gray-500 mb-4">Medical assistance request overview – 2023–2026</p>

            {/* ── Global Filters ── */}
            <div className="flex gap-2 items-center mb-4">
                <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedYear(e.target.value)}>
                    <option value="ALL">ALL YEARS</option>
                    {years.map(year => <option key={year}>{year}</option>)}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedMunicipality(e.target.value)}>
                    <option value="ALL">ALL MUNICIPALITIES</option>
                    {municipalities.map(m => (
                        <option value={m.municipality_id} key={m.municipality_id}>{m.municipality_name}</option>
                    ))}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedType(e.target.value)}>
                    <option value="ALL">ALL TYPES</option>
                    {types.map(t => (
                        <option value={t.type_id} key={t.type_id}>{t.type_name}</option>
                    ))}
                </select>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Total Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {kpi ? kpi.total_requests : 'Loading...'}
                    </h1>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Top Request Type</p>
                    <h1 className="text-lg font-bold text-gray-800">
                        {kpi?.top_type?.type_name ?? 'N/A'}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {kpi?.top_type?.total ? `${kpi.top_type.total} requests` : ''}
                    </p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Top Municipality</p>
                    <h1 className="text-lg font-bold text-gray-800">
                        {kpi?.top_municipality?.municipality_name ?? 'N/A'}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {kpi?.top_municipality?.total ? `${kpi.top_municipality.total} requests` : ''}
                    </p>
                </div>
            </div>

            {/* ── Irregularities ── */}
            {irregularities.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">Irregularities Detected</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {irregularities.map((m, index) => (
                            <div key={index} className="border-l-4 border-yellow-400 bg-yellow-50 rounded p-4 flex gap-3 items-start shadow-sm">
                                <span className="text-yellow-500 text-lg mt-0.5">⚠</span>
                                <div>
                                    <p className="font-semibold text-yellow-800 text-sm">Irregularity Detected: {m.type_name}</p>
                                    <p className="text-yellow-700 text-xs mt-1">{m.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Line Chart ── */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Yearly Trend by Assistance Type</p>
                <p className="text-sm text-gray-400 mb-4">Request volume from 2023 to 2025</p>
                <div className="flex gap-2 items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setTopN(Number(e.target.value))}>
                        {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedLineType(e.target.value)}>
                        <option value="ALL">ALL TYPES</option>
                        {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={600} margin={{ top: 30, right: 30, left: 30, bottom: 30 }}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip wrapperStyle={{ zIndex: 1000, top: 0 }} />
                        <Legend />
                        {visibleTypes.map((t, index) => (
                            <Line key={t.name} type="monotone" dataKey={t.name} stroke={lineChartColors[index]} strokeWidth={3} label={renderLabel} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── Pie Chart ── */}
            <div className="bg-white shadow rounded p-4 mb-6">  
                <p className="font-semibold text-gray-700 mb-1">Distribution by Assistance Type</p>
                <p className="text-sm text-gray-400 mb-4">Percentage Breakdown</p>
                <div className="flex gap-2 items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setTopNPie(Number(e.target.value))}>
                        {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedPieAssistanceType(e.target.value)}>
                        <option value="ALL">ALL TYPES</option>
                        {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedPieYear(e.target.value)}>
                        <option value="ALL">ALL YEARS</option>
                        {years.map(year => <option key={year}>{year}</option>)}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label={renderCustomLabel} labelLine={false} >
                            {pieData.map((_, index) => (
                                <Cell key={index} fill={pieChartColors[index]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* ── Bar Chart ── */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Total Requests by Municipality/City</p>
                <p className="text-sm text-gray-400 mb-4">Top Municipality/City by Volume</p>
                <div className="flex gap-2 items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">FILTERS: </span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedBarYear(e.target.value)}>
                        <option value="ALL">ALL YEARS</option>
                        {years.map(year => <option key={year}>{year}</option>)}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={800}>
                    <BarChart data={barData} layout="vertical" tabIndex={-1}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="municipality_name" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#1e3a5f" stroke="none" tabIndex={-1}>
                            <LabelList
                                dataKey="total"
                                position="insideRight"
                                style={{ fill: '#ffffff', fontSize: 12, fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ── Narrative ── */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Narrative Output</p>
                {!narrative && !narrativeLoading && (
                    <p className="text-sm text-gray-400 mb-4">
                        Click the button to generate an AI-powered narrative based on current dashboard data.
                    </p>
                )}
                {narrativeLoading && <p className="text-sm text-gray-400">Generating narrative...</p>}
                {narrative && !narrativeLoading && <p className="text-sm text-gray-700 mb-4">{narrative}</p>}
                <button
                    onClick={generateNarrative}
                    disabled={narrativeLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm mt-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {narrativeLoading ? 'Generating...' : 'Generate Narrative'}
                </button>
            </div>
        </Layout>
    )
}

export default Dashboard