import { useNavigate,useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  FileOutput,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';

function Layout({children}){
    const navigate = useNavigate()
    const location = useLocation()
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', path: '/analytics', icon: BarChart2 },
        { label: 'Forecast', path: '/forecast', icon: TrendingUp },
        { label: 'Export', path: '/export', icon: FileOutput },
    ];

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Topbar */}
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#0B2E52] to-[#1967B8] shadow px-6 py-4 text-white">
                    <img src="/pswdologo.jpg" alt="MARDSS logo" className="h-14 w-14 rounded-full border-2 border-solid border-amber-500" />
                    <div className="flex flex-col gap-1">
                        <div>
                            <span className="font-bold text-lg">MAR</span>
                            <span className="font-bold text-lg text-[#E8B324]">DSS</span>
                        </div>
                        <span className="flex-1 text-center font-semibold">
                            Provincial Social Welfare and Development Office
                        </span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="relative border border-white/40 rounded-full px-3 py-1 text-white text-lg">
                            {formattedDate}
                        </div>
                        <button className="border border-white/40 rounded-full p-2 hover:bg-white/10">
                            <Bell size={18} />
                        </button>
                        <div className="h-14 w-14 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">
                            ADMIN
                        </div>
                    </div>
                    
                </div>
            
            {/* Main content */}
            <div className="flex-1 flex min-h-0">
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
                        })}
                    </nav>
                    <div className="flex flex-col px-2 pb-4 gap-1">
                        <button
                            onClick={() => navigate('/settings')}
                            className="flex items-center gap-3 text-gray-400 text-sm px-4 py-2 rounded hover:bg-gray-700 hover:text-white text-left"
                        >   <Settings size={18} />
                            Account Settings
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('user')
                                navigate('/')
                            }}
                            className="flex items-center gap-3 text-gray-400 text-sm px-4 py-2 rounded hover:bg-gray-700 hover:text-white text-left"
                        >   <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
                {/* Page content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Layout