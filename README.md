# Product & Solutions Sales Enablement Platform

A comprehensive collaborative platform serving as the single source of truth for Product Marketing Managers (PMMs), Product teams, and Sales teams to manage, organize, and access product and solution sales materials.

## 🚀 Features

### Core Material Management

1. **Central Material Repository** - Single source of truth for all product and solution sales materials
   - Upload materials (PDF, PPTX, DOCX) up to 60GB
   - Batch upload with AI-powered analysis
   - Manual upload option with full control
   - Multiple versions support (warns if material type exists, blocks only if document name is identical)
   - Material organization by Universe → Category → Product hierarchy
   - Material types: Product Brief, Sales Deck, Datasheet, Case Study, White Paper, FAQ, Other

2. **Material Display & Formatting**
   - List View: Shows `<Product Name> • <Material Type>` as title, with file name in metadata
   - Browse View: Card-based display with same title format
   - PMM in Charge: Displayed in both views for accountability
   - Material type formatting: Shows description instead of "Other" when applicable

3. **Advanced Filtering**
   - Filter by Universe, Category, Product, Material Type, Status
   - Available in both List and Browse views
   - Search functionality across materials
   - Clear all filters option

### Product Hierarchy Management

- **Universe** → **Category** → **Product** structure
- Support for multiple universes: Public Cloud, Private Cloud, Bare Metal, Hosting & Collaboration
- Dynamic product hierarchy with cascading dropdowns
- Product completeness tracking

### Marketing Updates

A dedicated section for sharing marketing news and information with sales teams:

- **10 Categories** with subcategories:
  1. Competitive Intelligence (Competitor Product Updates, Competitive Positioning, Win/Loss Analysis, Market Share Data, Competitor Pricing)
  2. Market Trends & Insights (Industry Reports, Market Research, Technology Trends, Customer Behavior, Market Opportunities)
  3. Campaign & Messaging (New Campaign Launches, Messaging Updates, Value Propositions, Talking Points, Campaign Results)
  4. Customer Success Stories (Case Studies, Customer Testimonials, Use Cases, ROI Stories, Customer Spotlights)
  5. Content & Enablement (New Content Releases, Content Updates, Sales Playbooks, Training Materials, Content Best Practices)
  6. Events & Activities (Upcoming Events, Webinars, Trade Shows, Regional Activities, Event Recaps)
  7. Pricing & Promotions (Pricing Updates, Special Offers, Discount Programs, Bundle Deals, Promotional Campaigns)
  8. Win Themes & Battle Cards (Win Themes, Battle Cards, Objection Handling, Competitive Advantages, Differentiation Points)
  9. Industry & Vertical Insights (Vertical-Specific News, Industry Regulations, Vertical Use Cases, Industry Trends, Vertical Best Practices)
  10. Other

- **Features:**
  - HTML content support with sanitization
  - Priority levels (Critical, Important, Informational)
  - Target audience specification
  - Optional product hierarchy linkage
  - Published date and expiration date
  - Filtering by category, subcategory, universe, product, and date range
  - Grid display sorted by latest first

### Latest Product Releases

- Product release news management
- Respects product hierarchy (Universe → Category → Product)
- HTML content support for full release details
- Short description for card display
- Filtering by Universe, Category, Product, and date range
- Published date tracking
- Grid display sorted from latest to oldest

### Material Sharing & Tracking

- **Secure Shareable Links** - Generate unique tokens for customer access
- **Customer Engagement Timeline** - Track when materials are:
  - Shared with customers
  - Viewed by recipients
  - Downloaded
- Timeline displays: `<Product Name> • <Material Type>` for each event
- Customer information tracking (email, name)
- Link expiration and deactivation support

### Usage Analytics

- **Material Usage Rates** - Track total usage, daily rate, weekly rate, monthly rate
- **Tooltips** - Interactive explanations for usage metrics
- **Usage Dashboard** - Comprehensive analytics for material effectiveness
- **Health Tracking** - Monitor material freshness and completeness

### Sales Enablement Tracks

- Structured learning paths for products, solutions, and use cases
- Track progress and completion
- Organize materials into educational sequences

### AI-Powered Features

- **Batch AI Analysis** - Automatically analyze uploaded files to extract:
  - Material type
  - Product associations
  - Executive summaries
  - Key information
- **Individual File Processing** - Handles large batches efficiently
- **Manual Override** - Option to skip AI and fill information manually

