"""
OVHcloud AI Endpoint service for generating executive summaries
"""
import httpx
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def generate_executive_summary(document_text: str, material_name: str = "") -> Optional[str]:
    """
    Generate an executive summary using OVHcloud AI Endpoint
    
    Args:
        document_text: The extracted text content from the document
        material_name: Optional material name for context
        
    Returns:
        Executive summary text or None if generation fails
    """
    if not settings.OVH_AI_ENABLED:
        logger.warning("OVHcloud AI is not enabled in configuration")
        return None
    
    if not settings.OVH_AI_ENDPOINT_URL or not settings.OVH_AI_API_KEY:
        logger.warning("OVHcloud AI endpoint URL or API key not configured")
        return None
    
    if not document_text or len(document_text.strip()) < 50:
        logger.warning("Document text is too short to generate summary")
        return None
    
    try:
        # Prepare the prompt for executive summary in PMM format
        prompt = f"""Analyze the following sales enablement material and create a structured executive summary in the format a Product Marketing Manager (PMM) would use.

Material Name: {material_name if material_name else "Sales Material"}

Document Content:
{document_text[:8000]}  # Limit to 8000 chars to avoid token limits

Please create a structured executive summary with the following sections (use markdown formatting with ## for section headers):

## Product Description
Provide a brief 2-3 sentence description of the product or solution.

## Target Personas
Identify the primary target personas or customer segments (e.g., CTOs, DevOps Engineers, IT Directors, Business Decision Makers). If not explicitly stated, infer from the content.

## Main Use Cases
List 3-5 key use cases or scenarios where this product/solution is most valuable. Use bullet points with - or *.

## OVHcloud Differentiation
Highlight what makes OVHcloud's approach unique or different from competitors. Focus on key differentiators, unique features, or value propositions.

## Key Benefits
List 3-5 main benefits or value propositions. Use bullet points with - or *.

## Additional Information
Include any other relevant information such as technical highlights, integration capabilities, pricing considerations, or important notes that would be valuable for sales teams.

Format the response using markdown with ## headers for each section. Keep each section concise and focused. If information is not available in the document, indicate "Not specified in document" for that section.

Executive Summary:"""

        # Prepare the request payload for OVHcloud AI Endpoint
        # OVHcloud AI Endpoint uses OpenAI-compatible format
        payload = {
            "model": settings.OVH_AI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert sales enablement assistant. Your task is to create concise, professional executive summaries of sales materials."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 1000,  # Increased for structured format
            "temperature": 0.7
        }
        
        headers = {
            "Authorization": f"Bearer {settings.OVH_AI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Follow redirects and set timeout
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.post(
                    settings.OVH_AI_ENDPOINT_URL,
                    json=payload,
                    headers=headers
                )
            except httpx.TimeoutException:
                logger.error("Timeout (30s) while calling OVHcloud AI Endpoint")
                return None
            except httpx.RequestError as e:
                logger.error(f"Request error while calling OVHcloud AI Endpoint: {str(e)}")
                return None
            
            # Log response details for debugging
            print(f"[DEBUG] AI endpoint response status: {response.status_code}", flush=True)
            print(f"[DEBUG] Response URL after redirects: {response.url}", flush=True)
            logger.info(f"AI endpoint response status: {response.status_code}")
            logger.info(f"Final response URL: {response.url}")
            logger.info(f"AI endpoint response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check if response is JSON
                content_type = response.headers.get("content-type", "").lower()
                if "application/json" not in content_type:
                    logger.error(f"Unexpected content type: {content_type}")
                    logger.error(f"Response URL: {response.url}")
                    logger.error(f"Response preview (first 500 chars): {response.text[:500]}")
                    print(f"[ERROR] AI endpoint returned HTML instead of JSON. Status: {response.status_code}, URL: {response.url}", flush=True)
                    return None
                
                try:
                    result = response.json()
                except Exception as e:
                    logger.error(f"Failed to parse JSON response: {str(e)}. Response preview: {response.text[:500]}")
                    return None
                
                # Extract the summary from the response
                # OVHcloud AI Endpoint uses OpenAI-compatible format: {"choices": [{"message": {"content": "..."}}]}
                if "choices" in result and len(result["choices"]) > 0:
                    choice = result["choices"][0]
                    # Handle both OpenAI format and direct content format
                    if "message" in choice:
                        message = choice.get("message", {})
                        summary = message.get("content", "").strip()
                    elif "text" in choice:
                        summary = choice.get("text", "").strip()
                    else:
                        # Try direct content field
                        summary = choice.get("content", "").strip()
                    
                    if summary:
                        logger.info(f"Successfully generated executive summary for material: {material_name}")
                        return summary
                    else:
                        logger.warning("AI response did not contain summary content")
                elif "text" in result:
                    # Direct text response format
                    summary = result.get("text", "").strip()
                    if summary:
                        logger.info(f"Successfully generated executive summary for material: {material_name}")
                        return summary
                else:
                    logger.warning(f"Unexpected AI response format: {result}")
            elif response.status_code == 301 or response.status_code == 302:
                redirect_location = response.headers.get('Location', 'Not provided')
                logger.error(f"AI endpoint returned redirect ({response.status_code})")
                logger.error(f"Original URL: {settings.OVH_AI_ENDPOINT_URL}")
                logger.error(f"Redirect location: {redirect_location}")
                print(f"[ERROR] Endpoint URL is incorrect - got redirect {response.status_code} to: {redirect_location}", flush=True)
                print(f"[ERROR] The endpoint URL '{settings.OVH_AI_ENDPOINT_URL}' appears to be incorrect.", flush=True)
                print(f"[ERROR] OVHcloud AI Endpoints require a specific endpoint URL format.", flush=True)
                print(f"[ERROR] Please check your OVHcloud console for the correct endpoint URL.", flush=True)
            else:
                logger.error(f"AI endpoint returned status {response.status_code}")
                logger.error(f"Request URL: {response.url}")
                logger.error(f"Response headers: {dict(response.headers)}")
                logger.error(f"Response content type: {response.headers.get('content-type', 'unknown')}")
                logger.error(f"Response preview (first 500 chars): {response.text[:500]}")
                print(f"[ERROR] AI endpoint status {response.status_code}. Response type: {response.headers.get('content-type', 'unknown')}", flush=True)
                
    except httpx.TimeoutException:
        logger.error("Timeout while calling OVHcloud AI Endpoint")
    except httpx.RequestError as e:
        logger.error(f"Request error while calling OVHcloud AI Endpoint: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating executive summary: {str(e)}", exc_info=True)
    
    return None
