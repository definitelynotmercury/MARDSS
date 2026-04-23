import { useState } from 'react'
import { useEffect } from 'react'
import Layout from './Layout'

function Dashboard() {
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
                <select className="border rounded px-2 py-1 text-sm">
                <option>ALL YEARS</option>
                {years.map((year) => (
                    <option key={year}>{year}</option>
                ))}
            </select>
            <select className="border rounded px-2 py-1 text-sm">
                <option>ALL MUNICIPALITIES</option>
                {municipalities.map((m) => (
                <option key={m.municipality_id}>{m.municipality_name}</option>
                ))}
            </select>
            <select className="border rounded px-2 py-1 text-sm">
                <option>ALL TYPES</option>
                {types.map((m) =>  (
                    <option key={m.type_id}>{m.type_name}</option>
                ))}
            </select>
            </div>
        </Layout>
    )
}

export default Dashboard