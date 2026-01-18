from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.database import get_database
from app.utils.security import get_current_user
from app.utils.google_similarity import calculate_text_similarity
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import PyPDF2
import docx
import io

router = APIRouter()

class FileHistoryMatch(BaseModel):
    history_id: str
    similarity_score: float
    timestamp: datetime
    file_name: Optional[str] = "Text Comparison"
    matched_text_preview: str
    original_text1_preview: str
    original_text2_preview: str
    matched_with: str  # NEW: "text1" or "text2"
    text_name: Optional[str] = None  # NEW: Name of matched text
    text_metadata: Optional[dict] = None  # NEW: Metadata of matched text

class FileHistorySearchResponse(BaseModel):
    matches_found: int
    matches: List[FileHistoryMatch]
    highest_similarity: float

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
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = docx.Document(docx_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
        return text.strip()
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return ""

@router.post("/check-file-history", response_model=FileHistorySearchResponse)
async def check_file_in_history(
    file: UploadFile = File(...),
    min_similarity: float = Form(50.0),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if uploaded file content matches any previous submissions in history
    Works for PDF, DOCX, and TXT files - checks separately against text1 and text2
    """
    db = get_database()
    user_id = str(current_user["_id"])
    
    print(f"📄 Checking file history for: {file.filename}, Type: {file.content_type}")
    
    # Extract text from uploaded file
    content = await file.read()
    
    if file.content_type == "application/pdf":
        text = extract_text_from_pdf(content)
        print(f"Extracted {len(text)} characters from PDF")
    elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text = extract_text_from_docx(content)
        print(f"Extracted {len(text)} characters from DOCX")
    elif file.content_type == "text/plain":
        try:
            text = content.decode("utf-8", errors='ignore')
        except Exception as e:
            text = content.decode("latin-1", errors='ignore')
        print(f"Read {len(text)} characters from TXT")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )
    
    if not text or len(text.strip()) < 50:
        print(f"⚠️ Text too short: {len(text)} characters")
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract meaningful text from {file.filename}. The file may be empty, corrupted, or image-based. Please ensure the file contains extractable text."
        )
    
    # Get user's history
    history_records = []
    cursor = db.history.find({"user_id": user_id})
    
    async for record in cursor:
        history_records.append(record)
    
    print(f"🔍 Checking against {len(history_records)} history records")
    
    matches = []
    highest_similarity = 0.0
    
    # Compare against each history record - CHECK BOTH TEXT1 AND TEXT2 SEPARATELY
    for record in history_records:
        text1 = record.get("text1", "")
        text2 = record.get("text2", "")
        
        if not text1 and not text2:
            continue
        
        # Check against text1
        if text1:
            similarity1 = calculate_text_similarity(text, text1)
            print(f"Record {record['_id']} - Text1 similarity: {similarity1:.2f}%")
            
            if similarity1 >= min_similarity:
                file_name = record.get("file_name")
                if not file_name or file_name == "[Google Only Check]":
                    file_name = "Text Comparison"
                
                text1_name = record.get("text1_name", "Text 1")
                text1_metadata = record.get("text1_metadata", {})
                
                matches.append(FileHistoryMatch(
                    history_id=str(record["_id"]),
                    similarity_score=round(similarity1, 2),
                    timestamp=record["timestamp"],
                    file_name=file_name,
                    matched_text_preview=text1[:200] + "..." if len(text1) > 200 else text1,
                    original_text1_preview=text1[:150] + "..." if len(text1) > 150 else text1,
                    original_text2_preview=text2[:150] + "..." if len(text2) > 150 else text2,
                    matched_with="text1",
                    text_name=text1_name,
                    text_metadata=text1_metadata
                ))
                
                highest_similarity = max(highest_similarity, similarity1)
        
        # Check against text2 (if it's not a google-only check)
        if text2 and text2 != "[Google Only Check]":
            similarity2 = calculate_text_similarity(text, text2)
            print(f"Record {record['_id']} - Text2 similarity: {similarity2:.2f}%")
            
            if similarity2 >= min_similarity:
                file_name = record.get("file_name")
                if not file_name or file_name == "[Google Only Check]":
                    file_name = "Text Comparison"
                
                text2_name = record.get("text2_name", "Text 2")
                text2_metadata = record.get("text2_metadata", {})
                
                matches.append(FileHistoryMatch(
                    history_id=str(record["_id"]),
                    similarity_score=round(similarity2, 2),
                    timestamp=record["timestamp"],
                    file_name=file_name,
                    matched_text_preview=text2[:200] + "..." if len(text2) > 200 else text2,
                    original_text1_preview=text1[:150] + "..." if len(text1) > 150 else text1,
                    original_text2_preview=text2[:150] + "..." if len(text2) > 150 else text2,
                    matched_with="text2",
                    text_name=text2_name,
                    text_metadata=text2_metadata
                ))
                
                highest_similarity = max(highest_similarity, similarity2)
    
    # Sort by similarity score (highest first)
    matches.sort(key=lambda x: x.similarity_score, reverse=True)
    
    print(f"✅ Found {len(matches)} matches, highest: {highest_similarity:.2f}%")
    
    return FileHistorySearchResponse(
        matches_found=len(matches),
        matches=matches,
        highest_similarity=round(highest_similarity, 2) if highest_similarity > 0 else 0.0
    )