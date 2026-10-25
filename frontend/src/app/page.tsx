"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  const iconControls = useAnimationControls();
  const textControls = useAnimationControls();
  const progressControls = useAnimationControls();

  useEffect(() => {
    let isCancelled = false;

    const startSequence = async () => {
      // Small pause for component mount & layout calculation
      await new Promise((r) => setTimeout(r, 150));
      if (isCancelled) return;

      // Calculate initial offset so the icon sits in the dead center alone:
      // Distance from icon center to lockup center is exactly (textWidth + gap) / 2
      const measuredWidth = textRef.current?.offsetWidth;
      const fallbackWidth =
        typeof window !== "undefined"
          ? window.innerWidth < 640
            ? 237
            : window.innerWidth < 768
            ? 284
            : 331
          : 284;
      const textWidth = measuredWidth && measuredWidth > 50 ? measuredWidth : fallbackWidth;
      const gap = typeof window !== "undefined" && window.innerWidth < 640 ? 14 : 16;
      const initialOffset = (textWidth + gap) / 2;

      // Initial placement: Icon centered, Text hidden, Progress hidden
      iconControls.set({ x: initialOffset, opacity: 0, scale: 0.88 });
      textControls.set({ opacity: 0, x: -16 });
      progressControls.set({ opacity: 0, y: 16 });

      // Step 1: Icon logo fades in at the center
      await iconControls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
      });
      if (isCancelled) return;

      // Brief hold so user sees the icon logo centered
      await new Promise((r) => setTimeout(r, 350));
      if (isCancelled) return;

      // Step 2: Icon slides to the left & Text logo fades in, staying centered
      await Promise.all([
        iconControls.start({
          x: 0,
          transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
        }),
        textControls.start({
          opacity: 1,
          x: 0,
          transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
        }),
      ]);
      if (isCancelled) return;

      // Brief pause after logo lockup is complete
      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled) return;

      // Step 3: Loading progress bar starts showing
      await progressControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
      });
      if (isCancelled) return;

      // Step 4: Loading progress bar animation slide from 0% to 100%
      let currentProgress = 8;
      setProgress(8);

      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 14 + 6;
        if (currentProgress >= 94) {
          currentProgress = 94;
          clearInterval(progressInterval);
        }
        setProgress(Math.min(94, Math.round(currentProgress)));
      }, 180);

      // Ping backend in background
      try {
        await api.get("/health").catch(() => {});
      } catch (err) {
        // Backend delayed or wake up in progress
      }

      // Finish progress to 100%
      clearInterval(progressInterval);
      setProgress(100);

      // Short delay after 100% before redirecting to login
      await new Promise((r) => setTimeout(r, 650));
      if (!isCancelled) {
        router.push("/login");
      }
    };

    startSequence();

    return () => {
      isCancelled = true;
    };
  }, [router, iconControls, textControls, progressControls]);

  return (
    <div className="dark min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#07152b] font-sans selection:bg-teal-500/30">
      {/* Main Center Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 w-full">
        {/* Logo Lockup */}
        <div className="relative flex items-center justify-center gap-3.5 sm:gap-4 select-none">
          {/* 1. Icon Logo (rentTrack_icon.png) */}
          <motion.div
            animate={iconControls}
            initial={{ opacity: 0, scale: 0.88 }}
            className="relative shrink-0 flex items-center justify-center z-10"
          >
            <img
              src="/images/logo/rentTrack_icon.png"
              alt="RentTrack Icon"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain"
            />
          </motion.div>

          {/* 2. Text Logo (rentTrack_text.png) */}
          <motion.div
            ref={textRef}
            animate={textControls}
            initial={{ opacity: 0, x: -16 }}
            className="relative shrink-0 flex items-center justify-center z-10"
          >
            <img
              src="/images/logo/rentTrack_text.png"
              alt="RentTrack"
              style={{ aspectRatio: "1947 / 329" }}
              className="h-10 sm:h-12 md:h-14 w-auto object-contain"
            />
          </motion.div>
        </div>

        {/* 3. Loading Progress Bar & Status */}
        <motion.div
          animate={progressControls}
          initial={{ opacity: 0, y: 16 }}
          className="mt-10 sm:mt-12 flex flex-col items-center gap-3 w-full max-w-xs sm:max-w-sm px-4"
        >
          {/* Progress Bar Track */}
          <div className="w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden relative border border-white/10">
            {/* Filled Progress Bar with Sliding Animation */}
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 rounded-full relative"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
            >
              {/* Continuous Sliding Shimmer Beam */}
              <motion.div
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                animate={{ left: ["-100%", "200%"] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>

          {/* Status Label and Percentage */}
          <div className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 dark:text-zinc-400 px-0.5">
            <span className="tracking-wide">
              {progress < 40
                ? "Connecting to RentTrack..."
                : progress < 85
                ? "Preparing your workspace..."
                : "Welcome to RentTrack"}
            </span>
            <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
