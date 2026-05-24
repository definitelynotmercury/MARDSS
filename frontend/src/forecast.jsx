import Layout from "./Layout";
import { useState, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

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
    future_years: [],
    future_predictions: [],
    historical_totals: [],
    historical_years: [],
    lower_bound: [],
    upper_bound: [],
    avg_growth_rate: 0
    })

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

    const lastTotal = forecastData.historical_totals[forecastData.historical_totals.length - 1]

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">{forecastData.future_years[0]} Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.future_predictions[0]}</h1>
                    <p className="text-xs text-gray-500">Range: {forecastData.lower_bound[0]} - {forecastData.upper_bound[0]}</p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">{forecastData.future_years[1]} Requests</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.future_predictions[1]}</h1>
                    <p className="text-xs text-gray-500">Range: {forecastData.lower_bound[1]} - {forecastData.upper_bound[1]}</p>
                </div>
                <div className="bg-white shadow rounded p-4">
                    <p className="text-sm text-gray-500">Avg. Annual Growth Rate</p>
                    <h1 className="text-2xl font-bold text-gray-800">{forecastData.avg_growth_rate.toFixed(2)}%</h1>
                    <p className="text-xs text-gray-500">Based on historical data</p>
                </div>
            </div>

            <div className="bg-white shadow rounded p-4 mb-6">
                <p className="font-semibold text-gray-700 mb-1">Demand Forecast</p>
                <p className="text-sm text-gray-400 mb-4">Historical data (solid line) and projections (dashed line) with confidence range</p>
                <ResponsiveContainer width="100%" height={600}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Line dataKey="historical" stroke="#8884d8" />
                        <Line dataKey="projected" stroke="#82ca9d"/>
                        <Line dataKey="upper" stroke="#ff7300" strokeDasharray="3 3" />
                        <Line dataKey="lower" stroke="#ff7300" strokeDasharray="3 3" />
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
                                <th className="px-4 py-2">Projected Requests</th>
                                <th className="px-4 py-2">Lower Bound</th>
                                <th className="px-4 py-2">Upper Bound</th>
                                <th className="px-4 py-2">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forecastData.historical_years.map((year,i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2">{year}</td>
                                    <td className="px-4 py-2">{forecastData.historical_totals[i]}</td>
                                    <td className="px-4 py-2">-</td>
                                    <td className="px-4 py-2">-</td>
                                    <td className="px-4 py-2">
                                        <span className="bg-gray-200 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                                            Historical
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {forecastData.future_years.map((year, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-4 py-2">{year}</td>
                                    <td className="px-4 py-2">{forecastData.future_predictions[i]}</td>
                                    <td className="px-4 py-2">{forecastData.lower_bound[i]}</td>
                                    <td className="px-4 py-2">{forecastData.upper_bound[i]}</td>
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
        </Layout>
    )
}

export default Forecast