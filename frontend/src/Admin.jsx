import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout'
import { getToken } from './auth'
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { BASE_URL } from './config';

function isValidEmail(email){
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email)
}

function isValidUsername(username){
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username)
}

function isValidPassword(password){
    if(password.length >= 8 ){
        return true
    } 

    return false
}

function Admin() {
    const [users, setUsers] = useState([])
    const [showForm, setShowForm] = useState(false)

    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('staff')

    const [showEditForm, setShowEditForm] = useState(false)
    const [editUserId, setEditUserId] = useState(null)
    const [editUsername, setEditUsername] = useState('')
    const [editFullName, setEditFullName] = useState('')
    const [editEmail, setEditEmail] = useState('')
    const [editRole, setEditRole] = useState('staff')
    const [editPictureFile, setEditPictureFile] = useState(null)
    const [editPicturePreview, setEditPicturePreview] = useState(null)

    const [showPassword, setShowPassword] = useState(false)

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type })
    }

    const [deleteTargetId, setDeleteTargetId] = useState(null)

    const openEditForm = (u) => {
        setEditUserId(u.user_id)
        setEditUsername(u.username)
        setEditFullName(u.full_name)
        setEditEmail(u.email)
        setEditRole(u.role)
        setEditPictureFile(null)
        setEditPicturePreview(u.profile_picture ? `${BASE_URL}/${u.profile_picture}` : null)
        setShowEditForm(true)
    }

    const fetchUsers = async () => {
        const token = getToken()
        const res = await fetch(`${BASE_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        const data = await res.json()
        setUsers(data)
    }

    const handleEditPictureChange = (file) => {
        if (!file) return
        setEditPictureFile(file)
        setEditPicturePreview(URL.createObjectURL(file))
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null
        return new Date(dateStr).toLocaleString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    const handleCreate = async () => {
        const token = getToken()


        if (!isValidUsername(username)){
            showNotification("Invalid username. Must be 3-20 characters long", 'error')
            return
        }

        if (!isValidEmail(email)){
            showNotification("Must be a valid email address (e.g. name@example.com)", 'error')
            return
        }

        if (!isValidPassword(password)){
            showNotification("Invalid password. must be longer than 8 characters", 'error')
            return
        }


        const res = await fetch(`${BASE_URL}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ username, full_name: fullName, email, password, role })
        })
        const data = await res.json()


        if (res.ok) {
            setShowForm(false)
            setUsername('')
            setFullName('')
            setEmail('')
            setPassword('')
            setRole('staff')
            fetchUsers()
            showNotification('Account created!', 'success')
        } else {
            showNotification(data.error || data.message, 'error')
        }
    }

    const requestDelete = (userId) => {
        setDeleteTargetId(userId)
    }

    const confirmDelete = async () => {
        const token = getToken()
        const userId = deleteTargetId
        setDeleteTargetId(null)

        const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()

        if (res.ok) {
            fetchUsers()
            showNotification('Account deleted successfully!', 'success')
        } else {
            showNotification(data.message, 'error')
        }
    }

    const handleSaveEdit = async () => {
        const token = getToken()

        if (!isValidUsername(editUsername)){
            showNotification("Invalid username. Must be 3-20 characters long", 'error')
            return
        }

        if (!isValidEmail(editEmail)){
            showNotification("Must be a valid email address (e.g. name@example.com)", 'error')
            return
        }

        const res = await fetch(`${BASE_URL}/api/admin/users/${editUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: editUsername,
                full_name: editFullName,
                email: editEmail,
                role: editRole
            })
        })
        const data = await res.json()

        if (!res.ok) {
            showNotification(data.error || data.message, 'error')
            return
        }

        if (editPictureFile) {
            const formData = new FormData()
            formData.append('user_id', editUserId)
            formData.append('profile_picture', editPictureFile)

            const picRes = await fetch(`${BASE_URL}/api/admin/users/${editUserId}/picture`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            const picData = await picRes.json()

            if (!picRes.ok) {
                showNotification(picData.message, 'error')
                return
            }
        }

        setShowEditForm(false)
        fetchUsers()
        showNotification('Account updated!', 'success')
    }



    return (
        <AdminLayout>
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-700">Manage Accounts</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        + Create Account
                    </button>
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-700">Create Account</h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mb-6 p-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                                    <input
                                        placeholder="Username"
                                        className="border rounded px-3 py-2 w-full"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                                    <input
                                        placeholder="Full Name"
                                        className="border rounded px-3 py-2 w-full"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                    <input
                                        placeholder="Email"
                                        className="border rounded px-3 py-2 w-full"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            placeholder="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            className="border rounded px-3 py-2 w-full pr-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                                    <select
                                        className="border rounded px-3 py-2 w-full"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleCreate}
                                    className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
                                >
                                    Save Account
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {showEditForm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-700">Edit Account</h2>
                                <button
                                    onClick={() => setShowEditForm(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-4">
                                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mb-2 border-2 border-gray-300">
                                    {editPicturePreview ? (
                                        <img
                                            src={editPicturePreview}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                                            👤
                                        </div>
                                    )}
                                </div>
                                <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                                    Change Photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleEditPictureChange(e.target.files[0])}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mb-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                                    <input
                                        placeholder="Username"
                                        className="border rounded px-3 py-2 w-full"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                                    <input
                                        placeholder="Full Name"
                                        className="border rounded px-3 py-2 w-full"
                                        value={editFullName}
                                        onChange={(e) => setEditFullName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                    <input
                                        placeholder="Email"
                                        className="border rounded px-3 py-2 w-full"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                                    <select
                                        className="border rounded px-3 py-2 w-full"
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleSaveEdit}
                                    className="bg-blue-800 text-white rounded px-4 py-2 hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete confirm modal */}
                {deleteTargetId !== null && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                            <h2 className="text-lg font-bold text-gray-700 mb-2">Delete Account</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete this account? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteTargetId(null)}
                                    className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notification modal */}
                {notification.show && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
                            <div className={`text-3xl mb-2 ${notification.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                {notification.type === 'error' ? '⚠️' : '✅'}
                            </div>
                            <p className="text-sm text-gray-700 mb-6">{notification.message}</p>
                            <button
                                onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                                className="w-full px-4 py-2 rounded bg-blue-800 text-white hover:bg-blue-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-gray-500">
                            <th className="py-2"></th>
                            <th className="py-2">Username</th>
                            <th className="py-2">Full Name</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Created</th>
                            <th className="py-2">Last Edited</th>
                            <th className="py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.user_id} className="border-b hover:bg-gray-50">
                                <td className="py-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                        {u.profile_picture ? (
                                            <img
                                                src={`${BASE_URL}/${u.profile_picture}`}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                                👤
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="py-2">{u.username}</td>
                                <td className="py-2">{u.full_name}</td>
                                <td className="py-2">{u.email}</td>
                                <td className="py-2 capitalize">{u.role}</td>
                                <td className="py-2 text-xs text-gray-500">
                                    <div>{formatDateTime(u.created_at)}</div>
                                    {u.created_by_name && <div className="text-gray-400">by {u.created_by_name}</div>}
                                </td>
                                <td className="py-2 text-xs text-gray-500">
                                    {u.updated_by_name ? (
                                        <>
                                            <div>{formatDateTime(u.updated_at)}</div>
                                            <div className="text-gray-400">by {u.updated_by_name}</div>
                                        </>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="py-2">
                                    <div className="flex">
                                        <button
                                            onClick={() => openEditForm(u)}
                                            className=" w-full flex items-center gap-1 text-blue-600 hover:underline mr-3"
                                        >
                                            <Pencil size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => requestDelete(u.user_id)}
                                            className="w-full flex items-center gap-1 text-red-600 hover:underline"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
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