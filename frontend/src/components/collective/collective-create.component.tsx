import { CreateCollectiveForm } from "@components/common/collective-feature/modal"

import { useAuth } from "@context/auth-context"

export default function CollectiveCreate() {
    const { user } = useAuth()

    return (
        <div>
            
            <CreateCollectiveForm />
        </div>
    )
}