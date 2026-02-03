.PHONY: help build up down restart logs clean

help:
	@echo "Available commands:"
	@echo "  make build    - Build Docker images"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs"
	@echo "  make clean    - Remove containers, volumes, and images"
	@echo "  make setup    - Initial setup (copy .env.example, generate SECRET_KEY)"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	docker-compose down -v --rmi all

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file from .env.example"; \
		echo "⚠️  Please edit .env and set SECRET_KEY"; \
		python3 -c "import secrets; print('Generated SECRET_KEY:', secrets.token_urlsafe(32))"; \
	else \
		echo "⚠️  .env file already exists"; \
	fi
