import { useState } from "react";
import { useNavigate } from 'react-router-dom'

function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        const data = await response.json()
        
        if(data.message === 'Login successful'){
            navigate('/dashboard')
        }else{
            alert('Invalid username or password')
        }
    }

    return (
        <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-lg p-10 w-96 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-blue-600 mb-4"></div>
                <h1 className="text-2xl font-bold tracking-widest text-gray-800">MARDSS</h1>
                <p className="text-sm text-gray-500 text-center mt-1">Medical Assistance Request</p>
                <p className="text-sm text-gray-500">Decision Support System</p>
                <p className="text-sm text-gray-500 mb-6">Province of Bulacan, Philippines</p>

                <div className="w-full mb-4">
                    <label className="text-sm text-gray-600">Username</label>
                    <input
                        className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Username"
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="w-full mb-6">
                    <label className="text-sm text-gray-600">Password</label>
                    <input
                        className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Password"
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-800 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Sign In
                </button>

                <p className="text-xs text-gray-400 mt-4 text-center">
                    Access is limited to authorized PSWDO personnel only.
                </p>
            </div>
        </div>
    )
}

export default Login