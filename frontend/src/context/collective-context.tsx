import { createContext, useContext, useState } from "react";
import type { CollectiveContextType, Collective, CollectiveApi } from "@types";
import { toast } from "react-toastify";
import { collective } from "@lib/api";
import { handleApiError } from "@utils";
import { defaultErrors } from "@errors";
import { type CreateCollectiveFormData } from "@lib/validations";

export const CollectiveContext = createContext<
  CollectiveContextType | undefined
>(undefined);

export const CollectiveProvider = ({ children }) => {
  const [collectives, setCollectives] = useState<Collective[]>([]);
  const [loading, setLoading] = useState(true);

  const createCollective = async (formData: CreateCollectiveFormData) => {
    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append('title', formData.title.trim());
      submitData.append('description', formData.description.trim());
      
      if (formData.rules) {
        formData.rules
        .filter(rule => rule.trim())
        .forEach(rule => submitData.append('rules[]', rule.trim()));
      }

      formData.artist_types.forEach(type => submitData.append('artist_types[]', type));
      
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
      const message = handleApiError(err, defaultErrors)
      toast.error(message);
      console.error("Error creating collective: ", err);
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
      const message = handleApiError(err, defaultErrors)
      toast.error(message);
      console.error("Error joining collective: ", err);
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
        toast.success("Successfully joined this collective!");
      } catch (err) {
        const message = handleApiError(err, defaultErrors)
        toast.error(message);
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
