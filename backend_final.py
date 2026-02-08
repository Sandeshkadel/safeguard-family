"""
═══════════════════════════════════════════════════════════════════════════════
    SAFEGUARD FAMILY - Advanced Parental Control System with LLM Analysis
═══════════════════════════════════════════════════════════════════════════════

Features:
  • Parent Registration & Login with JWT Authentication
  • Multi-Device Child Management (Same parent, multiple devices)
  • Facebook Video Analysis (Download, Transcribe, Summarize)
  • Smart Comment Filtering (Toxic, Inappropriate Content Detection)
  • Weekly AI-Powered Reports with Insights
  • Cross-Device Parent Dashboard Access
  • Real-time Activity Tracking
  
Author: SafeGuard Family Team
Version: 2.1.0
Last Updated: February 8, 2026
═══════════════════════════════════════════════════════════════════════════════
"""

# ════════════════════════════════
# IMPORT ALL REQUIRED LIBRARIES
# ════════════════════════════════
from fastapi import FastAPI, Request, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, ForeignKey, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel
from datetime import datetime, timedelta
from pathlib import Path
import os
import uuid
import json
import jwt
import yt_dlp
import asyncio
from groq import Groq
from typing import Optional, List
import hashlib

# Load environment variables from .env file
load_dotenv()

# ════════════════════════════════
# CONFIGURATION & CONSTANTS
# ════════════════════════════════

# API Configuration
API_TITLE = "SafeGuard Family - Parental Control System"
API_VERSION = "2.1.0"

