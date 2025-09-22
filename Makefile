# Development scripts
dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

install-frontend:
	cd frontend && npm install

install-backend:
	cd backend && pip install -r requirements.txt

setup: install-frontend install-backend
	@echo "Setup complete! Run 'make dev-frontend' and 'make dev-backend' in separate terminals"

test-api:
	cd backend && python -m pytest

lint-frontend:
	cd frontend && npm run lint

format-frontend:
	cd frontend && npm run format

build-frontend:
	cd frontend && npm run build

clean:
	cd frontend && rm -rf node_modules dist
	cd backend && rm -rf __pycache__ *.db

.PHONY: dev-frontend dev-backend install-frontend install-backend setup test-api lint-frontend format-frontend build-frontend clean
