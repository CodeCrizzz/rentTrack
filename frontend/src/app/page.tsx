"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pingBackend = async () => {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 15;
        });
      }, 500);

      try {
        await api.get('/health');
      } catch (error) {
        console.error("Backend wakeup failed or delayed", error);
      } finally {
        clearInterval(interval);
        setProgress(100);
        
        // Wait for the loading animation to play for a few seconds before redirecting
        setTimeout(() => {
          router.push('/login');
        }, 500);
      }
    };

    // Delay API call by 4.8 seconds
    const initTimer = setTimeout(() => {
      pingBackend();
    }, 4800);

    return () => {
      clearTimeout(initTimer);
      if (interval) clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="dark min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#011330] font-sans selection:bg-cyan-100/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center justify-center"
      >
        <div className="relative w-96 sm:w-[600px] h-80 sm:h-[350px] flex items-center justify-center">
            <video 
              src="/images/renttrack_animation.mp4" 
              autoPlay 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
            />
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4, duration: 0.8 }}
                className="absolute bottom-8 flex flex-col items-center gap-3 z-20"
            >
                {/* Loop Loading Bar */}
                <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
                    <motion.div 
                        initial={{ x: "0%" }}
                        animate={{ x: "100%" }}
                        transition={{ 
                            repeat: Infinity, 
                            repeatType: "reverse",
                            ease: "easeInOut", 
                            duration: 1,
                            delay: 4
                        }}
                        className="w-1/2 h-full bg-cyan-400 rounded-full absolute left-0"
                    />
                </div>
                
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mt-2 animate-pulse drop-shadow-md">
                    please wait...
                </p>
            </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

