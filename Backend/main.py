from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Dict, List, Any, Optional
import os
import json
import datetime
import requests
import re
import asyncio
import aiohttp
from dotenv import load_dotenv
import PyPDF2
import io

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Document Generation API",
    description="API for generating documents using AI",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# Configure CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Required for WebSockets
    allow_methods=["*"],
    allow_headers=["*"],
)

# Retrieve API key securely
OPENROUTER_API_KEY = "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"
if not OPENROUTER_API_KEY:
    raise ValueError("API Key not found! Set OPENROUTER_API_KEY in environment variables.")

# Document types and required fields
DOCUMENT_TYPES = {
    "GuestLecture": [
        "Guest Name",
        "Guest Designation",
        "Event Date",
        "Activity Code",
        "Year",
        "No Of Count",
        "Organizer Department",
        "Organizer Faculty Name",
        "Topic"
    ],
}

# Request model
class DocumentRequest(BaseModel):
    type: str
    fields: Dict[str, str]

    @validator("fields")
    def validate_fields(cls, fields, values):
        doc_type = values.get("type")
        if doc_type in DOCUMENT_TYPES:
            required_fields = DOCUMENT_TYPES[doc_type]
            missing_fields = [field for field in required_fields if field not in fields]
            if missing_fields:
                raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        return fields

# Response model
class DocumentResponse(BaseModel):
    content: str
    word_count: int
    sections: Dict[str, str]
    metadata: Dict[str, str]

# Custom Swagger UI route
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Document Generation API Documentation",
        swagger_favicon_url=""
    )

# Health check endpoint
@app.get("/health", 
    summary="Health check",
    description="Check if the API is running"
)
async def health_check():
    """
    Simple health check endpoint to verify the API is running.
    """
    return {"status": "healthy"}
    
# Custom OpenAPI endpoint
@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint():
    return get_openapi(
        title="Document Generation API",
        version="1.0.0",
        description="API for generating documents using AI",
        routes=app.routes,
    )

# Helper functions for both endpoints
def create_system_prompt():
    return """You are an expert in creating formal academic and professional reports.
    Generate a COMPREHENSIVE and DETAILED report based on the selected event type. The document should reflect a structured format appropriate for its category. Ensure that all content pertains to **completed events** and is written in the past tense. Use the following section structures:

    - 'Minutes of Department Meeting':
      {
        "sections": {
            "Meeting Details": "Specify the date, time, venue, and attendees. Ensure at least 40-50 words.",
            "Meeting Agenda": "Outline the main topics covered. Ensure at least 40-50 words.",
            "Key Discussions": "Summarize the main points discussed. Ensure at least 40-50 words.",
            "Decisions Taken": "Detail the resolutions made during the meeting. Ensure at least 40-50 words.",
            "Action Items and Responsibilities": "List the tasks assigned and who is responsible. Ensure at least 30-40 words.",
            "Conclusion and Next Steps": "Summarize outcomes and mention follow-up actions. Ensure at least 30-40 words."
        }
      }

    - 'Lab Session Report':
      {
        "sections": {
            "Session Overview": "Include details such as date, duration, and participants. Ensure at least 40-50 words.",
            "Experiments Conducted": "Describe the experiments performed. Ensure at least 40-50 words.",
            "Procedures Followed": "Summarize the methodology used. Ensure at least 40-50 words.",
            "Observations and Results": "Describe key findings and recorded data. Ensure at least 40-50 words.",
            "Challenges and Issues Faced": "Mention any difficulties encountered. Ensure at least 30-40 words.",
            "Learning Outcomes": "Summarize key takeaways from the session. Ensure at least 30-40 words.",
            "Recommendations and Improvements": "Suggest enhancements for future sessions. Ensure at least 30-40 words."
        }
      }

    - 'Guest Lecture Report':
      {
        "sections": {
            "Event Summary": "Provide an overview, including the date, time, and location. Ensure at least 40-50 words.",
            "Speaker Details": "Give background information about the speaker. Ensure at least 40-50 words.",
            "Topic Summary": "Summarize the key aspects of the lecture. Ensure at least 40-50 words.",
            "Key Discussions and Insights": "Detail the main discussions and takeaways. Ensure at least 40-50 words.",
            "Audience Engagement and Feedback": "Describe interactions and participant responses. Ensure at least 30-40 words.",
            "Impact and Learning Outcomes": "Summarize key learnings and benefits for attendees. Ensure at least 30-40 words.",
            "Future Recommendations": "Suggest improvements for future guest lectures. Ensure at least 30-40 words.",
            "Acknowledgments": "Thank contributors, sponsors, and organizers. Ensure at least 20-30 words."
        }
      }

    ENSURE THE REPORT IS FORMAL, PROFESSIONAL, AND EXCEEDS 300 WORDS WHERE NECESSARY.
    PROVIDE ELABORATE DESCRIPTIONS, SPECIFIC DETAILS, AND CONTEXTUAL INFORMATION.
    WRITE IN A PAST-TENSE, REFLECTING THAT THE EVENT HAS ALREADY TAKEN PLACE.
    DO NOT include any markdown formatting, code blocks, or triple backticks in your response.
    Just return the raw JSON object directly.
    DO NOT add any explanations or comments outside the JSON object.
    Ensure all JSON syntax is correct with proper use of commas, quotes, and braces.
    """

