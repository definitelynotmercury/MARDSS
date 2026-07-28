import LoginLayout from "./LoginLayout"
import { useNavigate } from "react-router-dom"

function PasswordResetError() {
    const navigate = useNavigate()

    return (
        <LoginLayout>
            <div className="bg-[#FFFFFF] flex flex-col items-center p-20">
                <div className="flex items-center gap-3 mb-10 self-start">
                    <img src="/pswdologo.jpg" className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                        <p className="font-bold text-[#16294D] leading-tight">PSWDO</p>
                        <p className="text-gray-500 text-sm leading-tight">Province of Bulacan</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <div className="w-20 h-20 rounded-full border-2 border-red-400 flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-9 h-9 text-red-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>

                    <div className="text-center flex flex-col gap-3">
                        <p className="text-3xl font-bold font-Fraunces">Password Reset Failed</p>
                        <p className="font-Public Sans text-[#64748B]">
                            Hindi na-reset ang iyong password. Maaaring expired na o mali ang code, o naabot na ang maximum na pagsubok. Subukan muli mula sa simula.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/forgotpassword')}
                        className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors"
                    >
                        Try Again
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full text-[#16294D] text-sm font-medium hover:underline"
                    >
                        Back to Log in
                    </button>

                    <div className="flex items-center gap-3 my-2 w-full">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <p className="text-xs text-gray-400 tracking-wide">SECURE ACCESS ONLY</p>
                        <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 w-full">
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-800">Access is limited to authorized PSWDO personnel only.</span> Unauthorized use of this system is prohibited and monitored.
                        </p>
                    </div>
                </div>
            </div>
        </LoginLayout>
    )
}

export default PasswordResetError