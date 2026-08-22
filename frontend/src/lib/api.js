import axios from "axios";

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// withCredentials so the httpOnly auth cookie set by the backend is sent
// on every request — the token itself is never readable from JS, which is
// the point (closes off token theft via XSS).
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function inr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}
