import LoginLayout from "./LoginLayout"

function VerifyCode(){

    const [code, setCode] = useState(['','','','','',''])
    const inputRefs = useRef([])
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
                    <p className="text-4xl font-bold font-Fraunces">Enter Verification Code</p>
                    <p className="font-Public Sans text-[#64748B]">Nagpadala kami ng 6-digit verification code sa iyong registered PSWDO email address. Ilagay ang code sa ibaba upang ma-verify ang iyong account at magpatuloy sa pag-reset ng password.</p>
                </div>
            </div>
        </LoginLayout>
    )
}

export default VerifyCode