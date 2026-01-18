from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

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

class PlagiarismCheck(BaseModel):
    text1: str
    text2: str
    check_google: bool = False
    check_ai: bool = False

class GoogleSource(BaseModel):
    title: str
    url: str
    snippet: str
    similarity: float
    matching_segments: List[str] = []

class AIIndicator(BaseModel):
    phrase: str
    context: str

class AIDetectionResult(BaseModel):
    ai_probability: float
    human_probability: float
    confidence: str
    analysis: dict
    message: str
    ai_indicators: List[AIIndicator]
    highlighted_text: str

class PlagiarismResult(BaseModel):
    similarity_score: float
    google_similarity: Optional[float] = None
    google_similarity_text1: Optional[float] = None
    google_similarity_text2: Optional[float] = None
    google_sources: Optional[List[GoogleSource]] = None
    google_sources_text1: Optional[List[GoogleSource]] = None
    google_sources_text2: Optional[List[GoogleSource]] = None
    google_highlighted_text: Optional[str] = None
    google_highlighted_text1: Optional[str] = None
    google_highlighted_text2: Optional[str] = None
    all_google_matches: Optional[List[str]] = None
    all_google_matches_text1: Optional[List[str]] = None
    all_google_matches_text2: Optional[List[str]] = None
    ai_detection: Optional[AIDetectionResult] = None
    ai_detection_text2: Optional[AIDetectionResult] = None
    message: str

class HistoryResponse(BaseModel):
    id: str
    user_id: str
    text1: str
    text2: str
    text1_name: Optional[str] = None
    text2_name: Optional[str] = None
    similarity_score: float
    google_similarity: Optional[float]
    google_sources: Optional[List[dict]] = None
    google_highlighted_text: Optional[str] = None
    ai_detection: Optional[dict] = None
    timestamp: datetime
    file_name: Optional[str] = None
    check_type: Optional[str] = "text_comparison"
    # New fields for better tracking
    text1_metadata: Optional[dict] = None
    text2_metadata: Optional[dict] = None