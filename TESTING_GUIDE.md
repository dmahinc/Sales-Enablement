# 🧪 Testing Guide - Sales Enablement API

## Quick Start Testing

### Method 1: Interactive API Documentation (Recommended)

The easiest way to test the API is using the built-in Swagger UI:

1. **Open your browser** and navigate to:
   ```
   http://localhost:8001/docs
   ```

2. **Login first:**
   - Expand the `POST /api/auth/login` endpoint
   - Click "Try it out"
   - Enter:
     - `username`: `admin@ovhcloud.com`
     - `password`: `admin123`
   - Click "Execute"
   - Copy the `access_token` from the response

3. **Authorize:**
   - Click the "Authorize" button at the top
   - Paste your token in the `Value` field
   - Click "Authorize" then "Close"

4. **Test endpoints:**
   - Now you can test any endpoint by clicking "Try it out"
   - All requests will automatically include your authentication token

---

## Method 2: Using cURL Commands

### Step 1: Login and Get Token

```bash
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ovhcloud.com&password=admin123"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Step 2: Use the Token for Authenticated Requests

Replace `YOUR_TOKEN` with the token from Step 1:

```bash
# Get current user
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List materials
curl -X GET "http://localhost:8001/api/materials" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List personas
curl -X GET "http://localhost:8001/api/personas" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List segments
curl -X GET "http://localhost:8001/api/segments" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get health dashboard
curl -X GET "http://localhost:8001/api/health/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Method 3: Using the Test Script

Run the automated test script:

```bash
cd /home/ubuntu/Sales-Enablement
./test_api.sh
```

This script will:
- ✅ Test API health
- ✅ Test user registration
- ✅ Test login
- ✅ Test authenticated endpoints
- ✅ Test all major API routes

---

## Method 4: Using Python Requests

Create a test file `test_api.py`:

```python
import requests

BASE_URL = "http://localhost:8001"
EMAIL = "admin@ovhcloud.com"
PASSWORD = "admin123"

# 1. Login
response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": EMAIL, "password": PASSWORD}
)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Get current user
response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
print("Current user:", response.json())

# 3. List materials
response = requests.get(f"{BASE_URL}/api/materials", headers=headers)
print("Materials:", response.json())

# 4. Create a material
material_data = {
    "name": "Test Product Brief",
    "material_type": "product_brief",
    "product_name": "Test Product",
    "universe_name": "Compute",
    "audience": "internal",
    "status": "draft"
}
response = requests.post(
    f"{BASE_URL}/api/materials",
    json=material_data,
    headers=headers
)
print("Created material:", response.json())
```

Run it:
```bash
cd backend
source venv/bin/activate
python test_api.py
```

---

## Method 5: Using Postman or Insomnia

1. **Import the OpenAPI schema:**
   - Download: `http://localhost:8001/openapi.json`
   - Import into Postman/Insomnia

2. **Set up authentication:**
   - Create an environment variable `token`
   - Login endpoint → Save token to variable
   - Set Authorization header: `Bearer {{token}}`

3. **Test endpoints** using the imported collection

---

## Testing Specific Features

### Authentication Flow

```bash
# 1. Register (optional - admin already exists)
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ovhcloud.com",
    "full_name": "Test User",
    "password": "test123",
    "role": "pmm"
  }'

# 2. Login
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ovhcloud.com&password=admin123" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# 3. Use token
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Materials Management

```bash
# Create material
curl -X POST "http://localhost:8001/api/materials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Portfolio Presentation",
    "material_type": "product_portfolio",
    "product_name": "Public Cloud",
    "universe_name": "Compute",
    "audience": "internal",
    "status": "draft"
  }'

# List materials
curl -X GET "http://localhost:8001/api/materials" \
  -H "Authorization: Bearer $TOKEN"

# Get specific material
curl -X GET "http://localhost:8001/api/materials/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Personas Management

```bash
# Create persona
curl -X POST "http://localhost:8001/api/personas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CTO",
    "description": "Chief Technology Officer",
    "characteristics": "Tech-savvy, strategic",
    "pain_points": "Cost optimization, scalability",
    "buying_behavior": "Long-term planning",
    "messaging_preferences": "Technical depth"
  }'

# List personas
curl -X GET "http://localhost:8001/api/personas" \
  -H "Authorization: Bearer $TOKEN"
```

### Health Dashboard

```bash
# Get dashboard data
curl -X GET "http://localhost:8001/api/health/dashboard" \
  -H "Authorization: Bearer $TOKEN"

# Get material health
curl -X GET "http://localhost:8001/api/health/material/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Discovery System

```bash
# Search narratives
curl -X GET "http://localhost:8001/api/discovery/search?q=cloud" \
  -H "Authorization: Bearer $TOKEN"

# Search by use case
curl -X GET "http://localhost:8001/api/discovery/by-use-case/disaster-recovery" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Expected Responses

### Successful Login
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Current User
```json
{
  "id": 1,
  "email": "admin@ovhcloud.com",
  "full_name": "Admin User",
  "role": "admin",
  "is_active": true,
  "is_superuser": true
}
```

### Materials List
```json
[]
```

(Empty array initially - create materials to see data)

---

## Troubleshooting

### 401 Unauthorized
- Check that you're including the `Authorization: Bearer TOKEN` header
- Verify your token hasn't expired (default: 30 minutes)
- Re-login to get a new token

### 404 Not Found
- Verify the endpoint path is correct
- Check that the server is running: `curl http://localhost:8001/docs`

### 500 Internal Server Error
- Check server logs: `tail -f /tmp/backend.log`
- Verify database connection
- Check that all required fields are provided

---

## Quick Test Checklist

- [ ] API is running (`http://localhost:8001/docs` loads)
- [ ] Can login and get token
- [ ] Can get current user info
- [ ] Can list materials (empty initially)
- [ ] Can create a material
- [ ] Can list personas
- [ ] Can create a persona
- [ ] Can access health dashboard
- [ ] Can search discovery

---

**Happy Testing! 🚀**