def create_user_prompt(fields):
    fields_text = "\n".join(
        f"# {key}:\n{value}\n"
        for key, value in fields.items()
    )

    return f"""Please generate a DETAILED guest lecture document using these details:

{fields_text}

IMPORTANT REQUIREMENTS:
- Format the response as a JSON object with sections as specified in the system prompt
- ONLY return the JSON object, with NO explanation or markdown formatting around it
- Use formal academic language
- Make it engaging and professional
- Include specific details from the provided information
- PROVIDE COMPREHENSIVE CONTENT - THE TOTAL DOCUMENT SHOULD BE AT LEAST 300-350 WORDS
- Each section should be properly developed with relevant details
- Expand on information with appropriate context and elaboration
- Use examples, specific scenarios, and concrete language where appropriate
"""

def fix_json_string(json_str):
    """Attempt to fix common JSON formatting issues with multiple fallback strategies."""
    # Remove any markdown code block markers
    json_str = re.sub(r'```json\s*', '', json_str)
    json_str = re.sub(r'```\s*', '', json_str)
    
    # Try to find JSON object boundaries
    match = re.search(r'\{.*\}', json_str, re.DOTALL)
    if match:
        json_str = match.group(0)
    
    # Fix common issues
    # Replace single quotes with double quotes (if they're not within double-quoted strings)
    json_str = re.sub(r'(?<!")\'(?!")([^\']*?)\'(?!")', r'"\1"', json_str)
    
    # Fix trailing commas before closing brackets
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    
    # Ensure property names are double-quoted
    json_str = re.sub(r'([{,]\s*)(\w+)(\s*:)', r'\1"\2"\3', json_str)
    
    # Handle truncated JSON strings - attempt to complete the structure
    # Count opening and closing braces
    open_braces = json_str.count('{')
    close_braces = json_str.count('}')
    
    # Add missing closing braces if needed
    if open_braces > close_braces:
        json_str += '}' * (open_braces - close_braces)
    
    # Handle missing quotes for string values
    json_str = re.sub(r':\s*([^"{}\[\],\s][^{}\[\],"]*?)(\s*[,}\]])', r': "\1"\2', json_str)
    
    # Try to detect and fix missing commas between properties
    json_str = re.sub(r'"(\s*)"', '",\1"', json_str)
    
    # Fix escaped quotes inside strings that shouldn't be escaped
    json_str = re.sub(r'\\+"', '"', json_str)
    
    # Fix common patterns where commas are missing after closing quotes before another property
    json_str = re.sub(r'"(\s*)"([^"]+)":', '",\1"\2":', json_str)
    
    # Clean up any double spaces in property names
    json_str = re.sub(r'"([^"]*?)\s\s+([^"]*?)"', r'"\1 \2"', json_str)
    
    return json_str

