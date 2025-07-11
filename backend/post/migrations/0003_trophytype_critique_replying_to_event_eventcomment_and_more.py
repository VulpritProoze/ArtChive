# Generated by Django 5.2.3 on 2025-07-08 17:02

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('collective', '0002_channel_created_at_channel_updated_at_and_more'),
        ('post', '0002_post_collective'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TrophyType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('trophy', models.CharField(max_length=100)),
                ('brush_drip_value', models.IntegerField()),
            ],
        ),
        migrations.AddField(
            model_name='critique',
            name='replying_to',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='post.critique'),
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('start', models.DateTimeField()),
                ('end', models.DateTimeField()),
                ('details', models.TextField()),
                ('collective', models.ForeignKey(default='00000000-0000-0000-0000-000000000001', on_delete=django.db.models.deletion.CASCADE, related_name='event', to='collective.collective')),
            ],
        ),
        migrations.CreateModel(
            name='EventComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_comment_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='event_comment', to=settings.AUTH_USER_MODEL)),
                ('post_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='event_comment', to='post.post')),
                ('replying_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='post.eventcomment')),
            ],
        ),
        migrations.AlterField(
            model_name='posttrophy',
            name='post_trophy_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='post_trophy', to='post.trophytype'),
        ),
    ]
