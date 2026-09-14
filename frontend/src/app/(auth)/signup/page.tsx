"use client";
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';


// shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match. Please try again.");
            return;
        }
        
        if (!acceptTerms) {
            toast.error("Please accept the terms and privacy policy to continue.");
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/register', { name, email, phone, gender, address, password, role: 'tenant' });
            setShowSuccessModal(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Registration Failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-x-hidden font-sans selection:bg-cyan-500/30 py-8 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: "url('/bg_img.png')" }}
        >
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[2px] z-0" />

            {/* Signup Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], opacity: { duration: 1, ease: "easeInOut" } }}
                className="relative z-10 w-full max-w-2xl px-6 py-6 sm:p-8 mx-4 bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl"
            >
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Apply for Residency</h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">Create your tenant account to manage your stay.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Full Name</Label>
                            <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Email</Label>
                            <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Contact Number</Label>
                            <Input id="phone" type="tel" placeholder="09xxxxx8022" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="gender" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Gender</Label>
                            <Select value={gender} onValueChange={(val) => setGender(val || '')} disabled={isLoading}>
                                <SelectTrigger id="gender" className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none">
                                    <SelectValue placeholder="Select Gender" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
                                    <SelectItem value="Male" className="rounded-lg cursor-pointer">Male</SelectItem>
                                    <SelectItem value="Female" className="rounded-lg cursor-pointer">Female</SelectItem>
                                    <SelectItem value="Other" className="rounded-lg cursor-pointer">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="address" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Home Address</Label>
                            <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Password</Label>
                            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>

                        <div className="space-y-1.5 sm:col-span-1">
                            <Label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} disabled={isLoading} className="h-11 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 mt-4">
                        <Checkbox 
                            id="terms" 
                            checked={acceptTerms} 
                            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                            disabled={isLoading}
                            className="border-slate-300 dark:border-zinc-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-white data-[state=checked]:border-cyan-500"
                        />
                        <label 
                            htmlFor="terms" 
                            className="text-sm font-medium leading-none text-slate-600 dark:text-zinc-400 cursor-pointer"
                        >
                            I accept the <Link href="/terms" className="text-cyan-600 dark:text-cyan-400 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-cyan-600 dark:text-cyan-400 hover:underline">Privacy Policy</Link>
                        </label>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full h-11 mt-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold tracking-wide text-sm transition-all shadow-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Submit Application"
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-[13px] font-medium text-slate-500 dark:text-zinc-400">
                        Already have an account?{' '}
                        <Link href="/login" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold ml-1 transition-colors">
                            Log in here
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* --- SUCCESS MODAL OVERLAY --- */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-sm w-full shadow-2xl relative flex flex-col items-center"
                        >
                            <button 
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    router.push('/?registered=true');
                                }}
                                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full p-2"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <motion.path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="3"
                                        d="M5 13l4 4L19 7"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                                    />
                                </svg>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Application Received!</h3>
                            <p className="text-slate-500 dark:text-zinc-400 text-center mb-6 text-sm leading-relaxed font-medium">
                                Welcome to RentTrack. Your application has been submitted and is pending admin approval.
                            </p>

                            <Button 
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    router.push('/?registered=true');
                                }}
                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-slate-900 rounded-2xl font-bold"
                            >
                                Proceed to Login
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}