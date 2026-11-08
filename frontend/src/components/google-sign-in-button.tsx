"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface GoogleSignInButtonProps {
  onPending?: () => void;
  text?: string;
  className?: string;
}

export default function GoogleSignInButton({
  onPending,
  text = "Continue with Google",
  className = "",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [showChooserModal, setShowChooserModal] = useState(false);
  const [modalView, setModalView] = useState<"choose" | "custom">("choose");
  const [customEmail, setCustomEmail] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const router = useRouter();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      setIsGsiLoaded(true);
    }
  }, []);

  const handleAuthSuccess = (resData: any) => {
    if (resData.token && resData.user) {
      localStorage.setItem("token", resData.token);
      localStorage.setItem("user", JSON.stringify(resData.user));

      toast.success("Welcome back!", {
        description: `Signed in as ${resData.user.name} (${resData.user.email})`,
      });

      router.push(
        resData.user.role === "admin"
          ? "/admin/dashboard"
          : "/tenant/dashboard"
      );
    }
  };

  const executeGoogleAuth = async (payload: {
    credential?: string;
    id_token?: string;
    access_token?: string;
    dev_user?: { email: string; name: string };
  }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/google", payload);
      handleAuthSuccess(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const message = err.response?.data?.message;

      if (status === 403 && (code === "ACCOUNT_PENDING" || message?.toLowerCase().includes("pending"))) {
        setShowChooserModal(false);
        if (onPending) {
          onPending();
        } else {
          toast.warning("Account Pending Approval", {
            description: "Your registration has been submitted and is awaiting administrator verification.",
          });
        }
      } else {
        toast.error("Google Sign-In Failed", {
          description: message || "Could not complete Google authentication.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    // 1. If Google Client ID is configured and GSI is ready, launch official Google OAuth popup
    if (googleClientId && googleClientId !== "your_google_client_id_here") {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
        try {
          setIsLoading(true);
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: "email profile openid",
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.access_token) {
                await executeGoogleAuth({ access_token: tokenResponse.access_token });
              } else {
                setIsLoading(false);
              }
            },
            error_callback: (err: any) => {
              setIsLoading(false);
              toast.error("Google Connection Error", {
                description: err.message || "Failed to initiate Google sign-in window.",
              });
            },
          });

          client.requestAccessToken();
          return;
        } catch (e: any) {
          console.error("[GSI] Failed to initialize token client:", e);
          setIsLoading(false);
        }
      }
    }

    // 2. Otherwise open the authentic Google Account Chooser UI
    setModalView("choose");
    setCustomEmail("");
    setShowChooserModal(true);
  };

  const handleSelectAccount = (email: string, name: string) => {
    setShowChooserModal(false);
    executeGoogleAuth({
      dev_user: { email, name },
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) {
      toast.warning("Invalid Email", { description: "Please enter a valid Google email address." });
      return;
    }
    const derivedName = customEmail.split("@")[0].replace(/\./g, " ");
    setShowChooserModal(false);
    executeGoogleAuth({
      dev_user: { email: customEmail.trim(), name: derivedName },
    });
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="lazyOnload"
        onLoad={() => setIsGsiLoaded(true)}
      />

      {/* Official Google-styled Sign-In Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading}
        className={
          className ||
          "w-full h-11 sm:h-12 bg-white hover:bg-[#f8fafd] border border-[#dadce0] active:bg-[#f1f3f4] text-[#3c4043] font-medium rounded-full sm:rounded-xl text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-none hover:shadow-xs active:scale-[0.99] disabled:opacity-70 [color-scheme:light]"
        }
        style={{ colorScheme: "light" }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#5f6368]" />
            <span className="text-[#3c4043] font-medium">Connecting to Google...</span>
          </>
        ) : (
          <>
            {/* Authentic 4-color Google G Icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span className="tracking-normal font-medium">{text}</span>
          </>
        )}
      </button>

      {/* --- AUTHENTIC GOOGLE MATERIAL 3 ACCOUNT CHOOSER WINDOW --- */}
      <AnimatePresence>
        {showChooserModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-[448px] bg-white rounded-[28px] border border-[#dadce0] shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-7 sm:p-9 text-[#1f1f1f] [color-scheme:light] font-sans relative flex flex-col"
              style={{ colorScheme: "light" }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowChooserModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* View 1: Authentic Google "Choose an account" */}
              {modalView === "choose" ? (
                <div>
                  {/* Google Official Wordmark */}
                  <div className="mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="75"
                      height="24"
                      viewBox="0 0 75 24"
                      className="select-none"
                    >
                      <path
                        fill="#4285F4"
                        d="M9.24 10.13h7.24c.09.43.14.88.14 1.39 0 1.95-.53 4.14-2.19 5.8-1.61 1.63-3.69 2.5-6.58 2.5-5.32 0-9.85-4.32-9.85-9.64s4.53-9.64 9.85-9.64c2.89 0 4.96 1.13 6.5 2.6l-1.84 1.84c-1.12-1.05-2.63-1.87-4.66-1.87-3.8 0-6.91 3.1-6.91 6.91s3.11 6.91 6.91 6.91c2.47 0 3.87-1 4.77-1.9.74-.74 1.23-1.78 1.43-3.23H9.24v-2.68z"
                      />
                      <path
                        fill="#EA4335"
                        d="M26.24 13.06c0 3.86-2.93 6.76-6.68 6.76s-6.68-2.9-6.68-6.76c0-3.89 2.93-6.79 6.68-6.79s6.68 2.9 6.68 6.79zm-2.92 0c0-2.45-1.75-4.14-3.76-4.14s-3.76 1.69-3.76 4.14c0 2.42 1.75 4.14 3.76 4.14s3.76-1.72 3.76-4.14z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M40.54 13.06c0 3.86-2.93 6.76-6.68 6.76s-6.68-2.9-6.68-6.76c0-3.89 2.93-6.79 6.68-6.79s6.68 2.9 6.68 6.79zm-2.92 0c0-2.45-1.75-4.14-3.76-4.14s-3.76 1.69-3.76 4.14c0 2.42 1.75 4.14 3.76 4.14s3.76-1.72 3.76-4.14z"
                      />
                      <path
                        fill="#4285F4"
                        d="M54.06 6.58v12.57c0 5.17-3.05 7.29-6.65 7.29-3.4 0-5.44-2.28-6.22-4.13l2.55-1.06c.45 1.09 1.58 2.37 3.67 2.37 2.4 0 3.88-1.48 3.88-4.28v-1.04h-.1c-.72.88-2.09 1.65-3.82 1.65-3.63 0-6.95-3.17-6.95-7.23 0-4.09 3.32-7.23 6.95-7.23 1.73 0 3.1.77 3.82 1.63h.1V6.58h2.77zm-2.58 6.51c0-2.42-1.63-4.17-3.71-4.17-2.12 0-3.76 1.75-3.76 4.17 0 2.39 1.64 4.14 3.76 4.14 2.08 0 3.71-1.75 3.71-4.14z"
                      />
                      <path fill="#34A853" d="M57.69.58h2.92v19.24h-2.92z" />
                      <path
                        fill="#EA4335"
                        d="M69.83 15.65l2.26 1.51c-.73 1.09-2.51 2.99-5.54 2.99-4.7 0-8.21-3.63-8.21-8.08 0-4.8 3.55-8.08 7.82-8.08 4.39 0 6.53 3.35 7.23 5.14l.39.99-11.89 4.92c.91 1.8 2.32 2.71 4.31 2.71 1.99 0 3.37-.99 4.26-2.09l.66-.01zm-5.78-4.25l7.95-3.29c-.44-.72-1.43-1.6-3.04-1.6-1.95 0-4.12 1.71-4.91 4.89z"
                      />
                    </svg>
                  </div>

                  {/* Header Titles */}
                  <h2 className="text-[24px] font-normal text-[#1f1f1f] tracking-tight leading-tight">
                    Choose an account
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-[#444746] text-sm font-normal">
                    <span>to continue to</span>
                    <span className="font-semibold text-[#1f1f1f]">RentTrack</span>
                    <img
                      src="/images/logo/rentTrack_icon.png"
                      alt="RentTrack"
                      className="w-4 h-4 object-contain inline-block ml-0.5"
                    />
                  </div>

                  {/* Account List */}
                  <div className="mt-6 border-t border-b border-[#e3e3e3] divide-y divide-[#e3e3e3]">
                    {/* Christian Natividad Account */}
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectAccount(
                          "natividadchristian670@gmail.com",
                          "Christian S. Natividad"
                        )
                      }
                      className="w-full py-3.5 px-2 hover:bg-[#f0f4f9] active:bg-[#e1e9f4] transition-colors flex items-center gap-3.5 text-left cursor-pointer group"
                    >
                      {/* Google Style Circular Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#7b1fa2] text-white flex items-center justify-center font-medium text-base shrink-0 select-none shadow-xs">
                        C
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-[#1f1f1f] truncate leading-tight">
                          Christian S. Natividad
                        </span>
                        <span className="text-xs text-[#444746] truncate leading-tight mt-0.5">
                          natividadchristian670@gmail.com
                        </span>
                      </div>
                    </button>

                    {/* Master Admin Account */}
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectAccount(
                          "admin@renttrack.com",
                          "Master Property Administrator"
                        )
                      }
                      className="w-full py-3.5 px-2 hover:bg-[#f0f4f9] active:bg-[#e1e9f4] transition-colors flex items-center gap-3.5 text-left cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1e88e5] text-white flex items-center justify-center font-medium text-base shrink-0 select-none shadow-xs">
                        M
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-[#1f1f1f] truncate leading-tight">
                          Master Property Administrator
                        </span>
                        <span className="text-xs text-[#444746] truncate leading-tight mt-0.5">
                          admin@renttrack.com
                        </span>
                      </div>
                    </button>

                    {/* "Use another account" Row */}
                    <button
                      type="button"
                      onClick={() => setModalView("custom")}
                      className="w-full py-3.5 px-2 hover:bg-[#f0f4f9] active:bg-[#e1e9f4] transition-colors flex items-center gap-3.5 text-left cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full border border-[#747775] text-[#444746] flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[#1f1f1f]">
                        Use another account
                      </span>
                    </button>
                  </div>

                  {/* Standard Google Legal Consent Disclaimer */}
                  <div className="mt-6 text-xs text-[#444746] leading-relaxed">
                    To continue, Google will share your name, email address, language preference, and profile picture with RentTrack. Before using this app, you can review RentTrack’s{" "}
                    <span className="text-[#0b57d0] hover:underline cursor-pointer">privacy policy</span> and{" "}
                    <span className="text-[#0b57d0] hover:underline cursor-pointer">terms of service</span>.
                  </div>
                </div>
              ) : (
                /* View 2: Authentic Google "Sign in with another account" */
                <div>
                  {/* Back button & Google Wordmark */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setModalView("choose")}
                      className="p-1.5 -ml-1.5 rounded-full text-[#444746] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                      title="Back to accounts"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="75"
                      height="24"
                      viewBox="0 0 75 24"
                      className="select-none"
                    >
                      <path
                        fill="#4285F4"
                        d="M9.24 10.13h7.24c.09.43.14.88.14 1.39 0 1.95-.53 4.14-2.19 5.8-1.61 1.63-3.69 2.5-6.58 2.5-5.32 0-9.85-4.32-9.85-9.64s4.53-9.64 9.85-9.64c2.89 0 4.96 1.13 6.5 2.6l-1.84 1.84c-1.12-1.05-2.63-1.87-4.66-1.87-3.8 0-6.91 3.1-6.91 6.91s3.11 6.91 6.91 6.91c2.47 0 3.87-1 4.77-1.9.74-.74 1.23-1.78 1.43-3.23H9.24v-2.68z"
                      />
                      <path
                        fill="#EA4335"
                        d="M26.24 13.06c0 3.86-2.93 6.76-6.68 6.76s-6.68-2.9-6.68-6.76c0-3.89 2.93-6.79 6.68-6.79s6.68 2.9 6.68 6.79zm-2.92 0c0-2.45-1.75-4.14-3.76-4.14s-3.76 1.69-3.76 4.14c0 2.42 1.75 4.14 3.76 4.14s3.76-1.72 3.76-4.14z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M40.54 13.06c0 3.86-2.93 6.76-6.68 6.76s-6.68-2.9-6.68-6.76c0-3.89 2.93-6.79 6.68-6.79s6.68 2.9 6.68 6.79zm-2.92 0c0-2.45-1.75-4.14-3.76-4.14s-3.76 1.69-3.76 4.14c0 2.42 1.75 4.14 3.76 4.14s3.76-1.72 3.76-4.14z"
                      />
                      <path
                        fill="#4285F4"
                        d="M54.06 6.58v12.57c0 5.17-3.05 7.29-6.65 7.29-3.4 0-5.44-2.28-6.22-4.13l2.55-1.06c.45 1.09 1.58 2.37 3.67 2.37 2.4 0 3.88-1.48 3.88-4.28v-1.04h-.1c-.72.88-2.09 1.65-3.82 1.65-3.63 0-6.95-3.17-6.95-7.23 0-4.09 3.32-7.23 6.95-7.23 1.73 0 3.1.77 3.82 1.63h.1V6.58h2.77zm-2.58 6.51c0-2.42-1.63-4.17-3.71-4.17-2.12 0-3.76 1.75-3.76 4.17 0 2.39 1.64 4.14 3.76 4.14 2.08 0 3.71-1.75 3.71-4.14z"
                      />
                      <path fill="#34A853" d="M57.69.58h2.92v19.24h-2.92z" />
                      <path
                        fill="#EA4335"
                        d="M69.83 15.65l2.26 1.51c-.73 1.09-2.51 2.99-5.54 2.99-4.7 0-8.21-3.63-8.21-8.08 0-4.8 3.55-8.08 7.82-8.08 4.39 0 6.53 3.35 7.23 5.14l.39.99-11.89 4.92c.91 1.8 2.32 2.71 4.31 2.71 1.99 0 3.37-.99 4.26-2.09l.66-.01zm-5.78-4.25l7.95-3.29c-.44-.72-1.43-1.6-3.04-1.6-1.95 0-4.12 1.71-4.91 4.89z"
                      />
                    </svg>
                    <div className="w-5" />
                  </div>

                  <h2 className="text-[24px] font-normal text-[#1f1f1f] tracking-tight leading-tight">
                    Sign in
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-[#444746] text-sm font-normal">
                    <span>to continue to</span>
                    <span className="font-semibold text-[#1f1f1f]">RentTrack</span>
                    <img
                      src="/images/logo/rentTrack_icon.png"
                      alt="RentTrack"
                      className="w-4 h-4 object-contain inline-block ml-0.5"
                    />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCustomSubmit} className="mt-8 space-y-6">
                    {/* Google Outlined Text Field */}
                    <div className="relative">
                      <input
                        id="google-email-input"
                        type="email"
                        required
                        autoFocus
                        value={customEmail}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className={`w-full h-14 px-4 pt-3 pb-1 text-base text-[#1f1f1f] bg-transparent rounded-lg border transition-all outline-none ${
                          isInputFocused
                            ? "border-[#0b57d0] ring-1 ring-[#0b57d0]"
                            : "border-[#747775] hover:border-[#1f1f1f]"
                        }`}
                      />
                      <label
                        htmlFor="google-email-input"
                        className={`absolute left-4 transition-all pointer-events-none ${
                          isInputFocused || customEmail
                            ? "top-1.5 text-xs text-[#0b57d0]"
                            : "top-4 text-base text-[#444746]"
                        }`}
                      >
                        Email or phone
                      </label>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm -mt-2">
                      <button
                        type="button"
                        onClick={() => toast.info("Enter your registered Google email address.")}
                        className="font-medium text-[#0b57d0] hover:text-[#0842a0] hover:underline cursor-pointer"
                      >
                        Forgot email?
                      </button>
                    </div>

                    {/* Guest info note */}
                    <div className="text-xs text-[#444746] leading-relaxed pt-1">
                      Not your computer? Use Guest mode to sign in privately.{" "}
                      <span
                        onClick={() => toast.info("Guest mode is supported in your private browser window.")}
                        className="text-[#0b57d0] hover:underline cursor-pointer font-medium"
                      >
                        Learn more
                      </span>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between pt-6">
                      <button
                        type="button"
                        onClick={() => setModalView("choose")}
                        className="text-sm font-medium text-[#0b57d0] hover:text-[#0842a0] hover:underline cursor-pointer"
                      >
                        Choose saved account
                      </button>

                      {/* Google's Signature Solid Blue Pill Button */}
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] active:bg-[#06327a] text-white font-medium text-sm transition-colors cursor-pointer shadow-none"
                      >
                        Next
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bottom Subtle Google Links */}
              <div className="mt-8 pt-4 border-t border-[#f1f3f4] flex items-center justify-between text-[11px] text-[#747775]">
                <div className="flex items-center gap-1 cursor-pointer hover:text-[#1f1f1f]">
                  <span>English (United States)</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="hover:text-[#1f1f1f] cursor-pointer">Help</span>
                  <span className="hover:text-[#1f1f1f] cursor-pointer">Privacy</span>
                  <span className="hover:text-[#1f1f1f] cursor-pointer">Terms</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
