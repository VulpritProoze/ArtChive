from types import SimpleNamespace

POST_TYPE_CHOICES = (
    ('default', 'default'),
    ('novel', 'novel'),
    ('image', 'image'),
    ('video', 'video'),
)

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
    "Follow Facebook Community Guidelines.",
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
    ('admin_override', 'Admin Override'),
]

TRANSACTION_TYPES = SimpleNamespace(
    praise='Praise',
    trophy='Trophy',
    brush_gradient='Brush Gradient',
    critique='Critique',
    admin_override='Admin Override',
)

NOTIFICATION_OBJECT_CHOICES = [
    ('post_comment', 'Post Comment'),
    ('post_critique', 'Post Critique'),
    ('post_praise', 'Post Praise'),
    ('post_trophy', 'Post Trophy'),
]

NOTIFICATION_TYPES = SimpleNamespace(
    post_comment='Post Comment',
    post_critique='Post Critique',
    post_praise='Post Praise',
    post_trophy='Post Trophy',
)
