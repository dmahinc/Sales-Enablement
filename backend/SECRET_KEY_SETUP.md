# How to Set Up SECRET_KEY

## What is SECRET_KEY?

The `SECRET_KEY` is **NOT** a regular password. It's a cryptographic secret used to:
- **Sign JWT tokens** - Ensures tokens are authentic
- **Verify token integrity** - Prevents tampering
- **Secure authentication** - Critical for security

**Important:** 
- ❌ **Don't use** a simple password like "mypassword123"
- ❌ **Don't use** predictable values
- ✅ **Do use** a long, random, cryptographically secure string
- ✅ **Do keep** it secret and never commit it to git

---

## Step-by-Step Setup

### Step 1: Generate a Secure Secret Key

Run this command in your terminal:

```bash
cd backend
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

This will output something like:
```
z_kCU234Jq_3U5aqh6yI05c8IFSI_0CWFptgn46UggU
```

**Copy this value** - you'll need it in the next step.

---

### Step 2: Create or Update .env File

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Check if .env file exists:**
   ```bash
   ls -la .env
   ```

3. **If .env doesn't exist, create it:**
   ```bash
   touch .env
   ```

4. **Open .env in your editor:**
   ```bash
   nano .env
   # or
   vim .env
   ```

5. **Add the SECRET_KEY:**
   ```bash
   SECRET_KEY=z_kCU234Jq_3U5aqh6yI05c8IFSI_0CWFptgn46UggU
   ```

   **Replace** `z_kCU234Jq_3U5aqh6yI05c8IFSI_0CWFptgn46UggU` with your generated key.

6. **Add other required variables:**
   ```bash
   # Database
   DATABASE_URL=postgresql://postgres@localhost:5434/sales_enablement
   
   # Security (REQUIRED)
   SECRET_KEY=your-generated-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # CORS
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173
   
   # File Storage
   STORAGE_TYPE=local
   STORAGE_PATH=./storage
   ```

7. **Save and close** the file (Ctrl+X, then Y, then Enter for nano)

---

### Step 3: Verify It Works

Try starting the backend:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

**If SECRET_KEY is missing or invalid:**
- You'll see an error like: `Field required [type=value_error.missing]`
- This means you need to set SECRET_KEY in .env

**If SECRET_KEY is set correctly:**
- Backend should start successfully
- You'll see: `Application startup complete`

---

## Quick Setup Script

You can also use this one-liner to generate and add to .env:

```bash
cd backend
echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')" >> .env
```

Then edit `.env` to add other variables if needed.

---

## Security Best Practices

### ✅ DO:
- Generate a new random key for each environment (dev, staging, production)
- Use `secrets.token_urlsafe(32)` or similar cryptographically secure method
- Keep `.env` file in `.gitignore` (already done)
- Use different keys for different environments
- Rotate keys periodically in production

### ❌ DON'T:
- Use simple passwords
- Use predictable values (like "secret123")
- Commit `.env` to git
- Share the same key across environments
- Use short keys (< 32 characters)

---

## Troubleshooting

### Error: "Field required [type=value_error.missing]"

**Problem:** SECRET_KEY not found in environment

**Solution:**
1. Check that `.env` file exists in `backend/` directory
2. Verify SECRET_KEY is in the file (no typos)
3. Make sure you're running from the backend directory
4. Restart the backend server

### Error: "Invalid token" when logging in

**Problem:** SECRET_KEY changed after tokens were issued

**Solution:**
- Old tokens were signed with old key
- Users need to log in again
- This is normal when changing SECRET_KEY

### Backend starts but authentication fails

**Problem:** SECRET_KEY might be too short or weak

**Solution:**
- Generate a new key using `secrets.token_urlsafe(32)`
- Ensure it's at least 32 characters
- Restart backend

---

## Example .env File

Here's a complete example `.env` file:

```bash
# Application
APP_NAME=Sales Enablement API
DEBUG=True

# Database
DATABASE_URL=postgresql://postgres@localhost:5434/sales_enablement

# Security (REQUIRED - Generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))")
SECRET_KEY=z_kCU234Jq_3U5aqh6yI05c8IFSI_0CWFptgn46UggU
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage
```

---

## For Production

In production, use environment variables or a secrets manager:

```bash
# Set as environment variable
export SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')

# Or use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
```

**Never** hardcode secrets in code or commit them to version control!

---

*This SECRET_KEY is critical for security. Keep it secret!*
