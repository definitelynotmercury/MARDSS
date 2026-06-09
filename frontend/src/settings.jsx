import { useState } from 'react'
import Layout from './Layout'

const BASE_URL = 'http://127.0.0.1:5000'

function Settings() {
    const user = JSON.parse(localStorage.getItem('user'))

    const [fullName, setFullName] = useState(user?.full_name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [username, setUsername] = useState(user?.username || '')

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handlePictureUpload = async (file) => {
    if (!file) return

    const formData = new FormData()
    formData.append('user_id', user.user_id)
    formData.append('profile_picture', file)

    const response = await fetch(`${BASE_URL}/api/settings/upload-picture`, {
            method: 'POST',
            body: formData
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
    // update profile info
    const profileRes = await fetch(`${BASE_URL}/api/settings/update_profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.user_id,
            full_name: fullName,
            email: email,
            username: username
        })
    })

    // only change password if fields are filled
    if (currentPassword && newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match')
            return
        }

        const passRes = await fetch(`${BASE_URL}/api/settings/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.user_id,
                current_password: currentPassword,
                new_password: newPassword
            })
        })
        const passData = await passRes.json()
        if (!passRes.ok) {
            alert(passData.message)
            return
        }
    }

    if (profileRes.ok) {
        // update localStorage with new info
        const updatedUser = { ...user, full_name: fullName, email: email, username: username }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        alert('Settings saved successfully!')
        window.location.reload()
    }
}

    return (
        <Layout>
            <div className="w-full bg-white rounded-xl shadow p-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-6">Personal Information</h2>
                {/* Profile Picture */}
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
                {/* Personal Information */}
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

                {/* Divider */}
                <hr className="mb-6" />

                {/* Account Settings */}
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Settings</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <label className="text-sm text-gray-600">Current Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">New Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Confirm New Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={() => window.history.back()} className="px-6 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-blue-800 text-white hover:bg-blue-700">Save</button>
                </div>
            </div>
        </Layout>
    )
}

export default Settings