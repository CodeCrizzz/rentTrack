"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AuthHeroCard from "@/components/auth-hero-card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
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
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Login failed. Please check credentials.",
        );
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
        className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-stretch justify-center rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Left Card: Brand & Features Hero */}
        <AuthHeroCard />

        {/* Right Card: Login Form */}
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
            <div className="mt-7 mb-6">
              <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                Welcome
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5">
                Sign in to your account to continue
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
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

          {/* Bottom Switch Link */}
          <div className="text-center text-xs sm:text-sm text-slate-600 font-medium mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#0066ee] font-bold hover:underline ml-1"
            >
              Create one
            </Link>
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
      </AnimatePresence>
    </div>
  );
}
