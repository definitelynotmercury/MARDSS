import { useState } from 'react'
import AdminLayout from './AdminLayout'

const BASE_URL = 'http://127.0.0.1:5000'

function AdminUploadReport() {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)

    const handleFileChange = (e) => {
        setFile(e.target.files[0])
        setResult(null)
    }

    const handleUpload = async () => {
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
                body: formData
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
            <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
                <h1 className="text-xl font-bold text-gray-700 mb-4">Upload Monthly Report</h1>
                <p className="text-sm text-gray-500 mb-4">
                    Upload a .xlsx file with one sheet per month (e.g. "JANUARY 2025").
                    Uploading will replace any existing data for the months found in the file.
                </p>

                <div className="flex items-center gap-3 mb-4">
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
        </AdminLayout>
    )
}

export default AdminUploadReport
