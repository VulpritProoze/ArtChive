from django.db import migrations, models
class Migration(migrations.Migration):

    dependencies = [
        ('post', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='post',
            name='post_type',
            field=models.CharField(choices=[('default', 'default'), ('novel', 'novel'), ('image', 'image'), ('video', 'video')], max_length=100),
        ),
    ]
