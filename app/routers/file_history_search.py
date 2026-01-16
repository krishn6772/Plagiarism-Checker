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
    Works for PDF, DOCX, and TXT files
    """
    db = get_database()
    user_id = str(current_user["_id"])
    
    print(f"Checking file history for: {file.filename}, Type: {file.content_type}")
    
    # Extract text from uploaded file
    content = await file.read()
    
    if file.content_type == "application/pdf":
        text = extract_text_from_pdf(content)
        print(f"Extracted {len(text)} characters from PDF")
    elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text = extract_text_from_docx(content)
        print(f"Extracted {len(text)} characters from DOCX")
    elif file.content_type == "text/plain":
        text = content.decode("utf-8", errors='ignore')
        print(f"Read {len(text)} characters from TXT")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )
    
    if not text or len(text.strip()) < 50:
        print(f"Text too short: {len(text)} characters")
        return FileHistorySearchResponse(
            matches_found=0,
            matches=[],
            highest_similarity=0.0
        )
    
    # Get user's history
    history_records = []
    cursor = db.history.find({"user_id": user_id})
    
    async for record in cursor:
        history_records.append(record)
    
    print(f"Checking against {len(history_records)} history records")
    
    matches = []
    highest_similarity = 0.0
    
    # Compare against each history record
    for record in history_records:
        text1 = record.get("text1", "")
        text2 = record.get("text2", "")
        
        if not text1 and not text2:
            continue
            
        similarity1 = calculate_text_similarity(text, text1) if text1 else 0
        similarity2 = calculate_text_similarity(text, text2) if text2 else 0
        
        max_similarity = max(similarity1, similarity2)
        
        print(f"Record {record['_id']}: sim1={similarity1:.2f}%, sim2={similarity2:.2f}%")
        
        if max_similarity >= min_similarity:
            matched_text = text1 if similarity1 > similarity2 else text2
            
            file_name = record.get("file_name")
            if not file_name or file_name == "[Google Only Check]":
                file_name = "Text Comparison"
            
            matches.append(FileHistoryMatch(
                history_id=str(record["_id"]),
                similarity_score=round(max_similarity, 2),
                timestamp=record["timestamp"],
                file_name=file_name,
                matched_text_preview=matched_text[:200] + "..." if len(matched_text) > 200 else matched_text,
                original_text1_preview=text1[:150] + "..." if len(text1) > 150 else text1,
                original_text2_preview=text2[:150] + "..." if len(text2) > 150 else text2
            ))
            
            highest_similarity = max(highest_similarity, max_similarity)
    
    # Sort by similarity score (highest first)
    matches.sort(key=lambda x: x.similarity_score, reverse=True)
    
    print(f"Found {len(matches)} matches, highest: {highest_similarity:.2f}%")
    
    return FileHistorySearchResponse(
        matches_found=len(matches),
        matches=matches,
        highest_similarity=round(highest_similarity, 2) if highest_similarity > 0 else 0.0
    )