### User Roles & Permissions

- **Admin** - Full system access
- **Director** - Monitoring and governance
  - View all materials
  - Access usage analytics
  - Manage team members
  - View health dashboards
- **PMM (Product Marketing Manager)** - Content management
  - Upload and manage materials
  - Create marketing updates and product releases
  - Link materials to themselves as PMM in charge
  - Access analytics
- **Sales** - Content consumption
  - Explore and discover materials
  - Download materials
  - Share materials with customers
  - View marketing updates and product releases

### File Management

- **Upload Progress** - Per-file progress bars (similar to Gmail UI)
- **Download Progress** - Progress tracking for large file downloads
- **No Timeout Limits** - Supports large files (up to 60GB)
- **File Type Support**: PDF, PPTX, PPT, DOCX, DOC
- **Batch Operations** - Upload multiple files simultaneously

## 🛠 Technology Stack

- **Backend:**
  - Python 3.11+
  - FastAPI (REST API framework)
  - SQLAlchemy (ORM)
  - Alembic (Database migrations)
  - PostgreSQL (Database)
  - Pydantic (Data validation)
  - JWT (Authentication)
  - smtplib (Email sending)
  - httpx (AI service integration)

- **Frontend:**
  - React 18+
  - TypeScript
  - Vite (Build tool)
  - React Router (Navigation)
  - React Query / TanStack Query (Data fetching & caching)
  - Tailwind CSS (Styling)
  - Lucide React (Icons)
  - Axios (HTTP client)
  - XMLHttpRequest (Progress tracking)
  - DOMPurify (HTML sanitization)

- **Infrastructure:**
  - Docker & Docker Compose
  - Nginx (Reverse proxy, HTTPS, static file serving)
  - SSL/TLS (HTTPS support)

- **AI Integration:**
  - OVHcloud AI Endpoints for content analysis

## 📁 Project Structure

```
Sales-Enablement/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── materials.py
│   │   │   ├── marketing_updates.py
│   │   │   ├── product_releases.py
│   │   │   ├── shared_links.py
│   │   │   ├── analytics.py
│   │   │   └── ...
│   │   ├── models/         # Database models
│   │   │   ├── material.py
│   │   │   ├── marketing_update.py
│   │   │   ├── product_release.py
│   │   │   └── ...
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── core/          # Core configuration
│   ├── alembic/           # Database migrations
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   │   ├── Materials.tsx
│   │   │   ├── MarketingUpdates.tsx
│   │   │   ├── ProductReleases.tsx
│   │   │   └── ...
│   │   ├── services/       # API services
│   │   └── contexts/       # React contexts (Auth)
│   ├── nginx-https.conf    # Nginx HTTPS configuration
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the application is using Docker:

```bash
# 1. Clone the repository
git clone https://github.com/dmahinc/Sales-Enablement.git
cd Sales-Enablement

# 2. Setup environment variables
# Backend: Copy backend/.env.example to backend/.env
# Frontend: Set VITE_API_URL=/api (default)

# 3. Start all services
docker-compose up -d

# 4. Run database migrations
docker exec sales-enablement-backend alembic upgrade head

# 5. Access the application
# Frontend: https://your-domain:3443 (or http://localhost:3003)
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up .env file with required variables:
# - SECRET_KEY (generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))")
# - DATABASE_URL
# - SMTP settings (optional)

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8001
```

#### Frontend Setup

```bash
cd frontend
npm install

# Set VITE_API_URL in .env (default: /api for production)

