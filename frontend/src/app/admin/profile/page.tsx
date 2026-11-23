"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/phone-utils";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  KeyRound,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
  Camera,
  RefreshCw,
  Building2,
  Lock,
  Layers,
  Wrench,
  DollarSign,
  Users,
  Bell,
  Clock,
  Laptop,
  CheckCircle2,
  Calendar,
  Sparkles,
  Sliders,
  ChevronRight,
  ExternalLink,
  Info,
} from "lucide-react";

interface AdminProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  gender: string;
  role: string;
  status: string;
  created_at: string;
  last_active_at?: string;
  avatar?: string;
  stats?: {
    totalRooms: number;
    activeTenants: number;
    activeMaintenance: number;
    totalRequests?: number;
  };
}

const PRESET_AVATARS = [
  { id: "dice-init", label: "Executive Initials", url: "https://api.dicebear.com/7.x/initials/svg?seed=Administrator&backgroundColor=0055a5" },
  { id: "dice-bot", label: "RentTrack AI Sentinel", url: "https://api.dicebear.com/7.x/bottts/svg?seed=renttrack-admin&backgroundColor=0f172a" },
  { id: "dice-av1", label: "Corporate Lead", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" },
  { id: "dice-av2", label: "Property Director", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria&backgroundColor=c0aede" },
  { id: "dice-av3", label: "Operations Manager", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=d1d4f9" },
  { id: "dice-av4", label: "Head of Facility", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=ffd5dc" },
];

export default function AdminProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"dossier" | "security" | "privileges" | "property">("dossier");

  // Profile Data State
  const [profile, setProfile] = useState<AdminProfileData>({
    id: 1,
    name: "Administrator",
    email: "admin@renttrack.com",
    phone: "+63 999 123 7654",
    address: "Dapitan City, Zamboanga Del Norte",
    gender: "Not Specified",
    role: "admin",
    status: "Active",
    created_at: "2026-09-10T08:33:11.490Z",
    avatar: "",
    stats: {
      totalRooms: 10,
      activeTenants: 5,
      activeMaintenance: 0,
      totalRequests: 0,
    },
  });

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "Male",
    avatar: "",
  });

  // Avatar Selector Modal
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  // Password Update State
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Operational Notification Preferences (Local Persistence)
  const [notificationPrefs, setNotificationPrefs] = useState({
    billAlerts: true,
    tenantRegistration: true,
    maintenanceUrgent: true,
    systemBackups: true,
    paymentDirect: true,
  });

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPrefs = localStorage.getItem("renttrack_admin_notif_prefs");
      if (savedPrefs) {
        try {
          setNotificationPrefs(JSON.parse(savedPrefs));
        } catch {}
      }
    }
  }, []);

  const togglePreference = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        localStorage.setItem("renttrack_admin_notif_prefs", JSON.stringify(updated));
      }
      toast.success("Notification preferences updated");
      return updated;
    });
  };

  // Fetch Admin Profile from API with LocalStorage Fallback
  const fetchProfile = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data } = await api.get("/admin/profile");
      if (data) {
        const localUserStr = localStorage.getItem("user");
        let savedAvatar = "";
        if (localUserStr) {
          try {
            const parsed = JSON.parse(localUserStr);
            savedAvatar = parsed.avatar || "";
          } catch {}
        }

        const resolvedProfile: AdminProfileData = {
          id: data.id || 1,
          name: data.name || "Administrator",
          email: data.email || "admin@renttrack.com",
          phone: formatPhoneNumber(data.phone, "+63 999 123 7654"),
          address: data.address || "Dapitan City, Zamboanga Del Norte",
          gender: data.gender || "Not Specified",
          role: data.role || "admin",
          status: data.status || "Active",
          created_at: data.created_at || "2026-09-10T08:33:11.490Z",
          last_active_at: data.last_active_at,
          avatar: savedAvatar || data.avatar || "",
          stats: data.stats || {
            totalRooms: 10,
            activeTenants: 5,
            activeMaintenance: 0,
            totalRequests: 0,
          },
        };

        setProfile(resolvedProfile);
        setEditForm({
          name: resolvedProfile.name,
          email: resolvedProfile.email,
          phone: resolvedProfile.phone,
          address: resolvedProfile.address,
          gender: resolvedProfile.gender === "Not Specified" ? "Male" : resolvedProfile.gender,
          avatar: resolvedProfile.avatar || "",
        });
      }
    } catch (err) {
      console.warn("Could not fetch remote admin profile, using cached user data:", err);
      // Fallback to localStorage
      if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            setProfile((prev) => ({
              ...prev,
              name: user.name || prev.name,
              email: user.email || prev.email,
              phone: formatPhoneNumber(user.phone, prev.phone),
              address: user.address || prev.address,
              avatar: user.avatar || prev.avatar,
            }));
            setEditForm({
              name: user.name || profile.name,
              email: user.email || profile.email,
              phone: formatPhoneNumber(user.phone, profile.phone),
              address: user.address || profile.address,
              gender: profile.gender === "Not Specified" ? "Male" : profile.gender,
              avatar: user.avatar || profile.avatar || "",
            });
          } catch {}
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfile(true);
    toast.success("Profile reloaded from server");
  };

  // Start Editing
  const handleStartEditing = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      gender: profile.gender === "Not Specified" ? "Male" : profile.gender,
      avatar: profile.avatar || "",
    });
    setIsEditing(true);
  };

  // Cancel Editing
  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Full Name and Administrative Email are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(editForm.email.trim())) {
      toast.error("Please provide a valid administrative email address.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.put("/admin/profile", {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        gender: editForm.gender,
      });

      const updatedUser = response.data?.user || {};
      const newName = updatedUser.name || editForm.name.trim();
      const newEmail = updatedUser.email || editForm.email.trim();
      const newPhone = formatPhoneNumber(updatedUser.phone || editForm.phone.trim(), editForm.phone.trim());
      const newAddress = updatedUser.address || editForm.address.trim();
      const newGender = updatedUser.gender || editForm.gender;

      setProfile((prev) => ({
        ...prev,
        name: newName,
        email: newEmail,
        phone: newPhone,
        address: newAddress,
        gender: newGender,
        avatar: editForm.avatar || prev.avatar,
      }));

      // Update localStorage so sidebar and navigation immediately reflect changes
      if (typeof window !== "undefined") {
        const rawUser = localStorage.getItem("user");
        let parsedUser: any = {};
        if (rawUser) {
          try {
            parsedUser = JSON.parse(rawUser);
          } catch {}
        }
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            name: newName,
            email: newEmail,
            phone: newPhone,
            address: newAddress,
            avatar: editForm.avatar || profile.avatar,
          })
        );
        window.dispatchEvent(new CustomEvent("renttrack-refresh-counts"));
      }

      setIsEditing(false);
      toast.success("Administrator profile updated successfully");
    } catch (err: any) {
      console.error("Save profile error:", err);
      // Even if offline, save locally
      if (typeof window !== "undefined") {
        const rawUser = localStorage.getItem("user");
        let parsedUser: any = {};
        if (rawUser) {
          try {
            parsedUser = JSON.parse(rawUser);
          } catch {}
        }
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
            address: editForm.address.trim(),
            avatar: editForm.avatar || profile.avatar,
          })
        );
        setProfile((prev) => ({
          ...prev,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
          gender: editForm.gender,
          avatar: editForm.avatar || prev.avatar,
        }));
        setIsEditing(false);
        toast.success("Profile saved to local workstation cache");
      } else {
        toast.error(err.response?.data?.message || "Failed to update admin profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar Selection Handlers
  const handleSelectPresetAvatar = (url: string) => {
    setProfile((prev) => ({ ...prev, avatar: url }));
    setEditForm((prev) => ({ ...prev, avatar: url }));
    if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("user");
      let parsedUser: any = {};
      if (rawUser) {
        try {
          parsedUser = JSON.parse(rawUser);
        } catch {}
      }
      localStorage.setItem("user", JSON.stringify({ ...parsedUser, avatar: url }));
      window.dispatchEvent(new CustomEvent("renttrack-refresh-counts"));
    }
    setIsAvatarModalOpen(false);
    toast.success("Avatar updated");
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image file is too large. Max size is 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        handleSelectPresetAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customAvatarUrl.trim()) return;
    handleSelectPresetAvatar(customAvatarUrl.trim());
    setCustomAvatarUrl("");
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error("Please enter your current administrative password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.put("/admin/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Administrative password successfully updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password. Verify your current password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Password Security Strength Check
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdScore = getPasswordStrength(passwordForm.newPassword);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-zinc-800 rounded-2xl w-full" />
        <div className="h-64 bg-slate-200 dark:bg-zinc-800 rounded-3xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="md:col-span-2 h-80 bg-slate-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              My Profile
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              SUPER ADMIN
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">
            Executive dossier, master privileges, operational profile, and security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-sm font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. THE EXECUTIVE IDENTITY HERO BANNER */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden relative">
        {/* Decorative Modern Mesh Cover Gradient */}
        <div className="h-36 sm:h-44 w-full relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Profile Identity Bar */}
        <div className="px-6 sm:px-8 pb-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            {/* Avatar & Core Metadata */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
              {/* Protruding Avatar */}
              <div className="relative group shrink-0 -mt-14 sm:-mt-16">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white dark:border-zinc-900 bg-slate-100 dark:bg-zinc-800 shadow-xl overflow-hidden flex items-center justify-center relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        profile.name || "Administrator"
                      )}&backgroundColor=0055a5`}
                      alt="Admin Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Change Avatar Button Trigger */}
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="absolute bottom-1 right-1 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform active:scale-95 border-2 border-white dark:border-zinc-900"
                  title="Change Avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Metadata - Placed on the white card background for clear contrast and visibility */}
              <div className="pt-2 sm:pt-4 space-y-2 pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {profile.name || "Administrator"}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Verified System Admin
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {profile.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {profile.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    Dapitan City, Zamboanga Del Norte
                  </span>
                </p>
              </div>
            </div>

            {/* Quick KPI Stat Chips */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-4 border-t md:border-t-0 border-slate-100 dark:border-zinc-800">
              <div className="bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 rounded-2xl px-4 py-2.5 text-center min-w-[85px]">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider block">
                  Rooms
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {profile.stats?.totalRooms ?? 10}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 rounded-2xl px-4 py-2.5 text-center min-w-[85px]">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider block">
                  Tenants
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
                  {profile.stats?.activeTenants ?? 5}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-zinc-700/60 rounded-2xl px-4 py-2.5 text-center min-w-[85px]">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider block">
                  Request
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                  {profile.stats?.totalRequests ?? profile.stats?.activeMaintenance ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE SECTION TABS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("dossier")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "dossier"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Admin Dossier</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "security"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("privileges")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "privileges"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>System Privileges</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("property")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "property"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Property Headquarters</span>
        </button>
      </div>

      {/* 4. TAB CONTENT SECTIONS */}

      {/* TAB 1: ADMIN DOSSIER */}
      {activeTab === "dossier" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dossier Card (Span 2) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-zinc-800 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Personal & Professional Details
                </h3>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400">
                  Master administrative contact and official identification records.
                </p>
              </div>
              {isEditing ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  Editing Mode
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modify Details
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Administrative Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        required
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Direct Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: formatPhoneInput(e.target.value) })
                        }
                        placeholder="+63 999 123 7654"
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Gender / Identification
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Official Headquarters Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <textarea
                      rows={3}
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Full Legal Name
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {profile.name}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Official Administrative Email
                  </span>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 break-all">
                    {profile.email}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Contact Phone Number
                  </span>
                  <p className="text-base font-mono font-bold text-slate-800 dark:text-zinc-100">
                    {profile.phone}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Gender Identity
                  </span>
                  <p className="text-base font-bold text-slate-800 dark:text-zinc-100">
                    {profile.gender || "Not Specified"}
                  </p>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Headquarters / Office Address
                  </span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    {profile.address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Account Dossier Metadata */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                System Account Registry
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Account Tier</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">Master Level 1</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Role Designation</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">System Administrator</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Registration Date</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Authentication</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bcrypt Salted</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold">Database Authority</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Full Superuser</span>
                </div>
              </div>
            </div>

            {/* Notification Directives Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Operational Alerts
                </h4>
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Automated Invoicing Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.billAlerts}
                    onChange={() => togglePreference("billAlerts")}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Tenant Online Registrations
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.tenantRegistration}
                    onChange={() => togglePreference("tenantRegistration")}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Urgent Maintenance Escalations
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.maintenanceUrgent}
                    onChange={() => togglePreference("maintenanceUrgent")}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Scheduled Backup Reports
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.systemBackups}
                    onChange={() => togglePreference("systemBackups")}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Change Password Card (Span 2) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="pb-5 border-b border-slate-100 dark:border-zinc-800 mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Administrative Credential Rotation
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400 mt-0.5">
                Ensure regular credential rotation to safeguard financial ledgers and sensitive tenant records.
              </p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Current Administrative Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    required
                    placeholder="Enter current password"
                    className="w-full h-11 pl-10 pr-11 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      required
                      placeholder="At least 6 characters"
                      className="w-full h-11 pl-10 pr-11 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      placeholder="Repeat new password"
                      className="w-full h-11 pl-10 pr-11 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Meter */}
              {passwordForm.newPassword && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-zinc-400">Password Security Rating</span>
                    <span
                      className={`font-bold ${
                        pwdScore <= 1
                          ? "text-rose-500"
                          : pwdScore === 2
                          ? "text-amber-500"
                          : pwdScore === 3
                          ? "text-blue-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {pwdScore <= 1
                        ? "Weak"
                        : pwdScore === 2
                        ? "Fair"
                        : pwdScore === 3
                        ? "Strong"
                        : "Exceptional"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all ${
                          pwdScore >= step
                            ? pwdScore <= 1
                              ? "bg-rose-500"
                              : pwdScore === 2
                              ? "bg-amber-500"
                              : pwdScore === 3
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                            : "bg-slate-200 dark:bg-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Security Diagnostics */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Security Standards
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-zinc-200">
                    <span>Session Protocol</span>
                    <span className="text-emerald-600 dark:text-emerald-400">TLS 1.3 / AES-256</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Active encrypted HTTPS session with JSON Web Token verification.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-zinc-200">
                    <span>Password Hash Standard</span>
                    <span className="text-blue-600 dark:text-blue-400">Bcrypt 10 Rounds</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    One-way salted cryptographic hash with brute-force defense.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-zinc-200">
                    <span>Database Protection</span>
                    <span className="text-indigo-600 dark:text-indigo-400">Automated Backups</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Full system database snapshots scheduled every 3 days.
                  </p>
                </div>
              </div>
            </div>

            {/* Active Session Fingerprint */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-500" />
                Active Device Session
              </h4>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 dark:text-zinc-400 font-semibold">Environment</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">Windows PC / Desktop</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 dark:text-zinc-400 font-semibold">Connection</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Authenticated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM PRIVILEGES */}
      {activeTab === "privileges" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="pb-5 border-b border-slate-100 dark:border-zinc-800 mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400 mt-0.5">
                The Administrator role holds root privileges across all operational, financial, and logistic modules.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Privilege 1: Financial & Billing */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Financial & Invoicing Engine
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Auto-generate monthly billing statements, edit utility charges, record cash payments, and export official DOCX receipts.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>

              {/* Privilege 2: Tenants Dossier */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tenant Lifecycle Oversight
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Approve pending onboarding applications, assign rooms, update lease contracts, track payment statuses, and archive moved-out tenants.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>

              {/* Privilege 3: Room Inventory */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Inventory & Room Matrix
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Create rooms, adjust pricing and capacity, configure male/female gender occupancy restrictions, and manage floor availability.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>

              {/* Privilege 4: Maintenance Work Orders */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Wrench className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Facility Work Orders
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Manage tenant maintenance tickets, assign priorities, dispatch contractors, track repairs, and mark work orders resolved.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>

              {/* Privilege 5: System Backups */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Layers className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Disaster Recovery & Backups
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Execute on-demand PostgreSQL database exports, configure automated schedules, and restore data from standalone snapshots.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>

              {/* Privilege 6: QRPh & Payments Desk */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    QRPh & Payment Desk Gateway
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Upload and manage the boarding house QRPh / GCash dynamic payment codes presented to tenants during checkout.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Root Access
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROPERTY HEADQUARTERS */}
      {activeTab === "property" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="pb-5 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Boarding House Operations & Administration Desk
              </h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400 mt-0.5">
                Official facility contact points, administrative office schedule, and physical dispatch address.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Property Name
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  RentTrack Residence & Suites
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Admin Office Hours
                </span>
                <p className="text-base font-bold text-slate-800 dark:text-zinc-100">
                  Mon – Sat: 8:00 AM – 6:00 PM
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Administrative Cash Desk
                </span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Administration Office (Ground Floor)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Emergency 24/7 Hotline
                </span>
                <p className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
                  +63 917 888 9999
                </p>
              </div>

              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Facility Physical Address
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  Dapitan City, Zamboanga Del Norte
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Tenant Guidelines Summary
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Rent bills are automatically disbursed on the 1st of every month with payment due within 5 days. Cash payments are logged directly at the Ground Floor Admin Office with automated digital official receipts issued to the tenant ledger.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                RentTrack Management v2.4
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. AVATAR SELECTION MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Choose Profile Avatar
                </h3>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400">
                  Select a curated executive vector avatar or upload your own photo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                Executive Presets
              </span>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(avatar.url)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-zinc-800/50 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all flex flex-col items-center gap-2 group text-center"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-xs group-hover:scale-105 transition-transform">
                      <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                      {avatar.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Custom File or Input URL */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                Upload Custom Photo
              </span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 text-sm font-bold text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/40 transition-colors">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Or paste external image URL..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  disabled={!customAvatarUrl.trim()}
                  className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
