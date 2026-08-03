import { useState } from "react"
import { useNavigate } from 'react-router-dom'
import LoginLayout from "./LoginLayout"
import { BASE_URL } from './config';
function ForgotPassword (){
    const navigate = useNavigate() 
    const [email,setEmail] = useState('')

    const sendEmail = async(e) => {
        e.preventDefault() 
        try {
            const response = await fetch(`${BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.message === 'Code has been sent in your email') {
                navigate(`/verifycode?email=${encodeURIComponent(email)}`);
            }
        } catch (err) {
            console.error("Failed to send email:", err);
        }
    }

    return(
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
                    <p className="text-4xl font-bold font-Fraunces">Forgot Password?</p>
                    <p className="font-Public Sans text-[#64748B]">Huwag mag-alala. Ilagay ang iyong registered PSWDO email address at magpapadala kami ng verification code para ma-reset ang iyong password.</p>
                </div>
                <form onSubmit={sendEmail} className="flex flex-col gap-5 w-full max-w-sm mt-10">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Get code via email</label>
                    <input className=" w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" placeholder="example@gmail.com" value={email} onChange={(e)=> setEmail(e.target.value) } required></input>
                    <button className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors" type="submit">Send Verification Code</button>
                    <div className="flex items-center justify-between -mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remember your password?</label>
                        <a href="/" className="text-sm text-[#16294D] font-medium hover:underline">
                            Back to Log in
                        </a>
                    </div>
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

export default ForgotPassword