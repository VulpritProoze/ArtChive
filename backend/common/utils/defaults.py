from .choices import CHANNEL_TYPES

DEFAULT_COLLECTIVE_CHANNELS = [
    {
        "title": "General",
        "channel_type": CHANNEL_TYPES.post_channel,
        "description": "General discussion and posts for the collective."
    },
    {
        "title": "Audio",
        "channel_type": CHANNEL_TYPES.media_channel,
        "description": "Share and discuss audio content."
    },
    {
        "title": "Video",
        "channel_type": CHANNEL_TYPES.media_channel,
        "description": "Share and discuss video content."
    },
    {
        "title": "General Event",
        "channel_type": CHANNEL_TYPES.event_channel,
        "description": "Announcements and discussions about collective events."
    },
]
