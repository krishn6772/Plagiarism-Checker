from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import admin, plagiarism, history
from app.routers.history_search import router as history_search_router
from app.routers.file_history_search import router as file_history_router
from app import auth
import os

app = FastAPI(
    title="Plagiarism Checker API",
    description="A plagiarism detection system with user and admin dashboards",
    version="1.0.0"
)

# Define allowed origins explicitly
allowed_origins = [
    "http://localhost:3000",
    "https://plagiarism-checker-frontend-z4uj.onrender.com",
]

# CORS Configuration - MUST be added BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(plagiarism.router, prefix="/plagiarism", tags=["Plagiarism"])
app.include_router(history.router, prefix="/history", tags=["History"])
app.include_router(history_search_router, prefix="/history", tags=["History Search"])
app.include_router(file_history_router, prefix="/files", tags=["File History"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to Plagiarism Checker API",
        "docs": "/docs",
        "version": "1.0.0"
    }