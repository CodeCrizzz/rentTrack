"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  User,
  Mail,
  Phone,
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
import { formatPhoneInput } from "@/lib/phone-utils";

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.warning("Terms Agreement Required", {
        description: "Please accept the Terms of Service and Privacy Policy to continue.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.warning("Passwords Do Not Match", {
        description: "Please verify that both password entries are identical.",
      });
      return;
    }

    if (password.length < 6) {
      toast.warning("Password Too Short", {
        description: "Password must contain at least 6 characters.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/register", {
        name,
        email,
        phone,
        password,
        role: "tenant",
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      toast.error("Registration Failed", {
        description:
          err.response?.data?.message ||
          err.message ||
          "Could not create account. Please verify details and try again.",
      });
    } finally {
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
                Easily manage your boarding house, track payments, and keep your
                residents happy — all in one place.
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

        {/* Right Card: Sign Up Form */}
        <div
          className="w-full md:w-[380px] lg:w-[410px] shrink-0 bg-white p-6 sm:p-8 md:p-9 flex flex-col justify-between text-slate-900 light-form-card [color-scheme:light]"
          style={{ colorScheme: "light" }}
        >
          <div>
            {/* Form Header */}
            <div className="mb-5">
              <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                Create Your Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Fill in your details below to request residency onboarding.
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Full Name
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-11 sm:h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <User
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Email Address
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-11 sm:h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Mail
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Phone Number
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-11 sm:h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Phone
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
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
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-11 sm:h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Lock
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="password"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3.5 z-20 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                    aria-label={showPasswords ? "Hide password" : "Show password"}
                  >
                    {showPasswords ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.8} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-bold text-slate-800 mb-1.5 ml-0.5"
                >
                  Confirm Password
                </label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 h-11 sm:h-12 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Lock
                    className="w-5 h-5 text-slate-400 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    id="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Terms & Privacy Agreement Checkbox */}
              <div className="flex items-start gap-2.5 pt-1 pb-1 select-none">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0066ee] focus:ring-[#0066ee] focus:ring-offset-0 cursor-pointer accent-[#0066ee]"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-xs text-slate-600 font-medium leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModal("terms")}
                    className="text-[#0066ee] font-bold hover:underline cursor-pointer focus:outline-none"
                  >
                    Terms and Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModal("privacy")}
                    className="text-[#0066ee] font-bold hover:underline cursor-pointer focus:outline-none"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms}
                className={`w-full h-12 mt-2 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                  agreedToTerms && !isLoading
                    ? "bg-[#0066ee] hover:bg-[#0055d4] text-white shadow-md shadow-blue-500/25 active:scale-[0.99] cursor-pointer"
                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Switch Link */}
          <div className="text-center text-xs sm:text-sm text-slate-600 font-medium mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#0066ee] font-bold hover:underline ml-1"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>

      {/* --- SUCCESS MODAL OVERLAY --- */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-[2rem] p-8 sm:p-9 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-slate-900 border border-slate-100"
            >
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/login");
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                Account Created!
              </h3>
              <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed font-medium">
                Welcome to RentTrack. Your account registration has been submitted and is waiting for administrator approval.
              </p>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/login");
                }}
                className="w-full h-12 bg-[#0066ee] hover:bg-[#0055d4] text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Proceed to Sign In
              </button>
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

              {/* Footer with centered button */}
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