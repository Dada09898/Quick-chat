# DualConnect Production Deployment Guide

## 1. Environment Configuration (`.env.prod`)
Create a strictly isolated `.env.prod` file. **Never commit this file**.
```env
DEBUG=False
SECRET_KEY=<generate_secure_random_key>
DATABASE_URL=postgres://dualconnect:super_secure_password@db:5432/dualconnect_prod
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
ALLOWED_HOSTS=chat.example.com
CORS_ALLOWED_ORIGINS=https://chat.example.com
```

## 2. Server Initialization
The platform targets a minimal Linux host (e.g., Ubuntu 24.04 LTS).
1. Install Docker and Docker Compose.
2. Clone the repository and copy `.env.prod`.
3. Start the cluster:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 3. Database Migration
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## 4. Coturn (WebRTC) Configuration
Ensure `coturn/turnserver.conf` is properly mounted:
```
listening-port=3478
tls-listening-port=5349
realm=chat.example.com
server-name=chat.example.com
lt-cred-mech
user=admin:super_secure_password
cert=/etc/nginx/certs/fullchain.pem
pkey=/etc/nginx/certs/privkey.pem
no-stdout-log
```

## 5. Reverse Proxy & TLS (Nginx)
The configuration is mapped in `nginx/conf.d/default.conf`. You must generate valid TLS certificates via Let's Encrypt `certbot` and map them to `./nginx/certs/` before starting Nginx. 

## 6. Disaster Recovery & Backups
### PostgreSQL Backup
```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U dualconnect -F c -d dualconnect_prod > backup_$(date +%Y%m%d).dump
```
### Restore
```bash
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U dualconnect -d dualconnect_prod -1 < backup.dump
```
### Redis Persistence
Redis is already configured with `--appendonly yes`, automatically flushing AOF files to the `redis_data` volume.
