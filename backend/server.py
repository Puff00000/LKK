from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import asyncpg

# --- Config ----------------------------------------------------------------
DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
PLATFORM_FEE_PERCENT = float(os.environ.get("PLATFORM_FEE_PERCENT", "10"))
AUTO_VERIFY_AFTER_TRIPS = int(os.environ.get("AUTO_VERIFY_AFTER_TRIPS", "3"))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
OTP_MOCK_CODE = "123456"

# --- Service pricing ---------------------------------------------------
# In-person only. 2 hours minimum, 8 hours maximum.
# price = SERVICE_BASE_PRICE + (hours - SERVICE_BASE_HOURS) * SERVICE_HOURLY_RATE
SERVICE_MIN_HOURS = 2
SERVICE_MAX_HOURS = 8
SERVICE_BASE_PRICE = 499
SERVICE_BASE_HOURS = 2
SERVICE_HOURLY_RATE = 250
SERVICE_CATEGORIES = ["food", "shopping", "culture", "photography", "experience", "nature"]

def compute_service_price(duration_hours: int) -> int:
    if duration_hours < SERVICE_MIN_HOURS or duration_hours > SERVICE_MAX_HOURS:
        raise HTTPException(
            status_code=400,
            detail=f"Duration must be between {SERVICE_MIN_HOURS} and {SERVICE_MAX_HOURS} hours",
        )
    return SERVICE_BASE_PRICE + (duration_hours - SERVICE_BASE_HOURS) * SERVICE_HOURLY_RATE

app = FastAPI(title="LKK API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lkk")

# --- Database pool ---------------------------------------------------------
db_pool: asyncpg.Pool = None

async def get_db() -> asyncpg.Pool:
    return db_pool

# --- Helpers ---------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def public_user(doc: dict) -> dict:
    return {
        "id": str(doc["id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc["role"],
        "phone": doc.get("phone"),
        "city": doc.get("city"),
        "phone_verified": doc.get("phone_verified", False),
        "created_at": str(doc.get("created_at", "")),
    }

def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return f"91{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"91{digits[1:]}"
    raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian phone number")

def row_to_dict(row) -> dict:
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows) -> list:
    return [dict(row) for row in rows]

# --- Supabase Storage ------------------------------------------------------
async def upload_to_supabase(path: str, data: bytes, content_type: str, bucket: str = "avatars") -> str:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Storage not configured")
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    async with httpx.AsyncClient(timeout=120) as cli:
        resp = await cli.post(url, headers=headers, content=data)
    logger.info("Supabase upload status: %s body: %s", resp.status_code, resp.text)
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=503, detail=f"Storage upload failed: {resp.text}")
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    return public_url
# --- Email via Resend ------------------------------------------------------
async def send_email(to: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.info("[EMAIL MOCK] To: %s | Subject: %s", to, subject)
        return
    async with httpx.AsyncClient(timeout=30) as cli:
        resp = await cli.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": "LKK <hello@lkk.co.in>", "to": to, "subject": subject, "html": html},
        )
    if resp.status_code != 200:
        logger.warning("Email send failed: %s", resp.text)

# --- Auth ------------------------------------------------------------------
async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return row_to_dict(user)

def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return dep

# --- Models ----------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Literal["traveller", "local"]
    phone: Optional[str] = None
    city: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class OTPSendIn(BaseModel):
    phone: str

class OTPVerifyIn(BaseModel):
    phone: str
    otp: str = Field(min_length=4, max_length=6)

class GuideProfileIn(BaseModel):
    city: str
    bio: str
    languages: List[str] = []
    specialities: List[str] = []
    avatar_url: Optional[str] = None

class ServiceIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1)
    category: Literal["food", "shopping", "culture", "photography", "experience", "nature"]
    duration_hours: int = Field(ge=SERVICE_MIN_HOURS, le=SERVICE_MAX_HOURS)
    extra_food_min: Optional[int] = None
    extra_food_max: Optional[int] = None
    extra_entry_min: Optional[int] = None
    extra_entry_max: Optional[int] = None
    extra_shopping_min: Optional[int] = None
    extra_shopping_max: Optional[int] = None
    extra_transport_min: Optional[int] = None
    extra_transport_max: Optional[int] = None
    cost_note: Optional[str] = ""
    is_active: bool = True

class BookingIn(BaseModel):
    service_id: str
    booking_date: str
    booking_time: str
    traveller_phone: str
    notes: Optional[str] = ""

class ItineraryIn(BaseModel):
    title: str
    content: str

class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""

class DisputeIn(BaseModel):
    reason: str

