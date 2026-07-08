import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import Analytics from './Analytics'
import Forecast from './forecast'
import Export from './export'
import Settings from './Settings'
import Admin from './Admin'
import AdminUploadReport from './AdminUploadReport'
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/export" element={<Export />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/AdminUploadReport" element={<AdminUploadReport/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App