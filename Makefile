.PHONY: help build up down logs shell-frontend shell-backend migrate makemigrations create-users

help:
	@echo "Available commands:"
	@echo "  make up               - Start development environment"
	@echo "  make down             - Stop development environment"
	@echo "  make build            - Build docker images"
	@echo "  make logs             - Tail all logs"
	@echo "  make migrate          - Run Django migrations"
	@echo "  make makemigrations   - Create Django migrations"

build:
	docker-compose -f docker-compose.dev.yml build

up:
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

migrate:
	docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate

makemigrations:
	docker-compose -f docker-compose.dev.yml exec backend python manage.py makemigrations

shell-backend:
	docker-compose -f docker-compose.dev.yml exec backend bash

shell-frontend:
	docker-compose -f docker-compose.dev.yml exec frontend sh
