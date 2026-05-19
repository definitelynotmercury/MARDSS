import { useState, useEffect } from 'react'
import Layout from './Layout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Analytics() {
    const [municipality1, setMunicipality1] = useState('BULAKAN')
    const [municipality2, setMunicipality2] = useState('HAGONOY')
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

    const fetchComparisonData = async () => {
    const response = await fetch(`http://127.0.0.1:5000/api/analytics/comparison?municipality_1=${municipality1}&municipality_2=${municipality2}&type=${selectedType}&year=${selectedYear}`)
    const data = await response.json()
    setComparisonData(data)
    }

    useEffect(() => {
    fetchComparisonData()
    }, [municipality1, municipality2, selectedType, selectedYear])  

    const years = []
    let startYear = 2023
    const currentYear = new Date().getFullYear()

    while (startYear < currentYear) {
        years.push(startYear)
        startYear++
    }

    return (
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Analytics</h1>
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
                    <BarChart data={comparisonData}  tabIndex={-1}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type_name" angle={-45} textAnchor="end" interval={0} height={250}/>
                        <YAxis  type="number" width={150} />
                        <Tooltip />
                        <Bar dataKey={municipality1} fill="#1e3a5f" stroke="none" tabIndex={-1} />
                        <Bar dataKey={municipality2} fill="#3b82f6" stroke="none" tabIndex={-1} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Layout>
    )
}

export default Analytics