def extract_sections_as_fallback(json_str):
    """Extract sections as a fallback when JSON parsing completely fails."""
    sections = {}
    
    # Try to extract each section individually
    section_titles = [
        "Introduction and Purpose",
        "About the Guest Speaker",
        "Topic Overview",
        "Learning Objectives",
        "Target Audience and Benefits",
        "Event Details",
        "Expected Outcomes",
        "Registration Process",
        "Detailed Session Plan",
        "Post-Event Impact and Follow-up",
        "Acknowledgments"
    ]
    
    for title in section_titles:
        # Try to find the section content
        pattern = f'"{re.escape(title)}"\\s*:\\s*"([^"]*(?:"[^:]*"[^"]*)*)"'
        match = re.search(pattern, json_str, re.DOTALL)
        if match:
            # Found a match - clean up the content
            content = match.group(1)
            # Handle escaped quotes within the content
            content = content.replace('\\"', '"')
            sections[title] = content
    
    return sections

# Regular HTTP endpoint
@app.post("/api/generate-content", response_model=DocumentResponse)
async def generate_content(request: DocumentRequest):
    try:
        if request.type not in DOCUMENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported document type: {request.type}"
            )

        # System and user prompts
        system_prompt = create_system_prompt()
        user_prompt = create_user_prompt(request.fields)

        
        # OpenRouter API request
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "meta-llama/llama-3.1-70b-instruct",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 3000,
            "temperature": 0.7,
            "response_format": {"type": "json_object"}  # Request JSON format explicitly if API supports it
        }

        # Add a timeout to the request
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions", 
                json=payload, 
                headers=headers,
                timeout=30  # 30 second timeout
            )
        except requests.exceptions.Timeout:
            raise HTTPException(status_code=504, detail="Request to AI service timed out")
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=503, detail=f"Request to AI service failed: {str(e)}")

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"AI API error: {response.text}")

        response_data = response.json()
        response_text = response_data["choices"][0]["message"]["content"]

        # Multiple attempts to parse the JSON with increasingly aggressive repairs
        sections_dict = None
        parsing_error = None
        
        # Attempt 1: Direct parsing
        try:
            response_content = json.loads(response_text)
            if isinstance(response_content.get("sections"), dict):
                sections_dict = response_content["sections"]
        except json.JSONDecodeError as e:
            parsing_error = str(e)
        
        # Attempt 2: Fix and parse JSON
        if sections_dict is None:
            try:
                fixed_json = fix_json_string(response_text)
                response_content = json.loads(fixed_json)
                if isinstance(response_content.get("sections"), dict):
                    sections_dict = response_content["sections"]
                elif isinstance(response_content.get("sections"), list):
                    sections_dict = {item["title"]: item["content"] for item in response_content["sections"]}
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                parsing_error = f"{parsing_error}; Fixed JSON error: {str(e)}"
        
        # Attempt 3: Extract sections as a last resort
        if sections_dict is None:
            sections_dict = extract_sections_as_fallback(response_text)
            if not sections_dict:
                # If nothing was extracted, create a fallback content
                sections_dict = {"Content": f"Failed to parse structured content. Raw response: {response_text[:1000]}..."}

        # Calculate word count
        all_content = " ".join(sections_dict.values())
        word_count = len(all_content.split())

        metadata = {
            "document_type": request.type,
            "generated_at": datetime.datetime.now().isoformat(),
            "total_sections": str(len(sections_dict)),
            "word_count": str(word_count)
        }
        
        # Add parsing error to metadata if there was one
        if parsing_error and sections_dict.get("Content") and "Failed to parse" in sections_dict["Content"]:
            metadata["parsing_error"] = parsing_error[:500]  # Limit size

        return DocumentResponse(
            content=all_content,
            word_count=word_count,
            sections=sections_dict,
            metadata=metadata
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as is
    except Exception as e:
        # Log the exception details for debugging
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Function to process and repair incomplete JSON from streaming responses
async def process_streaming_json(complete_response):
    """Process and repair incomplete JSON from streaming responses."""
    # Log the raw response for debugging (in production, use a proper logger)
    print(f"Raw response to process: {complete_response[:200]}...")
    
    # First try direct parsing (might work if the model perfectly followed instructions)
    try:
        parsed_content = json.loads(complete_response)
        if isinstance(parsed_content.get("sections"), dict):
            return parsed_content
    except json.JSONDecodeError:
        pass
    
    # Try fixing common JSON formatting issues
    fixed_json = fix_json_string(complete_response)
    try:
        parsed_content = json.loads(fixed_json)
        if isinstance(parsed_content.get("sections"), dict):
            return parsed_content
        elif isinstance(parsed_content.get("sections"), list):
            # Convert list format to dictionary
            sections_dict = {item["title"]: item["content"] for item in parsed_content["sections"]}
            return {"sections": sections_dict}
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    
    # Extract sections as a last resort
    sections_dict = extract_sections_as_fallback(complete_response)
    if sections_dict:
        return {"sections": sections_dict}
    
    # If all else fails, return a structured error
    return {
        "error": "Failed to parse response as JSON",
        "raw_response": complete_response[:1000]  # Limit length for safety
    }

# WebSocket endpoint for streaming
@app.websocket("/ws/generate-content")
async def websocket_generate_content(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # Receive and validate the request data
        data = await websocket.receive_json()
        
        # Basic validation
        if "type" not in data or "fields" not in data:
            await websocket.send_json({"error": "Invalid request format"})
            await websocket.close()
            return
            
        doc_type = data["type"]
        fields = data["fields"]
        
        if doc_type not in DOCUMENT_TYPES:
            await websocket.send_json({"error": f"Unsupported document type: {doc_type}"})
            await websocket.close()
            return
            
        # Validate required fields
        required_fields = DOCUMENT_TYPES[doc_type]
        missing_fields = [field for field in required_fields if field not in fields]
        if missing_fields:
            await websocket.send_json({"error": f"Missing required fields: {', '.join(missing_fields)}"})
            await websocket.close()
            return
        
        # Send initial status
        await websocket.send_json({"status": "processing", "message": "Starting document generation..."})
        
        # Prepare prompts
        system_prompt = create_system_prompt()
        user_prompt = create_user_prompt(fields)
        
        # Stream response from OpenRouter API
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream"  # SSE format for streaming
        }
        
        payload = {
            "model": "meta-llama/llama-3.1-70b-instruct",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 3000,
            "temperature": 0.7,
            "stream": True,  # Enable streaming
            "response_format": {"type": "json_object"}  # Request JSON format explicitly if API supports it
        }
        
        # Initialize accumulated response
        complete_response = ""
        streaming_active = True
        
        # Use aiohttp for async requests with timeout
        timeout = aiohttp.ClientTimeout(total=60)  # 60 seconds total timeout
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                async with session.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        await websocket.send_json({"error": f"AI API error: {error_text}"})
                        await websocket.close()
                        return
                    
                    # Process the streaming response
                    async for line in response.content:
                        if not streaming_active:
                            break
                            
                        line = line.decode('utf-8').strip()
                        
                        # Skip empty lines
                        if not line:
                            continue
                            
                        # Check for end of stream
                        if line == "data: [DONE]":
                            await websocket.send_json({"status": "processing_complete", "message": "Generation complete, processing response..."})
                            break
                        
                        # Process SSE format
                        if line.startswith("data: "):
                            json_str = line[6:]  # Remove "data: " prefix
                            try:
                                chunk_data = json.loads(json_str)
                                if "choices" in chunk_data and chunk_data["choices"]:
                                    delta = chunk_data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        # Send the token to the client
                                        await websocket.send_json({
                                            "type": "token",
                                            "content": content
                                        })
                                        # Accumulate for final processing
                                        complete_response += content
                            except json.JSONDecodeError:
                                # Skip malformed JSON in stream chunks
                                continue
                            except Exception as e:
                                print(f"Error processing stream chunk: {str(e)}")
                                continue
            
            except asyncio.TimeoutError:
                await websocket.send_json({"error": "Request to AI API timed out"})
                streaming_active = False
                await websocket.close()
                return
            
            except Exception as e:
                await websocket.send_json({"error": f"Error during streaming: {str(e)}"})
                streaming_active = False
                await websocket.close()
                return
        
        # Process complete response
        if not complete_response:
            await websocket.send_json({"error": "No response received from API"})
            await websocket.close()
            return
            
        await websocket.send_json({"status": "parsing", "message": "Parsing response data..."})
        
        # Process the accumulated JSON response
        response_content = await process_streaming_json(complete_response)
        
        # Check for processing errors
        if "error" in response_content:
            await websocket.send_json({
                "type": "error",
                "error": response_content["error"],
                "raw": response_content.get("raw_response", "")
            })
            await websocket.close()
            return
        
        # Handle cases where AI returns a list instead of a dictionary for sections
        if isinstance(response_content.get("sections"), list):
            sections_dict = {item["title"]: item["content"] for item in response_content["sections"]}
        elif isinstance(response_content.get("sections"), dict):
            sections_dict = response_content["sections"]
        else:
            # Create a fallback section if structure is completely wrong
            sections_dict = {"Content": complete_response}
            await websocket.send_json({
                "type": "warning",
                "message": "Response format was incorrect, displaying as raw content"
            })
        
        # Calculate word count
        all_content = " ".join(sections_dict.values())
        word_count = len(all_content.split())
        
        metadata = {
            "document_type": doc_type,
            "generated_at": datetime.datetime.now().isoformat(),
            "total_sections": str(len(sections_dict)),
            "word_count": str(word_count)
        }
        
        # Send the final, complete response
        await websocket.send_json({
            "type": "complete",
            "content": all_content,
            "word_count": word_count,
            "sections": sections_dict,
            "metadata": metadata
        })
        
    except WebSocketDisconnect:
        # Client disconnected
        pass
    except json.JSONDecodeError as json_err:
        try:
            await websocket.send_json({
                "type": "error", 
                "error": f"JSON parsing error: {str(json_err)}"
            })
        except:
            pass
    except Exception as e:
        # Send error to client
        try:
            await websocket.send_json({
                "type": "error", 
                "error": f"Server error: {str(e)}"
            })
        except:
            # Client might be already disconnected
            pass
    finally:
        # Ensure WebSocket is closed
        try:
            await websocket.close()
        except:
            pass

@app.post("/api/extract-pdf")
async def extract_pdf(pdf: UploadFile = File(...)):
    """
    Extract content from an uploaded PDF file and attempt to parse it into the required fields.
    """
    if not pdf.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        # Read the uploaded file
        contents = await pdf.read()
        pdf_file = io.BytesIO(contents)
        
        # Initialize PDF reader
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract text from all pages
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()

        # Initialize fields dictionary
        fields = {
            "Guest Name": "",
            "Guest Designation": "",
            "Topic": "",
            "Event Date": "",
            "Activity Code": "",
            "Year": "",
            "No Of Count": "",
            "Organizer Department": "",
            "Organizer Faculty Name": ""
        }

        # Try to extract fields using pattern matching
        patterns = {
            "Guest Name": r"Guest(?:\s*Name)?[\s:]+([^\n]+)",
            "Guest Designation": r"Designation[\s:]+([^\n]+)",
            "Topic": r"Topic[\s:]+([^\n]+)",
            "Event Date": r"(?:Event\s*)?Date[\s:]+([^\n]+)",
            "Activity Code": r"Activity\s*Code[\s:]+([^\n]+)",
            "Year": r"Year[\s:]+([^\n]+)",
            "No Of Count": r"(?:Expected\s*)?Participants?[\s:]+(\d+)",
            "Organizer Department": r"Department[\s:]+([^\n]+)",
            "Organizer Faculty Name": r"(?:Faculty|Coordinator)[\s:]+([^\n]+)"
        }

        # Extract fields using patterns
        for field, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields[field] = match.group(1).strip()

        # Return the extracted content and fields
        return {
            "content": text,
            "fields": fields,
            "word_count": len(text.split())
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        await pdf.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)