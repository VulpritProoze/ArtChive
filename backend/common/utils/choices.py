from types import SimpleNamespace

POST_TYPE_CHOICES = (
    ('default', 'default'),
    ('novel', 'novel'),
    ('image', 'image'),
    ('video', 'video'),
)

# NOTE: Changing this means also changing fixture
POST_TROPHY_CHOICES = (
    ('bronze_stroke', 'bronze_stroke'),
    ('golden_bristle', 'golden_bristle'),
    ('diamond_canvas', 'diamond_canvas'),
)

# Trophy Brush Drip costs
TROPHY_BRUSH_DRIP_COSTS = {
    'bronze_stroke': 5,
    'golden_bristle': 10,
    'diamond_canvas': 20,
}

# Gallery Award choices (same as trophies)
# NOTE: Changing this means also changing fixture
GALLERY_AWARD_CHOICES = (
    ('bronze_stroke', 'bronze_stroke'),
    ('golden_bristle', 'golden_bristle'),
    ('diamond_canvas', 'diamond_canvas'),
)

# Gallery Award Brush Drip costs (same as trophies)
GALLERY_AWARD_BRUSH_DRIP_COSTS = {
    'bronze_stroke': 5,
    'golden_bristle': 10,
    'diamond_canvas': 20,
}

CRITIQUE_IMPRESSIONS = (
    ('positive', 'positive'),
    ('negative', 'negative'),
    ('neutral', 'neutral'),
)

COLLECTIVE_STATUS = (
    ('public', 'public'),
    ('private', 'private'),
    ('archive', 'archive'),
)

GALLERY_STATUS_CHOICES = (
    ('draft', 'draft'),
    ('active', 'active'),
    ('archived', 'archived')
)

GALLERY_STATUS = SimpleNamespace(
    draft='draft',
    active='active',
    archived='archived'
)

COLLECTIVE_ROLES_CHOICES = (
    ('member', 'member'),
    ('admin', 'admin')
)

COLLECTIVE_ROLES = SimpleNamespace(
    member='member',
    admin='admin'
)


CHANNEL_TYPE_CHOICES = (
    ('post_channel', 'Post Channel'),
    ('media_channel', 'Media Channel'),
    ('event_channel', 'Event Channel'),
)

CHANNEL_TYPES = SimpleNamespace(
    post_channel='Post Channel',
    media_channel='Media Channel',
    event_channel='Event Channel'
)

# Must be a list
FACEBOOK_RULES = [
    "Be respectful and kind to others.",
    "No spam or self-promotion.",
    "Stay on topic and keep discussions relevant.",
    "No hate speech or discriminatory language.",
    "Respect privacy — no sharing personal information without consent.",
    "Follow ArtChive Community Rules.",
]

FELLOW_STATUS = [
    ('pending', 'pending'),
    ('accepted', 'accepted'),
    ('blocked', 'blocked')
]

TRANSACTION_OBJECT_CHOICES = [
    ('praise', 'Praise'),
    ('trophy', 'Trophy'),
    # ('brush_gradient', 'Brush Gradient'),
    ('critique', 'Critique'),
    ('gallery_critique', 'Gallery Critique'),
    ('gallery_award', 'Gallery Award'),
    ('admin_override', 'Admin Override'),
]

TRANSACTION_TYPES = SimpleNamespace(
    praise='Praise',
    trophy='Trophy',
    brush_gradient='Brush Gradient',
    critique='Critique',
    gallery_critique='Gallery Critique',
    gallery_award='Gallery Award',
    admin_override='Admin Override',
)

# Reputation source types
REPUTATION_SOURCE_CHOICES = (
    ('praise', 'Praise'),
    ('trophy', 'Trophy'),
    ('critique', 'Critique'),
    ('gallery_critique', 'Gallery Critique'),
    ('gallery_award', 'Gallery Award'),
)

NOTIFICATION_OBJECT_CHOICES = [
    ('post_comment', 'Post Comment'),
    ('post_critique', 'Post Critique'),
    ('post_praise', 'Post Praise'),
    ('post_trophy', 'Post Trophy'),
    ('post_mention', 'Post Mention'),
    ('gallery_comment', 'Gallery Comment'),
    ('gallery_critique', 'Gallery Critique'),
    ('gallery_award', 'Gallery Award'),
    ('friend_request_accepted', 'Friend Request Accepted'),
    ('join_request_accepted', 'Join Request Accepted'),
    ('admin_request_accepted', 'Admin Request Accepted'),
    ('join_request_created', 'Join Request Created'),
    ('admin_request_created', 'Admin Request Created'),
]

NOTIFICATION_TYPES = SimpleNamespace(
    post_comment='Post Comment',
    post_critique='Post Critique',
    post_praise='Post Praise',
    post_trophy='Post Trophy',
    post_mention='Post Mention',
    gallery_comment='Gallery Comment',
    gallery_critique='Gallery Critique',
    gallery_award='Gallery Award',
    friend_request_accepted='Friend Request Accepted',
    join_request_accepted='Join Request Accepted',
    admin_request_accepted='Admin Request Accepted',
    join_request_created='Join Request Created',
    admin_request_created='Admin Request Created',
)

AVATAR_STATUS_CHOICES = (
    ('draft', 'draft'),
    ('active', 'active'),
    ('archived', 'archived')
)

AVATAR_STATUS = SimpleNamespace(
    draft='draft',
    active='active',
    archived='archived'
)
