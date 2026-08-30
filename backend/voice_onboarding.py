"""
Voice onboarding — lets a local guide fill their profile/listing by speaking
instead of typing, in their own language.

Flow: browser records speech -> browser's own speech-to-text turns it into
text (free, client-side, see frontend) -> that text is sent here -> an LLM
translates + extracts it into the exact fields your normal forms use ->
validated against the SAME rules as manual entry -> returned as a draft.

This module never writes to the database. The frontend shows the guide the
draft, lets them edit it, and only on "Confirm" does it call your existing
POST /api/profile/guide or POST /api/services endpoints — exactly as if
they'd typed it. That keeps voice and manual entry on one validation path.
"""
import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("voice_onboarding")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")
GROQ_API_BASE = "https://api.groq.com/openai/v1"

router = APIRouter(prefix="/api/agent")

# Supported languages for the picker on the frontend. The BCP-47-ish codes
# here are what you pass to the browser's SpeechRecognition (lang=...);
# the LLM only ever sees English + the language's plain name for context.
SUPPORTED_LANGUAGES = {
    "hi-IN": "Hindi",
    "or-IN": "Odia",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "mr-IN": "Marathi",
    "bn-IN": "Bengali",
    "gu-IN": "Gujarati",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "pa-IN": "Punjabi",
    "en-IN": "English",
}


# --- What we're allowed to extract, and the rules we check it against ------
# These mirror GuideProfileIn / ServiceIn / SERVICE_CATEGORIES /
# SERVICE_MIN_HOURS / SERVICE_MAX_HOURS in server.py on purpose — kept as a
# separate lightweight copy here so this module has no import-order
# dependency on server.py. If those constants ever change, update both.
SERVICE_CATEGORIES = ["food", "shopping", "culture", "photography", "experience", "nature"]
SERVICE_MIN_HOURS = 2
SERVICE_MAX_HOURS = 8


class ProfileDraft(BaseModel):
    city: Optional[str] = None
    bio: Optional[str] = None
    languages: List[str] = []
    specialities: List[str] = []


class ServiceDraft(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    duration_hours: Optional[int] = None
    cost_note: Optional[str] = None


class VoiceExtractIn(BaseModel):
    transcript: str
    target: Literal["profile", "service"]
    language_code: str = "hi-IN"


class VoiceExtractOut(BaseModel):
    audit_id: str
    target: Literal["profile", "service"]
    extracted: dict
    warnings: List[str]


PROFILE_SYSTEM_PROMPT = """You are helping a local tour guide in India fill out their profile on a \
travel marketplace app. They spoke in {language}; here is what they said, already \
transcribed to text (the transcript itself is still in {language}, not translated).

Read it, translate the meaning into English, and return ONLY a JSON object with these \
fields (omit a field entirely if it genuinely wasn't mentioned — do not guess or invent \
a value):
- "city": string, the city/town they are based in
- "bio": string, 1-3 sentences about them, written in friendly English for a traveller to read
- "languages": array of strings, languages they say they can speak with travellers
- "specialities": array of strings, short tags for what they're known for (e.g. "street food", "trekking")

Return raw JSON only. No markdown, no explanation, no code fences."""

SERVICE_SYSTEM_PROMPT = """You are helping a local tour guide in India list an experience on a \
travel marketplace app. They spoke in {language}; here is what they said, already \
transcribed to text (the transcript itself is still in {language}, not translated).

Read it, translate the meaning into English, and return ONLY a JSON object with these \
fields (omit a field entirely if it genuinely wasn't mentioned — do not guess or invent \
a value):
- "title": string, a short catchy title for the experience, in English
- "description": string, 2-4 sentences describing what the traveller will do, in English
- "category": string, must be exactly one of: {categories} — pick the closest match, \
or omit this field if nothing fits
- "duration_hours": integer, how many hours the experience takes. If they mention days, \
convert to hours as best you can.
- "cost_note": string, any note about extra costs the traveller should expect (entry \
tickets, food, etc.), or omit if not mentioned

Return raw JSON only. No markdown, no explanation, no code fences."""


async def _call_groq(system_prompt: str, transcript: str) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Voice onboarding isn't configured (missing GROQ_API_KEY).")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{GROQ_API_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
        )
    if resp.status_code != 200:
        logger.error("Groq call failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Voice extraction service is unavailable right now.")
    data = resp.json()
    raw = data["choices"][0]["message"]["content"]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Groq returned non-JSON: %s", raw)
        raise HTTPException(status_code=502, detail="Could not understand the recording. Please try again.")


