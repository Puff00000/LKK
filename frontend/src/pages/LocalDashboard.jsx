import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  CalendarIcon, Clock, Phone, CheckCircle2, XCircle,
  Plus, Pencil, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import BankVerificationCard from "@/components/BankVerificationCard";

const STATUS = {
  requested:       { text: "New request", className: "bg-amber-50 text-amber-900 border-amber-300" },
  awaiting_payment: { text: "Awaiting traveller's payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  accepted:        { text: "Accepted", className: "bg-green-50 text-green-800 border-green-200" },
  itinerary_delivered: { text: "Itinerary delivered", className: "bg-blue-50 text-blue-800 border-blue-200" },
  completed:       { text: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled:       { text: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  disputed:        { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
  declined:        { text: "Declined", className: "bg-stone-100 text-stone-500 border-stone-200" },
  expired:         { text: "Expired", className: "bg-stone-100 text-stone-500 border-stone-200" },
  unavailable:     { text: "No longer available", className: "bg-stone-100 text-stone-500
