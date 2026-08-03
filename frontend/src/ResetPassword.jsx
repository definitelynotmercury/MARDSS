import { useState } from "react"
import LoginLayout from "./LoginLayout"
import { useSearchParams,useNavigate } from 'react-router-dom';
import { BASE_URL } from './config';
function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || ''
    const code = searchParams.get('code') || ''
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')


    const handleSubmit = (e) => {
        e.preventDefault() 

        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords don't match.")
            return 
        }

        if (newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters.")
            return
        }

        setPasswordError('')

        sendPassword(e);
    }

    const sendPassword = async(e) => {
        e.preventDefault()
        try{
            const response = await fetch(`${BASE_URL}/api/password-reset`,{
                method :'POST',
                headers : {'Content-Type': 'application/json'},
                body : JSON.stringify({ email, code, newPassword })
            })

            if(!response.ok){
                navigate('/passwordreseterror')
                return
            }

            navigate('/passwordresetsuccess')
        } catch (err){
            console.error("Password reset failed:", err)
            navigate('/passwordreseterror')
        }
    }

    return (
        <LoginLayout>
            <div className="bg-[#FFFFFF] flex flex-col items-center p-20">
                <div className="flex items-center gap-3 mb-10">
                    <img src="/pswdologo.jpg" className="w-20 h-20 rounded-xl object-cover" />
                    <div>
                        <p className="font-bold text-[#16294D] leading-tight">PSWDO</p>
                        <p className="text-gray-500 text-sm leading-tight">Province of Bulacan</p>
                    </div>
                </div>
                <div className="text-center flex flex-col gap-5 ">
                    <p className="text-4xl font-bold font-Fraunces">Reset Password</p>
                    <p className="font-Public Sans text-[#64748B]">Gumawa ng bagong password para sa iyong PSWDO account. Siguraduhing iba ito sa dati mong password at sumusunod sa security requirements.</p>
                </div>
                <form className="flex flex-col gap-4 w-full max-w-sm mt-10" onSubmit={handleSubmit} >
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 pr-10 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showNewPassword ? (
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

                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new Password</label>
                    <div className="relative">
                        <input
                            className="w-full border border-gray-300 rounded px-3 py-2 pr-10 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                if (newPassword !== e.target.value) {
                                    setPasswordError("Passwords don't match.")
                                } else {
                                    setPasswordError('')
                                }
                            }}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? (
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
                        {passwordError && (
                            <p className="text-red-500 text-sm">{passwordError}</p>
                        )}
                    </div>

                    <button className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors" type="submit">Reset Password</button>
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
                </form>
            </div>
        </LoginLayout>
    )
}

export default ResetPassword