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
    }, 2800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="dark min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-black font-sans selection:bg-cyan-500/30">
      


      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center justify-center"
      >
        <div className="w-48 sm:w-64 h-48 sm:h-64 mb-2 flex items-center justify-center">
            <img src="/images/renttrack_logo.png" alt="RentTrack Logo" className="w-full h-full object-contain" />
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