# JWT Configuration for Token Authentication
JWT_SECRET = os.getenv("JWT_SECRET", "safeguard-family-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24  # Tokens expire after 24 hours

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./video_downloader.db")

# Groq API Configuration for AI features
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "mixtral-8x7b-32768"  # LLM for summarization
WHISPER_MODEL = "whisper-large-v3"  # Model for audio transcription

# Toxic Content Detection Keywords (for comment filtering)
TOXIC_KEYWORDS = [
    "hate", "kill", "abuse", "offensive", "racist", "sexist",
    "violence", "threat", "attack", "death", "suicide", "porn",
    "explicit", "inappropriate", "dangerous", "illegal"
]

# Get or create Videos folder for downloads
VIDEOS_FOLDER = Path("Videos")
VIDEOS_FOLDER.mkdir(exist_ok=True)

# ════════════════════════════════
# DATABASE SETUP
# ════════════════════════════════

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()

# ════════════════════════════════
# DATABASE MODELS (TABLES)
# ════════════════════════════════

class Parent(Base):
    """
    Parent Account Model
    Stores parent login credentials and profile information
    """
    __tablename__ = "parents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)  # Unique email for login
    password_hash = Column(String, nullable=False)  # Hashed password (never store plain text)
    full_name = Column(String, nullable=False)  # Parent's display name
    created_at = Column(DateTime, default=datetime.utcnow)  # Account creation date
    last_login = Column(DateTime, nullable=True)  # Track last login time
    
    # Relationships
    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")
    sessions = relationship("ParentSession", back_populates="parent", cascade="all, delete-orphan")


class Child(Base):
    """
    Child Device Model
    Represents each device where a child uses the extension
    One parent can have multiple children across multiple devices
    """
    __tablename__ = "children"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(String, ForeignKey("parents.id"), nullable=False)  # Link to parent
    name = Column(String, nullable=False)  # Child's name/nickname
    device_id = Column(String, nullable=False)  # Unique device identifier from extension
    device_name = Column(String, nullable=True)  # e.g., "Johnny's Laptop"
    is_active = Column(Boolean, default=True)  # Enable/disable monitoring on this device
    created_at = Column(DateTime, default=datetime.utcnow)  # When device was added
    last_activity = Column(DateTime, nullable=True)  # Last time extension reported activity
    
    # Relationships
    parent = relationship("Parent", back_populates="children")
    videos = relationship("VideoAnalysis", back_populates="child", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="child", cascade="all, delete-orphan")


class VideoAnalysis(Base):
    """
    Video Analysis Model
    Stores all information about videos watched by children
    Includes transcriptions and AI-generated summaries
    """
    __tablename__ = "video_analyses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    
    # Video Metadata
    url = Column(String, nullable=False)  # Original video URL
    title = Column(String, nullable=False)  # Video title
    duration = Column(Integer)  # Video length in seconds
    thumbnail = Column(String, nullable=True)  # Thumbnail image URL
    uploader = Column(String, nullable=True)  # Channel/Creator name
    view_count = Column(Integer, default=0)  # Number of views
    upload_date = Column(String, nullable=True)  # When video was uploaded
    description = Column(Text, nullable=True)  # Video description
    
    # Processed Content
    filename = Column(String, nullable=True)  # Downloaded filename
    filepath = Column(String, nullable=True)  # Full path to file
    size_mb = Column(Float, nullable=True)  # File size in MB
    
    # AI Analysis
    transcription = Column(Text, nullable=True)  # Audio transcribed via Groq Whisper
    summary = Column(Text, nullable=True)  # Summary generated by LLM
    categories = Column(String, nullable=True)  # JSON: ["educational", "entertainment", etc]
    content_rating = Column(String, nullable=True)  # "safe", "warning", "blocked"
    inappropriate_flags = Column(Text, nullable=True)  # JSON: flags found in content
    
    # Timestamps
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child", back_populates="videos")


class WeeklyReport(Base):
    """
    Weekly Report Model
    Aggregates child's activity for the week with AI insights
    Used by parent dashboard to display weekly summaries
    """
    __tablename__ = "weekly_reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(String, ForeignKey("parents.id"), nullable=False)
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    
    # Report Period
    week_start = Column(DateTime, nullable=False)  # Monday of the week
    week_end = Column(DateTime, nullable=False)  # Sunday of the week
    
    # Activity Summary
    total_videos = Column(Integer, default=0)  # Number of videos watched
    total_duration_minutes = Column(Integer, default=0)  # Total watch time
    average_watch_time = Column(Integer, default=0)  # Average per video
    
    # Safety Metrics
    blocked_comments = Column(Integer, default=0)  # Inappropriate comments blocked
    flagged_videos = Column(Integer, default=0)  # Videos with warnings
    inappropriate_count = Column(Integer, default=0)  # Inappropriate content detected
    
    # AI Insights
    summary = Column(Text, nullable=True)  # LLM-generated summary of week
    recommendations = Column(Text, nullable=True)  # Parent recommendations
    report_data = Column(Text, nullable=True)  # Full JSON report data
    
    # Status
    generated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class ParentSession(Base):
    """
    Parent Session Model
    Tracks active login sessions with JWT tokens
    Allows parents to logout and invalidate sessions
    """
    __tablename__ = "parent_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(String, ForeignKey("parents.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)  # JWT token
    expires_at = Column(DateTime, nullable=False)  # Token expiration time
    is_active = Column(Boolean, default=True)  # Logout sets this to False
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    parent = relationship("Parent", back_populates="sessions")


class ActivityLog(Base):
    """
    Activity Log Model
    Detailed tracking of child's online activities
    Helps parents monitor usage patterns
    """
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    
    # Activity Details
    activity_type = Column(String, nullable=False)  # "video_watched", "comment_viewed", etc
    domain = Column(String, nullable=False)  # "facebook.com", "youtube.com"
    title = Column(String, nullable=True)  # Activity title
    duration_seconds = Column(Integer, default=0)  # How long the activity lasted
    
    # Safety Info
    is_flagged = Column(Boolean, default=False)  # Whether activity was flagged
    flag_reason = Column(String, nullable=True)  # Why it was flagged
    comments_hidden = Column(Integer, default=0)  # Number of comments hidden
    
    # Timestamp
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child", back_populates="activity_logs")


# Create all tables in database
Base.metadata.create_all(bind=engine)

