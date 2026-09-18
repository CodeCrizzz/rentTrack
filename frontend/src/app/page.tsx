"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Wait for the loading animation to play, then redirect
    const timer = setTimeout(() => {
      router.push('/login');
    }, 8000); // 8 seconds delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="dark min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 to-black font-sans selection:bg-cyan-500/30">
      


      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center justify-center"
      >
        <div className="relative w-80 sm:w-[450px] h-32 mb-2 flex items-center justify-center">
            {/* Animated Logo */}
            <motion.img 
              src="/images/renttrack_app_logo.png" 
              alt="RentTrack App Logo" 
              className="absolute h-24 sm:h-32 w-auto object-contain drop-shadow-2xl z-10"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: -140 }}
              transition={{
                opacity: { duration: 0.5, ease: "easeOut" },
                x: { delay: 1.0, duration: 0.6, type: "spring", stiffness: 100, damping: 15 }
              }}
            />
            {/* Animated Text */}
            <motion.img 
              src="/images/text.png" 
              alt="RentTrack Text" 
              className="absolute h-10 sm:h-12 w-auto object-contain drop-shadow-xl z-0"
              initial={{ opacity: 0, scale: 0.5, x: 90, y: 12 }}
              animate={{ opacity: 1, scale: 1, x: 90, y: 12 }}
              transition={{
                delay: 1.4,
                duration: 0.5,
                type: "spring",
                stiffness: 250,
                damping: 20
              }}
            />
        </div>
        
        <div className="flex flex-col items-center gap-3">
            {/* Loading Bar */}
            <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ 
                        repeat: Infinity, 
                        duration: 1.5, 
                        ease: "easeInOut" 
                    }}
                    className="w-full h-full bg-cyan-400 rounded-full"
                />
            </div>
            
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mt-2 animate-pulse">
                please wait...
            </p>
        </div>
      </motion.div>
    </div>
  );
}
