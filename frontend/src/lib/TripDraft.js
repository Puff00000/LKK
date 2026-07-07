// A "trip draft" (destination city + dates, chosen before the traveller has
// even logged in) lives only in the browser. It only becomes a real, saved
// `trips` row on the backend the moment the traveller pays for their first
// booking under it — see BookingFlow.jsx. Abandoned drafts never touch the
// database at all.
const KEY = "lkk_trip_draft";

export function getTripDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTripDraft(patch) {
  const current = getTripDraft() || {};
  const next = { ...current, ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearTripDraft() {
  localStorage.removeItem(KEY);
}

export function tripDraftDayCount(draft) {
  if (!draft?.startDate || !draft?.endDate) return null;
  const start = new Date(draft.startDate);
  const end = new Date(draft.endDate);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}
