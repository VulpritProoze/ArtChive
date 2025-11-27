import type { Channel, ChannelCreateForm } from './collective.type';

export type CollectivePostContextType = {
    selectedChannel: Channel | null;
    setSelectedChannel: (channel: Channel | null) => void;
    handleCreateChannel: (collectiveId: string) => Promise<void>;
    showCreateChannelModal: boolean;
    setShowCreateChannelModal: (show: boolean) => void;
    createChannelForm: ChannelCreateForm;
    setCreateChannelForm: (form: ChannelCreateForm) => void;
    creatingChannel: boolean;
    setCreatingChannel: (creating: boolean) => void;
    editingChannel: Channel | null;
    setEditingChannel: (channel: Channel | null) => void;
    updatingChannel: boolean;
    setUpdatingChannel: (updating: boolean) => void;
    deletingChannel: boolean;
    setDeletingChannel: (deleting: boolean) => void;
    handleUpdateChannel: (collectiveId: string, updatedData: { title: string; description: string }) => Promise<void>;
    handleDeleteChannel: (collectiveId: string, channelId: string) => Promise<void>;
}