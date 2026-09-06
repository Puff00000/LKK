# LKK — PRD

## Problem statement
Two-sided marketplace connecting Indian domestic travellers with verified local guides in their destination city. Travellers book a package (₹499–₹1999), locals deliver a custom itinerary + chat support, with optional in-person meetup.

## User personas
- **Traveller** — Indian domestic tourist who wants to skip generic tours and travel with a real local.
- **Local guide** — Resident of a tourist city who wants to monetize their local knowledge.
- **Admin** — LKK operations staff handling disputes and oversight.

## Stack
- **Backend**: FastAPI + PostgreSQL (Supabase) via `asyncpg` + PyJWT + bcrypt
- **Frontend**: React 19 + Tailwind + shadcn/ui + sonner
- **Auth**: Custom JWT, httpOnly cookie (`lkk_token`) as the primary path — not readable by JS, closes localStorage XSS exposure; Bearer header kept as a fallback for direct API/tooling use. Bcrypt password hashing.
- **Payments**: Real Razorpay — Orders API + client-side signature verification, with a signed webhook (`/webhooks/razorpay`) as a backstop for when the browser closes before the frontend's verify call fires.
- **Chat**: Polling-based (4-second interval)
- **Voice onboarding AI**: Browser-native speech-to-text (free, client-side) → Groq API (`openai/gpt-oss-120b`, configurable via env var) for multilingual translation + structured extraction → validated against the same Pydantic rules as manual entry before ever reaching the guide's draft

## Business logic
- Platform takes **10%** of every booking; local gets **90%**.
- Booking lifecycle: `requested → awaiting_payment → accepted → itinerary_delivered → completed` (payment released).
- Optional: `cancelled` or `disputed` paths.
- Locals must complete their profile (city + bio + price) to appear in browse.

## Implemented (Feb 2026)
- Backend: full auth (register/login/me), guide CRUD, browse with filters (city, price, sort), bookings (create, Razorpay pay, list, get, deliver itinerary, confirm, dispute, review), polling chat, admin endpoints (users, bookings, disputes, stats, resolve).
- Frontend: Landing, Browse (filters + search), Guide profile + reviews, Auth (login + register with role), Booking flow (2-step with calendar + Razorpay checkout), Traveller dashboard, Local dashboard + profile edit, Booking detail (itinerary delivery + chat + confirm + dispute + review), Admin panel (4 stats + tabs for bookings/users/disputes).
- Seeded admin + 6 demo locals across 6 Indian cities.

## Backlog (next phases)
- **P1** — File uploads for guide avatar / itinerary attachments (object storage).
- **P2** — Email notifications (booking confirmed, itinerary delivered).
- **P2** — Trip date conflict checks per local.
- **P2** — Refund flow with reversal accounting.
- **P3** — Wishlist / save locals.
- **P3** — Multi-day itinerary builder (drag-and-drop).
- **P3** — Extend voice onboarding's localized UI text beyond Hindi/Odia to the other 9 supported speech languages (currently English-only screen text for those).
