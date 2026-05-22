import Layout from "./Layout";
import { useState, useEffect } from 'react'

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
        </Layout>
    )
}

export default Forecast