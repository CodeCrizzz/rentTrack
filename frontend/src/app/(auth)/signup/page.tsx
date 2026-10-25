"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatPhoneInput } from "@/lib/phone-utils";
import AuthHeroCard from "@/components/auth-hero-card";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please try again.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
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
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Registration failed. Please try again."
      );
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
        className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-stretch justify-center rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Left Card: Brand & Features Hero */}
        <AuthHeroCard />

        {/* Right Card: Sign Up Form */}
        <div className="w-full md:w-[480px] lg:w-[500px] bg-white p-7 sm:p-9 md:p-10 flex flex-col justify-between text-slate-900">
          <div>
            {/* Top Logo Lockup */}
            <div className="flex items-center gap-3 select-none">
              <img
                src="/images/logo/rentTrack_icon.png"
                alt="RentTrack"
                className="w-10 h-10 object-contain shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  RentTrack
                </span>
                <span className="text-[11px] font-medium text-slate-500 leading-tight">
                  Boarding House Management System
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mt-6 mb-5">
              <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                Create Your Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5">
                Join RentTrack and get started with your property management.
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
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
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.8} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-2 bg-[#0066ee] hover:bg-[#0055d4] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
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
      </AnimatePresence>
    </div>
  );
}