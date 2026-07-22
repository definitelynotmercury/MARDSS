import Layout from "./Layout";
import { useState, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart } from 'recharts'

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
    const [types, setTypes] = useState([])
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')

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

    //narrative
    const[narrative,setNarrative] = useState('')
    const [narrativeLoading, setNarrativeLoading] = useState(false)

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

    useEffect(() => {
        const fetchForecastData = async() => {
            const response = await fetch(`http://127.0.0.1:5000/api/forecast/predict?municipality=${selectedMunicipality}&type=${selectedType}`)
            const data = await response.json()
            setForecastData(data)
        }
        fetchForecastData()
    }, [selectedMunicipality, selectedType])

    const generateNarrative = async() => {
        setNarrativeLoading(true)
        const response = await fetch('http://127.0.0.1:5000/api/forecast/narrative', {
            method: 'POST',
            headers:{ 'Content-Type': 'application/json'},
            body: JSON.stringify({
                forecastData,
                selectedMunicipality,
                selectedType
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
            <h1 className="text-xl font-bold text-gray-700">Forecasting</h1>

            <div className="flex gap-2 items-center mb-4">
                <span className="text-sm font-semibold text-gray-500">FILTERS:</span>

            <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                <option value="ALL">All Municipalities</option>
                {municipalities.map((m) => (
                    <option key={m.municipality_id} value={m.municipality_name}>
                        {m.municipality_name}
                    </option>
                ))}
            </select>

            <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="ALL">All Assistance Types</option>
                {types.map((t) => (
                            <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                    ))}
            </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">{forecastData.forecast[0]?.month} {forecastData.forecast[0]?.year} Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.forecast[0]?.future_prediction}</h1>
                    <p className="text-xs text-gray-500">Range: {forecastData.forecast[0]?.lower} - {forecastData.forecast[0]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">{forecastData.forecast[1]?.month} {forecastData.forecast[1]?.year} Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.forecast[1]?.future_prediction}</h1>
                    <p className="text-xs text-gray-500">Range: {forecastData.forecast[1]?.lower} - {forecastData.forecast[1]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">{forecastData.forecast[2]?.month} {forecastData.forecast[2]?.year} Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.forecast[2]?.future_prediction}</h1>
                    <p className="text-xs text-gray-500">Range: {forecastData.forecast[3]?.lower} - {forecastData.forecast[3]?.upper}</p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Avg. Annual Growth Rate</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.average_growth_rate.toFixed(2)}%</h1>
                    <p className="text-xs text-gray-500">Based on historical data</p>
                </div>
            </div>

            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Demand Forecast</p>
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
                <p className="font-semibold text-gray-700 mb-1">Forecast Details</p>
                <p className="text-sm text-gray-600">Yearly breakdown with confidence intervals</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="px-4 py-2">Year</th>
                                <th className="px-4 py-2">Month</th>
                                <th className="px-4 py-2">Projected Requests</th>
                                <th className="px-4 py-2">Lower Bound</th>
                                <th className="px-4 py-2">Upper Bound</th>
                                <th className="px-4 py-2">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forecastData.timeline.map((item,i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2">{item.year}</td>
                                    <td className="px-4 py-2">{item.month}</td>
                                    <td className="px-4 py-2">{forecastData.timeline[i]?.total}</td>
                                    <td className="px-4 py-2">-</td>
                                    <td className="px-4 py-2">-</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-gray-200 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                                            Historical
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {forecastData.forecast.map((item, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2">{item.year}</td>
                                    <td className="px-4 py-2">{item.month}</td>
                                    <td className="px-4 py-2">{forecastData.forecast[i]?.future_prediction}</td>
                                    <td className="px-4 py-2">{forecastData.forecast[i]?.lower}</td>
                                    <td className="px-4 py-2">{forecastData.forecast[i]?.upper}</td>
                                    <td className="px-4 py-2" bg-blue-100 >
                                        <span className="bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-sm font-medium">
                                            Projected
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

export default Forecast