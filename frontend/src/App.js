import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Browse from "@/pages/Browse";
import GuideProfile from "@/pages/GuideProfile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import BookingFlow from "@/pages/BookingFlow";
import TravellerDashboard from "@/pages/TravellerDashboard";
import LocalDashboard from "@/pages/LocalDashboard";
import GuideProfileEdit from "@/pages/GuideProfileEdit";
import BookingDetail from "@/pages/BookingDetail";
import AdminPanel from "@/pages/AdminPanel";

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/guides/:id" element={<GuideProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/book/:id"
              element={
                <ProtectedRoute roles={["traveller"]}>
                  <BookingFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["traveller"]}>
                  <TravellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/local"
              element={
                <ProtectedRoute roles={["local"]}>
                  <LocalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/local/profile"
              element={
                <ProtectedRoute roles={["local"]}>
                  <GuideProfileEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute roles={["traveller", "local", "admin"]}>
                  <BookingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
    </div>
  );
}
