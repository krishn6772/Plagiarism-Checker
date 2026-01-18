from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.database import get_database
from app.utils.security import get_current_user
from app.utils.google_similarity import calculate_text_similarity, check_google_similarity
from app.utils.ai_detector import detect_ai_content
from app.schemas import PlagiarismCheck, PlagiarismResult, GoogleSource, AIDetectionResult, AIIndicator
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import PyPDF2
import docx
import io
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Google API Configuration from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        
        # If no text was extracted, return a meaningful message
        if not text.strip():
            return "[PDF file appears to be scanned or image-based. Text extraction not possible. Please use OCR or convert to text format.]"
        
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {str(e)}")
        # Return a fallback instead of raising an error
        return f"[PDF text extraction failed: {str(e)}. File may be corrupted or password-protected.]"


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = docx.Document(docx_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
        
        # If no text was extracted, return a meaningful message
        if not text.strip():
            return "[DOCX file appears to be empty or contains only images. Text extraction not possible.]"
        
        return text.strip()
    except Exception as e:
        print(f"DOCX extraction error: {str(e)}")
        # Return a fallback instead of raising an error
        return f"[DOCX text extraction failed: {str(e)}. File may be corrupted or password-protected.]"


# Define schemas for Google-only check
class GoogleOnlyCheck(BaseModel):
    text: str


class GoogleOnlyResult(BaseModel):
    text: str
    google_similarity: Optional[float] = None
    google_sources: Optional[List[GoogleSource]] = None
    google_highlighted_text: Optional[str] = None
    all_google_matches: Optional[List[str]] = None
    message: str


@router.post("/check", response_model=PlagiarismResult)
async def check_plagiarism(
    plagiarism_data: PlagiarismCheck,
    current_user: dict = Depends(get_current_user)
):
    """Check plagiarism between two text inputs"""
    db = get_database()

    if not plagiarism_data.text1 or not plagiarism_data.text2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both text inputs are required"
        )

    # Calculate text similarity
    similarity_score = calculate_text_similarity(
        plagiarism_data.text1,
        plagiarism_data.text2
    )

    # Check Google similarity for BOTH texts if requested
    google_similarity_text1 = None
    google_sources_text1 = []
    google_highlighted_text1 = None
    all_google_matches_text1 = []

    google_similarity_text2 = None
    google_sources_text2 = []
    google_highlighted_text2 = None
    all_google_matches_text2 = []

    if plagiarism_data.check_google:
        # Check Text 1 against Google
        google_result1 = check_google_similarity(
            plagiarism_data.text1,
            GOOGLE_API_KEY,
            GOOGLE_SEARCH_ENGINE_ID
        )

        if google_result1:
            google_similarity_text1 = google_result1["similarity_percentage"]
            google_sources_text1 = [
                GoogleSource(**source) for source in google_result1["sources"]
            ]
            google_highlighted_text1 = google_result1.get(
                "highlighted_text", plagiarism_data.text1)
            all_google_matches_text1 = google_result1.get("all_matches", [])

        # Check Text 2 against Google
        google_result2 = check_google_similarity(
            plagiarism_data.text2,
            GOOGLE_API_KEY,
            GOOGLE_SEARCH_ENGINE_ID
        )

        if google_result2:
            google_similarity_text2 = google_result2["similarity_percentage"]
            google_sources_text2 = [
                GoogleSource(**source) for source in google_result2["sources"]
            ]
            google_highlighted_text2 = google_result2.get(
                "highlighted_text", plagiarism_data.text2)
            all_google_matches_text2 = google_result2.get("all_matches", [])

    # Use higher Google similarity for overall score
    google_similarity = None
    if google_similarity_text1 is not None or google_similarity_text2 is not None:
        google_similarity = max(
            google_similarity_text1 if google_similarity_text1 is not None else 0,
            google_similarity_text2 if google_similarity_text2 is not None else 0
        )

    # Check AI content if requested
    ai_detection_result = None
    if plagiarism_data.check_ai:
        ai_result = detect_ai_content(plagiarism_data.text1)
        ai_detection_result = AIDetectionResult(
            ai_probability=ai_result["ai_probability"],
            human_probability=ai_result["human_probability"],
            confidence=ai_result["confidence"],
            analysis=ai_result["analysis"],
            message=ai_result["message"],
            ai_indicators=[AIIndicator(**indicator) for indicator in ai_result["ai_indicators"]],
            highlighted_text=ai_result["highlighted_text"]
        )

    # Save to history with separate text metadata
    history_entry = {
        "user_id": str(current_user["_id"]),
        "text1": plagiarism_data.text1,
        "text2": plagiarism_data.text2,
        "text1_name": "Text 1 (Manual Input)",
        "text2_name": "Text 2 (Manual Input)",
        "text1_metadata": {
            "source": "manual_input",
            "length": len(plagiarism_data.text1),
            "word_count": len(plagiarism_data.text1.split()),
            "submitted_at": datetime.utcnow().isoformat(),
            "google_similarity": google_similarity_text1,
            "google_sources_count": len(google_sources_text1) if google_sources_text1 else 0
        },
        "text2_metadata": {
            "source": "manual_input",
            "length": len(plagiarism_data.text2),
            "word_count": len(plagiarism_data.text2.split()),
            "submitted_at": datetime.utcnow().isoformat(),
            "google_similarity": google_similarity_text2,
            "google_sources_count": len(google_sources_text2) if google_sources_text2 else 0
        },
        "similarity_score": similarity_score,
        "google_similarity": google_similarity,
        "google_similarity_text1": google_similarity_text1,
        "google_similarity_text2": google_similarity_text2,
        "google_sources_text1": [source.dict() for source in google_sources_text1] if google_sources_text1 else None,
        "google_sources_text2": [source.dict() for source in google_sources_text2] if google_sources_text2 else None,
        "google_highlighted_text1": google_highlighted_text1,
        "google_highlighted_text2": google_highlighted_text2,
        "google_sources": [source.dict() for source in google_sources_text1] if google_sources_text1 else None,
        "google_highlighted_text": google_highlighted_text1,
        "ai_detection": ai_detection_result.dict() if ai_detection_result else None,
        "timestamp": datetime.utcnow(),
        "file_name": None,
        "check_type": "text_comparison"
    }

    await db.history.insert_one(history_entry)

    # Determine message based on similarity
    if similarity_score >= 80:
        message = "High similarity detected - Likely plagiarism"
    elif similarity_score >= 50:
        message = "Moderate similarity detected - Review recommended"
    else:
        message = "Low similarity - Content appears original"

    return PlagiarismResult(
        similarity_score=similarity_score,
        google_similarity=google_similarity,
        google_similarity_text1=google_similarity_text1,
        google_similarity_text2=google_similarity_text2,
        google_sources=google_sources_text1 if google_sources_text1 else None,
        google_sources_text1=google_sources_text1 if google_sources_text1 else None,
        google_sources_text2=google_sources_text2 if google_sources_text2 else None,
        google_highlighted_text=google_highlighted_text1,
        google_highlighted_text1=google_highlighted_text1,
        google_highlighted_text2=google_highlighted_text2,
        all_google_matches=all_google_matches_text1 if all_google_matches_text1 else None,
        all_google_matches_text1=all_google_matches_text1 if all_google_matches_text1 else None,
        all_google_matches_text2=all_google_matches_text2 if all_google_matches_text2 else None,
        ai_detection=ai_detection_result,
        message=message
    )


