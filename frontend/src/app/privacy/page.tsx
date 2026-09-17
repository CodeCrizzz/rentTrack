"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
    return (
        <div 
            className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-cover bg-center bg-no-repeat bg-fixed font-sans selection:bg-cyan-500/30 py-24 sm:py-32 px-4 sm:px-6"
            style={{ backgroundImage: "url('/images/bg_img.png')" }}
        >
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[2px] z-0" />
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-4xl px-6 py-10 sm:p-12 bg-card rounded-3xl border border-slate-200 dark:border-white/10 shadow-none"
            >
                <div className="mb-10 border-b border-slate-200 dark:border-white/10 pb-8">
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Privacy Policy</h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-zinc-400">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
                    <p className="mb-6">
                        We collect information you provide directly to us, such as when you create an account, apply for residency, or communicate with us. This may include your name, email address, phone number, and physical address.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
                    <p className="mb-6">
                        We use the information we collect to operate, maintain, and improve our services, including processing applications, managing rent payments, and responding to maintenance requests.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Data Security</h2>
                    <p className="mb-6">
                        We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Contact Us</h2>
                    <p className="mb-6">
                        If you have any questions about this Privacy Policy, please contact us through the chat system in your dashboard or by emailing support@renttrack.com.
                    </p>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10">
                    <Link href="/signup" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-slate-900 font-bold transition-colors">
                        Back to Signup
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
