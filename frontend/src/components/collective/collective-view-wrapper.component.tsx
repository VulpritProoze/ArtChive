import { useParams } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import CollectiveHome from "./inside-collective.component";
import NonMemberCollective from "./non-member-collective.component";

/**
 * Wrapper component that conditionally renders the appropriate collective view
 * based on user's membership status
 */
export default function CollectiveViewWrapper() {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const { isMemberOfACollective } = useAuth();
  const isMember = isMemberOfACollective(collectiveId);

  if (isMember) {
    return <CollectiveHome />;
  }

  return <NonMemberCollective />;
}

