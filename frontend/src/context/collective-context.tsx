import { createContext, useContext, useState } from "react";
import type { CollectiveContextType, Collective, CollectiveApi } from "@types";
import { toast } from "@utils/toast.util";
import { collective } from "@lib/api";
import { handleApiError, formatErrorForToast } from "@utils";
import { defaultErrors } from "@errors";
import { type CreateCollectiveFormData } from "@lib/validations";

export const CollectiveContext = createContext<
  CollectiveContextType | undefined
>(undefined);

export const CollectiveProvider = ({ children }) => {
  const [collectives, setCollectives] = useState<Collective[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, only set true when actually fetching

  const createCollective = async (formData: CreateCollectiveFormData) => {
    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append('title', formData.title.trim());
      submitData.append('description', formData.description.trim());

      // Send rules as array - append each item separately
      if (formData.rules && formData.rules.length > 0) {
        const filteredRules = formData.rules.filter(rule => rule.trim());
        filteredRules.forEach(rule => submitData.append('rules', rule));
      }

      // Send artist_types as array - append each item separately
      if (formData.artist_types && formData.artist_types.length > 0) {
        formData.artist_types.forEach(type => submitData.append('artist_types', type));
      }

      // Add picture if exists
      if (formData.picture) {
        submitData.append('picture', formData.picture);
      }

      const response = await collective.post("create/", submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      // Refresh collectives list after creation
      await fetchCollectives();

      return response.data.collective_id;
    } catch (err) {
      console.error("Error creating collective: ", err);
      throw err; // Re-throw to let the form handle the error
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectives = async () => {
    try {
      setLoading(true)
      // Might wanna create a specific endpoint for this para no need to filter
      const response = await collective.get<CollectiveApi>("details/");

      // filter out a specific collective (to not display it)
      // This collective id is the public collective. NOT a collective.
      // Just an indicator that it is a public post (for post)
      const filteredCollectives = response.data.results.filter(
        (item) => item.collective_id !== "00000000-0000-0000-0000-000000000001"
      );

      setCollectives(filteredCollectives);
    } catch (err) {
      const message = handleApiError(err, defaultErrors, true, true)
      toast.error('Failed to fetch collectives', formatErrorForToast(message));
      console.error("Error fetching collectives: ", err);
    } finally {
      setLoading(false)
    }
  };

  const handleJoinCollectiveAsync = async (collectiveId: string) => {
    const userConfirmed = window.confirm(
      "Are you sure you want to join this collective?"
    );
    if (userConfirmed) {
      try {
        setLoading(true);

        await collective.post(
          "join/",
          { collective_id: collectiveId },
          { withCredentials: true }
        );
        toast.success("Collective joined", "You have successfully joined this collective");
      } catch (err) {
        const message = handleApiError(err, defaultErrors, true, true)
        toast.error('Failed to join collective', formatErrorForToast(message));
        console.error("Error joining collective: ", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const contextValue: CollectiveContextType = {
    fetchCollectives,
    loading,
    setLoading,
    collectives,
    handleJoinCollectiveAsync,
    createCollective,
  };

  return (
    <CollectiveContext.Provider value={contextValue}>
      {children}
    </CollectiveContext.Provider>
  );
};

export const useCollectiveContext = (): CollectiveContextType => {
  const context = useContext(CollectiveContext);
  if (context === undefined) {
    throw new Error(
      "useCollectiveContext must be within a CollectivePostProvider"
    );
  }

  return context;
};
