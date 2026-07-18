#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate

echo "Creating default superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
email = 'admin@dualconnect.com'
password = 'Admin123!'
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password)
    print(f'Superuser created -> Email: {email} | Password: {password}')
else:
    print('Superuser already exists.')
"

echo "Starting ASGI Server (Daphne)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
