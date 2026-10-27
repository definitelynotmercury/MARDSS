import Layout from "./Layout";
import { getToken } from "./auth";
import { useState, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { TrendingUp, FileText, Trophy } from 'lucide-react'
import { BASE_URL } from './config';
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


function Forecast() {

    const [municipalities, setMunicipalities] = useState([])
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('ALL')
    const [filteredTypes, setFilteredTypes] = useState([])

    const [forecastData, setForecastData] = useState({
    timeline: [],
    forecast: [],
    average_growth_rate: 0
    })

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

    const [rankCategory, setRankCategory] = useState('ALL')
    const [rankMunicipality, setRankMunicipality] = useState('ALL')
    const [rankingData, setRankingData] = useState({ months: [], rankings: [] })

    useEffect(() => {
        const fetchRanking = async () => {
            const token = getToken()
            const res = await fetch(`${BASE_URL}/api/forecast/ranking?category=${rankCategory}&municipality=${encodeURIComponent(rankMunicipality)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setRankingData(await res.json())
        }
        fetchRanking()
    }, [rankCategory, rankMunicipality])

    const maxRankTotal = Math.max(...rankingData.rankings.map(r => r.total), 1)

    //narrative
    const[narrative,setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

    useEffect(() => {
        const token = getToken()
        const fetchdata = async() => {
            const response1 = await fetch(`${BASE_URL}/api/municipalities`,{
                'headers': {
                    'Authorization': `Bearer ${token}`
                }
            })
            const muni_data = await response1.json()
            setMunicipalities(muni_data)

            const response2 = await fetch(`${BASE_URL}/api/category`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setCategories(await response2.json())

        }
        fetchdata()
    }, [])

    useEffect(() => {
        if (selectedCategory === 'ALL') {
            setFilteredTypes([])
            return
        }
        const fetchFilteredTypes = async () => {
            const token = getToken()
            const res = await fetch(`${BASE_URL}/api/filtered_types?category=${selectedCategory}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            setFilteredTypes(await res.json())
        }
        fetchFilteredTypes()
    }, [selectedCategory])

    useEffect(() => {
        const fetchForecastData = async() => {
            const token = getToken()
            const response = await fetch(`${BASE_URL}/api/forecast/predict?municipality=${selectedMunicipality}&category=${selectedCategory}&type=${encodeURIComponent(selectedType)}`,{
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setForecastData(data)
        }
        fetchForecastData()
    }, [selectedMunicipality, selectedCategory, selectedType])

    const generateNarrative = async() => {
        const token = getToken()
        setNarrativeLoading(true)
        const response = await fetch(`${BASE_URL}/api/forecast/narrative`, {
            method: 'POST',
            headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({
                forecastData,
                selectedMunicipality,
                selectedCategory,
                selectedType,
                rankingData,
                rankCategory,
                rankMunicipality
            })
            })
        const data = await response.json()
        setNarrative(data.narrative)
        setNarrativeLoading(false)
        }
    

        const lastTotal = forecastData.timeline[forecastData.timeline.length-1]?.total
        const chartData = [
            ...forecastData.timeline.map((row,i) =>({
                label: row.label,
                total: row.total,
                future_prediction: i === forecastData.timeline.length-1 ? lastTotal :null
            })),
            ...forecastData.forecast.map((row)=>({
                label: row.label,
                future_prediction: row.future_prediction,
                lower : row.lower,
                upper : row.upper
            }))
        ]
        console.log(chartData)
    

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

    return(
        <Layout>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-700">Forecasting</h1>
                <div className="flex gap-3 items-center">
                    <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm"
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value)
                            setSelectedType('ALL')
                        }}>
                        <option value="ALL">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                        ))}
                    </select>

                    {selectedCategory !== 'ALL' && (
                        <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}>
                            <option value="ALL">All Types</option>
                            {filteredTypes.map((t) => (
                                <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                            ))}
                        </select>
                    )}

                    <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm" value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                        <option value="ALL">All Municipalities/Cities</option>
                        {municipalities.map((m) => (
                            <option key={m.municipality_id} value={m.municipality_name}>
                                {m.municipality_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white shadow rounded p-4 border-l-4 border-blue-600">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{forecastData.forecast[0]?.month} {forecastData.forecast[0]?.year} Projection</p>
                    <h1 className="text-2xl font-bold text-gray-800 mt-1">{forecastData.forecast[0]?.future_prediction}</h1>
                    <p className="text-xs text-gray-400 mt-1">Range: {forecastData.forecast[0]?.lower} – {forecastData.forecast[0]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4 border-l-4 border-yellow-500">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{forecastData.forecast[1]?.month} {forecastData.forecast[1]?.year} Projection</p>
                    <h1 className="text-2xl font-bold text-gray-800 mt-1">{forecastData.forecast[1]?.future_prediction}</h1>
                    <p className="text-xs text-gray-400 mt-1">Range: {forecastData.forecast[1]?.lower} – {forecastData.forecast[1]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4 border-l-4 border-blue-600">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{forecastData.forecast[2]?.month} {forecastData.forecast[2]?.year} Projection</p>
                    <h1 className="text-2xl font-bold text-gray-800 mt-1">{forecastData.forecast[2]?.future_prediction}</h1>
                    <p className="text-xs text-gray-400 mt-1">Range: {forecastData.forecast[2]?.lower} – {forecastData.forecast[2]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4 border-l-4 border-blue-800">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg. Monthly Growth Rate</p>
                    <h1 className="text-2xl font-bold text-gray-800 mt-1">+{forecastData.average_growth_rate.toFixed(2)}%</h1>
                    <p className="text-xs text-gray-400 mt-1">Month-over-month </p>
                </div>
            </div>

            <div className="bg-white shadow rounded p-4 mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-gray-700">Demand Forecast</p>
                </div>
                <p className="text-sm text-gray-400 mb-4">Historical data (solid line) and projections (dashed line) with confidence range</p>
                <ResponsiveContainer width="100%" height={600}>
                    <LineChart data={chartData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Line dataKey="total" stroke="#8884d8" strokeWidth={2} dot={false} label={renderEndLabel('historical')} />
                        <Line dataKey="future_prediction"  stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" dot={false} label={renderEndLabel('projected')}/> 
                        <Line dataKey="upper" stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} label={renderEndLabel('upper')}/>
                        <Line dataKey="lower" stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} label={renderEndLabel('lower')} />
                        <Tooltip content={<CustomTooltip />} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white shadow rounded p-4">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-gray-700">Projected Demand Ranking</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <select className="border rounded px-2 py-1 text-sm"
                            value={rankCategory}
                            onChange={(e) => setRankCategory(e.target.value)}>
                            <option value="ALL">ALL CATEGORY</option>
                            {categories.map((c) => (
                                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                            ))}
                        </select>
                        <select className="border rounded px-2 py-1 text-sm"
                            value={rankMunicipality}
                            onChange={(e) => setRankMunicipality(e.target.value)}>
                            <option value="ALL">ALL MUNICIPALITIES</option>
                            {municipalities.map((m) => (
                                <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                    {rankCategory === 'ALL'
                        ? 'Categories ranked by projected requests over the next 3 months'
                        : 'Types in the selected category ranked by projected requests over the next 3 months'}
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="pb-3 pr-4">Rank</th>
                                <th className="pb-3 pr-4">{rankCategory === 'ALL' ? 'Category' : 'Type'}</th>
                                {rankingData.months.map((label) => (
                                    <th key={label} className="pb-3 pr-4">{label}</th>
                                ))}
                                <th className="pb-3 pr-4">Total</th>
                                <th className="pb-3">Volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankingData.rankings.map((item) => (
                                <tr key={item.name} className="border-b hover:bg-gray-50">
                                    <td className="py-3 pr-4">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${item.rank === 1 ? 'bg-blue-800' : item.rank === 2 ? 'bg-blue-600' : item.rank === 3 ? 'bg-blue-400' : 'bg-gray-300 text-gray-600'}`}>
                                            {item.rank}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 font-medium text-gray-700">{item.name}</td>
                                    {item.predictions.map((p, i) => (
                                        <td key={i} className="py-3 pr-4 text-gray-500">{p.toLocaleString()}</td>
                                    ))}
                                    <td className="py-3 pr-4 text-gray-800 font-semibold">{item.total.toLocaleString()}</td>
                                    <td className="py-3 w-40">
                                        <div className="h-2 bg-gray-200 rounded-full">
                                            <div
                                                className="h-2 bg-teal-600 rounded-full"
                                                style={{ width: `${(item.total / maxRankTotal) * 100}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rankingData.rankings.length === 0 && (
                        <p className="text-sm text-gray-400 py-4">No data for this selection.</p>
                    )}
                </div>
            </div>

            <div className="bg-white shadow rounded p-4 mt-6 border-l-4 border-yellow-500">
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

export default Forecast