import Layout from "./Layout";
import { useState, useEffect } from "react";

function Export(){
    const [selectedYearFrom, setSelectedYearFrom] = useState(2023)
    const [selectedYearTo, setSelectedYearTo] = useState(2023)
    const [selectedType, setSelectedType] = useState('ALL')
    const [selectedMunicipality, setSelectedMunicipality] = useState('ALL')
    const [municipalities, setMunicipalities] = useState([])
    const [types, setTypes] = useState([])
    const [sections, setSections] = useState({
    dashboardKpi: false,
    yoyTrends: false,
    distributionByAssistance: false,
    distributionByMunicipality: false,
    comparisonChart: false,
    municipalityDrilldown: false,
    topNRanking: false,
    forecast: false,
    })
    const sectionLabels = {
    dashboardKpi: 'Dashboard Summary',
    yoyTrends: 'YoY Trend Analysis',
    distributionByAssistance: 'Distribution by Assistance Type',
    distributionByMunicipality: 'Distribution by Municipality',
    comparisonChart: 'Comparison Chart',
    municipalityDrilldown: 'Municipality Drilldown',
    topNRanking: 'Top N Rankings',
    forecast: 'Demand Forecast',
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



    const years = []
        let y = 2023
        while (y < new Date().getFullYear()) years.push(y++)
    return(
        <Layout>
            <h1 className="text-xl font-bold text-gray-700">Export</h1>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded shadow">
                    <p className="font-semibold text-gray-700">Export Options</p>
                    <p className="text-sm text-gray-400 mb-4">Configure your export</p>
                    <h1 className="text-xl font-bold text-gray-700">Year Range</h1>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-400">From</p>
                            <select className="w-full border border-gray-300 rounded p-2 mt-2" onChange={e => setSelectedYearFrom(e.target.value)} value={selectedYearFrom}>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">To</p>
                            <select className="w-full border border-gray-300 rounded p-2 mt-2" onChange={e => setSelectedYearTo(e.target.value)} value={selectedYearTo}>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <p className="font-semibold text-gray-700">Assistance type</p>
                        <p className="font-semibold text-gray-700">Municipality/City</p>
                        <select className="w-full border border-gray-300 rounded p-2 mt-2" onChange={e => setSelectedType(e.target.value)} value={selectedType}>
                            <option value="ALL">ALL</option>
                            {
                                types.map(type => (
                                    <option key={type.type_id} value={type.type_name}>{type.type_name}</option>
                                ))
                            }
                        </select>
                        <select className="w-full border border-gray-300 rounded p-2 mt-2" onChange={e => setSelectedMunicipality(e.target.value)} value={selectedMunicipality}>
                            <option value="ALL">ALL</option>
                            {
                                municipalities.map(municipality => (
                                    <option key={municipality.municipality_id} value={municipality.municipality_name}>{municipality.municipality_name}</option>
                                ))
                            }
                        </select>

                    </div>
                    <div className="mt-4">
                        <p className="font-semibold text-gray-700 mb-2">Sections to include</p>
                        {Object.entries(sections).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 mb-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id={key}
                                    checked={value}
                                    onChange={() => setSections(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                                <label htmlFor={key} className="text-base text-gray-600 cursor-pointer">{sectionLabels[key]}</label>
                            </div>
                        ))}
                        {sections.comparisonChart && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-sm text-gray-400">Municipality 1</p>
                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
                                    {municipalities.map(m => (
                                        <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Municipality 2</p>
                                <select className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
                                    {municipalities.map(m => (
                                        <option key={m.municipality_id} value={m.municipality_name}>{m.municipality_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Export PDF</button>
                        <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">Export Excel</button>
                    </div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-gray-700">Document Preview</p>
                        <p className="text-sm text-gray-400 mb-4">Preview of exported report</p>
                        <div className="border rounded p-6 text-center mb-4">
                            <h1 className="text-xl font-bold text-gray-800">MARDSS REPORT</h1>
                            <p className="text-sm text-gray-500">Medical Assistance Request Decision Support System</p>
                            <p className="text-sm text-gray-500">Province of Bulacan - PSWDO</p>
                            <p className="text-sm text-gray-500">Period: {selectedYearFrom} - {selectedYearTo}</p>
                            <p className="text-sm text-gray-500">
                                Municipality: {selectedMunicipality === 'ALL' ? 'All Municipalities' : selectedMunicipality}
                            </p>
                            <p className="text-sm text-gray-500">
                                Assistance Type: {selectedType === 'ALL' ? 'All Types' : selectedType}
                            </p>
                        </div>
                </div>
            </div>
            
        </Layout>
    )
}

export default Export