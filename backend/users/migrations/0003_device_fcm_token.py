# Generated manually for Sprint 1 stabilization
# Adds missing fcm_token field to Device model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_customuser_avatar_customuser_bio_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='fcm_token',
            field=models.TextField(blank=True, help_text='Firebase Cloud Messaging token for push notifications', null=True),
        ),
    ]
