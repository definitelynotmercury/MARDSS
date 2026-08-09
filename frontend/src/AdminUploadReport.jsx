import { useState } from 'react'
import AdminLayout from './AdminLayout'
import { getToken } from './auth'
import { BASE_URL } from './config';
import AdminManualEntry from './AdminManualEntry'

function AdminUploadReport() {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)

    const handleFileChange = (e) => {
        setFile(e.target.files[0])
        setResult(null)
    }

    const handleUpload = async () => {
        const token = getToken()
        if (!file) {
            alert('Please select a .xlsx file first')
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        setUploading(true)
        setResult(null)

        try {
            const res = await fetch(`${BASE_URL}/api/admin/upload-monthly-report`, {
                method: 'POST',
                body: formData,
                headers : {
                    'Authorization' : `Bearer ${token}`
                }
            })
            const data = await res.json()

            if (res.ok) {
                setResult({ success: true, data })
            } else {
                setResult({ success: false, error: data.error || 'Upload failed' })
            }
        } catch (err) {
            setResult({ success: false, error: 'Could not reach the server' })
        } finally {
            setUploading(false)
        }
    }

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <div className="bg-white rounded-xl shadow p-6 flex flex-col">
                        <h1 className="text-xl font-bold text-gray-700 mb-4">Upload Monthly Report</h1>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload a .xlsx file with one sheet per month (e.g. "JANUARY 2025").
                            Uploading will replace any existing data for the months found in the file.
                        </p>

                        <div className="flex items-center gap-3 mb-4 mt-auto">
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                className="border rounded px-3 py-2 text-sm"
                            />
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>

                        {result && result.success && (
                            <div className="border border-green-300 bg-green-50 rounded p-4 text-sm">
                                <p className="text-green-700 font-semibold mb-2">
                                    {result.data.message} — {result.data.rows_inserted} rows inserted
                                </p>
                                <p className="text-gray-600 mb-1">
                                    Months replaced: {result.data.months_replaced.join(', ')}
                                </p>
                                {result.data.warnings && result.data.warnings.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-yellow-700 font-medium">Warnings:</p>
                                        <ul className="list-disc list-inside text-yellow-700">
                                            {result.data.warnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {result && !result.success && (
                            <div className="border border-red-300 bg-red-50 rounded p-4 text-sm text-red-700">
                                {result.error}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Report Format</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Not sure how the file should be structured? Download the template
                            below and fill it in before uploading.
                        </p>
                        <div className="mt-auto">
                            
                                href="/format-template.xlsx"
                                download
                                className="inline-block bg-white border border-blue-800 text-blue-800 px-4 py-2 rounded hover:bg-blue-50 font-medium"
                            >
                                Download Template (.xlsx)
                            </a>
                        </div>
                    </div>
                </div>

                <AdminManualEntry />

            </div>
        </AdminLayout>
    )
}

export default AdminUploadReport