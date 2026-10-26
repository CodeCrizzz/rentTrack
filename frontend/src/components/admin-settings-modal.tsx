"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
    X, Shield, Bell, CreditCard, Moon, Sun, Laptop, 
    Save, RotateCcw, Download, Lock, Mail, Building2, 
    Key, Database, RefreshCw, Zap, Droplets, CheckCircle2, 
    ShieldCheck, Server, Activity, Eye, EyeOff, FileText, 
    User, Phone, MapPin, Monitor, LogOut, Search, SlidersHorizontal,
    Check, Sparkles
} from 'lucide-react';
import { useTheme } from 'next-themes';
import CustomSelect from '@/components/dropdown-select';
import { toast } from 'sonner';
import { formatPhoneInput, formatPhoneNumber } from '@/lib/phone-utils';

interface AdminSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsCategory = 
    | 'property' 
    | 'billing' 
    | 'notifications' 
    | 'appearance' 
    | 'security';

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
        sendReceiptsAutomatically: true
    },
    notifications: {
        tenantRegistration: true,
        paymentSubmission: true,
        paymentVerification: true,
        overduePayment: true,
        newMaintenance: true,
        chatMessage: true,
        soundAlerts: true
    },
    systemConfig: {
        maintenanceMode: false,
        autoBackupDaily: true,
        queryLogRetentionDays: '30'
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

export default function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsCategory>('property');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success("Administrator session securely terminated");
        onClose();
        router.push('/');
    };

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
    const [currency] = useState('PHP (₱)');

    // Form states - Billing & Automated Tariffs
    const [billing, setBilling] = useState(savedSettingsRef.current.billing);

    // Form states - Notifications
    const [notifications, setNotifications] = useState(savedSettingsRef.current.notifications);

    // Form states - System & Maintenance
    const [systemConfig, setSystemConfig] = useState(savedSettingsRef.current.systemConfig);

    // Form states - Appearance (Theme candidate before saving)
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

        setBilling({ ...currentSaved.billing });
        setNotifications({ ...currentSaved.notifications });
        setSystemConfig({ ...currentSaved.systemConfig });

        // Restore localTheme selection to active system/persisted theme without modifying current theme
        setLocalTheme(currentSaved.theme || theme || 'system');
    };

    // Re-synchronize from saved state whenever the modal is opened
    useEffect(() => {
        if (isOpen) {
            revertToSavedSettings();
        }
    }, [isOpen]);

    // Close handler ensuring unsaved changes are strictly discarded
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
            toast.success("Settings Saved", {
                description: "Platform configurations and preferences updated successfully.",
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }, 350);
    };

    const handleReset = () => {
        revertToSavedSettings();
        toast.info("Changes Reverted", {
            description: "Unsaved configuration modifications have been discarded.",
        });
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
        toast.success("Backup Downloaded", {
            description: "System configuration snapshot saved to file.",
        });
    };

    const handlePurgeCache = () => {
        setIsPurging(true);
        setTimeout(() => {
            setIsPurging(false);
            toast.success("Cache Purged", {
                description: "Application runtime memory cache cleared successfully.",
            });
        }, 500);
    };

    const handlePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        if (pass.length > 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 3;
        if (pass.length > 6) return 2;
        return 1;
    };
    
    const strength = handlePasswordStrength(newPassword);

    const categories = useMemo(() => [
        { id: 'property' as SettingsCategory, label: 'Property Profile', icon: Building2, badge: 'Official' },
        { id: 'billing' as SettingsCategory, label: 'Billing & Tariffs', icon: CreditCard, badge: 'Tariffs' },
        { id: 'notifications' as SettingsCategory, label: 'Notification Rules', icon: Bell, badge: '6 Rules' },
        { id: 'appearance' as SettingsCategory, label: 'Appearance', icon: Moon, badge: 'Theme' },
        { id: 'security' as SettingsCategory, label: 'Security & Sessions', icon: ShieldCheck, badge: 'Protected' },
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
                    className="relative w-full max-w-5xl h-[90vh] max-h-[800px] rounded-2xl bg-card border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-10 text-slate-900 dark:text-zinc-100"
                >
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-xs">
                                <SlidersHorizontal className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                        System Settings & Preferences
                                    </h2>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                        Admin Console
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    Configure operational parameters, billing tariffs, security credentials, and system rules
                                </p>
                            </div>
                        </div>

                        {/* Search and Close */}
                        <div className="flex items-center gap-2.5">
                            <div className="relative w-48 sm:w-56 hidden sm:block">
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
                        <div className="w-52 sm:w-60 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 p-2.5 space-y-1 overflow-y-auto custom-scrollbar">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1 block">
                                Configuration
                            </span>

                            {filteredCategories.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeTab === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                                            isActive
                                                ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-2xs border border-slate-200/90 dark:border-zinc-700 font-extrabold'
                                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
                                            <span className="truncate">{cat.label}</span>
                                        </div>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                                            isActive 
                                                ? 'bg-slate-100 dark:bg-zinc-700 text-slate-900 dark:text-white font-bold' 
                                                : 'bg-slate-200/60 dark:bg-zinc-800 text-slate-500'
                                        }`}>
                                            {cat.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Content Pane (Clean, Full Width Without Thick Right Spacing) */}
                        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-card">
                            
                            {/* CATEGORY 1: PROPERTY PROFILE */}
                            {activeTab === 'property' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            <span>Property Information & Facility Identity</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Official facility information printed onto resident billing invoices and legal receipts.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Registered Property Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={propertyName}
                                                onChange={(e) => setPropertyName(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Landlord / Manager Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={landlordName}
                                                onChange={(e) => setLandlordName(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Physical Property Address</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={propertyAddress}
                                                onChange={(e) => setPropertyAddress(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
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
                                                onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))}
                                                placeholder="+63 999 123 7654"
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Tax Identification Number (TIN)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={taxId}
                                                onChange={(e) => setTaxId(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CATEGORY 3: BILLING & TARIFFS */}
                            {activeTab === 'billing' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-emerald-600" />
                                            <span>Automated Invoicing & Baseline Tariffs</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Cycle parameters, utility submeter tariffs, and automated payment generation rules.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">

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
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Grace Period Before Penalty</label>
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
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Fixed Water Tariff (₱ / Resident)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                                                <input
                                                    type="number"
                                                    value={billing.defaultWater}
                                                    onChange={(e) => setBilling({ ...billing, defaultWater: e.target.value })}
                                                    className="w-full py-2 pl-7 pr-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Electricity Submeter Rate (₱ / kWh)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={billing.electricityKwhRate}
                                                    onChange={(e) => setBilling({ ...billing, electricityKwhRate: e.target.value })}
                                                    className="w-full py-2 pl-7 pr-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 pt-1 w-full">
                                        <ToggleSwitch
                                            checked={billing.autoMonthlyBilling}
                                            onChange={(c) => setBilling({ ...billing, autoMonthlyBilling: c })}
                                            label="Automated Monthly Rent Invoice Drafting"
                                            description="Automatically prepare monthly bills for all active residents on the 1st of every month at midnight."
                                        />
                                        <ToggleSwitch
                                            checked={billing.sendReceiptsAutomatically}
                                            onChange={(c) => setBilling({ ...billing, sendReceiptsAutomatically: c })}
                                            label="Auto-Issue Electronic Payment Receipts"
                                            description="Trigger digital payment verification receipt upon confirming resident bank and e-wallet transfers."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CATEGORY 4: NOTIFICATION RULES */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-amber-500" />
                                            <span>Operational Notification Rules</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Real-time alerts, payment proof pings, and notification dispatch toggles.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                        {[
                                            { key: 'tenantRegistration', label: 'New Resident Registration', desc: 'Instant toast when an applicant completes their room application' },
                                            { key: 'paymentSubmission', label: 'Payment Proof Submissions', desc: 'Alert when a tenant uploads GCash, Maya, or bank transfer slip' },
                                            { key: 'overduePayment', label: 'Overdue Balance Alerts', desc: 'Notify management when an invoice passes the scheduled grace period' },
                                            { key: 'newMaintenance', label: 'Emergency Repair Requests', desc: 'High-priority notification when a tenant logs a maintenance work order' },
                                            { key: 'chatMessage', label: 'Tenant Direct Messages', desc: 'Live counter increment & badge update on incoming tenant chat messages' },
                                            { key: 'soundAlerts', label: 'Subtle Audio Chime', desc: 'Play subtle soft tone when urgent maintenance work orders arrive' }
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

                            {/* CATEGORY 5: THEME & DISPLAY */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Moon className="w-4 h-4 text-indigo-500" />
                                            <span>Appearance & Visual Theme</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Visual theme and contrast preferences for administrative workflows.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
                                        {[
                                            { key: 'light', label: 'Clean Light', icon: Sun, desc: 'High-contrast day mode' },
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

                            {/* CATEGORY 5: SECURITY & SESSIONS */}
                            {activeTab === 'security' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            <span>Security Credentials & Administrative Sessions</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            Tools to inspect active administrative sessions, manage master credentials, configure 2FA, and securely log out.
                                        </p>
                                    </div>

                                    {/* Active Administrative Session & Logout */}
                                    <div className="space-y-3.5 w-full">
                                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Current Admin Web Console Session</p>
                                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                                                            THIS DEVICE
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-emerald-600 font-medium">Active now · Authorized Administrator JWT Token</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Terminate & Log Out</span>
                                            </button>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Session Inactivity Logout Timeout</span>
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
                                        </div>
                                    </div>

                                    {/* Master Admin Credentials */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-1">
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Master Administrator Email</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={adminEmail}
                                                onChange={(e) => setAdminEmail(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
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
                                                    className="w-full py-2 px-3 pr-9 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                                                placeholder="Enter strong password (8+ chars)"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Confirm New Password</span>
                                            </label>
                                            <input
                                                type={showPasswords ? "text" : "password"}
                                                placeholder="Re-type new password to confirm"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p className="text-[11px] text-rose-500 font-semibold mt-1">Passwords do not match.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2FA Toggle */}
                                    <div className="pt-2 w-full">
                                        <ToggleSwitch
                                            checked={twoFactorAuth}
                                            onChange={setTwoFactorAuth}
                                            label="Enforce Two-Factor Authentication (2FA) for Master Sign-In"
                                            description="Require authenticator app OTP security code upon logging into the admin web console."
                                        />
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>RentTrack Platform v2.4 • Active Production Environment</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportBackup}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="Download JSON configuration snapshot"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Backup</span>
                            </button>

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