# --- Startup ---------------------------------------------------------------
DEMO_LOCALS = [
    {
        "email": "aarav.jaipur@localink.in",
        "name": "Aarav Singh",
        "city": "Jaipur",
        "bio": "Born and raised in the pink city. I'll show you the hidden havelis, secret rooftop chai spots, and the best laal maas in town.",
        "languages": ["Hindi", "English", "Rajasthani"],
        "specialities": ["Heritage walks", "Local cuisine", "Bazaar shopping"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Aarav&backgroundColor=166534",
    },
    {
        "email": "meera.goa@localink.in",
        "name": "Meera D'Souza",
        "city": "Goa",
        "bio": "Goan Catholic, beach-side café owner, and surfer. Skip the tourist traps — I'll take you to fishermen coves and the live music joints locals love.",
        "languages": ["English", "Konkani", "Hindi"],
        "specialities": ["Hidden beaches", "Live music", "Seafood"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Meera&backgroundColor=166534",
    },
    {
        "email": "tenzin.manali@localink.in",
        "name": "Tenzin Norbu",
        "city": "Manali",
        "bio": "Mountain guide for 12 years. Day hikes, monastery visits, and the warmest Tibetan thukpa you'll ever taste.",
        "languages": ["Hindi", "English", "Tibetan"],
        "specialities": ["Day treks", "Monasteries", "Mountain cafés"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Tenzin&backgroundColor=166534",
    },
    {
        "email": "kavya.varanasi@localink.in",
        "name": "Kavya Mishra",
        "city": "Varanasi",
        "bio": "Sanskrit scholar and ghat-side storyteller. Sunrise boat rides, evening aarti, and the philosophy of the old city.",
        "languages": ["Hindi", "English", "Sanskrit"],
        "specialities": ["Ghats & aarti", "Heritage", "Spiritual walks"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Kavya&backgroundColor=166534",
    },
    {
        "email": "rohan.bangalore@localink.in",
        "name": "Rohan Iyer",
        "city": "Bangalore",
        "bio": "Tech worker by day, craft beer & filter coffee guide by weekend. I'll show you the city beyond the malls.",
        "languages": ["English", "Kannada", "Tamil"],
        "specialities": ["Café crawls", "Craft breweries", "Indie music"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Rohan&backgroundColor=166534",
    },
    {
        "email": "priya.udaipur@localink.in",
        "name": "Priya Rathore",
        "city": "Udaipur",
        "bio": "I run a small art school overlooking Lake Pichola. Miniature painting workshops, palace tours, and quiet boat rides at golden hour.",
        "languages": ["Hindi", "English"],
        "specialities": ["Art workshops", "Palace tours", "Lake walks"],
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Priya&backgroundColor=166534",
    },
]

DEMO_SERVICES_BY_CITY = {
    "Jaipur": [
        {"title": "Bargain like a local at Johari Bazaar", "category": "shopping", "duration_hours": 2,
         "description": "I'll take you to the best jewellery shops and negotiate on your behalf. You save money, I know the dealers.",
         "extra_shopping_min": 500, "extra_shopping_max": 2000,
         "cost_note": "Service fee covers my time only. Bring your own budget for anything you choose to buy."},
        {"title": "Street food walk in Old City", "category": "food", "duration_hours": 3,
         "description": "10 iconic spots, I eat with you, I explain the history of each dish.",
         "extra_food_min": 150, "extra_food_max": 300,
         "cost_note": "Carry cash — most stalls don't accept cards."},
    ],
    "Goa": [
        {"title": "Hidden beaches & fishermen coves", "category": "nature", "duration_hours": 4,
         "description": "Skip the tourist beaches — I'll take you to the coves and coastline only locals know.",
         "extra_food_min": 200, "extra_food_max": 500,
         "cost_note": "Lunch at a beach shack is extra, on you."},
    ],
    "Manali": [
        {"title": "Sunrise day hike & monastery visit", "category": "nature", "duration_hours": 5,
         "description": "An early hike to the best viewpoint, then a visit to a working Tibetan monastery.",
         "extra_food_min": 100, "extra_food_max": 250,
         "cost_note": "Warm thukpa afterwards is extra — worth it."},
    ],
    "Varanasi": [
        {"title": "Sunrise boat ride & ghat walk", "category": "culture", "duration_hours": 2,
         "description": "A quiet boat ride at sunrise followed by a walk through the ghats with stories most guides skip.",
         "extra_entry_min": 0, "extra_entry_max": 100,
         "cost_note": "Boat fare included in service fee."},
    ],
    "Bangalore": [
        {"title": "Filter coffee & café crawl", "category": "food", "duration_hours": 3,
         "description": "The city's best filter coffee spots and indie cafés, beyond the mall chains.",
         "extra_food_min": 150, "extra_food_max": 400,
         "cost_note": "Coffee and snacks at each stop are extra."},
    ],
    "Udaipur": [
        {"title": "Miniature painting workshop", "category": "experience", "duration_hours": 2,
         "description": "A hands-on Rajasthani miniature painting session overlooking Lake Pichola.",
         "extra_shopping_min": 0, "extra_shopping_max": 500,
         "cost_note": "Materials included. Buying your finished piece's frame is optional."},
    ],
}

@app.on_event("startup")
async def on_startup() -> None:
    global db_pool
    db_pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,
        max_size=10,
        ssl="require",
        statement_cache_size=0
    )
    logger.info("Database pool created")
    await seed_admin()
    await seed_demo_data()

async def seed_admin() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@localink.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM users WHERE email = $1", admin_email)
        if existing is None:
            await conn.execute(
                """INSERT INTO users (id, email, name, role, password_hash, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                str(uuid.uuid4()), admin_email, "Localink Admin", "admin",
                hash_password(admin_password), datetime.now(timezone.utc)
            )
            logger.info("Seeded admin: %s", admin_email)

async def seed_demo_data() -> None:
    async with db_pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM guides")
        if count > 0:
            return
        for d in DEMO_LOCALS:
            user_id = str(uuid.uuid4())
            guide_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO users (id, email, name, role, password_hash, phone_verified, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                user_id, d["email"], d["name"], "local",
                hash_password("Local@123"), True, datetime.now(timezone.utc)
            )
            await conn.execute(
                """INSERT INTO guides (id, user_id, name, city, bio, languages, specialities,
                   avatar_url, rating, review_count, is_complete, verified, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                guide_id, user_id, d["name"], d["city"], d["bio"],
                d["languages"], d["specialities"], d["avatar_url"],
                4.7, 0, True, True, datetime.now(timezone.utc)
            )
            for s in DEMO_SERVICES_BY_CITY.get(d["city"], []):
                price = compute_service_price(s["duration_hours"])
                await conn.execute(
                    """INSERT INTO services (id, guide_id, title, description, category,
                       duration_hours, price, extra_food_min, extra_food_max, extra_entry_min,
                       extra_entry_max, extra_shopping_min, extra_shopping_max,
                       extra_transport_min, extra_transport_max, cost_note, is_active, created_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)""",
                    str(uuid.uuid4()), guide_id, s["title"], s["description"], s["category"],
                    s["duration_hours"], price,
                    s.get("extra_food_min"), s.get("extra_food_max"),
                    s.get("extra_entry_min"), s.get("extra_entry_max"),
                    s.get("extra_shopping_min"), s.get("extra_shopping_max"),
                    s.get("extra_transport_min"), s.get("extra_transport_max"),
                    s.get("cost_note", ""), True, datetime.now(timezone.utc)
                )
        logger.info("Seeded %d demo guides with services", len(DEMO_LOCALS))

@app.on_event("shutdown")
async def shutdown() -> None:
    await db_pool.close()

# --- Auth endpoints --------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(uuid.uuid4())
        phone = normalize_phone(body.phone) if body.phone else None
        await conn.execute(
            """INSERT INTO users (id, email, name, role, password_hash, phone, city, phone_verified, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            user_id, email, body.name.strip(), body.role,
            hash_password(body.password), phone,
            (body.city or "").strip() or None, False, datetime.now(timezone.utc)
        )
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    token = create_token(user_id, email, body.role)
    # Send welcome email
    await send_email(
        email,
        "Welcome to LKK 🌿",
        f"<h2>Welcome to LKK, {body.name}!</h2><p>Travel like a local. We're glad you're here.</p>"
    )
    return {"token": token, "user": public_user(row_to_dict(user))}

@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_dict = row_to_dict(user)
    token = create_token(str(user["id"]), user["email"], user["role"])
    return {"token": token, "user": public_user(user_dict)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}

# --- OTP (mock for now) ----------------------------------------------------
@api.post("/otp/send")
async def otp_send(body: OTPSendIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET phone = $1, phone_verified = FALSE WHERE id = $2",
            phone, str(user["id"])
        )
    logger.info("[OTP MOCK] code for %s is %s", phone, OTP_MOCK_CODE)
    return {"ok": True, "phone": phone, "mock": True, "message": "Mock OTP sent. Use 123456."}

@api.post("/otp/verify")
async def otp_verify(body: OTPVerifyIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    if body.otp.strip() != OTP_MOCK_CODE:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET phone = $1, phone_verified = TRUE, phone_verified_at = $2 WHERE id = $3",
            phone, datetime.now(timezone.utc), str(user["id"])
        )
        fresh = await conn.fetchrow("SELECT * FROM users WHERE id = $1", str(user["id"]))
    return {"ok": True, "user": public_user(row_to_dict(fresh))}

@api.post("/otp/resend")
async def otp_resend(body: OTPSendIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    logger.info("[OTP MOCK] resend code for %s is %s", phone, OTP_MOCK_CODE)
    return {"ok": True, "mock": True}

# --- File upload -----------------------------------------------------------
MIME_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}

@api.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    if ext not in MIME_BY_EXT:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WEBP/GIF images allowed")
    content_type = MIME_BY_EXT[ext]
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    path = f"avatars/{user['id']}/{uuid.uuid4().hex}.{ext}"
    public_url = await upload_to_supabase(path, data, content_type)
    async with db_pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO files (id, owner_id, storage_path, original_filename, content_type, size, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            str(uuid.uuid4()), str(user["id"]), path,
            file.filename, content_type, len(data), datetime.now(timezone.utc)
        )
    return {"path": path, "url": public_url}

# --- Local intro video (upload + moderation) --------------------------------
VIDEO_MIME_BY_EXT = {
    "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm",
}
VIDEO_MAX_BYTES = 50 * 1024 * 1024  # 50MB
VIDEO_BUCKET = "guide-videos"

def video_status(guide: dict) -> str:
    """Derive a single human-readable status from the three video moderation columns."""
    if not guide.get("video_url"):
        return "none"
    if guide.get("video_approved"):
        return "approved"
    if guide.get("video_rejected"):
        return "rejected"
    return "pending"

@api.post("/profile/guide/video")
async def upload_guide_video(file: UploadFile = File(...), user: dict = Depends(require_role("local"))):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in VIDEO_MIME_BY_EXT:
        raise HTTPException(status_code=400, detail="Only MP4/MOV/WEBM videos allowed")
    content_type = VIDEO_MIME_BY_EXT[ext]
    data = await file.read()
    if len(data) > VIDEO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Video too large (max 50MB)")
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
        if not guide:
            raise HTTPException(status_code=400, detail="Create your local profile before adding a video")
        path = f"{user['id']}/{uuid.uuid4().hex}.{ext}"
        public_url = await upload_to_supabase(path, data, content_type, bucket=VIDEO_BUCKET)
        # New upload always resets moderation state back to pending review
        await conn.execute(
            """UPDATE guides SET video_url=$1, video_approved=FALSE, video_rejected=FALSE,
               video_rejection_reason=NULL WHERE id=$2""",
            public_url, str(guide["id"])
        )
        guide = await conn.fetchrow("SELECT * FROM guides WHERE id = $1", str(guide["id"]))
    d = row_to_dict(guide)
    d["id"] = str(d["id"])
    d["user_id"] = str(d["user_id"])
    d["video_status"] = video_status(d)
    return {"guide": d}

@api.delete("/profile/guide/video")
async def delete_guide_video(user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
        if not guide:
            raise HTTPException(status_code=404, detail="Guide profile not found")
        await conn.execute(
            """UPDATE guides SET video_url=NULL, video_approved=FALSE, video_rejected=FALSE,
               video_rejection_reason=NULL WHERE id=$1""",
            str(guide["id"])
        )
    return {"ok": True}

@api.get("/admin/videos")
async def admin_list_videos(status: Optional[str] = None, user: dict = Depends(require_role("admin"))):
    """status: pending | approved | rejected | None (all guides that have a video)"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM guides WHERE video_url IS NOT NULL ORDER BY created_at DESC"
        )
    result = []
    for row in rows:
        d = row_to_dict(row)
        d["id"] = str(d["id"])
        d["user_id"] = str(d["user_id"])
        d["video_status"] = video_status(d)
        if status and d["video_status"] != status:
            continue
        result.append(d)
    return result

class VideoReviewIn(BaseModel):
    approved: bool
    reason: Optional[str] = None

@api.post("/admin/guides/{guide_id}/video/review")
async def admin_review_video(guide_id: str, body: VideoReviewIn, user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE id = $1", guide_id)
        if not guide or not guide["video_url"]:
            raise HTTPException(status_code=404, detail="No video submitted for this guide")
        if not body.approved and not (body.reason and body.reason.strip()):
            raise HTTPException(status_code=400, detail="A reason is required when rejecting a video")
        await conn.execute(
            """UPDATE guides SET video_approved=$1, video_rejected=$2, video_rejection_reason=$3
               WHERE id=$4""",
            body.approved, not body.approved,
            (body.reason or "").strip() if not body.approved else None,
            guide_id
        )
        traveller_facing_user = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", str(guide["user_id"]))
    if traveller_facing_user:
        if body.approved:
            await send_email(
                traveller_facing_user["email"],
                "Your intro video is live — LKK 🌿",
                "<h2>Approved!</h2><p>Your intro video is now visible on your public profile.</p>"
            )
        else:
            await send_email(
                traveller_facing_user["email"],
                "Your intro video needs a change — LKK 🌿",
                f"<h2>Not quite ready yet</h2><p>{(body.reason or '').strip()}</p><p>Please upload a new video from your profile page.</p>"
            )
    return {"ok": True, "approved": body.approved}


@api.get("/guides")
async def list_guides(
    city: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort: Optional[str] = "rating",
):
    query = "SELECT * FROM guides WHERE is_complete = TRUE"
    params = []
    i = 1
    if city:
        query += f" AND LOWER(city) = LOWER(${i})"
        params.append(city)
        i += 1
    if min_rating is not None:
        query += f" AND rating >= ${i}"
        params.append(min_rating)
        i += 1
    sort_map = {
        "rating": "rating DESC",
        "newest": "created_at DESC",
    }
    query += f" ORDER BY {sort_map.get(sort or 'rating', 'rating DESC')}"
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    result = []
    for row in rows:
        d = row_to_dict(row)
        d["id"] = str(d["id"])
        d["user_id"] = str(d["user_id"])
        result.append(d)
    return result

@api.get("/guides/cities")
async def list_cities():
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT DISTINCT city FROM guides WHERE is_complete = TRUE ORDER BY city")
    return [row["city"] for row in rows]

@api.get("/guides/{guide_id}")
async def get_guide(guide_id: str):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE id = $1", guide_id)
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        reviews = await conn.fetch(
            "SELECT * FROM reviews WHERE guide_id = $1 ORDER BY created_at DESC LIMIT 50",
            guide_id
        )
        services = await conn.fetch(
            "SELECT * FROM services WHERE guide_id = $1 AND is_active = TRUE ORDER BY created_at ASC",
            guide_id
        )
    guide_dict = row_to_dict(guide)
    guide_dict["id"] = str(guide_dict["id"])
    guide_dict["user_id"] = str(guide_dict["user_id"])
    # Only ever surface a video publicly once an admin has approved it
    if not guide_dict.get("video_approved"):
        guide_dict["video_url"] = None
    svc_list = rows_to_list(services)
    for s in svc_list:
        s["id"] = str(s["id"])
        s["guide_id"] = str(s["guide_id"])
    return {"guide": guide_dict, "reviews": rows_to_list(reviews), "services": svc_list}

@api.get("/profile/guide/me")
async def my_guide_profile(user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
    if guide:
        d = row_to_dict(guide)
        d["id"] = str(d["id"])
        d["user_id"] = str(d["user_id"])
        d["video_status"] = video_status(d)
        return {"guide": d}
    return {"guide": None}

async def _refresh_guide_completeness(conn, guide_id: str) -> None:
    guide = await conn.fetchrow("SELECT city, bio FROM guides WHERE id = $1", guide_id)
    service_count = await conn.fetchval(
        "SELECT COUNT(*) FROM services WHERE guide_id = $1 AND is_active = TRUE", guide_id
    )
    is_complete = bool(guide and guide["city"] and guide["bio"] and service_count > 0)
    await conn.execute("UPDATE guides SET is_complete = $1 WHERE id = $2", is_complete, guide_id)

@api.post("/profile/guide")
async def upsert_guide_profile(body: GuideProfileIn, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM guides WHERE user_id = $1", str(user["id"]))
        if existing:
            await conn.execute(
                """UPDATE guides SET city=$1, bio=$2, languages=$3, specialities=$4,
                   avatar_url=$5 WHERE user_id=$6""",
                body.city, body.bio, body.languages, body.specialities,
                body.avatar_url, str(user["id"])
            )
            guide_id = str(existing["id"])
        else:
            guide_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO guides (id, user_id, name, city, bio, languages, specialities,
                   avatar_url, rating, review_count, is_complete, verified, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                guide_id, str(user["id"]), user["name"], body.city, body.bio,
                body.languages, body.specialities, body.avatar_url,
                0.0, 0, False, False, datetime.now(timezone.utc)
            )
        await _refresh_guide_completeness(conn, guide_id)
        guide = await conn.fetchrow("SELECT * FROM guides WHERE id = $1", guide_id)
    d = row_to_dict(guide)
    d["id"] = str(d["id"])
    d["user_id"] = str(d["user_id"])
    d["video_status"] = video_status(d)
    return {"guide": d}

# --- Services ----------------------------------------------------------
def _service_out(row) -> dict:
    d = row_to_dict(row)
    d["id"] = str(d["id"])
    d["guide_id"] = str(d["guide_id"])
    return d

@api.get("/services")
async def list_services(
    city: Optional[str] = None,
    category: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    guide_id: Optional[str] = None,
    sort: Optional[str] = "newest",
):
    query = """SELECT s.*, g.name AS guide_name, g.city AS guide_city, g.avatar_url AS guide_avatar_url,
               g.rating AS guide_rating, g.review_count AS guide_review_count, g.verified AS guide_verified
               FROM services s JOIN guides g ON g.id = s.guide_id
               WHERE s.is_active = TRUE AND g.is_complete = TRUE"""
    params = []
    i = 1
    if city:
        query += f" AND LOWER(g.city) = LOWER(${i})"
        params.append(city)
        i += 1
    if category:
        query += f" AND s.category = ${i}"
        params.append(category)
        i += 1
    if min_duration is not None:
        query += f" AND s.duration_hours >= ${i}"
        params.append(min_duration)
        i += 1
    if max_duration is not None:
        query += f" AND s.duration_hours <= ${i}"
        params.append(max_duration)
        i += 1
    if guide_id:
        query += f" AND s.guide_id = ${i}"
        params.append(guide_id)
        i += 1
    sort_map = {
        "newest": "s.created_at DESC",
        "price_low": "s.price ASC",
        "price_high": "s.price DESC",
        "rating": "g.rating DESC",
    }
    query += f" ORDER BY {sort_map.get(sort or 'newest', 's.created_at DESC')}"
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    result = []
    for row in rows:
        d = row_to_dict(row)
        d["id"] = str(d["id"])
        d["guide_id"] = str(d["guide_id"])
        result.append(d)
    return result

@api.get("/services/{service_id}")
async def get_service(service_id: str):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT s.*, g.name AS guide_name, g.city AS guide_city, g.avatar_url AS guide_avatar_url,
               g.rating AS guide_rating, g.review_count AS guide_review_count, g.verified AS guide_verified,
               g.bio AS guide_bio
               FROM services s JOIN guides g ON g.id = s.guide_id WHERE s.id = $1""",
            service_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    return _service_out(row)

@api.get("/guides/{guide_id}/services")
async def list_guide_services(guide_id: str):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM services WHERE guide_id = $1 ORDER BY created_at ASC", guide_id
        )
    return [_service_out(r) for r in rows]

@api.post("/services")
async def create_service(body: ServiceIn, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
        if not guide:
            raise HTTPException(status_code=400, detail="Create your local profile before adding services")
        price = compute_service_price(body.duration_hours)
        service_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO services (id, guide_id, title, description, category, duration_hours, price,
               extra_food_min, extra_food_max, extra_entry_min, extra_entry_max,
               extra_shopping_min, extra_shopping_max, extra_transport_min, extra_transport_max,
               cost_note, is_active, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)""",
            service_id, str(guide["id"]), body.title.strip(), body.description.strip(), body.category,
            body.duration_hours, price,
            body.extra_food_min, body.extra_food_max, body.extra_entry_min, body.extra_entry_max,
            body.extra_shopping_min, body.extra_shopping_max, body.extra_transport_min, body.extra_transport_max,
            body.cost_note or "", body.is_active, datetime.now(timezone.utc)
        )
        await _refresh_guide_completeness(conn, str(guide["id"]))
        row = await conn.fetchrow("SELECT * FROM services WHERE id = $1", service_id)
    return _service_out(row)

@api.put("/services/{service_id}")
async def update_service(service_id: str, body: ServiceIn, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
        existing = await conn.fetchrow("SELECT * FROM services WHERE id = $1", service_id)
        if not guide or not existing or str(existing["guide_id"]) != str(guide["id"]):
            raise HTTPException(status_code=404, detail="Service not found")
        price = compute_service_price(body.duration_hours)
        await conn.execute(
            """UPDATE services SET title=$1, description=$2, category=$3, duration_hours=$4, price=$5,
               extra_food_min=$6, extra_food_max=$7, extra_entry_min=$8, extra_entry_max=$9,
               extra_shopping_min=$10, extra_shopping_max=$11, extra_transport_min=$12, extra_transport_max=$13,
               cost_note=$14, is_active=$15 WHERE id=$16""",
            body.title.strip(), body.description.strip(), body.category, body.duration_hours, price,
            body.extra_food_min, body.extra_food_max, body.extra_entry_min, body.extra_entry_max,
            body.extra_shopping_min, body.extra_shopping_max, body.extra_transport_min, body.extra_transport_max,
            body.cost_note or "", body.is_active, service_id
        )
        await _refresh_guide_completeness(conn, str(guide["id"]))
        row = await conn.fetchrow("SELECT * FROM services WHERE id = $1", service_id)
    return _service_out(row)

@api.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        guide = await conn.fetchrow("SELECT * FROM guides WHERE user_id = $1", str(user["id"]))
        existing = await conn.fetchrow("SELECT * FROM services WHERE id = $1", service_id)
        if not guide or not existing or str(existing["guide_id"]) != str(guide["id"]):
            raise HTTPException(status_code=404, detail="Service not found")
        active_booking = await conn.fetchval(
            """SELECT COUNT(*) FROM bookings WHERE service_id = $1
               AND status NOT IN ('completed', 'cancelled', 'disputed')""",
            service_id
        )
        if active_booking:
            raise HTTPException(status_code=400, detail="Can't delete a service with an active booking")
        await conn.execute("DELETE FROM services WHERE id = $1", service_id)
        await _refresh_guide_completeness(conn, str(guide["id"]))
    return {"ok": True}

# --- Bookings --------------------------------------------------------------
@api.post("/bookings")
async def create_booking(body: BookingIn, user: dict = Depends(require_role("traveller"))):
    async with db_pool.acquire() as conn:
        service = await conn.fetchrow("SELECT * FROM services WHERE id = $1", body.service_id)
        if not service or not service["is_active"]:
            raise HTTPException(status_code=404, detail="Service not found")
        guide = await conn.fetchrow("SELECT * FROM guides WHERE id = $1", str(service["guide_id"]))
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        amount = service["price"]
        duration_hours = service["duration_hours"]
        platform_fee = round(amount * PLATFORM_FEE_PERCENT / 100)
        local_payout = amount - platform_fee
        booking_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO bookings (id, guide_id, guide_name, guide_city, local_user_id,
               traveller_user_id, traveller_name, traveller_phone, service_id, service_title,
               booking_date, booking_time, duration_hours, notes, amount, platform_fee,
               local_payout, status, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)""",
            booking_id, str(guide["id"]), guide["name"], guide["city"], str(guide["user_id"]),
            str(user["id"]), user["name"], body.traveller_phone,
            str(service["id"]), service["title"],
            body.booking_date, body.booking_time, duration_hours, body.notes or "",
            amount, platform_fee, local_payout,
            "pending_payment", datetime.now(timezone.utc)
        )
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    # Send confirmation email
    await send_email(
        user["email"],
        "Booking Confirmed — LKK 🌿",
        f"<h2>Your booking is confirmed!</h2><p>You've booked '{service['title']}' with {guide['name']} in {guide['city']} for {duration_hours}hrs. Amount: ₹{amount}</p>"
    )
    d = row_to_dict(booking)
    d["id"] = str(d["id"])
    return d

@api.post("/bookings/{booking_id}/pay")
async def mock_pay(booking_id: str, user: dict = Depends(require_role("traveller"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["traveller_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "pending_payment":
            raise HTTPException(status_code=400, detail="Booking is not awaiting payment")
        mock_payment_id = f"pay_mock_{uuid.uuid4().hex[:16]}"
        await conn.execute(
            "UPDATE bookings SET status='paid', payment_id=$1, paid_at=$2 WHERE id=$3",
            mock_payment_id, datetime.now(timezone.utc), booking_id
        )
    await send_email(
        user["email"],
        "Payment Received — LKK 🌿",
        f"<h2>Payment confirmed!</h2><p>Amount: ₹{booking['amount']}. Your local will send your itinerary soon.</p>"
    )
    return {"ok": True, "payment_id": mock_payment_id, "status": "paid"}

@api.get("/bookings/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500")
        elif user["role"] == "traveller":
            rows = await conn.fetch(
                "SELECT * FROM bookings WHERE traveller_user_id = $1 ORDER BY created_at DESC",
                str(user["id"])
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM bookings WHERE local_user_id = $1 ORDER BY created_at DESC",
                str(user["id"])
            )
    result = []
    for row in rows:
        d = row_to_dict(row)
        d["id"] = str(d["id"])
        result.append(d)
    return result

@api.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["role"] != "admin" and str(user["id"]) not in (
        str(booking["traveller_user_id"]), str(booking["local_user_id"])
    ):
        raise HTTPException(status_code=403, detail="Not your booking")
    d = row_to_dict(booking)
    d["id"] = str(d["id"])
    return d

@api.post("/bookings/{booking_id}/itinerary")
async def deliver_itinerary(booking_id: str, body: ItineraryIn, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["local_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] not in ("accepted", "itinerary_delivered"):
            raise HTTPException(status_code=400, detail="Booking must be accepted before delivering itinerary")
        import json
        itinerary_json = json.dumps({"title": body.title, "content": body.content, "delivered_at": now_iso()})
        await conn.execute(
            "UPDATE bookings SET itinerary=$1::jsonb, status='itinerary_delivered' WHERE id=$2",
            itinerary_json, booking_id
        )
        traveller = await conn.fetchrow("SELECT email, name FROM users WHERE id = $1", str(booking["traveller_user_id"]))
    if traveller:
        await send_email(
            traveller["email"],
            "Your Itinerary is Ready — LKK 🌿",
            f"<h2>Your local sent your itinerary!</h2><p>{body.title}</p><p>Log in to view and confirm it.</p>"
        )
    return {"ok": True}

@api.post("/bookings/{booking_id}/confirm")
async def confirm_itinerary(booking_id: str, user: dict = Depends(require_role("traveller"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["traveller_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "itinerary_delivered":
            raise HTTPException(status_code=400, detail="No itinerary to confirm yet")
        await conn.execute(
            "UPDATE bookings SET status='completed', payment_released=TRUE, completed_at=$1 WHERE id=$2",
            datetime.now(timezone.utc), booking_id
        )
    return {"ok": True, "payout_released": booking["local_payout"]}

@api.post("/bookings/{booking_id}/dispute")
async def raise_dispute(booking_id: str, body: DisputeIn, user: dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(user["id"]) not in (
            str(booking["traveller_user_id"]), str(booking["local_user_id"])
        ):
            raise HTTPException(status_code=404, detail="Booking not found")
        await conn.execute(
            "UPDATE bookings SET status='disputed', dispute_reason=$1, disputed_at=$2, disputed_by=$3 WHERE id=$4",
            body.reason, datetime.now(timezone.utc), str(user["id"]), booking_id
        )
    return {"ok": True}

# --- Messages --------------------------------------------------------------
@api.get("/bookings/{booking_id}/messages")
async def get_messages(booking_id: str, user: dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if user["role"] != "admin" and str(user["id"]) not in (
            str(booking["traveller_user_id"]), str(booking["local_user_id"])
        ):
            raise HTTPException(status_code=403, detail="Not your booking")
        msgs = await conn.fetch(
            "SELECT * FROM messages WHERE booking_id = $1 ORDER BY created_at ASC",
            booking_id
        )
    return rows_to_list(msgs)

@api.post("/bookings/{booking_id}/messages")
async def post_message(booking_id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if user["role"] != "admin" and str(user["id"]) not in (
            str(booking["traveller_user_id"]), str(booking["local_user_id"])
        ):
            raise HTTPException(status_code=403, detail="Not your booking")
        msg_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO messages (id, booking_id, sender_id, sender_name, sender_role, content, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            msg_id, booking_id, str(user["id"]), user["name"], user["role"],
            body.content.strip(), datetime.now(timezone.utc)
        )
        msg = await conn.fetchrow("SELECT * FROM messages WHERE id = $1", msg_id)
    return row_to_dict(msg)

# --- Reviews ---------------------------------------------------------------
@api.post("/bookings/{booking_id}/review")
async def post_review(booking_id: str, body: ReviewIn, user: dict = Depends(require_role("traveller"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["traveller_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "completed":
            raise HTTPException(status_code=400, detail="Only completed bookings can be reviewed")
        existing = await conn.fetchrow("SELECT id FROM reviews WHERE booking_id = $1", booking_id)
        if existing:
            raise HTTPException(status_code=400, detail="Review already submitted")
        review_id = str(uuid.uuid4())
        await conn.execute(
            """INSERT INTO reviews (id, booking_id, guide_id, traveller_id, traveller_name, rating, comment, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
            review_id, booking_id, str(booking["guide_id"]),
            str(user["id"]), user["name"], body.rating, body.comment,
            datetime.now(timezone.utc)
        )
        avg = await conn.fetchrow(
            "SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE guide_id = $1",
            str(booking["guide_id"])
        )
        await conn.execute(
            "UPDATE guides SET rating=$1, review_count=$2 WHERE id=$3",
            round(float(avg["avg"]), 2), avg["count"], str(booking["guide_id"])
        )
        review = await conn.fetchrow("SELECT * FROM reviews WHERE id = $1", review_id)
    return row_to_dict(review)

# --- Admin -----------------------------------------------------------------
@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT id,email,name,role,phone,city,phone_verified,created_at FROM users ORDER BY created_at DESC LIMIT 500")
    return rows_to_list(rows)

@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500")
    return rows_to_list(rows)

@api.get("/admin/disputes")
async def admin_disputes(user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM bookings WHERE status='disputed' ORDER BY disputed_at DESC")
    return rows_to_list(rows)

@api.post("/admin/disputes/{booking_id}/resolve")
async def admin_resolve(booking_id: str, refund_to_traveller: bool = False, user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        new_status = "cancelled" if refund_to_traveller else "completed"
        payment_released = not refund_to_traveller
        await conn.execute(
            "UPDATE bookings SET status=$1, payment_released=$2, resolved_at=$3 WHERE id=$4",
            new_status, payment_released, datetime.now(timezone.utc), booking_id
        )
    return {"ok": True, "status": new_status}

@api.post("/admin/guides/{guide_id}/verify")
async def admin_verify_guide(guide_id: str, verified: bool = True, user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE guides SET verified=$1, verified_at=$2, verified_by='admin' WHERE id=$3",
            verified, datetime.now(timezone.utc), guide_id
        )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Guide not found")
    return {"ok": True, "verified": verified}

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    async with db_pool.acquire() as conn:
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        total_locals = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role='local'")
        total_travellers = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role='traveller'")
        total_bookings = await conn.fetchval("SELECT COUNT(*) FROM bookings")
        completed = await conn.fetchval("SELECT COUNT(*) FROM bookings WHERE status='completed'")
        disputed = await conn.fetchval("SELECT COUNT(*) FROM bookings WHERE status='disputed'")
        agg = await conn.fetchrow(
            "SELECT SUM(platform_fee) as revenue, SUM(amount) as gmv FROM bookings WHERE status='completed'"
        )
    return {
        "total_users": total_users,
        "total_locals": total_locals,
        "total_travellers": total_travellers,
        "total_bookings": total_bookings,
        "completed_bookings": completed,
        "disputed_bookings": disputed,
        "platform_revenue": agg["revenue"] or 0,
        "gmv": agg["gmv"] or 0,
    }



# --- Forgot / Reset Password -----------------------------------------------
import secrets

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    email = body.email.lower()
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
        if not user:
            # Don't reveal if email exists or not
            return {"ok": True, "message": "If that email exists, a reset link has been sent."}
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        # Delete any existing reset tokens for this user
        await conn.execute("DELETE FROM password_resets WHERE user_id = $1", str(user["id"]))
        # Save new token
        await conn.execute(
            """INSERT INTO password_resets (user_id, token, expires_at)
               VALUES ($1, $2, $3)""",
            str(user["id"]), token, expires_at
        )
    # Send reset email
    reset_url = f"{os.environ.get('FRONTEND_URL', 'https://www.lkk.co.in')}/reset-password?token={token}"
    await send_email(
        email,
        "Reset your LKK password 🔑",
        f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #166534;">Reset your password</h2>
            <p>Hi {user['name']},</p>
            <p>We received a request to reset your LKK password. Click the button below to choose a new one:</p>
            <a href="{reset_url}" style="display: inline-block; background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Reset Password
            </a>
            <p style="color: #78716c; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            <p style="color: #78716c; font-size: 14px;">— The LKK Team</p>
        </div>
        """
    )
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    async with db_pool.acquire() as conn:
        reset = await conn.fetchrow(
            "SELECT * FROM password_resets WHERE token = $1 AND used = FALSE",
            body.token
        )
        if not reset:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link")
        if reset["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reset link has expired")
        # Update password
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            hash_password(body.new_password), str(reset["user_id"])
        )
        # Mark token as used
        await conn.execute(
            "UPDATE password_resets SET used = TRUE WHERE token = $1",
            body.token
        )
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", str(reset["user_id"]))
    return {"ok": True, "message": "Password reset successfully"}


# --- Accept / Decline booking (local) ------------------------------------
@api.post("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["local_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "paid":
            raise HTTPException(status_code=400, detail="Only paid bookings can be accepted")
        await conn.execute(
            "UPDATE bookings SET status='accepted' WHERE id=$1",
            booking_id
        )
        traveller = await conn.fetchrow(
            "SELECT email, name FROM users WHERE id = $1",
            str(booking["traveller_user_id"])
        )
    if traveller:
        await send_email(
            traveller["email"],
            "Your booking was accepted — LKK 🌿",
            f"<h2>Great news!</h2><p>{user['name']} accepted your booking. They will send your itinerary soon!</p>"
        )
    return {"ok": True, "status": "accepted"}


@api.post("/bookings/{booking_id}/decline")
async def decline_booking(booking_id: str, user: dict = Depends(require_role("local"))):
    async with db_pool.acquire() as conn:
        booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        if not booking or str(booking["local_user_id"]) != str(user["id"]):
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] not in ("paid", "accepted"):
            raise HTTPException(status_code=400, detail="This booking cannot be declined")
        await conn.execute(
            "UPDATE bookings SET status='cancelled' WHERE id=$1",
            booking_id
        )
        traveller = await conn.fetchrow(
            "SELECT email, name FROM users WHERE id = $1",
            str(booking["traveller_user_id"])
        )
    if traveller:
        await send_email(
            traveller["email"],
            "Booking update — LKK 🌿",
            f"<h2>We're sorry!</h2><p>{user['name']} is unavailable for your requested dates. Your refund will be processed shortly.</p>"
        )
    return {"ok": True, "status": "cancelled"}


# --- Health ----------------------------------------------------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "lkk"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
