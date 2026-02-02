# Database Design Document

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Phase:** BMAD - ARCHITECT  
**Database:** PostgreSQL 15

---

## 1. Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SALES ENABLEMENT DATABASE ERD                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │        users         │
    ├──────────────────────┤
    │ PK id: SERIAL        │
    │    email: VARCHAR    │◄─────────────────────────────────┐
    │    hashed_password   │                                  │
    │    full_name         │                                  │
    │    role              │                                  │
    │    is_active         │                                  │
    │    is_superuser      │                                  │
    │    created_at        │                                  │
    │    updated_at        │                                  │
    └──────────────────────┘                                  │
                                                              │ FK owner_id
                                                              │
    ┌──────────────────────┐         ┌──────────────────────┐ │
    │      personas        │         │      materials       │─┘
    ├──────────────────────┤         ├──────────────────────┤
    │ PK id: SERIAL        │         │ PK id: SERIAL        │
    │    name: VARCHAR     │◄───┐    │    name: VARCHAR     │
    │    role              │    │    │    description       │
    │    description       │    │    │    material_type     │
    │    goals             │    │    │    audience          │
    │    challenges        │    │    │    product_name      │
    │    preferred_content │    │    │    universe_name     │
    │    created_at        │    │    │    file_path         │
    │    updated_at        │    │    │    file_name         │
    └──────────────────────┘    │    │    file_format       │
              ▲                 │    │    file_size         │
              │                 │    │    status            │
              │                 │    │    tags[]            │
              │                 │    │    keywords[]        │
    ┌─────────┴────────────┐    │    │    use_cases[]       │
    │material_persona_assoc│    │    │    pain_points[]     │
    ├──────────────────────┤    │    │    health_score      │
    │ FK material_id  ─────┼────┼───▶│    usage_count       │
    │ FK persona_id   ─────┼────┘    │    version           │
    └──────────────────────┘         │    last_updated      │
                                     │    completeness_score│
    ┌──────────────────────┐         │ FK owner_id          │
    │      segments        │         │    created_at        │
    ├──────────────────────┤         │    updated_at        │
    │ PK id: SERIAL        │◄───┐    └──────────────────────┘
    │    name: VARCHAR     │    │              ▲
    │    description       │    │              │
    │    industry          │    │    ┌─────────┴────────────┐
    │    company_size      │    │    │material_segment_assoc│
    │    region            │    │    ├──────────────────────┤
    │    key_drivers       │    └────┼── FK segment_id      │
    │    pain_points       │         │   FK material_id ────┼───┘
    │    buying_criteria   │         └──────────────────────┘
    │    created_at        │
    │    updated_at        │
    └──────────────────────┘


    ┌──────────────────────┐         ┌──────────────────────┐
    │   content_blocks     │         │content_block_usages  │
    ├──────────────────────┤         ├──────────────────────┤
    │ PK id: SERIAL        │◄────────┤ FK content_block_id  │
    │    name: VARCHAR     │         │ FK material_id  ─────┼──▶ materials
    │    content           │         │    slide_number      │
    │    block_type        │         │    usage_context     │
    │    category          │         │    created_at        │
    │    tags[]            │         └──────────────────────┘
    │    is_reusable       │
    │    created_at        │
    │    updated_at        │
    └──────────────────────┘

    ┌──────────────────────┐
    │material_health_history│
    ├──────────────────────┤
    │ PK id: SERIAL        │
    │ FK material_id  ─────┼──▶ materials
    │    health_score      │
    │    checked_at        │
    │    issues_found      │
    │    recommendations   │
    └──────────────────────┘
