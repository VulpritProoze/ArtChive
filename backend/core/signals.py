from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, BrushDripWallet

@receiver(post_save, sender=User)
def create_brushdrip_wallet(sender, instance, created, **kwargs):
    """
    Automatically create a BrushDripWallet for every new User.
    """
    if created:
        BrushDripWallet.objects.create(user=instance)