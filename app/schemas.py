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

class GoogleSimilarityData(BaseModel):
    similarity_percentage: float
    sources: List[GoogleSource]
    total_sources: int
    all_matches: List[str] = []
    highlighted_text: str = ""

# AI Detection schemas - Define these BEFORE PlagiarismResult
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

# Now define PlagiarismResult that uses AIDetectionResult
class PlagiarismResult(BaseModel):
    similarity_score: float
    google_similarity: Optional[float] = None
    google_sources: Optional[List[GoogleSource]] = None
    google_highlighted_text: Optional[str] = None
    all_google_matches: Optional[List[str]] = None
    ai_detection: Optional[AIDetectionResult] = None
    message: str

class HistoryResponse(BaseModel):
    id: str
    user_id: str
    text1: str
    text2: str
    similarity_score: float
    google_similarity: Optional[float]
    google_sources: Optional[List[dict]] = None
    google_highlighted_text: Optional[str] = None
    ai_detection: Optional[dict] = None
    timestamp: datetime