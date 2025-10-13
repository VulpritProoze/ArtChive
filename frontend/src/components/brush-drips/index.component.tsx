import { CommonHeader } from "@components/common"
import { useAuth } from "@context/auth-context"

export default function Index() {
    const { user } = useAuth()
    
    return (
        <>
            <CommonHeader user={user} />
        </>
    )
}