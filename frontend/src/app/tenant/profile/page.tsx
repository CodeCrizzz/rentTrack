"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/phone-utils";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  KeyRound,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  created_at: string;
  date_moved_in: string | null;
  contract_end_date: string | null;
  room_number: string | null;
  type: string | null;
  floor: string | null;
  rental_type: string | null;
  capacity: number | null;
  price: number | null;
  payment?: {
    balance: number;
    status: string;
    last_payment: string | null;
  };
  maintenance?: {
    total: number;
    pending: number;
    recent_status: string;
  };
}

export default function TenantProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Personal Details Inline Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
  });

  // Password Change State
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/tenant/profile");
      setProfile(data);
      setDetailsForm({
        name: data.name || "",
        email: data.email || "",
        phone: formatPhoneNumber(data.phone, ""),
        gender: data.gender || "Male",
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsForm.name.trim() || !detailsForm.email.trim()) {
      toast.error("Name and email address are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(detailsForm.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSavingDetails(true);
    try {
      const { data } = await api.put("/tenant/profile", {
        name: detailsForm.name.trim(),
        email: detailsForm.email.trim(),
        phone: detailsForm.phone.trim(),
        gender: detailsForm.gender,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: data.user?.name ?? detailsForm.name.trim(),
              email: data.user?.email ?? detailsForm.email.trim(),
              phone: data.user?.phone ?? detailsForm.phone.trim(),
              gender: data.user?.gender ?? detailsForm.gender,
            }
          : null,
      );

      if (typeof window !== "undefined") {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...parsed,
                name: data.user?.name ?? detailsForm.name.trim(),
                email: data.user?.email ?? detailsForm.email.trim(),
              }),
            );
          } catch {}
        }
      }

      setIsEditingDetails(false);
      toast.success("Profile information updated");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update profile details",
      );
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleCancelDetails = () => {
    if (profile) {
      setDetailsForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: formatPhoneNumber(profile.phone, ""),
        gender: profile.gender || "Male",
      });
    }
    setIsEditingDetails(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (passwordForm.newPassword.trim().length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.put("/tenant/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4 font-sans animate-pulse">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-800 rounded mt-2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-4">
            <div className="h-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"></div>
            <div className="h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"></div>
          </div>
          <div className="lg:col-span-8 space-y-4">
            <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"></div>
            <div className="h-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "R";

  const isActiveStatus = profile.status === "Active";
  const balanceDue = Number(profile.payment?.balance || 0);

  return (
    <div className="w-full flex-1 flex flex-col gap-4 pb-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Account &amp; Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View your resident record, update contact details, and manage
            account security.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Resident Summary & Tenancy Record */}
        <div className="lg:col-span-4 space-y-4">
          {/* Resident Identity Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {profile.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {profile.email}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                  isActiveStatus
                    ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30"
                    : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                }`}
              >
                {profile.status || "Pending"}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-[13px]">
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Resident ID
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  RES-{String(profile.id || 1).padStart(5, "0")}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Phone
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {formatPhoneNumber(profile.phone, "Not provided")}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Gender
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {profile.gender || "Not specified"}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Registered On
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tenancy & Room Assignment Record (Read-Only) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Tenancy Record
                </h3>
              </div>
            </div>

            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-[13px]">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Assigned Room
                </span>
                <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                  {profile.room_number
                    ? `Room ${profile.room_number}`
                    : "Unassigned"}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Room Classification
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {profile.type
                    ? `${profile.type}${profile.floor ? ` · ${profile.floor}` : ""}`
                    : "—"}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Monthly Room Rent
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {profile.price
                    ? `₱${Number(profile.price).toLocaleString()}`
                    : "—"}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Move-In Date
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {profile.date_moved_in
                    ? new Date(profile.date_moved_in).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "—"}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Outstanding Balance
                </span>
                <span
                  className={`font-mono font-extrabold ${
                    balanceDue > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-teal-600 dark:text-teal-400"
                  }`}
                >
                  ₱{balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Personal Details & Security */}
        <div className="lg:col-span-8 space-y-4">
          {/* Personal Information Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Personal Information</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Keep your name and primary contact details accurate for
                  billing notices.
                </p>
              </div>

              {!isEditingDetails ? (
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleCancelDetails}
                    disabled={isSavingDetails}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    form="tenant-details-form"
                    disabled={isSavingDetails}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSavingDetails ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSavingDetails ? "Saving..." : "Save Changes"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <form
              id="tenant-details-form"
              onSubmit={handleSaveDetails}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Full Name
                </label>
                {isEditingDetails ? (
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
                    <input
                      type="text"
                      required
                      value={detailsForm.name}
                      onChange={(e) =>
                        setDetailsForm({ ...detailsForm, name: e.target.value })
                      }
                      className="w-full pl-9.5 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                {isEditingDetails ? (
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
                    <input
                      type="email"
                      required
                      value={detailsForm.email}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full pl-9.5 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Contact Number
                </label>
                {isEditingDetails ? (
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
                    <input
                      type="text"
                      value={detailsForm.phone}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          phone: formatPhoneInput(e.target.value),
                        })
                      }
                      placeholder="+63 999 123 7654"
                      className="w-full pl-9.5 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {formatPhoneNumber(profile.phone, "Not provided")}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Gender
                </label>
                {isEditingDetails ? (
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none shrink-0" />
                    <select
                      value={detailsForm.gender}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          gender: e.target.value,
                        })
                      }
                      className="w-full pl-9.5 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{profile.gender || "Not specified"}</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Password & Security Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Password &amp; Security</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your password to keep your resident account secure.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer self-start sm:self-center"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Passwords</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Passwords</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Password changes take effect immediately.</span>
                </span>

                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                >
                  {isSavingPassword && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {isSavingPassword ? "Updating..." : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
