# Generated migration to add Artist profiles to existing users

from django.db import migrations


def add_artist_to_existing_users(apps, schema_editor):
    """
    Add Artist profile to all existing users who don't have one.
    This fixes the issue where admin123 and other early users were created
    without Artist profiles.
    """
    User = apps.get_model('core', 'User')
    Artist = apps.get_model('core', 'Artist')

    for user in User.objects.all():
        Artist.objects.get_or_create(
            user_id=user,
            defaults={'artist_types': []}
        )


def reverse_func(apps, schema_editor):
    """
    Reverse migration - optionally clean up Artist profiles.
    We don't delete them to avoid data loss.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_artist_to_existing_users, reverse_func),
    ]

