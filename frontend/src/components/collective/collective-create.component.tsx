import { CreateCollectiveForm } from "@components/common/collective-feature/modal"
import { CommonHeader } from "@components/common"
import { useAuth } from "@context/auth-context"

export default function CollectiveCreate() {
    const { user } = useAuth()

    return (
        <div>
            <CommonHeader user={user} />
            <CreateCollectiveForm />
        </div>
    )
}