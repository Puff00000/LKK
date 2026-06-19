"""End-to-end pytest suite for Localink backend APIs."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL.rstrip('/')}/api"

ADMIN_EMAIL = "admin@localink.in"
ADMIN_PASSWORD = "Admin@123"
LOCAL_EMAIL = "aarav.jaipur@localink.in"
LOCAL_PASSWORD = "Local@123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def state(session):
    """Shared state across tests."""
    return {}


# --- Health ---
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "service": "localink"}


# --- Auth ---
def test_admin_login(session, state):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["role"] == "admin"
    state["admin_token"] = data["token"]


def test_register_traveller(session, state):
    email = f"TEST_traveller_{uuid.uuid4().hex[:8]}@test.com".lower()
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@123", "name": "Test Traveller", "role": "traveller"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "traveller"
    assert data["user"]["email"] == email
    state["traveller_token"] = data["token"]
    state["traveller_user"] = data["user"]
    state["traveller_email"] = email


def test_register_local(session, state):
    email = f"TEST_local_{uuid.uuid4().hex[:8]}@test.com".lower()
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@123", "name": "Test Local", "role": "local"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["role"] == "local"
    state["new_local_token"] = data["token"]
    state["new_local_user"] = data["user"]


def test_register_duplicate(session, state):
    r = session.post(f"{API}/auth/register", json={
        "email": state["traveller_email"], "password": "Test@123",
        "name": "Dup", "role": "traveller"
    })
    assert r.status_code == 400


def test_auth_me(session, state):
    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {state['traveller_token']}"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == state["traveller_email"]


def test_auth_me_no_token(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


# --- Guides ---
def test_list_guides_seeded(session, state):
    r = session.get(f"{API}/guides")
    assert r.status_code == 200
    guides = r.json()
    names = {g["name"] for g in guides}
    expected = {"Aarav Singh", "Meera D'Souza", "Tenzin Norbu", "Kavya Mishra", "Rohan Iyer", "Priya Rathore"}
    assert expected.issubset(names), f"Missing guides: {expected - names}"
    state["guides"] = guides
    state["jaipur_guide"] = next(g for g in guides if g["city"] == "Jaipur")


def test_filter_by_city(session):
    r = session.get(f"{API}/guides", params={"city": "Jaipur"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert all(g["city"].lower() == "jaipur" for g in data)


def test_filter_by_price(session):
    r = session.get(f"{API}/guides", params={"min_price": 499, "max_price": 1000})
    assert r.status_code == 200
    data = r.json()
    assert all(499 <= g["price"] <= 1000 for g in data)
    assert len(data) >= 1


def test_list_cities(session):
    r = session.get(f"{API}/guides/cities")
    assert r.status_code == 200
    cities = r.json()
    assert isinstance(cities, list)
    assert cities == sorted(cities)
    assert "Jaipur" in cities


def test_get_guide_detail(session, state):
    gid = state["jaipur_guide"]["id"]
    r = session.get(f"{API}/guides/{gid}")
    assert r.status_code == 200
    d = r.json()
    assert "guide" in d and "reviews" in d
    assert d["guide"]["id"] == gid
    assert isinstance(d["reviews"], list)


# --- Guide Profile (local upsert) ---
def test_local_upsert_profile(session, state):
    headers = {"Authorization": f"Bearer {state['new_local_token']}"}
    r = session.post(f"{API}/profile/guide", json={
        "city": "Delhi", "bio": "Test bio for delhi local",
        "languages": ["Hindi", "English"], "specialities": ["Street food"],
        "price": 799
    }, headers=headers)
    assert r.status_code == 200, r.text
    g = r.json()["guide"]
    assert g["city"] == "Delhi"
    assert g["price"] == 799
    state["new_guide_id"] = g["id"]


def test_local_profile_price_validation(session, state):
    headers = {"Authorization": f"Bearer {state['new_local_token']}"}
    r = session.post(f"{API}/profile/guide", json={
        "city": "Delhi", "bio": "x", "price": 100, "languages": [], "specialities": []
    }, headers=headers)
    assert r.status_code == 422


# --- Bookings full flow ---
def test_create_booking(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    gid = state["jaipur_guide"]["id"]
    r = session.post(f"{API}/bookings", json={
        "guide_id": gid,
        "trip_start": "2026-03-01",
        "trip_end": "2026-03-03",
        "traveller_phone": "+919876543210",
        "notes": "First time visit"
    }, headers=headers)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "pending_payment"
    assert b["amount"] == state["jaipur_guide"]["price"]
    assert b["platform_fee"] == round(b["amount"] * 0.10)
    assert b["local_payout"] == b["amount"] - b["platform_fee"]
    state["booking_id"] = b["id"]
    state["local_user_id"] = b["local_user_id"]


def test_role_traveller_cannot_deliver_itinerary(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    r = session.post(f"{API}/bookings/{state['booking_id']}/itinerary",
                     json={"title": "x", "content": "y"}, headers=headers)
    assert r.status_code == 403


def test_mock_pay(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    r = session.post(f"{API}/bookings/{state['booking_id']}/pay", headers=headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "paid"
    assert d["payment_id"].startswith("pay_mock_")
    # Verify persistence
    r2 = session.get(f"{API}/bookings/{state['booking_id']}", headers=headers)
    assert r2.json()["status"] == "paid"


def test_role_local_cannot_pay(session, state):
    # Login as the local who owns the Jaipur guide
    r = session.post(f"{API}/auth/login", json={"email": LOCAL_EMAIL, "password": LOCAL_PASSWORD})
    assert r.status_code == 200
    local_token = r.json()["token"]
    state["jaipur_local_token"] = local_token

    # Create a second booking for the same guide by traveller, then attempt pay as local
    headers_t = {"Authorization": f"Bearer {state['traveller_token']}"}
    r2 = session.post(f"{API}/bookings", json={
        "guide_id": state["jaipur_guide"]["id"],
        "trip_start": "2026-04-01", "trip_end": "2026-04-02",
        "traveller_phone": "+911", "notes": ""
    }, headers=headers_t)
    bid = r2.json()["id"]

    headers_l = {"Authorization": f"Bearer {local_token}"}
    r3 = session.post(f"{API}/bookings/{bid}/pay", headers=headers_l)
    assert r3.status_code == 403


def test_non_party_cannot_read_booking(session, state):
    # Use new local who isn't party
    headers = {"Authorization": f"Bearer {state['new_local_token']}"}
    r = session.get(f"{API}/bookings/{state['booking_id']}", headers=headers)
    assert r.status_code == 403


def test_deliver_itinerary(session, state):
    headers = {"Authorization": f"Bearer {state['jaipur_local_token']}"}
    r = session.post(f"{API}/bookings/{state['booking_id']}/itinerary", json={
        "title": "Day 1 - Pink City Walk",
        "content": "9am: City Palace. 12pm: lunch at LMB. 4pm: bazaar walk."
    }, headers=headers)
    assert r.status_code == 200, r.text
    # verify
    r2 = session.get(f"{API}/bookings/{state['booking_id']}", headers=headers)
    b = r2.json()
    assert b["status"] == "itinerary_delivered"
    assert b["itinerary"]["title"] == "Day 1 - Pink City Walk"


def test_confirm_completes_booking(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    r = session.post(f"{API}/bookings/{state['booking_id']}/confirm", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["payout_released"] > 0

    r2 = session.get(f"{API}/bookings/{state['booking_id']}", headers=headers)
    b = r2.json()
    assert b["status"] == "completed"
    assert b["payment_released"] is True


def test_review_after_completion(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    r = session.post(f"{API}/bookings/{state['booking_id']}/review", json={
        "rating": 5, "comment": "Excellent"
    }, headers=headers)
    assert r.status_code == 200, r.text
    # Guide rating should be recomputed
    gid = state["jaipur_guide"]["id"]
    r2 = session.get(f"{API}/guides/{gid}")
    g = r2.json()["guide"]
    assert g["review_count"] >= 1


# --- Messages (polling chat) ---
def test_chat_messages(session, state):
    # Need a booking where both parties are valid; use confirmed booking_id
    headers_t = {"Authorization": f"Bearer {state['traveller_token']}"}
    headers_l = {"Authorization": f"Bearer {state['jaipur_local_token']}"}
    r1 = session.post(f"{API}/bookings/{state['booking_id']}/messages",
                      json={"content": "Hello from traveller"}, headers=headers_t)
    assert r1.status_code == 200
    r2 = session.post(f"{API}/bookings/{state['booking_id']}/messages",
                      json={"content": "Hi from local"}, headers=headers_l)
    assert r2.status_code == 200
    r3 = session.get(f"{API}/bookings/{state['booking_id']}/messages", headers=headers_t)
    assert r3.status_code == 200
    msgs = r3.json()
    assert len(msgs) >= 2
    contents = [m["content"] for m in msgs]
    assert "Hello from traveller" in contents
    assert "Hi from local" in contents


# --- Dispute flow ---
def test_dispute_and_resolve(session, state):
    headers_t = {"Authorization": f"Bearer {state['traveller_token']}"}
    # Create a fresh booking, pay, then dispute
    r = session.post(f"{API}/bookings", json={
        "guide_id": state["jaipur_guide"]["id"],
        "trip_start": "2026-05-01", "trip_end": "2026-05-02",
        "traveller_phone": "+911", "notes": "dispute test"
    }, headers=headers_t)
    bid = r.json()["id"]
    session.post(f"{API}/bookings/{bid}/pay", headers=headers_t)

    rd = session.post(f"{API}/bookings/{bid}/dispute",
                      json={"reason": "Local unresponsive"}, headers=headers_t)
    assert rd.status_code == 200

    # admin resolve
    headers_a = {"Authorization": f"Bearer {state['admin_token']}"}
    rl = session.get(f"{API}/admin/disputes", headers=headers_a)
    assert rl.status_code == 200
    assert any(b["id"] == bid for b in rl.json())

    rr = session.post(f"{API}/admin/disputes/{bid}/resolve",
                      params={"refund_to_traveller": "true"}, headers=headers_a)
    assert rr.status_code == 200
    assert rr.json()["status"] == "cancelled"


# --- Admin endpoints ---
def test_admin_stats(session, state):
    headers = {"Authorization": f"Bearer {state['admin_token']}"}
    r = session.get(f"{API}/admin/stats", headers=headers)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_users", "total_locals", "total_travellers", "total_bookings",
              "platform_revenue", "gmv"]:
        assert k in d
    assert d["total_users"] >= 7  # admin + 6 demo locals
    assert d["gmv"] >= state["jaipur_guide"]["price"]


def test_admin_users(session, state):
    headers = {"Authorization": f"Bearer {state['admin_token']}"}
    r = session.get(f"{API}/admin/users", headers=headers)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list) and len(users) >= 7
    assert all("password_hash" not in u for u in users)


def test_admin_bookings(session, state):
    headers = {"Authorization": f"Bearer {state['admin_token']}"}
    r = session.get(f"{API}/admin/bookings", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_endpoint_forbidden_for_traveller(session, state):
    headers = {"Authorization": f"Bearer {state['traveller_token']}"}
    r = session.get(f"{API}/admin/stats", headers=headers)
    assert r.status_code == 403
