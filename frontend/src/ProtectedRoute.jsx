import { Navigate } from "react-router-dom";

function ProtectedRoute({children}){
    const user = localStorage.getItem('user')

    if(user === null){
        return <Navigate to="/" />
    }

    return children
}

export default ProtectedRoute