# LKK — PRD

## Problem statement
Two-sided marketplace connecting Indian domestic travellers with verified local guides in their destination city. Travellers book a package (₹499–₹1999), locals deliver a custom itinerary + chat support, with optional in-person meetup.

## User personas
- **Traveller** — Indian domestic tourist who wants to skip generic tours and travel with a real local.
- **Local guide** — Resident of a tourist city who wants to monetize their local knowledge.
- **Admin** — LKK operations staff handling disputes and oversight.

## Stack
- **Backend**: FastAPI + MongoDB (Motor) + PyJWT + bcrypt
- **Frontend**: React 19 + Tailwind + shadcn/ui + sonner
- **Auth**: Custom JWT (Bearer token in localStorage), bcrypt password hashing
- **Payments**: MOCKED Razorpay (test mode placeholder — real Razorpay can be plugged in later via `/api/bookings/{id}/pay`)
- **Chat**: Polling-based (4-second interval)

## Business logic
- Platform takes **10%** of every booking; local gets **90%**.
- Booking lifecycle: `pending_payment → paid → itinerary_delivered → completed` (payment released).
- Optional: `cancelled` or `disputed` paths.
- Locals must complete their profile (city + bio + price) to appear in browse.

## Implemented (Feb 2026)
- Backend: full auth (register/login/me), guide CRUD, browse with filters (city, price, sort), bookings (create, mock-pay, list, get, deliver itinerary, confirm, dispute, review), polling chat, admin endpoints (users, bookings, disputes, stats, resolve).
- Frontend: Landing, Browse (filters + search), Guide profile + reviews, Auth (login + register with role), Booking flow (2-step with calendar + mock pay), Traveller dashboard, Local dashboard + profile edit, Booking detail (itinerary delivery + chat + confirm + dispute + review), Admin panel (4 stats + tabs for bookings/users/disputes).
- Seeded admin + 6 demo locals across 6 Indian cities.

## Backlog (next phases)
- **P1** — Real Razorpay test integration (replace `/api/bookings/{id}/pay` mock).
- **P1** — File uploads for guide avatar / itinerary attachments (object storage).
- **P2** — Email notifications (booking confirmed, itinerary delivered).
- **P2** — Trip date conflict checks per local.
- **P2** — Refund flow with reversal accounting.
- **P3** — Wishlist / save locals.
- **P3** — Multi-day itinerary builder (drag-and-drop).
- **P3** — Localised content (Hindi/regional).
