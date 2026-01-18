from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.utils.security import get_current_user, get_current_admin
from app.schemas import HistoryResponse
from typing import List
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter()

class HistoryFullTextResponse(BaseModel):
    id: str
    text1: str
    text2: str
    text1_name: str
    text2_name: str

@router.get("/my-history", response_model=List[HistoryResponse])
async def get_my_history(current_user: dict = Depends(get_current_user)):
    """Get current user's plagiarism check history"""
    db = get_database()
    
    history = []
    user_id = str(current_user["_id"])
    
    cursor = db.history.find({"user_id": user_id}).sort("timestamp", -1)
    
    async for record in cursor:
        history.append(HistoryResponse(
            id=str(record["_id"]),
            user_id=record["user_id"],
            text1=record["text1"],
            text2=record["text2"],
            similarity_score=record["similarity_score"],
            google_similarity=record.get("google_similarity"),
            timestamp=record["timestamp"]
        ))
    
    return history

@router.get("/full-text/{history_id}", response_model=HistoryFullTextResponse)
async def get_history_full_text(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full text content from a history record for comparison"""
    db = get_database()
    
    try:
        # Find the record
        record = await db.history.find_one({"_id": ObjectId(history_id)})
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History record not found"
            )
        
        # Check if user owns this record or is admin
        if record["user_id"] != str(current_user["_id"]) and not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this record"
            )
        
        return HistoryFullTextResponse(
            id=str(record["_id"]),
            text1=record.get("text1", ""),
            text2=record.get("text2", ""),
            text1_name=record.get("text1_name", "Text 1"),
            text2_name=record.get("text2_name", "Text 2")
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid history ID: {str(e)}"
        )

@router.get("/all", response_model=List[HistoryResponse])
async def get_all_history(current_admin: dict = Depends(get_current_admin)):
    """Get all users' plagiarism check history (admin only)"""
    db = get_database()
    
    history = []
    cursor = db.history.find().sort("timestamp", -1)
    
    async for record in cursor:
        history.append(HistoryResponse(
            id=str(record["_id"]),
            user_id=record["user_id"],
            text1=record["text1"],
            text2=record["text2"],
            similarity_score=record["similarity_score"],
            google_similarity=record.get("google_similarity"),
            timestamp=record["timestamp"]
        ))
    
    return history

@router.delete("/{history_id}")
async def delete_history_record(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific history record"""
    db = get_database()
    
    try:
        # Find the record first
        record = await db.history.find_one({"_id": ObjectId(history_id)})
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History record not found"
            )
        
        # Check if user owns this record or is admin
        if record["user_id"] != str(current_user["_id"]) and not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this record"
            )
        
        # Delete the record
        await db.history.delete_one({"_id": ObjectId(history_id)})
        
        return {"message": "History record deleted successfully", "history_id": history_id}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid history ID: {str(e)}"
        )

@router.delete("/clear/my-history")
async def clear_my_history(current_user: dict = Depends(get_current_user)):
    """Clear all history for current user"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    result = await db.history.delete_many({"user_id": user_id})
    
    return {
        "message": "History cleared successfully",
        "deleted_count": result.deleted_count
    }