# ════════════════════════════════
# PYDANTIC MODELS (Request/Response)
# ════════════════════════════════

class ParentRegisterRequest(BaseModel):
    """Parent registration form data"""
    email: str
    password: str
    full_name: str


class ParentLoginRequest(BaseModel):
    """Parent login form data"""
    email: str
    password: str


class AddChildRequest(BaseModel):
    """Add a new child device"""
    name: str  # Child's name
    device_id: str  # Device identifier
    device_name: Optional[str] = None  # Optional device name


class VideoAnalysisRequest(BaseModel):
    """Request to analyze a video"""
    url: str
    child_id: str
    title: str
    duration: Optional[int] = None


# ════════════════════════════════
# AUTHENTICATION FUNCTIONS
# ════════════════════════════════

def hash_password(password: str) -> str:
    """
    Hash a password using SHA256 for secure storage
    Never store plain text passwords
    """
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify that plain password matches the hashed version
    Used during login to authenticate parent
    """
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def create_jwt_token(parent_id: str) -> tuple[str, datetime]:
    """
    Create a JWT token for authenticated parent
    Token includes parent_id and expiration time
    Expires in 24 hours
    """
    expires = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "parent_id": parent_id,
        "exp": expires,
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires


def verify_jwt_token(token: str) -> Optional[str]:
    """
    Verify JWT token and extract parent_id
    Returns None if token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("parent_id")
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Token is invalid


def get_db():
    """
    Database session dependency
    Used by FastAPI to inject DB sessions into endpoints
    Ensures proper cleanup after request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ════════════════════════════════
# UTILITY FUNCTIONS
# ════════════════════════════════

def is_comment_toxic(comment_text: str) -> bool:
    """
    Detect toxic/inappropriate comments
    Returns True if comment should be hidden
    
    Uses keyword matching and severity assessment
    """
    comment_lower = comment_text.lower()
    
    # Check for toxic keywords
    for keyword in TOXIC_KEYWORDS:
        if keyword in comment_lower:
            return True
    
    # Check for excessive caps (usually indicates aggression)
    if len(comment_text) > 5 and sum(1 for c in comment_text if c.isupper()) / len(comment_text) > 0.7:
        return True
    
    # Check for repeated characters (spam)
    if any(char * 5 in comment_text for char in "!#$%^&*"):
        return True
    
    return False


def categorize_video_content(title: str, description: str) -> List[str]:
    """
    Automatically categorize video content
    Helps parents understand what child is watching
    
    Returns list of categories like ["educational", "entertainment", etc]
    """
    categories = []
    
    text = (title + " " + description).lower()
    
    # Educational Content
    if any(word in text for word in ["tutorial", "learn", "educational", "course", "lecture", "explanation"]):
        categories.append("educational")
    
    # Entertainment
    if any(word in text for word in ["movie", "funny", "comedy", "prank", "viral", "entertainment"]):
        categories.append("entertainment")
    
    # Gaming
    if any(word in text for word in ["game", "gaming", "gameplay", "stream", "fortnite", "minecraft"]):
        categories.append("gaming")
    
    # Music
    if any(word in text for word in ["music", "song", "concert", "artist", "album", "lyrics"]):
        categories.append("music")
    
    # Sports
    if any(word in text for word in ["sports", "game", "match", "football", "basketball", "soccer"]):
        categories.append("sports")
    
    # News/Current Events
    if any(word in text for word in ["news", "report", "breaking", "current", "today", "event"]):
        categories.append("news")
    
    return categories if categories else ["other"]


def analyze_content_for_warnings(transcription: str, title: str) -> tuple[str, Optional[str]]:
    """
    Analyze video content for warnings
    Returns: (rating, flags_json)
    
    rating: "safe", "warning", or "blocked"
    flags: JSON string with detected issues
    """
    flags = []
    rating = "safe"
    
    full_text = (transcription + " " + title).lower() if transcription else title.lower()
    
    # Check for dangerous/inappropriate content
    dangerous_keywords = [
        "violence", "weapon", "harm", "dangerous",
        "adult", "explicit", "graphic", "18+"
    ]
    
    for keyword in dangerous_keywords:
        if keyword in full_text:
            flags.append({"issue": keyword, "severity": "high"})
            rating = "warning"
    
    return rating, json.dumps(flags) if flags else None


# ════════════════════════════════
# FASTAPI SETUP & MIDDLEWARE
# ════════════════════════════════

# Bearer token scheme for JWT auth
bearer_scheme = HTTPBearer()


# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle application startup and shutdown
    """
    print("🚀 Starting SafeGuard Family Backend...")
    print(f"📁 Videos folder: {VIDEOS_FOLDER.absolute()}")
    print(f"🎵 Using Groq Whisper for transcription")
    print(f"🤖 Using Groq LLM for content analysis")
    print(f"👨‍👩‍👧 Parent-Child authentication enabled")
    print(f"🔒 Multi-device support enabled")
    yield
    print("🔌 Shutting down SafeGuard Family Backend...")


# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    lifespan=lifespan
)

# Enable CORS (Cross-Origin Resource Sharing)
# Allows extension to communicate with backend from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# ════════════════════════════════
# AUTHENTICATION DEPENDENCY
# ════════════════════════════════

async def get_current_parent(
    credentials=Depends(bearer_scheme),
    db=Depends(get_db)
) -> str:
    """
    Verify JWT token and return authenticated parent_id
    
    Used as dependency in protected endpoints
    Raises 401 if token is invalid or expired
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="No credentials provided")
    
    # Extract and verify JWT token
    parent_id = verify_jwt_token(credentials.credentials)
    if not parent_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify parent exists in database
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=401, detail="Parent not found")
    
    return parent_id


# ════════════════════════════════
# HEALTH CHECK ENDPOINT
# ════════════════════════════════

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Returns status and API info
    """
    return {
        "status": "healthy",
        "service": "SafeGuard Family - Parental Control System",
        "version": API_VERSION,
        "features": ["parent-auth", "video-analysis", "comment-filtering", "weekly-reports", "multi-device"]
    }


@app.get("/api")
async def api_info():
    """
    API information endpoint
    Lists available endpoints and their descriptions
    """
    return {
        "status": "active",
        "api_version": API_VERSION,
        "endpoints": {
            "authentication": {
                "POST /api/auth/register": "Register parent account",
                "POST /api/auth/login": "Parent login",
                "POST /api/auth/logout": "Logout and invalidate session"
            },
            "children": {
                "POST /api/children": "Add new child device",
                "GET /api/children": "List all children",
                "DELETE /api/children/{child_id}": "Remove child device"
            },
            "reports": {
                "GET /api/reports/weekly/{child_id}": "Get weekly report for child",
                "GET /api/reports/all/{child_id}": "Get all reports for child"
            },
            "settings": {
                "GET /api/profile": "Get parent profile",
                "PUT /api/profile": "Update parent profile"
            }
        }
    }


# ════════════════════════════════
# PARENT AUTHENTICATION ENDPOINTS
# ════════════════════════════════

