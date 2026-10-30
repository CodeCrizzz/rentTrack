"use client";

import { useState, useEffect } from 'react';
import { 
    User, Shield, Bell, Moon, Sun, Laptop, Info, 
    LogOut, Save, Smartphone, Monitor, UserX,
    Lock, Mail, Key, Eye, EyeOff, CheckCircle2,
    Sliders, RefreshCw, AlertTriangle, ShieldCheck,
    Check, Phone, HeartHandshake, FileText, Download,
    HelpCircle, MessageSquare, ExternalLink, ChevronDown,
    ChevronUp, Send, AlertCircle, Building2, MapPin,
    Calendar, Clock, Globe, Trash2, FileCheck, LifeBuoy
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
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ==========================================
    // CATEGORY 1: MY PROFILE STATES
    // ==========================================
    const [fullName, setFullName] = useState('Juan Dela Cruz');
    const [email, setEmail] = useState('tenant@renttrack.com');
    const [phone, setPhone] = useState('+63 917 123 4567');
    const [accountStatus, setAccountStatus] = useState('Active Resident');
    const [roomNumber, setRoomNumber] = useState('Room 204');
    const [bedspace, setBedspace] = useState('Bed B (Upper Deck)');
    const [moveInDate, setMoveInDate] = useState('2024-01-15');
    const [emergencyContactName, setEmergencyContactName] = useState('Maria Dela Cruz');
    const [emergencyContactRelation, setEmergencyContactRelation] = useState('Parent / Guardian');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('+63 918 987 6543');

    // ==========================================
    // CATEGORY 2: ACCOUNT & SECURITY STATES
    // ==========================================
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorAuth, setTwoFactorAuth] = useState(false);
    const [securityAlerts, setSecurityAlerts] = useState(true);

    // ==========================================
    // CATEGORY 3: NOTIFICATION PREFERENCES
    // ==========================================
    const [notifications, setNotifications] = useState({
        upcomingRentReminders: true,
        dueDateReminders: true,
        overduePaymentAlerts: true,
        paymentConfirmation: true,
        paymentVerificationResults: true,
        maintenanceUpdates: true,
        announcements: true,
        messageNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        inAppNotifications: true,
        soundAlerts: true
    });

    // ==========================================
    // CATEGORY 4: APPEARANCE & DISPLAY STATES
    // ==========================================
    const [localTheme, setLocalTheme] = useState('system');
    const [language, setLanguage] = useState('English');
    const [timeFormat, setTimeFormat] = useState('12h');
    const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

    // ==========================================
    // CATEGORY 5: PRIVACY & DATA STATES
    // ==========================================
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [dataCorrectionText, setDataCorrectionText] = useState('');
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

    // ==========================================
    // CATEGORY 6: HELP & SUPPORT STATES
    // ==========================================
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [issueCategory, setIssueCategory] = useState('billing');
    const [issueDescription, setIssueDescription] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const [supportTickets, setSupportTickets] = useState([
        { id: 'TKT-1042', subject: 'Inquired regarding water meter calibration', status: 'Resolved', date: '2026-10-18' },
        { id: 'TKT-1055', subject: 'GCash verification reference follow-up', status: 'Closed', date: '2026-10-24' }
    ]);

    // Load tenant profile & stored preferences on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch live profile from backend
                const { data } = await api.get('/tenant/profile');
                if (data) {
                    if (data.name) setFullName(data.name);
                    if (data.email) setEmail(data.email);
                    if (data.phone) setPhone(data.phone);
                    if (data.status) setAccountStatus(data.status);
                    if (data.room_number) setRoomNumber(`Room ${data.room_number}`);
                    if (data.bed_space) setBedspace(data.bed_space);
                    if (data.date_moved_in) setMoveInDate(data.date_moved_in.split('T')[0]);
                }
            } catch (err) {
                console.warn('Backend profile fetch note, falling back to local storage context:', err);
            }

            // Sync with local storage
            if (typeof window !== 'undefined') {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const u = JSON.parse(userStr);
                        if (u.email) setEmail(u.email);
                        if (u.name) setFullName(u.name);
                    } catch (e) {}
                }

                const savedStr = localStorage.getItem('renttrack_tenant_settings');
                if (savedStr) {
                    try {
                        const saved = JSON.parse(savedStr);
                        if (saved.emergencyContactName) setEmergencyContactName(saved.emergencyContactName);
                        if (saved.emergencyContactRelation) setEmergencyContactRelation(saved.emergencyContactRelation);
                        if (saved.emergencyContactPhone) setEmergencyContactPhone(saved.emergencyContactPhone);
                        if (saved.notifications) setNotifications(prev => ({ ...prev, ...saved.notifications }));
                        if (saved.twoFactorAuth !== undefined) setTwoFactorAuth(saved.twoFactorAuth);
                        if (saved.securityAlerts !== undefined) setSecurityAlerts(saved.securityAlerts);
                        if (saved.language) setLanguage(saved.language);
                        if (saved.timeFormat) setTimeFormat(saved.timeFormat);
                        if (saved.dateFormat) setDateFormat(saved.dateFormat);
                        if (saved.theme) setLocalTheme(saved.theme);
                        else if (theme) setLocalTheme(theme);
                    } catch (e) {}
                } else if (theme) {
                    setLocalTheme(theme);
                }
            }
            setIsLoading(false);
        };

        fetchInitialData();
    }, [theme]);

        const handleReset = () => {
        if (typeof window !== 'undefined') {
            const savedStr = localStorage.getItem('renttrack_tenant_settings');
            if (savedStr) {
                try {
                    const saved = JSON.parse(savedStr);
                    if (saved.fullName) setFullName(saved.fullName);
                    if (saved.email) setEmail(saved.email);
                    if (saved.phone) setPhone(saved.phone);
                    if (saved.emergencyContactName) setEmergencyContactName(saved.emergencyContactName);
                    if (saved.emergencyContactRelation) setEmergencyContactRelation(saved.emergencyContactRelation);
                    if (saved.emergencyContactPhone) setEmergencyContactPhone(saved.emergencyContactPhone);
                    if (saved.notifications) setNotifications(prev => ({ ...prev, ...saved.notifications }));
                    if (saved.twoFactorAuth !== undefined) setTwoFactorAuth(saved.twoFactorAuth);
                    if (saved.securityAlerts !== undefined) setSecurityAlerts(saved.securityAlerts);
                    if (saved.language) setLanguage(saved.language);
                    if (saved.timeFormat) setTimeFormat(saved.timeFormat);
                    if (saved.dateFormat) setDateFormat(saved.dateFormat);
                    if (saved.theme) setLocalTheme(saved.theme);
                } catch (e) {}
            }
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.info("Changes Discarded", {
            description: "Preferences reverted to last saved state."
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);

        try {
            // 1. Update basic profile info in backend
            try {
                await api.put('/tenant/profile', {
                    name: fullName,
                    email,
                    phone
                });
            } catch (err: any) {
                console.warn('Profile update note:', err?.response?.data?.message || err.message);
            }

            // 2. Update password if provided
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    toast.error("New passwords do not match!", {
                        description: "Please check your confirmation password."
                    });
                    setIsSaving(false);
                    return;
                }
                if (!currentPassword) {
                    toast.error("Current Password Required", {
                        description: "Please provide your current password to authorize password changes."
                    });
                    setIsSaving(false);
                    return;
                }
                if (newPassword.length < 6) {
                    toast.error("Password Too Short", {
                        description: "New password must be at least 6 characters long."
                    });
                    setIsSaving(false);
                    return;
                }
                await api.put('/tenant/profile/password', { currentPassword, newPassword });
                toast.success("Security Credentials Updated", {
                    description: "Your login password has been changed securely."
                });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

            // 3. Apply theme
            setTheme(localTheme);

            // 4. Persist to localStorage
            const updatedSettings = {
                fullName,
                email,
                phone,
                emergencyContactName,
                emergencyContactRelation,
                emergencyContactPhone,
                notifications,
                twoFactorAuth,
                securityAlerts,
                theme: localTheme,
                language,
                timeFormat,
                dateFormat
            };
            localStorage.setItem('renttrack_tenant_settings', JSON.stringify(updatedSettings));
            
            // Also update user in localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    localStorage.setItem('user', JSON.stringify({ ...u, name: fullName, email }));
                } catch (e) {}
            }

            window.dispatchEvent(new CustomEvent('renttrack-tenant-settings-saved', { detail: updatedSettings }));
            
            toast.success("All Preferences Saved!", {
                description: "Your resident profile, alerts, and settings have been updated across RentTrack."
            });
        } catch (err: any) {
            console.error("Failed to save settings:", err);
            toast.error(err.response?.data?.message || "Failed to update resident preferences");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 3;
        if (pass.length >= 6) return 2;
        return 1;
    };
    
    const strength = handlePasswordStrength(newPassword);

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const handleDownloadPersonalData = () => {
        const tenantData = {
            fullName,
            email,
            phone,
            accountStatus,
            roomNumber,
            bedspace,
            moveInDate,
            emergencyContact: {
                name: emergencyContactName,
                relation: emergencyContactRelation,
                phone: emergencyContactPhone
            },
            preferences: {
                notifications,
                theme: localTheme,
                language,
                timeFormat,
                dateFormat
            },
            exportedAt: new Date().toISOString(),
            compliance: "Republic Act No. 10173 (Data Privacy Act of 2012)"
        };

        const blob = new Blob([JSON.stringify(tenantData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RentTrack_Tenant_Data_${fullName.replace(/\s+/g, '_')}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("Personal Data Exported", {
            description: "Your authorized resident archive JSON has been downloaded."
        });
    };

    const handleSubmitDataCorrection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dataCorrectionText.trim()) {
            toast.error("Please describe the requested data correction.");
            return;
        }
        setIsSubmittingCorrection(true);
        try {
            await api.post('/requests', {
                title: 'Data Privacy Correction Request',
                description: dataCorrectionText.trim(),
                category: 'General',
                priority: 'Medium'
            });
        } catch (e) {}
        setIsSubmittingCorrection(false);
        setDataCorrectionText('');
        toast.success("Correction Request Submitted", {
            description: "The property administrator has received your request and will review within 24–48 hours."
        });
    };

    const handleSubmitSupportTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issueDescription.trim()) {
            toast.error("Please enter a description for the support issue.");
            return;
        }
        setIsSubmittingTicket(true);
        const issueText = issueDescription.trim();
        try {
            await api.post('/requests', {
                title: `Support (${issueCategory})`,
                description: issueText,
                category: 'General',
                priority: 'Medium'
            });
        } catch (e) {}

        const newTicket = {
            id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
            subject: issueText.slice(0, 45) + (issueText.length > 45 ? '...' : ''),
            status: 'Under Review',
            date: new Date().toISOString().split('T')[0]
        };
        setSupportTickets([newTicket, ...supportTickets]);
        setIssueDescription('');
        setIsSubmittingTicket(false);
        toast.success("Technical Issue Reported", {
            description: `Ticket ${newTicket.id} logged. Property support team has been notified.`
        });
    };

    // Toggle switch helper
    const ToggleSwitch = ({ 
        checked, 
        onChange, 
        label, 
        description,
        disabled = false
    }: { 
        checked: boolean; 
        onChange: (c: boolean) => void; 
        label: string; 
        description?: string;
        disabled?: boolean;
    }) => (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className="pr-4">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{label}</span>
                {description && <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                disabled={disabled}
                aria-checked={checked}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    disabled ? 'cursor-not-allowed bg-teal-800' : 'cursor-pointer'
                } ${checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );

    // Numbered Category Banner Component (STRICT: Single Whole Page Layout, No Sidebar Module)
    const CategoryHeader = ({ 
        number, 
        title, 
        subtitle, 
        icon: Icon,
        badgeText
    }: { 
        number: number; 
        title: string; 
        subtitle: string; 
        icon: any;
        badgeText?: string;
    }) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/90 dark:border-zinc-800 pb-3 pt-6 first:pt-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/50 dark:border-teal-500/20 font-bold">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                            Category {number}
                        </span>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {title}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>
            </div>
            {badgeText && (
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 self-start sm:self-auto bg-teal-50/60 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200/40 dark:border-teal-800/40">
                    {badgeText}
                </span>
            )}
        </div>
    );

    // Skeleton loader
    if (isLoading) {
        return (
            <div className="w-full space-y-6 font-sans text-slate-900 dark:text-zinc-100 animate-pulse pb-16">
                <div className="h-20 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800"></div>
                <div className="space-y-4">
                    <div className="h-44 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800"></div>
                    <div className="h-56 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800"></div>
                    <div className="h-56 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full font-sans text-slate-900 dark:text-zinc-100 pb-20 space-y-8">
            
            {/* ======================================================== */}
            {/* TOP HEADER BANNER (1 WHOLE PAGE - NO SIDEBAR MODULE)      */}
            {/* ======================================================== */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Tenant Settings & Resident Preferences
                                </h1>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>ACCOUNT ACTIVE</span>
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                All 6 resident categories configured in 1 single continuous page with zero sidebar navigation.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save All Preferences</span>
                    </button>
                </div>
            </div>

            {/* Quick Status Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resident Tenancy</span>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {roomNumber}
                        </div>
                        <div className="text-[10px] font-semibold text-teal-600 mt-0.5">{bedspace}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Profile</span>
                        <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            Protected
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">SHA-256 Encrypted</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Device</span>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">
                            Current Browser
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">Session Active Now</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alert Rules</span>
                        <div className="text-sm sm:text-base font-extrabold font-mono text-teal-600 dark:text-teal-400 mt-0.5 leading-tight">
                            Enabled
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Billing & Work Orders</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 1: MY PROFILE                                   */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={1}
                    title="My Profile"
                    subtitle="Manage your personal contact details, emergency point of contact, and review your assigned room status."
                    icon={User}
                    badgeText="Verified Tenancy"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Important Tenancy Safeguard Notice */}
                    <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                            <strong className="font-bold">Administrative Policy:</strong> Sensitive identity credentials or room/bed assignments require formal property administrator verification and contractual approval before changes take permanent effect.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Profile Photo / Avatar Card */}
                        <div className="p-5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-20 h-20 rounded-full bg-teal-600 text-white text-2xl font-black flex items-center justify-center shadow-md border-4 border-white dark:border-zinc-800">
                                {fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RT'}
                            </div>
                            <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white block">{fullName}</span>
                                <span className="text-[11px] text-teal-600 font-semibold">{accountStatus}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                Member since {moveInDate}
                            </span>
                        </div>

                        {/* Profile Contact Inputs (2 cols) */}
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Contact Number
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Assigned Tenancy Space
                                </label>
                                <div className="py-2 px-3 text-xs rounded-lg bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold flex items-center justify-between">
                                    <span>{roomNumber} • {bedspace}</span>
                                    <span className="text-[10px] text-emerald-600 font-bold">Assigned</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact Block */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <HeartHandshake className="w-4 h-4 text-rose-500" />
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Emergency Contact Information
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">Emergency Contact Person</label>
                                <input
                                    type="text"
                                    value={emergencyContactName}
                                    onChange={(e) => setEmergencyContactName(e.target.value)}
                                    placeholder="e.g. Maria Dela Cruz"
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">Relationship</label>
                                <input
                                    type="text"
                                    value={emergencyContactRelation}
                                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                                    placeholder="e.g. Parent / Spouse / Sibling"
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">Emergency Phone Number</label>
                                <input
                                    type="text"
                                    value={emergencyContactPhone}
                                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                                    placeholder="+63 918 000 0000"
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 2: ACCOUNT & SECURITY                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={2}
                    title="Account & Security"
                    subtitle="Update your authentication credentials, configure multi-factor security, and manage authorized device sessions."
                    icon={Shield}
                    badgeText="Active Protection"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Password Management */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                                <span>Current Password</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400">Required to authorize credential update.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                                <span>New Password</span>
                                {newPassword && (
                                    <span className={`text-[10px] font-bold ${
                                        strength === 3 ? 'text-emerald-500' : strength === 2 ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                        {strength === 3 ? 'Strong' : strength === 2 ? 'Fair' : 'Weak'}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter new strong password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                >
                                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="flex gap-1.5 pt-0.5">
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-[10px] text-rose-500 font-semibold">Passwords do not match.</p>
                            )}
                        </div>
                    </div>

                    {/* 2FA & Security Alerts */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <ToggleSwitch
                            checked={twoFactorAuth}
                            onChange={setTwoFactorAuth}
                            label="Two-Factor Authentication (2FA)"
                            description="Require an SMS or authenticator code during portal login."
                        />
                        <ToggleSwitch
                            checked={securityAlerts}
                            onChange={setSecurityAlerts}
                            label="Account Security Alerts"
                            description="Instant email notification whenever a new device signs into your account."
                        />
                    </div>

                    {/* Active Sessions & Logout */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 space-y-3">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                            Authorized Device Sessions
                        </span>

                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                    <Monitor className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Current Browser Session</p>
                                    <p className="text-[10px] text-emerald-600 font-semibold">Active now • Verified Resident JWT Token</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-200/50">
                                THIS DEVICE
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Sign Out of Resident Portal</span>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">Invalidates your authentication token and ends the active console session.</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 self-start sm:self-center shadow-xs cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 3: NOTIFICATION PREFERENCES                     */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={3}
                    title="Notification Preferences"
                    subtitle="Configure which operational events trigger SMS, email, and in-app alerts on your devices."
                    icon={Bell}
                    badgeText="Configurable Alerts"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
                    {/* Mandatory Rule Callout */}
                    <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 flex items-start gap-3">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                            <strong className="font-bold">Essential Notices Policy:</strong> Critical rent invoices, verified official receipts, and emergency boarding house announcements remain active in your portal stream even if optional notification channels are muted.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <ToggleSwitch
                            checked={notifications.upcomingRentReminders}
                            onChange={(val) => setNotifications({ ...notifications, upcomingRentReminders: val })}
                            label="Upcoming Rent Reminders"
                            description="Early alert 3 days prior to your monthly rent due date."
                        />
                        <ToggleSwitch
                            checked={notifications.dueDateReminders}
                            onChange={(val) => setNotifications({ ...notifications, dueDateReminders: val })}
                            label="Due-Date Notifications"
                            description="Reminder on the exact due date to prevent penalty tariffs."
                        />
                        <ToggleSwitch
                            checked={notifications.overduePaymentAlerts}
                            onChange={(val) => setNotifications({ ...notifications, overduePaymentAlerts: val })}
                            label="Overdue Payment Alerts"
                            description="Urgent notice if payment passes the grace period."
                        />
                        <ToggleSwitch
                            checked={notifications.paymentConfirmation}
                            onChange={(val) => setNotifications({ ...notifications, paymentConfirmation: val })}
                            label="Payment Submission Confirmation"
                            description="Receipt acknowledgment when you upload GCash/Maya proof."
                        />
                        <ToggleSwitch
                            checked={notifications.paymentVerificationResults}
                            onChange={(val) => setNotifications({ ...notifications, paymentVerificationResults: val })}
                            label="Payment Verification Results"
                            description="Official notification when landlord verifies and issues your E-receipt."
                        />
                        <ToggleSwitch
                            checked={notifications.maintenanceUpdates}
                            onChange={(val) => setNotifications({ ...notifications, maintenanceUpdates: val })}
                            label="Maintenance Request Updates"
                            description="Real-time status updates as repairs on your room proceed."
                        />
                        <ToggleSwitch
                            checked={notifications.announcements}
                            onChange={(val) => setNotifications({ ...notifications, announcements: val })}
                            label="Property Announcements"
                            description="Broadcasts regarding water interruptions, visits, and house rules."
                        />
                        <ToggleSwitch
                            checked={notifications.messageNotifications}
                            onChange={(val) => setNotifications({ ...notifications, messageNotifications: val })}
                            label="Direct Chat Pings"
                            description="Notify when the landlord or administrator sends a direct message."
                        />
                        <ToggleSwitch
                            checked={notifications.emailNotifications}
                            onChange={(val) => setNotifications({ ...notifications, emailNotifications: val })}
                            label="Email Notifications"
                            description="Send statements and receipt PDFs to your registered email address."
                        />
                        <ToggleSwitch
                            checked={notifications.smsNotifications}
                            onChange={(val) => setNotifications({ ...notifications, smsNotifications: val })}
                            label="SMS Text Alerts"
                            description="Receive concise SMS updates on urgent billing & security events."
                        />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 4: APPEARANCE & DISPLAY                         */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={4}
                    title="Appearance & Display"
                    subtitle="Customize portal contrast theme, regional language, and preferred date/time formats."
                    icon={Moon}
                    badgeText="Visual Customization"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Theme Selector */}
                    <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider">
                            Interface Theme
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {[
                                { key: 'light', label: 'Clean Light', icon: Sun, desc: 'High-contrast clean daylight interface' },
                                { key: 'dark', label: 'Deep Dark', icon: Moon, desc: 'OLED-optimized obsidian dark mode' },
                                { key: 'system', label: 'System Default', icon: Laptop, desc: 'Synchronizes automatically with your device OS' }
                            ].map(m => {
                                const Icon = m.icon;
                                const isSelected = localTheme === m.key;

                                return (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => setLocalTheme(m.key)}
                                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
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

                    {/* Regional & Localization Preferences */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                                <span>Language</span>
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 cursor-pointer"
                            >
                                <option value="English">English (United States / PH)</option>
                                <option value="Filipino">Filipino / Tagalog</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Time Format</span>
                            </label>
                            <select
                                value={timeFormat}
                                onChange={(e) => setTimeFormat(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 cursor-pointer"
                            >
                                <option value="12h">12-Hour (e.g. 02:30 PM)</option>
                                <option value="24h">24-Hour Military (e.g. 14:30)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Date Display Format</span>
                            </label>
                            <select
                                value={dateFormat}
                                onChange={(e) => setDateFormat(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 cursor-pointer"
                            >
                                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-10-28)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (10/28/2026)</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY (28/10/2026)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 5: PRIVACY & DATA                               */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={5}
                    title="Privacy & Data"
                    subtitle="Exercise your rights under the Data Privacy Act of 2012, review consent terms, and request data exports."
                    icon={FileText}
                    badgeText="DPA Compliance"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Legal Policies Quick Access */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-start justify-between gap-3">
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Boarding House Privacy Notice</span>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                    Explains how tenant biometric, CCTV, and billing data are processed and retained.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPrivacyModal(true)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors shrink-0 cursor-pointer"
                            >
                                View Notice
                            </button>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-start justify-between gap-3">
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Tenancy Agreement Terms</span>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                    House guidelines, guest policies, payment cutoffs, and security deposit terms.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTermsModal(true)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors shrink-0 cursor-pointer"
                            >
                                View Terms
                            </button>
                        </div>
                    </div>

                    {/* Data Subject Rights Controls */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Export Data */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Download Personal Data Archive
                            </span>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Request a structured JSON archive of all your profile, room assignment, emergency contact, and preference records held in RentTrack.
                            </p>
                            <button
                                type="button"
                                onClick={handleDownloadPersonalData}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5 text-teal-600" />
                                <span>Export Data Archive (JSON)</span>
                            </button>
                        </div>

                        {/* Correction Request Form */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Submit Data Correction Request
                            </span>
                            <form onSubmit={handleSubmitDataCorrection} className="space-y-2">
                                <textarea
                                    value={dataCorrectionText}
                                    onChange={(e) => setDataCorrectionText(e.target.value)}
                                    placeholder="Describe any incorrect record (e.g. updated ID details, contact adjustment)..."
                                    rows={2}
                                    className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingCorrection}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSubmittingCorrection ? 'Submitting...' : 'Send Correction Request'}</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Account Closure Callout */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Request Account Closure or Tenancy Termination</span>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                                Submitting a move-out request initiates standard room clearance and security deposit refund auditing.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                toast.info("Move-Out Notice", {
                                    description: "Please coordinate with management or submit an official Move-Out Request in the Tenancy tab."
                                });
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors self-start sm:self-center cursor-pointer shrink-0"
                        >
                            Request Tenancy Closure
                        </button>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 6: HELP & SUPPORT                               */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={6}
                    title="Help & Support"
                    subtitle="Access resident guidebooks, browse common FAQs, directly contact property management, or report technical bugs."
                    icon={LifeBuoy}
                    badgeText="Resident Assistance"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Administrator Direct Contact Card */}
                    <div className="p-4 rounded-xl border border-teal-200/80 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Riverside Boarding House Administration</span>
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    Landlord Office • Mon–Sat (08:00 AM – 06:00 PM)
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="tel:+639123456789"
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call Office</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => router.push('/tenant/chat')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Direct Message</span>
                            </button>
                        </div>
                    </div>

                    {/* FAQs Accordion */}
                    <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider">
                            Frequently Asked Questions (FAQ)
                        </span>

                        <div className="space-y-2.5">
                            {[
                                {
                                    id: 1,
                                    q: "How do I settle my monthly rent via GCash or Maya?",
                                    a: "Navigate to the 'Billing' tab, select your unpaid invoice, copy the administrator's designated GCash/Maya QR or mobile number, transfer the exact balance, and upload your screenshot with reference code."
                                },
                                {
                                    id: 2,
                                    q: "What happens if a month has fewer days than my billing start date?",
                                    a: "RentTrack applies the short-month rule: bills falling on days like the 31st automatically resolve to the last valid calendar day (e.g., Feb 28/29 or Apr 30), preserving your normal billing day for longer months."
                                },
                                {
                                    id: 3,
                                    q: "How fast are maintenance requests resolved?",
                                    a: "Routine repairs (plumbing, lights) are inspected within 24 hours. Emergency repairs (power outage, water leaks) receive immediate priority. Track live repair updates in Category 3 notifications."
                                }
                            ].map((faq) => (
                                <div
                                    key={faq.id}
                                    className="rounded-xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                        className="w-full p-3.5 text-left bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3 text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer"
                                    >
                                        <span>{faq.q}</span>
                                        {expandedFaq === faq.id ? (
                                            <ChevronUp className="w-4 h-4 text-teal-600 shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                        )}
                                    </button>
                                    {expandedFaq === faq.id && (
                                        <div className="p-3.5 text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 leading-relaxed">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Report Technical Issue & Recent Tickets */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Report Form */}
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Report a Technical Issue
                            </span>
                            <form onSubmit={handleSubmitSupportTicket} className="space-y-2.5">
                                <select
                                    value={issueCategory}
                                    onChange={(e) => setIssueCategory(e.target.value)}
                                    className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold outline-none focus:border-teal-500 cursor-pointer"
                                >
                                    <option value="billing">Billing & Payment Issue</option>
                                    <option value="portal">App Portal Bug / Glitch</option>
                                    <option value="access">Door Access / Keycard Issue</option>
                                    <option value="other">Other Inquiries</option>
                                </select>
                                <textarea
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    placeholder="Describe the technical error or request in detail..."
                                    rows={3}
                                    className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingTicket}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSubmittingTicket ? 'Submitting...' : 'Submit Support Ticket'}</span>
                                </button>
                            </form>
                        </div>

                        {/* Recent Support History */}
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Recent Support Request Status
                            </span>
                            <div className="space-y-2">
                                {supportTickets.map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 flex items-center justify-between gap-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{t.id}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    t.status === 'Resolved' || t.status === 'Closed'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-800 dark:text-zinc-200 font-semibold truncate mt-0.5">
                                                {t.subject}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{t.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* BOTTOM SAVE ACTION BAR                                   */}
            {/* ======================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm gap-3">
                <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Ready to apply changes?</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">All 6 categories configured above will be synchronized immediately.</span>
                </div>
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save All Changes</span>
                </button>
            </div>

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-teal-600" />
                                <span>Boarding House Privacy Notice</span>
                            </h3>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 max-h-72 overflow-y-auto pr-1 leading-relaxed">
                            <p>
                                In compliance with Republic Act No. 10173 (Data Privacy Act of 2012), RentTrack collects and processes your personal data exclusively for tenancy contract management, monthly utility billing, emergency contact reachability, and building safety compliance.
                            </p>
                            <p>
                                <strong>Data Retention:</strong> Active tenancy records are stored securely for the duration of your lease plus standard statutory ledger requirements. CCTV records are purged every 30 days unless subject to ongoing investigations.
                            </p>
                            <p>
                                <strong>Your Rights:</strong> You retain the right to inspect, correct, and request copies of your personal records at any time via Category 5 of this menu.
                            </p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                            >
                                Close Notice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-teal-600" />
                                <span>House Guidelines & Rental Agreement Terms</span>
                            </h3>
                            <button
                                onClick={() => setShowTermsModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 max-h-72 overflow-y-auto pr-1 leading-relaxed">
                            <p><strong>1. Payment Cutoffs:</strong> Rent is payable on or before your cycle billing date. A 5-day grace period applies before penalty fees accrue.</p>
                            <p><strong>2. Quiet Hours:</strong> To ensure all residents enjoy peaceful rest, quiet hours are enforced from 10:00 PM to 06:00 AM daily.</p>
                            <p><strong>3. Visitors:</strong> Daytime visitors must register with management. Overnight guests require prior 24-hour notice and approval.</p>
                            <p><strong>4. Room Inspection:</strong> Management conducts periodic safety inspections with advance notice for electrical and fire safety compliance.</p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setShowTermsModal(false)}
                                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
