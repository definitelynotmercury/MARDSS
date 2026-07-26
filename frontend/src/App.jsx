import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import Analytics from './Analytics'
import Forecast from './forecast'
import Export from './export'
import Settings from './Settings'
import Admin from './Admin'
import AdminUploadReport from './AdminUploadReport'
import ProtectedRoute from './ProtectedRoute'
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
                <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/AdminUploadReport" element={<ProtectedRoute><AdminUploadReport/></ProtectedRoute>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App