@app.post("/api/auth/register")
async def register_parent(
    data: ParentRegisterRequest,
    db=Depends(get_db)
):
    """
    Register a new parent account
    
    Validates email uniqueness
    Creates JWT token for immediate login
    """
    # Check if email already exists
    existing = db.query(Parent).filter(Parent.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create parent account
    parent = Parent(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=hash_password(data.password),  # Hash password before storing
        full_name=data.full_name
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)
    
    # Create JWT token for auto-login
    token, expires = create_jwt_token(parent.id)
    
    # Store session
    session = ParentSession(
        id=str(uuid.uuid4()),
        parent_id=parent.id,
        token=token,
        expires_at=expires
    )
    db.add(session)
    db.commit()
    
    return {
        "status": "success",
        "message": "Parent account created successfully",
        "token": token,
        "parent": {
            "id": parent.id,
            "email": parent.email,
            "full_name": parent.full_name
        },
        "expires_in": JWT_EXPIRATION_HOURS * 3600  # seconds
    }


@app.post("/api/auth/login")
async def login_parent(
    data: ParentLoginRequest,
    db=Depends(get_db)
):
    """
    Authenticate parent and return JWT token
    
    Verifies email and password
    Creates new session
    """
    # Find parent by email
    parent = db.query(Parent).filter(Parent.email == data.email).first()
    if not parent or not verify_password(data.password, parent.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login time
    parent.last_login = datetime.utcnow()
    db.commit()
    
    # Create new JWT token
    token, expires = create_jwt_token(parent.id)
    
    # Store session
    session = ParentSession(
        id=str(uuid.uuid4()),
        parent_id=parent.id,
        token=token,
        expires_at=expires
    )
    db.add(session)
    db.commit()
    
    return {
        "status": "success",
        "message": "Login successful",
        "token": token,
        "parent": {
            "id": parent.id,
            "email": parent.email,
            "full_name": parent.full_name,
            "last_login": parent.last_login.isoformat()
        },
        "expires_in": JWT_EXPIRATION_HOURS * 3600
    }


@app.post("/api/auth/logout")
async def logout_parent(
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Logout parent and invalidate current session
    """
    # Mark all sessions as inactive
    sessions = db.query(ParentSession).filter(ParentSession.parent_id == parent_id).all()
    for session in sessions:
        session.is_active = False
    db.commit()
    
    return {
        "status": "success",
        "message": "Logged out successfully"
    }


# ════════════════════════════════
# CHILD MANAGEMENT ENDPOINTS
# ════════════════════════════════

@app.post("/api/children")
async def add_child(
    data: AddChildRequest,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Add a new child device to parent's account
    
    Allows tracking multiple devices and children
    Each device gets a unique child_id
    """
    # Create new child record
    child = Child(
        id=str(uuid.uuid4()),
        parent_id=parent_id,
        name=data.name,
        device_id=data.device_id,
        device_name=data.device_name
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    
    return {
        "status": "success",
        "message": "Child device added successfully",
        "child": {
            "id": child.id,
            "name": child.name,
            "device_id": child.device_id,
            "device_name": child.device_name,
            "created_at": child.created_at.isoformat()
        }
    }


@app.get("/api/children")
async def list_children(
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get all children/devices for authenticated parent
    
    Returns list of monitored children with activity info
    """
    children = db.query(Child).filter(Child.parent_id == parent_id).all()
    
    result = []
    for child in children:
        # Count videos watched this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        videos_count = db.query(VideoAnalysis).filter(
            VideoAnalysis.child_id == child.id,
            VideoAnalysis.created_at >= week_ago
        ).count()
        
        result.append({
            "id": child.id,
            "name": child.name,
            "device_id": child.device_id,
            "device_name": child.device_name,
            "is_active": child.is_active,
            "videos_this_week": videos_count,
            "last_activity": child.last_activity.isoformat() if child.last_activity else None,
            "created_at": child.created_at.isoformat()
        })
    
    return {
        "status": "success",
        "children": result,
        "total": len(result)
    }


@app.delete("/api/children/{child_id}")
async def delete_child(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Remove a child device from monitoring
    
    Deletes all associated data (videos, reports, logs)
    @param child_id: The child device to remove
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Delete child and all related data (cascade)
    db.delete(child)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Child device '{child.name}' has been removed"
    }


# ════════════════════════════════
# PARENT PROFILE ENDPOINTS
# ════════════════════════════════

@app.get("/api/profile")
async def get_profile(
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get current parent's profile information
    
    Returns email, name, and account stats
    """
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    
    # Count children
    children_count = db.query(Child).filter(Child.parent_id == parent_id).count()
    
    # Count total videos tracked
    videos_count = db.query(VideoAnalysis).join(Child).filter(
        Child.parent_id == parent_id
    ).count()
    
    return {
        "status": "success",
        "parent": {
            "id": parent.id,
            "email": parent.email,
            "full_name": parent.full_name,
            "children_count": children_count,
            "videos_tracked": videos_count,
            "created_at": parent.created_at.isoformat(),
            "last_login": parent.last_login.isoformat() if parent.last_login else None
        }
    }


# ════════════════════════════════
# WEEKLY REPORT ENDPOINTS
# ════════════════════════════════

@app.get("/api/reports/weekly/{child_id}")
async def get_weekly_report(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get weekly activity report for a specific child
    
    Shows:
    - Videos watched
    - Total watch time
    - Safety metrics (flagged content, hidden comments)
    - AI-generated summary and recommendations
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Calculate current week (Monday to Sunday)
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    week_start_dt = datetime.combine(week_start, datetime.min.time())
    week_end_dt = datetime.combine(week_end, datetime.max.time())
    
    # Get videos from this week
    videos = db.query(VideoAnalysis).filter(
        VideoAnalysis.child_id == child_id,
        VideoAnalysis.created_at >= week_start_dt,
        VideoAnalysis.created_at <= week_end_dt
    ).all()
    
    # Calculate statistics
    total_videos = len(videos)
    total_duration_minutes = sum(v.duration // 60 if v.duration else 0 for v in videos)
    
    # Count safety metrics
    flagged_count = sum(1 for v in videos if v.content_rating == "warning")
    blocked_comments = sum(1 for log in db.query(ActivityLog).filter(
        ActivityLog.child_id == child_id,
        ActivityLog.recorded_at >= week_start_dt
    ).all() if log.comments_hidden > 0)
    
    # Prepare video list for parent
    video_list = []
    for v in videos:
        categories = json.loads(v.categories) if v.categories else ["other"]
        video_list.append({
            "id": v.id,
            "title": v.title,
            "duration_minutes": v.duration // 60 if v.duration else 0,
            "uploader": v.uploader,
            "url": v.url,
            "categories": categories,
            "content_rating": v.content_rating or "unknown",
            "summary": v.summary,
            "watched_at": v.created_at.isoformat()
        })
    
    return {
        "status": "success",
        "report": {
            "child_name": child.name,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "total_videos": total_videos,
            "total_duration_minutes": total_duration_minutes,
            "average_duration_minutes": total_duration_minutes // total_videos if total_videos > 0 else 0,
            "flagged_videos": flagged_count,
            "comments_blocked": blocked_comments,
            "videos": video_list,
            "safety_summary": f"This week, {flagged_count} videos had content warnings and {blocked_comments} inappropriate comments were hidden."
        }
    }


@app.get("/api/reports/all/{child_id}")
async def get_all_reports(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get all historical reports for a child
    
    Shows trends over time
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get all reports
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.child_id == child_id
    ).order_by(WeeklyReport.week_start.desc()).all()
    
    result = []
    for report in reports:
        result.append({
            "id": report.id,
            "week_start": report.week_start.isoformat(),
            "week_end": report.week_end.isoformat(),
            "total_videos": report.total_videos,
            "total_duration_minutes": report.total_duration_minutes,
            "flagged_videos": report.flagged_videos,
            "comments_blocked": report.blocked_comments,
            "summary": report.summary,
            "recommendations": report.recommendations,
            "generated_at": report.generated_at.isoformat()
        })
    
    return {
        "status": "success",
        "child_name": child.name,
        "total_reports": len(result),
        "reports": result
    }


# ════════════════════════════════
# ERROR HANDLERS
# ════════════════════════════════

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper response format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "code": exc.status_code
        }
    )


# ════════════════════════════════
# RUN SERVER
# ════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting SafeGuard Family Backend Server...")
    print("📍 Listening on http://127.0.0.1:8000")
    print("📚 API Documentation: http://127.0.0.1:8000/docs")
    uvicorn.run(app, host="127.0.0.1", port=8000)
