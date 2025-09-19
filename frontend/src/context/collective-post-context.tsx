import { createContext, useState, useContext } from 'react'
import type { CollectivePostContextType, Collective, Channel } from '@types'
import { collective } from '@lib/api'
import { usePostContext } from './post-context'
import { toast } from 'react-toastify'

export const CollectivePostContext = createContext<CollectivePostContextType | undefined>(undefined)

export const CollectivePostProvider = ({ children }) => {
    const [collectiveData, setCollectiveData] = useState<Collective | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

    const { fetchPosts, setPostForm } = usePostContext()

    const fetchCollectiveData = async (collectiveId: string) => {
      if (!collectiveId) return;

      try {
        setLoading(true);
        // Fetch collective data
        const collectiveResponse = await collective.get(`${collectiveId}/`);
        setCollectiveData(collectiveResponse.data);

        // Set first channel as selected by default
        if (collectiveResponse.data.channels.length > 0) {
          const firstChannel = collectiveResponse.data.channels[0];
          setSelectedChannel(firstChannel);
          setPostForm(prev => ({ ...prev, channel_id: firstChannel.channel_id }));
          await fetchPosts(1, false, firstChannel.channel_id);
        }
      } catch (err) {
        toast.error("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const contextValue: CollectivePostContextType = {
      collectiveData,
      loading,
      selectedChannel,
      setSelectedChannel,
      fetchCollectiveData
    }

    return (
        <CollectivePostContext.Provider value={contextValue}>
            {children}
        </CollectivePostContext.Provider>
    )
}

export const useCollectivePostContext = (): CollectivePostContextType => {
    const context = useContext(CollectivePostContext)
    if (context === undefined) {
        throw new Error('useCollectiveContext must be within a CollectivePostProvider')
    }

    return context
}