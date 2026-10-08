"use client";

import { useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const response = await api.post('/auth/login', { email, password });
        
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            router.push(response.data.user.role === 'admin' ? '/admin/dashboard' : '/tenant/dashboard');
        } else {
            throw new Error("No token returned");
        }
    } catch (err: any) {
        if (err.response?.status === 403 && err.response?.data?.message?.toLowerCase().includes('pending')) {
            setShowPendingModal(true);
        } else {
            toast.error(err.response?.data?.message || err.message || "Login failed. Please check credentials.");
        }
        setIsLoading(false);
    }
  };

  return (
    <div 
      className="dark flex min-h-screen flex-col items-center justify-center p-4 md:p-10 font-sans selection:bg-cyan-500/30 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/images/bg_img.png')" }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-[2px] z-0" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], opacity: { duration: 1, ease: "easeInOut" } }}
        className="relative z-10 w-full max-w-sm md:max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-xl">
            <CardContent className="grid p-0 md:grid-cols-2">
              {/* Left Column: Form */}
              <form className="p-8 sm:p-12 flex flex-col justify-center" onSubmit={handleLogin}>
                <FieldGroup>
                  <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Sign In</h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
                      Enter your credentials to access your portal.
                    </p>
                  </div>

                  <Field className="space-y-2.5">
                    <FieldLabel htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email:"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-14 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-5 text-base font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none"
                    />
                  </Field>
                  <Field className="space-y-2.5">
                    <div className="flex items-center justify-between ml-1">
                      <FieldLabel htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Password</FieldLabel>
                      <a
                        href="#"
                        className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                      >
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password:"
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-14 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-5 pr-12 text-base font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </Field>
                  <Field className="mt-4">
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold tracking-wide text-base transition-all shadow-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </Field>
                  
                  <div className="mt-10 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Don&apos;t have an account?{" "}
                      <Link href="/signup" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold ml-1 transition-colors">
                        Apply now
                      </Link>
                    </p>
                  </div>
                </FieldGroup>
              </form>

              {/* Right Column: Logo */}
              <div className="relative hidden bg-white/50 dark:bg-[#1e293b]/50 md:flex flex-col items-center justify-center p-12 border-l border-white/20 dark:border-white/10">
                <div className="relative w-96 h-96 mb-6 flex items-center justify-center drop-shadow-2xl">
                    <img src="/images/renttrack_logo.png" alt="StayTrack Logo" className="w-full h-full object-contain drop-shadow-lg" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome to RentTrack</h2>
                    <p className="text-slate-600 dark:text-zinc-400 font-medium">Your all-in-one Boarding house management solution.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* --- PENDING MODAL OVERLAY --- */}
      <AnimatePresence>
          {showPendingModal && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
              >
                  <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                      className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col overflow-hidden"
                  >
                      {/* Animated scanning line at top */}
                      <motion.div 
                          animate={{ left: ['-100%', '100%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                          className="absolute top-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                      />

                      {/* Animated scanning line at top */}
                      <motion.div
                          animate={{y: [5, 15]}}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                      />

                      <button 
                          onClick={() => setShowPendingModal(false)}
                          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
                          aria-label="Close"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>

                      {/* Status Indicator */}
                      <div className="flex flex-col mt-2">
                          <div className="flex items-center gap-4 mb-5">
                              {/* Icon */}
                              <div className="shrink-0 relative">
                                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                      </svg>
                                  </div>
                              </div>

                              {/* Status */}
                              <div className="flex flex-col">
                                  <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1.5">Access Restricted</h3>
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 self-start">
                                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Status: Pending Approval</span>
                                  </div>
                              </div>
                          </div>
                          
                          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                              Your tenant application is currently under review by the property administrator. You will be granted system access once your account is verified and approved.
                          </p>

                          <button 
                              onClick={() => setShowPendingModal(false)}
                              className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] text-sm"
                          >
                              I Understand 
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  )
}