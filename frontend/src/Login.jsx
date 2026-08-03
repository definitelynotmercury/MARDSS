import { useState } from "react";
import { useNavigate } from 'react-router-dom'
import LoginLayout from "./LoginLayout";
import { BASE_URL } from './config';
function Login() {
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [isLoggingIn, setIsLoggingIn] = useState(false)

    const handleLogin = async () => {
    setLoginError('')

    if (!username || !password) {
        setLoginError('Please enter both username and password.')
        return
    }

    setIsLoggingIn(true)
    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        const data = await response.json()

            if (data.message === 'Login successful') {
                localStorage.setItem('user', JSON.stringify(data))
                if (data.role === 'admin') {
                    navigate('/admin')
                } else {
                    navigate('/dashboard')
                }
            } else {
                setLoginError(data.message || 'Invalid username or password.')
            }
        } catch (err) {
            console.error('Login failed:', err)
            setLoginError('Network error. Please check your connection and try again.')
        } finally {
            setIsLoggingIn(false)
        }
    }

    return (
        
        <LoginLayout>
            <div className="bg-[#FFFFFF] flex flex-col items-center p-20">
                <div className="flex items-center gap-3 mb-10">
                    <img src="/pswdologo.jpg" className="w-20 h-20 rounded-xl object-cover"/>
                    <div>
                        <p className="font-bold text-[#16294D] leading-tight">PSWDO</p>
                        <p className="text-gray-500 text-sm leading-tight">Province of Bulacan</p>
                    </div>
                </div>
                <div className="text-center flex flex-col gap-5 ">
                    <p className="text-4xl font-bold font-Fraunces">Maligayang Pagbabalik</p>
                    <p className="font-Public Sans text-[#64748B]">Mag-log in gamit ang iyong PSWDO account para ma-access ang MARDSS dashboard.</p>
                </div>
                <div className="flex flex-col gap-5 w-full max-w-sm mt-10">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Username"
                        name="mardss-user-field-x7z"
                        autoComplete="off"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 pr-10 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            name="mardss-pass-field-x7z"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between -mt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#16294D]" />
                            Remember me
                        </label>
                        <a href="/forgotpassword" className="text-sm text-[#16294D] font-medium hover:underline">
                            Forgot Password?
                        </a>
                    </div>
                    
                    {loginError && (
                        <p className="text-red-500 text-sm text-center">{loginError}</p>
                    )}
                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoggingIn ? 'Logging in...' : 'Log in'}
                    </button>

                    <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <p className="text-xs text-gray-400 tracking-wide">SECURE ACCESS ONLY</p>
                        <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4">
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-800">Access is limited to authorized PSWDO personnel only.</span> Unauthorized use of this system is prohibited and monitored.
                        </p>
                    </div>
                </div>
            </div>
        </LoginLayout>
    )
}

export default Login