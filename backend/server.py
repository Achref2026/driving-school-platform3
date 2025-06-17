import os
import uuid
import logging
import smtplib
from datetime import datetime, timedelta, timedelta
from typing import List, Optional, Dict
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File, Form, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
from enum import Enum
import requests
import cloudinary
import cloudinary.uploader
import cloudinary.api
import aiofiles
import json
import qrcode
from io import BytesIO
import base64
import sys
import os
sys.path.append(os.path.dirname(__file__))

from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder

# Initialize API Router
api_router = APIRouter()

# Configure logging
logger = logging.getLogger(__name__)

# Constants
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Initialize FastAPI app
app = FastAPI(title="Driving School Platform API")

# Initialize API Router with /api prefix
api_router = APIRouter(prefix="/api")

# Create demo uploads directory and mount static files
demo_uploads_dir = Path("demo-uploads")
demo_uploads_dir.mkdir(exist_ok=True)
app.mount("/demo-uploads", StaticFiles(directory="demo-uploads"), name="demo-uploads")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.driving_school_platform

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = "HS256"

# Daily.co API setup
DAILY_API_KEY = os.environ.get('DAILY_API_KEY')
DAILY_API_URL = os.environ.get('DAILY_API_URL', 'https://api.daily.co/v1')

# Cloudinary setup
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# Basic routes that don't need /api prefix
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Driving School Platform API is running"}

# Enums
class UserRole(str, Enum):
    GUEST = "guest"
    STUDENT = "student"
    TEACHER = "teacher"
    MANAGER = "manager"
    EXTERNAL_EXPERT = "external_expert"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"

class CourseType(str, Enum):
    THEORY = "theory"
    PARK = "park"
    ROAD = "road"

class CourseStatus(str, Enum):
    LOCKED = "locked"  # Can't start yet
    AVAILABLE = "available"  # Can start
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ExamStatus(str, Enum):
    NOT_AVAILABLE = "not_available"
    AVAILABLE = "available"
    PASSED = "passed"
    FAILED = "failed"

class DocumentType(str, Enum):
    PROFILE_PHOTO = "profile_photo"
    ID_CARD = "id_card"
    MEDICAL_CERTIFICATE = "medical_certificate"
    RESIDENCE_CERTIFICATE = "residence_certificate"
    DRIVING_LICENSE = "driving_license"
    TEACHING_LICENSE = "teaching_license"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REFUSED = "refused"

class EnrollmentStatus(str, Enum):
    PENDING_DOCUMENTS = "pending_documents"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class QuizDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class NotificationType(str, Enum):
    ENROLLMENT_APPROVED = "enrollment_approved"
    ENROLLMENT_REJECTED = "enrollment_rejected"
    SESSION_REMINDER = "session_reminder"
    EXAM_SCHEDULED = "exam_scheduled"
    COURSE_COMPLETED = "course_completed"
    CERTIFICATE_READY = "certificate_ready"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"

class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class CertificateStatus(str, Enum):
    NOT_ELIGIBLE = "not_eligible"
    ELIGIBLE = "eligible"
    GENERATED = "generated"
    ISSUED = "issued"

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str
    address: str
    date_of_birth: str
    gender: Gender

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    role: UserRole
    is_active: bool = True
    created_at: datetime

class DrivingSchool(BaseModel):
    id: str
    name: str
    address: str
    state: str
    phone: str
    email: EmailStr
    description: str
    logo_url: Optional[str] = None
    photos: List[str] = []
    price: float
    rating: float = 0.0
    total_reviews: int = 0
    manager_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

class DrivingSchoolCreate(BaseModel):
    name: str
    address: str
    state: str
    phone: str
    email: EmailStr
    description: str
    price: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Teacher(BaseModel):
    id: str
    user_id: str
    driving_school_id: str
    driving_license_url: str
    teaching_license_url: str
    photo_url: str
    can_teach_male: bool = True
    can_teach_female: bool = True
    rating: float = 0.0
    total_reviews: int = 0
    is_approved: bool = False
    created_at: datetime

