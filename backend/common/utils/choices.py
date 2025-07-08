POST_TYPE_CHOICES = (
    ('default', 'default'),
    ('novel', 'novel'),
    ('photo', 'photo'),
    ('video', 'video'),
)

POST_TROPHY_CHOICES = (
    ('bronze_stroke', 'bronze_stroke'),
    ('golden_bristle', 'golden_bristle'),
    ('diamond_canvas', 'diamond_canvas'),
)

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

# Must be a list
FACEBOOK_RULES = [
    "Be respectful and kind to others.",
    "No spam or self-promotion.",
    "Stay on topic and keep discussions relevant.",
    "No hate speech or discriminatory language.",
    "Respect privacy — no sharing personal information without consent.",
    "Follow Facebook Community Guidelines.",
]