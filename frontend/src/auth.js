export function getToken(){
    const userString = localStorage.getItem('user')
    if(!userString){
        return null
    } else {
        const user = JSON.parse(userString)
        return user.token
    } 
    
}