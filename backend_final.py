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
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
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
GROQ_MODEL = "llama-3.1-8b-instant"  # LLM for summarization
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


class BlockedSite(Base):
    """
    Blocked Sites Model
    Custom blocked domains for specific child
    """
    __tablename__ = "blocked_sites"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    domain = Column(String, nullable=False)  # e.g., "example.com"
    category = Column(String, nullable=True)  # "Adult", "Violence", etc
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


class AllowedSite(Base):
    """
    Allowed Sites Model
    Whitelist of always-allowed domains for specific child
    """
    __tablename__ = "allowed_sites"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    domain = Column(String, nullable=False)  # e.g., "wikipedia.org"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


class HiddenComment(Base):
    """
    Hidden Comment Model
    Tracks toxic comments hidden by the filter
    """
    __tablename__ = "hidden_comments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    post_url = Column(String, nullable=False)  # URL of the post
    post_title = Column(String, nullable=True)  # Title/snippet of the post
    comment_text = Column(Text, nullable=False)  # The hidden comment text
    reason = Column(String, nullable=True)  # Why it was hidden
    severity = Column(Integer, default=1)  # 0-2 severity level
    domain = Column(String, default="facebook.com")  # Platform domain
    hidden_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


class SiteTimeLimit(Base):
    """
    Site Time Limit Model
    Per-domain limits and blocks for a child
    """
    __tablename__ = "site_time_limits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    domain = Column(String, nullable=False)
    daily_limit_minutes = Column(Integer, default=0)
    cooldown_hours = Column(Integer, default=24)
    permanent_block = Column(Boolean, default=False)
    blocked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    child = relationship("Child")


