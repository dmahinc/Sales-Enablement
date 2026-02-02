# Sales Enablement Application

A comprehensive platform for Product Marketing Managers (PMMs) to manage, organize, and optimize sales enablement materials.

## Features

### Core Quick Wins (Implementation Priority)

1. **Central Material Repository** - Centralized storage and organization of all sales enablement materials
2. **Shared Persona Library** - Collaborative persona definitions and management
3. **Market Segments Library** - Standardized market segment definitions
4. **Material Health Dashboard** - Track material freshness, completeness, and usage
5. **Narrative Discovery System** - Search and discover existing narratives by keywords, use cases, pain points
6. **Content Block Marketplace** - Reusable content blocks with ratings and comments

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

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Development Status

🚧 **In Development** - Core features being implemented based on brainstorming session outcomes.

## Documentation

- [Brainstorming Session Results](./_bmad-output/brainstorming/brainstorming-session-2026-02-01.md)
- [Quick Wins Implementation Plans](./_bmad-output/brainstorming/brainstorming-session-2026-02-01.md#quick-win-identification)
