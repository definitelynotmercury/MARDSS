import LoginLayout from "./LoginLayout"
import { useState, useEffect } from "react"
import { useRef } from "react"
import { useSearchParams, useNavigate } from 'react-router-dom';

function VerifyCode() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get('email') || '';
    const [code, setCode] = useState(['', '', '', '', '', ''])
    const inputRefs = useRef([])
    const [cooldown, setCooldown] = useState(120)
    const [error, setError] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const resendCode = async (e) => {
        e.preventDefault()
        setIsResending(true)
        setError('')
        try {
            const response = await fetch('http://127.0.0.1:5000/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || 'Failed to resend code. Please try again.');
                return;
            }

            setCode(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
            setCooldown(120);
        } catch (err) {
            console.error("Failed to send email:", err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsResending(false)
        }
    }

    const verifyCode = async (e) => {
        e.preventDefault()
        setError('')

        const flatCode = code.join('')
        if (flatCode.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }

        setIsVerifying(true)
        try {
            const response = await fetch('http://127.0.0.1:5000/api/is-valid-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, flatCode })
            })

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Invalid or expired code.');
                setCode(['', '', '', '', '', ''])
                inputRefs.current[0]?.focus()
                return;
            }

            navigate(`/resetpassword?email=${encodeURIComponent(email)}&code=${flatCode}`);
        } catch (err) {
            console.error("Failed to verify code:", err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsVerifying(false)
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
                    <p className="text-4xl font-bold font-Fraunces">Enter Verification Code</p>
                    <p className="font-Public Sans text-[#64748B]">Nagpadala kami ng 6-digit verification code sa iyong registered PSWDO email address. Ilagay ang code sa ibaba upang ma-verify ang iyong account at magpatuloy sa pag-reset ng password.</p>
                </div>
                <div className="w-full max-w-sm mt-10">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Enter 6-digit code</label>
                    <div className="flex gap-2 justify-center">
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => inputRefs.current[i] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                className={`w-12 h-14 text-center text-xl font-bold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}
                                onChange={(e) => {
                                    const newCode = [...code]
                                    if (e.target.value !== '' && isNaN(e.target.value)) return
                                    newCode[i] = e.target.value
                                    setCode(newCode)
                                    if (error) setError('')

                                    if (e.target.value !== '' && i < 5) {
                                        inputRefs.current[i + 1].focus()
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && code[i] === '' && i > 0) {
                                        inputRefs.current[i - 1].focus()
                                    }
                                    if (e.key === 'Enter') {
                                        verifyCode(e);
                                    }
                                }}
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center mt-3">{error}</p>
                    )}

                    <div className="flex flex-col mt-4 gap-4" >
                        <button
                            className="w-full bg-[#16294D] text-white rounded-lg py-3 font-medium hover:bg-[#1e3562] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={verifyCode}
                            disabled={isVerifying}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <div className="flex items-center justify-between -mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Didn't receive the code?</label>
                            <button
                                className="text-sm text-[#16294D] font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
                                onClick={resendCode}
                                disabled={cooldown > 0 || isResending}
                            >
                                {isResending ? 'Sending...' : cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
                            </button>
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
                    </div>

                </div>
            </div>
        </LoginLayout>
    )
}

export default VerifyCode