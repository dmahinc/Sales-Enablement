# Technical Design Document

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Phase:** BMAD - ARCHITECT  
**Status:** Draft

---

## 1. Executive Summary

This document outlines the technical architecture for the Sales Enablement Platform. It covers system design decisions, technology choices, and implementation patterns to ensure a scalable, maintainable, and secure application.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    React SPA (TypeScript)                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Login   │ │Dashboard │ │Materials │ │ Personas │ │Discovery │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │              Shared Components (OVHcloud Design System)         │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Application (Python)                      │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                      API Router Layer                         │   │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐  │   │   │
│  │  │  │  Auth  │ │Material│ │Persona │ │Segment │ │Health/Disc.│  │   │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                      Core Services                            │   │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────────────┐ │   │   │
│  │  │  │Security│ │Database│ │ Config │ │   File Storage         │ │   │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────────────────────┘ │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQLAlchemy ORM
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                DATA LAYER                                    │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │      PostgreSQL Database    │    │       File System Storage       │    │
│  │  ┌───────┐ ┌───────┐       │    │  ┌───────────────────────────┐  │    │
│  │  │ Users │ │Mater- │       │    │  │    /storage/materials/    │  │    │
│  │  └───────┘ │ials   │       │    │  │    ├── 01_Internal/       │  │    │
│  │  ┌───────┐ └───────┘       │    │  │    ├── 02_Customer/       │  │    │
│  │  │Persona│ ┌───────┐       │    │  │    └── ...                │  │    │
│  │  └───────┘ │Segment│       │    │  └───────────────────────────┘  │    │
│  │            └───────┘       │    │                                  │    │
│  └─────────────────────────────┘    └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Clear layers: Presentation, Application, Data |
| **Single Responsibility** | Each module/component has one purpose |
| **DRY (Don't Repeat Yourself)** | Shared components, utilities, and services |
| **API-First** | Backend designed as independent REST API |
| **Security by Default** | JWT auth, input validation, CORS |
| **Progressive Enhancement** | Core functionality works, enhancements add value |

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **React** | 18.2 | UI Framework | Component-based, large ecosystem |
| **TypeScript** | 5.3 | Type Safety | Catch errors early, better DX |
| **Vite** | 5.0 | Build Tool | Fast HMR, modern bundling |
| **Tailwind CSS** | 3.3 | Styling | Utility-first, design system support |
| **React Router** | 6.20 | Routing | Declarative, nested routes |
| **React Query** | 5.12 | Server State | Caching, background updates |
| **Axios** | 1.6 | HTTP Client | Interceptors, error handling |
| **Lucide React** | 0.294 | Icons | Consistent, tree-shakeable |

### 3.2 Backend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Python** | 3.11+ | Runtime | Modern features, async support |
| **FastAPI** | 0.104 | Web Framework | Fast, modern, auto-docs |
| **SQLAlchemy** | 2.0 | ORM | Mature, flexible, async support |
| **Pydantic** | 2.5 | Validation | Type hints, serialization |
| **Alembic** | 1.13 | Migrations | Version-controlled schema |
| **bcrypt** | 4.1 | Password Hashing | Industry standard |
| **PyJWT** | 2.8 | JWT Tokens | Stateless auth |
| **psycopg2** | 2.9 | PostgreSQL Driver | Mature, reliable |

### 3.3 Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Database** | PostgreSQL 15 | Primary data store |
| **File Storage** | Local FS (MVP) → S3/Object Storage | Material files |
| **Web Server** | Uvicorn | ASGI server |
| **Reverse Proxy** | Nginx (production) | SSL, static files |

---

## 4. Component Architecture

### 4.1 Frontend Architecture

```
frontend/
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── App.tsx                  # Router configuration
│   ├── index.css                # Global styles + design tokens
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Layout.tsx           # Main app layout with nav
│   │   ├── Modal.tsx            # Generic modal wrapper
│   │   ├── FileUploadModal.tsx  # File upload specific modal
│   │   ├── MaterialForm.tsx     # Material CRUD form
│   │   ├── PersonaForm.tsx      # Persona CRUD form
│   │   └── SegmentForm.tsx      # Segment CRUD form
│   │
│   ├── pages/                   # Route-level components
│   │   ├── Login.tsx            # Authentication page
│   │   ├── Dashboard.tsx        # Overview/home page
│   │   ├── Materials.tsx        # Material management
│   │   ├── Personas.tsx         # Persona management
│   │   ├── Segments.tsx         # Segment management
│   │   ├── HealthDashboard.tsx  # Content health metrics
│   │   └── Discovery.tsx        # Search and discovery
│   │
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx      # Authentication state
│   │
│   ├── services/                # API communication
│   │   └── api.ts               # Axios instance + interceptors
│   │
│   └── utils/                   # Helper functions
│       └── (helpers)
│
├── tailwind.config.js           # Design system configuration
└── vite.config.ts               # Build configuration
```

### 4.2 Backend Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI application factory
│   │
│   ├── api/                     # API route handlers
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── materials.py         # Material CRUD + upload
│   │   ├── personas.py          # Persona CRUD
│   │   ├── segments.py          # Segment CRUD
│   │   ├── health.py            # Health metrics
│   │   └── discovery.py         # Search endpoints
│   │
│   ├── core/                    # Core application services
│   │   ├── config.py            # Settings/environment
│   │   ├── database.py          # Database connection
│   │   └── security.py          # Auth utilities
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── base.py              # Base model class
│   │   ├── user.py              # User model
│   │   ├── material.py          # Material model
│   │   ├── persona.py           # Persona model
│   │   ├── segment.py           # Segment model
│   │   └── associations.py      # Many-to-many tables
│   │
│   └── schemas/                 # Pydantic schemas
│       └── user.py              # User request/response schemas
│
├── alembic/                     # Database migrations
│   └── versions/                # Migration scripts
│
├── storage/                     # File storage directory
│   └── materials/               # Uploaded files
│
└── requirements.txt             # Python dependencies
```

---

## 5. Data Flow

### 5.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  FastAPI │     │ Security │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /login    │                │                │
     │ {email, pass}  │                │                │
     │───────────────▶│                │                │
     │                │ verify_password│                │
     │                │───────────────▶│                │
     │                │                │ get_user       │
     │                │                │───────────────▶│
     │                │                │◀───────────────│
     │                │                │ hash_check     │
     │                │◀───────────────│                │
     │                │ create_token   │                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │ {access_token} │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │ GET /api/...   │                │                │
     │ Auth: Bearer   │                │                │
     │───────────────▶│                │                │
     │                │ decode_token   │                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │ get_user       │                │
     │                │────────────────────────────────▶│
     │                │◀────────────────────────────────│
     │ {data}         │                │                │
     │◀───────────────│                │                │
```

### 5.2 File Upload Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  FastAPI │     │ Storage  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /upload   │                │                │
     │ multipart/form │                │                │
     │───────────────▶│                │                │
     │                │ validate file  │                │
     │                │ (size, type)   │                │
     │                │                │                │
     │                │ save to disk   │                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │ file_path      │                │
     │                │                │                │
     │                │ create record  │                │
     │                │────────────────────────────────▶│
     │                │◀────────────────────────────────│
     │                │ material_id    │                │
     │ {material}     │                │                │
     │◀───────────────│                │                │
```

---

## 6. Security Architecture

### 6.1 Authentication

| Aspect | Implementation |
|--------|----------------|
| **Method** | JWT (JSON Web Tokens) |
| **Token Storage** | localStorage (client-side) |
| **Token Lifetime** | 24 hours (configurable) |
| **Password Hashing** | bcrypt with auto-salting |
| **Token Refresh** | On app load, check expiration |

### 6.2 Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    Role-Based Access Control                 │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Resource   │     PMM      │    Sales     │    Admin      │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ Materials    │ CRUD         │ Read/Download│ Full          │
│ Personas     │ CRUD         │ Read         │ Full          │
│ Segments     │ CRUD         │ Read         │ Full          │
│ Users        │ Read Self    │ Read Self    │ CRUD          │
│ Health       │ Read         │ Read         │ Full          │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### 6.3 Security Measures

| Measure | Implementation |
|---------|----------------|
| **CORS** | Whitelist allowed origins |
| **Input Validation** | Pydantic schemas for all inputs |
| **SQL Injection** | SQLAlchemy ORM (parameterized queries) |
| **XSS Prevention** | React's built-in escaping |
| **File Upload** | Type checking, size limits |
| **HTTPS** | Required in production |

---

## 7. API Design

### 7.1 RESTful Conventions

| Method | Route Pattern | Purpose |
|--------|---------------|---------|
| GET | `/api/{resource}` | List all |
| GET | `/api/{resource}/{id}` | Get one |
| POST | `/api/{resource}` | Create |
| PUT | `/api/{resource}/{id}` | Update |
| DELETE | `/api/{resource}/{id}` | Delete |

### 7.2 Response Format

```json
// Success Response
{
  "id": 1,
  "name": "Example Material",
  "created_at": "2026-02-02T10:00:00Z",
  ...
}

// Error Response
{
  "detail": "Error message describing what went wrong"
}

// List Response
[
  { "id": 1, ... },
  { "id": 2, ... }
]
```

### 7.3 Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Invalid input format |
| 500 | Server Error | Unexpected error |

---

## 8. Performance Considerations

### 8.1 Frontend Optimization

| Technique | Implementation |
|-----------|----------------|
| **Code Splitting** | React.lazy for route-level components |
| **Caching** | React Query with stale-while-revalidate |
| **Bundle Size** | Tree shaking, minimal dependencies |
| **Images** | Lazy loading, optimized formats |

### 8.2 Backend Optimization

| Technique | Implementation |
|-----------|----------------|
| **Database Indexing** | Index on frequently queried columns |
| **Connection Pooling** | SQLAlchemy connection pool |
| **Pagination** | Limit/offset for list endpoints |
| **Query Optimization** | Eager loading for relationships |

### 8.3 Caching Strategy

```
┌────────────────────────────────────────────────────────────┐
│                    Caching Layers                           │
├────────────────────────────────────────────────────────────┤
│  Browser Cache    │ Static assets (CSS, JS, images)        │
│  React Query      │ API responses (5 min stale time)       │
│  (Future) Redis   │ Session data, computed metrics         │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Scalability Path

### 9.1 Current (MVP) vs Future

| Aspect | MVP | Future |
|--------|-----|--------|
| **Users** | ~50 concurrent | 500+ concurrent |
| **Files** | Local filesystem | Object Storage (S3) |
| **Database** | Single PostgreSQL | Read replicas |
| **Search** | SQL LIKE queries | Elasticsearch |
| **Caching** | React Query only | Redis layer |

### 9.2 Horizontal Scaling

```
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ API #1   │    │ API #2   │    │ API #3   │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │   Primary   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ Replica │  │ Replica │  │ Replica │
        └─────────┘  └─────────┘  └─────────┘
```

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
                    ┌───────────┐
                   /│   E2E     │\        Few, slow, valuable
                  / │  Tests    │ \
                 /  └───────────┘  \
                /   ┌───────────┐   \
               /    │Integration│    \     Some, medium speed
              /     │  Tests    │     \
             /      └───────────┘      \
            /       ┌───────────┐       \
           /        │   Unit    │        \   Many, fast
          /         │  Tests    │         \
         /          └───────────┘          \
        └──────────────────────────────────┘
```

### 10.2 Test Coverage Goals

| Layer | Coverage | Tools |
|-------|----------|-------|
| Unit (Backend) | 80% | pytest |
| Unit (Frontend) | 70% | Jest, Testing Library |
| Integration | 60% | pytest, httpx |
| E2E | Critical paths | Playwright |

---

## 11. Deployment Architecture

### 11.1 Development Environment

```
┌─────────────────────────────────────────────────────────┐
│                   Developer Machine                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Frontend     │  │ Backend      │  │ PostgreSQL   │  │
│  │ (Vite)       │  │ (Uvicorn)    │  │ (local)      │  │
│  │ :3000        │  │ :8001        │  │ :5432        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Production Environment (Future)

```
┌─────────────────────────────────────────────────────────┐
│                     Cloud Platform                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   Nginx                           │  │
│  │            (SSL, Static Files)                    │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        │                                │
│  ┌─────────────────────┼────────────────────────────┐  │
│  │     ┌───────────────┴───────────────┐            │  │
│  │     ▼                               ▼            │  │
│  │  ┌──────┐                      ┌──────┐          │  │
│  │  │ API  │◀────────────────────▶│ API  │          │  │
│  │  └──┬───┘                      └──┬───┘          │  │
│  │     │                             │              │  │
│  │     └─────────────┬───────────────┘              │  │
│  │                   ▼                              │  │
│  │            ┌──────────┐      ┌──────────┐       │  │
│  │            │PostgreSQL│      │  Object  │       │  │
│  │            │ (RDS)    │      │ Storage  │       │  │
│  │            └──────────┘      └──────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Decision Log

| # | Decision | Options Considered | Choice | Rationale |
|---|----------|-------------------|--------|-----------|
| 1 | Backend Framework | Django, Flask, FastAPI | FastAPI | Performance, modern async, auto-docs |
| 2 | Database | PostgreSQL, MySQL, MongoDB | PostgreSQL | Robust, complex queries, ACID |
| 3 | ORM | Raw SQL, SQLAlchemy, Tortoise | SQLAlchemy | Mature, 2.0 features, migrations |
| 4 | Frontend Framework | React, Vue, Angular | React | Team familiarity, ecosystem |
| 5 | State Management | Redux, Zustand, React Query | React Query | Server state focus, simpler |
| 6 | Styling | CSS Modules, Styled Components, Tailwind | Tailwind | Design system fit, utility-first |
| 7 | Auth | Session, JWT, OAuth | JWT | Stateless, scalable |
| 8 | File Storage | Local FS, S3 | Local FS (MVP) | Simple start, S3 ready |

---

## 13. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation with large files | Medium | High | Chunked uploads, background processing |
| Database connection exhaustion | Low | High | Connection pooling, monitoring |
| JWT token theft | Low | High | Short expiration, HTTPS only |
| File storage limits | Medium | Medium | Move to object storage |
| Search performance | Medium | Medium | Database indexing, future Elasticsearch |

---

## 14. Appendix

### A. Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/sales_enablement
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000,http://localhost:3003

# Frontend
VITE_API_URL=http://localhost:8001/api
```

### B. Dependencies Update Policy

- **Security patches**: Immediate
- **Minor versions**: Monthly review
- **Major versions**: Quarterly evaluation

---

*This Technical Design Document should be reviewed and approved before entering the DELIVER phase.*
