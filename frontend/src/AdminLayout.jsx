import { useNavigate, useLocation } from "react-router-dom";
import { Users, Upload, LogOut } from 'lucide-react';

function AdminLayout({ children }) {
    const navigate = useNavigate()
    const location = useLocation()
    const user = JSON.parse(localStorage.getItem('user'))
    const BASE_URL = 'http://127.0.0.1:5000'
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const navItems = [
        { label: 'Manage Accounts', path: '/admin', icon: Users },
        { label: 'Upload Entry', path: '/AdminUploadReport', icon: Upload }
    ]

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/')
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <div className="flex items-center gap-3 bg-gradient-to-r from-[#0B2E52] to-[#1967B8] shadow px-6 py-4 text-white">
                    <img src="/pswdologo.jpg" alt="MARDSS logo" className="h-14 w-14 rounded-full border-2 border-solid border-amber-500" />
                    <div className="flex flex-col gap-1">
                        <div>
                            <span className="font-bold text-lg">MAR</span>
                            <span className="font-bold text-lg text-[#E8B324]">DSS</span>
                        </div>
                        <span className="flex-1 text-center font-semibold">
                            Provincial Social Welfare and Development Office — Admin
                        </span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="relative border border-white/40 rounded-full px-3 py-1 text-white text-lg">
                            {formattedDate}
                        </div>
                        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden mb-3 border-2">
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
                    </div>
                </div>
            {/* Main content */}
            <div className="flex-1 flex">
                {/* Sidebar */}
                <div className="w-48 bg-[#0B2E52] text-white flex flex-col">
                    <nav className="flex flex-col flex-1 px-2 gap-1 mt-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return(
                                <button key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex items-center gap-3 text-left px-4 py-2 rounded text-sm border-l-4 ${
                                    location.pathname === item.path
                                        ? 'bg-blue-950/60 border-amber-500 text-white'
                                        : 'border-transparent text-gray-300 hover:bg-gray-700'
                                }`}
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </button>
                                
                            )
                        }
                            
                        )}
                    </nav>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-gray-400 text-sm px-4 py-2 rounded hover:bg-gray-700 hover:text-white text-left"
                    >
                       <LogOut size={18} />
                        Logout
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default AdminLayout