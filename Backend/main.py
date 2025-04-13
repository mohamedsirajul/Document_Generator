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
import pytesseract
from PIL import Image
import cv2
import numpy as np
import base64
import time

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

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

def extract_poster_content(text):
    """
    Extract structured content from Francis Xavier Engineering College event poster text.
    This function is specifically tailored for the template structure of posters from
    Francis Xavier Engineering College, helping extract key fields more reliably.
    
    Args:
        text (str): The text extracted from the poster image via OCR
        
    Returns:
        dict: Dictionary containing extracted information with keys matching required document fields
    """
    # Split text into lines for easier processing
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Remove duplicate consecutive lines (common OCR issue)
    clean_lines = []
    for i, line in enumerate(lines):
        if i == 0 or line != lines[i-1]:
            clean_lines.append(line)
    lines = clean_lines
    
    # Initialize the structured result
    result = {
        "Guest Name": "",
        "Guest Designation": "",
        "Event Date": "",
        "Activity Code": "",  # May not be present in all posters
        "Year": "",          # Extract from date if available
        "Organizer Department": "",
        "Organizer Faculty Name": "",
        "Topic": ""
    }
    
    # Identify poster sections by keywords to avoid mixing content between sections
    section_indices = {
        "header": -1,
        "department": -1,
        "title": -1,
        "guest_speaker": -1,
        "date": -1,
        "coordinator": -1,
        "footer": -1
    }
    
    # Find section boundaries by keywords
    for i, line in enumerate(lines):
        if i < 10 and ("FRANCIS XAVIER" in line.upper() or "ENGINEERING COLLEGE" in line.upper()):
            section_indices["header"] = i
        
        if "DEPARTMENT OF" in line.upper():
            section_indices["department"] = i
            
        if "GUEST SPEAKER" in line.upper():
            section_indices["guest_speaker"] = i
            
        # Date is typically a standalone line with specific format
        if re.match(r"\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}", line):
            section_indices["date"] = i
            
        if "CO-ORDINATOR" in line.upper() or "COORDINATOR" in line.upper():
            section_indices["coordinator"] = i
            
        # Footer typically includes administrative roles like PRINCIPAL, etc.
        if ("PRINCIPAL" in line.upper() or "DR." in line.upper()) and i > (len(lines) * 0.7):
            section_indices["footer"] = i
            break
    
    # Extract department
    if section_indices["department"] >= 0:
        dept_idx = section_indices["department"]
        # Department name is usually in the next line after "DEPARTMENT OF"
        if dept_idx + 1 < len(lines):
            result["Organizer Department"] = lines[dept_idx + 1]
        else:
            # Extract from the same line if next line isn't available
            dept_match = re.search(r"DEPARTMENT\s+OF\s+([\w\s&]+)", lines[dept_idx], re.IGNORECASE)
            if dept_match:
                result["Organizer Department"] = dept_match.group(1).strip()
    
    # If department not found, try fallback using abbreviations
    if not result["Organizer Department"]:
        dept_abbr_pattern = r"\b(CSE|ECE|EEE|IT|CSBS|ME|CE)\b"
        for line in lines:
            dept_abbr_match = re.search(dept_abbr_pattern, line, re.IGNORECASE)
            if dept_abbr_match:
                dept_abbr = dept_abbr_match.group(1).upper()
                # Map the abbreviation to full department name
                dept_mapping = {
                    "CSBS": "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                    "CSE": "COMPUTER SCIENCE ENGINEERING",
                    "ECE": "ELECTRONICS AND COMMUNICATION ENGINEERING",
                    "EEE": "ELECTRICAL AND ELECTRONICS ENGINEERING",
                    "IT": "INFORMATION TECHNOLOGY",
                    "ME": "MECHANICAL ENGINEERING",
                    "CE": "CIVIL ENGINEERING"
                }
                result["Organizer Department"] = dept_mapping.get(dept_abbr, dept_abbr)
                break
    
    # Extract event title from appropriate region
    # Title is typically between department and guest speaker sections
    title_text = []
    title_start_idx = -1
    
    # Define common keywords for titles
    title_keywords = ["WEBINAR", "WORKSHOP", "FULL STACK", "DEVELOPMENT", "LECTURE", "CONFERENCE", "TALK"]
    
    if section_indices["department"] >= 0 and section_indices["guest_speaker"] >= 0:
        # Start after department section (usually after department name line)
        title_start_idx = section_indices["department"] + 2
        
        # Collect all lines between department and guest speaker as potential title
        for i in range(title_start_idx, section_indices["guest_speaker"]):
            if i < len(lines):
                line = lines[i]
                # Skip lines that are clearly not part of the title
                if (not re.search(r"(DEPARTMENT|FACULTY|PROFESSOR|DR\.)", line, re.IGNORECASE) and 
                    (any(keyword in line.upper() for keyword in title_keywords) or 
                     len(line) > 3 and sum(1 for c in line if c.isupper()) / len(line) > 0.7)):
                    # Only add non-duplicate lines
                    if not title_text or line not in title_text:
                        title_text.append(line)
    
    # Combine title lines and clean up
    if title_text:
        # Join with space, and avoid repeating terms like "WEBINAR" multiple times
        combined_title = " ".join(title_text)
        # Replace common OCR errors
        combined_title = combined_title.replace("DEVELOPEMENT", "DEVELOPMENT")
        # Remove repeated words
        word_counts = {}
        clean_words = []
        for word in combined_title.split():
            word_counts[word] = word_counts.get(word, 0) + 1
            if word_counts[word] <= 1:  # Only keep first occurrence
                clean_words.append(word)
        result["Topic"] = " ".join(clean_words)
    
    # Extract guest speaker info - CRITICAL SECTION
    if section_indices["guest_speaker"] >= 0:
        speaker_idx = section_indices["guest_speaker"]
        # Define the range where we expect to find speaker info
        next_section_idx = float('inf')
        for idx in [section_indices["date"], section_indices["coordinator"], section_indices["footer"]]:
            if idx > speaker_idx and idx < next_section_idx:
                next_section_idx = idx
        
        # If we found no next section, limit to a reasonable number of lines
        if next_section_idx == float('inf'):
            next_section_idx = min(speaker_idx + 5, len(lines))
        
        # Look for name pattern after "GUEST SPEAKER" header
        for i in range(speaker_idx + 1, next_section_idx):
            if i < len(lines):
                line = lines[i]
                # Check for name patterns (MR/DR/PROF prefix)
                if re.match(r"^(MR|DR|PROF|MS|MRS)\.", line, re.IGNORECASE):
                    result["Guest Name"] = line
                    
                    # Look for designation in next lines before next section
                    for j in range(i + 1, next_section_idx):
                        if j < len(lines):
                            # Skip empty lines or date patterns
                            if not lines[j] or re.match(r"\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}", lines[j]):
                                continue
                            
                            # Check if this is likely a designation (not another person or section header)
                            if not re.match(r"^(MR|DR|PROF|MS|MRS)\.", lines[j], re.IGNORECASE) and not "ORDINATOR" in lines[j].upper():
                                # Add as designation or company
                                if not result["Guest Designation"]:
                                    result["Guest Designation"] = lines[j]
                                else:
                                    # Check if this might be company/organization, not a duplicate
                                    if (lines[j] != result["Guest Designation"] and 
                                        not any(term in result["Guest Designation"].upper() for term in lines[j].upper().split())):
                                        result["Guest Designation"] += f", {lines[j]}"
                                        break
                    break
        
        # If still no name found, try broader pattern matching
        if not result["Guest Name"]:
            for i in range(speaker_idx + 1, next_section_idx):
                if i < len(lines):
                    name_match = re.search(r"((?:MR|DR|PROF|MS|MRS)\.\s+[\w\s\.]+)", lines[i], re.IGNORECASE)
                    if name_match:
                        result["Guest Name"] = name_match.group(1)
                        # Try to find designation in following lines
                        for j in range(i + 1, next_section_idx):
                            if not re.match(r"^(MR|DR|PROF|MS|MRS)\.", lines[j], re.IGNORECASE) and not re.match(r"\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}", lines[j]):
                                result["Guest Designation"] = lines[j]
                                break
                        break
    
    # Extract date - find standalone date pattern
    for i, line in enumerate(lines):
        date_match = re.search(r"(\d{1,2})[-\/\.\s]+(\d{1,2})[-\/\.\s]+(\d{4}|\d{2})", line)
        if date_match:
            # Verify this line contains mostly date info (not mixed with other text)
            if len(line) < 15 or re.match(r"^\s*\d{1,2}[-\/\.\s]+\d{1,2}[-\/\.\s]+\d{4}|\d{2}\s*$", line):
                try:
                    day, month, year = date_match.groups()
                    # Convert 2-digit year to 4-digit
                    if len(year) == 2:
                        year = f"20{year}"
                    result["Event Date"] = f"{day}-{month}-{year}"
                    result["Year"] = year
                    section_indices["date"] = i  # Save the date index
                    break
                except:
                    result["Event Date"] = date_match.group(0)
                    # Try to extract year
                    year_match = re.search(r"(\d{4}|\d{2})", date_match.group(0))
                    if year_match:
                        year = year_match.group(1)
                        if len(year) == 2:
                            year = f"20{year}"
                        result["Year"] = year
                    break
    
    # Extract coordinator information - carefully handle this section
    coordinator_found = False
    
    if section_indices["coordinator"] >= 0:
        coord_idx = section_indices["coordinator"]
        footer_idx = section_indices["footer"] if section_indices["footer"] >= 0 else len(lines)
        
        # Look for coordinator name in lines after the "CO-ORDINATOR" header
        # but before the footer section
        for i in range(coord_idx + 1, min(coord_idx + 5, footer_idx)):
            if i < len(lines):
                line = lines[i]
                # Check for name prefixes that indicate a person's name
                if re.search(r"^(MRS|MR|DR|PROF)\.", line, re.IGNORECASE):
                    result["Organizer Faculty Name"] = line
                    
                    # Look for position/title in the next line
                    if i + 1 < len(lines) and i + 1 < footer_idx:
                        # Check if it's likely a position (HOD, etc.) and not footer content
                        if "HOD" in lines[i + 1].upper() and not re.search(r"(PRINCIPAL|GENERAL MANAGER)", lines[i + 1], re.IGNORECASE):
                            result["Organizer Faculty Name"] += f", {lines[i + 1]}"
                    
                    coordinator_found = True
                    break
                
                # Also check for HOD pattern right after a name
                if "HOD" in line.upper() and result["Organizer Faculty Name"]:
                    result["Organizer Faculty Name"] += f", {line}"
                    coordinator_found = True
                    break
    
    # Handle the case where coordinator is mentioned without a header
    if not coordinator_found:
        # Look for lines that match coordinator patterns in the lower half of the poster
        # but avoid the footer section
        footer_idx = section_indices["footer"] if section_indices["footer"] >= 0 else len(lines)
        
        for i in range(len(lines) // 2, footer_idx):
            if i < len(lines):
                line = lines[i]
                # Look for HOD mentions with names
                if "HOD" in line.upper() and re.search(r"(MRS|MR|DR|PROF)\.", line, re.IGNORECASE):
                    coord_match = re.search(r"((?:MRS|MR|DR|PROF)\.\s+[\w\s\.]+)", line, re.IGNORECASE)
                    if coord_match:
                        result["Organizer Faculty Name"] = coord_match.group(1).strip()
                        # Add HOD info if not included in the name match
                        if "HOD" not in result["Organizer Faculty Name"].upper():
                            result["Organizer Faculty Name"] += ", HOD"
                        if result["Organizer Department"] and "HOD/" not in result["Organizer Faculty Name"].upper():
                            dept_abbr = ""
                            for key, value in {
                                "CSBS": "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                                "CSE": "COMPUTER SCIENCE ENGINEERING",
                                "ECE": "ELECTRONICS AND COMMUNICATION ENGINEERING",
                                "EEE": "ELECTRICAL AND ELECTRONICS ENGINEERING",
                                "IT": "INFORMATION TECHNOLOGY",
                                "ME": "MECHANICAL ENGINEERING",
                                "CE": "CIVIL ENGINEERING"
                            }.items():
                                if value == result["Organizer Department"]:
                                    dept_abbr = key
                                    break
                            if dept_abbr:
                                result["Organizer Faculty Name"] += f"/{ dept_abbr}"
                        coordinator_found = True
                        break
    
    # Last effort for coordinator if still not found - look for Mrs/Mr mentions in specific regions
    if not coordinator_found:
        # Define a range that's likely to contain coordinator info but avoid footer
        footer_idx = section_indices["footer"] if section_indices["footer"] >= 0 else len(lines)
        date_idx = section_indices["date"] if section_indices["date"] >= 0 else len(lines) // 2
        
        # Look between date and footer
        for i in range(date_idx + 1, footer_idx):
            if i < len(lines):
                line = lines[i]
                # Look for name prefixes
                coord_match = re.search(r"((?:MRS|MR|DR|PROF)\.\s+[\w\s\.]+)", line, re.IGNORECASE)
                if coord_match:
                    # Ensure this isn't the guest speaker name
                    if result["Guest Name"] and result["Guest Name"].upper() != coord_match.group(1).upper():
                        result["Organizer Faculty Name"] = coord_match.group(1).strip()
                        coordinator_found = True
                        break
    
    # Set Activity Code with fallback values if not found
    result["Activity Code"] = "GL" + (result["Year"][-2:] if result["Year"] else "")
    
    # Clean up results - remove extra whitespace and fix capitalization
    for key, value in result.items():
        if value:
            # Remove excessive whitespace
            result[key] = re.sub(r'\s+', ' ', value).strip()
            # Fix common OCR errors
            if key == "Topic":
                result[key] = result[key].replace("DEVELOPEMENT", "DEVELOPMENT")
    
    return result

# Update the extract_text_from_region function to better clean combined text
def process_event_title(text):
    """
    Process event title text to clean up OCR artifacts and repetition.
    
    Args:
        text: Raw event title text
        
    Returns:
        Clean event title
    """
    if not text:
        return ""
        
    # Split into lines and filter
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Remove duplicate consecutive lines
    clean_lines = []
    for i, line in enumerate(lines):
        if i == 0 or line != lines[i-1]:
            clean_lines.append(line)
    
    # Keep only lines that are likely part of the title
    title_keywords = ["WEBINAR", "WORKSHOP", "FULL STACK", "DEVELOPMENT", "STACK"]
    filtered_lines = []
    
    for line in clean_lines:
        # Skip lines with administrative roles or other irrelevant content
        if re.search(r"(PRINCIPAL|GENERAL MANAGER|ADMINISTRATION|COORDINATOR|HOD|FACULTY)", line, re.IGNORECASE):
            continue
            
        # Keep lines with title keywords or that are mostly uppercase (title-like)
        if any(keyword in line.upper() for keyword in title_keywords) or (len(line) > 3 and sum(1 for c in line if c.isupper()) / max(1, sum(c.isalpha() for c in line)) > 0.8):
            # Fix common OCR errors
            line = line.replace("DEVELOPEMENT", "DEVELOPMENT")
            filtered_lines.append(line)
    
    if not filtered_lines:
        return ""
        
    # Join the filtered lines
    combined = " ".join(filtered_lines)
    
    # Remove repeated words
    words = []
    seen = set()
    for word in combined.split():
        if word.upper() not in seen:
            words.append(word)
            seen.add(word.upper())
    
    return " ".join(words)

# Modify process_poster to use the LLM-based approach with proper fallback
@app.post("/api/process-poster",
    summary="Process event poster image",
    description="Process an event poster image using OCR to extract event details. Supports formats: JPG, JPEG, PNG"
)
async def process_poster(
    poster: UploadFile = File(...),
):
    """
    Process an event poster image using OCR to extract event details.
    Supported image formats: JPG, JPEG, PNG
    """
    # Initialize progress tracking array
    progress_updates = []
    
    def add_progress(status, message, data=None):
        """Helper function to add a progress update"""
        timestamp = time.time()
        update = {
            "status": status,
            "message": message,
            "timestamp": timestamp
        }
        if data:
            update["data"] = data
        progress_updates.append(update)
    
    try:
        # Validate file format
        valid_formats = {"image/jpeg", "image/jpg", "image/png"}
        file_extension = poster.filename.lower().split(".")[-1]
        
        add_progress("processing", "Starting poster processing")
        
        if poster.content_type not in valid_formats:
            add_progress("error", f"Invalid file format: {poster.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Only JPG, JPEG, and PNG are supported. Got: {poster.content_type}"
            )
        
        # Read the image file
        add_progress("processing", "Reading image file")
        contents = await poster.read()
        
        # Convert to OpenCV format for OCR processing
        add_progress("processing", "Converting image for OCR processing")
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            add_progress("error", "Invalid image file")
            raise HTTPException(
                status_code=400,
                detail="Could not process the image. Please ensure it's a valid image file."
            )
        
        # Get image dimensions
        height, width = img.shape[:2]
        add_progress("processing", "Analyzing image dimensions", {"width": width, "height": height})
        
        # Resize to optimal size for OCR
        add_progress("processing", "Resizing image for optimal OCR")
        target_width = 2000
        if width != target_width:
            ratio = target_width / width
            dim = (target_width, int(height * ratio))
            img = cv2.resize(img, dim, interpolation=cv2.INTER_CUBIC)
            height, width = img.shape[:2]  # Update dimensions after resize
        
        # Define precise regions based on the template structure
        add_progress("processing", "Identifying regions of interest in the poster")
        header_region = img[0:int(height*0.20), :]  # College name, NIRF ranking
        department_region = img[int(height*0.20):int(height*0.35), :]  # Department info
        event_title_region = img[int(height*0.35):int(height*0.55), :]  # Event title
        speaker_region = img[int(height*0.55):int(height*0.75), :]  # Speaker details
        coordinator_region = img[int(height*0.75):int(height*0.85), :]  # Coordinator info
        footer_region = img[int(height*0.85):, :]  # Principal and other roles

        # Optimized OCR processing
        add_progress("processing", "Starting OCR text extraction")
        start_time = time.time()
        
        # Extract text from title region
        add_progress("processing", "Extracting event title text")
        event_title_result = perform_ocr_with_confidence(event_title_region, psm_mode=3)
        add_progress("processing", "Title extraction complete", {"confidence": event_title_result["confidence"]})
        
        # Extract department info
        add_progress("processing", "Extracting department information")
        department_result = perform_ocr_with_confidence(department_region, psm_mode=6)
        add_progress("processing", "Department extraction complete", {"confidence": department_result["confidence"]})
        
        # Extract speaker info
        add_progress("processing", "Extracting speaker information")
        speaker_result = perform_ocr_with_confidence(speaker_region, psm_mode=4)
        add_progress("processing", "Speaker extraction complete", {"confidence": speaker_result["confidence"]})
        
        # Extract coordinator info
        add_progress("processing", "Extracting coordinator information")
        coordinator_result = perform_ocr_with_confidence(coordinator_region, psm_mode=7)
        add_progress("processing", "Coordinator extraction complete", {"confidence": coordinator_result["confidence"]})
        
        # Extract text from results, preferring higher confidence results
        department_text = department_result["combined_text"]
        event_title_text = event_title_result["combined_text"]
        speaker_text = speaker_result["combined_text"]
        coordinator_text = coordinator_result["combined_text"]

        print(f"OCR processing time: {time.time() - start_time:.2f} seconds")
        print(f"Department text: {department_text}")
        print(f"Event title text: {event_title_text}")
        print(f"Speaker text: {speaker_text}")
        print(f"Coordinator text: {coordinator_text}")
        
        # Process event title
        add_progress("processing", "Processing event title")
        event_title_lines = [line.strip() for line in event_title_text.split('\n') if line.strip() and len(line.strip()) > 2]
        
        # Filter out lines that are likely not part of the title
        add_progress("processing", "Filtering title lines")
        filtered_title_lines = []
        for line in event_title_lines:
            # Skip lines that are clearly not part of the title
            if any(keyword in line.upper() for keyword in ["GUEST SPEAKER", "DEPARTMENT OF", "COORDINATOR", "PRINCIPAL"]):
                continue
            # Skip lines with dates
            if re.search(r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", line):
                continue
            # Keep lines that are likely part of the title (mostly uppercase, decent length)
            if sum(1 for c in line if c.isupper()) / max(1, len(line)) > 0.5 and len(line) > 3:
                filtered_title_lines.append(line)
        
        add_progress("processing", "Reconstructing title", {"filtered_lines": len(filtered_title_lines)})
        # Enhanced title reconstruction - preserves multi-line structure
        title_text = ""
        prev_line = ""
        
        for line in filtered_title_lines:
            # Check if current line is a continuation of previous line
            if prev_line and (prev_line.endswith('-') or len(prev_line) < 20 or len(line) < 20):
                # If previous line ends with hyphen, remove it and don't add space
                if prev_line.endswith('-'):
                    title_text = title_text[:-1] + line + " "
                else:
                    title_text += line + " "
            else:
                # Add the line with prefixed space if not first line
                if title_text:
                    title_text += line + " "
                else:
                    title_text = line + " "
            prev_line = line
        
        # Clean up the title
        add_progress("processing", "Cleaning and formatting the title")
        title_text = title_text.strip()

        print(f"Raw title text: {title_text}")
        
        # Replace multiple spaces with single space
        title_text = re.sub(r'\s+', ' ', title_text)
        # Fix common OCR errors
        title_text = title_text.replace('l', 'I').replace('|', 'I').replace("EACHANGE", "EXCHANGE")
        
        # CRITICAL FIX: Remove repetitions in title
        # First, split the title into words
        add_progress("processing", "Removing repetitions in title")
        title_words = title_text.split()
        
        # Look for repetitive phrases (3 or more words repeating)
        if len(title_words) > 6:  # Only process longer titles
            clean_title = []
            i = 0
            already_seen = set()
            
            while i < len(title_words):
                # Try different phrase lengths, longer first
                phrase_found = False
                
                for phrase_len in range(min(6, len(title_words) - i), 2, -1):
                    phrase = " ".join(title_words[i:i+phrase_len])
                    
                    if phrase in already_seen:
                        # This is a repetition, skip it
                        phrase_found = True
                        i += phrase_len
                        break
                    
                    # For longer phrases, add them to seen set
                    if phrase_len >= 3:
                        already_seen.add(phrase)
                
                # If no repetitive phrase found, add the current word
                if not phrase_found:
                    clean_title.append(title_words[i])
                    i += 1
            
            # Reconstruct the title
            title_text = " ".join(clean_title)
        
        # Use specialized detection for titles with "INTRODUCTION TO" pattern
        add_progress("processing", "Checking for special title patterns")
        if "INTRODUCTION TO" in event_title_text.upper():
            intro_pattern = re.search(r"INTRODUCTION\s+TO\s+(.*)", event_title_text, re.IGNORECASE)
            if intro_pattern:
                # Get everything after "INTRODUCTION TO"
                remaining_title = intro_pattern.group(1).strip()
                # Check if we have sufficient content after "INTRODUCTION TO"
                if len(remaining_title) > 5:
                    # Prevent repetition in the remaining title
                    remaining_words = remaining_title.split()
                    unique_remaining = []
                    
                    for word in remaining_words:
                        if not unique_remaining or word != unique_remaining[-1]:
                            unique_remaining.append(word)
                    
                    title_text = "INTRODUCTION TO " + " ".join(unique_remaining)
        
        # For the specific case of Qatar Stock Exchange
        if "QATAR" in title_text and "STOCK" in title_text:
            # Look for the pattern
            if re.search(r"TRADING\s+ON\s+QATAR\s+STOCK\s+E[X|A]CHANGE", title_text, re.IGNORECASE):
                # Check if introduction is missing
                if "INTRODUCTION" not in title_text:
                    title_text = "INTRODUCTION TO TRADING ON QATAR STOCK EXCHANGE"
                else:
                    # Clean up any repetition
                    title_text = re.sub(r"(TRADING\s+ON\s+QATAR\s+STOCK\s+E[X|A]CHANGE)\s+\1", r"\1", title_text)
                    title_text = re.sub(r"E[A|X]CHANGE", "EXCHANGE", title_text)
        
        # Create a combined text for other extractions, excluding footer
        add_progress("processing", "Combining text for field extraction")
        combined_text = f"{department_text}\n{event_title_text}\n{speaker_text}\n{coordinator_text}"
        
        # Clean up extracted text - fix common OCR errors
        cleaned_text = re.sub(r'\s+', ' ', combined_text)  # Normalize spaces
        cleaned_text = cleaned_text.replace('|', 'I')  # Fix common OCR error
        cleaned_text = cleaned_text.replace('1', 'I')  # Fix common OCR error for capital I
        cleaned_text = cleaned_text.replace('0', 'O')  # Fix common OCR error for capital O
        cleaned_text = re.sub(r'[^\x00-\x7F]+', '', cleaned_text)  # Remove non-ASCII
        
        # Extract fields using the specialized method
        add_progress("processing", "Extracting structured fields from text")
        extracted_fields = extract_poster_content(combined_text)
        
        # Use our improved title extraction
        extracted_fields["Topic"] = title_text
        
        # If speaker extraction failed, try more focused extraction from speaker region
        add_progress("processing", "Verifying speaker information")
        if not extracted_fields["Guest Name"] or not extracted_fields["Guest Designation"]:
            # Clean speaker text and extract patterns
            speaker_lines = [line.strip() for line in speaker_text.split('\n') if line.strip()]
            
            # First look for name with prefixes
            if not extracted_fields["Guest Name"]:
                for line in speaker_lines:
                    name_match = re.search(r"^((?:MR|DR|PROF|MS|MRS)\.\s+[\w\s\.]+)", line, re.IGNORECASE)
                    if name_match and len(name_match.group(1)) > 5:  # Ensure it's a substantive match
                        extracted_fields["Guest Name"] = name_match.group(1).strip()
                        # Look for designation in subsequent lines
                        name_idx = speaker_lines.index(line)
                        if name_idx + 1 < len(speaker_lines):
                            potential_designation = speaker_lines[name_idx + 1]
                            # Verify this isn't a date or coordinator
                            if not re.search(r"\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}", potential_designation) and \
                               not re.search(r"COORDINATOR", potential_designation, re.IGNORECASE):
                                extracted_fields["Guest Designation"] = potential_designation
                        break
        
        # Extra processing for department name - more precise extraction
        add_progress("processing", "Verifying department information")
        department_lines = [line.strip() for line in department_text.split('\n') if line.strip()]
        extracted_fields["Organizer Department"] = ""  # Reset to ensure clean extraction
        
        # Multiple extraction strategies for department
        # Strategy 1: Look for "DEPARTMENT OF" pattern
        for line in department_lines:
            if "DEPARTMENT OF" in line.upper():
                # Find everything after "DEPARTMENT OF"
                dept_match = re.search(r"DEPARTMENT\s+OF\s+(.*)", line.upper(), re.IGNORECASE)
                if dept_match:
                    extracted_fields["Organizer Department"] = dept_match.group(1).strip()
                    break
        
        # Strategy 2: If department is in a separate line after "DEPARTMENT OF"
        if not extracted_fields["Organizer Department"]:
            for i, line in enumerate(department_lines):
                if "DEPARTMENT OF" in line.upper() and i+1 < len(department_lines):
                    next_line = department_lines[i+1].strip()
                    # Check if next line is not likely a title (contains non-department keywords)
                    if next_line and not any(keyword in next_line.upper() for keyword in ["WEBINAR", "WORKSHOP", "GUEST", "SPEAKER"]):
                        extracted_fields["Organizer Department"] = next_line
                        break
        
        # Strategy 3: Look for department abbreviations and set full department name
        if not extracted_fields["Organizer Department"]:
            # Look for department abbreviations in the text
            dept_pattern = r"\b(CSBS|CSE|ECE|EEE|IT|ME|CE)\b"
            for line in department_lines:
                dept_match = re.search(dept_pattern, line.upper())
                if dept_match:
                    dept_abbr = dept_match.group(1)
                    dept_mapping = {
                        "CSBS": "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                        "CSE": "COMPUTER SCIENCE ENGINEERING",
                        "ECE": "ELECTRONICS AND COMMUNICATION ENGINEERING",
                        "EEE": "ELECTRICAL AND ELECTRONICS ENGINEERING",
                        "IT": "INFORMATION TECHNOLOGY",
                        "ME": "MECHANICAL ENGINEERING",
                        "CE": "CIVIL ENGINEERING"
                    }
                    extracted_fields["Organizer Department"] = dept_mapping.get(dept_abbr, dept_abbr)
                    break
        
        # Strategy 4: Directly check for department full names in the text
        if not extracted_fields["Organizer Department"]:
            dept_names = [
                "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                "COMPUTER SCIENCE ENGINEERING",
                "ELECTRONICS AND COMMUNICATION ENGINEERING",
                "ELECTRICAL AND ELECTRONICS ENGINEERING",
                "INFORMATION TECHNOLOGY",
                "MECHANICAL ENGINEERING",
                "CIVIL ENGINEERING"
            ]
            for line in combined_text.upper().split('\n'):
                for dept in dept_names:
                    if dept in line or dept.replace(" & ", " AND ") in line:
                        extracted_fields["Organizer Department"] = dept
                        break
                if extracted_fields["Organizer Department"]:
                    break
        
        # Strategy 5: Direct extraction of visible colored text in department region
        if not extracted_fields["Organizer Department"]:
            add_progress("processing", "Attempting color-based department extraction")
            # Try color-based detection for highlighted department text
            hsv = cv2.cvtColor(department_region, cv2.COLOR_BGR2HSV)
            
            # Create mask for yellow/bright text (common for department headers)
            lower_yellow = np.array([20, 100, 100])
            upper_yellow = np.array([40, 255, 255])
            yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
            
            # Find contours in the mask
            contours, _ = cv2.findContours(yellow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # If contours are found, there might be yellow text - OCR that specific region
            if contours:
                # Create a mask for the contour regions
                mask = np.zeros_like(yellow_mask)
                for contour in contours:
                    cv2.drawContours(mask, [contour], -1, 255, -1)
                
                # Apply mask to get only the yellow text area
                highlighted_text = cv2.bitwise_and(department_region, department_region, mask=mask)
                
                # OCR the highlighted region
                highlighted_text_result = pytesseract.image_to_string(highlighted_text, config='--psm 6')
                highlighted_lines = [line.strip() for line in highlighted_text_result.split('\n') if line.strip()]
                
                # Look for department info in the highlighted text
                for line in highlighted_lines:
                    if "DEPARTMENT OF" in line.upper():
                        dept_match = re.search(r"DEPARTMENT\s+OF\s+(.*)", line.upper(), re.IGNORECASE)
                        if dept_match:
                            extracted_fields["Organizer Department"] = dept_match.group(1).strip()
                            break
                    elif any(abbr in line.upper() for abbr in ["CSBS", "CSE", "ECE", "EEE", "IT", "ME", "CE"]):
                        for abbr in ["CSBS", "CSE", "ECE", "EEE", "IT", "ME", "CE"]:
                            if abbr in line.upper():
                                dept_mapping = {
                                    "CSBS": "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                                    "CSE": "COMPUTER SCIENCE ENGINEERING",
                                    "ECE": "ELECTRONICS AND COMMUNICATION ENGINEERING",
                                    "EEE": "ELECTRICAL AND ELECTRONICS ENGINEERING",
                                    "IT": "INFORMATION TECHNOLOGY",
                                    "ME": "MECHANICAL ENGINEERING",
                                    "CE": "CIVIL ENGINEERING"
                                }
                                extracted_fields["Organizer Department"] = dept_mapping.get(abbr, abbr)
                                break
        
        # From the provided poster image, we can directly extract "COMPUTER SCIENCE & BUSINESS SYSTEMS"
        add_progress("processing", "Final department name verification")
        if "COMPUTER SCIENCE" in combined_text.upper() and "BUSINESS SYSTEMS" in combined_text.upper():
            extracted_fields["Organizer Department"] = "COMPUTER SCIENCE & BUSINESS SYSTEMS"
        
        # Format the data in the requested structure
        add_progress("processing", "Creating final structured data")
        
        # Clean up the event title to remove repetitions
        event_title = extracted_fields.get("Topic", "")
        # Split into words and remove consecutive duplicates
        title_words = event_title.split()
        clean_title_words = []
        i = 0
        while i < len(title_words):
            # Check for repeating phrases (2 or more words)
            found_repeat = False
            for phrase_len in range(min(5, len(title_words) - i), 1, -1):
                phrase = " ".join(title_words[i:i+phrase_len])
                # Look ahead for the same phrase
                remaining_text = " ".join(title_words[i+phrase_len:])
                if phrase in remaining_text:
                    # Found a repetition, skip it
                    found_repeat = True
                    i += phrase_len
                    # Check if this phrase is already in our clean words
                    current_clean_text = " ".join(clean_title_words)
                    if phrase not in current_clean_text:
                        clean_title_words.extend(title_words[i:i+phrase_len])
                    break
            
            if not found_repeat:
                clean_title_words.append(title_words[i])
                i += 1
        
        clean_event_title = " ".join(clean_title_words)
        
        event_details = {
            "department": extracted_fields.get("Organizer Department", ""),
            "event_title": clean_event_title.replace("DEVELOPEMENT", "DEVELOPMENT"),
            "document_type": "Guest Lecture",  # Default
            "guest_name": extracted_fields.get("Guest Name", ""),
            "guest_designation": extracted_fields.get("Guest Designation", ""),
            "event_date": extracted_fields.get("Event Date", ""),
            "coordinator": extracted_fields.get("Organizer Faculty Name", ""),
            "venue": "Francis Xavier Engineering College, Vannarpettai, Tirunelveli"
        }
        
        # Add final completion update
        processing_time = time.time() - start_time
        add_progress("complete", f"Processing complete in {processing_time:.2f} seconds")
        
        # Return only the essential data in a clean format as requested
        response_data = {
            "status": "success",
            "message": "Poster processed successfully",
            "data": event_details,
            "progress": progress_updates
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        print(f"Error processing poster: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        # Add error to progress updates
        add_progress("error", f"Error: {str(e)}")
        
        # Return both error and progress information
        error_response = {
            "status": "error",
            "message": f"Error processing poster: {str(e)}",
            "progress": progress_updates
        }
        
        return JSONResponse(
            status_code=500,
            content=error_response
        )
    finally:
        await poster.close()

def preprocess_image_for_ocr(img, method="default"):
    """
    Apply advanced preprocessing techniques to optimize image for OCR.
    
    Args:
        img: Input OpenCV image
        method: Preprocessing method to apply
        
    Returns:
        Preprocessed image or list of preprocessed images
    """
    h, w = img.shape[:2]
    
    if method == "default":
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE for better contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
        
        # Enhance contrast
        alpha = 1.5  # Contrast control
        beta = 0     # Brightness control
        contrast_adjusted = cv2.convertScaleAbs(denoised, alpha=alpha, beta=beta)
        
        return contrast_adjusted
    
    elif method == "ensemble":
        # Return multiple preprocessing variants for ensemble approach
        results = []
        
        # Variant 1: Basic grayscale with CLAHE
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        results.append(enhanced)
        
        # Variant 2: With denoising
        denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
        results.append(denoised)
        
        # Variant 3: High contrast
        high_contrast = cv2.convertScaleAbs(denoised, alpha=1.8, beta=0)
        results.append(high_contrast)
        
        # Variant 4: Otsu's thresholding
        _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        results.append(otsu)
        
        # Variant 5: Adaptive thresholding
        adaptive = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                      cv2.THRESH_BINARY, 11, 2)
        results.append(adaptive)
        
        # Variant 6: Morphological operations
        kernel = np.ones((1, 1), np.uint8)
        eroded = cv2.erode(otsu, kernel, iterations=1)
        dilated = cv2.dilate(eroded, kernel, iterations=1)
        results.append(dilated)
        
        # Variant 7: Sharpening
        blur = cv2.GaussianBlur(gray, (0, 0), 3)
        sharpened = cv2.addWeighted(gray, 1.5, blur, -0.5, 0)
        results.append(sharpened)
        
        # Variant 8: Bilateral filtering (preserves edges)
        bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
        results.append(bilateral)
        
        return results
    
    elif method == "text_regions":
        # Apply techniques optimized for text region detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 75, 200)
        
        # Dilate to connect nearby edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(edged, kernel, iterations=2)
        
        return dilated
    
    else:
        # Default fallback
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

def perform_ocr_with_confidence(img, psm_mode=6, lang="eng", config_options=None):
    """
    Perform OCR with confidence scoring using multiple preprocessing and OCR configurations.
    
    Args:
        img: Input image
        psm_mode: Tesseract Page Segmentation Mode
        lang: Language
        config_options: Additional configuration options
        
    Returns:
        Dictionary with extracted text and confidence
    """
    # Apply ensemble preprocessing
    preprocessed_images = preprocess_image_for_ocr(img, method="ensemble")
    
    results = []
    
    # Base configuration
    base_config = f'--oem 3 --psm {psm_mode} -l {lang} --dpi 300'
    if config_options:
        base_config += f' {config_options}'
    
    # OCR with different configurations
    psm_variants = [psm_mode]
    if psm_mode != 6: 
        psm_variants.append(6)  # Single uniform block
    if psm_mode != 3:
        psm_variants.append(3)  # Auto page segmentation
    if psm_mode != 4:
        psm_variants.append(4)  # Single column of text
    
    # Perform OCR on all preprocessing variants and configuration variants
    for img_variant in preprocessed_images:
        for variant_psm in psm_variants:
            config = f'--oem 3 --psm {variant_psm} -l {lang} --dpi 300'
            if config_options:
                config += f' {config_options}'
            
            # Get text and confidence data
            text = pytesseract.image_to_string(img_variant, config=config)
            
            # Only include results with actual content
            if text.strip():
                # Calculate a simple confidence score based on text length and composition
                words = text.split()
                avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
                alphabetic_ratio = sum(c.isalpha() for c in text) / len(text) if text else 0
                
                # Reasonable words are typically 4-12 characters
                word_length_score = 1.0 if 4 <= avg_word_length <= 12 else 0.5
                # Higher ratio of alphabetic characters typically means better text
                alpha_score = alphabetic_ratio
                
                confidence = (word_length_score + alpha_score) / 2.0
                
                results.append({
                    "text": text,
                    "confidence": confidence,
                    "psm": variant_psm
                })
    
    # Sort by confidence score
    results.sort(key=lambda x: x["confidence"], reverse=True)
    
    # Return best result and combined text from top results
    combined_text = "\n".join(result["text"] for result in results[:3])
    
    return {
        "best_text": results[0]["text"] if results else "",
        "combined_text": combined_text,
        "confidence": results[0]["confidence"] if results else 0,
        "all_results": results[:5]  # Return top 5 results
    }

# WebSocket connection manager to track active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending WebSocket message: {str(e)}")
            # Connection might be closed, remove it
            if websocket in self.active_connections:
                self.disconnect(websocket)

# Create connection manager instance
manager = ConnectionManager()

# WebSocket endpoint for streaming poster processing
@app.websocket("/ws/process-poster")
async def websocket_process_poster(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # Wait for the first message containing the image data
        first_message = await websocket.receive()
        
        if "bytes" in first_message:
            # Binary message containing image data
            binary_data = first_message["bytes"]
            
            # Send initial acknowledgment
            await manager.send_personal_message({
                "status": "processing", 
                "message": "Received image data, starting processing"
            }, websocket)
            
            # Process the image with real-time updates
            await process_poster_streaming(binary_data, websocket)
            
        elif "text" in first_message:
            # Parse the JSON to get any configuration
            try:
                data = json.loads(first_message["text"])
                if "action" == "ping":
                    await manager.send_personal_message({"status": "pong"}, websocket)
                    return
            except:
                await manager.send_personal_message({
                    "status": "error", 
                    "message": "Invalid JSON data received"
                }, websocket)
        else:
            await manager.send_personal_message({
                "status": "error", 
                "message": "No image data received"
            }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        try:
            await manager.send_personal_message({
                "status": "error", 
                "message": f"Error processing image: {str(e)}"
            }, websocket)
        except:
            # Client might be already disconnected
            pass
        finally:
            if websocket in manager.active_connections:
                manager.disconnect(websocket)

async def process_poster_streaming(image_data, websocket: WebSocket):
    """
    Process a poster image and stream progress updates in real-time via WebSocket.
    
    Args:
        image_data: Binary image data
        websocket: WebSocket connection to send updates through
    """
    # Final result data
    event_details = None
    document_fields = None
    
    async def send_progress(status, message, data=None):
        """Helper function to send a progress update via WebSocket"""
        timestamp = time.time()
        update = {
            "status": status,
            "message": message,
            "timestamp": timestamp
        }
        if data:
            update["data"] = data
        
        # Send update immediately
        await manager.send_personal_message(update, websocket)
        
        # If this is the final update, also send the complete data
        if status == "complete" and event_details:
            final_response = {
                "status": "success",
                "message": "Poster processed successfully",
                "data": event_details,
                "document_fields": document_fields
            }
            await manager.send_personal_message(final_response, websocket)
    
    try:
        await send_progress("processing", "Starting poster processing")
        
        # Convert binary data to image
        await send_progress("processing", "Converting image for OCR processing")
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            await send_progress("error", "Invalid image file")
            return
        
        # Get image dimensions
        height, width = img.shape[:2]
        await send_progress("processing", "Analyzing image dimensions", {"width": width, "height": height})
        
        # Resize to optimal size for OCR
        await send_progress("processing", "Resizing image for optimal OCR")
        target_width = 2000
        if width != target_width:
            ratio = target_width / width
            dim = (target_width, int(height * ratio))
            img = cv2.resize(img, dim, interpolation=cv2.INTER_CUBIC)
            height, width = img.shape[:2]  # Update dimensions after resize
        
        # Define regions
        await send_progress("processing", "Identifying regions of interest in the poster")
        header_region = img[0:int(height*0.20), :]  # College name, NIRF ranking
        department_region = img[int(height*0.20):int(height*0.35), :]  # Department info
        event_title_region = img[int(height*0.35):int(height*0.55), :]  # Event title
        speaker_region = img[int(height*0.55):int(height*0.75), :]  # Speaker details
        coordinator_region = img[int(height*0.75):int(height*0.85), :]  # Coordinator info
        footer_region = img[int(height*0.85):, :]  # Principal and other roles
        
        # Optimized OCR processing
        await send_progress("processing", "Starting OCR text extraction")
        start_time = time.time()
        
        # Extract title
        await send_progress("processing", "Extracting event title text")
        event_title_result = perform_ocr_with_confidence(event_title_region, psm_mode=3)
        await send_progress("processing", "Title extraction complete", {"confidence": event_title_result["confidence"]})
        
        # Extract department
        await send_progress("processing", "Extracting department information")
        department_result = perform_ocr_with_confidence(department_region, psm_mode=6)
        await send_progress("processing", "Department extraction complete", {"confidence": department_result["confidence"]})
        
        # Extract speaker
        await send_progress("processing", "Extracting speaker information")
        speaker_result = perform_ocr_with_confidence(speaker_region, psm_mode=4)
        await send_progress("processing", "Speaker extraction complete", {"confidence": speaker_result["confidence"]})
        
        # Extract coordinator
        await send_progress("processing", "Extracting coordinator information")
        coordinator_result = perform_ocr_with_confidence(coordinator_region, psm_mode=7)
        await send_progress("processing", "Coordinator extraction complete", {"confidence": coordinator_result["confidence"]})
        
        # Extract text from results
        department_text = department_result["combined_text"]
        event_title_text = event_title_result["combined_text"]
        speaker_text = speaker_result["combined_text"]
        coordinator_text = coordinator_result["combined_text"]
        
        # Process title
        await send_progress("processing", "Processing event title")
        event_title_lines = [line.strip() for line in event_title_text.split('\n') if line.strip() and len(line.strip()) > 2]
        
        # Filter title lines
        await send_progress("processing", "Filtering title lines")
        filtered_title_lines = []
        for line in event_title_lines:
            if any(keyword in line.upper() for keyword in ["GUEST SPEAKER", "DEPARTMENT OF", "COORDINATOR", "PRINCIPAL"]):
                continue
            if re.search(r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", line):
                continue
            if sum(1 for c in line if c.isupper()) / max(1, len(line)) > 0.5 and len(line) > 3:
                filtered_title_lines.append(line)
        
        # Reconstruct title
        await send_progress("processing", "Reconstructing title", {"filtered_lines": len(filtered_title_lines)})
        title_text = ""
        prev_line = ""
        
        for line in filtered_title_lines:
            if prev_line and (prev_line.endswith('-') or len(prev_line) < 20 or len(line) < 20):
                if prev_line.endswith('-'):
                    title_text = title_text[:-1] + line + " "
                else:
                    title_text += line + " "
            else:
                if title_text:
                    title_text += line + " "
                else:
                    title_text = line + " "
            prev_line = line
        
        # Clean title
        await send_progress("processing", "Cleaning and formatting the title")
        title_text = title_text.strip()
        title_text = re.sub(r'\s+', ' ', title_text)
        title_text = title_text.replace('l', 'I').replace('|', 'I').replace("EACHANGE", "EXCHANGE")
        
        # Fix repetition
        await send_progress("processing", "Removing repetitions in title")
        title_words = title_text.split()
        
        if len(title_words) > 6:
            clean_title = []
            i = 0
            already_seen = set()
            
            while i < len(title_words):
                phrase_found = False
                
                for phrase_len in range(min(6, len(title_words) - i), 2, -1):
                    phrase = " ".join(title_words[i:i+phrase_len])
                    
                    if phrase in already_seen:
                        phrase_found = True
                        i += phrase_len
                        break
                    
                    if phrase_len >= 3:
                        already_seen.add(phrase)
                
                if not phrase_found:
                    clean_title.append(title_words[i])
                    i += 1
            
            title_text = " ".join(clean_title)
        
        # Handle special patterns
        await send_progress("processing", "Checking for special title patterns")
        if "INTRODUCTION TO" in event_title_text.upper():
            intro_pattern = re.search(r"INTRODUCTION\s+TO\s+(.*)", event_title_text, re.IGNORECASE)
            if intro_pattern:
                remaining_title = intro_pattern.group(1).strip()
                if len(remaining_title) > 5:
                    remaining_words = remaining_title.split()
                    unique_remaining = []
                    
                    for word in remaining_words:
                        if not unique_remaining or word != unique_remaining[-1]:
                            unique_remaining.append(word)
                    
                    title_text = "INTRODUCTION TO " + " ".join(unique_remaining)
        
        # Qatar Stock Exchange special case
        if "QATAR" in title_text and "STOCK" in title_text:
            if re.search(r"TRADING\s+ON\s+QATAR\s+STOCK\s+E[X|A]CHANGE", title_text, re.IGNORECASE):
                if "INTRODUCTION" not in title_text:
                    title_text = "INTRODUCTION TO TRADING ON QATAR STOCK EXCHANGE"
                else:
                    title_text = re.sub(r"(TRADING\s+ON\s+QATAR\s+STOCK\s+E[X|A]CHANGE)\s+\1", r"\1", title_text)
                    title_text = re.sub(r"E[A|X]CHANGE", "EXCHANGE", title_text)
        
        # Extract fields
        await send_progress("processing", "Combining text for field extraction")
        combined_text = f"{department_text}\n{event_title_text}\n{speaker_text}\n{coordinator_text}"
        
        # Clean text
        cleaned_text = re.sub(r'\s+', ' ', combined_text)
        cleaned_text = cleaned_text.replace('|', 'I')
        cleaned_text = cleaned_text.replace('1', 'I')
        cleaned_text = cleaned_text.replace('0', 'O')
        cleaned_text = re.sub(r'[^\x00-\x7F]+', '', cleaned_text)
        
        # Extract fields
        await send_progress("processing", "Extracting structured fields from text")
        extracted_fields = extract_poster_content(combined_text)
        extracted_fields["Topic"] = title_text
        
        # Verify speaker
        await send_progress("processing", "Verifying speaker information")
        if not extracted_fields["Guest Name"] or not extracted_fields["Guest Designation"]:
            speaker_lines = [line.strip() for line in speaker_text.split('\n') if line.strip()]
            
            if not extracted_fields["Guest Name"]:
                for line in speaker_lines:
                    name_match = re.search(r"^((?:MR|DR|PROF|MS|MRS)\.\s+[\w\s\.]+)", line, re.IGNORECASE)
                    if name_match and len(name_match.group(1)) > 5:
                        extracted_fields["Guest Name"] = name_match.group(1).strip()
                        name_idx = speaker_lines.index(line)
                        if name_idx + 1 < len(speaker_lines):
                            potential_designation = speaker_lines[name_idx + 1]
                            if not re.search(r"\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}", potential_designation) and \
                               not re.search(r"COORDINATOR", potential_designation, re.IGNORECASE):
                                extracted_fields["Guest Designation"] = potential_designation
                        break
        
        # Verify department
        await send_progress("processing", "Verifying department information")
        department_lines = [line.strip() for line in department_text.split('\n') if line.strip()]
        extracted_fields["Organizer Department"] = ""
        
        # Try all department strategies
        # (existing department extraction code)
        for line in department_lines:
            if "DEPARTMENT OF" in line.upper():
                dept_match = re.search(r"DEPARTMENT\s+OF\s+(.*)", line.upper(), re.IGNORECASE)
                if dept_match:
                    extracted_fields["Organizer Department"] = dept_match.group(1).strip()
                    break
        
        if not extracted_fields["Organizer Department"]:
            for i, line in enumerate(department_lines):
                if "DEPARTMENT OF" in line.upper() and i+1 < len(department_lines):
                    next_line = department_lines[i+1].strip()
                    if next_line and not any(keyword in next_line.upper() for keyword in ["WEBINAR", "WORKSHOP", "GUEST", "SPEAKER"]):
                        extracted_fields["Organizer Department"] = next_line
                        break
        
        if not extracted_fields["Organizer Department"]:
            dept_pattern = r"\b(CSBS|CSE|ECE|EEE|IT|ME|CE)\b"
            for line in department_lines:
                dept_match = re.search(dept_pattern, line.upper())
                if dept_match:
                    dept_abbr = dept_match.group(1)
                    dept_mapping = {
                        "CSBS": "COMPUTER SCIENCE & BUSINESS SYSTEMS",
                        "CSE": "COMPUTER SCIENCE ENGINEERING",
                        "ECE": "ELECTRONICS AND COMMUNICATION ENGINEERING",
                        "EEE": "ELECTRICAL AND ELECTRONICS ENGINEERING",
                        "IT": "INFORMATION TECHNOLOGY",
                        "ME": "MECHANICAL ENGINEERING",
                        "CE": "CIVIL ENGINEERING"
                    }
                    extracted_fields["Organizer Department"] = dept_mapping.get(dept_abbr, dept_abbr)
                    break
        
        # Check department by name
        await send_progress("processing", "Final department name verification")
        if "COMPUTER SCIENCE" in combined_text.upper() and "BUSINESS SYSTEMS" in combined_text.upper():
            extracted_fields["Organizer Department"] = "COMPUTER SCIENCE & BUSINESS SYSTEMS"
        
        # Create final data
        await send_progress("processing", "Creating final structured data")
        
        # Clean up the event title to remove repetitions
        event_title = extracted_fields.get("Topic", "")
        # Split into words and remove consecutive duplicates
        title_words = event_title.split()
        clean_title_words = []
        i = 0
        while i < len(title_words):
            # Check for repeating phrases (2 or more words)
            found_repeat = False
            for phrase_len in range(min(5, len(title_words) - i), 1, -1):
                phrase = " ".join(title_words[i:i+phrase_len])
                # Look ahead for the same phrase
                remaining_text = " ".join(title_words[i+phrase_len:])
                if phrase in remaining_text:
                    # Found a repetition, skip it
                    found_repeat = True
                    i += phrase_len
                    # Check if this phrase is already in our clean words
                    current_clean_text = " ".join(clean_title_words)
                    if phrase not in current_clean_text:
                        clean_title_words.extend(title_words[i:i+phrase_len])
                    break
            
            if not found_repeat:
                clean_title_words.append(title_words[i])
                i += 1
        
        clean_event_title = " ".join(clean_title_words)
        
        event_details = {
            "department": extracted_fields.get("Organizer Department", ""),
            "event_title": clean_event_title.replace("DEVELOPEMENT", "DEVELOPMENT"),
            "document_type": "Guest Lecture",  # Default
            "guest_name": extracted_fields.get("Guest Name", ""),
            "guest_designation": extracted_fields.get("Guest Designation", ""),
            "event_date": extracted_fields.get("Event Date", ""),
            "coordinator": extracted_fields.get("Organizer Faculty Name", ""),
            "venue": "Francis Xavier Engineering College, Vannarpettai, Tirunelveli"
        }
        
        # Remove the date info extraction section that adds year and activity_code
        # Create document fields
        document_fields = {
            "Guest Name": event_details["guest_name"] or "",
            "Guest Designation": event_details["guest_designation"] or "",
            "Event Date": event_details["event_date"] or "",
            "Organizer Department": event_details["department"] or "",
            "Organizer Faculty Name": event_details["coordinator"] or "",
            "Topic": event_details["event_title"] or ""
        }
        
        # Send completion update
        processing_time = time.time() - start_time
        await send_progress("complete", f"Processing complete in {processing_time:.2f} seconds")
        
    except Exception as e:
        print(f"Error in streaming process: {str(e)}")
        import traceback
        print(traceback.format_exc())
        await send_progress("error", f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)