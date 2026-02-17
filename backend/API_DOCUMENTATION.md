# Products & Solutions Enablement API Documentation

## Overview

The Products & Solutions Enablement API is a RESTful API built with FastAPI for managing sales enablement materials, product hierarchies, user management, and analytics.

**Base URL:** `http://localhost:8001` (development) or `https://91.134.72.199:8443` (production)

**API Version:** 1.0.0

**Interactive Documentation:**
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`
- OpenAPI JSON: `http://localhost:8001/openapi.json`

## Authentication

The API uses JWT-based authentication with a custom challenge-response mechanism.

### Authentication Flow

1. **Get Challenge** - `POST /api/data/challenge`
   - Request a challenge token
   - Returns: `{ "challenge_id": "...", "challenge": "..." }`

2. **Exchange Credentials** - `POST /api/data/exchange`
   - Send email, password, challenge_id, and response hash
   - Returns: `{ "token": "JWT_TOKEN" }`

3. **Use Token** - Include in Authorization header:
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```

### Token Expiration

- Default expiration: 24 hours (1440 minutes)
- Configured via `ACCESS_TOKEN_EXPIRE_MINUTES` environment variable

## Standardized Error Response Format

All errors follow a consistent format:

```json
{
    "success": false,
    "error": "ErrorType",
    "message": "Human-readable error message",
    "status_code": 400,
    "details": [
        {
            "field": "email",
            "message": "Invalid email format",
            "code": "INVALID_EMAIL"
        }
    ],
    "timestamp": "2026-02-16T22:00:00Z",
    "path": "/api/endpoint"
}
```

### Error Types

- **ValidationError** (400/422): Invalid input data
- **UnauthorizedError** (401): Authentication required
- **ForbiddenError** (403): Insufficient permissions
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Resource conflict (e.g., duplicate email)
- **InternalServerError** (500): Unexpected server error

## API Endpoints

### Health & Status

#### `GET /`
Get API information and status.

**Response:**
```json
{
    "message": "Products & Solutions Enablement API",
    "version": "1.0.0",
    "status": "running"
}
```

#### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
    "status": "healthy"
}
```

### Materials

#### `POST /api/materials`
Create a new material (metadata only).

**Authentication:** Required

**Request Body:**
```json
{
    "name": "Product One-Pager",
    "description": "One-page overview",
    "type": "one-pager",
    "universe_id": 1,
    "category_id": 2,
    "product_id": 3,
    "status": "draft"
}
```

**Response:** `201 Created`
```json
{
    "id": 1,
    "name": "Product One-Pager",
    ...
}
```

#### `GET /api/materials`
List all materials with optional filters.

**Authentication:** Required

**Query Parameters:**
- `universe_id` (optional): Filter by universe
- `category_id` (optional): Filter by category
- `product_id` (optional): Filter by product
- `status` (optional): Filter by status (draft, published, archived)
- `search` (optional): Search in name/description

**Response:** `200 OK`
```json
[
    {
        "id": 1,
        "name": "Product One-Pager",
        ...
    }
]
```

#### `GET /api/materials/{material_id}`
Get a specific material by ID.

**Authentication:** Required

**Response:** `200 OK`

#### `PUT /api/materials/{material_id}`
Update a material.

**Authentication:** Required

#### `DELETE /api/materials/{material_id}`
Delete a material.

**Authentication:** Required

#### `POST /api/materials/upload`
Upload a file for a material.

**Authentication:** Required

**Request:** `multipart/form-data`
- `material_id`: Material ID
- `file`: File to upload

### Shared Links

#### `POST /api/shared-links`
Create a new shared link for a material.

**Authentication:** Required

**Request Body:**
```json
{
    "material_id": 1,
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "expires_in_days": 90
}
```

**Response:** `201 Created`
```json
{
    "id": 1,
    "unique_token": "abc123...",
    "share_url": "http://platform.com/share/abc123...",
    ...
}
```

