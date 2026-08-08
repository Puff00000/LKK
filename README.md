# LKK — Log Kya Kahenge

**Travel like a local.** LKK is a two-sided marketplace connecting travellers with verified locals for bite-sized, in-person experiences — bargaining a market, a street food crawl, chasing the sunrise. Bookings run 2–8 hours, starting at ₹499.

🌐 [lkk.co.in](https://www.lkk.co.in)

---

## What this is

A traveller books a short, in-person experience with a local guide in their destination city. Payment is held by LKK until the traveller confirms the meetup happened, locals go through video-based identity verification before they can list anything, and either side can raise a dispute if something goes wrong.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI (Python 3.11), served via Uvicorn |
| Database | PostgreSQL (Supabase), accessed directly via `asyncpg` |
| File storage | Supabase Storage (avatars, intro videos) |
| Frontend | React (Create React App + CRACO), Tailwind CSS, shadcn/ui |
| Payments | Razorpay (checkout + RazorpayX for local payouts) |
| Email | Resend |
| SMS / OTP | MSG91 (falls back to a mock code in local dev if unconfigured) |
| Hosting | Backend on Render, frontend on Vercel |

## Features

- **Two roles**: Travellers browse and book; Locals list experiences and host them
- **Identity verification**: profile photo and intro video are captured live via the browser camera (no gallery upload) — admin-reviewed before a local can list a service
- **Phone verification**: OTP-based, required before a local's dashboard unlocks
- **Email verification**: required before first login
- **Booking flow**: Razorpay checkout → payment held → local accepts → itinerary delivered → traveller confirms completion → payout released
- **In-app chat**: per-booking messaging to coordinate meetup details
- **Reviews & ratings**
- **Dispute resolution**: either party can raise a dispute; resolved by an admin
- **Admin panel**: user management, video moderation, dispute resolution, local bank/payout verification, platform stats
- **Account deletion**: soft-delete with anonymization — a person's own identifying info is scrubbed, but booking/review history tied to the *other* party in a transaction is preserved

## Project structure

```
LKK/
├── backend/
│   ├── server.py          # entire FastAPI app
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/         # route-level components
│   │   ├── components/    # shared components, shadcn/ui primitives
│   │   ├── contexts/       # AuthContext
│   │   └── lib/            # api client, helpers
│   └── craco.config.js
└── migrations/             # SQL migrations to run manually in Supabase
```

## Running locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### Frontend
```bash
cd frontend
yarn install   # or npm install
yarn start     # craco start
```

### Environment variables

**Backend** (required unless noted):
| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs auth tokens |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | File storage (avatars, videos) |
| `RESEND_API_KEY` | Optional — email logs to console if unset |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `RAZORPAY_X_ACCOUNT_NUMBER` | Optional — local payouts |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Optional — falls back to mock OTP (`123456`) if unset |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeds the first admin account on startup if it doesn't already exist |
| `CORS_ORIGINS` | Comma-separated exact origins, e.g. `https://www.lkk.co.in,https://lkk.co.in` |
| `FRONTEND_URL` | Optional — used to build links in emails |

**Frontend**:
| Variable | Notes |
|---|---|
| `REACT_APP_BACKEND_URL` | Base URL of the backend API (without `/api`) |

### Database migrations

SQL migrations live in `/migrations` and are **not** run automatically — apply them manually in Supabase's SQL Editor before deploying code that depends on them.

## Deployment

- **Backend**: Render, auto-deploys from `main`. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Frontend**: Vercel, auto-deploys from `main`
- **Database**: Supabase (Postgres + Storage)

## Security notes

- Row Level Security (RLS) is enabled on all Supabase tables
- Rate limiting is applied to auth endpoints (`slowapi`)
- Passwords hashed with `bcrypt`; JWTs signed with `HS256`
- See `/backend/tests` for the auth/booking test suite
