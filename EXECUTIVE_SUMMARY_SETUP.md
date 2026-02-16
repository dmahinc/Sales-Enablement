# Executive Summary Feature Setup

## Overview

The executive summary feature uses OVHcloud AI Endpoint to automatically generate concise summaries of sales materials when users preview them in the Browse view.

## Backend Setup

### Required Python Packages

Add these packages to your `requirements.txt`:

```txt
httpx>=0.24.0
PyPDF2>=3.0.0
python-docx>=1.0.0
python-pptx>=0.6.21
```

Install them with:
```bash
pip install httpx PyPDF2 python-docx python-pptx
```

### Environment Variables

Configure these in your `.env` file:

```env
# OVHcloud AI Endpoints Configuration
OVH_AI_ENABLED=true
OVH_AI_ENDPOINT_URL=https://your-ovh-ai-endpoint-url/v1/chat/completions
OVH_AI_API_KEY=your-api-key-here
OVH_AI_MODEL=Mistral-Small-3.2-24B-Instruct-2506
OVH_AI_CONFIDENCE_THRESHOLD=0.9
```

### API Endpoint

The feature adds a new endpoint:
- `GET /api/materials/{material_id}/executive-summary`

This endpoint:
1. Extracts text from the material's document (PDF, DOCX, PPTX)
2. Sends the text to OVHcloud AI Endpoint
3. Returns a concise executive summary

## Frontend Integration

The preview modal automatically fetches and displays the executive summary when:
- The modal is opened
- The material has an associated file
- The file format is supported (PDF, DOCX, PPTX)

The summary appears below the action buttons in the preview modal.

## Features

- **Automatic Generation**: Summary is generated on-demand when previewing materials
- **Loading State**: Shows a loading indicator while generating
- **Error Handling**: Gracefully handles errors (AI unavailable, file extraction issues, etc.)
- **Caching**: Summary is cached in component state during the session

## Supported File Formats

- PDF (`.pdf`)
- Word Documents (`.docx`, `.doc`)
- PowerPoint Presentations (`.pptx`, `.ppt`)

## Troubleshooting

### Summary Not Generating

1. Check that `OVH_AI_ENABLED=true` in your `.env` file
2. Verify `OVH_AI_ENDPOINT_URL` and `OVH_AI_API_KEY` are correctly set
3. Ensure the material has an associated file
4. Check backend logs for error messages

### File Extraction Issues

1. Ensure required packages are installed (`PyPDF2`, `python-docx`, `python-pptx`)
2. Verify the file format is supported
3. Check that the file is not corrupted or password-protected

### AI Endpoint Errors

1. Verify the endpoint URL is correct
2. Check API key is valid and has proper permissions
3. Ensure the model name matches your OVHcloud AI configuration
4. Check network connectivity to the AI endpoint
