# How to Check if AI Summary Generation is Working

## Real-time Log Monitoring

To see what's happening in real-time, run this command in a terminal:

```bash
docker logs -f sales-enablement-backend | grep -i "executive\|summary\|ai\|301\|error"
```

This will show you:
- When a request is received
- If the AI endpoint is being called
- Any errors or redirects
- When the summary is generated

## Common Issues and Solutions

### 1. 301 Redirect Error
**Symptom**: Logs show "AI endpoint returned status 301: redirecting"

**Solution**: The endpoint URL might need to be updated. Check:
- The endpoint URL format
- If HTTPS is required
- If the path is correct

### 2. Timeout
**Symptom**: Request times out after 30 seconds

**Solution**: 
- The AI service might be slow
- Check network connectivity
- The document might be too large

### 3. 503 Service Unavailable
**Symptom**: "AI service is temporarily unavailable"

**Solution**:
- AI endpoint might be down
- API key might be invalid
- Rate limits might be exceeded

## Quick Status Check

Run this to check if the backend can reach the AI endpoint:

```bash
docker exec sales-enablement-backend python -c "
from app.core.config import settings
print(f'AI Enabled: {settings.OVH_AI_ENABLED}')
print(f'Endpoint: {settings.OVH_AI_ENDPOINT_URL}')
print(f'Model: {settings.OVH_AI_MODEL}')
print(f'API Key present: {bool(settings.OVH_AI_API_KEY)}')
"
```

## Frontend Improvements

The frontend now:
- Shows a timeout message after 35 seconds
- Displays better error messages
- Cancels requests when modal closes
- Shows "This may take 20-30 seconds" message