class TeacherCreate(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = "male"
    password: str  # Added password field
    can_teach_male: bool = True
    can_teach_female: bool = True

class Enrollment(BaseModel):
    id: str
    student_id: str
    driving_school_id: str
    enrollment_status: EnrollmentStatus
    created_at: datetime
    approved_at: Optional[datetime] = None

class EnrollmentCreate(BaseModel):
    school_id: str

class Course(BaseModel):
    id: str
    enrollment_id: str
    course_type: CourseType
    status: CourseStatus
    teacher_id: Optional[str] = None
    scheduled_sessions: List[dict] = []
    completed_sessions: int = 0
    total_sessions: int
    exam_status: ExamStatus = ExamStatus.NOT_AVAILABLE
    exam_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

class DocumentUpload(BaseModel):
    id: str
    user_id: str
    document_type: DocumentType
    file_url: str
    file_name: str
    file_size: int
    upload_date: datetime
    is_verified: bool = False
    status: DocumentStatus = DocumentStatus.PENDING
    refusal_reason: Optional[str] = None

# New Models for Enhanced Functionality

class Quiz(BaseModel):
    id: str
    course_type: CourseType
    title: str
    description: str
    difficulty: QuizDifficulty
    questions: List[dict]  # Array of question objects
    passing_score: float = 70.0
    time_limit_minutes: int = 30
    is_active: bool = True
    created_by: str  # manager_id
    created_at: datetime

class QuizCreate(BaseModel):
    course_type: CourseType
    title: str
    description: str
    difficulty: QuizDifficulty
    questions: List[dict]
    passing_score: float = 70.0
    time_limit_minutes: int = 30

class QuizAttempt(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    answers: dict
    score: float
    passed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_taken_minutes: Optional[int] = None

class VideoRoom(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    student_id: str
    room_url: str
    room_name: str
    scheduled_at: datetime
    duration_minutes: int = 60
    is_active: bool = True
    daily_room_id: Optional[str] = None
    created_at: datetime

class VideoRoomCreate(BaseModel):
    course_id: str
    student_id: str
    scheduled_at: str  # ISO string
    duration_minutes: int = 60

class Session(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    student_id: str
    session_type: CourseType
    scheduled_at: datetime
    duration_minutes: int
    location: Optional[str] = None
    status: SessionStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class SessionCreate(BaseModel):
    course_id: str
    teacher_id: str
    scheduled_at: str  # ISO string
    duration_minutes: int = 60
    location: Optional[str] = None

class ExternalExpert(BaseModel):
    id: str
    user_id: str
    specialization: List[CourseType]  # park, road
    available_states: List[str]
    certification_number: str
    years_of_experience: int
    rating: float = 0.0
    total_exams_conducted: int = 0
    is_available: bool = True
    created_at: datetime

class ExternalExpertCreate(BaseModel):
    email: str
    specialization: List[CourseType]
    available_states: List[str]
    certification_number: str
    years_of_experience: int

class ExamSchedule(BaseModel):
    id: str
    course_id: str
    student_id: str
    external_expert_id: str
    exam_type: CourseType
    scheduled_at: datetime
    location: str
    duration_minutes: int = 90
    status: ExamStatus
    score: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

class ExamScheduleCreate(BaseModel):
    course_id: str
    exam_type: CourseType
    preferred_dates: List[str]  # ISO strings
    location: str

class Certificate(BaseModel):
    id: str
    student_id: str
    enrollment_id: str
    certificate_number: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    status: CertificateStatus
    pdf_url: Optional[str] = None
    qr_code: Optional[str] = None
    created_at: datetime

class Notification(BaseModel):
    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    is_read: bool = False
    metadata: Optional[dict] = None
    created_at: datetime

class ProgressAnalytics(BaseModel):
    id: str
    student_id: str
    enrollment_id: str
    course_type: CourseType
    sessions_completed: int
    total_sessions: int
    quiz_scores: List[float] = []
    average_score: float = 0.0
    time_spent_minutes: int = 0
    last_activity: datetime
    completion_percentage: float = 0.0
    created_at: datetime
    updated_at: datetime

class ReviewCreate(BaseModel):
    rating: int  # 1-5 stars
    comment: str
    enrollment_id: str

class Review(BaseModel):
    id: str
    student_id: str
    enrollment_id: str
    driving_school_id: str
    teacher_id: Optional[str] = None
    rating: int
    comment: str
    created_at: datetime

# Algerian States (58 wilayas)
ALGERIAN_STATES = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", 
    "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", 
    "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", 
    "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", 
    "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", 
    "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", 
    "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", 
    "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", 
    "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", 
    "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
]

# Course sequence order
COURSE_SEQUENCE = [CourseType.THEORY, CourseType.PARK, CourseType.ROAD]

# Required documents by role
REQUIRED_DOCUMENTS = {
    UserRole.STUDENT: [DocumentType.PROFILE_PHOTO, DocumentType.ID_CARD, DocumentType.MEDICAL_CERTIFICATE, DocumentType.RESIDENCE_CERTIFICATE],
    UserRole.TEACHER: [DocumentType.PROFILE_PHOTO, DocumentType.ID_CARD, DocumentType.DRIVING_LICENSE, DocumentType.TEACHING_LICENSE],
    UserRole.MANAGER: [DocumentType.PROFILE_PHOTO, DocumentType.ID_CARD],
    UserRole.EXTERNAL_EXPERT: [DocumentType.PROFILE_PHOTO, DocumentType.ID_CARD, DocumentType.DRIVING_LICENSE, DocumentType.TEACHING_LICENSE]
}

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    from bson import ObjectId
    from datetime import datetime
    
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB _id field
            result[key] = serialize_doc(value)
        return result
    if isinstance(doc, ObjectId):
        return str(doc)  # Convert ObjectId to string
    if isinstance(doc, datetime):
        return doc.isoformat()  # Convert datetime to ISO string
    return doc

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def check_user_documents_complete(user_id: str, role: str) -> bool:
    """Check if user has uploaded and accepted all required documents"""
    required_docs = REQUIRED_DOCUMENTS.get(role, [])
    
    documents_cursor = db.documents.find({
        "user_id": user_id,
        "status": "accepted",  # Changed from is_verified to status: accepted
        "document_type": {"$in": [doc.value for doc in required_docs]}
    })
    documents = await documents_cursor.to_list(length=None)
    
    uploaded_types = {doc["document_type"] for doc in documents}
    required_types = {doc.value for doc in required_docs}
    
    return required_types.issubset(uploaded_types)

async def check_user_documents_complete_enhanced(user_id: str, role: str) -> bool:
    """Enhanced check for user documents with additional validation and logging"""
    try:
        logger.info(f"Checking document completeness for user {user_id} with role {role}")
        
        required_docs = REQUIRED_DOCUMENTS.get(role, [])
        if not required_docs:
            logger.warning(f"No required documents found for role {role}")
            return True
        
        # Get all documents for this user
        all_documents = await db.documents.find({"user_id": user_id}).to_list(length=None)
        logger.info(f"Found {len(all_documents)} total documents for user {user_id}")
        
        # Filter for accepted documents of required types
        accepted_documents = [
            doc for doc in all_documents 
            if doc.get("status") == "accepted" and doc.get("document_type") in [doc_type.value for doc_type in required_docs]
        ]
        logger.info(f"Found {len(accepted_documents)} accepted required documents")
        
        uploaded_types = {doc["document_type"] for doc in accepted_documents}
        required_types = {doc.value for doc in required_docs}
        
        logger.info(f"Required types: {required_types}")
        logger.info(f"Accepted types: {uploaded_types}")
        
        missing_types = required_types - uploaded_types
        if missing_types:
            logger.info(f"Missing document types: {missing_types}")
            return False
        
        # Double-check: ensure we have exactly one accepted document for each required type
        for doc_type in required_types:
            type_docs = [doc for doc in accepted_documents if doc["document_type"] == doc_type]
            if len(type_docs) == 0:
                logger.warning(f"No accepted document found for type {doc_type}")
                return False
            elif len(type_docs) > 1:
                logger.info(f"Multiple documents found for type {doc_type}, using latest")
        
        logger.info(f"All required documents are complete for user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error checking document completeness: {str(e)}")
        # Fallback to original function
        return await check_user_documents_complete(user_id, role)

async def ensure_enrollment_status_consistency(student_id: str):
    """Ensure enrollment status is consistent with document status"""
    try:
        logger.info(f"Ensuring enrollment status consistency for student {student_id}")
        
        # Get student info
        student = await db.users.find_one({"id": student_id})
        if not student or student.get("role") != "student":
            return
        
        # Get student's enrollments
        enrollments = await db.enrollments.find({"student_id": student_id}).to_list(None)
        
        for enrollment in enrollments:
            current_status = enrollment.get("enrollment_status")
            
            # Only check enrollments that are in pending_documents status
            if current_status != EnrollmentStatus.PENDING_DOCUMENTS:
                continue
            
            # Check if documents are complete
            documents_complete = await check_user_documents_complete_enhanced(student_id, "student")
            
            if documents_complete:
                logger.info(f"Documents are complete for enrollment {enrollment['id']}, updating status")
                
                # Update status to pending_approval
                update_result = await db.enrollments.update_one(
                    {"id": enrollment["id"]},
                    {
                        "$set": {
                            "enrollment_status": EnrollmentStatus.PENDING_APPROVAL,
                            "documents_completed_at": datetime.utcnow(),
                            "status_corrected_at": datetime.utcnow()
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    logger.info(f"Corrected enrollment status for {enrollment['id']}")
                    
                    # Send notification
                    notification_doc = {
                        "id": str(uuid.uuid4()),
                        "user_id": student_id,
                        "type": "status_corrected",
                        "title": "Enrollment Status Updated",
                        "message": "Your enrollment status has been updated to pending approval after document verification.",
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    }
                    await db.notifications.insert_one(notification_doc)
    
    except Exception as e:
        logger.error(f"Error ensuring enrollment status consistency: {str(e)}")

async def update_course_availability(enrollment_id: str):
    """Update course availability based on completion status"""
    courses_cursor = db.courses.find({"enrollment_id": enrollment_id}).sort("course_type", 1)
    courses = await courses_cursor.to_list(length=None)
    
    # Sort courses by sequence
    course_order = {CourseType.THEORY: 0, CourseType.PARK: 1, CourseType.ROAD: 2}
    courses.sort(key=lambda x: course_order[x["course_type"]])
    
    for i, course in enumerate(courses):
        if i == 0:  # First course (theory) is always available
            if course["status"] == CourseStatus.LOCKED:
                await db.courses.update_one(
                    {"id": course["id"]},
                    {"$set": {"status": CourseStatus.AVAILABLE, "updated_at": datetime.utcnow()}}
                )
        else:
            # Check if previous course is completed and exam passed
            prev_course = courses[i-1]
            if prev_course["exam_status"] == ExamStatus.PASSED:
                if course["status"] == CourseStatus.LOCKED:
                    await db.courses.update_one(
                        {"id": course["id"]},
                        {"$set": {"status": CourseStatus.AVAILABLE, "updated_at": datetime.utcnow()}}
                    )
            else:
                # Lock the course if previous not completed
                if course["status"] != CourseStatus.LOCKED:
                    await db.courses.update_one(
                        {"id": course["id"]},
                        {"$set": {"status": CourseStatus.LOCKED, "updated_at": datetime.utcnow()}}
                    )

async def create_sequential_courses(enrollment_id: str):
    """Create courses with proper sequential logic"""
    courses = []
    course_configs = [
        {"type": CourseType.THEORY, "sessions": 10},
        {"type": CourseType.PARK, "sessions": 5}, 
        {"type": CourseType.ROAD, "sessions": 15}
    ]
    
    for i, course_config in enumerate(course_configs):
        course_id = str(uuid.uuid4())
        # Only first course (theory) is available initially
        initial_status = CourseStatus.AVAILABLE if i == 0 else CourseStatus.LOCKED
        
        course_doc = {
            "id": course_id,
            "enrollment_id": enrollment_id,
            "course_type": course_config["type"],
            "status": initial_status,
            "teacher_id": None,
            "scheduled_sessions": [],
            "completed_sessions": 0,
            "total_sessions": course_config["sessions"],
            "exam_status": ExamStatus.NOT_AVAILABLE,
            "exam_score": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        courses.append(course_doc)
    
    await db.courses.insert_many(courses)
    return courses

# Cloudinary upload function
async def upload_to_cloudinary(file: UploadFile, folder: str, resource_type: str = "auto"):
    """Upload file to Cloudinary"""
    try:
        file_content = await file.read()
        
        upload_result = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            resource_type=resource_type,
            public_id=f"{str(uuid.uuid4())}_{file.filename}",
            overwrite=True
        )
        
        return {
            "file_url": upload_result["secure_url"],
            "public_id": upload_result["public_id"],
            "file_size": upload_result.get("bytes", 0),
            "format": upload_result.get("format", ""),
            "width": upload_result.get("width"),
            "height": upload_result.get("height")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

async def upload_to_local_storage(file: UploadFile, folder: str):
    """Upload file to local storage as fallback"""
    try:
        # Reset file pointer
        await file.seek(0)
        file_content = await file.read()
        
        # Create upload directory
        upload_dir = demo_uploads_dir / folder
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'unknown'
        unique_filename = f"{str(uuid.uuid4())}_{file.filename}"
        file_path = upload_dir / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Return consistent format
        return {
            "file_url": f"/demo-uploads/{folder}/{unique_filename}",
            "public_id": unique_filename,
            "file_size": len(file_content),
            "format": file_extension,
            "width": None,
            "height": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file locally: {str(e)}")

async def upload_file_with_fallback(file: UploadFile, folder: str, resource_type: str = "auto"):
    """Upload file with Cloudinary first, fallback to local storage"""
    # Check if Cloudinary is properly configured
    if (os.environ.get('CLOUDINARY_CLOUD_NAME') and 
        os.environ.get('CLOUDINARY_API_KEY') and 
        os.environ.get('CLOUDINARY_API_SECRET') and
        os.environ.get('CLOUDINARY_CLOUD_NAME') != 'your-cloud-name'):
        try:
            return await upload_to_cloudinary(file, folder, resource_type)
        except Exception as e:
            logger.warning(f"Cloudinary upload failed, falling back to local storage: {str(e)}")
    
    # Fallback to local storage
    logger.info(f"Using local storage for file upload: {file.filename}")
    return await upload_to_local_storage(file, folder)

# Enhanced Certificate Generation Functions
async def generate_qr_code(data: str) -> str:
    """Generate QR code and return base64 encoded image"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

async def create_certificate_pdf(certificate_data: dict) -> bytes:
    """Generate a professional PDF certificate"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.darkblue,
        alignment=1,  # Center alignment
        spaceAfter=30
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.blue,
        alignment=1,
        spaceAfter=20
    )
    
    content_style = ParagraphStyle(
        'CustomContent',
        parent=styles['Normal'],
        fontSize=12,
        alignment=1,
        spaceAfter=10
    )
    
    # Build certificate content
    content = []
    
    # Certificate Header
    content.append(Paragraph("🇩🇿 REPUBLIC OF ALGERIA", title_style))
    content.append(Paragraph("MINISTRY OF TRANSPORT", subtitle_style))
    content.append(Spacer(1, 20))
    
    # Certificate Title
    content.append(Paragraph("DRIVING LICENSE CERTIFICATE", title_style))
    content.append(Paragraph("شهادة رخصة القيادة", subtitle_style))
    content.append(Spacer(1, 30))
    
    # Certificate Body
    content.append(Paragraph(
        f"This certifies that <b>{certificate_data['student_name']}</b> has successfully completed",
        content_style
    ))
    content.append(Paragraph(
        f"the comprehensive driving education program at <b>{certificate_data['school_name']}</b>",
        content_style
    ))
    content.append(Spacer(1, 20))
    
    # Certificate Details Table
    details_data = [
        ['Certificate Number:', certificate_data['certificate_number']],
        ['Issue Date:', certificate_data['issue_date'].strftime('%B %d, %Y')],
        ['Valid Until:', certificate_data['expiry_date'].strftime('%B %d, %Y')],
        ['Student ID:', certificate_data['student_id']],
        ['School Location:', certificate_data['school_location']]
    ]
    
    details_table = Table(details_data, colWidths=[2*inch, 3*inch])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    content.append(details_table)
    content.append(Spacer(1, 30))
    
    # QR Code for verification
    qr_code = await generate_qr_code(f"VERIFY:{certificate_data['certificate_number']}")
    qr_image = Image(BytesIO(base64.b64decode(qr_code)), width=100, height=100)
    content.append(Paragraph("Scan QR Code to Verify Certificate:", content_style))
    content.append(qr_image)
    content.append(Spacer(1, 20))
    
    # Signature section
    content.append(Paragraph("Authorized by the Ministry of Transport, Algeria", content_style))
    content.append(Paragraph("This certificate is valid for 5 years from the date of issue.", content_style))
    
    # Build PDF
    doc.build(content)
    buffer.seek(0)
    return buffer.getvalue()

# Enhanced Analytics Functions
async def generate_student_analytics_chart(student_data: dict) -> str:
    """Generate analytics charts for student progress"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(f"Student Progress Analytics - {student_data['student_name']}", fontsize=16)
    
    # Course Progress Chart
    courses = ['Theory', 'Park', 'Road']
    progress = [
        student_data.get('theory_progress', 0),
        student_data.get('park_progress', 0),
        student_data.get('road_progress', 0)
    ]
    
    colors_list = ['#3498db', '#2ecc71', '#e74c3c']
    ax1.bar(courses, progress, color=colors_list)
    ax1.set_title('Course Progress (%)')
    ax1.set_ylabel('Completion %')
    ax1.set_ylim(0, 100)
    
    # Quiz Scores Over Time
    if student_data.get('quiz_scores'):
        quiz_dates = range(1, len(student_data['quiz_scores']) + 1)
        ax2.plot(quiz_dates, student_data['quiz_scores'], marker='o', color='#9b59b6')
        ax2.set_title('Quiz Scores Over Time')
        ax2.set_xlabel('Quiz Number')
        ax2.set_ylabel('Score (%)')
        ax2.set_ylim(0, 100)
    else:
        ax2.text(0.5, 0.5, 'No Quiz Data Available', ha='center', va='center', transform=ax2.transAxes)
        ax2.set_title('Quiz Scores')
    
    # Session Attendance
    session_data = student_data.get('session_attendance', {})
    if session_data:
        sessions = list(session_data.keys())
        attendance = list(session_data.values())
        ax3.pie(attendance, labels=sessions, autopct='%1.1f%%', startangle=90)
        ax3.set_title('Session Attendance')
    else:
        ax3.text(0.5, 0.5, 'No Session Data Available', ha='center', va='center', transform=ax3.transAxes)
        ax3.set_title('Session Attendance')
    
    # Time Spent Learning (hours)
    learning_time = student_data.get('learning_time', {})
    if learning_time:
        activities = list(learning_time.keys())
        hours = list(learning_time.values())
        ax4.barh(activities, hours, color='#f39c12')
        ax4.set_title('Time Spent Learning (Hours)')
        ax4.set_xlabel('Hours')
    else:
        ax4.text(0.5, 0.5, 'No Time Data Available', ha='center', va='center', transform=ax4.transAxes)
        ax4.set_title('Learning Time')
    
    plt.tight_layout()
    
    # Save to base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    chart_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return chart_base64

async def calculate_student_metrics(student_id: str) -> dict:
    """Calculate comprehensive student metrics"""
    # Get student enrollments
    enrollments_cursor = db.enrollments.find({"student_id": student_id})
    enrollments = await enrollments_cursor.to_list(length=None)
    
    metrics = {
        "total_enrollments": len(enrollments),
        "completed_courses": 0,
        "total_quiz_attempts": 0,
        "average_quiz_score": 0,
        "total_sessions_attended": 0,
        "certificates_earned": 0,
        "learning_time_hours": 0,
        "course_progress": {},
        "quiz_scores": [],
        "session_attendance": {},
        "learning_time": {}
    }
    
    for enrollment in enrollments:
        # Get courses for this enrollment
        courses_cursor = db.courses.find({"enrollment_id": enrollment["id"]})
        courses = await courses_cursor.to_list(length=None)
        
        for course in courses:
            course_type = course["course_type"]
            progress = (course["completed_sessions"] / course["total_sessions"]) * 100 if course["total_sessions"] > 0 else 0
            metrics["course_progress"][course_type] = progress
            
            if course["status"] == "completed":
                metrics["completed_courses"] += 1
        
        # Get quiz attempts
        quiz_attempts_cursor = db.quiz_attempts.find({"student_id": student_id})
        quiz_attempts = await quiz_attempts_cursor.to_list(length=None)
        
        quiz_scores = [attempt["score"] for attempt in quiz_attempts]
        metrics["total_quiz_attempts"] = len(quiz_attempts)
        metrics["quiz_scores"] = quiz_scores
        metrics["average_quiz_score"] = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0
        
        # Get sessions
        sessions_cursor = db.sessions.find({"student_id": student_id})
        sessions = await sessions_cursor.to_list(length=None)
        
        attended_sessions = [s for s in sessions if s["status"] == "completed"]
        metrics["total_sessions_attended"] = len(attended_sessions)
        
        # Calculate session attendance by type
        for session in sessions:
            session_type = session["session_type"]
            if session_type not in metrics["session_attendance"]:
                metrics["session_attendance"][session_type] = 0
            if session["status"] == "completed":
                metrics["session_attendance"][session_type] += 1
        
        # Calculate learning time (estimated)
        metrics["learning_time"] = {
            "Theory Sessions": len([s for s in attended_sessions if s["session_type"] == "theory"]) * 1,
            "Park Practice": len([s for s in attended_sessions if s["session_type"] == "park"]) * 1.5,
            "Road Practice": len([s for s in attended_sessions if s["session_type"] == "road"]) * 2
        }
        metrics["learning_time_hours"] = sum(metrics["learning_time"].values())
    
    # Get certificates
    certificates_cursor = db.certificates.find({"student_id": student_id})
    certificates = await certificates_cursor.to_list(length=None)
    metrics["certificates_earned"] = len(certificates)
    
    return metrics

@api_router.post("/admin/fix-enrollment-status")
async def fix_enrollment_status(current_user = Depends(get_current_user)):
    """Administrative endpoint to fix enrollment status inconsistencies"""
    try:
        # Only allow managers or system admin
        if current_user["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        logger.info(f"Admin {current_user['id']} triggered enrollment status fix")
        
        # Find all students with pending_documents status
        pending_enrollments = await db.enrollments.find({
            "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS
        }).to_list(None)
        
        fixed_count = 0
        total_count = len(pending_enrollments)
        
        for enrollment in pending_enrollments:
            student_id = enrollment["student_id"]
            
            # Check if documents are actually complete
            documents_complete = await check_user_documents_complete_enhanced(student_id, "student")
            
            if documents_complete:
                # Fix the status
                await ensure_enrollment_status_consistency(student_id)
                fixed_count += 1
                logger.info(f"Fixed enrollment status for student {student_id}")
        
        return {
            "message": f"Status fix completed",
            "total_checked": total_count,
            "fixed_count": fixed_count,
            "fixed_enrollments": fixed_count
        }
    
    except Exception as e:
        logger.error(f"Error in fix enrollment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fix enrollment status")

# API Routes
@api_router.get("/courses")
async def get_user_courses(current_user: dict = Depends(get_current_user)):
    """Get courses for the current user"""
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can access courses")
        
        # Get user's enrollments
        enrollments_cursor = db.enrollments.find({"student_id": current_user["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        all_courses = []
        for enrollment in enrollments:
            # Get courses for this enrollment
            courses_cursor = db.courses.find({"enrollment_id": enrollment["id"]})
            courses = await courses_cursor.to_list(length=None)
            
            # Add enrollment info to each course
            for course in courses:
                course["enrollment_id"] = enrollment["id"]
                course["school_name"] = enrollment.get("school_name", "Unknown School")
            
            all_courses.extend(courses)
        
        return {"courses": serialize_doc(all_courses)}
    
    except Exception as e:
        logger.error(f"Get courses error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve courses")

@api_router.get("/notifications")
async def get_user_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for the current user"""
    try:
        notifications_cursor = db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(20)
        notifications = await notifications_cursor.to_list(length=None)
        
        return {"notifications": serialize_doc(notifications)}
    
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")

@api_router.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        # Update notification
        result = await db.notifications.update_one(
            {"id": notification_id, "user_id": current_user["id"]},
            {"$set": {"is_read": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
    
    except Exception as e:
        logger.error(f"Mark notification read error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@api_router.get("/users/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    user_data = {k: v for k, v in current_user.items() if k != "password_hash"}
    return serialize_doc(user_data)

@api_router.get("/users/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    user_data = {k: v for k, v in current_user.items() if k != "password_hash"}
    return serialize_doc(user_data)

@api_router.get("/states")
async def get_states():
    return {"states": ALGERIAN_STATES}

@api_router.post("/auth/register", response_model=dict)
async def register_user(
    email: str = Form(...),
    password: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    date_of_birth: str = Form(...),
    gender: str = Form(...),
    state: str = Form(...),
    profile_photo: Optional[UploadFile] = File(None)
):
    try:
        # Validate date_of_birth format
        try:
            birth_date = datetime.fromisoformat(date_of_birth)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Validate state
        if state not in ALGERIAN_STATES:
            raise HTTPException(status_code=400, detail="Invalid state")
        
        # Validate gender
        if gender not in ['male', 'female']:
            raise HTTPException(status_code=400, detail="Invalid gender")
        
        # Hash password
        password_hash = pwd_context.hash(password)
        
        # Handle profile photo upload
        profile_photo_url = None
        if profile_photo and profile_photo.size > 0:
            try:
                # Upload with fallback (Cloudinary or local storage)
                upload_result = await upload_file_with_fallback(profile_photo, "profile_photos", "image")
                profile_photo_url = upload_result["file_url"]
            except Exception as e:
                logger.warning(f"Failed to upload profile photo: {str(e)}")
                profile_photo_url = None
        
        # Create user with default "guest" role
        user_data = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": password_hash,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "address": address,
            "date_of_birth": birth_date,
            "gender": gender,
            "role": "guest",  # Default role is guest
            "state": state,
            "profile_photo_url": profile_photo_url,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        await db.users.insert_one(user_data)
        
        # Generate access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data["id"]}, 
            expires_delta=access_token_expires
        )
        
        # Return user data (exclude password hash)
        user_response = {k: v for k, v in user_data.items() if k != "password_hash"}
        user_response = serialize_doc(user_response)
        
        return {
            "message": "Registration successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/login", response_model=dict)
async def login_user(user_data: UserLogin):
    try:
        # Find user by email
        user = await db.users.find_one({"email": user_data.email})
        if not user or not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Generate access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["id"]}, 
            expires_delta=access_token_expires
        )
        
        # Return user data (exclude password hash)
        user_response = {k: v for k, v in user.items() if k != "password_hash"}
        user_response = serialize_doc(user_response)
        
        return {
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.get("/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    """Get dashboard data for the current user"""
    try:
        dashboard_data = {
            "user": serialize_doc(current_user),
            "enrollments": [],
            "documents": [],
            "notifications": []
        }
        
        # Get user's enrollments
        enrollments_cursor = db.enrollments.find({"student_id": current_user["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        for enrollment in enrollments:
            # Get school details
            school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
            enrollment_data = serialize_doc(enrollment)
            if school:
                enrollment_data["school_name"] = school["name"]
                enrollment_data["school_address"] = school["address"]
                enrollment_data["school_state"] = school["state"]
            dashboard_data["enrollments"].append(enrollment_data)
        
        # Get user's documents
        documents_cursor = db.documents.find({"user_id": current_user["id"]})
        documents = await documents_cursor.to_list(length=None)
        dashboard_data["documents"] = serialize_doc(documents)
        
        # Get user's notifications
        notifications_cursor = db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(10)
        notifications = await notifications_cursor.to_list(length=None)
        dashboard_data["notifications"] = serialize_doc(notifications)
        
        return dashboard_data
    
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard data")

@api_router.post("/documents/upload")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document for the current user"""
    try:
        # Validate document type
        if document_type not in [doc.value for doc in DocumentType]:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Upload with fallback
        folder_name = f"documents/{document_type}"
        upload_result = await upload_file_with_fallback(file, folder_name, "auto")
        
        # Save document record with automatic acceptance for students
        document_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "document_type": document_type,
            "file_url": upload_result["file_url"],
            "file_name": file.filename,
            "file_size": upload_result["file_size"],
            "upload_date": datetime.utcnow(),
            "is_verified": True,  # Auto-accept for new simplified workflow
            "status": "accepted",  # Auto-accept for new simplified workflow
            "refusal_reason": None
        }
        
        # Check if document already exists and update it
        existing_doc = await db.documents.find_one({
            "user_id": current_user["id"],
            "document_type": document_type
        })
        
        if existing_doc:
            await db.documents.update_one(
                {"id": existing_doc["id"]},
                {"$set": document_data}
            )
        else:
            await db.documents.insert_one(document_data)
        
        # Check if all required documents are uploaded and update enrollment status automatically
        if current_user["role"] == "student":
            # Check if all required documents are now uploaded
            documents_complete = await check_user_documents_complete_enhanced(current_user["id"], "student")
            
            if documents_complete:
                # Update all enrollments with pending_documents status to pending_approval
                await db.enrollments.update_many(
                    {
                        "student_id": current_user["id"],
                        "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS
                    },
                    {
                        "$set": {
                            "enrollment_status": EnrollmentStatus.PENDING_APPROVAL,
                            "documents_completed_at": datetime.utcnow()
                        }
                    }
                )
                
                # Send notification
                notification_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user["id"],
                    "type": "documents_completed",
                    "title": "Documents Completed",
                    "message": "All required documents have been uploaded. Your enrollment is now ready for manager approval.",
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                await db.notifications.insert_one(notification_doc)
        
        return {
            "message": "Document uploaded successfully",
            "document": serialize_doc(document_data)
        }
    
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to upload document")

@api_router.get("/documents")
async def get_user_documents(current_user: dict = Depends(get_current_user)):
    """Get all documents for the current user"""
    try:
        documents_cursor = db.documents.find({"user_id": current_user["id"]})
        documents = await documents_cursor.to_list(length=None)
        
        # Get required documents for user role
        required_docs = REQUIRED_DOCUMENTS.get(current_user["role"], [])
        
        return {
            "documents": serialize_doc(documents),
            "required_documents": [doc.value for doc in required_docs]
        }
    
    except Exception as e:
        logger.error(f"Get documents error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@api_router.post("/enroll")
async def enroll_in_school(
    enrollment_data: EnrollmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Enroll current user in a driving school"""
    try:
        # Check if school exists
        school = await db.driving_schools.find_one({"id": enrollment_data.school_id})
        if not school:
            raise HTTPException(status_code=404, detail="Driving school not found")
        
        # Check if user is already enrolled in this school
        existing_enrollment = await db.enrollments.find_one({
            "student_id": current_user["id"],
            "driving_school_id": enrollment_data.school_id
        })
        
        if existing_enrollment:
            raise HTTPException(status_code=400, detail="Already enrolled in this school")
        
        # Create enrollment
        enrollment_doc = {
            "id": str(uuid.uuid4()),
            "student_id": current_user["id"],
            "driving_school_id": enrollment_data.school_id,
            "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS,
            "created_at": datetime.utcnow(),
            "approved_at": None
        }
        
        await db.enrollments.insert_one(enrollment_doc)
        
        # Create initial courses (locked until documents are approved)
        await create_sequential_courses(enrollment_doc["id"])
        
        return {
            "message": "Enrollment created successfully",
            "enrollment": serialize_doc(enrollment_doc)
        }
    
    except Exception as e:
        logger.error(f"Enrollment error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to create enrollment")

@api_router.get("/driving-schools")
async def get_driving_schools(
    state: str = None,
    search: str = None,
    min_price: float = None,
    max_price: float = None,
    min_rating: float = None,
    sort_by: str = "name",  # name, price, rating, newest
    sort_order: str = "asc",  # asc, desc
    page: int = 1,
    limit: int = 20
):
    try:
        # Build query
        query = {}
        
        # State filter
        if state:
            query["state"] = state
        
        # Search filter (name, description, address)
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"name": search_regex},
                {"description": search_regex},
                {"address": search_regex}
            ]
        
        # Price range filter
        if min_price is not None or max_price is not None:
            price_filter = {}
            if min_price is not None:
                price_filter["$gte"] = min_price
            if max_price is not None:
                price_filter["$lte"] = max_price
            query["price"] = price_filter
        
        # Rating filter
        if min_rating is not None:
            query["rating"] = {"$gte": min_rating}
        
        # Sort configuration
        sort_field = "name"
        if sort_by == "price":
            sort_field = "price"
        elif sort_by == "rating":
            sort_field = "rating"
        elif sort_by == "newest":
            sort_field = "created_at"
        
        sort_direction = 1 if sort_order == "asc" else -1
        
        # Calculate pagination
        skip = (page - 1) * limit
        
        # Get total count for pagination
        total_count = await db.driving_schools.count_documents(query)
        
        # Fetch schools with pagination and sorting
        schools_cursor = db.driving_schools.find(query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        schools = await schools_cursor.to_list(length=None)
        
        # Calculate pagination info
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        # Serialize the schools data
        schools_serialized = serialize_doc(schools)
        
        return {
            "schools": schools_serialized,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_count": total_count,
                "has_next": has_next,
                "has_prev": has_prev,
                "per_page": limit
            },
            "filters_applied": {
                "state": state,
                "search": search,
                "min_price": min_price,
                "max_price": max_price,
                "min_rating": min_rating,
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching driving schools: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch driving schools")

@api_router.get("/driving-schools/search-suggestions")
async def get_search_suggestions(q: str):
    """Get search suggestions for driving school names"""
    try:
        if len(q) < 2:
            return {"suggestions": []}
        
        # Get school names that match the query
        query = {"name": {"$regex": q, "$options": "i"}}
        schools_cursor = db.driving_schools.find(query, {"name": 1, "_id": 0}).limit(10)
        schools = await schools_cursor.to_list(length=None)
        
        suggestions = [school["name"] for school in schools]
        
        return {"suggestions": suggestions}
    
    except Exception as e:
        logger.error(f"Error getting search suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get search suggestions")

@api_router.get("/driving-schools/filters/stats")
async def get_filter_stats():
    """Get statistics for filter options (price range, rating distribution)"""
    try:
        # Get price range
        price_stats = await db.driving_schools.aggregate([
            {
                "$group": {
                    "_id": None,
                    "min_price": {"$min": "$price"},
                    "max_price": {"$max": "$price"},
                    "avg_price": {"$avg": "$price"}
                }
            }
        ]).to_list(length=1)
        
        # Get rating distribution
        rating_stats = await db.driving_schools.aggregate([
            {
                "$group": {
                    "_id": {"$floor": "$rating"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]).to_list(length=None)
        
        # Get state distribution
        state_stats = await db.driving_schools.aggregate([
            {
                "$group": {
                    "_id": "$state",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]).to_list(length=None)
        
        result = {
            "price_range": {
                "min": price_stats[0]["min_price"] if price_stats else 0,
                "max": price_stats[0]["max_price"] if price_stats else 100000,
                "average": price_stats[0]["avg_price"] if price_stats else 50000
            },
            "rating_distribution": {str(stat["_id"]): stat["count"] for stat in rating_stats},
            "state_distribution": state_stats[:10],  # Top 10 states
            "total_schools": await db.driving_schools.count_documents({})
        }
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting filter stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get filter statistics")

@api_router.post("/enrollments")
async def create_enrollment(
    enrollment_data: EnrollmentCreate,
    current_user = Depends(get_current_user)
):
    try:
        # Check if user is a guest (students can enroll)
        if current_user["role"] not in ["guest", "student"]:
            raise HTTPException(status_code=403, detail="Only guests and students can enroll")
        
        # Check if school exists
        school = await db.driving_schools.find_one({"id": enrollment_data.school_id})
        if not school:
            raise HTTPException(status_code=404, detail="Driving school not found")
        
        # Check if user already enrolled in this school
        existing_enrollment = await db.enrollments.find_one({
            "student_id": current_user["id"],
            "driving_school_id": enrollment_data.school_id,
            "enrollment_status": {"$in": ["pending_documents", "pending_approval", "approved"]}
        })
        
        if existing_enrollment:
            raise HTTPException(status_code=400, detail="Already enrolled or have pending enrollment")
        
        # Create enrollment without payment requirement
        enrollment_id = str(uuid.uuid4())
        enrollment_doc = {
            "id": enrollment_id,
            "student_id": current_user["id"],
            "driving_school_id": enrollment_data.school_id,
            "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS,
            "created_at": datetime.utcnow(),
            "approved_at": None
        }
        
        await db.enrollments.insert_one(enrollment_doc)
        
        # Update user role to student if they were a guest
        if current_user["role"] == "guest":
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$set": {"role": "student"}}
            )
        
        # Create sequential courses for the enrollment
        await create_sequential_courses(enrollment_id)
        
        return {
            "message": "Enrollment successful! Please upload required documents for approval.",
            "enrollment_id": enrollment_id,
            "status": "pending_documents"
        }
    
    except Exception as e:
        logger.error(f"Enrollment error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Enrollment failed")

# DUPLICATE DASHBOARD ENDPOINT - COMMENTED OUT TO AVOID CONFLICTS
# @api_router.get("/dashboard")
# async def get_dashboard_data(current_user = Depends(get_current_user)):
    try:
        dashboard_data = {
            "user": serialize_doc(current_user),
            "enrollments": [],
            "courses": [],
            "notifications": []
        }
        
        # Get user's enrollments
        enrollments_cursor = db.enrollments.find({"student_id": current_user["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        # Get school information for each enrollment
        for enrollment in enrollments:
            school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
            if school:
                enrollment["school_name"] = school["name"]
                enrollment["school_address"] = school["address"]
        
        dashboard_data["enrollments"] = serialize_doc(enrollments)
        
        # Get courses for approved enrollments
        if enrollments:
            enrollment_ids = [e["id"] for e in enrollments if e["enrollment_status"] == "approved"]
            if enrollment_ids:
                courses_cursor = db.courses.find({"enrollment_id": {"$in": enrollment_ids}})
                courses = await courses_cursor.to_list(length=None)
                dashboard_data["courses"] = serialize_doc(courses)
        
        # Get recent notifications
        notifications_cursor = db.notifications.find(
            {"user_id": current_user["id"]}
        ).sort("created_at", -1).limit(10)
        notifications = await notifications_cursor.to_list(length=None)
        dashboard_data["notifications"] = serialize_doc(notifications)
        
        return dashboard_data
    
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard data")

@api_router.post("/documents/upload")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    try:
        # Validate document type
        if document_type not in [doc.value for doc in DocumentType]:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Upload file to Cloudinary
        upload_result = await upload_to_cloudinary(file, f"documents/{document_type}", "auto")
        
        # Create document record
        document_id = str(uuid.uuid4())
        document_doc = {
            "id": document_id,
            "user_id": current_user["id"],
            "document_type": document_type,
            "file_url": upload_result["file_url"],
            "file_name": file.filename,
            "file_size": upload_result["file_size"],
            "upload_date": datetime.utcnow(),
            "is_verified": False,  # Manager needs to verify
            "status": "pending",
            "refusal_reason": None
        }
        
        await db.documents.insert_one(document_doc)
        
        # Check if all required documents are uploaded and update enrollment status
        if current_user["role"] == "student":
            documents_complete = await check_user_documents_complete(
                current_user["id"], 
                "student"
            )
            
            if documents_complete:
                # Update pending enrollments to pending_approval status
                await db.enrollments.update_many(
                    {
                        "student_id": current_user["id"],
                        "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS
                    },
                    {"$set": {"enrollment_status": EnrollmentStatus.PENDING_APPROVAL}}
                )
        
        return {
            "message": "Document uploaded successfully",
            "document_id": document_id,
            "file_url": upload_result["file_url"]
        }
    
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Document upload failed")

@api_router.get("/documents")
async def get_user_documents(current_user = Depends(get_current_user)):
    try:
        documents_cursor = db.documents.find({"user_id": current_user["id"]})
        documents = await documents_cursor.to_list(length=None)
        
        return {"documents": serialize_doc(documents)}
    
    except Exception as e:
        logger.error(f"Get documents error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")

# Manager Routes
@api_router.get("/manager/enrollments")
async def get_pending_enrollments(current_user = Depends(get_current_user)):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can access this")
        
        # Get manager's driving school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="No driving school found for this manager")
        
        # Get all enrollments for the school
        enrollments_cursor = db.enrollments.find({
            "driving_school_id": school["id"]
        }).sort("created_at", -1)
        enrollments = await enrollments_cursor.to_list(length=None)
        
        # Get student information for each enrollment
        for enrollment in enrollments:
            student = await db.users.find_one({"id": enrollment["student_id"]})
            if student:
                enrollment["student_name"] = f"{student['first_name']} {student['last_name']}"
                enrollment["student_email"] = student["email"]
                enrollment["student_phone"] = student["phone"]
                
                # Check if documents are verified
                documents_complete = await check_user_documents_complete(
                    enrollment["student_id"], 
                    "student"
                )
                enrollment["documents_verified"] = documents_complete
        
        return {"enrollments": serialize_doc(enrollments)}
    
    except Exception as e:
        logger.error(f"Get enrollments error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to fetch enrollments")

# NEW APPROVAL SYSTEM: Get student details with documents for manager review
@api_router.get("/manager/student-details/{student_id}")
async def get_student_details_for_approval(
    student_id: str,
    current_user = Depends(get_current_user)
):
    """Get comprehensive student details for manager approval decision"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view student details")
        
        # Get student info
        student = await db.users.find_one({"id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get student's enrollment for this manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="No school found for this manager")
        
        enrollment = await db.enrollments.find_one({
            "student_id": student_id,
            "driving_school_id": school["id"]
        })
        if not enrollment:
            raise HTTPException(status_code=404, detail="Student enrollment not found for your school")
        
        # Get all student documents
        documents_cursor = db.documents.find({"user_id": student_id})
        documents = await documents_cursor.to_list(length=None)
        
        # Organize documents by type with status
        required_docs = REQUIRED_DOCUMENTS.get("student", [])
        document_status = {}
        
        for doc_type in required_docs:
            doc_type_value = doc_type.value
            student_docs = [doc for doc in documents if doc["document_type"] == doc_type_value]
            
            if student_docs:
                # Get latest document for this type
                latest_doc = max(student_docs, key=lambda x: x["upload_date"])
                document_status[doc_type_value] = {
                    "id": latest_doc["id"],
                    "file_url": latest_doc["file_url"],
                    "file_name": latest_doc["file_name"],
                    "status": latest_doc["status"],
                    "upload_date": latest_doc["upload_date"].isoformat(),
                    "refusal_reason": latest_doc.get("refusal_reason")
                }
            else:
                document_status[doc_type_value] = {
                    "status": "not_uploaded",
                    "file_url": None,
                    "file_name": None,
                    "upload_date": None,
                    "refusal_reason": None
                }
        
        return {
            "student": {
                "id": student["id"],
                "first_name": student["first_name"],
                "last_name": student["last_name"],
                "email": student["email"],
                "phone": student.get("phone", ""),
                "address": student.get("address", ""),
                "date_of_birth": student.get("date_of_birth", ""),
                "gender": student.get("gender", "")
            },
            "enrollment": {
                "id": enrollment["id"],
                "enrollment_status": enrollment["enrollment_status"],
                "created_at": enrollment["created_at"].isoformat(),
                "approved_at": enrollment.get("approved_at").isoformat() if enrollment.get("approved_at") else None
            },
            "documents": document_status,
            "school_name": school["name"]
        }
    
    except Exception as e:
        logger.error(f"Get student details error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to get student details")

# NEW APPROVAL SYSTEM: Accept student enrollment (replaces old approve function)
@api_router.post("/manager/enrollments/{enrollment_id}/accept")
async def accept_student_enrollment(
    enrollment_id: str,
    current_user = Depends(get_current_user)
):
    """Accept student enrollment - makes student official and able to start lessons"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can accept enrollments")
        
        # Get enrollment
        enrollment = await db.enrollments.find_one({"id": enrollment_id})
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        # Verify manager owns this school
        school = await db.driving_schools.find_one({
            "id": enrollment["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to accept this enrollment")
        
        # Verify all required documents are uploaded and have acceptable status
        required_docs = REQUIRED_DOCUMENTS.get("student", [])
        all_documents = await db.documents.find({"user_id": enrollment["student_id"]}).to_list(length=None)
        
        # Check if student has uploaded all required documents
        uploaded_types = {doc["document_type"] for doc in all_documents}
        required_types = {doc.value for doc in required_docs}
        
        if not required_types.issubset(uploaded_types):
            raise HTTPException(status_code=400, detail="Student has not uploaded all required documents")
        
        # Accept the enrollment
        await db.enrollments.update_one(
            {"id": enrollment_id},
            {
                "$set": {
                    "enrollment_status": EnrollmentStatus.APPROVED,
                    "approved_at": datetime.utcnow(),
                    "approved_by": current_user["id"]
                }
            }
        )
        
        # Mark all student documents as accepted
        for doc_type in required_types:
            await db.documents.update_many(
                {
                    "user_id": enrollment["student_id"],
                    "document_type": doc_type,
                    "status": {"$in": ["pending", "refused"]}
                },
                {
                    "$set": {
                        "status": "accepted",
                        "is_verified": True,
                        "approved_at": datetime.utcnow(),
                        "approved_by": current_user["id"],
                        "refusal_reason": None
                    }
                }
            )
        
        # Update course availability - student can now start lessons
        await update_course_availability(enrollment_id)
        
        # Send notification to student
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": enrollment["student_id"],
            "type": NotificationType.ENROLLMENT_APPROVED,
            "title": "Enrollment Accepted - You Can Start Learning!",
            "message": f"Congratulations! Your enrollment at {school['name']} has been accepted. You are now an official student and can start your lessons immediately!",
            "is_read": False,
            "metadata": {
                "enrollment_id": enrollment_id, 
                "school_name": school["name"],
                "action": "accepted"
            },
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
        
        return {
            "message": "Student enrollment accepted successfully",
            "student_id": enrollment["student_id"],
            "school_name": school["name"],
            "status": "accepted"
        }
    
    except Exception as e:
        logger.error(f"Accept enrollment error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to accept enrollment")

@api_router.post("/manager/enrollments/{enrollment_id}/reject")
async def reject_enrollment(
    enrollment_id: str,
    reason: str = Form(...),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can reject enrollments")
        
        # Get enrollment
        enrollment = await db.enrollments.find_one({"id": enrollment_id})
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        # Verify manager owns this school
        school = await db.driving_schools.find_one({
            "id": enrollment["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to reject this enrollment")
        
        # Reject enrollment
        await db.enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {"enrollment_status": EnrollmentStatus.REJECTED}}
        )
        
        # Send notification to student
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": enrollment["student_id"],
            "type": NotificationType.ENROLLMENT_REJECTED,
            "title": "Enrollment Rejected",
            "message": f"Your enrollment at {school['name']} was rejected. Reason: {reason}",
            "is_read": False,
            "metadata": {"enrollment_id": enrollment_id, "school_name": school["name"], "reason": reason},
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
        
        return {"message": "Enrollment rejected"}
    
    except Exception as e:
        logger.error(f"Reject enrollment error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to reject enrollment")

@api_router.get("/manager/enrollments/{enrollment_id}/documents")
async def get_student_documents(
    enrollment_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view student documents")
        
        # Get enrollment
        enrollment = await db.enrollments.find_one({"id": enrollment_id})
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        # Verify manager owns this school
        school = await db.driving_schools.find_one({
            "id": enrollment["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to view these documents")
        
        # Get student documents
        documents_cursor = db.documents.find({"user_id": enrollment["student_id"]})
        documents = await documents_cursor.to_list(length=None)
        
        # Get student info
        student = await db.users.find_one({"id": enrollment["student_id"]})
        student_info = {
            "name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
            "email": student["email"] if student else "N/A"
        }
        
        return {
            "student_info": student_info,
            "documents": serialize_doc(documents),
            "total": len(documents)
        }
    
    except Exception as e:
        logger.error(f"Get student documents error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve student documents")

@api_router.post("/manager/documents/{document_id}/approve")
async def approve_document(
    document_id: str,
    current_user = Depends(get_current_user)
):
    """Approve a student document"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can approve documents")
        
        # Get document
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get student and their enrollment to verify manager authority
        student_id = document["user_id"]
        enrollment = await db.enrollments.find_one({"student_id": student_id})
        if not enrollment:
            raise HTTPException(status_code=404, detail="Student enrollment not found")
        
        # Verify manager owns the school
        school = await db.driving_schools.find_one({
            "id": enrollment["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to approve this document")
        
        # Approve document
        await db.documents.update_one(
            {"id": document_id},
            {
                "$set": {
                    "status": "accepted",
                    "is_verified": True,
                    "refusal_reason": None,
                    "approved_at": datetime.utcnow(),
                    "approved_by": current_user["id"]
                }
            }
        )
        
        # Check if all documents are now approved and update enrollment status if needed
        documents_complete = await check_user_documents_complete_enhanced(student_id, "student")
        if documents_complete:
            await db.enrollments.update_many(
                {
                    "student_id": student_id,
                    "enrollment_status": EnrollmentStatus.PENDING_APPROVAL
                },
                {"$set": {"enrollment_status": EnrollmentStatus.APPROVED, "approved_at": datetime.utcnow()}}
            )
            
            # Send notification to student
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": student_id,
                "type": NotificationType.ENROLLMENT_APPROVED,
                "title": "Enrollment Approved!",
                "message": f"All your documents have been approved. Your enrollment at {school['name']} is now active!",
                "is_read": False,
                "metadata": {"enrollment_id": enrollment["id"], "school_name": school["name"]},
                "created_at": datetime.utcnow()
            }
            await db.notifications.insert_one(notification_doc)
        
        return {"message": "Document approved successfully"}
    
    except Exception as e:
        logger.error(f"Approve document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to approve document")

@api_router.post("/manager/documents/{document_id}/reject")
async def reject_document(
    document_id: str,
    reason: str = Form(...),
    current_user = Depends(get_current_user)
):
    """Reject a student document with reason"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can reject documents")
        
        # Get document
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get student and their enrollment to verify manager authority
        student_id = document["user_id"]
        enrollment = await db.enrollments.find_one({"student_id": student_id})
        if not enrollment:
            raise HTTPException(status_code=404, detail="Student enrollment not found")
        
        # Verify manager owns the school
        school = await db.driving_schools.find_one({
            "id": enrollment["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to reject this document")
        
        # Reject document
        await db.documents.update_one(
            {"id": document_id},
            {
                "$set": {
                    "status": "refused",
                    "is_verified": False,
                    "refusal_reason": reason,
                    "rejected_at": datetime.utcnow(),
                    "rejected_by": current_user["id"]
                }
            }
        )
        
        # Update enrollment status back to pending_documents if it was pending_approval
        await db.enrollments.update_many(
            {
                "student_id": student_id,
                "enrollment_status": EnrollmentStatus.PENDING_APPROVAL
            },
            {"$set": {"enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS}}
        )
        
        # Send notification to student
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": student_id,
            "type": "document_rejected",
            "title": "Document Rejected",
            "message": f"Your {document['document_type'].replace('_', ' ')} has been rejected. Reason: {reason}. Please upload a new version.",
            "is_read": False,
            "metadata": {"document_type": document["document_type"], "reason": reason},
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
        
        return {"message": "Document rejected successfully"}
    
    except Exception as e:
        logger.error(f"Reject document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to reject document")

# DRIVING SCHOOL MANAGEMENT ENDPOINTS

@api_router.post("/driving-schools")
async def create_driving_school(
    school_data: DrivingSchoolCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "guest":
            raise HTTPException(status_code=403, detail="Only guests can create driving schools")
        
        # Update user role to manager
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"role": "manager"}}
        )
        
        # Create driving school
        school_id = str(uuid.uuid4())
        school_doc = {
            "id": school_id,
            "name": school_data.name,
            "address": school_data.address,
            "state": school_data.state,
            "phone": school_data.phone,
            "email": school_data.email,
            "description": school_data.description,
            "logo_url": None,
            "photos": [],
            "price": school_data.price,
            "rating": 0.0,
            "total_reviews": 0,
            "manager_id": current_user["id"],
            "latitude": school_data.latitude,
            "longitude": school_data.longitude,
            "created_at": datetime.utcnow()
        }
        
        await db.driving_schools.insert_one(school_doc)
        
        return {"id": school_id, "message": "Driving school created successfully"}
    
    except Exception as e:
        logger.error(f"Create driving school error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to create driving school")

@api_router.get("/driving-schools/{school_id}")
async def get_driving_school(school_id: str):
    try:
        school = await db.driving_schools.find_one({"id": school_id})
        if not school:
            raise HTTPException(status_code=404, detail="Driving school not found")
        
        return serialize_doc(school)
    
    except Exception as e:
        logger.error(f"Get driving school error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve driving school")

@api_router.put("/driving-schools/{school_id}")
async def update_driving_school(
    school_id: str,
    school_data: DrivingSchoolCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can update driving schools")
        
        # Verify ownership
        school = await db.driving_schools.find_one({
            "id": school_id,
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=404, detail="Driving school not found or unauthorized")
        
        # Update school
        update_data = {
            "name": school_data.name,
            "address": school_data.address,
            "state": school_data.state,
            "phone": school_data.phone,
            "email": school_data.email,
            "description": school_data.description,
            "price": school_data.price,
            "latitude": school_data.latitude,
            "longitude": school_data.longitude
        }
        
        await db.driving_schools.update_one(
            {"id": school_id},
            {"$set": update_data}
        )
        
        return {"message": "Driving school updated successfully"}
    
    except Exception as e:
        logger.error(f"Update driving school error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to update driving school")

@api_router.post("/driving-schools/{school_id}/upload-photo")
async def upload_school_photo(
    school_id: str,
    photo_type: str = Form(...),  # 'logo' or 'photo'
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can upload school photos")
        
        # Verify ownership
        school = await db.driving_schools.find_one({
            "id": school_id,
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=404, detail="Driving school not found or unauthorized")
        
        # Upload file with fallback
        folder_name = f"driving_schools/{school_id}/{photo_type}"
        upload_result = await upload_file_with_fallback(file, folder_name, "image")
        
        # Update school record
        if photo_type == "logo":
            await db.driving_schools.update_one(
                {"id": school_id},
                {"$set": {"logo_url": upload_result["file_url"]}}
            )
        else:
            await db.driving_schools.update_one(
                {"id": school_id},
                {"$push": {"photos": upload_result["file_url"]}}
            )
        
        return {
            "message": f"School {photo_type} uploaded successfully",
            "file_url": upload_result["file_url"]
        }
    
    except Exception as e:
        logger.error(f"Upload school photo error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to upload photo")

# TEACHER MANAGEMENT ENDPOINTS

@api_router.post("/teachers/add")
async def add_teacher(
    teacher_data: TeacherCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can add teachers")
        
        # Get manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="Manager has no driving school")
        
        # Find teacher user by email or create new user
        teacher_user = await db.users.find_one({"email": teacher_data.email})
        
        if not teacher_user:
            # Create new user if not exists
            if not all([teacher_data.first_name, teacher_data.last_name, teacher_data.password]):
                raise HTTPException(status_code=400, detail="First name, last name, and password are required for new teachers")
            
            # Use the provided password instead of generating temporary one
            password_hash = pwd_context.hash(teacher_data.password)
            
            # Parse date_of_birth if provided
            birth_date = None
            if teacher_data.date_of_birth:
                try:
                    birth_date = datetime.fromisoformat(teacher_data.date_of_birth)
                except ValueError:
                    birth_date = datetime.strptime(teacher_data.date_of_birth, '%Y-%m-%d')
            
            teacher_user_data = {
                "id": str(uuid.uuid4()),
                "email": teacher_data.email,
                "password_hash": password_hash,
                "first_name": teacher_data.first_name,
                "last_name": teacher_data.last_name,
                "phone": teacher_data.phone or "",
                "address": teacher_data.address or "",
                "date_of_birth": birth_date or datetime.utcnow() - timedelta(days=25*365),  # Default to 25 years ago
                "gender": teacher_data.gender or "male",
                "role": "teacher",
                "state": current_user.get("state", "Alger"),  # Use manager's state as default
                "profile_photo_url": None,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            await db.users.insert_one(teacher_user_data)
            teacher_user = teacher_user_data
            logger.info(f"Created new teacher user: {teacher_user['email']} with provided password")
        else:
            if teacher_user["role"] not in ["guest", "teacher"]:
                raise HTTPException(status_code=400, detail="User cannot be assigned as teacher")
        
        # Check if teacher already exists for this school
        existing_teacher = await db.teachers.find_one({
            "user_id": teacher_user["id"],
            "driving_school_id": school["id"]
        })
        if existing_teacher:
            raise HTTPException(status_code=400, detail="Teacher already exists for this school")
        
        # Create teacher record
        teacher_id = str(uuid.uuid4())
        teacher_doc = {
            "id": teacher_id,
            "user_id": teacher_user["id"],
            "driving_school_id": school["id"],
            "driving_license_url": "",
            "teaching_license_url": "",
            "photo_url": teacher_user.get("profile_photo_url", ""),
            "can_teach_male": teacher_data.can_teach_male,
            "can_teach_female": teacher_data.can_teach_female,
            "rating": 0.0,
            "total_reviews": 0,
            "is_approved": False,
            "created_at": datetime.utcnow()
        }
        
        await db.teachers.insert_one(teacher_doc)
        
        # Update user role to teacher (if not already)
        if teacher_user["role"] != "teacher":
            await db.users.update_one(
                {"id": teacher_user["id"]},
                {"$set": {"role": "teacher"}}
            )
        
        # Return teacher details for frontend
        teacher_response = {
            "id": teacher_id,
            "user_id": teacher_user["id"],
            "user_name": f"{teacher_user['first_name']} {teacher_user['last_name']}",
            "user_email": teacher_user["email"],
            "can_teach_male": teacher_data.can_teach_male,
            "can_teach_female": teacher_data.can_teach_female,
            "rating": 0.0,
            "total_reviews": 0,
            "is_approved": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "teacher": serialize_doc(teacher_response),
            "message": "Teacher added successfully"
        }
    
    except Exception as e:
        logger.error(f"Add teacher error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to add teacher")

@api_router.get("/teachers/my")
async def get_my_teachers(current_user = Depends(get_current_user)):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view teachers")
        
        # Get manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="Manager has no driving school")
        
        # Get teachers
        teachers_cursor = db.teachers.find({"driving_school_id": school["id"]})
        teachers = await teachers_cursor.to_list(length=None)
        
        # Get user details for each teacher
        for teacher in teachers:
            user = await db.users.find_one({"id": teacher["user_id"]})
            if user:
                teacher["user_details"] = {
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "email": user["email"],
                    "phone": user["phone"]
                }
        
        return {"teachers": serialize_doc(teachers), "total": len(teachers)}
    
    except Exception as e:
        logger.error(f"Get teachers error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve teachers")

@api_router.post("/teachers/{teacher_id}/approve")
async def approve_teacher(
    teacher_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can approve teachers")
        
        # Get teacher
        teacher = await db.teachers.find_one({"id": teacher_id})
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        
        # Verify ownership
        school = await db.driving_schools.find_one({
            "id": teacher["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to approve this teacher")
        
        # Approve teacher
        await db.teachers.update_one(
            {"id": teacher_id},
            {"$set": {"is_approved": True}}
        )
        
        return {"message": "Teacher approved successfully"}
    
    except Exception as e:
        logger.error(f"Approve teacher error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to approve teacher")

# QUIZ SYSTEM ENDPOINTS

@api_router.post("/quizzes")
async def create_quiz(
    quiz_data: QuizCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can create quizzes")
        
        # Create quiz
        quiz_id = str(uuid.uuid4())
        quiz_doc = {
            "id": quiz_id,
            "course_type": quiz_data.course_type,
            "title": quiz_data.title,
            "description": quiz_data.description,
            "difficulty": quiz_data.difficulty,
            "questions": quiz_data.questions,
            "passing_score": quiz_data.passing_score,
            "time_limit_minutes": quiz_data.time_limit_minutes,
            "is_active": True,
            "created_by": current_user["id"],
            "created_at": datetime.utcnow()
        }
        
        await db.quizzes.insert_one(quiz_doc)
        
        return {"quiz_id": quiz_id, "message": "Quiz created successfully"}
    
    except Exception as e:
        logger.error(f"Create quiz error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to create quiz")

@api_router.get("/quizzes")
async def get_quizzes(
    course_type: str = None,
    difficulty: str = None,
    current_user = Depends(get_current_user)
):
    try:
        query = {"is_active": True}
        
        if course_type:
            query["course_type"] = course_type
        if difficulty:
            query["difficulty"] = difficulty
        
        quizzes_cursor = db.quizzes.find(query)
        quizzes = await quizzes_cursor.to_list(length=None)
        
        return serialize_doc(quizzes)
    
    except Exception as e:
        logger.error(f"Get quizzes error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve quizzes")

@api_router.post("/quizzes/{quiz_id}/attempt")
async def take_quiz(
    quiz_id: str,
    answers: dict,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can take quizzes")
        
        # Get quiz
        quiz = await db.quizzes.find_one({"id": quiz_id, "is_active": True})
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        # Calculate score
        total_questions = len(quiz["questions"])
        correct_answers = 0
        
        for i, question in enumerate(quiz["questions"]):
            student_answer = answers.get(str(i))
            correct_answer = question["correct_answer"]
            if student_answer == correct_answer:
                correct_answers += 1
        
        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        passed = score >= quiz["passing_score"]
        
        # Save attempt
        attempt_id = str(uuid.uuid4())
        attempt_doc = {
            "id": attempt_id,
            "quiz_id": quiz_id,
            "student_id": current_user["id"],
            "answers": answers,
            "score": score,
            "passed": passed,
            "started_at": datetime.utcnow(),
            "completed_at": datetime.utcnow(),
            "time_taken_minutes": 0  # Would be calculated in real implementation
        }
        
        await db.quiz_attempts.insert_one(attempt_doc)
        
        return {
            "attempt_id": attempt_id,
            "score": score,
            "passed": passed,
            "correct_answers": correct_answers,
            "total_questions": total_questions
        }
    
    except Exception as e:
        logger.error(f"Take quiz error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to take quiz")

# Daily.co API integration
async def create_daily_room(room_name: str, duration_hours: int = 24) -> dict:
    """Create a room using Daily.co API"""
    if not DAILY_API_KEY:
        # Fallback to simple URL if no API key
        return {
            "name": room_name,
            "url": f"https://daily.co/{room_name}",
            "id": room_name
        }
    
    try:
        headers = {
            "Authorization": f"Bearer {DAILY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Calculate expiry time
        expiry_time = int((datetime.utcnow() + timedelta(hours=duration_hours)).timestamp())
        
        room_config = {
            "name": room_name,
            "properties": {
                "exp": expiry_time,
                "eject_at_room_exp": True,
                "enable_chat": True,
                "start_audio_off": True,
                "start_video_off": True,
                "enable_screenshare": True,
                "max_participants": 10
            }
        }
        
        response = requests.post(
            f"{DAILY_API_URL}/rooms",
            headers=headers,
            json=room_config
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Daily.co API error: {response.status_code} - {response.text}")
            # Fallback to simple URL
            return {
                "name": room_name,
                "url": f"https://daily.co/{room_name}",
                "id": room_name
            }
            
    except Exception as e:
        logger.error(f"Error creating Daily.co room: {str(e)}")
        # Fallback to simple URL
        return {
            "name": room_name,
            "url": f"https://daily.co/{room_name}",
            "id": room_name
        }

async def delete_daily_room(room_name: str) -> bool:
    """Delete a room using Daily.co API"""
    if not DAILY_API_KEY:
        return True  # No cleanup needed for simple URLs
    
    try:
        headers = {
            "Authorization": f"Bearer {DAILY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.delete(
            f"{DAILY_API_URL}/rooms/{room_name}",
            headers=headers
        )
        
        return response.status_code in [200, 204, 404]  # 404 means already deleted
        
    except Exception as e:
        logger.error(f"Error deleting Daily.co room: {str(e)}")
        return False

# VIDEO ROOM ENDPOINTS

@api_router.post("/video-rooms")
async def create_video_room(
    room_data: VideoRoomCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create video rooms")
        
        # Verify course exists and teacher access
        course = await db.courses.find_one({"id": room_data.course_id})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get student information
        student = await db.users.find_one({"id": room_data.student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Create unique room name
        room_id = str(uuid.uuid4())
        room_name = f"driving-school-{course['id'][:8]}-{int(datetime.utcnow().timestamp())}"
        
        # Create room via Daily.co API
        daily_room = await create_daily_room(room_name, duration_hours=room_data.duration_minutes // 60 + 1)
        
        room_doc = {
            "id": room_id,
            "course_id": room_data.course_id,
            "teacher_id": current_user["id"],
            "student_id": room_data.student_id,
            "room_url": daily_room["url"],
            "room_name": daily_room["name"],
            "scheduled_at": datetime.fromisoformat(room_data.scheduled_at),
            "duration_minutes": room_data.duration_minutes,
            "is_active": True,
            "daily_room_id": daily_room["id"],
            "student_name": f"{student['first_name']} {student['last_name']}",
            "teacher_name": f"{current_user['first_name']} {current_user['last_name']}",
            "created_at": datetime.utcnow()
        }
        
        await db.video_rooms.insert_one(room_doc)
        
        return {
            "id": room_id,
            "room_url": daily_room["url"],
            "room_name": daily_room["name"],
            "scheduled_at": room_doc["scheduled_at"],
            "duration_minutes": room_data.duration_minutes,
            "student_name": room_doc["student_name"],
            "is_active": True,
            "message": "Video room created successfully"
        }
    
    except Exception as e:
        logger.error(f"Create video room error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to create video room")

@api_router.get("/video-rooms/my")
async def get_my_video_rooms(current_user = Depends(get_current_user)):
    try:
        query = {}
        if current_user["role"] == "teacher":
            query["teacher_id"] = current_user["id"]
        elif current_user["role"] == "student":
            query["student_id"] = current_user["id"]
        else:
            raise HTTPException(status_code=403, detail="Only teachers and students can view video rooms")
        
        rooms_cursor = db.video_rooms.find(query)
        rooms = await rooms_cursor.to_list(length=None)
        
        return serialize_doc(rooms)
    
    except Exception as e:
        logger.error(f"Get video rooms error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve video rooms")

# EXTERNAL EXPERT ENDPOINTS

@api_router.post("/external-experts/register")
async def register_external_expert(
    expert_data: ExternalExpertCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "guest":
            raise HTTPException(status_code=403, detail="Only guests can register as external experts")
        
        # Create external expert record
        expert_id = str(uuid.uuid4())
        expert_doc = {
            "id": expert_id,
            "user_id": current_user["id"],
            "specialization": expert_data.specialization,
            "available_states": expert_data.available_states,
            "certification_number": expert_data.certification_number,
            "years_of_experience": expert_data.years_of_experience,
            "rating": 0.0,
            "total_exams_conducted": 0,
            "is_available": True,
            "created_at": datetime.utcnow()
        }
        
        await db.external_experts.insert_one(expert_doc)
        
        # Update user role
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"role": "external_expert"}}
        )
        
        return {"expert_id": expert_id, "message": "External expert registered successfully"}
    
    except Exception as e:
        logger.error(f"Register external expert error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to register external expert")

@api_router.get("/external-experts")
async def get_external_experts(
    specialization: str = None,
    state: str = None
):
    try:
        query = {"is_available": True}
        
        if specialization:
            query["specialization"] = {"$in": [specialization]}
        if state:
            query["available_states"] = {"$in": [state]}
        
        experts_cursor = db.external_experts.find(query)
        experts = await experts_cursor.to_list(length=None)
        
        return serialize_doc(experts)
    
    except Exception as e:
        logger.error(f"Get external experts error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve external experts")

# SESSION MANAGEMENT ENDPOINTS

@api_router.post("/sessions/schedule")
async def schedule_session(
    session_data: SessionCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can schedule sessions")
        
        # Verify course exists and student access
        course = await db.courses.find_one({"id": session_data.course_id})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Verify teacher exists
        teacher = await db.teachers.find_one({"id": session_data.teacher_id, "is_approved": True})
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found or not approved")
        
        # Create session
        session_id = str(uuid.uuid4())
        session_doc = {
            "id": session_id,
            "course_id": session_data.course_id,
            "teacher_id": session_data.teacher_id,
            "student_id": current_user["id"],
            "session_type": course["course_type"],
            "scheduled_at": datetime.fromisoformat(session_data.scheduled_at),
            "duration_minutes": session_data.duration_minutes,
            "location": session_data.location,
            "status": SessionStatus.SCHEDULED,
            "notes": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.sessions.insert_one(session_doc)
        
        return {"session_id": session_id, "message": "Session scheduled successfully"}
    
    except Exception as e:
        logger.error(f"Schedule session error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to schedule session")

@api_router.get("/sessions/my")
async def get_my_sessions(current_user = Depends(get_current_user)):
    try:
        query = {}
        if current_user["role"] == "student":
            query["student_id"] = current_user["id"]
        elif current_user["role"] == "teacher":
            query["teacher_id"] = current_user["id"]
        else:
            raise HTTPException(status_code=403, detail="Only students and teachers can view sessions")
        
        sessions_cursor = db.sessions.find(query)
        sessions = await sessions_cursor.to_list(length=None)
        
        return serialize_doc(sessions)
    
    except Exception as e:
        logger.error(f"Get sessions error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")

@api_router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    notes: str = Form(""),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] not in ["teacher", "manager"]:
            raise HTTPException(status_code=403, detail="Only teachers and managers can complete sessions")
        
        # Get session
        session = await db.sessions.find_one({"id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session
        await db.sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "status": SessionStatus.COMPLETED,
                    "notes": notes,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update course progress
        course = await db.courses.find_one({"id": session["course_id"]})
        if course:
            new_completed = course["completed_sessions"] + 1
            await db.courses.update_one(
                {"id": session["course_id"]},
                {
                    "$set": {
                        "completed_sessions": new_completed,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Check if course is completed
            if new_completed >= course["total_sessions"]:
                await db.courses.update_one(
                    {"id": session["course_id"]},
                    {
                        "$set": {
                            "status": CourseStatus.COMPLETED,
                            "exam_status": ExamStatus.AVAILABLE,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
        
        return {"message": "Session completed successfully"}
    
    except Exception as e:
        logger.error(f"Complete session error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to complete session")

# EXAM MANAGEMENT ENDPOINTS

@api_router.post("/exams/schedule")
async def schedule_exam(
    exam_data: ExamScheduleCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can schedule exams")
        
        # Verify course exists and is ready for exam
        course = await db.courses.find_one({"id": exam_data.course_id})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if course["exam_status"] != ExamStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail="Course is not ready for exam")
        
        # Find available external expert
        experts_cursor = db.external_experts.find({
            "specialization": {"$in": [exam_data.exam_type]},
            "is_available": True
        })
        experts = await experts_cursor.to_list(length=None)
        
        if not experts:
            raise HTTPException(status_code=404, detail="No available external experts for this exam type")
        
        # Select first available expert (in real app, would have better logic)
        expert = experts[0]
        
        # Create exam
        exam_id = str(uuid.uuid4())
        exam_doc = {
            "id": exam_id,
            "course_id": exam_data.course_id,
            "student_id": current_user["id"],
            "external_expert_id": expert["id"],
            "exam_type": exam_data.exam_type,
            "scheduled_at": datetime.fromisoformat(exam_data.preferred_dates[0]),  # Use first preferred date
            "location": exam_data.location,
            "duration_minutes": 90,
            "status": ExamStatus.AVAILABLE,
            "score": None,
            "notes": None,
            "created_at": datetime.utcnow()
        }
        
        await db.exam_schedules.insert_one(exam_doc)
        
        return {"exam_id": exam_id, "message": "Exam scheduled successfully"}
    
    except Exception as e:
        logger.error(f"Schedule exam error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to schedule exam")

@api_router.get("/exams/my")
async def get_my_exams(current_user = Depends(get_current_user)):
    try:
        query = {}
        if current_user["role"] == "student":
            query["student_id"] = current_user["id"]
        elif current_user["role"] == "external_expert":
            expert = await db.external_experts.find_one({"user_id": current_user["id"]})
            if expert:
                query["external_expert_id"] = expert["id"]
        else:
            raise HTTPException(status_code=403, detail="Only students and external experts can view exams")
        
        exams_cursor = db.exam_schedules.find(query)
        exams = await exams_cursor.to_list(length=None)
        
        return serialize_doc(exams)
    
    except Exception as e:
        logger.error(f"Get exams error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve exams")

@api_router.post("/exams/{exam_id}/confirm")
async def confirm_exam(
    exam_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "external_expert":
            raise HTTPException(status_code=403, detail="Only external experts can confirm exams")
        
        # Get exam
        exam = await db.exam_schedules.find_one({"id": exam_id})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Verify expert ownership
        expert = await db.external_experts.find_one({"user_id": current_user["id"]})
        if not expert or exam["external_expert_id"] != expert["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized to confirm this exam")
        
        # Confirm exam (no status change needed, just acknowledgment)
        return {"message": "Exam confirmed successfully"}
    
    except Exception as e:
        logger.error(f"Confirm exam error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to confirm exam")

@api_router.post("/exams/{exam_id}/complete")
async def complete_exam(
    exam_id: str,
    score: float = Form(...),
    notes: str = Form(""),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "external_expert":
            raise HTTPException(status_code=403, detail="Only external experts can complete exams")
        
        # Get exam
        exam = await db.exam_schedules.find_one({"id": exam_id})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Verify expert ownership
        expert = await db.external_experts.find_one({"user_id": current_user["id"]})
        if not expert or exam["external_expert_id"] != expert["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized to complete this exam")
        
        # Determine pass/fail
        passing_score = 70.0
        passed = score >= passing_score
        
        # Update exam
        await db.exam_schedules.update_one(
            {"id": exam_id},
            {
                "$set": {
                    "status": ExamStatus.PASSED if passed else ExamStatus.FAILED,
                    "score": score,
                    "notes": notes
                }
            }
        )
        
        # Update course exam status
        await db.courses.update_one(
            {"id": exam["course_id"]},
            {
                "$set": {
                    "exam_status": ExamStatus.PASSED if passed else ExamStatus.FAILED,
                    "exam_score": score,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update course availability for next course
        course = await db.courses.find_one({"id": exam["course_id"]})
        if course and passed:
            await update_course_availability(course["enrollment_id"])
        
        return {"message": "Exam completed successfully", "passed": passed}
    
    except Exception as e:
        logger.error(f"Complete exam error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to complete exam")

# CERTIFICATE ENDPOINTS

@api_router.get("/certificates/my")
async def get_my_certificates(current_user = Depends(get_current_user)):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can view certificates")
        
        certificates_cursor = db.certificates.find({"student_id": current_user["id"]})
        certificates = await certificates_cursor.to_list(length=None)
        
        return serialize_doc(certificates)
    
    except Exception as e:
        logger.error(f"Get certificates error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve certificates")

@api_router.get("/certificates/{cert_id}/verify")
async def verify_certificate(cert_id: str):
    try:
        certificate = await db.certificates.find_one({"id": cert_id})
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Get student details
        student = await db.users.find_one({"id": certificate["student_id"]})
        
        verification_data = {
            "certificate_number": certificate["certificate_number"],
            "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
            "issue_date": certificate["issue_date"],
            "expiry_date": certificate.get("expiry_date"),
            "status": certificate["status"],
            "is_valid": certificate["status"] == "issued" and 
                       (not certificate.get("expiry_date") or 
                        datetime.utcnow() < certificate["expiry_date"])
        }
        
        return verification_data
    
    except Exception as e:
        logger.error(f"Verify certificate error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to verify certificate")

# NOTIFICATION ENDPOINTS

@api_router.get("/notifications/my")
async def get_my_notifications(current_user = Depends(get_current_user)):
    try:
        notifications_cursor = db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1)
        notifications = await notifications_cursor.to_list(length=None)
        
        return serialize_doc(notifications)
    
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve notifications")

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    try:
        # Verify notification ownership
        notification = await db.notifications.find_one({
            "id": notification_id,
            "user_id": current_user["id"]
        })
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Mark as read
        await db.notifications.update_one(
            {"id": notification_id},
            {"$set": {"is_read": True}}
        )
        
        return {"message": "Notification marked as read"}
    
    except Exception as e:
        logger.error(f"Mark notification read error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user = Depends(get_current_user)):
    try:
        await db.notifications.update_many(
            {"user_id": current_user["id"], "is_read": False},
            {"$set": {"is_read": True}}
        )
        
        return {"message": "All notifications marked as read"}
    
    except Exception as e:
        logger.error(f"Mark all notifications read error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")

# ANALYTICS ENDPOINTS

@api_router.get("/analytics/student-progress/{student_id}")
async def get_student_progress(
    student_id: str,
    current_user = Depends(get_current_user)
):
    try:
        # Verify access
        if current_user["role"] == "student" and current_user["id"] != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own progress")
        elif current_user["role"] not in ["student", "teacher", "manager"]:
            raise HTTPException(status_code=403, detail="Unauthorized to view student progress")
        
        # Calculate metrics
        metrics = await calculate_student_metrics(student_id)
        
        # Generate chart if needed
        if metrics["total_enrollments"] > 0:
            chart_data = await generate_student_analytics_chart({
                "student_name": "Student Progress",
                "theory_progress": metrics["course_progress"].get("theory", 0),
                "park_progress": metrics["course_progress"].get("park", 0),
                "road_progress": metrics["course_progress"].get("road", 0),
                "quiz_scores": metrics["quiz_scores"],
                "session_attendance": metrics["session_attendance"],
                "learning_time": metrics["learning_time"]
            })
            metrics["chart_data"] = chart_data
        
        return metrics
    
    except Exception as e:
        logger.error(f"Get student progress error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve student progress")

@api_router.get("/analytics/school-overview")
async def get_school_overview(current_user = Depends(get_current_user)):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view school analytics")
        
        # Get manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="Manager has no driving school")
        
        # Calculate school metrics
        enrollments_cursor = db.enrollments.find({"driving_school_id": school["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        teachers_cursor = db.teachers.find({"driving_school_id": school["id"]})
        teachers = await teachers_cursor.to_list(length=None)
        
        reviews_cursor = db.reviews.find({"driving_school_id": school["id"]})
        reviews = await reviews_cursor.to_list(length=None)
        
        metrics = {
            "school_name": school["name"],
            "total_enrollments": len(enrollments),
            "active_enrollments": len([e for e in enrollments if e["enrollment_status"] == "approved"]),
            "pending_enrollments": len([e for e in enrollments if e["enrollment_status"] == "pending_approval"]),
            "total_teachers": len(teachers),
            "approved_teachers": len([t for t in teachers if t["is_approved"]]),
            "total_reviews": len(reviews),
            "average_rating": sum([r["rating"] for r in reviews]) / len(reviews) if reviews else 0,
            "revenue_estimate": len([e for e in enrollments if e["enrollment_status"] == "approved"]) * school["price"]
        }
        
        return metrics
    
    except Exception as e:
        logger.error(f"Get school overview error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve school analytics")

@api_router.get("/analytics/teacher-performance/{teacher_id}")
async def get_teacher_performance(
    teacher_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view teacher performance")
        
        # Get teacher
        teacher = await db.teachers.find_one({"id": teacher_id})
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        
        # Verify manager owns this teacher's school
        school = await db.driving_schools.find_one({
            "id": teacher["driving_school_id"],
            "manager_id": current_user["id"]
        })
        if not school:
            raise HTTPException(status_code=403, detail="Unauthorized to view this teacher's performance")
        
        # Calculate teacher metrics
        sessions_cursor = db.sessions.find({"teacher_id": teacher_id})
        sessions = await sessions_cursor.to_list(length=None)
        
        completed_sessions = [s for s in sessions if s["status"] == "completed"]
        
        reviews_cursor = db.reviews.find({"teacher_id": teacher_id})
        reviews = await reviews_cursor.to_list(length=None)
        
        metrics = {
            "teacher_id": teacher_id,
            "total_sessions": len(sessions),
            "completed_sessions": len(completed_sessions),
            "completion_rate": (len(completed_sessions) / len(sessions) * 100) if sessions else 0,
            "total_reviews": len(reviews),
            "average_rating": sum([r["rating"] for r in reviews]) / len(reviews) if reviews else 0,
            "recent_sessions": serialize_doc(sessions[-10:])  # Last 10 sessions
        }
        
        return metrics
    
    except Exception as e:
        logger.error(f"Get teacher performance error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve teacher performance")

# REVIEW ENDPOINTS

@api_router.post("/reviews")
async def create_review(
    review_data: ReviewCreate,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can create reviews")
        
        # Verify enrollment exists and is completed
        enrollment = await db.enrollments.find_one({
            "id": review_data.enrollment_id,
            "student_id": current_user["id"],
            "enrollment_status": "approved"
        })
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found or not completed")
        
        # Check if review already exists
        existing_review = await db.reviews.find_one({
            "student_id": current_user["id"],
            "enrollment_id": review_data.enrollment_id
        })
        if existing_review:
            raise HTTPException(status_code=400, detail="Review already exists for this enrollment")
        
        # Create review
        review_id = str(uuid.uuid4())
        review_doc = {
            "id": review_id,
            "student_id": current_user["id"],
            "enrollment_id": review_data.enrollment_id,
            "driving_school_id": enrollment["driving_school_id"],
            "teacher_id": None,  # Could be assigned to specific teacher
            "rating": review_data.rating,
            "comment": review_data.comment,
            "created_at": datetime.utcnow()
        }
        
        await db.reviews.insert_one(review_doc)
        
        # Update school rating
        school_reviews_cursor = db.reviews.find({"driving_school_id": enrollment["driving_school_id"]})
        school_reviews = await school_reviews_cursor.to_list(length=None)
        
        if school_reviews:
            avg_rating = sum([r["rating"] for r in school_reviews]) / len(school_reviews)
            await db.driving_schools.update_one(
                {"id": enrollment["driving_school_id"]},
                {
                    "$set": {
                        "rating": avg_rating,
                        "total_reviews": len(school_reviews)
                    }
                }
            )
        
        return {"review_id": review_id, "message": "Review created successfully"}
    
    except Exception as e:
        logger.error(f"Create review error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to create review")

@api_router.get("/reviews/school/{school_id}")
async def get_school_reviews(school_id: str):
    try:
        # Get reviews for the school
        reviews_cursor = db.reviews.find({"driving_school_id": school_id}).sort("created_at", -1)
        reviews = await reviews_cursor.to_list(length=None)
        
        # Get student names for reviews
        for review in reviews:
            student = await db.users.find_one({"id": review["student_id"]})
            if student:
                review["student_name"] = f"{student['first_name']} {student['last_name']}"
            else:
                review["student_name"] = "Anonymous"
        
        return serialize_doc(reviews)
    
    except Exception as e:
        logger.error(f"Get school reviews error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve school reviews")

# COURSE MANAGEMENT ENDPOINTS

@api_router.post("/courses/{course_id}/complete-session")
async def complete_course_session(
    course_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] not in ["student", "teacher", "manager"]:
            raise HTTPException(status_code=403, detail="Unauthorized to complete sessions")
        
        # Get course
        course = await db.courses.find_one({"id": course_id})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Increment completed sessions
        new_completed = course["completed_sessions"] + 1
        
        # Update course
        update_data = {
            "completed_sessions": new_completed,
            "updated_at": datetime.utcnow()
        }
        
        # Check if course is completed
        if new_completed >= course["total_sessions"]:
            update_data["status"] = CourseStatus.COMPLETED
            update_data["exam_status"] = ExamStatus.AVAILABLE
        
        await db.courses.update_one({"id": course_id}, {"$set": update_data})
        
        # Update course availability
        await update_course_availability(course["enrollment_id"])
        
        return {"message": "Session completed successfully"}
    
    except Exception as e:
        logger.error(f"Complete course session error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to complete session")

@api_router.post("/courses/{course_id}/take-exam")
async def take_course_exam(
    course_id: str,
    score: float = Form(...),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can take exams")
        
        # Get course
        course = await db.courses.find_one({"id": course_id})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if course["exam_status"] != ExamStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail="Exam is not available for this course")
        
        # Determine pass/fail
        passing_score = 70.0
        passed = score >= passing_score
        
        # Update course
        await db.courses.update_one(
            {"id": course_id},
            {
                "$set": {
                    "exam_status": ExamStatus.PASSED if passed else ExamStatus.FAILED,
                    "exam_score": score,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update course availability for next course
        if passed:
            await update_course_availability(course["enrollment_id"])
        
        return {"message": "Exam completed successfully", "passed": passed, "score": score}
    
    except Exception as e:
        logger.error(f"Take course exam error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to take exam")

# DASHBOARD ENDPOINTS

@api_router.get("/dashboard/role/{role}")
async def get_dashboard(
    role: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != role:
            raise HTTPException(status_code=403, detail="Role mismatch")
        
        dashboard_data = {}
        
        if role == "student":
            # Get student's enrollments with courses
            enrollments_cursor = db.enrollments.find({"student_id": current_user["id"]})
            enrollments = await enrollments_cursor.to_list(length=None)
            
            for enrollment in enrollments:
                # Get school details
                school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
                enrollment["school_name"] = school["name"] if school else "Unknown School"
                
                # Get courses
                courses_cursor = db.courses.find({"enrollment_id": enrollment["id"]})
                courses = await courses_cursor.to_list(length=None)
                enrollment["courses"] = serialize_doc(courses)
            
            dashboard_data["enrollments"] = serialize_doc(enrollments)
            
        elif role == "teacher":
            # Get teacher's school and students
            teacher = await db.teachers.find_one({"user_id": current_user["id"]})
            if teacher:
                school = await db.driving_schools.find_one({"id": teacher["driving_school_id"]})
                dashboard_data["school"] = serialize_doc(school)
                
                # Get assigned sessions
                sessions_cursor = db.sessions.find({"teacher_id": teacher["id"]})
                sessions = await sessions_cursor.to_list(length=None)
                dashboard_data["sessions"] = serialize_doc(sessions)
            
        elif role == "manager":
            # Get manager's school
            school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
            if school:
                dashboard_data["school"] = serialize_doc(school)
                
                # Get enrollments
                enrollments_cursor = db.enrollments.find({"driving_school_id": school["id"]})
                enrollments = await enrollments_cursor.to_list(length=None)
                dashboard_data["enrollments"] = serialize_doc(enrollments)
                
                # Get teachers
                teachers_cursor = db.teachers.find({"driving_school_id": school["id"]})
                teachers = await teachers_cursor.to_list(length=None)
                dashboard_data["teachers"] = serialize_doc(teachers)
        
        elif role == "external_expert":
            # Get expert's exams
            expert = await db.external_experts.find_one({"user_id": current_user["id"]})
            if expert:
                exams_cursor = db.exam_schedules.find({"external_expert_id": expert["id"]})
                exams = await exams_cursor.to_list(length=None)
                dashboard_data["exams"] = serialize_doc(exams)
        
        return dashboard_data
    
    except Exception as e:
        logger.error(f"Get dashboard error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")

# PAYMENT ENDPOINTS

@api_router.post("/payments/complete")
async def complete_payment(
    enrollment_id: str = Form(...),
    current_user = Depends(get_current_user)
):
    try:
        # Get enrollment
        enrollment = await db.enrollments.find_one({
            "id": enrollment_id,
            "student_id": current_user["id"]
        })
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        # Simulate payment completion
        await db.enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {"enrollment_status": EnrollmentStatus.PENDING_APPROVAL}}
        )
        
        # Create notification for manager
        school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
        if school:
            notification_doc = {
                "id": str(uuid.uuid4()),
                "user_id": school["manager_id"],
                "type": "payment_completed",
                "title": "Payment Completed",
                "message": f"Student has completed payment for enrollment at {school['name']}",
                "is_read": False,
                "metadata": {"enrollment_id": enrollment_id},
                "created_at": datetime.utcnow()
            }
            await db.notifications.insert_one(notification_doc)
        
        return {"message": "Payment completed successfully"}
    
    except Exception as e:
        logger.error(f"Complete payment error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to complete payment")

# MISSING ENDPOINTS THAT WERE IDENTIFIED IN TESTING

@api_router.get("/documents")
async def get_user_documents(current_user = Depends(get_current_user)):
    try:
        documents_cursor = db.documents.find({"user_id": current_user["id"]})
        documents = await documents_cursor.to_list(length=None)
        
        return serialize_doc(documents)
    
    except Exception as e:
        logger.error(f"Get documents error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@api_router.get("/enrollments/my")
async def get_my_enrollments_fixed(current_user = Depends(get_current_user)):
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can view enrollments")
        
        # Get student's enrollments
        enrollments_cursor = db.enrollments.find({"student_id": current_user["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        # Get school details for each enrollment
        for enrollment in enrollments:
            school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
            if school:
                enrollment["school_name"] = school["name"]
                enrollment["school_address"] = school["address"]
                enrollment["school_price"] = school["price"]
            
            # Get courses for this enrollment
            courses_cursor = db.courses.find({"enrollment_id": enrollment["id"]})
            courses = await courses_cursor.to_list(length=None)
            enrollment["courses"] = serialize_doc(courses)
        
        return serialize_doc(enrollments)
    
    except Exception as e:
        logger.error(f"Get enrollments error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve enrollments")

@api_router.post("/documents/verify/{document_id}")
async def verify_document(
    document_id: str,
    is_verified: bool = Form(...),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can verify documents")
        
        # Get document
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update verification status
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {"is_verified": is_verified}}
        )
        
        # If document was verified, check if all documents are now verified for this user
        if is_verified:
            # Get the user who owns this document
            document_owner = await db.users.find_one({"id": document["user_id"]})
            
            if document_owner and document_owner["role"] == "student":
                # Check if all required documents are now verified
                documents_complete = await check_user_documents_complete(
                    document["user_id"], 
                    "student"
                )
                
                if documents_complete:
                    # Update pending enrollments to pending_approval status
                    await db.enrollments.update_many(
                        {
                            "student_id": document["user_id"],
                            "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS
                        },
                        {"$set": {"enrollment_status": EnrollmentStatus.PENDING_APPROVAL}}
                    )
        
        return {"message": "Document verification updated successfully"}
    
    except Exception as e:
        logger.error(f"Verify document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to verify document")

@api_router.post("/documents/accept/{document_id}")
async def accept_document(
    document_id: str,
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can accept documents")
        
        # Get document
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Verify manager has permission to manage this document
        # Get student's enrollment to verify manager owns the school
        enrollment = await db.enrollments.find_one({"student_id": document["user_id"]})
        if enrollment:
            school = await db.driving_schools.find_one({
                "id": enrollment["driving_school_id"],
                "manager_id": current_user["id"]
            })
            if not school:
                raise HTTPException(status_code=403, detail="Unauthorized to accept this document")
        
        logger.info(f"Manager {current_user['id']} accepting document {document_id} for student {document['user_id']}")
        
        # Update document status to accepted
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "status": "accepted", 
                "refusal_reason": None, 
                "is_verified": True,
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": current_user["id"]
            }}
        )
        
        # Check if all required documents are now accepted for this user using enhanced function
        document_owner = await db.users.find_one({"id": document["user_id"]})
        
        if document_owner and document_owner["role"] == "student":
            logger.info(f"Checking document completeness for student {document['user_id']}")
            
            # Use the enhanced function with better logging
            documents_complete = await check_user_documents_complete_enhanced(
                document["user_id"], 
                "student"
            )
            
            logger.info(f"Documents complete for student {document['user_id']}: {documents_complete}")
            
            if documents_complete:
                # Update pending enrollments to pending_approval status
                logger.info(f"Updating enrollment status for student {document['user_id']}")
                
                update_result = await db.enrollments.update_many(
                    {
                        "student_id": document["user_id"],
                        "enrollment_status": EnrollmentStatus.PENDING_DOCUMENTS
                    },
                    {
                        "$set": {
                            "enrollment_status": EnrollmentStatus.PENDING_APPROVAL,
                            "documents_completed_at": datetime.utcnow(),
                            "status_updated_by": current_user["id"]
                        }
                    }
                )
                
                logger.info(f"Updated {update_result.modified_count} enrollments to pending_approval")
                
                # Send notification to student
                if update_result.modified_count > 0:
                    notification_doc = {
                        "id": str(uuid.uuid4()),
                        "user_id": document["user_id"],
                        "type": "documents_approved",
                        "title": "Documents Approved",
                        "message": "All your documents have been approved! Your enrollment is now pending final approval.",
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    }
                    await db.notifications.insert_one(notification_doc)
                    logger.info(f"Notification sent to student {document['user_id']}")
            else:
                logger.info(f"Documents not yet complete for student {document['user_id']}")
        
        # Also trigger consistency check for this student
        await ensure_enrollment_status_consistency(document["user_id"])
        
        return {
            "message": "Document accepted successfully",
            "document_id": document_id,
            "documents_complete": documents_complete if 'documents_complete' in locals() else False
        }
    
    except Exception as e:
        logger.error(f"Accept document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to accept document")
    
    except Exception as e:
        logger.error(f"Accept document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to accept document")

@api_router.post("/documents/refuse/{document_id}")
async def refuse_document(
    document_id: str,
    reason: str = Form(...),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can refuse documents")
        
        if not reason.strip():
            raise HTTPException(status_code=400, detail="Refusal reason is required")
        
        # Get document
        document = await db.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Verify manager has permission to manage this document
        # Get student's enrollment to verify manager owns the school
        enrollment = await db.enrollments.find_one({"student_id": document["user_id"]})
        if enrollment:
            school = await db.driving_schools.find_one({
                "id": enrollment["driving_school_id"],
                "manager_id": current_user["id"]
            })
            if not school:
                raise HTTPException(status_code=403, detail="Unauthorized to refuse this document")
        
        # Update document status to refused with reason
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {"status": "refused", "refusal_reason": reason, "is_verified": False}}
        )
        
        # Send notification to student about document refusal
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": document["user_id"],
            "type": "document_refused",
            "title": "Document Refused",
            "message": f"Your {document['document_type'].replace('_', ' ')} was refused. Reason: {reason}",
            "is_read": False,
            "metadata": {"document_id": document_id, "document_type": document['document_type'], "reason": reason},
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
        
        return {"message": "Document refused successfully"}
    
    except Exception as e:
        logger.error(f"Refuse document error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to refuse document")

@api_router.get("/managers/pending-documents")
async def get_pending_documents_for_manager(
    current_user = Depends(get_current_user)
):
    """Get all pending documents for students enrolled in this manager's school"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view pending documents")
        
        # Get manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="No school found for this manager")
        
        # Get all enrollments for this school
        enrollments_cursor = db.enrollments.find({"driving_school_id": school["id"]})
        enrollments = await enrollments_cursor.to_list(length=None)
        
        # Get student IDs
        student_ids = [enrollment["student_id"] for enrollment in enrollments]
        
        # Get all pending documents for these students
        pending_documents_cursor = db.documents.find({
            "user_id": {"$in": student_ids},
            "status": "pending"
        })
        pending_documents = await pending_documents_cursor.to_list(length=None)
        
        # Enrich with student information
        enriched_documents = []
        for doc in pending_documents:
            student = await db.users.find_one({"id": doc["user_id"]})
            if student:
                doc_with_student = {
                    **serialize_doc(doc),
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "student_email": student['email']
                }
                enriched_documents.append(doc_with_student)
        
        return {
            "documents": enriched_documents,
            "school_name": school["name"],
            "total_pending": len(enriched_documents)
        }
    
    except Exception as e:
        logger.error(f"Get pending documents error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to get pending documents")

@api_router.get("/managers/pending-enrollments")
async def get_pending_enrollments_for_manager(
    current_user = Depends(get_current_user)
):
    """Get all pending enrollments for this manager's school"""
    try:
        if current_user["role"] != "manager":
            raise HTTPException(status_code=403, detail="Only managers can view pending enrollments")
        
        # Get manager's school
        school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
        if not school:
            raise HTTPException(status_code=404, detail="No school found for this manager")
        
        # Get all pending enrollments for this school
        enrollments_cursor = db.enrollments.find({
            "driving_school_id": school["id"],
            "enrollment_status": {"$in": ["pending_documents", "pending_approval"]}
        })
        enrollments = await enrollments_cursor.to_list(length=None)
        
        # Enrich with student information and document status
        enriched_enrollments = []
        for enrollment in enrollments:
            student = await db.users.find_one({"id": enrollment["student_id"]})
            if student:
                # Get document status
                documents_cursor = db.documents.find({"user_id": student["id"]})
                documents = await documents_cursor.to_list(length=None)
                
                doc_status = {}
                for doc in documents:
                    doc_status[doc["document_type"]] = doc["status"]
                
                # Check if documents are complete
                documents_complete = await check_user_documents_complete_enhanced(student["id"], "student")
                
                enrollment_data = {
                    **serialize_doc(enrollment),
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "student_email": student['email'],
                    "student_phone": student.get('phone', ''),
                    "document_status": doc_status,
                    "documents_complete": documents_complete
                }
                enriched_enrollments.append(enrollment_data)
        
        return {
            "enrollments": enriched_enrollments,
            "school_name": school["name"],
            "total_pending": len(enriched_enrollments)
        }
    
    except Exception as e:
        logger.error(f"Get pending enrollments error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to get pending enrollments")

@api_router.get("/analytics/student-progress/{student_id}")
async def get_student_progress_fixed(
    student_id: str,
    current_user = Depends(get_current_user)
):
    try:
        # Verify access permissions
        if current_user["role"] == "student" and current_user["id"] != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own progress")
        elif current_user["role"] not in ["student", "teacher", "manager"]:
            raise HTTPException(status_code=403, detail="Unauthorized to view student progress")
        
        # Calculate student metrics
        metrics = await calculate_student_metrics(student_id)
        
        return metrics
    
    except Exception as e:
        logger.error(f"Get student progress error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to retrieve student progress")

# AUTO-GENERATE CERTIFICATE FOR COMPLETED STUDENTS
async def check_and_generate_certificate(enrollment_id: str):
    """Check if student has completed all courses and generate certificate"""
    try:
        # Get all courses for this enrollment
        courses_cursor = db.courses.find({"enrollment_id": enrollment_id})
        courses = await courses_cursor.to_list(length=None)
        
        # Check if all courses are completed and exams passed
        all_completed = True
        for course in courses:
            if course["exam_status"] != ExamStatus.PASSED:
                all_completed = False
                break
        
        if all_completed:
            # Get enrollment and student details
            enrollment = await db.enrollments.find_one({"id": enrollment_id})
            student = await db.users.find_one({"id": enrollment["student_id"]})
            school = await db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
            
            # Check if certificate already exists
            existing_cert = await db.certificates.find_one({"enrollment_id": enrollment_id})
            if not existing_cert:
                # Generate certificate
                cert_id = str(uuid.uuid4())
                cert_number = f"DZ-{student['state'][:3].upper()}-{int(datetime.utcnow().timestamp())}"
                
                certificate_doc = {
                    "id": cert_id,
                    "student_id": enrollment["student_id"],
                    "enrollment_id": enrollment_id,
                    "certificate_number": cert_number,
                    "issue_date": datetime.utcnow(),
                    "expiry_date": datetime.utcnow() + timedelta(days=5*365),  # 5 years
                    "status": CertificateStatus.GENERATED,
                    "pdf_url": None,
                    "qr_code": None,
                    "created_at": datetime.utcnow()
                }
                
                await db.certificates.insert_one(certificate_doc)
                
                # Send notification
                notification_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": enrollment["student_id"],
                    "type": NotificationType.CERTIFICATE_READY,
                    "title": "Certificate Ready!",
                    "message": f"Congratulations! Your driving certificate is ready for download.",
                    "is_read": False,
                    "metadata": {"certificate_id": cert_id, "certificate_number": cert_number},
                    "created_at": datetime.utcnow()
                }
                await db.notifications.insert_one(notification_doc)
                
                return cert_id
        
        return None
    
    except Exception as e:
        logger.error(f"Certificate generation error: {str(e)}")
        return None

# Updated exam completion to trigger certificate generation
@api_router.post("/exams/{exam_id}/complete")
async def complete_exam_updated(
    exam_id: str,
    score: float = Form(...),
    notes: str = Form(""),
    current_user = Depends(get_current_user)
):
    try:
        if current_user["role"] != "external_expert":
            raise HTTPException(status_code=403, detail="Only external experts can complete exams")
        
        # Get exam
        exam = await db.exam_schedules.find_one({"id": exam_id})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Verify expert ownership
        expert = await db.external_experts.find_one({"user_id": current_user["id"]})
        if not expert or exam["external_expert_id"] != expert["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized to complete this exam")
        
        # Determine pass/fail
        passing_score = 70.0
        passed = score >= passing_score
        
        # Update exam
        await db.exam_schedules.update_one(
            {"id": exam_id},
            {
                "$set": {
                    "status": ExamStatus.PASSED if passed else ExamStatus.FAILED,
                    "score": score,
                    "notes": notes
                }
            }
        )
        
        # Update course exam status
        await db.courses.update_one(
            {"id": exam["course_id"]},
            {
                "$set": {
                    "exam_status": ExamStatus.PASSED if passed else ExamStatus.FAILED,
                    "exam_score": score,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update course availability for next course
        course = await db.courses.find_one({"id": exam["course_id"]})
        if course and passed:
            await update_course_availability(course["enrollment_id"])
            
            # Check if all courses completed and generate certificate
            cert_id = await check_and_generate_certificate(course["enrollment_id"])
            if cert_id:
                logger.info(f"Certificate generated: {cert_id}")
        
        return {"message": "Exam completed successfully", "passed": passed}
    
    except Exception as e:
        logger.error(f"Complete exam error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to complete exam")

# Sample data creation endpoint (for testing)
@api_router.post("/create-sample-data")
async def create_sample_data():
    """Create sample driving schools for testing"""
    try:
        # Check if schools already exist
        existing_schools = await db.driving_schools.count_documents({})
        if existing_schools > 0:
            return {"message": "Sample data already exists"}
        
        # Sample schools data
        sample_schools = [
            {
                "id": str(uuid.uuid4()),
                "name": "Auto École El Djazair",
                "address": "Rue Didouche Mourad, Centre-ville",
                "state": "Alger",
                "phone": "+213 21 123 456",
                "email": "contact@autoecole-djazair.dz",
                "description": "École de conduite moderne avec instructeurs certifiés et véhicules récents. Plus de 20 ans d'expérience.",
                "price": 35000,
                "latitude": 36.7538,
                "longitude": 3.0588,
                "logo_url": None,
                "photos": [],
                "rating": 4.8,
                "total_reviews": 127,
                "manager_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Auto École Atlas",
                "address": "Boulevard Mohamed V",
                "state": "Oran",
                "phone": "+213 41 987 654",
                "email": "info@atlas-driving.dz",
                "description": "Formation complète avec théorie en ligne et pratique sur route. Taux de réussite de 95%.",
                "price": 32000,
                "latitude": 35.6976,
                "longitude": -0.6337,
                "logo_url": None,
                "photos": [],
                "rating": 4.6,
                "total_reviews": 89,
                "manager_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "École de Conduite Constantine",
                "address": "Rue Ben Badis",
                "state": "Constantine",
                "phone": "+213 31 555 777",
                "email": "contact@constantine-driving.dz",
                "description": "École familiale avec approche personnalisée. Spécialisée dans la formation des conducteurs débutants.",
                "price": 28000,
                "latitude": 36.3650,
                "longitude": 6.6147,
                "logo_url": None,
                "photos": [],
                "rating": 4.4,
                "total_reviews": 156,
                "manager_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Auto École Sahara",
                "address": "Avenue de l'Indépendance",
                "state": "Ouargla",
                "phone": "+213 29 888 999",
                "email": "sahara@driving-school.dz",
                "description": "Formation adaptée aux conditions de conduite du Sud. Instructeurs locaux expérimentés.",
                "price": 25000,
                "latitude": 31.9539,
                "longitude": 5.3281,
                "logo_url": None,
                "photos": [],
                "rating": 4.3,
                "total_reviews": 67,
                "manager_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "École de Conduite Moderne",
                "address": "Cité Universitaire",
                "state": "Sétif",
                "phone": "+213 36 111 222",
                "email": "moderne@setif-driving.dz",
                "description": "École moderne avec simulateurs de conduite et cours théoriques interactifs.",
                "price": 30000,
                "latitude": 36.1906,
                "longitude": 5.4033,
                "logo_url": None,
                "photos": [],
                "rating": 4.7,
                "total_reviews": 201,
                "manager_id": str(uuid.uuid4()),
                "created_at": datetime.utcnow()
            }
        ]
        
        # Insert sample schools
        await db.driving_schools.insert_many(sample_schools)
        
        return {
            "message": "Sample data created successfully",
            "schools_created": len(sample_schools)
        }
    
    except Exception as e:
        logger.error(f"Create sample data error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create sample data")

# ==========================================
# ADDITIONAL MANAGER DASHBOARD ENDPOINTS
# ==========================================

@api_router.get("/schools/my", response_model=dict)
async def get_my_school(current_user: dict = Depends(get_current_user)):
    """Get the driving school owned by the current manager"""
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Only managers can access this endpoint")
    
    school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
    if not school:
        raise HTTPException(status_code=404, detail="No driving school found for this manager")
    
    return serialize_doc(school)

@api_router.get("/quizzes/my", response_model=dict)
async def get_my_quizzes(current_user: dict = Depends(get_current_user)):
    """Get all quizzes created by the current manager"""
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Only managers can access this endpoint")
    
    quizzes_cursor = db.quizzes.find({"created_by": current_user["id"]}).sort("created_at", -1)
    quizzes = await quizzes_cursor.to_list(length=None)
    
    return {
        "quizzes": serialize_doc(quizzes),
        "total": len(quizzes)
    }

@api_router.get("/sessions/school", response_model=dict)
async def get_school_sessions(current_user: dict = Depends(get_current_user)):
    """Get all sessions for the manager's school"""
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Only managers can access this endpoint")
    
    # Get manager's school
    school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
    if not school:
        raise HTTPException(status_code=404, detail="No driving school found for this manager")
    
    # Get all sessions for the school's students through enrollments
    enrollments_cursor = db.enrollments.find({"driving_school_id": school["id"]})
    enrollments = await enrollments_cursor.to_list(length=None)
    
    if not enrollments:
        return {"sessions": [], "total": 0}
    
    student_ids = [enrollment["student_id"] for enrollment in enrollments]
    
    # Get sessions for these students
    sessions_cursor = db.sessions.find({"student_id": {"$in": student_ids}}).sort("scheduled_at", -1)
    sessions = await sessions_cursor.to_list(length=None)
    
    # Enrich sessions with student and teacher names
    for session in sessions:
        student = await db.users.find_one({"id": session["student_id"]})
        teacher = await db.users.find_one({"id": session["teacher_id"]}) if session.get("teacher_id") else None
        
        session["student_name"] = f"{student['first_name']} {student['last_name']}" if student else "Unknown Student"
        session["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}" if teacher else "No Teacher Assigned"
    
    return {
        "sessions": serialize_doc(sessions),
        "total": len(sessions)
    }

@api_router.delete("/teachers/{teacher_id}", response_model=dict)
async def remove_teacher(teacher_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a teacher from the driving school"""
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Only managers can remove teachers")
    
    # Get the teacher to verify ownership
    teacher = await db.teachers.find_one({"id": teacher_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Verify manager owns this teacher's school
    school = await db.driving_schools.find_one({
        "id": teacher["driving_school_id"],
        "manager_id": current_user["id"]
    })
    
    if not school:
        raise HTTPException(status_code=403, detail="You can only remove teachers from your own school")
    
    # Remove teacher
    await db.teachers.delete_one({"id": teacher_id})
    
    # Update user role back to guest or student if they have enrollments
    user = await db.users.find_one({"id": teacher["user_id"]})
    if user:
        # Check if user has any student enrollments
        enrollment = await db.enrollments.find_one({"student_id": user["id"]})
        new_role = "student" if enrollment else "guest"
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"role": new_role}}
        )
    
    return {"message": "Teacher removed successfully"}

@api_router.post("/teachers/add", response_model=dict)
async def add_teacher_enhanced(
    email: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(""),
    address: str = Form(""),
    date_of_birth: str = Form(""),
    gender: str = Form("male"),
    can_teach_male: bool = Form(True),
    can_teach_female: bool = Form(True),
    current_user: dict = Depends(get_current_user)
):
    """Add a new teacher to the driving school with complete registration"""
    if current_user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Only managers can add teachers")
    
    # Get manager's school
    school = await db.driving_schools.find_one({"manager_id": current_user["id"]})
    if not school:
        raise HTTPException(status_code=404, detail="No driving school found for this manager")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        # Check if already a teacher
        existing_teacher = await db.teachers.find_one({"user_id": existing_user["id"]})
        if existing_teacher:
            raise HTTPException(status_code=400, detail="User is already a teacher")
        
        # Update existing user to teacher role
        user_id = existing_user["id"]
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"role": "teacher"}}
        )
    else:
        # Create new user account for teacher
        user_id = str(uuid.uuid4())
        default_password = "teacher123"  # Should be changed on first login
        password_hash = hash_password(default_password)
        
        try:
            birth_date = datetime.fromisoformat(date_of_birth) if date_of_birth else datetime(1990, 1, 1)
        except ValueError:
            birth_date = datetime(1990, 1, 1)
        
        user_data = {
            "id": user_id,
            "email": email,
            "password_hash": password_hash,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "address": address,
            "date_of_birth": birth_date,
            "gender": gender,
            "role": "teacher",
            "state": school.get("state", "Alger"),
            "profile_photo_url": None,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        await db.users.insert_one(user_data)
    
    # Create teacher record
    teacher_id = str(uuid.uuid4())
    teacher_data = {
        "id": teacher_id,
        "user_id": user_id,
        "driving_school_id": school["id"],
        "driving_license_url": "",  # To be uploaded later
        "teaching_license_url": "",  # To be uploaded later
        "photo_url": "",  # To be uploaded later
        "can_teach_male": can_teach_male,
        "can_teach_female": can_teach_female,
        "rating": 0.0,
        "total_reviews": 0,
        "is_approved": True,  # Auto-approved since added by manager
        "created_at": datetime.utcnow()
    }
    
    await db.teachers.insert_one(teacher_data)
    
    # Get the created teacher with user info for response
    teacher = await db.teachers.find_one({"id": teacher_id})
    user = await db.users.find_one({"id": user_id})
    
    if user:
        teacher["user_name"] = f"{user['first_name']} {user['last_name']}"
        teacher["user_email"] = user["email"]
    
    return serialize_doc(teacher)

# Include the API router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