@router.post("/upload", response_model=PlagiarismResult)
async def check_plagiarism_from_file(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    check_google: bool = Form(False),
    check_ai: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Check plagiarism between two uploaded files (PDF, DOCX, or TXT)"""
    db = get_database()

    # Validate file types
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ]

    if file1.content_type not in allowed_types or file2.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, and TXT files are supported"
        )

    # Read file contents
    content1 = await file1.read()
    content2 = await file2.read()

    # Extract text based on file type
    if file1.content_type == "application/pdf":
        text1 = extract_text_from_pdf(content1)
    elif file1.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text1 = extract_text_from_docx(content1)
    else:
        try:
            text1 = content1.decode("utf-8")
        except UnicodeDecodeError:
            text1 = content1.decode("latin-1", errors='ignore')

    if file2.content_type == "application/pdf":
        text2 = extract_text_from_pdf(content2)
    elif file2.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text2 = extract_text_from_docx(content2)
    else:
        try:
            text2 = content2.decode("utf-8")
        except UnicodeDecodeError:
            text2 = content2.decode("latin-1", errors='ignore')

    # Check if text extraction was successful
    if not text1 or len(text1.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not extract meaningful text from {file1.filename}. The file may be empty, corrupted, or image-based."
        )
    
    if not text2 or len(text2.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not extract meaningful text from {file2.filename}. The file may be empty, corrupted, or image-based."
        )

    # Calculate similarity
    similarity_score = calculate_text_similarity(text1, text2)

    # Check Google similarity for BOTH files if requested
    google_similarity_text1 = None
    google_sources_text1 = []
    google_highlighted_text1 = None
    all_google_matches_text1 = []

    google_similarity_text2 = None
    google_sources_text2 = []
    google_highlighted_text2 = None
    all_google_matches_text2 = []

    if check_google:
        # Check File 1 (text1) against Google
        google_result1 = check_google_similarity(
            text1,
            GOOGLE_API_KEY,
            GOOGLE_SEARCH_ENGINE_ID
        )

        if google_result1:
            google_similarity_text1 = google_result1["similarity_percentage"]
            google_sources_text1 = [
                GoogleSource(**source) for source in google_result1["sources"]
            ]
            google_highlighted_text1 = google_result1.get(
                "highlighted_text", text1)
            all_google_matches_text1 = google_result1.get("all_matches", [])

        # Check File 2 (text2) against Google
        google_result2 = check_google_similarity(
            text2,
            GOOGLE_API_KEY,
            GOOGLE_SEARCH_ENGINE_ID
        )

        if google_result2:
            google_similarity_text2 = google_result2["similarity_percentage"]
            google_sources_text2 = [
                GoogleSource(**source) for source in google_result2["sources"]
            ]
            google_highlighted_text2 = google_result2.get(
                "highlighted_text", text2)
            all_google_matches_text2 = google_result2.get("all_matches", [])

    # Use higher Google similarity for overall score
    google_similarity = None
    if google_similarity_text1 is not None or google_similarity_text2 is not None:
        google_similarity = max(
            google_similarity_text1 if google_similarity_text1 is not None else 0,
            google_similarity_text2 if google_similarity_text2 is not None else 0
        )

    # Check AI content if requested
    ai_detection_result = None
    if check_ai:
        ai_result = detect_ai_content(text1)
        ai_detection_result = AIDetectionResult(
            ai_probability=ai_result["ai_probability"],
            human_probability=ai_result["human_probability"],
            confidence=ai_result["confidence"],
            analysis=ai_result["analysis"],
            message=ai_result["message"],
            ai_indicators=[AIIndicator(**indicator) for indicator in ai_result["ai_indicators"]],
            highlighted_text=ai_result["highlighted_text"]
        )

    # Save to history with detailed metadata for each file
    history_entry = {
        "user_id": str(current_user["_id"]),
        "text1": text1,
        "text2": text2,
        "text1_name": file1.filename,
        "text2_name": file2.filename,
        "text1_metadata": {
            "source": "file_upload",
            "filename": file1.filename,
            "file_type": file1.content_type,
            "file_size": len(content1),
            "length": len(text1),
            "word_count": len(text1.split()),
            "submitted_at": datetime.utcnow().isoformat(),
            "google_similarity": google_similarity_text1,
            "google_sources_count": len(google_sources_text1) if google_sources_text1 else 0
        },
        "text2_metadata": {
            "source": "file_upload",
            "filename": file2.filename,
            "file_type": file2.content_type,
            "file_size": len(content2),
            "length": len(text2),
            "word_count": len(text2.split()),
            "submitted_at": datetime.utcnow().isoformat(),
            "google_similarity": google_similarity_text2,
            "google_sources_count": len(google_sources_text2) if google_sources_text2 else 0
        },
        "similarity_score": similarity_score,
        "google_similarity": google_similarity,
        "google_similarity_text1": google_similarity_text1,
        "google_similarity_text2": google_similarity_text2,
        "google_sources_text1": [source.dict() for source in google_sources_text1] if google_sources_text1 else None,
        "google_sources_text2": [source.dict() for source in google_sources_text2] if google_sources_text2 else None,
        "google_highlighted_text1": google_highlighted_text1,
        "google_highlighted_text2": google_highlighted_text2,
        "google_sources": [source.dict() for source in google_sources_text1] if google_sources_text1 else None,
        "google_highlighted_text": google_highlighted_text1,
        "ai_detection": ai_detection_result.dict() if ai_detection_result else None,
        "timestamp": datetime.utcnow(),
        "file_name": f"{file1.filename} vs {file2.filename}",
        "check_type": "file_upload"
    }

    await db.history.insert_one(history_entry)

    # Determine message
    if similarity_score >= 80:
        message = "High similarity detected - Likely plagiarism"
    elif similarity_score >= 50:
        message = "Moderate similarity detected - Review recommended"
    else:
        message = "Low similarity - Content appears original"

    return PlagiarismResult(
        similarity_score=similarity_score,
        google_similarity=google_similarity,
        google_similarity_text1=google_similarity_text1,
        google_similarity_text2=google_similarity_text2,
        google_sources=google_sources_text1 if google_sources_text1 else None,
        google_sources_text1=google_sources_text1 if google_sources_text1 else None,
        google_sources_text2=google_sources_text2 if google_sources_text2 else None,
        google_highlighted_text=google_highlighted_text1,
        google_highlighted_text1=google_highlighted_text1,
        google_highlighted_text2=google_highlighted_text2,
        all_google_matches=all_google_matches_text1 if all_google_matches_text1 else None,
        all_google_matches_text1=all_google_matches_text1 if all_google_matches_text1 else None,
        all_google_matches_text2=all_google_matches_text2 if all_google_matches_text2 else None,
        ai_detection=ai_detection_result,
        message=message
    )


@router.post("/check-google-only", response_model=GoogleOnlyResult)
async def check_google_only(
    google_check: GoogleOnlyCheck,
    current_user: dict = Depends(get_current_user)
):
    """Check text similarity with Google sources only (no text comparison)"""
    db = get_database()

    if not google_check.text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is required"
        )

    # Check Google similarity
    google_similarity = None
    google_sources = []
    google_highlighted_text = None
    all_google_matches = []

    google_result = check_google_similarity(
        google_check.text,
        GOOGLE_API_KEY,
        GOOGLE_SEARCH_ENGINE_ID
    )

    if google_result:
        google_similarity = google_result["similarity_percentage"]
        google_sources = [
            GoogleSource(**source) for source in google_result["sources"]
        ]
        google_highlighted_text = google_result.get(
            "highlighted_text", google_check.text)
        all_google_matches = google_result.get("all_matches", [])
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google API not configured or request failed"
        )

    # Save to history
    history_entry = {
        "user_id": str(current_user["_id"]),
        "text1": google_check.text,
        "text2": "[Google Only Check]",
        "text1_name": "Google Check Input",
        "text2_name": None,
        "text1_metadata": {
            "source": "google_only_check",
            "length": len(google_check.text),
            "word_count": len(google_check.text.split()),
            "submitted_at": datetime.utcnow().isoformat()
        },
        "text2_metadata": None,
        "similarity_score": 0.0,
        "google_similarity": google_similarity,
        "google_sources": [source.dict() for source in google_sources] if google_sources else None,
        "google_highlighted_text": google_highlighted_text,
        "timestamp": datetime.utcnow(),
        "file_name": None,
        "check_type": "google_only"
    }

    await db.history.insert_one(history_entry)

    # Determine message based on Google similarity
    if google_similarity >= 80:
        message = "High similarity with online sources - Potential plagiarism detected"
    elif google_similarity >= 50:
        message = "Moderate similarity with online sources - Review recommended"
    elif google_similarity > 0:
        message = "Low similarity with online sources - Mostly original content"
    else:
        message = "No similar content found online - Content appears original"

    return GoogleOnlyResult(
        text=google_check.text,
        google_similarity=google_similarity,
        google_sources=google_sources if google_sources else None,
        google_highlighted_text=google_highlighted_text,
        all_google_matches=all_google_matches if all_google_matches else None,
        message=message
    )