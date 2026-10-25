"use client";

import { useState, useEffect, useRef } from 'react';
import { 
    Shield, Bell, CreditCard, Moon, Sun, 
    Laptop, LogOut, Save, ChevronRight,
    Check, Lock, Mail, Building2, Key, Database, RefreshCw,
    Sliders, Zap, Droplets, CheckCircle2, ShieldCheck,
    Server, Activity, Download, RotateCcw, AlertTriangle,
    Eye, EyeOff, Radio, Smartphone, HardDrive, Cpu, Terminal,
    FileText, User, Phone, MapPin, Globe, Sparkles, Monitor
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import CustomSelect from '@/components/dropdown-select';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
    adminEmail: 'admin@renttrack.com',
    twoFactorAuth: true,
    sessionTimeout: '60',
    propertyName: 'RentTrack Elite Residences & Dormitory',
    propertyAddress: '123 Katipunan Ave, Loyola Heights, Quezon City',
    contactPhone: '+63 917 123 4567',
    landlordName: 'Master Property Administrator',
    taxId: 'TIN: 432-891-002-000',
    currency: 'PHP (₱)',
    billing: {
        autoMonthlyBilling: true,
        latePaymentFee: '300',
        gracePeriodDays: '3',
        defaultWater: '150',
        electricityKwhRate: '14.50',
        autoReminderDaysBefore: '3',
        sendReceiptsAutomatically: true
    },
    notifications: {
        tenantRegistration: true,
        paymentSubmission: true,
        paymentVerification: true,
        overduePayment: true,
        newMaintenance: true,
        maintenanceUpdate: false,
        chatMessage: true,
        systemNotifications: true,
        soundAlerts: true,
        emailDailyDigest: false
    },
    systemConfig: {
        maintenanceMode: false,
        autoBackupDaily: true,
        queryLogRetentionDays: '30',
        apiRateLimitPerMin: '120'
    },
    theme: 'system'
};

const getSavedSettings = () => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const stored = localStorage.getItem('renttrack_admin_settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                billing: { ...DEFAULT_SETTINGS.billing, ...(parsed.billing || {}) },
                notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
                systemConfig: { ...DEFAULT_SETTINGS.systemConfig, ...(parsed.systemConfig || {}) }
            };
        }
    } catch (e) {
        console.error('Error reading renttrack_admin_settings', e);
    }
    return DEFAULT_SETTINGS;
};

