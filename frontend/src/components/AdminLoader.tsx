"use client";
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import the Lottie Player with SSR disabled
const Player = dynamic(
    () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
    { 
        ssr: false,
        loading: () => <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div> 
    }
);

export default function AdminLoader({ message = "Loading." }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[70vh] w-full">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center justify-center"
            >
                <Player
                    src="/images/House Stats.json"
                    className="w-48 h-48 sm:w-64 sm:h-64"
                    loop
                    autoplay
                />
                <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-[0.2em] pl-[0.2em] -mt-16 animate-pulse text-center relative z-10">
                    {message}
                </p>
            </motion.div>
        </div>
    );
}


