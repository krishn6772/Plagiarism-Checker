from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.utils.security import get_current_admin
from app.schemas import UserResponse
from typing import List
from bson import ObjectId

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_admin: dict = Depends(get_current_admin)):
    """Get all users (admin only)"""
    db = get_database()
    
    users = []
    async for user in db.users.find():
        users.append(UserResponse(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            is_admin=user["is_admin"],
            created_at=user["created_at"]
        ))
    
    return users

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a user (admin only)"""
    db = get_database()
    
    # Prevent admin from deleting themselves
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Also delete user's history
        await db.history.delete_many({"user_id": user_id})
        
        return {"message": "User deleted successfully", "user_id": user_id}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID: {str(e)}"
        )

@router.patch("/users/{user_id}/toggle-admin")
async def toggle_admin_status(user_id: str, current_admin: dict = Depends(get_current_admin)):
    """Toggle admin status for a user (admin only)"""
    db = get_database()
    
    # Prevent admin from changing their own status
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin status"
        )
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        new_admin_status = not user.get("is_admin", False)
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_admin": new_admin_status}}
        )
        
        return {
            "message": "Admin status updated successfully",
            "user_id": user_id,
            "is_admin": new_admin_status
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user ID: {str(e)}"
        )

@router.get("/stats")
async def get_stats(current_admin: dict = Depends(get_current_admin)):
    """Get system statistics (admin only)"""
    db = get_database()
    
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"is_admin": True})
    total_checks = await db.history.count_documents({})
    
    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "regular_users": total_users - total_admins,
        "total_plagiarism_checks": total_checks
    }