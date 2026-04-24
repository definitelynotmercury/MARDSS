import { useState } from 'react'
import { useEffect } from 'react'
import Layout from './Layout'

function Dashboard() {
    //filter values
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [kpi, setKpi] = useState(null)

    //filter selected values
    const [selectedYear, setSelectedYear] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [selectedType, setSelectedType] = useState('ALL')

    const fetchkpi = async () => {
        const res = await fetch(`http://127.0.0.1:5000/api/dashboard/kpi?year=${selectedYear}&municipality=${selectedMunicipality}&type=${selectedType}`)
        const data = await res.json()
        setKpi(data)
    }

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
        fetchKpi()
    }, [selectedYear, selectedMunicipality, selectedType])

    const years = []
    let startYear = 2023
    const currentYear = new Date().getFullYear()

    while (startYear <= currentYear) {
        years.push(startYear)
        startYear++
    }

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Dashboard</h1>
            <p className="text-sm text-gray-500">Medical assistance request overview – 2023–2026</p>

                <div className='flex gap-2 items-center mb-4'>
                    <span className="text-sm font-semibold text-gray-500">FILTERS:</span>
                    <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedYear(e.target.value)}>
                    <option>ALL YEARS</option>
                    {years.map((year) => (
                        <option key={year}>{year}</option>
                    ))}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedMunicipality(e.target.value)}>
                    <option>ALL MUNICIPALITIES</option>
                    {municipalities.map((m) => (
                    <option key={m.municipality_id}>{m.municipality_name}</option>
                    ))}
                </select>
                <select className="border rounded px-2 py-1 text-sm" onChange={(e) => setSelectedType(e.target.value)} >
                    <option>ALL TYPES</option>
                    {types.map((m) =>  (
                        <option key={m.type_id}>{m.type_name}</option>
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
                        {kpi ? kpi.top_type.type_name : 'Loading...'}
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
        </Layout>
    )
}

export default Dashboard