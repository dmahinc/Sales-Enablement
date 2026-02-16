# OVHcloud AI Endpoints Setup Guide

## Current Issue

The endpoint URL `https://endpoints.ai.cloud.ovh.net/v1/chat/completions` is returning redirects/HTML instead of JSON responses.

## Understanding OVHcloud AI Endpoints

OVHcloud AI Endpoints works in two steps:
1. **Create an Endpoint Instance** - You need to create an endpoint instance for a specific model
2. **Use the Endpoint URL** - Each endpoint instance has its own unique URL

## How to Find/Create Your Endpoint

### Option 1: Check OVHcloud Manager

1. Log into **OVHcloud Manager** (https://www.ovh.com/manager/)
2. Go to **Public Cloud** → **AI & Machine Learning** → **AI Endpoints**
3. Look for **"Endpoints"** or **"My Endpoints"** section
4. If you see any endpoints listed, click on one to see its details
5. Look for **"Endpoint URL"**, **"API URL"**, or **"Base URL"** field
6. It might look like:
   - `https://abc123xyz.endpoints.ai.cloud.ovh.net/v1/chat/completions`
   - Or a different format

### Option 2: Create a New Endpoint

If you don't have an endpoint yet:

1. In OVHcloud Manager → **Public Cloud** → **AI Endpoints**
2. Click **"Create Endpoint"** or **"New Endpoint"**
3. Select a model (e.g., `gpt-oss-20b` or `Mistral-Small-3.2-24B-Instruct-2506`)
4. Configure the endpoint
5. Once created, copy the **Endpoint URL** from the endpoint details

### Option 3: Check API Documentation

The API documentation might have examples:
- Visit: https://endpoints.ai.cloud.ovh.net/docs
- Look for endpoint URL examples or API reference

## Alternative: Try Different URL Formats

Based on common patterns, try these formats:

1. **With endpoint ID in subdomain:**
   ```
   https://{endpoint-id}.endpoints.ai.cloud.ovh.net/v1/chat/completions
   ```

2. **With endpoint ID in path:**
   ```
   https://endpoints.ai.cloud.ovh.net/{endpoint-id}/v1/chat/completions
   ```

3. **Different base URL:**
   ```
   https://ai.cloud.ovh.net/endpoints/{endpoint-id}/v1/chat/completions
   ```

## What We Know

✅ **Working:**
- Your API key (PAT token) is valid
- Text extraction is working
- Backend is processing requests correctly

❌ **Not Working:**
- Endpoint URL format is incorrect
- Need the specific endpoint instance URL

## Next Steps

1. **Check OVHcloud Manager** for existing endpoints
2. **Create an endpoint** if none exists
3. **Copy the endpoint URL** from the endpoint details
4. **Update the `.env` file** with the correct URL
5. **Restart the backend**

Once you have the correct endpoint URL, we can update the configuration and test it!
