#!/bin/bash
# Test script for Sales Enablement API

BASE_URL="http://localhost:8001"
EMAIL="admin@ovhcloud.com"
PASSWORD="admin123"

echo "🧪 Testing Sales Enablement API"
echo "================================"
echo ""

# 1. Test API is running
echo "1️⃣ Testing API health..."
curl -s "$BASE_URL/docs" > /dev/null && echo "✅ API is running" || echo "❌ API is not running"
echo ""

# 2. Register a new user (optional - admin already exists)
echo "2️⃣ Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@ovhcloud.com\",
    \"full_name\": \"Test User\",
    \"password\": \"test123\",
    \"role\": \"pmm\"
  }")
echo "Response: $REGISTER_RESPONSE"
echo ""

# 3. Login and get token
echo "3️⃣ Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD")

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
else
  echo "✅ Login successful"
  echo "Token: ${TOKEN:0:50}..."
  echo ""
  
  # 4. Get current user
  echo "4️⃣ Testing /api/auth/me..."
  ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")
  echo "Response: $ME_RESPONSE"
  echo ""
  
  # 5. List materials
  echo "5️⃣ Testing /api/materials..."
  MATERIALS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/materials" \
    -H "Authorization: Bearer $TOKEN")
  echo "Response: $MATERIALS_RESPONSE"
  echo ""
  
  # 6. List personas
  echo "6️⃣ Testing /api/personas..."
  PERSONAS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/personas" \
    -H "Authorization: Bearer $TOKEN")
  echo "Response: $PERSONAS_RESPONSE"
  echo ""
  
  # 7. List segments
  echo "7️⃣ Testing /api/segments..."
  SEGMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/segments" \
    -H "Authorization: Bearer $TOKEN")
  echo "Response: $SEGMENTS_RESPONSE"
  echo ""
  
  # 8. Health dashboard
  echo "8️⃣ Testing /api/health/dashboard..."
  HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/health/dashboard" \
    -H "Authorization: Bearer $TOKEN")
  echo "Response: $HEALTH_RESPONSE"
  echo ""
fi

echo "✅ Testing complete!"
