# Bitdefender Whitelist Instructions

## Problem
Bitdefender is blocking authentication requests even with HTTPS. This is a false positive - your application is legitimate.

## Solution: Whitelist the Endpoint

Since Bitdefender is blocking even HTTPS traffic, you need to whitelist your application endpoints.

### Option 1: Whitelist in Bitdefender Settings

1. **Open Bitdefender**
2. **Go to Protection → Firewall → Network Attack Defense**
3. **Add Exception/Whitelist:**
   - **URL Pattern:** `91.134.72.199:8443/api/auth/login`
   - **Or IP:** `91.134.72.199`
   - **Port:** `8443` (HTTPS backend)
   - **Type:** Allow/Whitelist

4. **Or disable "Privacy Threat" detection temporarily:**
   - Go to Protection → Privacy
   - Find "Password Stealer" or "Privacy Threat" detection
   - Add exception for `91.134.72.199`

### Option 2: Disable Network Attack Defense for Your Network

1. **Open Bitdefender**
2. **Go to Protection → Firewall**
3. **Network Attack Defense → Settings**
4. **Add your server IP to trusted/excluded IPs:**
   - `91.134.72.199`

### Option 3: Use Bitdefender Exclusion List

1. **Open Bitdefender**
2. **Settings → Exclusions**
3. **Add:**
   - **Process:** Your browser (Chrome, Firefox, etc.)
   - **Or URL:** `https://91.134.72.199:8443/*`
   - **Type:** Website/URL

### Option 4: Contact Bitdefender Support

Report this as a false positive:
- Your legitimate application is being blocked
- Provide URL: `https://91.134.72.199:8443`
- Request whitelisting

## Why This Happens

Bitdefender uses heuristics to detect password-stealing attempts. Even with HTTPS, it can detect:
- Endpoint patterns (`/api/auth/login`)
- Request patterns
- Response patterns

This is a **false positive** - your application is legitimate.

## Alternative: Use a Different Port

If whitelisting doesn't work, we can:
1. Move backend to a non-standard port (e.g., 9443 instead of 8443)
2. Use a completely different endpoint path
3. Set up a reverse proxy with a different domain

---
**Recommendation:** Whitelist `91.134.72.199` in Bitdefender's Network Attack Defense settings.
