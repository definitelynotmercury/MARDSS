import Layout from "./Layout";
import { useState, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, LabelList
} from 'recharts'

const sectionLabels = {
    dashboardKpi: 'Dashboard Summary',
    yoyTrends: 'YoY Trend Analysis',
    distributionByAssistance: 'Distribution by Assistance Type',
    distributionByMunicipality: 'Distribution by Municipality',
    comparisonChart: 'Comparison Chart',
    municipalityDrilldown: 'Municipality Drilldown',
    topNRanking: 'Top N Rankings',
    forecast: 'Demand Forecast',
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const order = ['historical', 'upper', 'projected', 'lower']
        const sorted = order
            .map(name => payload.find(e => e.name === name))
            .filter(Boolean)
        return (
            <div className="bg-white border border-gray-200 rounded p-2 text-sm">
                <p className="font-semibold">{label}</p>
                {sorted.map((entry) => (
                    <p key={entry.name} style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

function Export() {
    // Dataset export filters
    const [selectedYearFrom, setSelectedYearFrom] = useState(2023)
    const [selectedYearTo, setSelectedYearTo] = useState(2023)
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')

    // Chart export filters
    const [sections, setSections] = useState({
        dashboardKpi: false,
        yoyTrends: false,
        distributionByAssistance: false,
        distributionByMunicipality: false,
        comparisonChart: false,
        municipalityDrilldown: false,
        topNRanking: false,
        forecast: false,
    })

    // Dashboard KPI
    const [selectedDashboardYear, setSelectedDashboardYear] = useState('ALL')
    const [selectedDashboardType, setSelectedDashboardType] = useState('ALL')
    const [selectedDashboardMunicipality, setSelectedDashboardMunicipality] = useState('ALL')
    // YoY Trends
    const [selectedYoYTopN, setSelectedYoYTopN] = useState(10)
    const [selectedYoYType, setSelectedYoYType] = useState('ALL')
    // Distribution by Assistance Type
    const [selectedPieChartTopN, setSelectedPieChartTopN] = useState(5)
    const [selectedPieChartType, setSelectedPieChartType] = useState('ALL')
    const [selectedPieChartYear, setSelectedPieChartYear] = useState('ALL')
    // Distribution by Municipality
    const [selectedBarChartYear, setSelectedBarChartYear] = useState('ALL')
    // Comparison Chart
    const [compMunicipality1, setCompMunicipality1] = useState('BULAKAN')
    const [compMunicipality2, setCompMunicipality2] = useState('CALUMPIT')
    const [compType, setCompType] = useState('ALL')
    const [compYear, setCompYear] = useState('ALL')
    // Municipality Drilldown
    const [drilldownMunicipality, setDrilldownMunicipality] = useState('BULAKAN')
    const [drilldownYear, setDrilldownYear] = useState('ALL')
    // Top N Rankings
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')
    // Forecast
    const [forecastMunicipality, setForecastMunicipality] = useState('ALL')
    const [forecastType, setForecastType] = useState('ALL')

    // Shared
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    // Data for preview
    const [kpiPreview, setKpiPreview] = useState(null)
    const [yoyTrendData, setYoyTrendData] = useState([])
    const [yoyTypeTotals, setYoyTypeTotals] = useState([])
    const [pieChartData, setPieChartData] = useState([])
    const [barChartData, setBarChartData] = useState([])
    const [previewData, setPreviewData] = useState([])
    const [previewLoading, setPreviewLoading] = useState(false)

    const [comparisonData, setComparisonData] = useState([])
    const [drilldownData, setDrilldownData] = useState([])
    const drilldownMax = Math.max(...drilldownData.map(d => d.total), 1)
    const [rankingsData, setRankingsData] = useState([])
    const [forecastData, setForecastData] = useState({
    future_years: [],
    future_predictions: [],
    historical_totals: [],
    historical_years: [],
    lower_bound: [],
    upper_bound: [],
    avg_growth_rate: 0
    })
    const lastTotal = forecastData.historical_totals[forecastData.historical_totals.length - 1]

    const years = []
    let y = 2023
    while (y < new Date().getFullYear()) years.push(y++)

    const generateColors = (count) =>
        Array.from({ length: count }, (_, i) => `hsl(${(i * 360) / count}, 55%, 60%)`)

    const yoyVisibleTypes = selectedYoYType !== 'ALL'
        ? yoyTypeTotals.filter(t => t.name === selectedYoYType)
        : yoyTypeTotals.slice(0, selectedYoYTopN)

    const yoyColors = generateColors(yoyVisibleTypes.length)
    const pieChartColors = generateColors(pieChartData.length)

    const anyChartSelected = Object.values(sections).some(Boolean)

    useEffect(() => {
        const fetchdata = async () => {
            const response1 = await fetch('http://127.0.0.1:5000/api/municipalities')
            setMunicipalities(await response1.json())
            const response2 = await fetch('http://127.0.0.1:5000/api/assistance_types')
            setTypes(await response2.json())
        }
        fetchdata()
    }, [])

    useEffect(() => {
        if (!sections.dashboardKpi) return
        const fetchKpi = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/dashboard/kpi?year=${selectedDashboardYear}&municipality=${selectedDashboardMunicipality}&type=${selectedDashboardType}`
            )
            setKpiPreview(await res.json())
        }
        fetchKpi()
    }, [sections.dashboardKpi, selectedDashboardYear, selectedDashboardMunicipality, selectedDashboardType])

    useEffect(() => {
        if (!sections.yoyTrends) return
        const loadYoY = async () => {
            const [trendRes, typeTotalsRes] = await Promise.all([
                fetch(`http://127.0.0.1:5000/api/dashboard/trend`),
                fetch(`http://127.0.0.1:5000/api/dashboard/type-totals`)
            ])
            setYoyTrendData(await trendRes.json())
            setYoyTypeTotals(await typeTotalsRes.json())
        }
        loadYoY()
    }, [sections.yoyTrends])

    useEffect(() => {
        const fetchPie = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/dashboard/pie?top_n=${selectedPieChartTopN}&type=${selectedPieChartType}&year=${selectedPieChartYear}`
            )
            setPieChartData(await res.json())
        }
        fetchPie()
    }, [selectedPieChartTopN, selectedPieChartType, selectedPieChartYear])

    useEffect(() => {
        const fetchBar = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/dashboard/barchart?year=${selectedBarChartYear}`
            )
            setBarChartData(await res.json())
        }
        fetchBar()
    }, [selectedBarChartYear])

    useEffect(() => {
        if (!sections.comparisonChart) return
        const fetchComparison = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/analytics/comparison?municipality_1=${compMunicipality1}&municipality_2=${compMunicipality2}&type=${compType}&year=${compYear}`
            )
            setComparisonData(await res.json())
        }
        fetchComparison()
    }, [sections.comparisonChart, compMunicipality1, compMunicipality2, compType, compYear])

    useEffect(() => {
        if (!sections.municipalityDrilldown) return
        const fetchDrilldown = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/analytics/drill_down?municipality=${drilldownMunicipality}&year=${drilldownYear}`
            )
            setDrilldownData(await res.json())
        }
        fetchDrilldown()
    }, [sections.municipalityDrilldown, drilldownMunicipality, drilldownYear])
 
    // NEW: Top N Rankings fetch
    useEffect(() => {
        if (!sections.topNRanking) return
        const fetchRankings = async () => {
            const res = await fetch(
                `http://127.0.0.1:5000/api/analytics/n_rankings?topN=${topN}&selectedMunicipalityRanking=${selectedMunicipalityRanking}`
            )
            setRankingsData(await res.json())
        }
        fetchRankings()
    }, [sections.topNRanking, topN, selectedMunicipalityRanking])

    useEffect(() => {
        const fetchForecastData = async() => {
            const response = await fetch(`http://127.0.0.1:5000/api/forecast/predict?municipality=${forecastMunicipality}&type=${forecastType}`)
            const data = await response.json()
            setForecastData(data)
        }
        fetchForecastData()
    }, [forecastMunicipality, forecastType])

    useEffect(() => {
        const fetchPreview = async () => {
            setPreviewLoading(true)
            const params = new URLSearchParams({
                year_from: selectedYearFrom,
                year_to: selectedYearTo,
                municipality: selectedMunicipality,
                type: selectedType,
            })
            const res = await fetch(`http://127.0.0.1:5000/api/export/dataset?${params}`)
            const data = await res.json()
            setPreviewData(data)
            setPreviewLoading(false)
        }
        fetchPreview()
    }, [selectedYearFrom, selectedYearTo, selectedMunicipality, selectedType])

    const chartData = [
        ...forecastData.historical_years.map((year, i) => ({
            year: year,
            historical: forecastData.historical_totals[i],
            projected: i === forecastData.historical_years.length - 1 ? lastTotal : null  // bridge only on last point
        })),
        ...forecastData.future_years.map((year, i) => ({
            year: year,
            projected: forecastData.future_predictions[i],
            lower: forecastData.lower_bound[i],
            upper: forecastData.upper_bound[i]
        }))
    ]

    const handleExcelExport = () => {
        const params = new URLSearchParams({
            year_from: selectedYearFrom,
            year_to: selectedYearTo,
            municipality: selectedMunicipality,
            type: selectedType,
        })
        window.open(`http://127.0.0.1:5000/api/export/dataset/excel?${params}`, '_blank')
    }

    const handlePdfExport = () => {
        const params = new URLSearchParams({
            year_from: selectedYearFrom,
            year_to: selectedYearTo,
            municipality: selectedMunicipality,
            type: selectedType,
        })
        window.open(`http://127.0.0.1:5000/api/export/dataset/pdf?${params}`, '_blank')
    }

    const renderEndLabel = (dataKey) => ({ x, y, value }) => {
    if (value == null) return null;
    const colors = { historical: '#8884d8', projected: '#82ca9d', upper: '#ff7300', lower: '#ff7300' }
    const offsets = { historical: -10, projected: -10, upper: -20, lower: 5 }
    return (
        <text x={x} y={y + offsets[dataKey]} fontSize={11} fontWeight={600} textAnchor="middle" fill={colors[dataKey]}>
            {value.toLocaleString()}
        </text>
    );
    };

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Export</h1>

            {/* ── Main 2-col grid ── */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ══ LEFT COLUMN — controls ══ */}
                <div className="flex flex-col gap-4">

                    {/* Card 1 — Dataset Export */}
                    <div className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-gray-700">Dataset Export</p>
                        <p className="text-sm text-gray-400 mb-4">Export raw data as PDF or Excel</p>

                        <p className="font-semibold text-gray-700 mb-2">Year Range</p>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-sm text-gray-400">From</p>
                                <select className="w-full border border-gray-300 rounded p-2 mt-1" onChange={e => setSelectedYearFrom(e.target.value)} value={selectedYearFrom}>
                                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">To</p>
                                <select className="w-full border border-gray-300 rounded p-2 mt-1" onChange={e => setSelectedYearTo(e.target.value)} value={selectedYearTo}>
                                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="font-semibold text-gray-700 mb-1">Assistance Type</p>
                                <select className="w-full border border-gray-300 rounded p-2" onChange={e => setSelectedType(e.target.value)} value={selectedType}>
                                    <option value="ALL">ALL</option>
                                    {types.map(type => (
                                        <option key={type.type_id} value={type.type_name}>{type.type_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700 mb-1">Municipality/City</p>
                                <select className="w-full border border-gray-300 rounded p-2" onChange={e => setSelectedMunicipality(e.target.value)} value={selectedMunicipality}>
                                    <option value="ALL">ALL</option>
                                    {municipalities.map(m => (
                                        <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handlePdfExport} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Export PDF</button>
                            <button onClick={handleExcelExport} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">Export Excel</button>
                        </div>
                    </div>

                    {/* Card 2 — Charts Export */}
                    <div className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-gray-700">Charts Export</p>
                        <p className="text-sm text-gray-400 mb-4">Select charts to include in your report</p>

                        {Object.entries(sections).map(([key, value]) => (
                            <div key={key} className="mb-2">
                                <div className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id={key}
                                        checked={value}
                                        onChange={() => setSections(prev => ({ ...prev, [key]: !prev[key] }))}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    />
                                    <label htmlFor={key} className="text-base text-gray-600 cursor-pointer">{sectionLabels[key]}</label>
                                </div>

                                {key === 'dashboardKpi' && value && (
                                    <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardYear(e.target.value)} value={selectedDashboardYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardMunicipality(e.target.value)} value={selectedDashboardMunicipality}>
                                                <option value="ALL">ALL MUNICIPALITIES</option>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardType(e.target.value)} value={selectedDashboardType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'yoyTrends' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Top</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedYoYTopN(Number(e.target.value))} value={selectedYoYTopN}>
                                                {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedYoYType(e.target.value)} value={selectedYoYType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'distributionByAssistance' && value && (
                                    <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Top</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartTopN(Number(e.target.value))} value={selectedPieChartTopN}>
                                                {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartType(e.target.value)} value={selectedPieChartType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartYear(e.target.value)} value={selectedPieChartYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'distributionByMunicipality' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedBarChartYear(e.target.value)} value={selectedBarChartYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'comparisonChart' && value && (
                                    <div className="mt-2 grid grid-cols-4 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality 1</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompMunicipality1(e.target.value)} value={compMunicipality1}>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality 2</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompMunicipality2(e.target.value)} value={compMunicipality2}>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompType(e.target.value)} value={compType}>
                                                <option value="ALL">ALL</option>
                                                {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompYear(e.target.value)} value={compYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'municipalityDrilldown' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setDrilldownMunicipality(e.target.value)} value={drilldownMunicipality}>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setDrilldownYear(e.target.value)} value={drilldownYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'topNRanking' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Top N</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setTopN(Number(e.target.value))} value={topN}>
                                                {[5, 10, 15, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedMunicipalityRanking(e.target.value)} value={selectedMunicipalityRanking}>
                                                <option value="ALL">ALL MUNICIPALITIES</option>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'forecast' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setForecastMunicipality(e.target.value)} value={forecastMunicipality}>
                                                <option value="ALL">ALL MUNICIPALITIES</option>
                                                {municipalities.map(m => <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setForecastType(e.target.value)} value={forecastType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Export PDF</button>
                            <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">Export Excel</button>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT COLUMN — two stacked preview panels ══ */}
                <div className="flex flex-col gap-4">

                    {/* ── Preview Panel 1: Dataset ── */}
                    <div className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-gray-700">Dataset Preview</p>
                        <p className="text-sm text-gray-400 mb-4">Preview of the raw data export</p>

                        {/* Report header */}
                        <div className="border rounded p-4 text-center mb-4">
                            <h1 className="text-xl font-bold text-gray-800">MARDSS REPORT</h1>
                            <p className="text-sm text-gray-500">Medical Assistance Request Decision Support System</p>
                            <p className="text-sm text-gray-500">Province of Bulacan - PSWDO</p>
                            <p className="text-sm text-gray-500">Period: {selectedYearFrom} – {selectedYearTo}</p>
                            <p className="text-sm text-gray-500">
                                Municipality: {selectedMunicipality === 'ALL' ? 'All Municipalities' : selectedMunicipality}
                            </p>
                            <p className="text-sm text-gray-500">
                                Assistance Type: {selectedType === 'ALL' ? 'All Types' : selectedType}
                            </p>
                        </div>

                        {/* Data table */}
                        {previewLoading ? (
                            <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
                        ) : previewData.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">No data found for selected filters.</p>
                        ) : (
                            <div className="overflow-auto max-h-96 border rounded">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-gray-600">Year</th>
                                            <th className="px-3 py-2 text-gray-600">Municipality</th>
                                            <th className="px-3 py-2 text-gray-600">Assistance Type</th>
                                            <th className="px-3 py-2 text-gray-600 text-right">Requests</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-3 py-2">{row.year}</td>
                                                <td className="px-3 py-2">{row.municipality_name}</td>
                                                <td className="px-3 py-2">{row.type_name}</td>
                                                <td className="px-3 py-2 text-right">{row.request_count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Preview Panel 2: Charts ── */}
                    <div className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-gray-700">Charts Preview</p>
                        <p className="text-sm text-gray-400 mb-4">Preview of selected chart sections</p>

                        {!anyChartSelected ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                No charts selected. Check at least one chart section on the left to preview it here.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-6">

                                {/* Dashboard KPI */}
                                {sections.dashboardKpi && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-2">Dashboard Summary</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-gray-50 border rounded p-4">
                                                <p className="text-sm text-gray-500">Total Requests</p>
                                                <h2 className="text-2xl font-bold text-gray-800">
                                                    {kpiPreview ? kpiPreview.total_requests : 'Loading...'}
                                                </h2>
                                            </div>
                                            <div className="bg-gray-50 border rounded p-4">
                                                <p className="text-sm text-gray-500">Top Request Type</p>
                                                <h2 className="text-lg font-bold text-gray-800">
                                                    {kpiPreview?.top_type?.type_name ?? 'N/A'}
                                                </h2>
                                                <p className="text-sm text-gray-400">
                                                    {kpiPreview?.top_type?.total ? `${kpiPreview.top_type.total} requests` : ''}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 border rounded p-4">
                                                <p className="text-sm text-gray-500">Top Municipality</p>
                                                <h2 className="text-lg font-bold text-gray-800">
                                                    {kpiPreview?.top_municipality?.municipality_name ?? 'N/A'}
                                                </h2>
                                                <p className="text-sm text-gray-400">
                                                    {kpiPreview?.top_municipality?.total ? `${kpiPreview.top_municipality.total} requests` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* YoY Trends */}
                                {sections.yoyTrends && yoyTrendData.length > 0 && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-2">YoY Trend Analysis</p>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={yoyTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="year" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                {yoyVisibleTypes.map((t, i) => (
                                                    <Line key={t.name} type="monotone" dataKey={t.name} stroke={yoyColors[i]} strokeWidth={2} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Distribution by Assistance Type */}
                                {sections.distributionByAssistance && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-1">Distribution by Assistance Type</p>
                                        <p className="text-sm text-gray-400 mb-4">Percentage Breakdown</p>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                                                    {pieChartData.map((_, index) => (
                                                        <Cell key={index} fill={pieChartColors[index]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Distribution by Municipality */}
                                {sections.distributionByMunicipality && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-1">Total Requests by Municipality/City</p>
                                        <p className="text-sm text-gray-400 mb-4">Top Municipality/City by Volume</p>
                                        <ResponsiveContainer width="100%" height={800}>
                                            <BarChart data={barChartData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="municipality_name" type="category" width={150} />
                                                <Tooltip />
                                                <Bar dataKey="total" fill="#1e3a5f" stroke="none">
                                                    <LabelList
                                                        dataKey="total"
                                                        position="insideRight"
                                                        style={{ fill: '#ffffff', fontSize: 12, fontWeight: 600 }}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {sections.comparisonChart && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-1">Side-by-side Comparison</p>
                                        <p className="text-sm text-gray-400 mb-4">
                                            {compMunicipality1} vs {compMunicipality2}
                                            {compType !== 'ALL' ? ` · ${compType}` : ''}
                                            {compYear !== 'ALL' ? ` · ${compYear}` : ''}
                                        </p>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: 0, bottom: 120 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="type_name" angle={-45} textAnchor="end" interval={0} height={120} />
                                                <YAxis type="number" width={60} />
                                                <Tooltip />
                                                <Legend verticalAlign="top" />
                                                <Bar dataKey={compMunicipality1} fill="#1e3a5f" stroke="none" label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                                                <Bar dataKey={compMunicipality2} fill="#3b82f6" stroke="none" label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* ── NEW: Municipality Drilldown ── */}
                                {sections.municipalityDrilldown && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-1">Municipality Drill-Down</p>
                                        <p className="text-sm text-gray-400 mb-4">
                                            {drilldownMunicipality}
                                            {drilldownYear !== 'ALL' ? ` · ${drilldownYear}` : ' · All Years'}
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {drilldownData.map((item) => (
                                                <div key={item.type_name} className="bg-gray-100 rounded-lg p-4">
                                                    <div className="flex justify-between text-sm font-medium mb-2">
                                                        <span className="text-gray-600">{item.type_name}</span>
                                                        <span className="text-gray-800">{item.total.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-300 rounded-full">
                                                        <div
                                                            className="h-2 bg-blue-500 rounded-full"
                                                            style={{ width: `${(item.total / drilldownMax) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
 
                                {/* ── NEW: Top N Rankings ── */}
                                {sections.topNRanking && (
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-1">Top N Rankings</p>
                                        <p className="text-sm text-gray-400 mb-4">
                                            Top {topN} municipalities by total requests
                                            {selectedMunicipalityRanking !== 'ALL' ? ` · ${selectedMunicipalityRanking}` : ''}
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b">
                                                        <th className="pb-3 pr-4">Rank</th>
                                                        <th className="pb-3 pr-4">Municipality</th>
                                                        <th className="pb-3 pr-4">Previous Year</th>
                                                        <th className="pb-3 pr-4">Current Year</th>
                                                        <th className="pb-3 pr-4">Volume</th>
                                                        <th className="pb-3">Growth Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rankingsData.map((item, index) => (
                                                        <tr key={item.municipality_name} className="border-b hover:bg-gray-50">
                                                            <td className="py-3 pr-4">
                                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold
                                                                    ${index === 0 ? 'bg-blue-800' : index === 1 ? 'bg-blue-600' : index === 2 ? 'bg-blue-400' : 'bg-gray-300 text-gray-600'}`}>
                                                                    {index + 1}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 pr-4 font-medium text-gray-700">{item.municipality_name}</td>
                                                            <td className="py-3 pr-4 text-gray-500">{item.previous?.toLocaleString() ?? 'N/A'}</td>
                                                            <td className="py-3 pr-4 text-gray-800 font-semibold">{item.current?.toLocaleString() ?? 'N/A'}</td>
                                                            <td className="py-3 pr-4 w-40">
                                                                <div className="h-2 bg-gray-200 rounded-full">
                                                                    <div
                                                                        className="h-2 bg-teal-600 rounded-full"
                                                                        style={{ width: `${(item.current / Math.max(...rankingsData.map(r => r.current || 0), 1)) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="py-3">
                                                                <span className={`font-semibold ${item.growth_rate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {item.growth_rate >= 0 ? '+' : ''}{item.growth_rate}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ── NEW: Forecast ── */}
                                {sections.forecast && (
                                    <div className="bg-white shadow rounded p-4 mb-6">
                                        <p className="font-semibold text-gray-700 mb-1">Demand Forecast</p>
                                        <p className="text-sm text-gray-400 mb-4">Historical data (solid line) and projections (dashed line) with confidence range</p>
                                            <ResponsiveContainer width="100%" height={600}>
                                                <LineChart data={chartData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" />
                                                    <YAxis />
                                                    <Line dataKey="historical" stroke="#8884d8" strokeWidth={2} dot={false} label={renderEndLabel('historical')} />
                                                    <Line dataKey="projected"  stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" dot={false} label={renderEndLabel('projected')} />
                                                    <Line dataKey="upper"      stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} label={renderEndLabel('upper')} />
                                                    <Line dataKey="lower"      stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} label={renderEndLabel('lower')} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
                {/* end right column */}

            </div>
        </Layout>
    )
}

export default Export