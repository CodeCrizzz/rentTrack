"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Shield, Bell, Moon, Sun, Laptop, 
    Save, RotateCcw, Lock, Mail, Key, Eye, EyeOff, 
    User, Monitor, LogOut, Search, SlidersHorizontal,
    Check, RefreshCw, CheckCircle2, ShieldCheck, Activity
} from 'lucide-react';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface TenantSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TenantSettingsCategory = 
    | 'security' 
    | 'notifications' 
    | 'appearance' 
    | 'sessions';

const DEFAULT_TENANT_SETTINGS = {
    email: 'tenant@renttrack.com',
    twoFactorAuth: false,
    notifications: {
        paymentReminders: true,
        paymentStatusUpdates: true,
        overduePayment: true,
        maintenanceUpdates: true,
        maintenanceResolution: true,
        adminMessages: true,
        soundAlerts: true
    },
    theme: 'system'
};

const getSavedTenantSettings = () => {
    if (typeof window === 'undefined') return DEFAULT_TENANT_SETTINGS;
    try {
        const stored = localStorage.getItem('renttrack_tenant_settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_TENANT_SETTINGS,
                ...parsed,
                notifications: { ...DEFAULT_TENANT_SETTINGS.notifications, ...(parsed.notifications || {}) }
            };
        }
    } catch (e) {
        console.error('Error reading renttrack_tenant_settings', e);
    }
    return DEFAULT_TENANT_SETTINGS;
};

