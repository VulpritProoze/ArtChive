# Generated migration for gallery models enhancement

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('gallery', '0004_gallery_creator_gallery_is_deleted'),
        ('posts', '0001_initial'),  # Adjust based on your posts app migration
    ]

    operations = [
        # Add new fields to Gallery
        migrations.AddField(
            model_name='gallery',
            name='max_slots',
            field=models.IntegerField(default=12),
        ),
        migrations.AddField(
            model_name='gallery',
            name='allow_free_positioning',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='gallery',
            name='creator',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='galleries', to='core.user'),
        ),
        
        # Create GalleryItemCategory model
        migrations.CreateModel(
            name='GalleryItemCategory',
            fields=[
                ('category_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('icon', models.CharField(help_text='Icon identifier for frontend', max_length=50)),
                ('description', models.TextField(blank=True)),
            ],
            options={
                'verbose_name_plural': 'Gallery Item Categories',
            },
        ),
        
        # Update GalleryItem model
        migrations.AddField(
            model_name='galleryitem',
            name='title',
            field=models.CharField(default='Untitled', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='owner',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='gallery_items', to='core.user'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='category',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.PROTECT, related_name='items', to='gallery.galleryitemcategory'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='visibility',
            field=models.CharField(choices=[('public', 'Public'), ('private', 'Private'), ('unlisted', 'Unlisted')], default='public', max_length=20),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='is_achievement',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='achievement_type',
            field=models.CharField(blank=True, help_text="e.g., 'first_post', 'top_artist', 'trophy_collector'", max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='achievement_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='achievement_metadata',
            field=models.JSONField(blank=True, help_text='Additional achievement data', null=True),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='related_post',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='posts.post'),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='related_trophy',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='posts.posttrophy'),
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default='2025-01-01'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='galleryitem',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='galleryitem',
            name='image_url',
            field=models.ImageField(upload_to='gallery/items/'),
        ),
        
        # Create GalleryLayout model
        migrations.CreateModel(
            name='GalleryLayout',
            fields=[
                ('layout_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('slot_number', models.IntegerField(blank=True, help_text='Slot-based position (1-12), null for free positioning', null=True)),
                ('position_x', models.IntegerField(default=0, help_text='X coordinate in pixels or grid units')),
                ('position_y', models.IntegerField(default=0, help_text='Y coordinate in pixels or grid units')),
                ('width', models.IntegerField(default=200, help_text='Width in pixels')),
                ('height', models.IntegerField(default=200, help_text='Height in pixels')),
                ('z_index', models.IntegerField(default=0, help_text='Layer order for overlapping items')),
                ('rotation', models.FloatField(default=0, help_text='Rotation in degrees')),
                ('scale', models.FloatField(default=1.0, help_text='Scale factor')),
                ('opacity', models.FloatField(default=1.0, help_text='Opacity (0-1)')),
                ('border_color', models.CharField(default='#000000', help_text='Hex color code', max_length=7)),
                ('border_width', models.IntegerField(default=0, help_text='Border width in pixels')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('gallery', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='layout_items', to='gallery.gallery')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='gallery.galleryitem')),
            ],
            options={
                'ordering': ['z_index', 'slot_number'],
            },
        ),
    ]