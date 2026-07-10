import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";

/**
 * Wrap any /local-only route (except /local/profile itself) with this.
 * If the logged-in local hasn't created a guide profile yet, or their
 * profile is still incomplete, they're sent straight to /local/profile
 * instead of being able to browse the rest of the app in limbo.
 */
export default function RequireGuideProfile({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking"); // checking | ok | needs-profile

  useEffect(() => {
    let cancelled = false;
    api
      .get("/profile/guide/me")
      .then(({ data }) => {
        if (cancelled) return;
        // Only require that a guide profile row exists at all (city/bio/avatar
        // filled in). Full `is_complete` also requires an active service, which
        // is a separate, later step — gating on that here would bounce someone
        // who just finished their profile straight back in a loop.
        setStatus(data?.guide ? "ok" : "needs-profile");
      })
      .catch(() => {
        if (!cancelled) setStatus("needs-profile");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-[60vh] grid place-items-center text-stone-500" data-testid="guide-profile-check-loading">
        Loading…
      </div>
    );
  }

  if (status === "needs-profile") {
    return <Navigate to="/local/profile?welcome=1" state={{ from: location.pathname }} replace />;
  }

  return children;
}
