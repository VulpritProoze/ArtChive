import type { Collective } from "./collective.type";
import type { CreateCollectiveFormData } from "@lib/validations";

export interface CollectiveContextType {
    fetchCollectives: () => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    collectives: Collective[];
    handleJoinCollectiveAsync: (collectiveId: string) => void;
    createCollective: (formData: CreateCollectiveFormData) => Promise<string>;
  }