#### `GET /api/shared-links/token/{token}`
Get shared link information by token (PUBLIC).

**Authentication:** Not required

**Response:** `200 OK`
```json
{
    "unique_token": "abc123...",
    "material_name": "Product One-Pager",
    "share_url": "...",
    ...
}
```

#### `GET /api/shared-links/token/{token}/download`
Download material file via shared link (PUBLIC).

**Authentication:** Not required

**Response:** `200 OK` (file download)

#### `POST /api/shared-links/{link_id}/send-email`
Send email notification with shared link.

**Authentication:** Required

**Query Parameters:**
- `customer_email` (optional): Override email address

**Response:** `200 OK`
```json
{
    "message": "Email sent successfully",
    "email": "customer@example.com"
}
```

### Products

#### `GET /api/products/universes`
List all product universes.

**Authentication:** Required

**Query Parameters:**
- `include_inactive` (optional): Include inactive universes

**Response:** `200 OK`
```json
[
    {
        "id": 1,
        "name": "public-cloud",
        "display_name": "Public Cloud",
        ...
    }
]
```

#### `GET /api/products/categories`
List all product categories.

**Authentication:** Required

**Query Parameters:**
- `universe_id` (optional): Filter by universe
- `include_inactive` (optional): Include inactive categories

#### `GET /api/products`
List all products.

**Authentication:** Required

**Query Parameters:**
- `universe_id` (optional): Filter by universe
- `category_id` (optional): Filter by category
- `include_inactive` (optional): Include inactive products

#### `GET /api/products/{product_id}`
Get a specific product by ID.

**Authentication:** Required

### Users

#### `POST /api/users`
Create a new user account (Admin only).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "secure_password",
    "full_name": "John Doe",
    "role": "sales"
}
```

**Roles:**
- `admin`: Full access
- `pmm`: Product Marketing Manager
- `sales`: Sales team member
- `director`: Director level access

**Response:** `201 Created`

#### `GET /api/users`
List all users.

**Authentication:** Required (Admin)

#### `GET /api/users/{user_id}`
Get a specific user.

**Authentication:** Required (Admin)

#### `PUT /api/users/{user_id}`
Update a user.

**Authentication:** Required (Admin)

#### `DELETE /api/users/{user_id}`
Delete a user.

**Authentication:** Required (Admin)

### Analytics

#### `GET /api/analytics/usage`
Get material usage analytics.

**Authentication:** Required

**Query Parameters:**
- `start_date` (optional): Start date (ISO format)
- `end_date` (optional): End date (ISO format)
- `material_id` (optional): Filter by material

**Response:** `200 OK`
```json
{
    "total_views": 150,
    "total_downloads": 45,
    "daily_rate": 5.2,
    "weekly_rate": 36.4,
    "monthly_rate": 156.0,
    ...
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

## CORS

CORS is configured to allow requests from:
- `http://localhost:3003` (development frontend)
- `https://91.134.72.199:3443` (production frontend)
- Additional origins configured via `CORS_ORIGINS` environment variable

## Email Configuration

Email notifications require SMTP configuration:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Products & Solutions Enablement
SMTP_USE_TLS=true
PLATFORM_URL=http://your-frontend-url
```

## Best Practices

1. **Always include Authorization header** for authenticated endpoints
2. **Handle errors gracefully** using the standardized error format
3. **Validate input** on the client side before sending requests
4. **Use appropriate HTTP methods** (GET for reads, POST for creates, PUT for updates, DELETE for deletes)
5. **Include proper Content-Type headers** for file uploads
6. **Respect rate limits** (when implemented)
7. **Use pagination** for large result sets (when implemented)

## Support

For issues or questions, contact: support@ovhcloud.com

## Changelog

### Version 1.0.0 (2026-02-16)
- Initial API release
- Standardized error response format
- Comprehensive API documentation
- OpenAPI/Swagger integration
