# 🧪 Quick Testing Guide

## ✅ Backend Server Status

**Server is running on:** `http://localhost:8001`

---

## Method 1: Interactive API Docs (Easiest!)

1. **Open in browser:**
   ```
   http://localhost:8001/docs
   ```

2. **Login:**
   - Click `POST /api/auth/login`
   - Click "Try it out"
   - Enter:
     - `username`: `admin@ovhcloud.com`
     - `password`: `admin123`
   - Click "Execute"
   - Copy the `access_token`

3. **Authorize:**
   - Click "Authorize" button (top right)
   - Paste token in `Value` field
   - Click "Authorize" → "Close"

4. **Test any endpoint** by clicking "Try it out"!

---

## Method 2: cURL Commands

### Step 1: Login
```bash
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ovhcloud.com&password=admin123"
```

**Save the token** from the response.

### Step 2: Test Endpoints (replace YOUR_TOKEN)

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

---

## Method 3: Automated Test Script

```bash
cd /home/ubuntu/Sales-Enablement
./test_api.sh
```

---

## Method 4: Python Script

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
```

---

## Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (get token)
- `GET /api/auth/me` - Get current user

### Materials
- `GET /api/materials` - List materials
- `POST /api/materials` - Create material
- `GET /api/materials/{id}` - Get material
- `POST /api/materials/upload` - Upload file

### Personas
- `GET /api/personas` - List personas
- `POST /api/personas` - Create persona

### Segments
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment

### Health Dashboard
- `GET /api/health/dashboard` - Dashboard data

### Discovery
- `GET /api/discovery/search?q=keyword` - Search narratives

---

## Login Credentials

- **Email:** `admin@ovhcloud.com`
- **Password:** `admin123`

---

**Happy Testing! 🚀**
