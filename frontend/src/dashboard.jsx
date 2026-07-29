import { useState, useEffect } from 'react'
import Layout from './Layout'
import { getToken } from './auth'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, LabelList
} from 'recharts'
import { TrendingUp, PieChart as PieChartIcon, BarChart2, FileText } from 'lucide-react'

const BASE_URL = 'http://127.0.0.1:5000'

function Dashboard() {
    const generateColors = (count) =>
        Array.from({ length: count }, (_, i) => `hsl(${(i * 360) / count}, 55%, 60%)`)

    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    const [selectedYear, setSelectedYear] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedMonth, setSelectedMonth] = useState('ALL')
    const [showMonthFilter, setShowMonthFilter] = useState(false)

    const [kpi, setKpi] = useState(null)

    const [trendData, setTrendData] = useState([])
    const [barData, setBarData] = useState([])
    const [typeTotals, setTypeTotals] = useState([])
    const [pieData, setPieData] = useState([])

    const [topN, setTopN] = useState(5)
    const [selectedLineType, setSelectedLineType] = useState('ALL')
    const [selectedYearForLine, setSelectedYearForLine] = useState('ALL')

    const [topNPie, setTopNPie] = useState(5)
    const [selectedPieAssistanceType, setSelectedPieAssistanceType] = useState('ALL')
    const [selectedPieYear, setSelectedPieYear] = useState('ALL')
    const [showPieMonthFilter, setShowPieMonthFilter] = useState(false)
    const [selectedPieMonth, setSelectedPieMonth] = useState('ALL')

    const [selectedBarYear, setSelectedBarYear] = useState('ALL')
    const [showBarMonthFilter, setShowBarMonthFilter] = useState(false)
    const [selectedBarMonth, setSelectedBarMonth] = useState('ALL')

    const [irregularities, setIrregularities] = useState([])

    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    useEffect(() => {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
        }
        const fetchStatic = async () => {
            const [muniRes, typeRes, irregsRes, typeTotalsRes] = await Promise.all([
                fetch(`${BASE_URL}/api/municipalities`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${BASE_URL}/api/assistance_types`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${BASE_URL}/api/dashboard/irregularities`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${BASE_URL}/api/dashboard/type-totals`, { headers: { 'Authorization': `Bearer ${token}` } })
            ])
            setMunicipalities(await muniRes.json())
            setTypes(await typeRes.json())
            setIrregularities(await irregsRes.json())
            setTypeTotals(await typeTotalsRes.json())
        }
        fetchStatic()
    }, [])

    useEffect(() => {
        const fetchTrend = async () => {
            const token = getToken()
            const res = await fetch(`${BASE_URL}/api/dashboard/trend?year=${selectedYearForLine}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setTrendData(await res.json())
        }
        fetchTrend()
    }, [selectedYearForLine])

    useEffect(() => {
        const fetchPie = async () => {
            const token = getToken()
            const res = await fetch(
                `${BASE_URL}/api/dashboard/pie?top_n=${topNPie}&type=${selectedPieAssistanceType}&year=${selectedPieYear}&month=${selectedPieMonth}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            setPieData(await res.json())
        }
        fetchPie()
    }, [topNPie, selectedPieAssistanceType, selectedPieYear, selectedPieMonth])

    useEffect(() => {
        const fetchBar = async () => {
            const token = getToken()
            const res = await fetch(
                `${BASE_URL}/api/dashboard/barchart?year=${selectedBarYear}&month=${selectedBarMonth}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            setBarData(await res.json())
        }
        fetchBar()
    }, [selectedBarYear, selectedBarMonth])

    useEffect(() => {
        const fetchKpi = async () => {
            const token = getToken()
            const res = await fetch(
                `${BASE_URL}/api/dashboard/kpi?year=${selectedYear}&municipality=${selectedMunicipality}&type=${selectedType}&month=${selectedMonth}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            setKpi(await res.json())
        }
        fetchKpi()
    }, [selectedYear, selectedMunicipality, selectedType, selectedMonth])

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')
        const token = getToken()
        const res = await fetch(`${BASE_URL}/api/dashboard/narrative`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                kpi,
                irregularities,
                trend: trendData,
                pieData,
                barData,
                filters: {
                    year: selectedYear, municipality: selectedMunicipality, type: selectedType,
                    month: selectedMonth,
                    lineType: selectedLineType, topN, lineYear: selectedYearForLine,
                    pieYear: selectedPieYear, pieType: selectedPieAssistanceType, topNPie, pieMonth: selectedPieMonth,
                    barYear: selectedBarYear, barMonth: selectedBarMonth,
                }
            })
        })
        const data = await res.json()
        setNarrative(data.narrative)
        setNarrativeLoading(false)
    }

    const years = []
    let y = 2023
    while (y <= new Date().getFullYear()) years.push(y++)

    const months = [
        { label: 'Jan', value: 1 }, { label: 'Feb', value: 2 }, { label: 'Mar', value: 3 },
        { label: 'Apr', value: 4 }, { label: 'May', value: 5 }, { label: 'Jun', value: 6 },
        { label: 'Jul', value: 7 }, { label: 'Aug', value: 8 }, { label: 'Sep', value: 9 },
        { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dec', value: 12 },
    ]

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

    const pillSelect = "border px-3 py-1 text-sm bg-white"

    return (
        <Layout>
            {/* ── Header row: title left, filters right ── */}
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-700">Dashboard</h1>
                    <p className="text-sm text-gray-500">Medical assistance request overview – 2023–2026</p>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                    <select className={pillSelect}
                        onChange={e => {
                            const value = e.target.value
                            setSelectedYear(value)
                            setShowMonthFilter(value !== 'ALL')
                            if (value === 'ALL') setSelectedMonth('ALL')
                        }}>
                        <option value="ALL">ALL YEARS</option>
                        {years.map(year => <option key={year}>{year}</option>)}
                    </select>
                    {showMonthFilter && (
                        <select className={pillSelect} onChange={e => setSelectedMonth(e.target.value)}>
                            <option value="ALL">ALL MONTHS</option>
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    )}
                    <select className={pillSelect} onChange={e => setSelectedMunicipality(e.target.value)}>
                        <option value="ALL">ALL MUNICIPALITY</option>
                        {municipalities.map(m => (
                            <option value={m.municipality_id} key={m.municipality_id}>{m.municipality_name}</option>
                        ))}
                    </select>
                    <select className={pillSelect} onChange={e => setSelectedType(e.target.value)}>
                        <option value="ALL">ALL TYPES</option>
                        {types.map(t => (
                            <option value={t.type_id} key={t.type_id}>{t.type_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white shadow rounded p-4 border-l-4 border-[#0B2E52]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Requests (2023-2025)</p>
                    <h1 className="text-2xl font-bold text-gray-800 mt-1">
                        {kpi ? kpi.total_requests : 'Loading...'}
                    </h1>
                    {kpi?.growth_percent && (
                        <span className="inline-block mt-2 bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                            +{kpi.growth_percent}%
                        </span>
                    )}
                </div>
                <div className="bg-white shadow rounded p-4 border-l-4 border-[#A6790E]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Highest Volume Type</p>
                    <h1 className="text-lg font-bold text-gray-800 mt-1">
                        {kpi?.top_type?.type_name ?? 'N/A'}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {kpi?.top_type?.total ? `${kpi.top_type.total} requests` : ''}
                    </p>
                </div>
                <div className="bg-white shadow rounded p-4 border-l-4 border-[#2862DC]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Highest Volume Municipality</p>
                    <h1 className="text-lg font-bold text-gray-800 mt-1">
                        {kpi?.top_municipality?.municipality_name ?? 'N/A'}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {kpi?.top_municipality?.total ? `${kpi.top_municipality.total} requests` : ''}
                    </p>
                </div>
            </div>


            {/* ── Line Chart ── */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <TrendingUp size={16} className="text-gray-500" />
                            Yearly Trend by Assistance Type
                        </p>
                        <p className="text-sm text-gray-400">Request volume from 2023 to 2025</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <select className={pillSelect} onChange={e => setTopN(Number(e.target.value))}>
                            {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                        </select>
                        <select className={pillSelect} onChange={e => setSelectedLineType(e.target.value)}>
                            <option value="ALL">ALL TYPES</option>
                            {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                        </select>
                        <select className={pillSelect} onChange={e => setSelectedYearForLine(e.target.value)}>
                            <option value="ALL">ALL YEARS</option>
                            {years.map(year => <option key={year}>{year}</option>)}
                        </select>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={600} margin={{ top: 30, right: 30, left: 30, bottom: 30 }}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={trendData[0]?.month ? 'month' : 'year'} />
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
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <PieChartIcon size={16} className="text-gray-500" />
                            Distribution by Assistance Type
                        </p>
                        <p className="text-sm text-gray-400">Percentage Breakdown</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <select className={pillSelect} onChange={e => setTopNPie(Number(e.target.value))}>
                            {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                        </select>
                        <select className={pillSelect} onChange={e => setSelectedPieAssistanceType(e.target.value)}>
                            <option value="ALL">ALL TYPES</option>
                            {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                        </select>
                        <select className={pillSelect}
                            onChange={e => {
                                const value = e.target.value
                                setSelectedPieYear(value)
                                setShowPieMonthFilter(value !== 'ALL')
                                if (value === 'ALL') setSelectedPieMonth('ALL')
                            }}>
                            <option value="ALL">ALL YEARS</option>
                            {years.map(year => <option key={year}>{year}</option>)}
                        </select>
                        {showPieMonthFilter && (
                            <select className={pillSelect} onChange={e => setSelectedPieMonth(e.target.value)}>
                                <option value="ALL">ALL MONTHS</option>
                                {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                            </select>
                        )}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label={renderCustomLabel} labelLine={false}>
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
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <p className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <BarChart2 size={16} className="text-gray-500" />
                            Total Requests by Municipality/City
                        </p>
                        <p className="text-sm text-gray-400">Top Municipality/City by Volume</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <select className={pillSelect}
                            onChange={e => {
                                const value = e.target.value
                                setSelectedBarYear(value)
                                setShowBarMonthFilter(value !== 'ALL')
                                if (value === 'ALL') setSelectedBarMonth('ALL')
                            }}>
                            <option value="ALL">ALL YEARS</option>
                            {years.map(year => <option key={year}>{year}</option>)}
                        </select>
                        {showBarMonthFilter && (
                            <select className={pillSelect} onChange={e => setSelectedBarMonth(e.target.value)}>
                                <option value="ALL">ALL MONTHS</option>
                                {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                            </select>
                        )}
                    </div>
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
            <div className="bg-white shadow rounded p-4 mb-6 border-l-4 border-amber-500">
                <p className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                    <FileText size={16} className="text-gray-500" />
                    Narrative Output
                </p>
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