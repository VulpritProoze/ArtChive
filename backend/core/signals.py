"""
Signal handlers for reputation system.
Automatically updates reputation when interactions are created/deleted.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Artist, BrushDripWallet, User
from .reputation import (
    get_recipient_for_critique,
    get_reputation_amount_for_critique,
    get_reputation_amount_for_praise,
    get_reputation_amount_for_trophy_or_award,
    update_reputation,
)

logger = logging.getLogger(__name__)


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

# Post Praise signals
@receiver(post_save, sender='post.PostPraise')
def on_praise_created(sender, instance, created, **kwargs):
    """Handle praise creation - add +1 reputation to post author."""
    if created:
        transaction.on_commit(
            lambda: update_reputation(
                instance.post_id.author,
                get_reputation_amount_for_praise(),
                'praise',
                str(instance.id),
                'post',
                'Received praise on post'
            )
        )


@receiver(pre_delete, sender='post.PostPraise')
def on_praise_deleted(sender, instance, **kwargs):
    """Handle praise deletion - subtract -1 reputation from post author."""
    transaction.on_commit(
        lambda: update_reputation(
            instance.post_id.author,
            -get_reputation_amount_for_praise(),
            'praise',
            str(instance.id),
            'post',
            'Praise deleted'
        )
    )


# Post Trophy signals
@receiver(post_save, sender='post.PostTrophy')
def on_trophy_created(sender, instance, created, **kwargs):
    """Handle trophy creation - add reputation equal to trophy value."""
    if created:
        trophy_type = instance.post_trophy_type.trophy
        amount = get_reputation_amount_for_trophy_or_award(trophy_type)

        transaction.on_commit(
            lambda: update_reputation(
                instance.post_id.author,
                amount,
                'trophy',
                str(instance.id),
                'post',
                f'Received {trophy_type} trophy on post'
            )
        )


@receiver(pre_delete, sender='post.PostTrophy')
def on_trophy_deleted(sender, instance, **kwargs):
    """Handle trophy deletion - subtract reputation equal to trophy value."""
    trophy_type = instance.post_trophy_type.trophy
    amount = get_reputation_amount_for_trophy_or_award(trophy_type)

    transaction.on_commit(
        lambda: update_reputation(
            instance.post_id.author,
            -amount,
            'trophy',
            str(instance.id),
            'post',
            'Trophy deleted'
        )
    )


# Critique signals
@receiver(post_save, sender='post.Critique')
def on_critique_created_or_updated(sender, instance, created, **kwargs):
    """Handle critique creation or update - update reputation based on impression."""
    if created:
        # New critique - apply reputation
        recipient = get_recipient_for_critique(instance)
        if not recipient:
            logger.warning(f'Critique {instance.critique_id} has no recipient (no post_id or gallery_id)')
            return

        # Determine object type
        object_type = None
        if instance.post_id:
            object_type = 'post'
        elif hasattr(instance, 'gallery_id') and instance.gallery_id:
            object_type = 'gallery'

        amount = get_reputation_amount_for_critique(instance.impression)

        if amount != 0:  # Only update if not neutral
            transaction.on_commit(
                lambda: update_reputation(
                    recipient,
                    amount,
                    'critique',
                    str(instance.critique_id),
                    object_type,
                    f'Received {instance.impression} critique'
                )
            )
    else:
        # Critique updated - check if impression changed
        update_fields = kwargs.get('update_fields', None)
        if update_fields and 'impression' in update_fields:
            # Get old impression from database
            try:
                old_instance = sender.objects.get(pk=instance.pk)
                old_impression = old_instance.impression
            except sender.DoesNotExist:
                return

            if old_impression != instance.impression:
                # Impression changed - reverse old, apply new
                recipient = get_recipient_for_critique(instance)
                if not recipient:
                    return

                object_type = None
                if instance.post_id:
                    object_type = 'post'
                elif hasattr(instance, 'gallery_id') and instance.gallery_id:
                    object_type = 'gallery'

                old_amount = get_reputation_amount_for_critique(old_impression)
                new_amount = get_reputation_amount_for_critique(instance.impression)

                # Reverse old amount
                if old_amount != 0:
                    transaction.on_commit(
                        lambda: update_reputation(
                            recipient,
                            -old_amount,
                            'critique',
                            str(instance.critique_id),
                            object_type,
                            f'Critique impression changed from {old_impression} to {instance.impression} (reversed old)'
                        )
                    )

                # Apply new amount
                if new_amount != 0:
                    transaction.on_commit(
                        lambda: update_reputation(
                            recipient,
                            new_amount,
                            'critique',
                            str(instance.critique_id),
                            object_type,
                            f'Critique impression changed from {old_impression} to {instance.impression} (applied new)'
                        )
                    )


@receiver(pre_delete, sender='post.Critique')
def on_critique_deleted(sender, instance, **kwargs):
    """Handle critique deletion - reverse reputation."""
    recipient = get_recipient_for_critique(instance)
    if not recipient:
        return

    object_type = None
    if instance.post_id:
        object_type = 'post'
    elif hasattr(instance, 'gallery_id') and instance.gallery_id:
        object_type = 'gallery'

    amount = get_reputation_amount_for_critique(instance.impression)

    if amount != 0:  # Only reverse if not neutral
        transaction.on_commit(
            lambda: update_reputation(
                recipient,
                -amount,
                'critique',
                str(instance.critique_id),
                object_type,
                'Critique deleted'
            )
        )


# Gallery Award signals (will be connected when GalleryAward model is ready)
@receiver(post_save, sender='gallery.GalleryAward')
def on_gallery_award_created(sender, instance, created, **kwargs):
    """Handle gallery award creation - add reputation equal to award value."""
    if created:
        award_type = instance.gallery_award_type.award
        amount = get_reputation_amount_for_trophy_or_award(award_type)

        transaction.on_commit(
            lambda: update_reputation(
                instance.gallery_id.creator,
                amount,
                'gallery_award',
                str(instance.id),
                'gallery',
                f'Received {award_type} award on gallery'
            )
        )


@receiver(pre_delete, sender='gallery.GalleryAward')
def on_gallery_award_deleted(sender, instance, **kwargs):
    """Handle gallery award deletion - subtract reputation equal to award value."""
    award_type = instance.gallery_award_type.award
    amount = get_reputation_amount_for_trophy_or_award(award_type)

    transaction.on_commit(
        lambda: update_reputation(
            instance.gallery_id.creator,
            -amount,
            'gallery_award',
            str(instance.id),
            'gallery',
            'Gallery award deleted'
        )
    )
