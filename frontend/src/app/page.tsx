"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const iconControls = useAnimationControls();
  const textControls = useAnimationControls();

  useEffect(() => {
    let isCancelled = false;

    const startSequence = async () => {
      // Small pause for component mount & layout calculation
      await new Promise((r) => setTimeout(r, 150));
      if (isCancelled) return;

      // Measure dimensions for perfect positioning
      const measuredTextWidth = textRef.current?.offsetWidth;
      const fallbackTextWidth =
        typeof window !== "undefined"
          ? window.innerWidth < 640
            ? 170
            : window.innerWidth < 768
            ? 210
            : 250
          : 210;
      const textWidth = measuredTextWidth && measuredTextWidth > 30 ? measuredTextWidth : fallbackTextWidth;

      const measuredIconWidth = iconRef.current?.offsetWidth;
      const fallbackIconWidth =
        typeof window !== "undefined"
          ? window.innerWidth < 640
            ? 64
            : window.innerWidth < 768
            ? 80
            : 96
          : 80;
      const iconWidth = measuredIconWidth && measuredIconWidth > 20 ? measuredIconWidth : fallbackIconWidth;

      const gap = typeof window !== "undefined" && window.innerWidth < 640 ? 14 : 16;

      // Distance from icon center to lockup center:
      const initialOffset = (textWidth + gap) / 2;
      // Position text so its left edge sits directly behind the centered logo icon:
      const textBehindOffset = initialOffset - (iconWidth + gap);

      // Initial placement: Icon centered in front (z-20), Text directly behind icon (z-10)
      iconControls.set({ x: initialOffset, opacity: 0, scale: 0.88 });
      textControls.set({ x: textBehindOffset, opacity: 0 });

      // Step 1: Icon logo fades in at the center in front
      await iconControls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
      });
      if (isCancelled) return;

      // Brief hold so user sees the icon logo centered alone
      await new Promise((r) => setTimeout(r, 350));
      if (isCancelled) return;

      // Step 2: Icon slides to the left & Text logo starts showing and emerges from behind the logo
      await Promise.all([
        iconControls.start({
          x: 0,
          transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
        }),
        textControls.start({
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.85,
            ease: [0.16, 1, 0.3, 1],
            opacity: { duration: 0.65, ease: "easeOut" },
          },
        }),
      ]);
      if (isCancelled) return;

      // Brief pause after logo lockup is complete so user sees the full brand lockup
      await new Promise((r) => setTimeout(r, 250));
      if (isCancelled) return;

      // Probe real-time internet connection speed (RTT, bandwidth, throttling)
      const checkConnectionSpeed = async (): Promise<"fast" | "moderate" | "slow"> => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return "slow";
        }

        let isFastHint = false;

        if (typeof navigator !== "undefined" && "connection" in navigator) {
          const conn = (navigator as any).connection;
          if (conn) {
            const effectiveType = (conn.effectiveType || "").toLowerCase();
            const downlink = typeof conn.downlink === "number" ? conn.downlink : 10;
            const rtt = typeof conn.rtt === "number" ? conn.rtt : 50;

            if (
              effectiveType === "2g" ||
              effectiveType === "slow-2g" ||
              (effectiveType === "3g" && (rtt > 350 || downlink < 1.5)) ||
              downlink < 1.5 ||
              rtt > 400
            ) {
              return "slow";
            }
            if (downlink >= 4 && rtt <= 150) {
              isFastHint = true;
            }
          }
        }

        // Active real-time ping to backend API
        const pingStart = performance.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          await api.get(`/health?_t=${Date.now()}`, { signal: controller.signal });
          clearTimeout(timer);
          const pingDuration = performance.now() - pingStart;

          if (pingDuration > 450) {
            return "slow";
          }
          if (pingDuration < 160 && isFastHint) {
            return "fast";
          }
          if (pingDuration < 200) {
            return "fast";
          }
        } catch {
          return "slow";
        }

        return isFastHint ? "fast" : "moderate";
      };

      // Start connection speed test in parallel
      const speedCheckPromise = checkConnectionSpeed();

      // Step 3: Loading progress bar ONLY shows when logo and text are complete
      setShowProgress(true);

      // Brief wait for progress container to fade into view before starting fill animation
      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled) return;

      // Step 4: Progress bar runs according to real internet connection speed:
      // - Fast internet: goes to 100% quickly (~650ms)
      // - Slow internet: runs slowly (~4200ms) until it reaches 100%
      await new Promise<void>((resolve) => {
        let currentProgress = 0;
        let speedProfile: "fast" | "moderate" | "slow" = "fast";

        // Check if navigator already flags slow connection or offline
        if (
          typeof navigator !== "undefined" &&
          (!navigator.onLine ||
            ("connection" in navigator &&
              ((navigator as any).connection?.effectiveType === "2g" ||
                (navigator as any).connection?.effectiveType === "slow-2g" ||
                (navigator as any).connection?.rtt > 350 ||
                (navigator as any).connection?.downlink < 1.5)))
        ) {
          speedProfile = "slow";
          setIsSlowConnection(true);
        }

        speedCheckPromise.then((detected) => {
          speedProfile = detected;
          if (detected === "slow") {
            setIsSlowConnection(true);
          }
        });

        const startTime = performance.now();

        const step = (now: number) => {
          if (isCancelled) return;
          const elapsed = now - startTime;

          // Dynamic duration: minimum 5 seconds (5000ms) even on fast connections as requested
          const duration =
            speedProfile === "fast"
              ? 5000
              : speedProfile === "slow"
              ? 7500
              : 6000;

          const t = Math.min(elapsed / duration, 1);
          // Easing: easeInOutQuad for natural, steady walking progression across the 5 seconds
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const current = Math.min(100, Math.round(eased * 100));

          if (current > currentProgress) {
            currentProgress = current;
            setProgress(currentProgress);
          }

          if (currentProgress < 100) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(step);
      });
      if (isCancelled) return;

      setProgress(100);

      // Brief delay after reaching 100% so user sees arrival at the house before redirecting to login
      await new Promise((r) => setTimeout(r, 600));
      if (!isCancelled) {
        router.push("/login");
      }
    };

    startSequence();

    return () => {
      isCancelled = true;
    };
  }, [router, iconControls, textControls]);

  return (
    <div className="dark min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#07152b] font-sans selection:bg-teal-500/30">
      {/* Main Center Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 w-full">
        {/* Logo Lockup */}
        <div className="relative flex items-center justify-center gap-3.5 sm:gap-4 select-none">
          {/* 1. Icon Logo (rentTrack_icon.png) */}
          <motion.div
            ref={iconRef}
            animate={iconControls}
            initial={{ opacity: 0, scale: 0.88 }}
            className="relative shrink-0 flex items-center justify-center z-20 bg-[#07152b]"
          >
            <img
              src="/images/logo/rentTrack_icon.png"
              alt="RentTrack Icon"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain bg-[#07152b]"
            />
          </motion.div>

          {/* 2. Text Brand Logo */}
          <motion.div
            ref={textRef}
            animate={textControls}
            initial={{ opacity: 0 }}
            className="relative shrink-0 flex items-center justify-center z-10 select-none pt-1.5 sm:pt-2 md:pt-2.5"
          >
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-black tracking-tight leading-none drop-shadow-sm whitespace-nowrap">
              <span className="text-white">Rent</span>
              <span className="text-teal-400">Track</span>
            </span>
          </motion.div>
        </div>

        {/* 3. Loading Progress Journey: Human figure walking from the left to reach the RentTrack house on the right */}
        <div
          className={`mt-6 sm:mt-7 flex flex-col items-center gap-3 w-full max-w-[360px] sm:max-w-[480px] md:max-w-[540px] px-3 transition-opacity duration-300 select-none ${
            showProgress ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Journey Track Arena */}
          <div className="relative w-full h-16 sm:h-20 flex items-end">
            {/* Ground Road Track Line */}
            <div className="absolute bottom-2 sm:bottom-2.5 left-0 right-14 sm:right-16 md:right-20 h-[3px] sm:h-1 bg-white/15 rounded-full overflow-hidden">
              {/* Traveled Path (filled teal line with soft glow) */}
              <div
                className="h-full bg-teal-400 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Walker Runway */}
            <div className="absolute inset-y-0 left-4 sm:left-5 right-14 sm:right-16 md:right-20 pointer-events-none">
              {/* Walking Human Figure */}
              <div
                className="absolute bottom-2 sm:bottom-2.5 -translate-x-1/2 transition-all duration-75 z-10"
                style={{
                  left: `${progress}%`,
                  ["--walk-speed" as any]: isSlowConnection ? "0.65s" : "0.50s",
                }}
              >
                <div className={progress < 100 ? "animate-walk-bob" : ""}>
                  <svg
                    viewBox="0 0 28 34"
                    className="w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-13 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                    fill="none"
                  >
                    {/* Head */}
                    <circle cx="14" cy="5" r="3.8" fill="currentColor" />

                    {/* Back Arm (Left / Far arm - slightly dimmer for 3D depth) */}
                    <line
                      x1="14"
                      y1="11.5"
                      x2="14"
                      y2="19.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      className={progress < 100 ? "animate-walk-arm-left" : ""}
                      style={{ opacity: 0.55 }}
                    />

                    {/* Torso */}
                    <line
                      x1="14"
                      y1="9.5"
                      x2="14"
                      y2="20"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />

                    {/* Back Leg (Left / Far leg - slightly dimmer for 3D depth) */}
                    <line
                      x1="14"
                      y1="20"
                      x2="14"
                      y2="32.5"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      className={progress < 100 ? "animate-walk-leg-left" : ""}
                      style={{ opacity: 0.55 }}
                    />

                    {/* Front Leg (Right / Near leg - full opacity) */}
                    <line
                      x1="14"
                      y1="20"
                      x2="14"
                      y2="32.5"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      className={progress < 100 ? "animate-walk-leg-right" : ""}
                    />

                    {/* Front Arm (Right / Near arm - full opacity) */}
                    <line
                      x1="14"
                      y1="11.5"
                      x2="14"
                      y2="19.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      className={progress < 100 ? "animate-walk-arm-right" : ""}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Destination House (rentTrack_icon.png) on the right */}
            <div className="absolute right-0 bottom-0 flex flex-col items-center select-none">
              <div
                className={`relative transition-all duration-300 ${
                  progress === 100
                    ? "scale-110 drop-shadow-[0_0_18px_rgba(45,212,191,0.95)]"
                    : "drop-shadow-[0_0_6px_rgba(45,212,191,0.3)]"
                }`}
              >
                <img
                  src="/images/logo/rentTrack_icon.png"
                  alt="Destination House"
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Centered Actual Loading Text & Percentage */}
          <div className="flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-mono tracking-wider">
            <span className="text-slate-400">Loading...</span>
            <span className="font-semibold text-teal-300">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
