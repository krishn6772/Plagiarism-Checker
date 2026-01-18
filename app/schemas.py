from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

# ==========================================
# OBJECTID HELPER
# ==========================================

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

# ==========================================
# USER AUTHENTICATION SCHEMAS
# ==========================================

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    is_admin: bool
    created_at: datetime

# ==========================================
# PLAGIARISM CHECK SCHEMAS
# ==========================================

class PlagiarismCheck(BaseModel):
    text1: str
    text2: str
    check_google: bool = False
    check_ai: bool = False

# ==========================================
# GOOGLE SIMILARITY SCHEMAS
# ==========================================

class GoogleSource(BaseModel):
    title: str
    url: str
    snippet: str
    similarity: float
    matching_segments: Optional[List[str]] = []

# ==========================================
# AI DETECTION SCHEMAS
# ==========================================

class AIIndicator(BaseModel):
    type: str  # Changed from 'phrase' to 'type' for consistency
    description: str  # Changed from 'context' to 'description'
    confidence: Optional[float] = 0.0  # Added confidence field

class AIDetectionResult(BaseModel):
    ai_probability: float
    human_probability: float
    confidence: str  # Can be "high", "medium", "low"
    analysis: dict
    message: str
    ai_indicators: List[AIIndicator]
    highlighted_text: Optional[str] = None

# ==========================================
# PLAGIARISM RESULT SCHEMA (COMPREHENSIVE)
# ==========================================

class PlagiarismResult(BaseModel):
    # Text similarity between text1 and text2
    similarity_score: float
    
    # Overall Google similarity (highest of text1 and text2)
    google_similarity: Optional[float] = None
    google_sources: Optional[List[GoogleSource]] = None
    google_highlighted_text: Optional[str] = None
    all_google_matches: Optional[List[str]] = None
    
    # Text 1 specific Google results
    google_similarity_text1: Optional[float] = None
    google_sources_text1: Optional[List[GoogleSource]] = None
    google_highlighted_text1: Optional[str] = None
    all_google_matches_text1: Optional[List[str]] = None
    
    # Text 2 specific Google results
    google_similarity_text2: Optional[float] = None
    google_sources_text2: Optional[List[GoogleSource]] = None
    google_highlighted_text2: Optional[str] = None
    all_google_matches_text2: Optional[List[str]] = None
    
    # AI Detection results
    ai_detection: Optional[AIDetectionResult] = None  # For text1
    ai_detection_text2: Optional[AIDetectionResult] = None  # For text2 (if needed)
    
    # Result message
    message: str

# ==========================================
# HISTORY SCHEMAS
# ==========================================

class HistoryResponse(BaseModel):
    id: str
    user_id: str
    text1: str
    text2: str
    text1_name: Optional[str] = None
    text2_name: Optional[str] = None
    similarity_score: float
    
    # Google similarity fields
    google_similarity: Optional[float] = None
    google_similarity_text1: Optional[float] = None
    google_similarity_text2: Optional[float] = None
    google_sources: Optional[List[dict]] = None
    google_sources_text1: Optional[List[dict]] = None
    google_sources_text2: Optional[List[dict]] = None
    google_highlighted_text: Optional[str] = None
    google_highlighted_text1: Optional[str] = None
    google_highlighted_text2: Optional[str] = None
    
    # AI detection
    ai_detection: Optional[dict] = None
    
    # Metadata
    timestamp: datetime
    file_name: Optional[str] = None
    check_type: Optional[str] = "text_comparison"
    text1_metadata: Optional[dict] = None
    text2_metadata: Optional[dict] = None

# ==========================================
# DATABASE MODELS
# ==========================================

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    username: str
    email: EmailStr
    hashed_password: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class HistoryModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    text1: str
    text2: str
    text1_name: Optional[str] = None
    text2_name: Optional[str] = None
    
    # Text metadata
    text1_metadata: Optional[dict] = None
    text2_metadata: Optional[dict] = None
    
    # Similarity scores
    similarity_score: float
    google_similarity: Optional[float] = None
    google_similarity_text1: Optional[float] = None
    google_similarity_text2: Optional[float] = None
    
    # Google sources
    google_sources: Optional[List[dict]] = None
    google_sources_text1: Optional[List[dict]] = None
    google_sources_text2: Optional[List[dict]] = None
    
    # Highlighted texts
    google_highlighted_text: Optional[str] = None
    google_highlighted_text1: Optional[str] = None
    google_highlighted_text2: Optional[str] = None
    
    # AI detection
    ai_detection: Optional[dict] = None
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    file_name: Optional[str] = None
    check_type: Optional[str] = "text_comparison"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}