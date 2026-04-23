import { useNavigate,useLocation } from "react-router-dom";

function Layout({children}){
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = [
        {label : 'Dashboard', path: '/dashboard'},
        {label : 'Analytics', path: '/analytics'},
        {label : 'Forecast', path: '/forecast'},
        {label : 'Export', path: '/export'}
    ]

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-48 bg-[#0d1b2a] text-white flex flex-col">
                <div className="p-4 text-xl font-bold">
                    <span className="text-white">MAR</span>
                    <span className="text-blue-400">DSS</span>
                </div>
                <nav className="flex flex-col flex-1 px-2 gap-1 mt-2">
                    {navItems.map((item) => (
                        <button key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`text-left px-4 py-2 rounded text-sm ${
                                location.pathname === item.path
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <button
                    onClick={() => navigate('/')}
                    className="text-gray-400 text-sm px-6 py-4 hover:text-white text-left"
                >
                    Logout
                </button>
            </div>
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Topbar */}
                <div className="bg-white shadow px-6 py-4 text-center font-semibold text-gray-700">
                    Provincial Social Welfare and Development Office
                </div>
                {/* Page content */}
                <div className="p-6 flex-1">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Layout