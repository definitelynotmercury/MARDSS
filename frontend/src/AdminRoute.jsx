import { Navigate } from "react-router-dom"

function AdminRoute({ children }) {
    const userString = localStorage.getItem('user')
    
    if (!userString) {
        return <Navigate to="/" />
    }

    const user = JSON.parse(userString)

    if (user.role !== 'admin') {
        return <Navigate to="/dashboard" /> 
    }

    return children
}

export default AdminRoute