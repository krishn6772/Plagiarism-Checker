from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration from environment variables
MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

client: Optional[AsyncIOMotorClient] = None
database = None

async def connect_to_mongo():
    """Connect to MongoDB database"""
    global client, database
    try:
        client = AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=10000,  # 10 second timeout
        )
        
        # Test the connection
        await client.admin.command('ping')
        
        database = client[DATABASE_NAME]
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        print(f"📍 MongoDB URL: {MONGO_URL[:20]}...")  # Print first 20 chars only for security
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("❌ Closed MongoDB connection")

def get_database():
    """Get database instance"""
    if database is None:
        raise Exception("Database not connected. Call connect_to_mongo() first.")
    return database

async def check_database_health():
    """Check if database connection is healthy"""
    try:
        if client:
            await client.admin.command('ping')
            return True
        return False
    except Exception:
        return False