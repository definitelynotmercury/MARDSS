import { useState, useEffect } from 'react'
import Layout from './Layout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Search, Trophy, FileText } from 'lucide-react'
import { useFetcher } from 'react-router-dom'
import {getToken} from './auth'
import { BASE_URL } from './config';

function Analytics() {

    const months = [
    { label: 'Jan', value: 1 },
    { label: 'Feb', value: 2 },
    { label: 'Mar', value: 3 },
    { label: 'Apr', value: 4 },
    { label: 'May', value: 5 },
    { label: 'Jun', value: 6 },
    { label: 'Jul', value: 7 },
    { label: 'Aug', value: 8 },
    { label: 'Sep', value: 9 },
    { label: 'Oct', value: 10 },
    { label: 'Nov', value: 11 },
    { label: 'Dec', value: 12 },
    ]

    // State variables for filters and data for the comparison chart
    const [municipality1, setMunicipality1] = useState('BULAKAN')
    const [municipality2, setMunicipality2] = useState('CALUMPIT')
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedYear, setSelectedYear] = useState('ALL')
    const [comparisonData, setComparisonData] = useState([])
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [showComparisonMonthFilter, setShowComparisonMonthFilter] = useState(false)
    const [comparisonMonth, setComparisonMonth] = useState('ALL')

    useEffect(() => {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
        }
        const fetchdata = async() => {
            const response1 = await fetch(`${BASE_URL}/api/municipalities`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const muni_data = await response1.json()
            setMunicipalities(muni_data)

            const response2 = await fetch(`${BASE_URL}/api/assistance_types`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const type_data = await response2.json()
            setTypes(type_data)

        }
        fetchdata()
    }, [])

    // Function to fetch comparison data based on selected filters
    const fetchComparisonData = async () => {
    const token = getToken()
    const response = await fetch(`${BASE_URL}/api/analytics/comparison?municipality_1=${municipality1}&municipality_2=${municipality2}&type=${selectedType}&year=${selectedYear}&month=${comparisonMonth}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    const data = await response.json()
    setComparisonData(data)
    }

    useEffect(() => {
    fetchComparisonData()
    }, [municipality1, municipality2, selectedType, selectedYear, comparisonMonth])  

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
    const [drill_down_month, setDrillDownMonth] = useState("ALL")
    const [showDrilldownMonthFilter, setShowDrilldownMonthFilter] = useState(false)

    useEffect(() => {
        const fetchDrilldownData = async () => {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/api/analytics/drill_down?municipality=${drill_down_municipality}&year=${drill_down_year}&month=${drill_down_month}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setDrilldownData(data)
        }   
        fetchDrilldownData()
    }, [drill_down_municipality, drill_down_year, drill_down_month])
    
    const maxTotal = Math.max(...drilldown_data.map(d => d.total), 1)

    // States for rankings section
        
    const [availableMonths, setAvailableMonths] = useState([])
    const [rankings, setRankings] = useState([])
    const [topN, setTopN] = useState(5)
    const [selectedMunicipalityRanking, setSelectedMunicipalityRanking] = useState('ALL')
    const [rankingMonth, setRankingMonth] = useState("ALL")

    useEffect(() => {
        const fetchRankings = async () => {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/api/analytics/n_rankings?topN=${topN}&selectedMunicipalityRanking=${selectedMunicipalityRanking}&month=${rankingMonth}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setRankings(data)
        }
        fetchRankings()
    }, [topN, selectedMunicipalityRanking, rankingMonth])

    useEffect(() => {
        const fetchAvailableMonths = async () => {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/api/analytics/available_months`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setAvailableMonths(data)
        }
        fetchAvailableMonths()
    }, [])

    useEffect(() => {
        const fetchLatestMonth = async () => {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/api/analytics/latest_month`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setRankingMonth(data.month)
        }
        fetchLatestMonth()
    }, [])

     // Narrative
    const [narrative, setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    const generateNarrative = async () => {
        const token = getToken()
        setNarrativeLoading(true)
        setNarrative('')
        const res = await fetch(`${BASE_URL}/api/analytics/narrative`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comparisonData, selectedYear,comparisonMonth ,drilldown_data, drill_down_year, drill_down_month, rankings})
        })
        const data = await res.json()
        setNarrative(data.narrative)
        setNarrativeLoading(false)
    }

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700 mb-4">Analytics</h1>

            {/* SIDE-BY-SIDE COMPARISON */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-gray-700">Side-by-side Comparison</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-400 mb-1">FIRST ITEM</span>
                            <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setMunicipality1(e.target.value)} value={municipality1}>
                                {municipalities.map((m) =>  (
                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-400 mb-1">SECOND ITEM</span>
                            <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setMunicipality2(e.target.value)} value={municipality2}>
                                {municipalities.map((m) =>  (
                                    <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-400 mb-1">ASSISTANCE TYPE</span>
                            <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedType(e.target.value)} value={selectedType}>
                                <option value="ALL">ALL</option>
                                {types.map((t) => (
                                    <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-400 mb-1">YEAR</span>
                            <select className="border rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                                const Value = e.target.value
                                setSelectedYear(Value)
                                if (Value === 'ALL') {
                                    setShowComparisonMonthFilter(false)
                                } else {
                                    setShowComparisonMonthFilter(true)
                                }
                            }}>
                                <option value="ALL">ALL YEARS</option>
                                {years.map((year) => (
                                    <option key={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        {showComparisonMonthFilter && (
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-400 mb-1">MONTH</span>
                                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setComparisonMonth(e.target.value)} value={comparisonMonth}>
                                    <option value="ALL">ALL MONTHS</option>
                                    {months.map((month) => (
                                        <option key={month.value} value={month.value}>{month.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">Compare two municipalities or assistance types</p>

                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={comparisonData}  tabIndex={-1} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="type_name" angle={-45} textAnchor="end" interval={0} height={225} tick={{ fontSize: 11 }} />
                        <YAxis type="number" width={50} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey={municipality1} fill="#1e3a5f" stroke="none" tabIndex={-1} radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                        <Bar dataKey={municipality2} fill="#3b82f6" stroke="none" tabIndex={-1} radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* MUNICIPALITY DRILL-DOWN */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-gray-700">Municipality Drill-Down</p>
                    </div>
                    <div className='flex gap-2 items-center'>
                        <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setDrillDownMunicipality(e.target.value)} value={drill_down_municipality}>
                            {municipalities.map((m) =>  (
                                <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                            ))}
                        </select>
                        <select className="border rounded px-2 py-1 text-sm" onChange={(e) =>     
                             {
                                const Value = e.target.value
                                setDrillDownYear(Value)
                                if (Value === 'ALL') {
                                    setShowDrilldownMonthFilter(false)
                                } else {
                                    setShowDrilldownMonthFilter(true)
                                }
                             }} value={drill_down_year}>
                            <option value="ALL">ALL YEARS</option>
                            {years.map((year) => (
                                <option key={year}>{year}</option>
                            ))}
                        </select>
                        {showDrilldownMonthFilter && (
                            <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setDrillDownMonth(e.target.value)} value={drill_down_month}>
                                <option value="ALL">ALL MONTHS</option>
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>{month.label}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">Breakdown by assistance type with mini stat cards</p>

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

            {/* TOP N RANKINGS */}
            <div className="bg-white shadow rounded p-4 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-gray-700">Top N Rankings</p>
                    </div>
                    <div className='flex gap-2 items-center'>
                        <select className="border rounded px-2 py-1 text-sm" onChange={e => setTopN(Number(e.target.value))}>
                            {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>TOP {n} TYPES</option>)}
                        </select>
                        <select className= "border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedMunicipalityRanking(e.target.value)} value={selectedMunicipalityRanking}>
                            <option value="ALL">ALL MUNICIPALITIES</option>
                            {municipalities.map((m) =>  (
                                <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                            ))}
                        </select>
                        <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setRankingMonth(Number(e.target.value))} value={rankingMonth}>
                            {availableMonths.map((m) => (
                                <option key={`${m.year}-${m.month}`} value={m.month}>
                                    {months.find(mo => mo.value === m.month)?.label} {m.year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">Ranked table with badges and inline bar indicators</p>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500 border-b">
                            <th className="pb-3 pr-4">Rank</th>
                            <th className="pb-3 pr-4">Municipality</th>
                            <th className="pb-3 pr-4">
                                {months.find(m => m.value === Number(rankingMonth))?.label} {new Date().getFullYear() - 1}
                            </th>
                            <th className="pb-3 pr-4">
                                {months.find(m => m.value === Number(rankingMonth))?.label} {new Date().getFullYear()}
                            </th>
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

            {/* NARRATIVE OUTPUT */}
            <div className="bg-white shadow rounded p-4 mb-6 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-yellow-600" />
                    <p className="font-semibold text-gray-700">Narrative Output</p>
                </div>
                {!narrative && !narrativeLoading && (
                    <p className="text-sm text-gray-400 mb-4">
                        Click the button to generate an AI-powered narrative based on current dashboard data.
                    </p>
                )}
                {narrativeLoading && <p className="text-sm text-gray-400">Generating narrative...</p>}
                {narrative && !narrativeLoading && <p className="text-sm text-gray-700 mb-4 leading-relaxed">{narrative}</p>}
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