export default function AdminSettingsPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    // Initial snapshot of saved settings
    const savedSettingsRef = useRef(getSavedSettings());

    // Form states - Security & Account
    const [adminEmail, setAdminEmail] = useState(savedSettingsRef.current.adminEmail);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorAuth, setTwoFactorAuth] = useState(savedSettingsRef.current.twoFactorAuth);
    const [sessionTimeout, setSessionTimeout] = useState(savedSettingsRef.current.sessionTimeout);

    // Form states - Property Profile
    const [propertyName, setPropertyName] = useState(savedSettingsRef.current.propertyName);
    const [propertyAddress, setPropertyAddress] = useState(savedSettingsRef.current.propertyAddress);
    const [contactPhone, setContactPhone] = useState(savedSettingsRef.current.contactPhone);
    const [landlordName, setLandlordName] = useState(savedSettingsRef.current.landlordName);
    const [taxId, setTaxId] = useState(savedSettingsRef.current.taxId);
    const [currency, setCurrency] = useState(savedSettingsRef.current.currency);

    // Form states - Billing & Automated Tariffs
    const [billing, setBilling] = useState(savedSettingsRef.current.billing);

    // Form states - Notifications
    const [notifications, setNotifications] = useState(savedSettingsRef.current.notifications);

    // Form states - System & Maintenance
    const [systemConfig, setSystemConfig] = useState(savedSettingsRef.current.systemConfig);

    const [localTheme, setLocalTheme] = useState(savedSettingsRef.current.theme || theme || 'system');

    // Function to revert all working form states back to saved settings
    const revertToSavedSettings = () => {
        const currentSaved = getSavedSettings();
        savedSettingsRef.current = currentSaved;

        setAdminEmail(currentSaved.adminEmail);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTwoFactorAuth(currentSaved.twoFactorAuth);
        setSessionTimeout(currentSaved.sessionTimeout);

        setPropertyName(currentSaved.propertyName);
        setPropertyAddress(currentSaved.propertyAddress);
        setContactPhone(currentSaved.contactPhone);
        setLandlordName(currentSaved.landlordName);
        setTaxId(currentSaved.taxId);
        setCurrency(currentSaved.currency);

        setBilling({ ...currentSaved.billing });
        setNotifications({ ...currentSaved.notifications });
        setSystemConfig({ ...currentSaved.systemConfig });

        setLocalTheme(currentSaved.theme || theme || 'system');
    };

    // Initial mount loading timer for smooth skeleton transition
    useEffect(() => {
        revertToSavedSettings();
        const timer = setTimeout(() => setIsLoading(false), 250);
        return () => clearTimeout(timer);
    }, []);

    const handleSaveChanges = () => {
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match!");
                return;
            }
            if (!currentPassword) {
                toast.error("Please provide your current password to set a new password.");
                return;
            }
        }

        setIsSaving(true);

        const newSettings = {
            adminEmail,
            twoFactorAuth,
            sessionTimeout,
            propertyName,
            propertyAddress,
            contactPhone,
            landlordName,
            taxId,
            currency,
            billing,
            notifications,
            systemConfig,
            theme: localTheme
        };

        // Theme and settings ONLY apply when user clicks Save Changes
        setTheme(localTheme);

        try {
            localStorage.setItem('renttrack_admin_settings', JSON.stringify(newSettings));
            savedSettingsRef.current = newSettings;
            window.dispatchEvent(new CustomEvent('renttrack-settings-saved', { detail: newSettings }));
        } catch (err) {
            console.error("Failed to save settings to localStorage:", err);
        }

        setTimeout(() => {
            setIsSaving(false);
            toast.success("Platform configurations saved successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }, 350);
    };

    const handleReset = () => {
        revertToSavedSettings();
        toast.info("Unsaved configuration modifications reverted");
    };

    const handleExportBackup = () => {
        const configData = {
            property: { propertyName, propertyAddress, contactPhone, landlordName, taxId, currency },
            billing,
            notifications,
            systemConfig,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `renttrack-config-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("System configuration snapshot downloaded");
    };

    const handlePurgeCache = () => {
        setIsPurging(true);
        setTimeout(() => {
            setIsPurging(false);
            toast.success("Application memory & Redis cache purged");
        }, 500);
    };

    const handlePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        if (pass.length > 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 3;
        if (pass.length > 6) return 2;
        return 1;
    };
    
    const strength = handlePasswordStrength(newPassword);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    // Helper Toggle Switch Component
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
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
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

    // ==========================================
    // SKELETON LOADER (MATCHING 1-PAGE LAYOUT)
    // ==========================================
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse pb-12">
                {/* Header Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-72 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Telemetry Ribbon (4 Tiles) Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Skeleton Cards for each of the 5 Categories */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
                        <div className="space-y-1.5 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <div className="h-5 w-56 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            {[...Array(4)].map((_, j) => (
                                <div key={j} className="space-y-1.5">
                                    <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    <div className="h-9 w-full bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ==========================================
    // REAL 1-PAGE UI RENDER (ALL OPTIONS VISIBLE)
    // ==========================================
    return (
        <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-teal-600" />
                            <span>System Settings & Operations Hub</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>PROD v2.4 ACTIVE</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        All platform operations, security credentials, property profile, billing policies, and system health in one single page.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Revert form changes"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Discard</span>
                    </button>

                    <button
                        onClick={handleExportBackup}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Export JSON Configuration Backup"
                    >
                        <Download className="w-3.5 h-3.5 text-teal-600" />
                        <span>Backup Config</span>
                    </button>

                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save All Settings</span>
                    </button>
                </div>
            </div>

            {/* Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Property Facility */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Property Facility</span>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight truncate max-w-[140px]">
                            {propertyName || 'RentTrack Elite'}
                        </div>
                        <div className="text-[10px] font-semibold text-teal-600 mt-0.5">Official Facility</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Billing Cycle Status */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Initiation</span>
                        <div className="text-lg font-extrabold font-mono text-teal-600 dark:text-teal-400 mt-0.5 leading-tight">
                            Start Billing
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Activated on Tenant Approval</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                    </div>
                </div>

                {/* Alert Rules */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notification Rules</span>
                        <div className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight">
                            6 Channels
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Push & E-Receipt Active</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

                {/* Security Profile */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security & Sessions</span>
                        <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            {twoFactorAuth ? 'Enforced 2FA' : 'Standard Auth'}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">1 Active Admin Session</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* CATEGORY 1: PROPERTY PROFILE */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 1
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-teal-600" />
                                <span>Property Profile</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Official facility details that appear on tenant billing statements and rent invoices.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Official Information</span>
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-1">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Registered Property Name</span>
                        </label>
                        <input
                            type="text"
                            value={propertyName}
                            onChange={(e) => setPropertyName(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Landlord / Authorized Manager Name</span>
                        </label>
                        <input
                            type="text"
                            value={landlordName}
                            onChange={(e) => setLandlordName(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Physical Property Address</span>
                        </label>
                        <input
                            type="text"
                            value={propertyAddress}
                            onChange={(e) => setPropertyAddress(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>Property Contact Hotline</span>
                        </label>
                        <input
                            type="text"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>BIR Tax Identification Number (TIN)</span>
                        </label>
                        <input
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* CATEGORY 3: BILLING & TARIFFS */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 2
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-teal-600" />
                                <span>Billing & Tariffs</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Set automated monthly billing cycles, overdue penalties, and baseline utility submetering rates.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        Automated Invoicing Engine
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-1">

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Late Payment Penalty Fee (₱)</label>
                        <input
                            type="number"
                            value={billing.latePaymentFee}
                            onChange={(e) => setBilling({ ...billing, latePaymentFee: e.target.value })}
                            className="w-full py-2 px-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Grace Period Before Penalty (Days)</label>
                        <CustomSelect
                            value={billing.gracePeriodDays}
                            onChange={(val) => setBilling({ ...billing, gracePeriodDays: val })}
                            options={[
                                { value: '0', label: '0 Days (Immediate on Due Date)' },
                                { value: '3', label: '3 Calendar Days' },
                                { value: '5', label: '5 Calendar Days' },
                                { value: '7', label: '7 Calendar Days' }
                            ]}
                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Operating Currency Standard</label>
                        <input
                            type="text"
                            value={currency}
                            disabled
                            className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-500"
                        />
                    </div>
                </div>

                {/* Utility Surcharges Box */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-slate-50/50 dark:bg-zinc-900/30 w-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Baseline Utility Tariffs (Philippine Pesos ₱)
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-600">
                            AUTO-INJECT ON BILL GENERATION
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                                <span>Fixed Water Tariff / Resident</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                                <input
                                    type="number"
                                    value={billing.defaultWater}
                                    onChange={(e) => setBilling({ ...billing, defaultWater: e.target.value })}
                                    className="w-full py-2 pl-7 pr-3 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>Submeter Electricity Rate (₱/kWh)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={billing.electricityKwhRate}
                                    onChange={(e) => setBilling({ ...billing, electricityKwhRate: e.target.value })}
                                    className="w-full py-2 pl-7 pr-3 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 w-full">
                    <ToggleSwitch
                        checked={billing.autoMonthlyBilling}
                        onChange={(c) => setBilling({ ...billing, autoMonthlyBilling: c })}
                        label="Automated Monthly Rent Bill Generation"
                        description="Automatically draft monthly invoices for all active residents on the 1st of every month at 00:01 AM."
                    />

                    <ToggleSwitch
                        checked={billing.sendReceiptsAutomatically}
                        onChange={(c) => setBilling({ ...billing, sendReceiptsAutomatically: c })}
                        label="Auto-Issue Verified E-Receipts"
                        description="Trigger automated PDF statement receipt generation when payment is verified."
                    />
                </div>
            </div>

            {/* CATEGORY 3: NOTIFICATION TRIGGERS */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 3
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-4 h-4 text-teal-600" />
                                <span>Notification Triggers</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Configure automated management alerts, payment verification pings, and audio alert tones.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        6 Active Event Rules
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full pt-1">
                    {[
                        { key: 'tenantRegistration', label: 'New Resident Registration Online', desc: 'Instant toast & badge alert when an applicant registers for room assignment' },
                        { key: 'paymentSubmission', label: 'E-Receipt & Payment Proof Submissions', desc: 'Alert when a tenant uploads GCash, Maya, or bank transfer receipt for verification' },
                        { key: 'overduePayment', label: 'Overdue Rent & Balance Accounts', desc: 'Notify management when a tenant passes the grace period without settling dues' },
                        { key: 'newMaintenance', label: 'Emergency & Maintenance Work Orders', desc: 'Instant high-priority notification when a repair request is lodged' },
                        { key: 'chatMessage', label: 'Resident Direct Chat Inquiries', desc: 'Live counter increment & sound chime on unread resident messages' },
                        { key: 'soundAlerts', label: 'Audio Chime on Critical Alerts', desc: 'Play subtle soft notification audio tone for urgent maintenance requests' }
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

            {/* CATEGORY 4: THEME & DISPLAY */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 4
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Moon className="w-4 h-4 text-teal-600" />
                                <span>Theme & Display</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Select visual theme and contrast preferences for the administrative control interface.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        Active: <strong className="capitalize text-slate-800 dark:text-white">{localTheme}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full pt-1">
                    {[
                        { 
                            key: 'light', 
                            label: 'Clean Light', 
                            icon: Sun, 
                            desc: 'High contrast crisp day mode' 
                        },
                        { 
                            key: 'dark', 
                            label: 'Deep Obsidian', 
                            icon: Moon, 
                            desc: 'OLED-optimized slate dark mode' 
                        },
                        { 
                            key: 'system', 
                            label: 'System Sync', 
                            icon: Laptop, 
                            desc: 'Match OS dark/light schedule' 
                        }
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
                                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-36 ${
                                    isSelected
                                        ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-500/10 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
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

            {/* CATEGORY 5: SECURITY & SESSIONS */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                Category 5
                            </span>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-teal-600" />
                                <span>Security Credentials & Administrative Sessions</span>
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            Inspect active admin sessions, configure idle timeouts, manage encrypted master credentials, and enforce 2FA.
                        </p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>1 Active Master Session</span>
                    </span>
                </div>

                <div className="space-y-4 w-full pt-1">
                    {/* Active Console Session Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">Current Master Admin Web Console</p>
                                <p className="text-[10px] text-emerald-600 font-bold">Active now · Authorized Administrator JWT</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-200/50">
                            THIS DEVICE
                        </span>
                    </div>

                    {/* Session Timeout Control */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            <span>Session Idle Inactivity Timeout</span>
                        </label>
                        <CustomSelect
                            value={sessionTimeout}
                            onChange={(val) => setSessionTimeout(val)}
                            options={[
                                { value: '30', label: '30 Minutes of Inactivity' },
                                { value: '60', label: '60 Minutes (Recommended)' },
                                { value: '120', label: '2 Hours' },
                                { value: '480', label: '8 Hours (Full Shift)' }
                            ]}
                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">Automatically logs out the master admin when no activity is detected for this duration.</p>
                    </div>

                    {/* Master Admin Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-1">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>Master Admin Email</span>
                            </label>
                            <input
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Current Password</span>
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

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
                                placeholder="Enter strong password (8+ chars, numbers, uppercase)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                            />
                            {newPassword && (
                                <div className="flex gap-1.5 pt-1">
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Confirm New Password</span>
                            </label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                placeholder="Re-type new password to confirm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:border-teal-500 outline-none"
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-[11px] text-rose-500 font-semibold mt-1">Passwords do not match.</p>
                            )}
                        </div>
                    </div>

                    {/* 2FA Toggle */}
                    <div className="pt-2 space-y-2.5 w-full">
                        <ToggleSwitch
                            checked={twoFactorAuth}
                            onChange={setTwoFactorAuth}
                            label="Enforce Two-Factor Authentication (2FA) for Admin Sign-In"
                            description="Require Authenticator app OTP code upon logging into the platform dashboard."
                        />
                    </div>

                    {/* Emergency Sign Out Card */}
                    <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Emergency Admin Sign-Out</span>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">Invalidate local session token and redirect to landing portal.</p>
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

            {/* Bottom Save Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-card shadow-xs">
                <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Ready to apply administrative changes?</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">All 5 operational categories above will be updated and synchronized across the platform.</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Discard Changes</span>
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save All Settings</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
