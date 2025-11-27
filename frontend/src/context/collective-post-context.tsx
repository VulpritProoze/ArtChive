/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext } from 'react'
import type { CollectivePostContextType, Channel, ChannelCreateForm, ChannelCreateRequest } from '@types'
import { collective } from '@lib/api'
import { toast } from '@utils/toast.util'
import { channelCreateErrors, defaultErrors } from '@errors'
import { handleApiError, formatErrorForToast } from '@utils'
import { convertChannelTypeToSnakeCase } from '@utils/convert-channel-type'
import { useInvalidateCollectiveData } from '@hooks/queries/use-collective-data'

export const CollectivePostContext = createContext<CollectivePostContextType | undefined>(undefined)

export const CollectivePostProvider = ({ children }) => {
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    const [createChannelForm, setCreateChannelForm] = useState<ChannelCreateForm>({ title: '', description: '', collective: '', channel_type: undefined });
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
    const [updatingChannel, setUpdatingChannel] = useState(false);
    const [deletingChannel, setDeletingChannel] = useState(false);
    
    // Use React Query hook for invalidating collective data cache
    const invalidateCollectiveData = useInvalidateCollectiveData();

    const handleCreateChannel = async (collectiveId: string) => {
      if (!collectiveId || !createChannelForm?.title.trim()) return;
    
      setCreatingChannel(true);
    
      try {
        // Convert form data to API request format (snake_case for channel_type)
        const requestData: ChannelCreateRequest = {
          title: createChannelForm.title,
          description: createChannelForm.description,
          collective: collectiveId,
          channel_type: createChannelForm.channel_type 
            ? convertChannelTypeToSnakeCase(createChannelForm.channel_type)
            : 'post_channel', // Default to post_channel if not provided
        };
        
        await collective.post(`${collectiveId}/channel/create/`, requestData)

        // Invalidate React Query cache to refetch collective data
        invalidateCollectiveData(collectiveId);
    
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

    const handleUpdateChannel = async (collectiveId: string, updatedData: { title: string; description: string }) => {
      if (!collectiveId || !editingChannel) return;
    
      setUpdatingChannel(true);
    
      try {
        await collective.patch(`${collectiveId}/channel/update/`, {
          channel_id: editingChannel.channel_id,
          ...updatedData,
        });
    
        // Invalidate React Query cache to refetch collective data
        invalidateCollectiveData(collectiveId);
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

    const handleDeleteChannel = async (collectiveId: string, channelId: string) => {
      if (!collectiveId) return;
    
      setDeletingChannel(true);
    
      try {
        await collective.delete(`${collectiveId}/channel/delete/`, {
          data: { channel_id: channelId }, // Send in body if needed
        });
    
        // Invalidate React Query cache to refetch collective data
        invalidateCollectiveData(collectiveId);
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
      selectedChannel,
      setSelectedChannel,
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