"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2 } from "lucide-react";
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
  const [clientId, setClientId] = useState(
    () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "",
  );
  const router = useRouter();

  const fetchBackendGoogleClientId = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/google/config");
      const fetchedId =
        typeof data?.clientId === "string" ? data.clientId.trim() : "";
      if (fetchedId) {
        setClientId(fetchedId);
      }
      return fetchedId;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window as any).google?.accounts?.oauth2
    ) {
      setIsGsiLoaded(true);
    }

    if (!clientId) {
      fetchBackendGoogleClientId();
    }
  }, [clientId, fetchBackendGoogleClientId]);

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
          : "/tenant/dashboard",
      );
    }
  };

  const executeGoogleAuth = async (payload: {
    credential?: string;
    id_token?: string;
    access_token?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/google", payload);
      handleAuthSuccess(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const message = err.response?.data?.message;

      if (
        status === 403 &&
        (code === "ACCOUNT_PENDING" ||
          message?.toLowerCase().includes("pending"))
      ) {
        if (onPending) {
          onPending();
        } else {
          toast.warning("Account Pending Approval", {
            description:
              "Your registration has been submitted and is awaiting administrator verification.",
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

  const handleButtonClick = async () => {
    let activeClientId = clientId.trim();
    if (!activeClientId) {
      activeClientId = await fetchBackendGoogleClientId();
    }

    if (
      !activeClientId ||
      activeClientId.startsWith("your_google_client_id")
    ) {
      toast.error("Google OAuth Client ID Not Configured", {
        description:
          "Set GOOGLE_CLIENT_ID in backend/.env (or NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local) and restart the server.",
      });
      return;
    }

    const googleOAuth2 =
      typeof window !== "undefined"
        ? (window as any).google?.accounts?.oauth2
        : null;

    if (!googleOAuth2) {
      toast.error("Google Sign-In Still Loading", {
        description: isGsiLoaded
          ? "Google OAuth client is unavailable. Please disable ad/script blockers and retry."
          : "Official Google Sign-In script is still loading. Please try again in a moment.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const client = googleOAuth2.initTokenClient({
        client_id: activeClientId,
        scope: "openid email profile",
        prompt: "select_account",
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            await executeGoogleAuth({
              access_token: tokenResponse.access_token,
            });
          } else {
            setIsLoading(false);
            if (tokenResponse?.error) {
              toast.error("Google Sign-In Failed", {
                description:
                  tokenResponse.error_description || tokenResponse.error,
              });
            }
          }
        },
        error_callback: (err: any) => {
          setIsLoading(false);
          toast.error("Google Connection Error", {
            description:
              err?.message || "Failed to open official Google Sign-In popup.",
          });
        },
      });

      client.requestAccessToken({ prompt: "select_account" });
    } catch (err: any) {
      console.error("[GSI] Failed to initialize token client:", err);
      setIsLoading(false);
      toast.error("Google Connection Error", {
        description:
          err?.message || "Failed to initialize official Google Sign-In.",
      });
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGsiLoaded(true)}
      />

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
            <span className="text-[#3c4043] font-medium">
              Connecting to Google...
            </span>
          </>
        ) : (
          <>
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
    </>
  );
}
