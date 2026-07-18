from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import CustomUser

class Command(BaseCommand):
    help = 'Provisions exactly TWO users and disables further registration.'

    def handle(self, *args, **kwargs):
        if CustomUser.objects.count() >= 2:
            self.stdout.write(self.style.ERROR('Platform is already fully provisioned with 2 users.'))
            return
            
        with transaction.atomic():
            # Delete any existing users to ensure a clean slate if count < 2 but > 0
            CustomUser.objects.all().delete()
            
            # User A
            user_a = CustomUser.objects.create_user(
                email='usera@dualconnect.local',
                password='ChangeMeImmediat3ly!',
                is_user_a=True,
                is_staff=True,
                is_superuser=True
            )
            
            # User B
            user_b = CustomUser.objects.create_user(
                email='userb@dualconnect.local',
                password='ChangeMeImmediat3ly!',
                is_user_a=False,
                is_staff=False,
                is_superuser=False
            )
            
        self.stdout.write(self.style.SUCCESS('Successfully provisioned EXACTLY TWO users.'))
        self.stdout.write(self.style.WARNING(f'User A: {user_a.email}'))
        self.stdout.write(self.style.WARNING(f'User B: {user_b.email}'))
        self.stdout.write(self.style.ERROR('Please change the default passwords immediately.'))
