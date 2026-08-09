import { useState } from 'react'
import AdminLayout from './AdminLayout'
import { getToken } from './auth'
import { BASE_URL } from './config';
import { Eye, EyeOff } from 'lucide-react'

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

function AdminSettings() {
    const user = JSON.parse(localStorage.getItem('user'))

    const [fullName, setFullName] = useState(user?.full_name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [username, setUsername] = useState(user?.username || '')

    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type })
    }

    const handlePictureUpload = async (file) => {
        const token = getToken()
        if (!file) return

        const formData = new FormData()
        formData.append('user_id', user.user_id)
        formData.append('profile_picture', file)

        const response = await fetch(`${BASE_URL}/api/settings/upload-picture`, {
            method: 'POST',
            body: formData,
            headers: { "Authorization": `Bearer ${token}` }
        })
        const data = await response.json()

        if (response.ok) {
            const updatedUser = { ...user, profile_picture: data.profile_picture }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            alert('Profile picture updated!')
        } else {
            alert(data.message)
        }
    }

    const handleSave = async () => {
        const token = getToken()

        if (!isValidUsername(username)){
            showNotification("Invalid username. Must be 3-20 characters long", 'error')
            return
        }

        if (!isValidEmail(email)){
            showNotification("Must be a valid email address (e.g. name@example.com)", 'error')
            return
        }

        const profileRes = await fetch(`${BASE_URL}/api/settings/update_profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                user_id: user.user_id,
                full_name: fullName,
                email: email,
                username: username
            })
        })

        if (currentPassword && newPassword && confirmPassword) {
            if (!isValidPassword(newPassword)){
                showNotification("Invalid password. must be longer than 8 characters", 'error')
                return
            }

            if (newPassword !== confirmPassword) {
                showNotification("New passwords do not match", 'error')
                return
            }

            const passRes = await fetch(`${BASE_URL}/api/settings/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            })

            const passData = await passRes.json()
            if (!passRes.ok) {
                showNotification(passData.message, 'error')
                return
            }
        }

        if (profileRes.ok) {
            const updatedUser = { ...user, full_name: fullName, email: email, username: username }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            showNotification('Settings saved successfully!', 'success')
        }
    }

    return (
        <AdminLayout>
            <div className="w-full bg-white rounded-xl shadow p-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-6">Personal Information</h2>
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-3 border-2 border-gray-300">
                        {user?.profile_picture ? (
                            <img
                                src={`${BASE_URL}/${user.profile_picture}`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
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
                            onChange={(e) => handlePictureUpload(e.target.files[0])}
                        />
                    </label>
                </div>

                {notification.show && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
                            <div className={`text-3xl mb-2 ${notification.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                {notification.type === 'error' ? '⚠️' : '✅'}
                            </div>
                            <p className="text-sm text-gray-700 mb-6">{notification.message}</p>
                            <button
                                onClick={() => {
                                    const wasSuccess = notification.type === 'success'
                                    setNotification({ show: false, message: '', type: 'success' })
                                    if (wasSuccess) window.location.reload()
                                }}
                                className="w-full px-4 py-2 rounded bg-blue-800 text-white hover:bg-blue-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <label className="text-sm text-gray-600">Full Name</label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Username</label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Email Address</label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Position/Role</label>
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 bg-gray-100 cursor-not-allowed"
                            value={user?.role || ''}
                            disabled
                        />
                    </div>
                </div>

                <hr className="mb-6" />

                <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Settings</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <label className="text-sm text-gray-600">Current Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">New Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Confirm New Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={() => window.history.back()} className="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-blue-800 text-white hover:bg-blue-700">Save</button>
                </div>
            </div>
        </AdminLayout>
    )
}

export default AdminSettings