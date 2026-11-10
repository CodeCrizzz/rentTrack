"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  X,
  Home,
  CreditCard,
  Wrench,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const authFeatures = [
  {
    icon: Home,
    title: "Room Management",
    description: "Track occupancy and room status",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Simplify billing and payments",
  },
  {
    icon: Wrench,
    title: "Maintenance Tracking",
    description: "Resolve issues faster",
  },
  {
    icon: MessageSquare,
    title: "Better Communication",
    description: "Stay connected with your tenants",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        router.push(
          response.data.user.role === "admin"
            ? "/admin/dashboard"
            : "/tenant/dashboard",
        );
      } else {
        throw new Error("No token returned");
      }
    } catch (err: any) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.message?.toLowerCase().includes("pending")
      ) {
        setShowPendingModal(true);
      } else {
        toast.error("Authentication Failed", {
          description:
            err.response?.data?.message ||
            err.message ||
            "Please verify your credentials and try again.",
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 font-sans selection:bg-blue-500/30 relative overflow-x-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/images/bg_img.png')" }}
    >
      {/* Background Soft Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[3px] z-0 pointer-events-none" />

      {/* Main Joined Two-Panel Container */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md md:max-w-[820px] lg:max-w-[850px] flex flex-col md:flex-row items-stretch rounded-[2rem] overflow-hidden shadow-2xl"
      >
        {/* Left Card: Brand & Features Hero */}
        <div className="relative w-full md:w-[420px] lg:w-[440px] shrink-0 bg-[#061834] p-7 sm:p-9 text-white flex flex-col justify-between overflow-hidden">
          {/* Decorative Wave Accent in bottom right corner */}
          <svg
            className="absolute bottom-0 right-0 w-[80%] h-auto pointer-events-none select-none z-0"
            viewBox="0 0 340 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 180C55 140 115 165 175 125C235 85 285 105 340 45V180H0Z"
              fill="url(#auth-wave-grad)"
            />
            <defs>
              <linearGradient
                id="auth-wave-grad"
                x1="0"
                y1="180"
                x2="340"
                y2="45"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#0052cc" stopOpacity="0.85" />
                <stop offset="1" stopColor="#0099ff" stopOpacity="0.95" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top Section */}
          <div className="relative z-10 flex flex-col">
            {/* Brand Header */}
            <div className="flex items-center gap-3 select-none">
              <img
                src="/images/logo/rentTrack_icon.png"
                alt="RentTrack"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  <span className="text-white">Rent</span>
                  <span className="text-teal-400">Track</span>
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-blue-200/70 leading-tight">
                  Boarding House Management System
                </span>
              </div>
            </div>

            {/* Hero Title & Pitch */}
            <div className="mt-8 sm:mt-10 mb-2">
              <h1 className="text-2xl sm:text-[28px] font-black tracking-tight leading-[1.25] text-white">
                Smarter Management,
                <br />
                <span className="text-[#00a8ff]">Better Living.</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-3 max-w-sm">
                Easily manage rooms, track payments, and keep tenants happy -
                all in one place.
              </p>
            </div>

            {/* Feature List */}
            <div className="mt-7 sm:mt-8 space-y-4 sm:space-y-4.5">
              {authFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3.5 group">
                  <div className="w-10 h-10 rounded-full bg-[#0d2a58] border border-blue-400/25 flex items-center justify-center text-[#38bdf8] shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                    <feat.icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {feat.title}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-300/80 font-normal leading-tight mt-0.5">
                      {feat.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Tagline */}
          <div className="relative z-10 pt-8 sm:pt-10">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide">
              Your Property. Our Priority.
            </p>
          </div>
        </div>

        {/* Right Card: Login Form */}
        <div
          className="w-full md:w-[380px] lg:w-[410px] shrink-0 bg-white p-6 sm:p-8 md:p-9 flex flex-col justify-between text-slate-900 light-form-card [color-scheme:light]"
          style={{ colorScheme: "light" }}
        >
          <div>
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                Welcome
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
                Enter your credentials to access your account.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Email Address
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Mail
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Password
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Lock
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 z-20 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.8} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0066ee] border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#0066ee]"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(
                      "Password reset instructions will be sent to your email.",
                    );
                  }}
                  className="font-semibold text-[#0066ee] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#0066ee] hover:bg-[#0055d4] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">
                or continue with
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Google authentication is available in cloud deployment.",
                )
              }
              className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.36 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Bottom Switch Link & Legal Policies */}
          <div className="text-center text-xs sm:text-sm text-slate-600 font-medium mt-6 flex flex-col items-center gap-2">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[#0066ee] font-bold hover:underline ml-1"
              >
                Apply for Residency
              </Link>
            </p>

            {/* Privacy Policy and Terms and Conditions buttons */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="hover:text-slate-700 hover:underline transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="hover:text-slate-700 hover:underline transition-colors cursor-pointer"
              >
                Terms and Conditions
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- PENDING APPROVAL MODAL --- */}
      <AnimatePresence>
        {showPendingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col overflow-hidden text-white"
            >
              <button
                onClick={() => setShowPendingModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="flex flex-col mt-2">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Application Pending Review
                    </h3>
                    <span className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                      Status: Under Administrator Approval
                    </span>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Your tenant application has been received and is waiting for
                  administrator approval. Once verified, you will be able to
                  sign in immediately.
                </p>

                <button
                  onClick={() => setShowPendingModal(false)}
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-bold transition-all text-sm cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* --- PRIVACY POLICY / TERMS & CONDITIONS MODAL --- */}
        {legalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh] border border-slate-100 text-slate-900"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {legalModal === "privacy"
                      ? "Privacy Policy"
                      : "Terms and Conditions"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {legalModal === "privacy"
                      ? "How RentTrack protects and manages your personal information"
                      : "Rules and terms governing use of the RentTrack platform"}
                  </p>
                </div>
                <button
                  onClick={() => setLegalModal(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto py-5 pr-2 space-y-4 text-xs sm:text-sm text-slate-600 custom-scrollbar leading-relaxed">
                {legalModal === "privacy" ? (
                  <>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        1. Information We Collect
                      </h4>
                      <p>
                        We collect personal details you provide upon
                        registration, account verification, and lease
                        management, including your full name, email address,
                        contact phone number, and residency records.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        2. How We Use Your Data
                      </h4>
                      <p>
                        Your information is utilized solely to process tenancy
                        records, generate automated billing invoices, coordinate
                        maintenance work orders, and facilitate
                        resident-administrator communication.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        3. Security & Storage
                      </h4>
                      <p>
                        All user credentials and sensitive records are stored
                        using industry-standard hashing and role-based access
                        control. We do not sell or disclose your personal data
                        to unauthorized third parties.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        4. Contact & Inquiries
                      </h4>
                      <p>
                        For any privacy-related requests or data deletion
                        questions, please reach out to our administration team
                        via the portal messaging system or at
                        support@renttrack.com.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        1. Acceptance of Terms
                      </h4>
                      <p>
                        By accessing or signing into the RentTrack platform, you
                        agree to comply with all operational guidelines, leasing
                        agreements, and community policies established for your
                        boarding facility.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        2. User Account Responsibilities
                      </h4>
                      <p>
                        You are responsible for maintaining the confidentiality
                        of your login credentials and for all actions that occur
                        under your registered resident or administrator profile.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        3. Rental Payments & Billing
                      </h4>
                      <p>
                        Monthly rental dues and utility obligations must be
                        settled on or before the stated due dates. Payment
                        verification receipts submitted through the portal are
                        subject to administrative audit.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">
                        4. Maintenance Reporting
                      </h4>
                      <p>
                        Residents are required to report room repairs and
                        facility issues promptly through the Maintenance
                        Requests system to prevent property damage and ensure
                        timely resolution.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="w-full sm:w-auto min-w-[160px] px-8 py-2.5 bg-[#0066ee] hover:bg-[#0055d4] text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