```

---

## 2. Table Definitions

### 2.1 Users Table

Primary table for user authentication and authorization.

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'pmm',
    is_active       BOOLEAN DEFAULT TRUE,
    is_superuser    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-incrementing ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email (login) |
| hashed_password | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| role | VARCHAR(50) | DEFAULT 'pmm' | User role (pmm, sales, admin) |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| is_superuser | BOOLEAN | DEFAULT FALSE | Admin privileges |
| created_at | TIMESTAMPTZ | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW | Last update timestamp |

### 2.2 Materials Table

Core table for sales enablement materials.

```sql
CREATE TYPE materialtype AS ENUM (
    'PRODUCT_BRIEF',
    'PRODUCT_SALES_ENABLEMENT_DECK',
    'PRODUCT_PORTFOLIO_PRESENTATION',
    'PRODUCT_SALES_DECK',
    'PRODUCT_DATASHEET',
    'PRODUCT_CATALOG'
);

CREATE TYPE materialaudience AS ENUM (
    'INTERNAL',
    'CUSTOMER_FACING',
    'BOTH'
);

CREATE TYPE materialstatus AS ENUM (
    'DRAFT',
    'REVIEW',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TABLE materials (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    material_type       materialtype NOT NULL,
    audience            materialaudience NOT NULL,
    product_name        VARCHAR(255),
    universe_name       VARCHAR(100),
    file_path           VARCHAR(500),
    file_name           VARCHAR(255),
    file_format         VARCHAR(20),
    file_size           BIGINT,
    version             VARCHAR(50),
    status              materialstatus DEFAULT 'DRAFT',
    tags                TEXT[],
    keywords            TEXT[],
    use_cases           TEXT[],
    pain_points         TEXT[],
    health_score        INTEGER DEFAULT 0,
    usage_count         INTEGER DEFAULT 0,
    completeness_score  INTEGER DEFAULT 0,
    last_updated        TIMESTAMP WITH TIME ZONE,
    owner_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_materials_owner ON materials(owner_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_materials_universe ON materials(universe_name);
CREATE INDEX idx_materials_type ON materials(material_type);
CREATE INDEX idx_materials_audience ON materials(audience);
CREATE INDEX idx_materials_tags ON materials USING GIN(tags);
CREATE INDEX idx_materials_keywords ON materials USING GIN(keywords);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-incrementing ID |
| name | VARCHAR(255) | NOT NULL | Material name |
| description | TEXT | | Detailed description |
| material_type | ENUM | NOT NULL | Type of material |
| audience | ENUM | NOT NULL | Target audience |
| product_name | VARCHAR(255) | | Associated product |
| universe_name | VARCHAR(100) | | Product universe |
| file_path | VARCHAR(500) | | Storage path |
| file_name | VARCHAR(255) | | Original filename |
| file_format | VARCHAR(20) | | File extension |
| file_size | BIGINT | | File size in bytes |
| version | VARCHAR(50) | | Version number |
| status | ENUM | DEFAULT 'DRAFT' | Workflow status |
| tags | TEXT[] | | Searchable tags |
| keywords | TEXT[] | | SEO keywords |
| use_cases | TEXT[] | | Use case scenarios |
| pain_points | TEXT[] | | Addressed pain points |
| health_score | INTEGER | DEFAULT 0 | Content health (0-100) |
| usage_count | INTEGER | DEFAULT 0 | Download count |
| completeness_score | INTEGER | DEFAULT 0 | Metadata completeness |
| last_updated | TIMESTAMPTZ | | Content last updated |
| owner_id | INTEGER | FK → users | Creator/owner |
| created_at | TIMESTAMPTZ | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW | Last update timestamp |

### 2.3 Personas Table

Buyer persona definitions.

```sql
CREATE TABLE personas (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    role               VARCHAR(100),
    description        TEXT,
    goals              TEXT,
    challenges         TEXT,
    preferred_content  TEXT,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_personas_name ON personas(name);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-incrementing ID |
| name | VARCHAR(100) | NOT NULL | Persona name |
| role | VARCHAR(100) | | Job title/role |
| description | TEXT | | Background info |
| goals | TEXT | | Business objectives |
| challenges | TEXT | | Pain points |
| preferred_content | TEXT | | Content preferences |
| created_at | TIMESTAMPTZ | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW | Last update timestamp |

### 2.4 Segments Table

Market segment definitions.

```sql
CREATE TABLE segments (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    industry         VARCHAR(100),
    company_size     VARCHAR(50),
    region           VARCHAR(50),
    key_drivers      TEXT,
    pain_points      TEXT,
    buying_criteria  TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_segments_name ON segments(name);
CREATE INDEX idx_segments_industry ON segments(industry);
CREATE INDEX idx_segments_region ON segments(region);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-incrementing ID |
| name | VARCHAR(100) | NOT NULL | Segment name |
| description | TEXT | | Detailed description |
| industry | VARCHAR(100) | | Target industry |
| company_size | VARCHAR(50) | | Company size range |
| region | VARCHAR(50) | | Geographic region |
| key_drivers | TEXT | | Business drivers |
| pain_points | TEXT | | Common pain points |
| buying_criteria | TEXT | | Purchase factors |
| created_at | TIMESTAMPTZ | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW | Last update timestamp |

### 2.5 Association Tables

Many-to-many relationships.

```sql
-- Materials to Personas
CREATE TABLE material_persona_association (
    material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    persona_id   INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (material_id, persona_id)
);

-- Materials to Segments
CREATE TABLE material_segment_association (
    material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    segment_id   INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    PRIMARY KEY (material_id, segment_id)
);
```

### 2.6 Content Blocks Table (Future)

Reusable content components.

```sql
CREATE TABLE content_blocks (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    block_type   VARCHAR(50),
    category     VARCHAR(100),
    tags         TEXT[],
    is_reusable  BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_block_usages (
    id               SERIAL PRIMARY KEY,
    content_block_id INTEGER NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
    material_id      INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    slide_number     INTEGER,
    usage_context    TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7 Health History Table (Future)

Track material health over time.

```sql
CREATE TABLE material_health_history (
    id              SERIAL PRIMARY KEY,
    material_id     INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    health_score    INTEGER NOT NULL,
    checked_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issues_found    TEXT[],
    recommendations TEXT[]
);

CREATE INDEX idx_health_history_material ON material_health_history(material_id);
CREATE INDEX idx_health_history_date ON material_health_history(checked_at);
```

---

## 3. Relationships Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    RELATIONSHIP MATRIX                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Entity A   │   Entity B   │     Type     │   Through      │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ User         │ Material     │ 1:N          │ owner_id       │
│ Material     │ Persona      │ N:N          │ association    │
│ Material     │ Segment      │ N:N          │ association    │
│ Material     │ ContentBlock │ N:N          │ usages table   │
│ Material     │ HealthHist   │ 1:N          │ material_id    │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Relationship Details

1. **User → Materials (1:N)**
   - One user can own many materials
   - `materials.owner_id` references `users.id`
   - ON DELETE SET NULL (preserve materials if user deleted)

2. **Material ↔ Persona (N:N)**
   - A material can target multiple personas
   - A persona can have multiple materials
   - Through `material_persona_association`

3. **Material ↔ Segment (N:N)**
   - A material can target multiple segments
   - A segment can have multiple materials
   - Through `material_segment_association`

---

## 4. Data Dictionary

### 4.1 Enum Types

#### materialtype
| Value | Description |
|-------|-------------|
| PRODUCT_BRIEF | Product overview document |
| PRODUCT_SALES_ENABLEMENT_DECK | Sales training presentation |
| PRODUCT_PORTFOLIO_PRESENTATION | Multi-product overview |
| PRODUCT_SALES_DECK | Customer-facing sales deck |
| PRODUCT_DATASHEET | Technical specifications |
| PRODUCT_CATALOG | Product catalog |

#### materialaudience
| Value | Description |
|-------|-------------|
| INTERNAL | Internal use only |
| CUSTOMER_FACING | For customer presentations |
| BOTH | Shared asset |

#### materialstatus
| Value | Description |
|-------|-------------|
| DRAFT | Work in progress |
| REVIEW | Pending approval |
| PUBLISHED | Active and available |
| ARCHIVED | No longer active |

### 4.2 Universe Values

| Universe | Description |
|----------|-------------|
| Public Cloud | OVHcloud Public Cloud services |
| Private Cloud | Hosted Private Cloud, vSphere |
| Bare Metal | Dedicated servers |
| Hosting & Collaboration | Web hosting, email, domains |

---

## 5. Indexing Strategy

### Primary Indexes

| Table | Index | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| users | idx_users_email | email | BTREE | Login lookup |
| materials | idx_materials_owner | owner_id | BTREE | User's materials |
| materials | idx_materials_status | status | BTREE | Status filtering |
| materials | idx_materials_universe | universe_name | BTREE | Universe filtering |
| materials | idx_materials_tags | tags | GIN | Tag search |
| materials | idx_materials_keywords | keywords | GIN | Keyword search |

### Query Optimization

```sql
-- Optimized query: Get materials by universe with status
EXPLAIN ANALYZE
SELECT * FROM materials 
WHERE universe_name = 'Public Cloud' 
AND status = 'PUBLISHED'
ORDER BY updated_at DESC
LIMIT 20;

-- Expected: Index Scan using idx_materials_universe
```

---

## 6. Migration Strategy

### Initial Migration

```python
# alembic/versions/001_initial_migration.py

def upgrade():
    # Create enum types
    op.execute("CREATE TYPE materialtype AS ENUM (...)")
    op.execute("CREATE TYPE materialaudience AS ENUM (...)")
    op.execute("CREATE TYPE materialstatus AS ENUM (...)")
    
    # Create tables
    op.create_table('users', ...)
    op.create_table('materials', ...)
    op.create_table('personas', ...)
    op.create_table('segments', ...)
    
    # Create association tables
    op.create_table('material_persona_association', ...)
    op.create_table('material_segment_association', ...)
    
    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'])
    # ... more indexes

def downgrade():
    # Drop in reverse order
    op.drop_table('material_segment_association')
    op.drop_table('material_persona_association')
    op.drop_table('segments')
    op.drop_table('personas')
    op.drop_table('materials')
    op.drop_table('users')
    op.execute("DROP TYPE materialstatus")
    op.execute("DROP TYPE materialaudience")
    op.execute("DROP TYPE materialtype")
```

### Future Migrations

| Version | Description | Tables Affected |
|---------|-------------|-----------------|
| 002 | Add content blocks | content_blocks, content_block_usages |
| 003 | Add health history | material_health_history |
| 004 | Add full-text search | materials (tsvector column) |
| 005 | Add audit logging | audit_logs |

---

## 7. Backup & Recovery

### Backup Strategy

```bash
# Daily backup script
pg_dump -h localhost -U postgres -d sales_enablement \
  --format=custom \
  --file=/backups/sales_enablement_$(date +%Y%m%d).backup

# Weekly full backup with compression
pg_dump -h localhost -U postgres -d sales_enablement \
  --format=custom \
  --compress=9 \
  --file=/backups/weekly/sales_enablement_$(date +%Y%m%d).backup
```

### Recovery Procedure

```bash
# Restore from backup
pg_restore -h localhost -U postgres -d sales_enablement \
  --clean \
  --if-exists \
  /backups/sales_enablement_20260202.backup
```

---

## 8. Performance Considerations

### Table Partitioning (Future)

For large deployments, partition materials by created_at:

```sql
-- Partition by month
CREATE TABLE materials (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE materials_2026_01 PARTITION OF materials
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE materials_2026_02 PARTITION OF materials
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Connection Pooling

```python
# SQLAlchemy connection pool configuration
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)
```

---

## 9. Security Considerations

### Data Protection

| Data Type | Protection |
|-----------|------------|
| Passwords | bcrypt hash (never stored plain) |
| File paths | Relative paths only |
| User data | Row-level access via owner_id |
| API access | JWT token required |

### SQL Injection Prevention

All queries use parameterized statements via SQLAlchemy ORM:

```python
# Safe - parameterized
db.query(Material).filter(Material.name == user_input).all()

# Never do this - vulnerable
db.execute(f"SELECT * FROM materials WHERE name = '{user_input}'")
```

---

*This database design document should be reviewed before implementing schema changes.*
