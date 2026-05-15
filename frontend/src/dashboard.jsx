import { useState } from 'react'
import { useEffect } from 'react'
import Layout from './Layout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

function Dashboard() {
    const generateColors = (count) => {
        return Array.from({ length: count }, (_, index) =>
            `hsl(${(index * 360) / count}, 55%, 60%)`
        )
    }
    //filter values
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [kpi, setKpi] = useState(null)

    //filter selected values
    const [selectedYear, setSelectedYear] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')

    //charts
    const[trendData, setTrendData] = useState([])
    const[topN, setTopN] = useState(10)
    const[selectedLineType, setSelectedLineType] = useState('ALL')
    const [topNPie, setTopNPie] = useState(5)
    const[selectedPieAssistanceType, setSelectedPieAssistanceType] = useState('ALL')
    const [barData, setBarData] = useState([])

    //irregularities
    const [irregularities, setIrregularities] = useState([])

    //narrative states
    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    const fetchKpi = async () => {
        const res = await fetch(`http://127.0.0.1:5000/api/dashboard/kpi?year=${selectedYear}&municipality=${selectedMunicipality}&type=${selectedType}`)
        const data = await res.json()
        setKpi(data)

        const res2 = await fetch('http://127.0.0.1:5000/api/dashboard/trend')
        const line_chart_data = await res2.json()
        setTrendData(line_chart_data)

        const res3 = await fetch('http://127.0.0.1:5000/api/dashboard/barchart')
        const bar_chart_data = await res3.json()
        setBarData(bar_chart_data)

    }

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')

        const res = await fetch('http://127.0.0.1:5000/api/dashboard/narrative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kpi: kpi,
                irregularities: irregularities,
                trend: trendData,
                municipalities: barData
            })
        })

        const data = await res.json()
        setNarrative(data.narrative)
        setNarrativeLoading(false)
    }

    useEffect(() => {
        const fetchdata = async() => {
            const response1 = await fetch('http://127.0.0.1:5000/api/municipalities')
            const muni_data = await response1.json()
            setMunicipalities(muni_data)

            const response2 = await fetch('http://127.0.0.1:5000/api/assistance_types')
            const type_data = await response2.json()
            setTypes(type_data)

            const response3 = await fetch('http://127.0.0.1:5000/api/dashboard/irregularities')
            const irregularities_data = await response3.json()
            setIrregularities(irregularities_data)


        }
        fetchdata()
    }, [])

    useEffect(() => {
        fetchKpi()
    }, [selectedYear, selectedMunicipality, selectedType])

    const years = []
    let startYear = 2023
    const currentYear = new Date().getFullYear()

    while (startYear <= currentYear) {
        years.push(startYear)
        startYear++
    }

    const typeNames = types.map(t => t.type_name)

    const typeTotals = typeNames.map(name => ({
        name,
        total: trendData.reduce((sum, year) => sum + (year[name] || 0), 0)
    }))

    typeTotals.sort((a, b) => b.total - a.total)    

    const pieData = typeTotals.map(t => ({ name: t.name, value: t.total }))

    const sortedPieData = [...pieData].sort((a, b) => b.value - a.value)

    const topSlices = sortedPieData.slice(0, topNPie)

    const othersTotal = sortedPieData
        .slice(topNPie)
        .reduce((sum, item) => sum + item.value, 0)

    const finalPieData = othersTotal > 0
        ? [...topSlices, { name: 'Others', value: othersTotal }]
    : topSlices

    const visibleTypes = selectedLineType !== 'ALL'
        ? typeTotals.filter(t => t.name === selectedLineType)
        : typeTotals.slice(0, topN)

    const filteredPieData = selectedPieAssistanceType !== 'ALL'
        ? pieData.filter(p => p.name === selectedPieAssistanceType)
        : finalPieData

    const lineChartColors = generateColors(visibleTypes.length)

    const pieChartColors = generateColors(filteredPieData.length)

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Dashboard</h1>
            <p className="text-sm text-gray-500">Medical assistance request overview – 2023–2026</p>

                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="ALL">ALL YEARS</option>
                    {years.map((year) => (
                        <option key={year}>{year}</option>
                    ))}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedMunicipality(e.target.value)}>
                    <option value="ALL">ALL MUNICIPALITIES</option>
                    {municipalities.map((m) => (
                    <option value={m.municipality_id} key={m.municipality_id}>{m.municipality_name}</option>
                    ))}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedType(e.target.value)} >
                    <option value="ALL">ALL TYPES</option>
                    {types.map((m) =>  (
                        <option value={m.type_id} key={m.type_id}>{m.type_name}</option>
                    ))}
                </select>
                </div>

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
                        {kpi && kpi.top_type ? kpi.top_type.type_name : 'N/A'}
                    </h1>

                    <p className="text-sm text-gray-400">
                        {kpi ? `${kpi.top_type.total} requests` : ''}
                    </p>
                </div>

                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Top Municipality</p>

                    <h1 className="text-lg font-bold text-gray-800">
                        {kpi ? kpi.top_municipality.municipality_name : 'Loading...'}
                    </h1>

                    <p className="text-sm text-gray-400">
                        {kpi ? `${kpi.top_municipality.total} requests` : ''}
                    </p>
                </div>
            </div>
                
            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Irregularities Detected</h2>
                <p>{irregularities.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            )}
                </p>
            </div>

            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Yearly Trend by Assistance Type</p>
                <p className="text-sm text-gray-400 mb-4">Request volume from 2023 to 2025</p>
                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setTopN(Number(e.target.value))}>
                        <option value={10}>TOP 10 TYPES</option>
                        <option value={15}>TOP 15 TYPES</option>
                        <option value={20}>TOP 20 TYPES</option>
                        <option value={25}>TOP 25 TYPES</option>
                        <option value={30}>TOP 30 TYPES</option>
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedLineType(e.target.value)} >
                    <option value="ALL">ALL TYPES</option>
                    {types.map((m) =>  (
                        <option value={m.type_name} key={m.type_id}>{m.type_name}</option>
                    ))}
                </select>

                </div>
                <ResponsiveContainer width="100%" height={600}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year"/>
                        <YAxis />
                        <Tooltip wrapperStyle={{ zIndex: 1000, top: 0 }} />
                        <Legend/>
                        {visibleTypes.map((t, index) => (
                            <Line key={t.name} type="monotone" dataKey={t.name} stroke={lineChartColors[index]} strokeWidth={3} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>

            </div>
            
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Distribution by Assistance Type</p>
                <p className="text-sm text-gray-400 mb-4">Percentage Breakdown</p>
                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setTopNPie(Number(e.target.value))}>
                        <option value={5}>TOP 5 TYPES</option>
                        <option value={10}>TOP 10 TYPES</option>
                        <option value={15}>TOP 15 TYPES</option>
                        <option value={20}>TOP 20 TYPES</option>
                        <option value={25}>TOP 25 TYPES</option>
                        <option value={30}>TOP 30 TYPES</option>
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedPieAssistanceType(e.target.value)} >
                    <option value="ALL">ALL TYPES</option>
                    {types.map((m) =>  (
                        <option value={m.type_name} key={m.type_id}>{m.type_name}</option>
                    ))}
                </select>

                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={filteredPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={100}
                        >   
                            {filteredPieData.map((entry, index) => (
                                <Cell key={index} fill={pieChartColors[index]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Total Requests by Municipality/City</p>
                <p className="text-sm text-gray-400 mb-4">Top Municipality/City by Volume</p>
                <ResponsiveContainer width="100%" height={800}>
                    <BarChart data={barData} layout="vertical" tabIndex={-1}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="municipality_name" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#1e3a5f" stroke="none" tabIndex={-1} />
                        
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Narrative Output</p>

                {!narrative && !narrativeLoading && (
                    <p className="text-sm text-gray-400 mb-4">Click the button to generate an AI-powered narrative based on current dashboard data.</p>
                )}

                {narrativeLoading && (
                    <p className="text-sm text-gray-400">Generating narrative...</p>
                )}

                {narrative && !narrativeLoading && (
                    <p className="text-sm text-gray-700">{narrative}</p>
                )}

                <button
                    onClick={generateNarrative}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm mt-2 hover:bg-blue-700"
                >
                    Generate Narrative
                </button>
            </div>
        </Layout>
    )
}

export default Dashboard