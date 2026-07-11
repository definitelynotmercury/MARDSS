import { useState, useEffect } from 'react'
import Layout from './Layout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useFetcher } from 'react-router-dom'

function Analytics() {
    // State variables for filters and data for the comparison chart
    const [municipality1, setMunicipality1] = useState('BULAKAN')
    const [municipality2, setMunicipality2] = useState('CALUMPIT')
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedYear, setSelectedYear] = useState('ALL')
    const [comparisonData, setComparisonData] = useState([])
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])

    useEffect(() => {
        const fetchdata = async() => {
            const response1 = await fetch('http://127.0.0.1:5000/api/municipalities')
            const muni_data = await response1.json()
            setMunicipalities(muni_data)

            const response2 = await fetch('http://127.0.0.1:5000/api/assistance_types')
            const type_data = await response2.json()
            setTypes(type_data)

        }
        fetchdata()
    }, [])

    // Function to fetch comparison data based on selected filters
    const fetchComparisonData = async () => {
    const response = await fetch(`http://127.0.0.1:5000/api/analytics/comparison?municipality_1=${municipality1}&municipality_2=${municipality2}&type=${selectedType}&year=${selectedYear}`)
    const data = await response.json()
    setComparisonData(data)
    }

    useEffect(() => {
    fetchComparisonData()
    }, [municipality1, municipality2, selectedType, selectedYear])  

    //script to generate year options from 2023 to current year
    const years = []
    let startYear = 2023
    const currentYear = new Date().getFullYear()

    while (startYear <= currentYear) {
        years.push(startYear)
        startYear++
    }

    //states and functions for drilldown section
    const [drilldown_data, setDrilldownData] = useState([])
    const [drill_down_municipality, setDrillDownMunicipality] = useState('BULAKAN')
    const [drill_down_year, setDrillDownYear] = useState("ALL")  

    useEffect(() => {
        const fetchDrilldownData = async () => {
            const response = await fetch(`http://127.0.0.1:5000/api/analytics/drill_down?municipality=${drill_down_municipality}&year=${drill_down_year}`)
            const data = await response.json()
            setDrilldownData(data)
        }   
        fetchDrilldownData()
    }, [drill_down_municipality, drill_down_year])
    
    const maxTotal = Math.max(...drilldown_data.map(d => d.total), 1)

    // States for rankings section
    const [rankings, setRankings] = useState([])
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')

    useEffect(() => {
        const fetchRankings = async () => {
            const response = await fetch(`http://127.0.0.1:5000/api/analytics/n_rankings?topN=${topN}&selectedMunicipalityRanking=${selectedMunicipalityRanking}`)
            const data = await response.json()
            setRankings(data)
        }
        fetchRankings()
    }, [topN, selectedMunicipalityRanking])

     // Narrative
    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    const generateNarrative = async () => {
        setNarrativeLoading(true)
        setNarrative('')
        const res = await fetch(`http://127.0.0.1:5000/api/analytics/narrative`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comparisonData, drilldown_data, rankings})
        })
        const data = await res.json()
        setNarrative(data.narrative)
        setNarrativeLoading(false)
    }

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700" p-4>Analytics</h1>
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Side-by-side Comparison</p>
                <p className="text-sm text-gray-400 mb-4">Compare two municipalities and single out assistance types</p>
                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setMunicipality1(e.target.value)} value={municipality1}>
                        {municipalities.map((m) =>  (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </select>
                    <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setMunicipality2(e.target.value)} value={municipality2}>
                        {municipalities.map((m) =>  (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </select>
                    <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedType(e.target.value)} value={selectedType}>
                        <option value="ALL">ALL</option>
                        {types.map((t) => (
                            <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                        ))}
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedYear(e.target.value)}>
                        <option value="ALL">ALL YEARS</option>
                        {years.map((year) => (
                            <option key={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={800}>
                    <BarChart data={comparisonData}  tabIndex={-1} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type_name" angle={-45} textAnchor="end" interval={0} height={250}/>
                        <YAxis  type="number" width={150} />
                        <Tooltip />
                        <Bar dataKey={municipality1} fill="#1e3a5f" stroke="none" tabIndex={-1} label ={{ position: 'top' }} label={{ position: 'top', fontSize: 14, fontWeight: 600 }}/>
                        <Bar dataKey={municipality2} fill="#3b82f6" stroke="none" tabIndex={-1} label ={{ position: 'top' }} label={{ position: 'top', fontSize: 14, fontWeight: 600 }}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Municipality Drill-Down</p>
                <p className="text-sm text-gray-400 mb-4">Breakdown by assistance type with mini stat cards</p>
                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">SELECT MUNICIPALITY:</span>
                    <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setDrillDownMunicipality(e.target.value)} value={drill_down_municipality}>
                        {municipalities.map((m) =>  (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setDrillDownYear(e.target.value)} value={drill_down_year}>
                        <option value="ALL">ALL YEARS</option>
                        {years.map((year) => (
                            <option key={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {drilldown_data.map((item) => (
                        <div key={item.type_name} className="bg-gray-100 rounded-lg p-4">
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-gray-600">{item.type_name}</span>
                                <span className="text-gray-800">{item.total.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-gray-300 rounded-full">
                                <div
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ width: `${(item.total / maxTotal) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Top N Rankings</p>
                <p className="text-sm text-gray-400 mb-4">Ranked table with badges and inline bar indicators</p>
                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">Filters:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={e => setTopN(Number(e.target.value))}>
                        {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                    </select>
                    <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedMunicipalityRanking(e.target.value)} value={selectedMunicipalityRanking}>
                        <option value="ALL">ALL MUNICIPALITIES</option>
                        {municipalities.map((m) =>  (
                            <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                        ))}
                    </select>
                </div>
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
                        {rankings.map((item, index) => (
                            <tr key={item.municipality_name} className="border-b hover:bg-gray-50">
                                <td className="py-3 pr-4">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${index === 0 ? 'bg-blue-800' : index === 1 ? 'bg-blue-600' : index === 2 ? 'bg-blue-400' : 'bg-gray-300 text-gray-600'}`}>
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
                                            style={{ width: `${(item.current / Math.max(...rankings.map(r => r.current || 0), 1)) * 100}%` }}
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

export default Analytics