export default function TenantSettingsModal({ isOpen, onClose }: TenantSettingsModalProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TenantSettingsCategory>('security');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    // Initial snapshot of saved settings
    const savedSettingsRef = useRef(getSavedTenantSettings());

    // Form states - Security & Account
    const [tenantName, setTenantName] = useState('Resident');
    const [email, setEmail] = useState(savedSettingsRef.current.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorAuth, setTwoFactorAuth] = useState(savedSettingsRef.current.twoFactorAuth);

    // Form states - Notifications
    const [notifications, setNotifications] = useState(savedSettingsRef.current.notifications);

    // Form states - Appearance (Candidate theme before saving)
    const [localTheme, setLocalTheme] = useState(savedSettingsRef.current.theme || theme || 'system');

    // Load active resident profile info from localStorage or API
    const loadResidentProfile = () => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    if (u.name) setTenantName(u.name);
                    if (u.email) setEmail(u.email);
                } catch (e) {}
            }
        }
    };

    // Revert working state to saved settings
    const revertToSavedSettings = () => {
        const currentSaved = getSavedTenantSettings();
        savedSettingsRef.current = currentSaved;

        loadResidentProfile();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTwoFactorAuth(currentSaved.twoFactorAuth);

        setNotifications({ ...currentSaved.notifications });
        setLocalTheme(currentSaved.theme || theme || 'system');
    };

    // Resynchronize from saved state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            revertToSavedSettings();
        }
    }, [isOpen]);

    // Close handler ensuring unsaved changes are discarded
    const handleCloseModal = () => {
        revertToSavedSettings();
        onClose();
    };

    // Escape key listener to close modal and revert unsaved changes
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleCloseModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Save changes: only committed on explicit save
    const handleSaveChanges = async () => {
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match!");
                return;
            }
            if (!currentPassword) {
                toast.error("Please provide your current password to authorize this update.");
                return;
            }
        }

        setIsSaving(true);

        try {
            // Update password via backend API if entered
            if (newPassword) {
                await api.put('/tenant/profile/password', { currentPassword, newPassword });
                toast.success("Security password updated successfully!");
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

            const updatedSettings = {
                email,
                twoFactorAuth,
                notifications,
                theme: localTheme
            };

            // Theme change ONLY applies when user clicks Save Changes
            setTheme(localTheme);

            // Persist settings to localStorage
            localStorage.setItem('renttrack_tenant_settings', JSON.stringify(updatedSettings));
            savedSettingsRef.current = updatedSettings;
            window.dispatchEvent(new CustomEvent('renttrack-tenant-settings-saved', { detail: updatedSettings }));

            toast.success("Resident preferences saved successfully!");
        } catch (err: any) {
            console.error("Failed to save tenant settings:", err);
            toast.error(err.response?.data?.message || "Failed to update preferences");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        revertToSavedSettings();
        toast.info("Unsaved preferences reverted to last saved state");
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

    const categories = useMemo(() => [
        { id: 'security' as TenantSettingsCategory, label: 'Security & Access', icon: Shield, badge: 'Credentials' },
        { id: 'notifications' as TenantSettingsCategory, label: 'Notification Rules', icon: Bell, badge: '7 Triggers' },
        { id: 'appearance' as TenantSettingsCategory, label: 'Appearance & Theme', icon: Moon, badge: 'Display' },
        { id: 'sessions' as TenantSettingsCategory, label: 'Session & Device', icon: Monitor, badge: 'Active' },
    ], []);

    // Filter categories if searching
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const q = searchQuery.toLowerCase();
        return categories.filter(c => c.label.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    // Polished Toggle Switch
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
        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
            <div className="pr-3">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 block">{label}</span>
                {description && <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    checked ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-4 bg-white dark:bg-zinc-950' : 'translate-x-0 bg-white'
                    }`}
                />
            </button>
        </div>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs">
                {/* Backdrop Click */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0"
                    onClick={handleCloseModal}
                />

                {/* Main Dialog Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative w-full max-w-4xl h-[88vh] max-h-[720px] rounded-2xl bg-card border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-10 text-slate-900 dark:text-zinc-100"
                >
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <SlidersHorizontal className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                        Resident Preferences & Settings
                                    </h2>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                        Tenant Portal
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    Manage your resident credentials, notification alerts, contrast themes, and active sessions
                                </p>
                            </div>
                        </div>

                        {/* Search and Close */}
                        <div className="flex items-center gap-2.5">
                            <div className="relative w-44 sm:w-52 hidden sm:block">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
                                />
                            </div>

                            <button
                                onClick={handleCloseModal}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Close (Esc)"
                            >
                                <X className="w-4 h-4" />
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-slate-300 dark:border-zinc-700 hidden sm:inline-block">ESC</span>
                            </button>
                        </div>
                    </div>

                    {/* Master-Detail 2-Pane Body */}
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* Left Sidebar Category Menu */}
                        <div className="w-48 sm:w-56 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 p-2.5 space-y-1 overflow-y-auto custom-scrollbar">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1 block">
                                Preferences
                            </span>

                            {filteredCategories.map((cat) => {
                                const Icon = cat.icon;
                                const isCurrent = activeTab === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                            isCurrent 
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' 
                                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white dark:text-zinc-900' : 'text-slate-500 dark:text-zinc-400'}`} />
                                            <span className="truncate">{cat.label}</span>
                                        </div>
                                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                            isCurrent 
                                                ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' 
                                                : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                        }`}>
                                            {cat.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Detail Pane */}
                        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                            
                            {/* CATEGORY 1: SECURITY & CREDENTIALS */}
                            {activeTab === 'security' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-teal-600" />
                                                <span>Resident Security Credentials</span>
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                Update your authorized email address, resident password, and session access options.
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Encrypted</span>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                                        {/* Resident Identity */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Resident Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={tenantName}
                                                disabled
                                                className="w-full py-1.5 px-3 text-xs rounded-lg bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold cursor-not-allowed"
                                            />
                                            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Contact admin to modify official lease name.</p>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Registered Email Address</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full py-1.5 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                            />
                                            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Used for statements and invoice alerts.</p>
                                        </div>

                                        {/* Current Password */}
                                        <div className="space-y-1">
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
                                                    className="w-full py-1.5 px-3 pr-8 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                                                >
                                                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Required only if changing password.</p>
                                        </div>

                                        {/* New Password */}
                                        <div className="space-y-1">
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
                                                placeholder="Enter new password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full py-1.5 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                            />
                                            {newPassword && (
                                                <div className="flex gap-1.5 pt-0.5">
                                                    <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Confirm New Password</span>
                                            </label>
                                            <input
                                                type={showPasswords ? "text" : "password"}
                                                placeholder="Re-type new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full py-1.5 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                            />
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p className="text-[11px] text-rose-500 font-semibold">Passwords do not match.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2FA Toggle */}
                                    <div className="pt-2">
                                        <ToggleSwitch
                                            checked={twoFactorAuth}
                                            onChange={(c) => setTwoFactorAuth(c)}
                                            label="Two-Step Login Verification"
                                            description="Prompt for authorization code upon logging into resident portal from unrecognized devices."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CATEGORY 2: NOTIFICATIONS */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-teal-600" />
                                            <span>Resident Notification Rules</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Configure real-time alerts for monthly invoices, payment approvals, repair orders, and messages.
                                        </p>
                                    </div>

                                    <div className="space-y-2.5 w-full">
                                        {[
                                            { key: 'paymentReminders', label: 'Billing Statement Reminders', desc: 'Alert when a new monthly rental invoice is published to your account.' },
                                            { key: 'paymentStatusUpdates', label: 'Payment Verification Confirmations', desc: 'Instant notification when your uploaded GCash or bank payment is verified.' },
                                            { key: 'overduePayment', label: 'Overdue Rent Notices', desc: 'Urgent reminder when balance passes due date before penalty application.' },
                                            { key: 'maintenanceUpdates', label: 'Maintenance Request Updates', desc: 'Notify when landlord or technician marks your repair request in progress.' },
                                            { key: 'maintenanceResolution', label: 'Work Order Resolution Notices', desc: 'Alert when repairs in your suite are completed and resolved.' },
                                            { key: 'adminMessages', label: 'Management Direct Chat Pings', desc: 'In-app notification badge on new direct landlord messages.' },
                                            { key: 'soundAlerts', label: 'Audio Chime Alerts', desc: 'Play gentle sound chime on incoming notifications and urgent broadcasts.' }
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
                            )}

                            {/* CATEGORY 3: THEME & DISPLAY */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Moon className="w-4 h-4 text-teal-600" />
                                            <span>Theme & Display Contrast</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Choose your visual aesthetic. Changes will apply across the portal once saved.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
                                        {[
                                            { key: 'light', label: 'Clean Light', icon: Sun, desc: 'High-contrast clean day mode' },
                                            { key: 'dark', label: 'Deep Obsidian', icon: Moon, desc: 'OLED-optimized slate dark mode' },
                                            { key: 'system', label: 'System Sync', icon: Laptop, desc: 'Synchronize with operating system' }
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
                                                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                                                        isSelected
                                                            ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white ring-2 ring-slate-900/10 dark:ring-white/20 shadow-xs'
                                                            : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-slate-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        {isSelected && <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white"></span>}
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
                            )}

                            {/* CATEGORY 4: SESSIONS & DEVICES */}
                            {activeTab === 'sessions' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-purple-600" />
                                            <span>Session Security & Authorized Device</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Active resident authentication credentials and secure sign-out controls.
                                        </p>
                                    </div>

                                    <div className="space-y-3.5 w-full">
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Current Resident Browser Session</p>
                                                    <p className="text-[10px] text-emerald-600 font-bold">Active now · Authorized Resident JWT Token</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-200/50">
                                                THIS DEVICE
                                            </span>
                                        </div>

                                        <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <span className="text-xs font-bold text-rose-800 dark:text-rose-400 block">Sign Out of Resident Portal</span>
                                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">Invalidate session token and return to authentication login.</p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-800 hover:bg-red-900 dark:bg-red-800/90 dark:hover:bg-red-700 text-white border border-red-900/80 dark:border-red-700 transition-colors flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-xs"
                                            >
                                                <LogOut className="w-3.5 h-3.5 stroke-[2.5] text-white" />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Resident Portal • Connected Securely</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReset}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Discard</span>
                            </button>

                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
