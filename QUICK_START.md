# Quick Start Guide

## 🚀 Sales Enablement Application - Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL:
# DATABASE_URL=postgresql://user:password@localhost/sales_enablement
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb sales_enablement

# Run migrations
alembic upgrade head
```

### 4. Create Initial Admin User

```python
# Run Python script or use API
python -c "
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@ovhcloud.com',
    full_name='Admin User',
    hashed_password=get_password_hash('admin123'),
    role='admin',
    is_active=True,
    is_superuser=True
)
db.add(admin)
db.commit()
print('Admin user created!')
"
```

### 5. Start Backend Server

```bash
uvicorn app.main:app --reload
```

Backend will run on: http://localhost:8000
API Docs: http://localhost:8000/docs

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Frontend will run on: http://localhost:3000

---

## First Login

1. Open http://localhost:3000
2. Login with:
   - Email: `admin@ovhcloud.com`
   - Password: `admin123`
3. You'll be redirected to the Dashboard

---

## Features Available

### ✅ Materials Management
- Upload materials
- View all materials
- Filter by type, product, universe
- Download materials
- View material health

### ✅ Personas Library
- View all personas
- Create new personas
- Approve personas (collaborative governance)
- See persona usage

### ✅ Segments Library
- View all segments
- Create new segments
- Approve segments
- See segment-persona mapping

### ✅ Health Dashboard
- View material health scores
- See health statistics
- Track material freshness
- Quarterly review data

### ✅ Narrative Discovery
- Search by keywords
- Search by use cases
- Search by pain points
- Tag materials for discovery

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (get token)
- `GET /api/auth/me` - Get current user

### Materials
- `GET /api/materials` - List materials
- `GET /api/materials/{id}` - Get material
- `POST /api/materials` - Create material
- `POST /api/materials/upload` - Upload file
- `GET /api/materials/{id}/download` - Download file
- `GET /api/materials/{id}/health` - Get health metrics

### Personas
- `GET /api/personas` - List personas
- `POST /api/personas` - Create persona
- `POST /api/personas/{id}/approve` - Approve persona

### Segments
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment
- `GET /api/segments/{id}/personas` - Get segment personas

### Health Dashboard
- `GET /api/health/dashboard` - Get dashboard data
- `GET /api/health/material/{id}` - Get material health
- `POST /api/health/material/{id}/record` - Record health
- `GET /api/health/quarterly-review` - Quarterly review

### Discovery
- `GET /api/discovery/search` - Search narratives
- `GET /api/discovery/by-use-case/{use_case}` - By use case
- `GET /api/discovery/by-pain-point/{pain_point}` - By pain point
- `POST /api/discovery/material/{id}/tag` - Tag material

---

## Next Steps

1. **Create PMM Users**
   - Register PMM users via API or create script
   - Set role to "pmm"

2. **Upload Materials**
   - Use the frontend upload feature
   - Or use API: `POST /api/materials/upload`

3. **Create Personas**
   - Start with Digital Starter, Digital Scalers, Corporates
   - Add sub-segments as needed

4. **Create Segments**
   - Define market segments
   - Link personas to segments

5. **Tag Materials**
   - Tag materials for discovery
   - Add keywords, use cases, pain points

---

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

### Import Errors
- Make sure virtual environment is activated
- Check Python path includes backend directory
- Verify all dependencies installed

### Frontend Not Connecting
- Check backend is running on port 8000
- Verify CORS settings in backend/config.py
- Check browser console for errors

---

## Development Commands

### Backend
```bash
# Run server
uvicorn app.main:app --reload

# Create migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

**Ready to start!** 🎉
