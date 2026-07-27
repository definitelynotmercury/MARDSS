import { useState } from "react";
import { useNavigate } from 'react-router-dom'

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

    const handleLogin = async () => {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        const data = await response.json()
        
        if(data.message === 'Login successful'){
            localStorage.setItem('user', JSON.stringify(data))


            if (data.role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/dashboard')
            }
        }else{
            alert('Invalid username or password')
        }
    }

    return (
    <div className="grid grid-cols-2 min-h-screen">
        <div className="p-10 relative flex flex-col justify-between min-h-screen">
            <img src="/capitol.jpg" className="absolute inset-0 w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-[#16294D] opacity-80"></div>

            <div className="relative flex flex-col gap-10">
                <div className="relative flex justify-between items-center">
                    <p className="text-[#E8B324] text-lg font-semibold tracking-wide font-Public Sans">
                        PROVINCIAL GOVERNMENT OF BULACAN
                    </p>
                    <div className="relative border border-white/40 rounded-full px-3 py-1 text-white text-lg">
                        {formattedDate}
                    </div>
                </div>

                <div className="relative flex flex-col text-center mt-16">
                    <img src="/pswdologo.jpg" className="w-48 h-48 rounded-full border-2 border-[#C89B3C] object-cover mb-12"/>
                </div>

                <p className="text-[#E8B324] text-lg font-semibold tracking-wide font-Public Sans">
                    PROVINCIAL SOCIAL WELFARE & DEVELOPMENT OFFICE
                </p>

                <p className="text-[#FFFFFF] text-6xl font-semibold tracking-wide font-Fraunces">
                    MARDSS
                </p>
                <p className="text-[#FFFFFF] text-sm font-semibold tracking-wide font-Fraunces">
                    Medical Assistance Request Decision Support System — sinusuri, sinusundan, at pinapabilis ang serbisyo medikal sa 24 na munisipalidad ng Bulacan.
                </p>

                <div className="border-l-4 border-[#E8B324] pl-4">
                    <p className="text-[#FFFFFF] text-2xl font-semibold tracking-wide font-Fraunces">
                        "Tamang Datos, Mabilis na Tulong."
                    </p>
                </div>
            </div>

            <p className="relative text-white/60 text-xs">
                © 2026 PSWDO Bulacan. All rights reserved.
            </p>
        </div>
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
                <input
                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Password"
                    type="password"
                    name="mardss-pass-field-x7z"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="flex items-center justify-between -mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#16294D]" />
                        Remember me
                    </label>
                    <a href="#" className="text-sm text-[#16294D] font-medium hover:underline">
                        Forgot Password?
                    </a>
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors"
                >
                    Log in
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
    </div>
    )
}

export default Login