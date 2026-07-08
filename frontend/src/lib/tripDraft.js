// A "trip draft" (destination city + dates, chosen before the traveller has
// even logged in) lives only for the current browser session. It only becomes
// a real, saved `trips` row on the backend the moment the traveller logs in
// and creates their first booking under it — see BookingFlow.jsx. Closing the
// tab/browser before that point clears it automatically (sessionStorage, not
// localStorage) so an abandoned draft never lingers and reappears later,
// making the app look broken.
const KEY = "lkk_trip_draft";

export function getTripDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTripDraft(patch) {
  const current = getTripDraft() || {};
  const next = { ...current, ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearTripDraft() {
  sessionStorage.removeItem(KEY);
}

// Holds an in-progress booking form (date/time/phone/notes) for a specific
// service while an unauthenticated traveller is sent off to register/log in.
// Session-only, same reasoning as the trip draft above.
const PENDING_BOOKING_KEY = "lkk_pending_booking";

export function getPendingBooking(serviceId) {
  try {
    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.serviceId === serviceId ? parsed : null;
  } catch {
    return null;
  }
}

export function setPendingBooking(serviceId, data) {
  sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({ serviceId, ...data }));
}

export function clearPendingBooking() {
  sessionStorage.removeItem(PENDING_BOOKING_KEY);
}

export function tripDraftDayCount(draft) {
  if (!draft?.startDate || !draft?.endDate) return null;
  const start = new Date(draft.startDate);
  const end = new Date(draft.endDate);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}
