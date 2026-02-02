# 🧪 How to Test the Sales Enablement Application

## ✅ Backend Server Status

**Server is running on:** `http://localhost:8001`  
**Status:** ✅ Running and ready for testing!

---

## 🚀 Quick Start Testing

### Method 1: Interactive API Documentation (Recommended - Easiest!)

1. **Open your browser** and go to:
   ```
   http://localhost:8001/docs
   ```

2. **Login:**
   - Find `POST /api/auth/login` endpoint
   - Click "Try it out"
   - Enter:
     - `username`: `admin@ovhcloud.com`
     - `password`: `admin123`
   - Click "Execute"
   - Copy the `access_token` from the response

3. **Authorize:**
   - Click the green **"Authorize"** button at the top right
   - Paste your token in the `Value` field
   - Click "Authorize" then "Close"

4. **Test any endpoint:**
   - Now you can test any endpoint by clicking "Try it out"
   - All requests will automatically include your authentication token
   - Try:
     - `GET /api/auth/me` - Get your user info
     - `GET /api/materials` - List materials
     - `GET /api/personas` - List personas
     - `GET /api/segments` - List segments

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

### Step 2: Use Token for Authenticated Requests

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

# Health dashboard
curl -X GET "http://localhost:8001/api/health/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Quick One-Liner Test

```bash
# Login and test in one go
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ovhcloud.com&password=admin123" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Use the token
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Method 3: Using the Test Script

Run the automated test script:

```bash
cd /home/ubuntu/Sales-Enablement
./test_api.sh
```

---

## Method 4: Using Python

Create `test_api.py`:

```python
import requests

BASE_URL = "http://localhost:8001"

# Login
response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "admin@ovhcloud.com", "password": "admin123"}
)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test endpoints
print("Current user:", requests.get(f"{BASE_URL}/api/auth/me", headers=headers).json())
print("Materials:", requests.get(f"{BASE_URL}/api/materials", headers=headers).json())
print("Personas:", requests.get(f"{BASE_URL}/api/personas", headers=headers).json())
```

Run:
```bash
cd backend
source venv/bin/activate
pip install requests
python test_api.py
```

---

## 📋 Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (get token)
- `GET /api/auth/me` - Get current user info

### Materials
- `GET /api/materials` - List all materials
- `POST /api/materials` - Create new material
- `GET /api/materials/{id}` - Get specific material
- `PUT /api/materials/{id}` - Update material
- `DELETE /api/materials/{id}` - Delete material
- `POST /api/materials/upload` - Upload material file

### Personas
- `GET /api/personas` - List all personas
- `POST /api/personas` - Create new persona
- `GET /api/personas/{id}` - Get specific persona
- `POST /api/personas/{id}/approve` - Approve persona

### Segments
- `GET /api/segments` - List all segments
- `POST /api/segments` - Create new segment
- `GET /api/segments/{id}/personas` - Get segment personas

### Health Dashboard
- `GET /api/health/dashboard` - Get dashboard statistics
- `GET /api/health/material/{id}` - Get material health

### Discovery
- `GET /api/discovery/search?q=keyword` - Search narratives

---

## 🔐 Login Credentials

- **Email:** `admin@ovhcloud.com`
- **Password:** `admin123`

---

## ✅ Expected Test Results

### Successful Login Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Current User Response:
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

### Materials List (initially empty):
```json
[]
```

---

## 🎯 Testing Checklist

- [ ] API docs load (`http://localhost:8001/docs`)
- [ ] Can login and get token
- [ ] Can get current user info
- [ ] Can list materials (empty initially)
- [ ] Can create a material
- [ ] Can list personas
- [ ] Can create a persona
- [ ] Can list segments
- [ ] Can access health dashboard

---

## 🐛 Troubleshooting

### 401 Unauthorized
- Make sure you're including the `Authorization: Bearer TOKEN` header
- Token expires after 30 minutes - re-login if needed

### 500 Internal Server Error
- Check server logs: `tail -f /tmp/backend.log`
- Verify database is running: `sudo systemctl status postgresql`

### Connection Refused
- Verify server is running: `ps aux | grep uvicorn`
- Check port: `ss -tlnp | grep 8001`

---

**Happy Testing! 🚀**

For more details, see `TESTING_GUIDE.md`
