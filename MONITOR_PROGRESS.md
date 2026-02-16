# How to Monitor Executive Summary Generation Progress

## Real-Time Monitoring

### Option 1: Watch Backend Logs (Recommended)

Open a terminal and run this command to see step-by-step progress:

```bash
docker logs -f sales-enablement-backend | grep -E "STEP|ERROR|SUCCESS|executive|summary"
```

You'll see output like:
```
[STEP 1/4] Executive summary request received for material 20
[STEP 2/4] Starting text extraction for material 20
[STEP 2/4] File found: /app/storage/...
[STEP 2/4] Extracting text from pdf file...
[STEP 3/4] Extracted 5000 characters. Calling AI service...
[STEP 3/4] Sending request to AI endpoint...
[STEP 4/4] Successfully generated summary (250 characters)
[SUCCESS] Returning summary for material 20
```

### Option 2: Watch All Backend Logs

```bash
docker logs -f sales-enablement-backend
```

This shows everything, including errors and detailed information.

## Frontend Progress Indicators

The frontend now shows:
1. **Initializing...** (0-8 seconds)
2. **Extracting text from document...** (8-16 seconds)
3. **Sending to AI service...** (16-24 seconds)
4. **Generating summary...** (24+ seconds)

These update automatically every 8 seconds to show progress.

## Troubleshooting

### If it's stuck on "Initializing..."
- Check if the request reached the backend: `docker logs sales-enablement-backend --tail 50`
- Verify the material ID is correct
- Check network connectivity

### If it's stuck on "Extracting text..."
- The file might be large or corrupted
- Check logs for extraction errors
- Verify file format is supported (PDF, DOCX, PPTX)

### If it's stuck on "Sending to AI service..."
- Check AI endpoint configuration
- Verify API key is valid
- Check network connectivity to AI endpoint
- Look for 301/302 redirect errors in logs

### If it times out after 35 seconds
- Check backend logs for the exact error
- Verify AI endpoint URL is correct
- Check if AI service is responding

## Quick Status Check

```bash
# Check if backend is running
docker ps | grep sales-enablement-backend

# Check recent errors
docker logs sales-enablement-backend --tail 100 | grep -i error

# Check AI configuration
docker exec sales-enablement-backend python -c "from app.core.config import settings; print(f'AI Enabled: {settings.OVH_AI_ENABLED}'); print(f'Endpoint: {settings.OVH_AI_ENDPOINT_URL}'); print(f'Model: {settings.OVH_AI_MODEL}')"
```
