function LoginLayout({ children }) {
    const formattedDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
            {/* Left side - branding (same on every auth page) */}
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

            {/* Right side - whatever page content gets passed in */}
            <div className="flex items-center justify-center p-10">
                {children}
            </div>
        </div>
    );
}

export default LoginLayout;