# Start development server
npm run dev
```

## 📡 API Endpoints

### Materials
- `GET /api/materials` - List materials (with filters)
- `GET /api/materials/{id}` - Get material details
- `POST /api/materials/upload` - Upload material file
- `POST /api/materials/batch/analyze` - Analyze files with AI
- `POST /api/materials/batch/upload` - Batch upload materials
- `PUT /api/materials/{id}` - Update material
- `DELETE /api/materials/{id}` - Delete material
- `GET /api/materials/{id}/download` - Download material file

### Marketing Updates
- `GET /api/marketing-updates` - List marketing updates (with filters)
- `GET /api/marketing-updates/categories` - Get categories and subcategories
- `GET /api/marketing-updates/{id}` - Get marketing update details
- `POST /api/marketing-updates` - Create marketing update
- `PUT /api/marketing-updates/{id}` - Update marketing update
- `DELETE /api/marketing-updates/{id}` - Delete marketing update

### Product Releases
- `GET /api/product-releases` - List product releases (with filters)
- `GET /api/product-releases/{id}` - Get product release details
- `POST /api/product-releases` - Create product release
- `PUT /api/product-releases/{id}` - Update product release
- `DELETE /api/product-releases/{id}` - Delete product release

### Shared Links
- `POST /api/shared-links` - Create shareable link
- `GET /api/shared-links/token/{token}` - Get shared link details (public)
- `GET /api/shared-links/{id}/timeline` - Get customer engagement timeline
- `POST /api/shared-links/{id}/deactivate` - Deactivate shared link

### Analytics
- `GET /api/analytics/usage` - Get usage analytics
- `GET /api/analytics/materials/{id}/usage` - Get material usage rates

### Products
- `GET /api/products/universes` - List universes
- `GET /api/products/categories` - List categories
- `GET /api/products` - List products (with filters)

### Users
- `GET /api/users/pmms` - List PMM users
- `GET /api/users` - List all users (admin only)

## 🔐 Authentication

The application uses JWT-based authentication with a custom challenge-response mechanism. Most endpoints require authentication except for public shared link endpoints.

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Error Responses

All errors follow a standardized format:
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human-readable error message",
  "status_code": 400,
  "details": [],
  "timestamp": "2026-02-19T21:00:00Z",
  "path": "/api/endpoint"
}
```

## 📊 Key Features Details

### Material Upload
- **Single Upload**: Upload one file at a time with full metadata
- **Batch Upload**: Upload multiple files with:
  - AI analysis option (automatic metadata extraction)
  - Manual mode (skip AI, fill metadata manually)
  - Per-file progress tracking
  - Individual file processing (no timeout limits)

### PMM in Charge
- Every material is linked to a PMM in charge
- Defaults to logged-in PMM when uploading
- Can be changed when editing materials
- Displayed in List and Browse views

### Material Title Format
- Display format: `<Product Name> • <Material Type>`
- File name shown in metadata section
- For "Other" type: Shows description instead of "Other"

### Customer Engagement Timeline
- Tracks all interactions with shared materials
- Shows: Shared → Viewed → Downloaded events
- Displays product name and material type for each event
- Customer information (email, name) displayed

### Filters
- **Materials**: Universe, Category, Product, Material Type, Status
- **Marketing Updates**: Category, Subcategory, Universe, Product Category, Product, Date Range
- **Product Releases**: Universe, Category, Product, Date Range

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@db:5432/sales_enablement
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
PLATFORM_URL=https://your-domain.com
CORS_ORIGINS=["https://your-domain.com"]
```

#### Frontend (.env)
```env
VITE_API_URL=/api
```

### File Size Limits
- Maximum upload size: **60GB** (configurable in Nginx and backend)
- No timeout limits for uploads/downloads
- Progress tracking for all file operations

## 📝 Database Migrations

The application uses Alembic for database migrations:

```bash
# Create a new migration
docker exec sales-enablement-backend alembic revision -m "description"

# Apply migrations
docker exec sales-enablement-backend alembic upgrade head

# Rollback one migration
docker exec sales-enablement-backend alembic downgrade -1
```

## 🧪 Development Status

✅ **Production Ready** - All core features implemented and tested.

### Completed Features
- ✅ Material management (CRUD, upload, download)
- ✅ Product hierarchy management
- ✅ Marketing Updates with categories
- ✅ Product Releases
- ✅ Material sharing with tracking
- ✅ Usage analytics
- ✅ Batch upload with AI
- ✅ PMM in charge tracking
- ✅ Customer engagement timeline
- ✅ Role-based access control
- ✅ HTML content support
- ✅ Progress tracking for uploads/downloads

## 📚 Documentation

- [API Documentation](./backend/API_DOCUMENTATION.md) - Complete API reference
- [User Guide](./docs/USER_GUIDE.md) - End-user documentation
- [Product Brief](./docs/PRODUCT_BRIEF.md) - Product overview and requirements
- [Technical Design](./docs/architecture/TECHNICAL_DESIGN.md) - Architecture details

## 🤝 Contributing

This is an internal OVHcloud project. For contributions, please contact the Product Marketing team.

## 📄 License

Proprietary - OVHcloud Internal Use Only

## 🆘 Support

For issues or questions, contact: support@ovhcloud.com

---

**Last Updated:** February 19, 2026  
**Version:** 1.0.0
