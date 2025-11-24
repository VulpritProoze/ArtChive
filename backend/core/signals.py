from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Artist, BrushDripWallet, User


@receiver(post_save, sender=User)
def create_brushdrip_wallet(sender, instance, created, **kwargs):
    """
    Automatically create a BrushDripWallet for every new User.
    """
    if created:
        BrushDripWallet.objects.create(user=instance)


@receiver(post_save, sender=User)
def create_artist_profile(sender, instance, created, **kwargs):
    """
    Automatically create an Artist profile for every new User.
    """
    if created:
        Artist.objects.get_or_create(
            user_id=instance,
            defaults={'artist_types': []}
        )
