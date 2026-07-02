import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout'

const BASE_URL = 'http://127.0.0.1:5000'

function Admin() {
    const [users, setUsers] = useState([])
    const [showForm, setShowForm] = useState(false)

    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('staff')

    const fetchUsers = async () => {
        const res = await fetch(`${BASE_URL}/api/admin/users`)
        const data = await res.json()
        setUsers(data)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreate = async () => {
        const res = await fetch(`${BASE_URL}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, full_name: fullName, email, password, role })
        })
        const data = await res.json()

        if (res.ok) {
            alert('Account created!')
            setShowForm(false)
            setUsername('')
            setFullName('')
            setEmail('')
            setPassword('')
            setRole('staff')
            fetchUsers()
        } else {
            alert(data.error || data.message)
        }
    }

    const handleDelete = async (userId) => {
        if (!confirm('Are you sure you want to delete this account?')) return

        const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE'
        })
        const data = await res.json()

        if (res.ok) {
            fetchUsers()
        } else {
            alert(data.message)
        }
    }

    return (
        <AdminLayout>
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-700">Manage Accounts</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        {showForm ? 'Cancel' : '+ Create Account'}
                    </button>
                </div>

                {showForm && (
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 border rounded bg-gray-50">
                        <input
                            placeholder="Username"
                            className="border rounded px-3 py-2"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            placeholder="Full Name"
                            className="border rounded px-3 py-2"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                        <input
                            placeholder="Email"
                            className="border rounded px-3 py-2"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            placeholder="Password"
                            type="password"
                            className="border rounded px-3 py-2"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <select
                            className="border rounded px-3 py-2"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button
                            onClick={handleCreate}
                            className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
                        >
                            Save Account
                        </button>
                    </div>
                )}

                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-gray-500">
                            <th className="py-2">Username</th>
                            <th className="py-2">Full Name</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.user_id} className="border-b hover:bg-gray-50">
                                <td className="py-2">{u.username}</td>
                                <td className="py-2">{u.full_name}</td>
                                <td className="py-2">{u.email}</td>
                                <td className="py-2 capitalize">{u.role}</td>
                                <td className="py-2">
                                    <button
                                        onClick={() => handleDelete(u.user_id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    )
}

export default Admin