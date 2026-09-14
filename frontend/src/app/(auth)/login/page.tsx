"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  useEffect(() => { setIsMounted(true); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
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
        setErrorMsg(err.response?.data?.message || err.message || "Login failed. Please check credentials.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isMounted) return <div className="dark min-h-screen bg-black" />;

  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center bg-black p-4 md:p-10 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm md:max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0 rounded-3xl border border-slate-200 dark:border-white/10 shadow-none bg-white dark:bg-[#0a0a0a]">
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

                  {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3">
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <Field className="space-y-2.5">
                    <FieldLabel htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ml-1">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
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
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-14 bg-transparent border-slate-200 dark:border-white/10 rounded-xl px-5 text-base font-medium focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500 transition-all shadow-none"
                    />
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
              <div className="relative hidden bg-slate-50 dark:bg-white/[0.02] md:flex flex-col items-center justify-center p-12 border-l border-white/20 dark:border-white/10">
                <div className="relative w-64 h-64 mb-6 flex items-center justify-center drop-shadow-2xl">
                    <img src="/renttrack_logo.png" alt="StayTrack Logo" className="w-full h-full object-contain drop-shadow-lg" />
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
    </div>
  )
}