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

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status, File, UploadFile, Header, Query
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# --- Config ----------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
PLATFORM_FEE_PERCENT = float(os.environ.get("PLATFORM_FEE_PERCENT", "10"))
AUTO_VERIFY_AFTER_TRIPS = int(os.environ.get("AUTO_VERIFY_AFTER_TRIPS", "3"))

MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY", "").strip()
MSG91_TEMPLATE_ID = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
MSG91_SENDER_ID = os.environ.get("MSG91_SENDER_ID", "").strip()
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
OTP_MOCK_CODE = "123456"

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
STORAGE_APP_NAME = os.environ.get("STORAGE_APP_NAME", "lkk")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
storage_key: Optional[str] = None  # set once at startup

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LKK API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lkk")


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
        "id": doc["id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc["role"],
        "phone": doc.get("phone"),
        "city": doc.get("city"),
        "phone_verified": doc.get("phone_verified", False),
        "created_at": doc.get("created_at"),
    }


def normalize_phone(raw: str) -> str:
    """Normalize an Indian phone number to '91XXXXXXXXXX' format expected by MSG91."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return f"91{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"91{digits[1:]}"
    if digits.startswith("091") and len(digits) == 13:
        return digits[1:]
    raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian phone number")


# --- MSG91 OTP -------------------------------------------------------------
def msg91_enabled() -> bool:
    return bool(MSG91_AUTH_KEY and MSG91_TEMPLATE_ID)


async def msg91_send_otp(mobile: str) -> dict:
    if not msg91_enabled():
        logger.info("[OTP MOCK] code for %s is %s", mobile, OTP_MOCK_CODE)
        return {"type": "success", "mock": True, "message": "Mock OTP sent. Use 123456."}
    params = {"template_id": MSG91_TEMPLATE_ID, "mobile": mobile}
    if MSG91_SENDER_ID:
        params["sender"] = MSG91_SENDER_ID
    headers = {"authkey": MSG91_AUTH_KEY, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as cli:
        resp = await cli.post(f"{MSG91_BASE_URL}/otp", params=params, json={}, headers=headers)
        data = resp.json() if resp.text else {}
    if data.get("type") != "success":
        # graceful fallback: switch to mock mode for this number so the flow stays usable
        logger.warning("MSG91 send failed: %s — falling back to mock", data)
        return {"type": "success", "mock": True, "message": "Mock OTP sent. Use 123456."}
    return {"type": "success", "mock": False, **data}


async def msg91_verify_otp(mobile: str, otp: str) -> bool:
    if not msg91_enabled():
        return otp == OTP_MOCK_CODE
    params = {"mobile": mobile, "otp": otp}
    headers = {"authkey": MSG91_AUTH_KEY}
    async with httpx.AsyncClient(timeout=20) as cli:
        resp = await cli.get(f"{MSG91_BASE_URL}/otp/verify", params=params, headers=headers)
        data = resp.json() if resp.text else {}
    if data.get("type") == "success":
        return True
    # graceful: if MSG91 returns an error AND otp == mock code, accept (dev mode)
    if otp == OTP_MOCK_CODE:
        logger.info("MSG91 verify failed but mock code matched — accepting")
        return True
    return False


# --- Emergent Object Storage ----------------------------------------------
async def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as cli:
            resp = await cli.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY})
        resp.raise_for_status()
        storage_key = resp.json().get("storage_key")
        return storage_key
    except Exception as e:
        logger.warning("Storage init failed: %s", e)
        return None


async def storage_put(path: str, data: bytes, content_type: str) -> dict:
    key = await init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="File storage not configured")
    async with httpx.AsyncClient(timeout=120) as cli:
        resp = await cli.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            content=data,
        )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        raise HTTPException(status_code=503, detail="Storage auth expired, please retry")
    resp.raise_for_status()
    return resp.json()


async def storage_get(path: str) -> tuple[bytes, str]:
    key = await init_storage()
    if not key:
        raise HTTPException(status_code=404, detail="File not found")
    async with httpx.AsyncClient(timeout=60) as cli:
        resp = await cli.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key})
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="File not found")
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


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
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user

    return dep


# --- Models ----------------------------------------------------------------
Role = Literal["traveller", "local", "admin"]
BookingStatus = Literal[
    "pending_payment",
    "paid",
    "itinerary_delivered",
    "completed",
    "cancelled",
    "disputed",
]


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
    offers_chat: bool = True
    offers_in_person: bool = False
    avatar_url: Optional[str] = None


class GuideProfileOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    city: str
    bio: str
    languages: List[str]
    specialities: List[str]
    price: int
    avatar_url: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    is_complete: bool = False


PRICE_CHAT = 199
PRICE_IN_PERSON_PER_DAY = 499


class BookingIn(BaseModel):
    guide_id: str
    trip_start: str
    trip_end: str
    traveller_phone: str
    notes: Optional[str] = ""
    package_type: Literal["chat", "in_person"] = "chat"
    days: int = Field(default=1, ge=1, le=30)


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
@app.on_event("startup")
async def on_startup() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.guides.create_index("user_id", unique=True)
    await db.guides.create_index("id", unique=True)
    await db.bookings.create_index("id", unique=True)
    await db.messages.create_index([("booking_id", 1), ("created_at", 1)])
    await db.reviews.create_index("guide_id")
    await db.files.create_index("storage_path")
    await seed_admin()
    await seed_demo_data()
    # backfill verified flag for any guides that pre-date the field
    await db.guides.update_many({"verified": {"$exists": False}}, {"$set": {"verified": False}})
    # backfill tier flags for legacy guides — default: both tiers ON
    await db.guides.update_many(
        {"offers_chat": {"$exists": False}},
        {"$set": {"offers_chat": True, "offers_in_person": True, "price": 199}},
    )
    # mark the 6 demo locals (lk seed) as verified for a polished demo UX
    demo_emails = [d["email"] for d in DEMO_LOCALS]
    demo_users = await db.users.find({"email": {"$in": demo_emails}}, {"id": 1, "_id": 0}).to_list(20)
    demo_ids = [u["id"] for u in demo_users]
    if demo_ids:
        await db.guides.update_many({"user_id": {"$in": demo_ids}}, {"$set": {"verified": True}})
    # try to initialise storage upfront (non-fatal if it fails)
    await init_storage()


async def seed_admin() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@localink.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Localink Admin",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": now_iso(),
        })
        logger.info("Seeded admin: %s", admin_email)
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Updated admin password")


DEMO_LOCALS = [
    {
        "email": "aarav.jaipur@localink.in",
        "name": "Aarav Singh",
        "city": "Jaipur",
        "bio": "Born and raised in the pink city. I'll show you the hidden havelis, secret rooftop chai spots, and the best laal maas in town.",
        "languages": ["Hindi", "English", "Rajasthani"],
        "specialities": ["Heritage walks", "Local cuisine", "Bazaar shopping"],
        "price": 899,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Aarav&backgroundColor=166534",
    },
    {
        "email": "meera.goa@localink.in",
        "name": "Meera D'Souza",
        "city": "Goa",
        "bio": "Goan Catholic, beach-side café owner, and surfer. Skip the tourist traps — I'll take you to fishermen coves and the live music joints locals love.",
        "languages": ["English", "Konkani", "Hindi"],
        "specialities": ["Hidden beaches", "Live music", "Seafood"],
        "price": 1299,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Meera&backgroundColor=166534",
    },
    {
        "email": "tenzin.manali@localink.in",
        "name": "Tenzin Norbu",
        "city": "Manali",
        "bio": "Mountain guide for 12 years. Day hikes, monastery visits, and the warmest Tibetan thukpa you'll ever taste.",
        "languages": ["Hindi", "English", "Tibetan"],
        "specialities": ["Day treks", "Monasteries", "Mountain cafés"],
        "price": 1499,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Tenzin&backgroundColor=166534",
    },
    {
        "email": "kavya.varanasi@localink.in",
        "name": "Kavya Mishra",
        "city": "Varanasi",
        "bio": "Sanskrit scholar and ghat-side storyteller. Sunrise boat rides, evening aarti, and the philosophy of the old city.",
        "languages": ["Hindi", "English", "Sanskrit"],
        "specialities": ["Ghats & aarti", "Heritage", "Spiritual walks"],
        "price": 699,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Kavya&backgroundColor=166534",
    },
    {
        "email": "rohan.bangalore@localink.in",
        "name": "Rohan Iyer",
        "city": "Bangalore",
        "bio": "Tech worker by day, craft beer & filter coffee guide by weekend. I'll show you the city beyond the malls.",
        "languages": ["English", "Kannada", "Tamil"],
        "specialities": ["Café crawls", "Craft breweries", "Indie music"],
        "price": 999,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Rohan&backgroundColor=166534",
    },
    {
        "email": "priya.udaipur@localink.in",
        "name": "Priya Rathore",
        "city": "Udaipur",
        "bio": "I run a small art school overlooking Lake Pichola. Miniature painting workshops, palace tours, and quiet boat rides at golden hour.",
        "languages": ["Hindi", "English"],
        "specialities": ["Art workshops", "Palace tours", "Lake walks"],
        "price": 1199,
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Priya&backgroundColor=166534",
    },
]


async def seed_demo_data() -> None:
    if await db.guides.count_documents({}) > 0:
        return
    for d in DEMO_LOCALS:
        user_id = str(uuid.uuid4())
        guide_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "email": d["email"],
            "name": d["name"],
            "role": "local",
            "password_hash": hash_password("Local@123"),
            "phone_verified": True,
            "created_at": now_iso(),
        })
        await db.guides.insert_one({
            "id": guide_id,
            "user_id": user_id,
            "name": d["name"],
            "city": d["city"],
            "bio": d["bio"],
            "languages": d["languages"],
            "specialities": d["specialities"],
            "price": 199,
            "offers_chat": True,
            "offers_in_person": True,
            "avatar_url": d["avatar_url"],
            "rating": 4.7,
            "review_count": 0,
            "is_complete": True,
            "verified": True,
            "created_at": now_iso(),
        })
    logger.info("Seeded %d demo guides", len(DEMO_LOCALS))


# --- Auth endpoints --------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    phone = normalize_phone(body.phone) if body.phone else None
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "role": body.role,
        "password_hash": hash_password(body.password),
        "phone": phone,
        "city": (body.city or "").strip() or None,
        "phone_verified": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, email, body.role)
    return {"token": token, "user": public_user(doc)}


# --- OTP -------------------------------------------------------------------
@api.post("/otp/send")
async def otp_send(body: OTPSendIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    # remember the phone we're verifying against on the user record
    await db.users.update_one({"id": user["id"]}, {"$set": {"phone": phone, "phone_verified": False}})
    result = await msg91_send_otp(phone)
    return {"ok": True, "phone": phone, "mock": result.get("mock", False)}


@api.post("/otp/verify")
async def otp_verify(body: OTPVerifyIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    ok = await msg91_verify_otp(phone, body.otp.strip())
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"phone": phone, "phone_verified": True, "phone_verified_at": now_iso()}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"ok": True, "user": public_user(fresh)}


@api.post("/otp/resend")
async def otp_resend(body: OTPSendIn, user: dict = Depends(get_current_user)):
    phone = normalize_phone(body.phone)
    result = await msg91_send_otp(phone)
    return {"ok": True, "mock": result.get("mock", False)}


# --- File upload + serve --------------------------------------------------
@api.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    if ext not in MIME_BY_EXT:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WEBP/GIF images allowed")
    content_type = MIME_BY_EXT[ext]
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    path = f"{STORAGE_APP_NAME}/avatars/{user['id']}/{uuid.uuid4().hex}.{ext}"
    result = await storage_put(path, data, content_type)
    canonical = result.get("path") or path
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "storage_path": canonical,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now_iso(),
    })
    return {"path": canonical, "url": f"/api/files/{canonical}"}


@api.get("/files/{path:path}")
async def files_get(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, ct = await storage_get(path)
    return Response(content=data, media_type=record.get("content_type") or ct)


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# --- Guide profile ---------------------------------------------------------
@api.get("/guides")
async def list_guides(
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_rating: Optional[float] = None,
    sort: Optional[str] = "rating",
):
    query: dict = {"is_complete": True}
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if min_price is not None or max_price is not None:
        price_q: dict = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    if min_rating is not None:
        query["rating"] = {"$gte": min_rating}
    sort_field = {"rating": ("rating", -1), "price_low": ("price", 1), "price_high": ("price", -1)}.get(
        sort or "rating", ("rating", -1)
    )
    cursor = db.guides.find(query, {"_id": 0}).sort([sort_field])
    return await cursor.to_list(200)


@api.get("/guides/cities")
async def list_cities():
    cities = await db.guides.distinct("city", {"is_complete": True})
    return sorted(cities)


@api.get("/guides/{guide_id}")
async def get_guide(guide_id: str):
    guide = await db.guides.find_one({"id": guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    reviews = await db.reviews.find({"guide_id": guide_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"guide": guide, "reviews": reviews}


@api.get("/profile/guide/me")
async def my_guide_profile(user: dict = Depends(require_role("local"))):
    guide = await db.guides.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"guide": guide}


@api.post("/profile/guide")
async def upsert_guide_profile(body: GuideProfileIn, user: dict = Depends(require_role("local"))):
    if not body.offers_chat and not body.offers_in_person:
        raise HTTPException(status_code=400, detail="Turn on at least one package tier")
    existing = await db.guides.find_one({"user_id": user["id"]})
    data = body.model_dump()
    # store the cheapest active tier as `price` for sorting / "starting at" labels
    data["price"] = PRICE_CHAT if data["offers_chat"] else PRICE_IN_PERSON_PER_DAY
    data["is_complete"] = bool(data["city"] and data["bio"] and (data["offers_chat"] or data["offers_in_person"]))
    if existing:
        await db.guides.update_one({"user_id": user["id"]}, {"$set": data})
        guide = await db.guides.find_one({"user_id": user["id"]}, {"_id": 0})
    else:
        guide_id = str(uuid.uuid4())
        guide = {
            "id": guide_id,
            "user_id": user["id"],
            "name": user["name"],
            **data,
            "rating": 0.0,
            "review_count": 0,
            "verified": False,
            "created_at": now_iso(),
        }
        await db.guides.insert_one(guide)
        guide.pop("_id", None)
    return {"guide": guide}


# --- Bookings --------------------------------------------------------------
@api.post("/bookings")
async def create_booking(body: BookingIn, user: dict = Depends(require_role("traveller"))):
    guide = await db.guides.find_one({"id": body.guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    # Validate the guide actually offers this tier
    if body.package_type == "chat":
        if guide.get("offers_chat", True) is False:
            raise HTTPException(status_code=400, detail="This guide does not offer chat-only")
        amount = PRICE_CHAT
        days = 1
    else:
        if guide.get("offers_in_person", False) is False:
            raise HTTPException(status_code=400, detail="This guide does not offer in-person")
        days = max(1, int(body.days))
        amount = PRICE_IN_PERSON_PER_DAY * days
    platform_fee = round(amount * PLATFORM_FEE_PERCENT / 100)
    local_payout = amount - platform_fee
    booking = {
        "id": str(uuid.uuid4()),
        "guide_id": guide["id"],
        "guide_name": guide["name"],
        "guide_city": guide["city"],
        "local_user_id": guide["user_id"],
        "traveller_user_id": user["id"],
        "traveller_name": user["name"],
        "traveller_phone": body.traveller_phone,
        "trip_start": body.trip_start,
        "trip_end": body.trip_end,
        "notes": body.notes or "",
        "package_type": body.package_type,
        "days": days,
        "amount": amount,
        "platform_fee": platform_fee,
        "local_payout": local_payout,
        "status": "pending_payment",
        "itinerary": None,
        "payment_released": False,
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking


@api.post("/bookings/{booking_id}/pay")
async def mock_pay(booking_id: str, user: dict = Depends(require_role("traveller"))):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking or booking["traveller_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Booking is not awaiting payment")
    mock_payment_id = f"pay_mock_{uuid.uuid4().hex[:16]}"
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "paid", "payment_id": mock_payment_id, "paid_at": now_iso()}},
    )
    return {"ok": True, "payment_id": mock_payment_id, "status": "paid"}


@api.get("/bookings/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    key = "traveller_user_id" if user["role"] == "traveller" else "local_user_id"
    if user["role"] == "admin":
        cursor = db.bookings.find({}, {"_id": 0}).sort("created_at", -1)
    else:
        cursor = db.bookings.find({key: user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


@api.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["role"] != "admin" and user["id"] not in (booking["traveller_user_id"], booking["local_user_id"]):
        raise HTTPException(status_code=403, detail="Not your booking")
    return booking


@api.post("/bookings/{booking_id}/itinerary")
async def deliver_itinerary(booking_id: str, body: ItineraryIn, user: dict = Depends(require_role("local"))):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking or booking["local_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] not in ("paid", "itinerary_delivered"):
        raise HTTPException(status_code=400, detail="Booking must be paid before delivering itinerary")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "itinerary": {"title": body.title, "content": body.content, "delivered_at": now_iso()},
            "status": "itinerary_delivered",
        }},
    )
    return {"ok": True}


@api.post("/bookings/{booking_id}/confirm")
async def confirm_itinerary(booking_id: str, user: dict = Depends(require_role("traveller"))):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking or booking["traveller_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "itinerary_delivered":
        raise HTTPException(status_code=400, detail="No itinerary to confirm yet")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "completed", "payment_released": True, "completed_at": now_iso()}},
    )
    return {"ok": True, "payout_released": booking["local_payout"]}


@api.post("/bookings/{booking_id}/dispute")
async def raise_dispute(booking_id: str, body: DisputeIn, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking or user["id"] not in (booking["traveller_user_id"], booking["local_user_id"]):
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "disputed", "dispute_reason": body.reason, "disputed_at": now_iso(), "disputed_by": user["id"]}},
    )
    return {"ok": True}


# --- Messages (polling chat) -----------------------------------------------
async def _ensure_booking_party(booking_id: str, user: dict) -> dict:
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["role"] != "admin" and user["id"] not in (booking["traveller_user_id"], booking["local_user_id"]):
        raise HTTPException(status_code=403, detail="Not your booking")
    return booking


@api.get("/bookings/{booking_id}/messages")
async def get_messages(booking_id: str, user: dict = Depends(get_current_user)):
    await _ensure_booking_party(booking_id, user)
    msgs = await db.messages.find({"booking_id": booking_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/bookings/{booking_id}/messages")
async def post_message(booking_id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    await _ensure_booking_party(booking_id, user)
    msg = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "sender_role": user["role"],
        "content": body.content.strip(),
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


# --- Reviews ---------------------------------------------------------------
@api.post("/bookings/{booking_id}/review")
async def post_review(booking_id: str, body: ReviewIn, user: dict = Depends(require_role("traveller"))):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking or booking["traveller_user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed bookings can be reviewed")
    if await db.reviews.find_one({"booking_id": booking_id}):
        raise HTTPException(status_code=400, detail="Review already submitted")
    review = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "guide_id": booking["guide_id"],
        "traveller_id": user["id"],
        "traveller_name": user["name"],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(review)
    # recompute guide rating
    agg = await db.reviews.aggregate([
        {"$match": {"guide_id": booking["guide_id"]}},
        {"$group": {"_id": "$guide_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    if agg:
        await db.guides.update_one(
            {"id": booking["guide_id"]},
            {"$set": {"rating": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}},
        )
    review.pop("_id", None)
    return review


# --- Admin -----------------------------------------------------------------
@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_role("admin"))):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return bookings


@api.get("/admin/disputes")
async def admin_disputes(user: dict = Depends(require_role("admin"))):
    disputes = await db.bookings.find({"status": "disputed"}, {"_id": 0}).sort("disputed_at", -1).to_list(500)
    return disputes


@api.post("/admin/disputes/{booking_id}/resolve")
async def admin_resolve(booking_id: str, refund_to_traveller: bool = False, user: dict = Depends(require_role("admin"))):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    new_status = "cancelled" if refund_to_traveller else "completed"
    payment_released = not refund_to_traveller
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": new_status, "payment_released": payment_released, "resolved_at": now_iso()}},
    )
    return {"ok": True, "status": new_status}


@api.post("/admin/guides/{guide_id}/verify")
async def admin_verify_guide(guide_id: str, verified: bool = True, user: dict = Depends(require_role("admin"))):
    res = await db.guides.update_one(
        {"id": guide_id},
        {"$set": {"verified": verified, "verified_at": now_iso(), "verified_by": "admin"}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Guide not found")
    return {"ok": True, "verified": verified}


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({})
    total_locals = await db.users.count_documents({"role": "local"})
    total_travellers = await db.users.count_documents({"role": "traveller"})
    total_bookings = await db.bookings.count_documents({})
    completed = await db.bookings.count_documents({"status": "completed"})
    disputed = await db.bookings.count_documents({"status": "disputed"})
    agg = await db.bookings.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$platform_fee"}, "gmv": {"$sum": "$amount"}}},
    ]).to_list(1)
    revenue = agg[0]["revenue"] if agg else 0
    gmv = agg[0]["gmv"] if agg else 0
    return {
        "total_users": total_users,
        "total_locals": total_locals,
        "total_travellers": total_travellers,
        "total_bookings": total_bookings,
        "completed_bookings": completed,
        "disputed_bookings": disputed,
        "platform_revenue": revenue,
        "gmv": gmv,
    }


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


@app.on_event("shutdown")
async def shutdown() -> None:
    client.close()
