# Product & Solutions Sales Enablement Platform

A collaborative platform serving as the single source of truth for Product Marketing Managers (PMMs), Product teams, and Sales teams to manage, organize, and access product and solution sales materials.

## Features

### Core Quick Wins (Implementation Priority)

1. **Central Material Repository** - Single source of truth for all product and solution sales materials
2. **Collaborative Platform** - Shared workspace for Product and Sales teams
3. **Material Health Dashboard** - Track material freshness, completeness, and usage
4. **Sales Enablement Tracks** - Structured learning paths for products, solutions, and use cases
5. **Content Discovery** - Search and discover materials by keywords, product name, universe
6. **Usage Analytics** - Track material usage and effectiveness

## Technology Stack

- **Backend:** Python/FastAPI
- **Frontend:** React + TypeScript
- **Database:** PostgreSQL (for metadata)
- **File Storage:** Integration with cloud storage (SharePoint/Drive)
- **Authentication:** OAuth2/JWT

## Project Structure

```
Sales-Enablement/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── core/          # Core configuration
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/         # Utilities
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the application is using Docker:

```bash
# 1. Clone the repository
git clone <repository-url>
cd Sales-Enablement

# 2. Setup environment
make setup
# Or manually: cp .env.example .env
# Edit .env and set SECRET_KEY (generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# 3. Start all services
make up
# Or: docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3003
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker instructions.

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up .env file with SECRET_KEY
# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Development Status

🚧 **In Development** - Core features being implemented based on brainstorming session outcomes.

## Documentation

- [Brainstorming Session Results](./_bmad-output/brainstorming/brainstorming-session-2026-02-01.md)
- [Quick Wins Implementation Plans](./_bmad-output/brainstorming/brainstorming-session-2026-02-01.md#quick-win-identification)
