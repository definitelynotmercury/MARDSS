import { useNavigate, useLocation } from "react-router-dom";

function AdminLayout({ children }) {
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = [
        { label: 'Manage Accounts', path: '/admin' },
        {label: 'Upload Entry', path: '/AdminUploadReport'}
    ]

    const handleLogout = () => {
        localStorage.removeItem('user')
        navigate('/')
    }

    return (
        <div className="flex h-screen bg-gray-100">
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
                    onClick={handleLogout}
                    className="text-gray-400 text-sm px-6 py-4 hover:text-white text-left"
                >
                    Logout
                </button>
            </div>
            {/* Main content */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white shadow px-6 py-4 text-center font-semibold text-gray-700">
                    Provincial Social Welfare and Development Office — Admin
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default AdminLayout