import Layout from "./Layout";
import { useState, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar
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

function Export(){
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
    //filters for each section
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
    const [compMunicipality1, setCompMunicipality1] = useState('ALL')
    const [compMunicipality2, setCompMunicipality2] = useState('ALL')
    const [compType, setCompType] = useState('ALL')
    const [compYear, setCompYear] = useState('ALL')
    // Municipality Drilldown
    const [drilldownMunicipality, setDrilldownMunicipality] = useState('ALL')
    const [drilldownYear, setDrilldownYear] = useState('ALL')
    // Top N Rankings
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')
    //forecast
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

    const years = []
    let y = 2023
    while (y < new Date().getFullYear()) years.push(y++)

    const generateColors = (count) =>
    Array.from({ length: count }, (_, i) => `hsl(${(i * 360) / count}, 55%, 60%)`)

    // Filter
    const yoyVisibleTypes = selectedYoYType !== 'ALL'
        ? yoyTypeTotals.filter(t => t.name === selectedYoYType)
        : yoyTypeTotals.slice(0, selectedYoYTopN)

    const yoyColors = generateColors(yoyVisibleTypes.length)
    const pieChartColors = generateColors(pieChartData.length)

    useEffect(() => {
        const fetchdata = async() => {
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

    // Add this state
    const [previewData, setPreviewData] = useState([])
    const [previewLoading, setPreviewLoading] = useState(false)

    // Fetch preview dataset whenever filters change
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

    return(
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Export</h1>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Left column — two cards stacked */}
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
                            <button onClick={handlePdfExport}className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Export PDF</button>
                            <button onClick={handleExcelExport}className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">Export Excel</button>
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

                                {/* Conditional filters */}
                                {key === 'dashboardKpi' && value && (
                                    <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardYear(e.target.value)} value={selectedDashboardYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardMunicipality(e.target.value)} value={selectedDashboardMunicipality}>
                                                <option value="ALL">ALL MUNICIPALITIES</option>
                                                {municipalities.map(m => (
                                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedDashboardType(e.target.value)} value={selectedDashboardType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => (
                                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {key === 'yoyTrends' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Top</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedYoYTopN(Number(e.target.value))} value={selectedYoYTopN}>
                                                {[5, 10, 15, 20,25,30].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedYoYType(e.target.value)} value={selectedYoYType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => (
                                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {key === 'distributionByAssistance' && value && (
                                    <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Top</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartTopN(Number(e.target.value))} value={selectedPieChartTopN}>
                                                {[5, 10, 15, 20,25,30].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartType(e.target.value)} value={selectedPieChartType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => (
                                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedPieChartYear(e.target.value)} value={selectedPieChartYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
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
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}


                                {key === 'comparisonChart' && value && (
                                    <div className="mt-2 grid grid-cols-4 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality 1</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompMunicipality1(e.target.value)} value={compMunicipality1}>
                                                {municipalities.map(m => (
                                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality 2</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompMunicipality2(e.target.value)} value={compMunicipality2}>
                                                {municipalities.map(m => (
                                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assitance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompType(e.target.value)} value={compType}>
                                                <option value="ALL">ALL</option>
                                                {types.map(t => (
                                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Year</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setCompYear(e.target.value)} value={compYear}>
                                                <option value="ALL">ALL YEARS</option>
                                                {years.map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {key === 'municipalityDrilldown' && value && (
                                    <div className="mt-2 pl-6">
                                        <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                            <div>
                                                <p className="text-sm text-gray-400">Municipality</p>
                                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setDrilldownMunicipality(e.target.value)} value={drilldownMunicipality}>
                                                    {municipalities.map(m => (
                                                        <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Year</p>
                                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setDrilldownYear(e.target.value)} value={drilldownYear}>
                                                    <option value="ALL">ALL YEARS</option>
                                                    {years.map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {key === 'topNRanking' && value && (
                                    <div className="mt-2 pl-6">
                                        <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                            <div>
                                                <p className="text-sm text-gray-400">Top N</p>
                                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setTopN(Number(e.target.value))} value={topN}>
                                                    {[5, 10, 15, 20].map(n => (
                                                        <option key={n} value={n}>Top {n}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Municipality</p>
                                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setSelectedMunicipalityRanking(e.target.value)} value={selectedMunicipalityRanking}>
                                                    <option value="ALL">ALL MUNICIPALITIES</option>
                                                    {municipalities.map(m => (
                                                        <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {key === 'forecast' && value && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Municipality</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setForecastMunicipality(e.target.value)} value={forecastMunicipality}>
                                                <option value="ALL">ALL MUNICIPALITIES</option>
                                                {municipalities.map(m => (
                                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Assistance Type</p>
                                            <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" onChange={e => setForecastType(e.target.value)} value={forecastType}>
                                                <option value="ALL">ALL TYPES</option>
                                                {types.map(t => (
                                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                                ))}
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

                {/* Right column — Document Preview */}
                <div className="bg-white p-4 rounded shadow h-full">
                    <p className="font-semibold text-gray-700">Document Preview</p>
                    <p className="text-sm text-gray-400 mb-4">Preview of exported report</p>

                    {/* Header block */}
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

                    {/* Table */}
                    {previewLoading ? (
                        <p className="text-sm text-gray-400 text-center">Loading...</p>
                    ) : previewData.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center">No data found for selected filters.</p>
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

                    <div className="text-sm text-gray-400 mt-2">
                        {sections.dashboardKpi && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white shadow rounded p-4">
                                    <p className="text-sm text-gray-500">Total Requests</p>
                                    <h1 className="text-2xl font-bold text-gray-800">
                                        {kpiPreview ? kpiPreview.total_requests : 'Loading...'}
                                    </h1>
                                </div>

                                <div className="bg-white shadow rounded p-4">
                                    <p className="text-sm text-gray-500">Top Request Type</p>
                                    <h1 className="text-lg font-bold text-gray-800">
                                        {kpiPreview?.top_type?.type_name ?? 'N/A'}
                                    </h1>
                                    <p className="text-sm text-gray-400">
                                        {kpiPreview?.top_type?.total
                                        ? `${kpiPreview.top_type.total} requests`
                                        : ''}
                                    </p>
                                </div>

                                <div className="bg-white shadow rounded p-4">
                                    <p className="text-sm text-gray-500">Top Municipality</p>
                                    <h1 className="text-lg font-bold text-gray-800">
                                        {kpiPreview?.top_municipality?.municipality_name ?? 'N/A'}
                                    </h1>
                                    <p className="text-sm text-gray-400">
                                        {kpiPreview?.top_municipality?.total
                                            ? `${kpiPreview.top_municipality.total} requests`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                        )} 
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                        {sections.yoyTrends && yoyTrendData.length > 0 && (
                        <div className="mt-4">
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
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                        {sections.distributionByAssistance && (
                            <div className="bg-white shadow rounded p-4 mb-6">
                                <p className="font-semibold text-gray-700 mb-1">Distribution by Assistance Type</p>
                                <p className="text-sm text-gray-400 mb-4">Percentage Breakdown</p>
                                <div className="flex gap-2 items-center mb-4">
                                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedPieChartTopN(Number(e.target.value))}>
                                        {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                                    </select>
                                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedPieChartType(e.target.value)}>
                                        <option value="ALL">ALL TYPES</option>
                                        {types.map(t => <option value={t.type_name} key={t.type_id}>{t.type_name}</option>)}
                                    </select>
                                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setSelectedPieChartYear(e.target.value)}>
                                        <option value="ALL">ALL YEARS</option>
                                        {years.map(year => <option key={year}>{year}</option>)}
                                    </select>
                                </div>
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
                    </div>
                </div>

            </div>
        </Layout>
    )
}

export default Export