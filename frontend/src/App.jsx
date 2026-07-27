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
import AdminRoute from './AdminRoute'
import ForgotPassword from './ForgotPassword'
import VerifyCode from './VerifyCode'

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
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/AdminUploadReport" element={<AdminRoute><AdminUploadReport/></AdminRoute>} />
                <Route path="/forgotpassword" element={<ForgotPassword/>} />
                <Route path="/verifycode"element={<VerifyCode/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default App