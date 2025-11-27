import { createContext, useState, useContext } from 'react'
import type { CollectivePostContextType, Collective, Channel, ChannelCreateForm, ChannelCreateRequest } from '@types'
import { collective } from '@lib/api'
import { usePostContext } from './post-context'
import { toast } from '@utils/toast.util'
import { channelCreateErrors, defaultErrors } from '@errors'
import { handleApiError, formatErrorForToast } from '@utils'
import { convertChannelTypeToSnakeCase } from '@utils/convert-channel-type'

export const CollectivePostContext = createContext<CollectivePostContextType | undefined>(undefined)

export const CollectivePostProvider = ({ children }) => {
    const [collectiveData, setCollectiveData] = useState<Collective | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    const [createChannelForm, setCreateChannelForm] = useState<ChannelCreateForm>({ title: '', description: '', collective: '', channel_type: undefined });
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
    const [updatingChannel, setUpdatingChannel] = useState(false);
    const [deletingChannel, setDeletingChannel] = useState(false);

    const { fetchPosts, setPostForm } = usePostContext()

    // useEffect(() => {
    //   console.log('collectiveData', collectiveData);
    // }, [collectiveData]);

    const fetchCollectiveData = async (collectiveId: string) => {
      if (!collectiveId) return;

      try {
        setLoading(true);
        // Fetch collective data
        const collectiveResponse = await collective.get(`${collectiveId}/`);
        setCollectiveData(collectiveResponse.data);

        // Set first channel as selected by default
        if (collectiveResponse.data.channels.length > 0) {
          let firstChannel = collectiveResponse.data.channels[0];
          firstChannel.collective_id = collectiveResponse.data.collective_id
          setSelectedChannel(firstChannel);
          setPostForm(prev => ({ ...prev, channel_id: firstChannel.channel_id }));
          await fetchPosts(1, false, firstChannel.channel_id);
        }
      } catch (err) {
        console.error('Collective data fetching error:', err)
        const message = handleApiError(err, defaultErrors, true, true)
        toast.error('Failed to fetch collective data', formatErrorForToast(message));
      } finally {
        setLoading(false);
      }
    };

    const handleCreateChannel = async () => {
      if (!collectiveData || !createChannelForm?.title.trim()) return;
    
      setCreatingChannel(true);
    
      try {
        // Convert form data to API request format (snake_case for channel_type)
        const requestData: ChannelCreateRequest = {
          title: createChannelForm.title,
          description: createChannelForm.description,
          collective: collectiveData.collective_id,
          channel_type: createChannelForm.channel_type 
            ? convertChannelTypeToSnakeCase(createChannelForm.channel_type)
            : 'post_channel', // Default to post_channel if not provided
        };
        
        await collective.post(`${collectiveData.collective_id}/channel/create/`, requestData)

        // Refetch collective data to include the new channel
        await fetchCollectiveData(collectiveData.collective_id);
    
        // Close modal and reset form
        setShowCreateChannelModal(false);
        setCreateChannelForm({ title: '', description: '', collective: '', channel_type: undefined });

        toast.success('Channel created', 'Your new channel has been created successfully')
      } catch (error) {
        console.error('Channel creation error:', error);
        const message = handleApiError(error, channelCreateErrors, true, true)
        toast.error('Failed to create channel', formatErrorForToast(message))
      } finally {
        setCreatingChannel(false);
      }
    };

    const handleUpdateChannel = async (updatedData: { title: string; description: string }) => {
      if (!collectiveData || !editingChannel) return;
    
      setUpdatingChannel(true);
    
      try {
        await collective.patch(`${collectiveData.collective_id}/channel/update/`, {
          channel_id: editingChannel.channel_id,
          ...updatedData,
        });
    
        // Refetch to reflect changes
        await fetchCollectiveData(collectiveData.collective_id);
        setEditingChannel(null);
        toast.success('Channel updated', 'Your channel has been updated successfully');
      } catch (error) {
        console.error('Channel update error:', error);
        const message = handleApiError(error, defaultErrors, true, true);
        toast.error('Failed to update channel', formatErrorForToast(message));
      } finally {
        setUpdatingChannel(false);
      }
    };

    const handleDeleteChannel = async (channelId: string) => {
      if (!collectiveData) return;
    
      setDeletingChannel(true);
    
      try {
        await collective.delete(`${collectiveData.collective_id}/channel/delete/`, {
          data: { channel_id: channelId }, // Send in body if needed
        });
    
        // Refetch collective data
        await fetchCollectiveData(collectiveData.collective_id);
        toast.success('Channel deleted', 'Your channel has been deleted successfully');
      } catch (error) {
        console.error('Channel delete error:', error);
        const message = handleApiError(error, defaultErrors, true, true);
        toast.error('Failed to delete channel', formatErrorForToast(message));
      } finally {
        setDeletingChannel(false);
      }
    };

    const contextValue: CollectivePostContextType = {
      collectiveData,
      loading,
      selectedChannel,
      setSelectedChannel,
      fetchCollectiveData,
      handleCreateChannel,
      showCreateChannelModal,
      setShowCreateChannelModal,
      createChannelForm,
      setCreateChannelForm,
      creatingChannel,
      setCreatingChannel,
      editingChannel, setEditingChannel,
      updatingChannel, setUpdatingChannel,
      deletingChannel, setDeletingChannel,
      handleUpdateChannel,
      handleDeleteChannel,
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