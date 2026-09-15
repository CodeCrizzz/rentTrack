"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsPage() {
    return (
        <div 
            className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden bg-cover bg-center bg-no-repeat bg-fixed font-sans selection:bg-cyan-500/30 py-24 sm:py-32 px-4 sm:px-6"
            style={{ backgroundImage: "url('/bg_img.png')" }}
        >
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[2px] z-0" />
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-4xl px-6 py-10 sm:p-12 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-white/10 shadow-none"
            >
                <div className="mb-10 border-b border-slate-200 dark:border-white/10 pb-8">
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Terms of Service</h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-zinc-400">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
                    <p className="mb-6">
                        By accessing and using the RentTrack platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. User Accounts</h2>
                    <p className="mb-6">
                        You are responsible for safeguarding the password that you use to access the Platform and for any activities or actions under your password. You agree not to disclose your password to any third party.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Rent & Payments</h2>
                    <p className="mb-6">
                        All rental payments are due as stipulated in your lease agreement. Late payments may result in penalties or termination of the lease according to the agreed terms.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Maintenance Requests</h2>
                    <p className="mb-6">
                        Maintenance requests must be submitted through the Platform. We strive to address all requests promptly, but resolution times may vary depending on the severity of the issue.
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
