import { useNavigate,useLocation } from "react-router-dom";
import { useState, useEffect } from 'react'
import { getToken } from './auth'
import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  FileOutput,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';
import { BASE_URL } from './config';


function Layout({children}){
    const user = JSON.parse(localStorage.getItem('user'))
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

    const [notifications, setNotifications] = useState({ new: [], old: [], unread_count: 0 })
    const [showNotifications, setShowNotifications] = useState(false)
    const [activeTab, setActiveTab] = useState('new')


    const fetchNotifications = async () => {
        const token = getToken()
        const res = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setNotifications(data)
    }

    useEffect(() => {
        fetchNotifications()
    }, [])
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
                        <div className="relative">
                            <button
                                onClick={async () => {
                                    setShowNotifications(prev => !prev)
                                    if (!showNotifications && notifications.unread_count > 0) {
                                        const token = getToken()
                                        await fetch(`${BASE_URL}/api/notifications/mark-read`, {
                                            method: 'PUT',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        })
                                        fetchNotifications()
                                    }
                                }}
                                className="border border-white/40 rounded-full p-2 hover:bg-white/10"
                            >
                                <Bell size={18} />
                                {notifications.unread_count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                                        {notifications.unread_count}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg text-gray-700 z-50">
                                    
                                    {/* Header */}
                                    <div className="px-4 py-2 border-b font-semibold text-sm">
                                        Irregularities Detected
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex border-b">
                                        <button
                                            onClick={() => setActiveTab('new')}
                                            className={`flex-1 py-2 text-xs font-medium ${
                                                activeTab === 'new'
                                                    ? 'border-b-2 border-blue-800 text-blue-800'
                                                    : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            New {notifications.new.length > 0 && `(${notifications.new.length})`}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('old')}
                                            className={`flex-1 py-2 text-xs font-medium ${
                                                activeTab === 'old'
                                                    ? 'border-b-2 border-blue-800 text-blue-800'
                                                    : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            Earlier {notifications.old.length > 0 && `(${notifications.old.length})`}
                                        </button>
                                    </div>

                                    {/* Notification list */}
                                    <div className="max-h-80 overflow-y-auto">
                                        {activeTab === 'new' && (
                                            notifications.new.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-gray-400">No new irregularities.</p>
                                            ) : (
                                                notifications.new.map((n) => (
                                                    <div key={n.notification_id} className="border-l-4 border-yellow-400 bg-yellow-50 px-4 py-3">
                                                        <p className="font-semibold text-yellow-800 text-sm">{n.type_name}</p>
                                                        <p className="text-yellow-700 text-xs mt-1">{n.message}</p>
                                                        <p className="text-gray-400 text-xs mt-1">{n.generated_date}</p>
                                                    </div>
                                                ))
                                            )
                                        )}
                                        {activeTab === 'old' && (
                                            notifications.old.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-gray-400">No earlier irregularities.</p>
                                            ) : (
                                                notifications.old.map((n) => (
                                                    <div key={n.notification_id} className="border-l-4 border-gray-300 bg-gray-50 px-4 py-3">
                                                        <p className="font-semibold text-gray-700 text-sm">{n.type_name}</p>
                                                        <p className="text-gray-500 text-xs mt-1">{n.message}</p>
                                                        <p className="text-gray-400 text-xs mt-1">{n.generated_date}</p>
                                                    </div>
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
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