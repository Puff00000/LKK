# Localink Auth Testing

## Admin credentials
- Email: `admin@localink.in`
- Password: `Admin@123`

## Auth flow (Bearer token, no cookies)
- `POST /api/auth/register` → `{ token, user }`
- `POST /api/auth/login` → `{ token, user }`
- `GET /api/auth/me` → `{ user }` (requires `Authorization: Bearer <token>`)
- Token is stored in `localStorage["localink_token"]` on frontend.

## Test
```bash
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)
TOKEN=$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@localink.in","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
```
