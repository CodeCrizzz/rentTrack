"use client";

import { useState, useEffect } from 'react';
import { 
    Shield, Bell, Moon, Sun, Laptop, Info, 
    LogOut, Save, Smartphone, Monitor, UserX,
    Lock, Mail, Key, Eye, EyeOff, CheckCircle2,
    Sliders, RefreshCw, AlertTriangle, ShieldCheck,
    Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function TenantSettingsPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    // Form states
    const [email, setEmail] = useState('tenant@renttrack.com');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Notification states
    const [notifications, setNotifications] = useState({
        paymentReminders: true,
        paymentStatusUpdates: true,
        overduePayment: true,
        maintenanceUpdates: true,
        maintenanceResolution: true,
        adminMessages: true,
        soundAlerts: true
    });

    const [localTheme, setLocalTheme] = useState('system');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.email) setEmail(u.email);
                } catch (e) {}
            }
            const savedStr = localStorage.getItem('renttrack_tenant_settings');
            if (savedStr) {
                try {
                    const saved = JSON.parse(savedStr);
                    if (saved.notifications) setNotifications(prev => ({ ...prev, ...saved.notifications }));
                    if (saved.theme) setLocalTheme(saved.theme);
                    else if (theme) setLocalTheme(theme);
                } catch (e) {}
            } else if (theme) {
                setLocalTheme(theme);
            }
        }
        const timer = setTimeout(() => setIsLoading(false), 250);
        return () => clearTimeout(timer);
    }, [theme]);

    const handleSaveChanges = async () => {
        setIsSaving(true);

        try {
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    toast.error("New passwords do not match!");
                    setIsSaving(false);
                    return;
                }
                if (!currentPassword) {
                    toast.error("Please provide your current password to set a new password.");
                    setIsSaving(false);
                    return;
                }
                await api.put('/tenant/profile/password', { currentPassword, newPassword });
                toast.success("Password updated successfully!");
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

            setTheme(localTheme);
            const updatedSettings = {
                email,
                notifications,
                theme: localTheme
            };
            localStorage.setItem('renttrack_tenant_settings', JSON.stringify(updatedSettings));
            window.dispatchEvent(new CustomEvent('renttrack-tenant-settings-saved', { detail: updatedSettings }));
            
            toast.success("Resident preferences saved successfully!");
        } catch (err: any) {
            console.error("Failed to save settings:", err);
            toast.error(err.response?.data?.message || "Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        if (pass.length > 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 3;
        if (pass.length > 6) return 2;
        return 1;
    };
    
    const strength = handlePasswordStrength(newPassword);

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    // Toggle switch helper
    const ToggleSwitch = ({ 
        checked, 
        onChange, 
        label, 
        description 
    }: { 
        checked: boolean; 
        onChange: (c: boolean) => void; 
        label: string; 
        description?: string 
    }) => (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
            <div className="pr-4">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{label}</span>
                {description && <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );

    // SKELETON LOADER
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse pb-12">
                {/* Header Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div>
                        <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-2"></div>
                    </div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                </div>

                {/* Telemetry Ribbon (4 Tiles) Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Skeleton: Security & Password */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="h-6 w-52 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-10 w-full bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/*  Skeleton: Notification Triggers */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="h-6 w-52 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 w-full bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800"></div>
                        ))}
                    </div>
                </div>

                {/* Skeleton: Theme & Display */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="h-6 w-44 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-28 w-full bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800"></div>
                        ))}
                    </div>
                </div>

                {/* Skeleton: Sessions & Account */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    <div className="space-y-3">
                        <div className="h-16 w-full bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800"></div>
                        <div className="h-16 w-full bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800"></div>
                    </div>
                </div>
            </div>
        );
    }

    // settings page 
    return (
        <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-teal-600" />
                            <span>Resident Preferences & Settings</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>ACCOUNT ACTIVE</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        All account credentials, notification triggers, display themes, and active sessions in one single page.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save All Preferences</span>
                    </button>
                </div>
            </div>

            {/*  Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Security Profile */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Profile</span>
                        <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            Protected
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">SHA-256 Encrypted</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                {/* Alert Rules */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alert Rules</span>
                        <div className="text-lg font-extrabold font-mono text-teal-600 dark:text-teal-400 mt-0.5 leading-tight">
                            7 Triggers
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Push & in-app alerts active</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

                {/*Session Status */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Device</span>
                        <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            Current Device
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">Session Active Now</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                    </div>
                </div>

                {/* App Portal Engine */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Platform Portal</span>
                        <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            RentTrack v2.4
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Resident Portal Engine</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                </div>
            </div>
            {/* SECURITY & PASSWORD */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">   
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 1
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-teal-600" />
                                <span>Security & Password</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Keep your login email and credentials updated to secure your resident portal account.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Encrypted Credentials</span>
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl pt-1">
                    {/* Registered Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>Registered Email Address</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">Official email used for statements and notifications.</p>
                    </div>

                    {/* Current Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Current Password</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords ? "text" : "password"}
                                placeholder="••••••••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">Required to authorize new password changes.</p>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-slate-400" />
                                <span>New Password</span>
                            </span>
                            {newPassword && (
                                <span className={`text-[10px] font-bold ${
                                    strength === 3 ? 'text-emerald-500' : strength === 2 ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                    {strength === 3 ? 'Strong' : strength === 2 ? 'Fair' : 'Weak'}
                                </span>
                            )}
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            placeholder="Enter new strong password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                        />
                        {newPassword && (
                            <div className="flex gap-1.5 pt-0.5">
                                <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                            </div>
                        )}
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Confirm New Password</span>
                        </label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[11px] text-rose-500 font-semibold">Passwords do not match.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* CATEGORY 2: NOTIFICATION TRIGGERS */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 2
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-4 h-4 text-teal-600" />
                                <span>Notification Triggers</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Control which system events send real-time alerts and in-system reminders to your resident account.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        7 Configurable Alerts
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {[
                        { key: 'paymentReminders', label: 'Billing Statement Reminders', desc: 'Alert when a new monthly invoice is published' },
                        { key: 'paymentStatusUpdates', label: 'Payment Verification Confirmations', desc: 'Notify when uploaded GCash/Maya receipts are verified' },
                        { key: 'overduePayment', label: 'Overdue Dues Warnings', desc: 'Immediate notification if payment passes the grace period' },
                        { key: 'maintenanceUpdates', label: 'Maintenance Request Updates', desc: 'Updates when repair work begins on your request' },
                        { key: 'maintenanceResolution', label: 'Work Order Resolution Notifications', desc: 'Notify when repairs in your suite are marked completed' },
                        { key: 'adminMessages', label: 'Management Direct Chat Pings', desc: 'Badge and sound notifications on new landlord messages' },
                        { key: 'soundAlerts', label: 'Audio Chime Alerts', desc: 'Play gentle sound chime on critical incoming announcements' }
                    ].map((item: any) => (
                        <ToggleSwitch
                            key={item.key}
                            checked={(notifications as any)[item.key]}
                            onChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                            label={item.label}
                            description={item.desc}
                        />
                    ))}
                </div>
            </div>

            {/* CATEGORY 3: THEME & DISPLAY */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 3
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Moon className="w-4 h-4 text-teal-600" />
                                <span>Theme & Display</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Customize the visual contrast and theme of the resident portal across all your devices.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        Active: <strong className="capitalize text-slate-800 dark:text-white">{localTheme}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    {[
                        { key: 'light', label: 'Clean Light', icon: Sun, desc: 'High-contrast clean day mode' },
                        { key: 'dark', label: 'Deep Obsidian', icon: Moon, desc: 'OLED-optimized rich dark mode' },
                        { key: 'system', label: 'System Default', icon: Laptop, desc: 'Sync automatically with OS preferences' }
                    ].map(m => {
                        const Icon = m.icon;
                        const isSelected = localTheme === m.key;

                        return (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => {
                                    setLocalTheme(m.key);
                                }}
                                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-32 ${
                                    isSelected
                                        ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-500/10 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                                    }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    {isSelected && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                                </div>

                                <div>
                                    <span className="text-xs font-bold block">{m.label}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 block">{m.desc}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CATEGORY 4: SESSIONS & ACCOUNT */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 4
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-teal-600" />
                                <span>Sessions & Account</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Review authorized device tokens and securely sign out of your resident session.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        1 Active Session
                    </span>
                </div>

                <div className="space-y-3 pt-1">
                    {/* Active Session Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">Current Browser Session</p>
                                <p className="text-[10px] text-emerald-600 font-bold">Active now · Authorized Resident JWT</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-200/50">
                            THIS DEVICE
                        </span>
                    </div>

                    {/* Sign Out Card */}
                    <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Sign Out of Resident Portal</span>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">Invalidate local authentication token and return to the login screen.</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 self-start sm:self-center shadow-xs"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-card shadow-xs">
                <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Ready to apply changes?</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">All 4 categories above will be synchronized immediately.</span>
                </div>
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save All Changes</span>
                </button>
            </div>

        </div>
    );
}