def _validate_profile(extracted: dict) -> tuple[dict, list[str]]:
    warnings: List[str] = []
    try:
        draft = ProfileDraft(**extracted)
    except ValidationError as e:
        # Field-level types the LLM might get wrong (e.g. languages as a
        # string instead of a list) — drop the offending field rather than
        # fail the whole draft, and tell the guide it needs a manual check.
        cleaned = {k: v for k, v in extracted.items() if k in ProfileDraft.model_fields}
        for err in e.errors():
            field = err["loc"][0] if err["loc"] else "field"
            cleaned.pop(field, None)
            warnings.append(f"Couldn't read '{field}' clearly — please check it.")
        draft = ProfileDraft(**cleaned)
    result = draft.model_dump(exclude_none=True)
    if not result.get("city"):
        warnings.append("Didn't catch a city — please fill that in.")
    if not result.get("bio"):
        warnings.append("Didn't catch a bio — please fill that in.")
    return result, warnings


def _validate_service(extracted: dict) -> tuple[dict, list[str]]:
    warnings: List[str] = []
    try:
        draft = ServiceDraft(**extracted)
    except ValidationError as e:
        cleaned = {k: v for k, v in extracted.items() if k in ServiceDraft.model_fields}
        for err in e.errors():
            field = err["loc"][0] if err["loc"] else "field"
            cleaned.pop(field, None)
            warnings.append(f"Couldn't read '{field}' clearly — please check it.")
        draft = ServiceDraft(**cleaned)
    result = draft.model_dump(exclude_none=True)

    # Same bounds as SERVICE_MIN_HOURS/SERVICE_MAX_HOURS in server.py — flag,
    # don't silently clamp, so the guide sees exactly what was misheard.
    hours = result.get("duration_hours")
    if hours is not None and not (SERVICE_MIN_HOURS <= hours <= SERVICE_MAX_HOURS):
        warnings.append(f"Heard {hours} hours, which is outside the {SERVICE_MIN_HOURS}-{SERVICE_MAX_HOURS} hour range — please correct it.")
        result.pop("duration_hours", None)

    category = result.get("category")
    if category is not None and category not in SERVICE_CATEGORIES:
        warnings.append(f"Couldn't match a real category from '{category}' — please pick one.")
        result.pop("category", None)

    if not result.get("title"):
        warnings.append("Didn't catch a title — please fill that in.")
    if not result.get("duration_hours"):
        warnings.append("Didn't catch a duration — please fill that in.")

    return result, warnings


async def _write_audit(db_pool, user_id: str, target: str, language_code: str,
                        transcript: str, extracted: dict, warnings: list) -> str:
    audit_id = str(uuid.uuid4())
    try:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO voice_onboarding_audit
                   (id, user_id, target, language_code, raw_transcript, extracted_json, warnings, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
                audit_id, user_id, target, language_code, transcript,
                json.dumps(extracted), json.dumps(warnings), datetime.now(timezone.utc),
            )
    except Exception:
        # Audit logging is a nice-to-have for the pitch, not something that
        # should ever block a guide from actually onboarding.
        logger.exception("Failed to write voice_onboarding_audit row")
    return audit_id


def build_router(db_pool_getter, require_role):
    """server.py calls this once at startup, passing its own db_pool getter
    and require_role() dependency, so this module shares the same auth and
    connection pool instead of standing up its own."""

    @router.post("/voice-extract", response_model=VoiceExtractOut)
    async def voice_extract(body: VoiceExtractIn, user: dict = Depends(require_role("local"))):
        if not body.transcript.strip():
            raise HTTPException(status_code=400, detail="No speech was captured — please try recording again.")

        language = SUPPORTED_LANGUAGES.get(body.language_code, "the local language")
        if body.target == "profile":
            prompt = PROFILE_SYSTEM_PROMPT.format(language=language)
            raw = await _call_groq(prompt, body.transcript)
            extracted, warnings = _validate_profile(raw)
        else:
            prompt = SERVICE_SYSTEM_PROMPT.format(language=language, categories=", ".join(SERVICE_CATEGORIES))
            raw = await _call_groq(prompt, body.transcript)
            extracted, warnings = _validate_service(raw)

        db_pool = db_pool_getter()
        audit_id = await _write_audit(
            db_pool, str(user["id"]), body.target, body.language_code,
            body.transcript, extracted, warnings,
        )
        return VoiceExtractOut(audit_id=audit_id, target=body.target, extracted=extracted, warnings=warnings)

    return router
