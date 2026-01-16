from fastapi import APIRouter, Depends, HTTPException
from app.database import get_database
from app.utils.security import get_current_user
from app.utils.google_similarity import calculate_text_similarity
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class HistoryMatch(BaseModel):
    history_id: str
    user_id: str
    similarity_score: float
    timestamp: datetime
    matched_text: str
    original_text1: str
    original_text2: str
    file_name: Optional[str] = None  # Make it Optional and provide default

class HistorySearchRequest(BaseModel):
    text: str
    min_similarity: float = 50.0  # Minimum similarity threshold

class HistorySearchResponse(BaseModel):
    matches_found: int
    matches: List[HistoryMatch]
    highest_similarity: float

@router.post("/search-history", response_model=HistorySearchResponse)
async def search_in_history(
    request: HistorySearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for similar text in user's history"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    # Get all user's history
    history_records = []
    cursor = db.history.find({"user_id": user_id})
    
    async for record in cursor:
        history_records.append(record)
    
    matches = []
    highest_similarity = 0.0
    
    # Compare against each history record
    for record in history_records:
        # Check similarity with text1
        similarity1 = calculate_text_similarity(request.text, record["text1"])
        
        # Check similarity with text2
        similarity2 = calculate_text_similarity(request.text, record["text2"])
        
        # Use the higher similarity score
        max_similarity = max(similarity1, similarity2)
        matched_text = record["text1"] if similarity1 > similarity2 else record["text2"]
        
        if max_similarity >= request.min_similarity:
            # Safely get file_name with default value
            file_name = record.get("file_name", None) or "Text Comparison"
            
            matches.append(HistoryMatch(
                history_id=str(record["_id"]),
                user_id=record["user_id"],
                similarity_score=round(max_similarity, 2),
                timestamp=record["timestamp"],
                matched_text=matched_text[:200] + "..." if len(matched_text) > 200 else matched_text,
                original_text1=record["text1"][:100] + "..." if len(record["text1"]) > 100 else record["text1"],
                original_text2=record["text2"][:100] + "..." if len(record["text2"]) > 100 else record["text2"],
                file_name=file_name
            ))
            
            highest_similarity = max(highest_similarity, max_similarity)
    
    # Sort by similarity score (highest first)
    matches.sort(key=lambda x: x.similarity_score, reverse=True)
    
    return HistorySearchResponse(
        matches_found=len(matches),
        matches=matches,
        highest_similarity=round(highest_similarity, 2) if highest_similarity > 0 else 0.0
    )

@router.post("/search-all-history", response_model=HistorySearchResponse)
async def search_in_all_history(
    request: HistorySearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for similar text in ALL users' history (admin or check across all data)"""
    db = get_database()
    
    # Get all history records
    history_records = []
    cursor = db.history.find()
    
    async for record in cursor:
        history_records.append(record)
    
    matches = []
    highest_similarity = 0.0
    
    # Compare against each history record
    for record in history_records:
        # Check similarity with text1
        similarity1 = calculate_text_similarity(request.text, record["text1"])
        
        # Check similarity with text2
        similarity2 = calculate_text_similarity(request.text, record["text2"])
        
        # Use the higher similarity score
        max_similarity = max(similarity1, similarity2)
        matched_text = record["text1"] if similarity1 > similarity2 else record["text2"]
        
        if max_similarity >= request.min_similarity:
            # Safely get file_name with default value
            file_name = record.get("file_name", None) or "Text Comparison"
            
            matches.append(HistoryMatch(
                history_id=str(record["_id"]),
                user_id=record["user_id"],
                similarity_score=round(max_similarity, 2),
                timestamp=record["timestamp"],
                matched_text=matched_text[:200] + "..." if len(matched_text) > 200 else matched_text,
                original_text1=record["text1"][:100] + "..." if len(record["text1"]) > 100 else record["text1"],
                original_text2=record["text2"][:100] + "..." if len(record["text2"]) > 100 else record["text2"],
                file_name=file_name
            ))
            
            highest_similarity = max(highest_similarity, max_similarity)
    
    # Sort by similarity score (highest first)
    matches.sort(key=lambda x: x.similarity_score, reverse=True)
    
    return HistorySearchResponse(
        matches_found=len(matches),
        matches=matches,
        highest_similarity=round(highest_similarity, 2) if highest_similarity > 0 else 0.0
    )