class Device(Base):
    """
    Device Model
    Tracks child devices and their heartbeat status
    """
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    device_id = Column(String, unique=True, nullable=False)  # Unique device identifier
    device_name = Column(String, nullable=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


class TimeLimit(Base):
    """
    Time Limit Model
    Daily time limits for children
    """
    __tablename__ = "time_limits"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    daily_limit_minutes = Column(Integer, default=120)  # Default 2 hours
    remaining_minutes = Column(Integer, default=120)
    last_reset = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


class UserBehaviorProfile(Base):
    """
    User Behavior Profile Model
    Tracks watching patterns, categories, and generates insights after 7 days
    """
    __tablename__ = "user_behavior_profiles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    
    # Tracking Metrics
    total_videos_watched = Column(Integer, default=0)
    total_watch_time_seconds = Column(Integer, default=0)
    start_date = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Categories JSON: {"educational": 5, "entertainment": 10, ...}
    categories_json = Column(Text, nullable=True)
    
    # Uploaders JSON: {"Creator1": 3, "Creator2": 5, ...}
    uploaders_json = Column(Text, nullable=True)
    
    # Generated Profile (after 7 days)
    profile_text = Column(Text, nullable=True)
    profile_generated_at = Column(DateTime, nullable=True)
    days_tracked = Column(Integer, default=0)
    
    # Relationship
    child = relationship("Child")


class TrackedVideo(Base):
    """
    Tracked Video Model
    Individual videos watched by user for behavior analysis
    """
    __tablename__ = "tracked_videos"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(String, ForeignKey("children.id"), nullable=False)
    
    # Video Info
    url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    uploader = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    # Categories JSON: ["educational", "entertainment"]
    categories_json = Column(String, nullable=True)
    
    # Timestamps
    watched_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    child = relationship("Child")


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


def parse_iso_datetime(value: Optional[str]):
    if not value:
        return None
    value = value.strip()
    if value.endswith('Z'):
        value = value[:-1] + '+00:00'
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


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
# USER BEHAVIOR TRACKING FUNCTIONS
# ════════════════════════════════

def categorize_video_detailed(title: str, description: str, transcription: str) -> List[str]:
    """
    Advanced video categorization based on keywords
    Returns list of detected categories
    """
    text = f"{title} {description} {transcription}".lower()
    
    category_keywords = {
        "educational": ["learn", "tutorial", "how to", "lesson", "education", "course", "training", "study"],
        "entertainment": ["funny", "comedy", "prank", "joke", "laugh", "entertainment", "fun", "hilarious"],
        "news": ["news", "breaking", "update", "report", "journalist", "headline", "current events"],
        "music": ["music", "song", "singer", "concert", "lyrics", "album", "band", "melody"],
        "sports": ["sports", "game", "match", "player", "team", "score", "championship", "fitness"],
        "cooking": ["recipe", "cooking", "food", "kitchen", "chef", "meal", "ingredient", "delicious"],
        "technology": ["tech", "software", "hardware", "coding", "programming", "app", "gadget", "computer"],
        "fitness": ["workout", "exercise", "fitness", "gym", "health", "training", "yoga", "nutrition"],
        "gaming": ["gaming", "game", "player", "stream", "gameplay", "gamer", "esports", "console"],
        "travel": ["travel", "trip", "destination", "tour", "vacation", "adventure", "explore", "journey"],
        "lifestyle": ["lifestyle", "vlog", "daily", "routine", "life", "day in", "personal", "tips"],
        "business": ["business", "entrepreneur", "startup", "marketing", "sales", "finance", "money"],
    }
    
    detected_categories = []
    for category, keywords in category_keywords.items():
        if any(keyword in text for keyword in keywords):
            detected_categories.append(category)
    
    return detected_categories if detected_categories else ["general"]


def get_or_create_behavior_profile(db, child_id: str) -> UserBehaviorProfile:
    """Get existing behavior profile or create new one"""
    profile = db.query(UserBehaviorProfile).filter(
        UserBehaviorProfile.child_id == child_id
    ).first()
    
    if not profile:
        profile = UserBehaviorProfile(
            child_id=child_id,
            start_date=datetime.utcnow(),
            categories_json=json.dumps({}),
            uploaders_json=json.dumps({})
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile


def update_behavior_profile(db, child_id: str, video_info: dict, categories: List[str]):
    """Update behavior profile with new video data"""
    profile = get_or_create_behavior_profile(db, child_id)
    
    # Load existing data
    categories_dict = json.loads(profile.categories_json or "{}")
    uploaders_dict = json.loads(profile.uploaders_json or "{}")
    
    # Update categories
    for category in categories:
        categories_dict[category] = categories_dict.get(category, 0) + 1
    
    # Update uploader
    uploader = video_info.get("uploader", "Unknown")
    uploaders_dict[uploader] = uploaders_dict.get(uploader, 0) + 1
    
    # Update totals
    profile.total_videos_watched += 1
    profile.total_watch_time_seconds += video_info.get("duration", 0)
    profile.categories_json = json.dumps(categories_dict)
    profile.uploaders_json = json.dumps(uploaders_dict)
    profile.last_updated = datetime.utcnow()
    
    # Calculate days tracked
    days_tracked = (datetime.utcnow() - profile.start_date).days
    profile.days_tracked = days_tracked
    
    # Add tracked video entry
    tracked_video = TrackedVideo(
        child_id=child_id,
        url=video_info.get("url", ""),
        title=video_info.get("title", "Unknown"),
        uploader=uploader,
        duration_seconds=video_info.get("duration", 0),
        categories_json=json.dumps(categories)
    )
    db.add(tracked_video)
    
    db.commit()
    db.refresh(profile)
    
    # Generate profile if 7+ days
    if days_tracked >= 7 and not profile.profile_text:
        generate_user_profile(db, profile)
    
    return profile


def generate_user_profile(db, profile: UserBehaviorProfile):
    """Generate detailed user behavior profile after 7 days"""
    categories_dict = json.loads(profile.categories_json or "{}")
    uploaders_dict = json.loads(profile.uploaders_json or "{}")
    
    total_videos = profile.total_videos_watched
    total_time_minutes = profile.total_watch_time_seconds / 60
    days_tracked = profile.days_tracked
    
    # Sort categories and uploaders
    sorted_categories = sorted(categories_dict.items(), key=lambda x: x[1], reverse=True)[:5]
    sorted_uploaders = sorted(uploaders_dict.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Calculate average watch time
    avg_watch_time = total_time_minutes / total_videos if total_videos > 0 else 0
    
    # Generate profile text
    profile_text = f"""
{'='*70}
USER BEHAVIOR ANALYSIS REPORT
{'='*70}
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}
Tracking Period: {days_tracked} days (from {profile.start_date.strftime('%Y-%m-%d')})

VIEWING STATISTICS
{'='*70}
Total Videos Watched: {total_videos}
Total Watch Time: {total_time_minutes:.1f} minutes ({total_time_minutes/60:.1f} hours)
Average Video Duration: {avg_watch_time:.1f} minutes
Daily Average: {total_videos/days_tracked:.1f} videos/day

TOP CONTENT CATEGORIES
{'='*70}
"""
    
    for i, (category, count) in enumerate(sorted_categories, 1):
        percentage = (count / total_videos) * 100
        profile_text += f"{i}. {category.upper()}: {count} videos ({percentage:.1f}%)\n"
    
    profile_text += f"\nTOP CONTENT CREATORS\n{'='*70}\n"
    
    for i, (uploader, count) in enumerate(sorted_uploaders, 1):
        percentage = (count / total_videos) * 100
        profile_text += f"{i}. {uploader}: {count} videos ({percentage:.1f}%)\n"
    
    # Behavior insights
    profile_text += f"\nBEHAVIOR INSIGHTS\n{'='*70}\n"
    
    if sorted_categories:
        primary_interest = sorted_categories[0][0]
        profile_text += f"• Primary Interest: {primary_interest.upper()}\n"
    
    if avg_watch_time < 3:
        profile_text += "• Viewing Pattern: Short-form content consumer (quick videos)\n"
    elif avg_watch_time < 10:
        profile_text += "• Viewing Pattern: Medium-form content consumer (moderate length)\n"
    else:
        profile_text += "• Viewing Pattern: Long-form content consumer (detailed videos)\n"
    
    if total_videos / days_tracked > 10:
        profile_text += "• Activity Level: High (active user)\n"
    elif total_videos / days_tracked > 5:
        profile_text += "• Activity Level: Moderate (regular user)\n"
    else:
        profile_text += "• Activity Level: Light (casual user)\n"
    
    profile_text += f"{'='*70}\n"
    
    profile.profile_text = profile_text
    profile.profile_generated_at = datetime.utcnow()
    db.commit()
    
    print("\n" + "="*70)
    print("✅ USER PROFILE GENERATED!")
    print("="*70)
    print(profile_text)
    print("="*70 + "\n")
    
    return profile_text


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
    Check for profiles that need generation
    """
    print("🚀 Starting SafeGuard Family Backend...")
    print(f"📁 Videos folder: {VIDEOS_FOLDER.absolute()}")
    print(f"🎵 Using Groq Whisper for transcription")
    print(f"🤖 Using Groq LLM for content analysis")
    print(f"👨‍👩‍👧 Parent-Child authentication enabled")
    print(f"🔒 Multi-device support enabled")
    print(f"📊 User behavior tracking enabled")
    
    # Check for profiles that need generation (7+ days)
    try:
        db = SessionLocal()
        profiles_to_generate = db.query(UserBehaviorProfile).filter(
            UserBehaviorProfile.days_tracked >= 7,
            UserBehaviorProfile.profile_text == None
        ).all()
        
        if profiles_to_generate:
            print(f"\n⏰ Found {len(profiles_to_generate)} profiles ready for generation...")
            for profile in profiles_to_generate:
                # Update days tracked
                days_tracked = (datetime.utcnow() - profile.start_date).days
                profile.days_tracked = days_tracked
                db.commit()
                
                # Generate profile
                generate_user_profile(db, profile)
                print(f"✅ Profile generated for child {profile.child_id}")
        
        db.close()
    except Exception as e:
        print(f"⚠️  Error checking profiles: {e}")
    
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
async def health_check(db=Depends(get_db)):
    """
    Health check endpoint
    Returns status and API info including behavior tracking stats
    """
    # Get total tracking stats across all users
    total_profiles = db.query(UserBehaviorProfile).count()
    total_tracked_videos = db.query(TrackedVideo).count()
    profiles_ready = db.query(UserBehaviorProfile).filter(
        UserBehaviorProfile.days_tracked >= 7
    ).count()
    
    return {
        "status": "healthy",
        "service": "SafeGuard Family - Parental Control System with Behavior Tracking",
        "version": API_VERSION,
        "features": [
            "parent-auth",
            "video-analysis",
            "comment-filtering",
            "weekly-reports",
            "multi-device",
            "behavior-tracking",
            "user-profiling"
        ],
        "tracking_stats": {
            "total_users_tracked": total_profiles,
            "total_videos_tracked": total_tracked_videos,
            "profiles_generated": profiles_ready
        }
    }


@app.get("/", response_class=HTMLResponse)
async def serve_web_dashboard():
    """
    Serve the web-based parent dashboard
    Accessible from any device on the network
    """
    dashboard_path = Path("web-dashboard.html")
    if dashboard_path.exists():
        return FileResponse(dashboard_path)
    else:
        return HTMLResponse(content="""
            <!DOCTYPE html>
            <html><head><title>SafeGuard Family</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🛡️ SafeGuard Family</h1>
                <p>Web dashboard file not found. Please ensure web-dashboard.html exists.</p>
                <p><a href="/docs">Go to API Documentation</a></p>
            </body></html>
        """, status_code=404)


@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard_alias():
    """Alternative URL for the dashboard"""
    return await serve_web_dashboard()


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
# BLOCKLIST/ALLOWLIST ENDPOINTS
# ════════════════════════════════

@app.get("/api/blocklist/{child_id}")
async def get_blocklist(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Get blocked sites for a child"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    blocked = db.query(BlockedSite).filter(BlockedSite.child_id == child_id).all()
    
    return {
        "status": "success",
        "blocklist": [{"domain": site.domain, "category": site.category} for site in blocked]
    }


@app.post("/api/blocklist/{child_id}")
async def add_blocked_site(
    child_id: str,
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Add a site to blocklist"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    site = BlockedSite(
        id=str(uuid.uuid4()),
        child_id=child_id,
        domain=data.get("domain", ""),
        category=data.get("category", "Custom")
    )
    db.add(site)
    db.commit()
    
    return {"status": "success", "success": True, "message": "Site blocked"}


@app.get("/api/allowlist/{child_id}")
async def get_allowlist(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Get allowed sites for a child"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    allowed = db.query(AllowedSite).filter(AllowedSite.child_id == child_id).all()
    
    return {
        "status": "success",
        "allowlist": [{"domain": site.domain} for site in allowed]
    }


@app.post("/api/allowlist/{child_id}")
async def add_allowed_site(
    child_id: str,
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Add a site to allowlist"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    site = AllowedSite(
        id=str(uuid.uuid4()),
        child_id=child_id,
        domain=data.get("domain", "")
    )
    db.add(site)
    db.commit()
    
    return {"status": "success", "message": "Site allowed"}


# ════════════════════════════════
# COMMENT FILTERING WITH GROQ API
# ════════════════════════════════

@app.post("/api/analyze-comment")
async def analyze_comment(data: dict):
    """
    Analyze comment toxicity using Groq AI
    Returns both 'hide' and 'is_toxic' for compatibility
    """
    comment_text = data.get("text", "")
    
    if not comment_text:
        return {
            "hide": False,
            "is_toxic": False,
            "severity": 0,
            "reason": "Empty comment"
        }
    
    # Quick keyword check first (Nepali + English)
    toxic_keywords = [
        # English - Extreme
        "kill", "die", "hate", "stupid", "idiot", "dumb", "shit", "fuck",
        "damn", "hell", "bitch", "ass", "crap", "loser", "ugly", "fat",
        "retard", "gay", "fag", "slut", "whore", "nigger", "kys", "suicide",
        "porn", "xxx", "sex", "rape", "abuse", "violence", "torture",
        
        # Nepali - Common Slurs  
        "mug", "mugi", "muji", "kasto", "k ho", "kta", "kti",
        "chutiya", "chutia", "madarchod", "mc", "madharchod",
        "behenchod", "bc", "bhenchod", "gaandu", "gandu", "geda",
        "bachha", "baccha", "randi", "randy", "lado", "baal",
        "thulo", "sano", "pagli", "pagal", "buddhu", "bewakoof",
        "haramkhor", "harami", "kutta", "kutti", "suar", "suwar",
        "ghanta", "jhol", "chikne", "nakkali", "nakli", "boksi",
        
        # Nepali - Very Offensive
        "machikne", "mula", "sala", "saala", "jatha", "boka",
        "puti", "puti ko", "budhi", "keti", "keta", "mutu"
    ]
    
    comment_lower = comment_text.lower()
    has_toxic_keyword = any(word in comment_lower for word in toxic_keywords)
    
    # Check for excessive angry emojis
    angry_emojis = ['🤬', '😡', '🖕', '💀', '☠️', '😠', '👿', '🔥']
    emoji_count = sum(comment_text.count(emoji) for emoji in angry_emojis)
    
    if has_toxic_keyword or emoji_count >= 3:
        return {
            "hide": True,         # For user's frontend
            "is_toxic": True,     # For our frontend
            "severity": 2,
            "reason": "Contains inappropriate language" if has_toxic_keyword else "Excessive angry emojis",
            "details": {
                "toxic_keywords": has_toxic_keyword,
                "angry_emojis": emoji_count
            }
        }
    
    # Use Groq API for deeper analysis if API key available
    if GROQ_API_KEY:
        try:
            groq_client = Groq(api_key=GROQ_API_KEY)
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{
                    "role": "system",
                    "content": "You are a content moderation AI. Analyze if the comment is toxic, offensive, hateful, violent, or inappropriate for children. Respond with ONLY 'SAFE' or 'TOXIC: brief reason' (one line)."
                }, {
                    "role": "user",
                    "content": f"Analyze this comment: {comment_text}"
                }],
                max_tokens=50,
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            
            if result.upper().startswith("TOXIC"):
                reason = result.replace("TOXIC:", "").strip() or "Inappropriate content"
                return {
                    "hide": True,
                    "is_toxic": True,
                    "severity": 2,
                    "reason": reason,
                    "source": "groq_ai"
                }
        except Exception as e:
            print(f"Groq analysis error: {e}")
    
    return {
        "hide": False,
        "is_toxic": False,
        "severity": 0,
        "reason": "Safe content"
    }


# ════════════════════════════════
# USER BEHAVIOR TRACKING ENDPOINTS
# ════════════════════════════════

@app.post("/api/track-video")
async def track_video_url(request: Request, db=Depends(get_db)):
    """
    Track video URL from Facebook for behavior analysis
    Automatically categorizes content and tracks viewing patterns
    """
    try:
        data = await request.json()
        url = data.get("url", "")
        child_id = data.get("child_id")
        
        if not url:
            return {"status": "ignored", "message": "No URL provided"}
        
        if not child_id:
            return {"status": "error", "message": "child_id required"}
        
        # Check if video URL (not profile or other pages)
        import re
        video_pattern = re.compile(r'facebook\.com/(reel|watch|videos?)/|fb\.watch/', re.IGNORECASE)
        
        if not video_pattern.search(url):
            return {"status": "ignored", "message": "Not a video URL", "url": url}
        
        # Check if already tracked recently (prevent duplicates within 1 hour)
        recent_video = db.query(TrackedVideo).filter(
            TrackedVideo.child_id == child_id,
            TrackedVideo.url == url,
            TrackedVideo.watched_at >= datetime.utcnow() - timedelta(hours=1)
        ).first()
        
        if recent_video:
            return {"status": "skipped", "message": "Already tracked recently", "url": url}
        
        # Extract video info using yt-dlp (faster extraction without download)
        try:
            loop = asyncio.get_event_loop()
            
            def extract_info():
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'skip_download': True  # Don't download, just extract info
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(url, download=False)
            
            info = await loop.run_in_executor(None, extract_info)
            
            if not info:
                return {"status": "error", "message": "Could not extract video info"}
            
            video_info = {
                "url": url,
                "title": info.get('title', 'Unknown'),
                "uploader": info.get('uploader', 'Unknown'),
                "duration": info.get('duration', 0),
                "description": info.get('description', '')[:200]
            }
            
            # Categorize video based on title and description
            categories = categorize_video_detailed(
                video_info["title"],
                video_info["description"],
                ""  # No transcription yet
            )
            
            # Update behavior profile
            profile = update_behavior_profile(db, child_id, video_info, categories)
            
            print(f"📊 Video Tracked: {video_info['title'][:50]}...")
            print(f"   Categories: {', '.join(categories)}")
            print(f"   Total Videos: {profile.total_videos_watched}")
            print(f"   Days Tracked: {profile.days_tracked}")
            
            return {
                "status": "success",
                "message": "Video tracked successfully",
                "url": url,
                "video_info": video_info,
                "categories": categories,
                "days_tracked": profile.days_tracked,
                "total_videos": profile.total_videos_watched,
                "profile_available": profile.days_tracked >= 7
            }
            
        except Exception as e:
            print(f"Video extraction error: {e}")
            # Still track basic info even if extraction fails
            categories = ["general"]
            video_info = {
                "url": url,
                "title": "Unknown Video",
                "uploader": "Unknown",
                "duration": 0
            }
            
            profile = update_behavior_profile(db, child_id, video_info, categories)
            
            return {
                "status": "partial_success",
                "message": "Basic tracking without full video info",
                "url": url,
                "days_tracked": profile.days_tracked,
                "total_videos": profile.total_videos_watched
            }
    
    except Exception as e:
        print(f"Track video error: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/behavior-profile/{child_id}")
async def get_behavior_profile(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get detailed behavior profile for a child
    Profile is available after 7 days of tracking
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get behavior profile
    profile = db.query(UserBehaviorProfile).filter(
        UserBehaviorProfile.child_id == child_id
    ).first()
    
    if not profile:
        return {
            "status": "not_started",
            "message": "Behavior tracking not started yet",
            "days_tracked": 0,
            "days_remaining": 7
        }
    
    days_tracked = profile.days_tracked
    
    if days_tracked < 7:
        return {
            "status": "in_progress",
            "message": f"Profile will be generated after 7 days",
            "days_tracked": days_tracked,
            "days_remaining": 7 - days_tracked,
            "total_videos": profile.total_videos_watched,
            "total_watch_time_minutes": profile.total_watch_time_seconds / 60
        }
    
    # Generate profile if not already generated
    if not profile.profile_text:
        generate_user_profile(db, profile)
        db.refresh(profile)
    
    return {
        "status": "ready",
        "days_tracked": days_tracked,
        "total_videos": profile.total_videos_watched,
        "total_watch_time_minutes": profile.total_watch_time_seconds / 60,
        "profile": profile.profile_text,
        "generated_at": profile.profile_generated_at.isoformat() if profile.profile_generated_at else None
    }


@app.get("/api/behavior-stats/{child_id}")
async def get_behavior_stats(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get current behavior statistics for a child
    Real-time tracking stats without waiting for 7 days
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get behavior profile
    profile = db.query(UserBehaviorProfile).filter(
        UserBehaviorProfile.child_id == child_id
    ).first()
    
    if not profile:
        return {
            "status": "not_started",
            "total_videos": 0,
            "total_watch_time_minutes": 0,
            "days_tracked": 0,
            "categories": {},
            "top_uploaders": {},
            "profile_available": False
        }
    
    categories_dict = json.loads(profile.categories_json or "{}")
    uploaders_dict = json.loads(profile.uploaders_json or "{}")
    
    # Sort uploaders by count
    sorted_uploaders = dict(sorted(uploaders_dict.items(), key=lambda x: x[1], reverse=True)[:5])
    
    return {
        "status": "success",
        "total_videos": profile.total_videos_watched,
        "total_watch_time_minutes": profile.total_watch_time_seconds / 60,
        "days_tracked": profile.days_tracked,
        "categories": categories_dict,
        "top_uploaders": sorted_uploaders,
        "profile_available": profile.days_tracked >= 7,
        "last_updated": profile.last_updated.isoformat()
    }


@app.get("/api/recent-videos/{child_id}")
async def get_recent_videos(
    child_id: str,
    limit: int = 10,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """
    Get recently watched videos for a child
    Shows last N videos with categories
    """
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get recent tracked videos
    videos = db.query(TrackedVideo).filter(
        TrackedVideo.child_id == child_id
    ).order_by(TrackedVideo.watched_at.desc()).limit(limit).all()
    
    video_list = []
    for video in videos:
        categories = json.loads(video.categories_json) if video.categories_json else ["general"]
        video_list.append({
            "title": video.title,
            "uploader": video.uploader,
            "duration_seconds": video.duration_seconds,
            "categories": categories,
            "watched_at": video.watched_at.isoformat(),
            "url": video.url
        })
    
    return {
        "status": "success",
        "total": len(video_list),
        "videos": video_list
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
# DEVICE ENDPOINTS
# ════════════════════════════════

@app.post("/api/devices")
async def register_device(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Register a new device for a child"""
    child_id = data.get("childId") or data.get("child_id")
    device_id = data.get("deviceId") or data.get("device_id")
    device_name = data.get("deviceName") or data.get("device_name", "Unknown Device")
    
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if device already exists
    existing = db.query(Device).filter(Device.device_id == device_id).first()
    if existing:
        existing.last_heartbeat = datetime.utcnow()
        existing.is_active = True
        db.commit()
        return {"status": "success", "message": "Device updated", "device_id": existing.id}
    
    # Create new device
    device = Device(
        id=str(uuid.uuid4()),
        child_id=child_id,
        device_id=device_id,
        device_name=device_name
    )
    db.add(device)
    db.commit()
    
    return {"status": "success", "message": "Device registered", "device_id": device.id}


@app.post("/api/devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Update device heartbeat"""
    device = db.query(Device).filter(Device.device_id == device_id).first()
    
    if not device:
        return {"status": "success", "message": "Device not found, ignored"}
    
    device.last_heartbeat = datetime.utcnow()
    device.is_active = True
    db.commit()
    
    return {"status": "success", "message": "Heartbeat updated"}


# ════════════════════════════════
# USAGE & LIMITS ENDPOINTS
# ════════════════════════════════

@app.get("/api/usage/{child_id}")
async def get_usage(
    child_id: str,
    days: int = 1,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Get usage statistics for a child"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Aggregate activity logs from last N days
    since_date = datetime.utcnow() - timedelta(days=days)
    logs = db.query(ActivityLog).filter(
        ActivityLog.child_id == child_id,
        ActivityLog.recorded_at >= since_date
    ).all()

    usage_map = {}
    total_seconds = 0
    flagged_count = 0

    for log in logs:
        total_seconds += int(log.duration_seconds or 0)
        if log.is_flagged:
            flagged_count += 1
        domain = (log.domain or "unknown").lower()
        usage_map[domain] = usage_map.get(domain, 0) + int(log.duration_seconds or 0)

    usage_list = [
        {"domain": domain, "seconds": seconds}
        for domain, seconds in sorted(usage_map.items(), key=lambda item: item[1], reverse=True)
    ]

    return {
        "status": "success",
        "total_seconds": total_seconds,
        "usage": usage_list,
        "usage_map": usage_map,
        "flagged_count": flagged_count,
        "activities_count": len(logs)
    }


@app.get("/api/limits/{child_id}")
async def get_limits(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Get time limits for a child"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    limits = db.query(SiteTimeLimit).filter(SiteTimeLimit.child_id == child_id).all()

    return {
        "status": "success",
        "limits": [
            {
                "id": rule.id,
                "domain": rule.domain,
                "daily_limit_minutes": rule.daily_limit_minutes,
                "cooldown_hours": rule.cooldown_hours,
                "permanent_block": rule.permanent_block,
                "blocked_until": rule.blocked_until.isoformat() if rule.blocked_until else None
            }
            for rule in limits
        ]
    }


@app.post("/api/limits")
async def set_limits(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Create or update a time limit rule for a child domain"""
    child_id = data.get("childId") or data.get("child_id")
    domain = (data.get("domain") or "").strip().lower()
    daily_limit = data.get("dailyLimitMinutes") or data.get("daily_limit_minutes", 0)
    cooldown_hours = data.get("cooldown_hours", 24)
    permanent_block = bool(data.get("permanent_block", False))
    blocked_until = data.get("blocked_until")
    
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")

    # Get or create per-domain limit
    limit = db.query(SiteTimeLimit).filter(
        SiteTimeLimit.child_id == child_id,
        SiteTimeLimit.domain == domain
    ).first()

    if not limit:
        limit = SiteTimeLimit(
            id=str(uuid.uuid4()),
            child_id=child_id,
            domain=domain,
            daily_limit_minutes=daily_limit,
            cooldown_hours=cooldown_hours,
            permanent_block=permanent_block,
            blocked_until=parse_iso_datetime(blocked_until)
        )
        db.add(limit)
    else:
        limit.daily_limit_minutes = daily_limit
        limit.cooldown_hours = cooldown_hours
        limit.permanent_block = permanent_block
        limit.blocked_until = parse_iso_datetime(blocked_until)

    db.commit()

    return {"status": "success", "success": True, "message": "Limits updated"}


@app.delete("/api/limits/{limit_id}")
async def delete_limit(
    limit_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Delete a time limit rule"""
    limit = db.query(SiteTimeLimit).filter(SiteTimeLimit.id == limit_id).first()

    if not limit:
        raise HTTPException(status_code=404, detail="Limit not found")

    # Verify parent owns the child
    child = db.query(Child).filter(
        Child.id == limit.child_id,
        Child.parent_id == parent_id
    ).first()

    if not child:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.delete(limit)
    db.commit()

    return {"status": "success", "success": True, "message": "Limit deleted"}


# ════════════════════════════════
# ACTIVITY LOGS ENDPOINTS
# ════════════════════════════════

@app.post("/api/logs/history")
async def log_activity(
    data: dict,
    db=Depends(get_db)
):
    """Log child activity"""
    try:
        child_id = data.get("childId") or data.get("child_id")
        
        if not child_id:
            return {"status": "success", "message": "No child_id provided"}
        
        log = ActivityLog(
            id=str(uuid.uuid4()),
            child_id=child_id,
            activity_type=data.get("type", "unknown"),
            domain=data.get("domain", "unknown"),
            title=data.get("title"),
            duration_seconds=data.get("duration", 0),
            is_flagged=data.get("flagged", False),
            flag_reason=data.get("reason")
        )
        db.add(log)
        db.commit()
        
        return {"status": "success", "message": "Activity logged"}
    except Exception as e:
        print(f"Error logging activity: {e}")
        return {"status": "success", "message": "Activity log ignored"}


# ════════════════════════════════
# SIMPLIFIED BLOCKLIST/ALLOWLIST
# ════════════════════════════════

@app.post("/api/blocklist")
async def add_to_blocklist(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Add site to blocklist (child_id in body)"""
    child_id = data.get("childId") or data.get("child_id")
    domain = data.get("domain", "")
    category = data.get("category", "Custom")
    
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    site = BlockedSite(
        id=str(uuid.uuid4()),
        child_id=child_id,
        domain=domain,
        category=category
    )
    db.add(site)
    db.commit()
    
    return {"status": "success", "message": "Site blocked"}


@app.delete("/api/blocklist")
async def remove_from_blocklist(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Remove site from blocklist (child_id in body)"""
    child_id = data.get("childId") or data.get("child_id")
    domain = (data.get("domain") or "").strip().lower()

    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    site = db.query(BlockedSite).filter(
        BlockedSite.child_id == child_id,
        BlockedSite.domain == domain
    ).first()

    if not site:
        return {"status": "success", "success": True, "message": "Site not found"}

    db.delete(site)
    db.commit()

    return {"status": "success", "success": True, "message": "Site removed"}


@app.post("/api/allowlist")
async def add_to_allowlist(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Add site to allowlist (child_id in body)"""
    child_id = data.get("childId") or data.get("child_id")
    domain = data.get("domain", "")
    
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    site = AllowedSite(
        id=str(uuid.uuid4()),
        child_id=child_id,
        domain=domain
    )
    db.add(site)
    db.commit()
    
    return {"status": "success", "success": True, "message": "Site allowed"}


@app.delete("/api/allowlist")
async def remove_from_allowlist(
    data: dict,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Remove site from allowlist (child_id in body)"""
    child_id = data.get("childId") or data.get("child_id")
    domain = (data.get("domain") or "").strip().lower()

    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    site = db.query(AllowedSite).filter(
        AllowedSite.child_id == child_id,
        AllowedSite.domain == domain
    ).first()

    if not site:
        return {"status": "success", "success": True, "message": "Site not found"}

    db.delete(site)
    db.commit()

    return {"status": "success", "success": True, "message": "Site removed"}


# ════════════════════════════════
# HIDDEN COMMENTS ENDPOINTS
# ════════════════════════════════

@app.post("/api/comments/hidden")
async def log_hidden_comment(
    data: dict,
    db=Depends(get_db)
):
    """Log a hidden comment from the extension"""
    try:
        child_id = data.get("childId") or data.get("child_id")
        
        if not child_id:
            return {"status": "success", "message": "No child_id provided"}
        
        comment = HiddenComment(
            id=str(uuid.uuid4()),
            child_id=child_id,
            post_url=data.get("post_url", ""),
            post_title=data.get("post_title", ""),
            comment_text=data.get("comment_text", ""),
            reason=data.get("reason", "Inappropriate content"),
            severity=data.get("severity", 1),
            domain=data.get("domain", "facebook.com")
        )
        db.add(comment)
        db.commit()
        
        return {"status": "success", "message": "Comment logged"}
    except Exception as e:
        print(f"Error logging hidden comment: {e}")
        return {"status": "success", "message": "Comment log ignored"}


@app.get("/api/comments/hidden/{child_id}")
async def get_hidden_comments(
    child_id: str,
    parent_id: str = Depends(get_current_parent),
    db=Depends(get_db)
):
    """Get all hidden comments for a child, grouped by post"""
    # Verify child belongs to parent
    child = db.query(Child).filter(
        Child.id == child_id,
        Child.parent_id == parent_id
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get all hidden comments
    comments = db.query(HiddenComment).filter(
        HiddenComment.child_id == child_id
    ).order_by(HiddenComment.hidden_at.desc()).all()
    
    # Group by post_url
    posts_map = {}
    for comment in comments:
        url = comment.post_url or "unknown"
        if url not in posts_map:
            posts_map[url] = {
                "post_url": url,
                "post_title": comment.post_title or "Facebook Post",
                "domain": comment.domain,
                "comments_count": 0,
                "comments": []
            }
        
        posts_map[url]["comments_count"] += 1
        posts_map[url]["comments"].append({
            "id": comment.id,
            "text": comment.comment_text,
            "reason": comment.reason,
            "severity": comment.severity,
            "hidden_at": comment.hidden_at.isoformat()
        })
    
    # Convert to list
    posts = list(posts_map.values())
    
    return {
        "status": "success",
        "total_comments": len(comments),
        "total_posts": len(posts),
        "posts": posts
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
    print("📍 Listening on http://0.0.0.0:8000")
    print("📚 API Documentation: http://0.0.0.0:8000/docs")
    print("🌐 Use http://<YOUR_PC_IP>:8000 from other devices")
    uvicorn.run(app, host="0.0.0.0", port=8000)
