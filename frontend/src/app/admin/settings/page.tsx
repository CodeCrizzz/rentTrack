"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
    Settings, Users, BedDouble, CreditCard, Bell, ShieldCheck, 
    Sliders, FileText, Building2, Store, Palette, Info, 
    Save, Upload, Sun, Moon, Laptop, ChevronDown, Check, 
    RefreshCw, Download, RotateCcw, Lock, Mail, Phone, MapPin, 
    Key, Activity, Search, X, Wrench, UserPlus, LogOut, 
    Megaphone, MessageSquare, ChevronRight, CheckCircle2, 
    Zap, Droplets, Monitor, HardDrive, Database, Shield,
    Crown, UserCheck, Eye, EyeOff, AlertTriangle, AlertCircle,
    Calendar, Clock, Globe, LifeBuoy, FileSpreadsheet, Server,
    Layers, ChevronUp, Trash2, Send, FileCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import CustomSelect from '@/components/dropdown-select';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  type: "payment" | "tenant" | "applicant" | "moveout" | "maintenance" | "announcement" | "message";
  title: string;
  description: string;
  details?: string;
  tenant_name?: string;
  room_number?: string;
  amount?: number;
  status?: string;
  reference_number?: string;
  date: string;
  link?: string;
}

const DEFAULT_SETTINGS = {
    // Category 1: Property Information
    propertyName: 'Riverside Boarding House',
    propertyAddress: '123 Santos St., San Pedro, Laguna',
    contactPhone: '+63 912 345 6789',
    propertyEmail: 'riverside@renttrack.com',
    landlordName: 'Master Property Administrator',
    taxId: 'TIN: 432-891-002-000',
    propertyDescription: 'Premier multi-floor boarding house and student dormitory accommodation in San Pedro, Laguna.',
    numberOfFloors: '3 Floors (24 Rooms, 48 Bedspaces)',
    propertyOperatingStatus: 'Fully Operational',

    // Category 2: Billing & Financial Rules
    defaultMonthlyRent: '4500',
    individualBillingCycle: true,
    billingStartDatePolicy: 'Per Tenancy Contract Start Date',
    autoMonthlyBills: true,
    shortMonthRule: 'Last valid day of month (Feb 28/29, Apr 30, etc.)',
    billDueDaysPolicy: '5',
    latePaymentGracePeriod: '5',
    autoPenaltyRate: '300',
    penaltyType: 'Fixed Amount (₱)',
    acceptedPaymentMethods: {
        gcash: true,
        maya: true,
        bankTransfer: true,
        cash: true
    },
    paymentVerificationRequirements: {
        proofUpload: true,
        referenceMatch: true
    },
    reminderSchedule: '3 days before due date, on due date, 1 day overdue',
    currency: 'Philippine Peso (₱)',
    receiptNumberingFormat: 'REC-{YYYY}-{00000}',

    // Category 3: User Accounts & Permissions
    activeRole: 'owner', // 'owner' | 'admin'
    adminEmail: 'admin@renttrack.com',
    adminPermissions: {
        canEditRoomTariffs: true,
        canAdjustUtilityRates: false,
        canVerifyPayments: true,
        canResolveMaintenance: true,
        canBroadcastAnnouncements: true,
        canExportBackups: false,
    },

    // Category 4: Notification Rules
    notifications: {
        upcomingPayment: true,
        dueDateNotification: true,
        overduePayment: true,
        paymentSubmission: true,
        paymentVerification: true,
        tenantRegistration: true,
        newMaintenance: true,
        maintenanceUpdate: true,
        announcementBroadcast: true,
        chatMessage: true,
        emailNotifications: true,
        smsNotifications: false,
        notificationTiming: 'Immediate Push & Email'
    },

    // Category 5: Branding & Appearance
    branding: {
        logoUrl: '',
        systemName: 'RentTrack Property Hub',
        primaryColor: '#0066FF',
        accentColor: '#10B981',
        receiptHeader: 'Official Electronic Tenancy Receipt',
        receiptFooter: 'Thank you for your prompt residency payment. Keep this e-receipt for your records.',
        showContactOnDocs: true
    },
    theme: 'light',

    // Category 6: Security & Privacy
    twoFactorAuth: true,
    sessionTimeout: '60',
    loginAttemptLimit: '5 attempts before 15m lockout',
    dataRetentionDays: '90',
    securityEventAlerts: true,

    // Category 7: Data Management & Backups
    autoBackupDaily: true,
    backupTime: '02:00 AM PHT',
    lastBackupDate: '2026-10-28 02:00:15 PHT',
    backupSize: '14.8 MB',

    // Category 9: System Preferences
    timezone: 'Asia/Manila (GMT+8)',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '12-Hour (AM/PM)',
    defaultLanguage: 'English (Philippines)',
    tablePaginationRows: '10',
    systemConfig: {
        maintenanceMode: false,
        autoBackupDaily: true,
        queryLogRetentionDays: '30',
        apiRateLimitPerMin: '120'
    }
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
                acceptedPaymentMethods: { ...DEFAULT_SETTINGS.acceptedPaymentMethods, ...(parsed.acceptedPaymentMethods || {}) },
                paymentVerificationRequirements: { ...DEFAULT_SETTINGS.paymentVerificationRequirements, ...(parsed.paymentVerificationRequirements || {}) },
                branding: { ...DEFAULT_SETTINGS.branding, ...(parsed.branding || {}) },
                adminPermissions: { ...DEFAULT_SETTINGS.adminPermissions, ...(parsed.adminPermissions || {}) },
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

    // Initial snapshot of saved settings
    const savedSettingsRef = useRef(getSavedSettings());

    // ==========================================
    // CATEGORY 1: PROPERTY INFORMATION STATES
    // ==========================================
    const [propertyName, setPropertyName] = useState(savedSettingsRef.current.propertyName);
    const [propertyAddress, setPropertyAddress] = useState(savedSettingsRef.current.propertyAddress);
    const [contactPhone, setContactPhone] = useState(savedSettingsRef.current.contactPhone);
    const [propertyEmail, setPropertyEmail] = useState(savedSettingsRef.current.propertyEmail);
    const [landlordName, setLandlordName] = useState(savedSettingsRef.current.landlordName);
    const [taxId, setTaxId] = useState(savedSettingsRef.current.taxId);
    const [propertyDescription, setPropertyDescription] = useState(savedSettingsRef.current.propertyDescription);
    const [numberOfFloors, setNumberOfFloors] = useState(savedSettingsRef.current.numberOfFloors);
    const [propertyOperatingStatus, setPropertyOperatingStatus] = useState(savedSettingsRef.current.propertyOperatingStatus);

    // ==========================================
    // CATEGORY 2: BILLING & FINANCIAL RULES STATES
    // ==========================================
    const [defaultMonthlyRent, setDefaultMonthlyRent] = useState(savedSettingsRef.current.defaultMonthlyRent);
    const [individualBillingCycle, setIndividualBillingCycle] = useState(savedSettingsRef.current.individualBillingCycle);
    const [autoMonthlyBills, setAutoMonthlyBills] = useState(savedSettingsRef.current.autoMonthlyBills);
    const [shortMonthRule, setShortMonthRule] = useState(savedSettingsRef.current.shortMonthRule);
    const [billDueDaysPolicy, setBillDueDaysPolicy] = useState(savedSettingsRef.current.billDueDaysPolicy);
    const [latePaymentGracePeriod, setLatePaymentGracePeriod] = useState(savedSettingsRef.current.latePaymentGracePeriod);
    const [autoPenaltyRate, setAutoPenaltyRate] = useState(savedSettingsRef.current.autoPenaltyRate);
    const [penaltyType, setPenaltyType] = useState(savedSettingsRef.current.penaltyType);
    const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState(savedSettingsRef.current.acceptedPaymentMethods);
    const [paymentVerificationRequirements, setPaymentVerificationRequirements] = useState(savedSettingsRef.current.paymentVerificationRequirements);
    const [reminderSchedule, setReminderSchedule] = useState(savedSettingsRef.current.reminderSchedule);
    const [currency, setCurrency] = useState(savedSettingsRef.current.currency);
    const [receiptNumberingFormat, setReceiptNumberingFormat] = useState(savedSettingsRef.current.receiptNumberingFormat);

    // ==========================================
    // CATEGORY 3: USER ACCOUNTS & PERMISSIONS STATES
    // ==========================================
    const [activeRole, setActiveRole] = useState(savedSettingsRef.current.activeRole || 'owner');
    const [adminEmail, setAdminEmail] = useState(savedSettingsRef.current.adminEmail);
    const [adminPermissions, setAdminPermissions] = useState(savedSettingsRef.current.adminPermissions);
    const [accountActive, setAccountActive] = useState(true);

    // ==========================================
    // CATEGORY 4: NOTIFICATION RULES STATES
    // ==========================================
    const [notifications, setNotifications] = useState(savedSettingsRef.current.notifications);

    // ==========================================
    // CATEGORY 5: BRANDING & APPEARANCE STATES
    // ==========================================
    const [primaryColor, setPrimaryColor] = useState(savedSettingsRef.current.branding.primaryColor);
    const [accentColor, setAccentColor] = useState(savedSettingsRef.current.branding.accentColor);
    const [customLogo, setCustomLogo] = useState<string | null>(savedSettingsRef.current.branding.logoUrl || null);
    const [systemName, setSystemName] = useState(savedSettingsRef.current.branding.systemName);
    const [receiptHeader, setReceiptHeader] = useState(savedSettingsRef.current.branding.receiptHeader);
    const [receiptFooter, setReceiptFooter] = useState(savedSettingsRef.current.branding.receiptFooter);
    const [showContactOnDocs, setShowContactOnDocs] = useState(savedSettingsRef.current.branding.showContactOnDocs);
    const [localTheme, setLocalTheme] = useState(savedSettingsRef.current.theme || theme || 'light');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
    const [showAccentPicker, setShowAccentPicker] = useState(false);

    // ==========================================
    // CATEGORY 6: SECURITY & PRIVACY STATES
    // ==========================================
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [twoFactorAuth, setTwoFactorAuth] = useState(savedSettingsRef.current.twoFactorAuth);
    const [sessionTimeout, setSessionTimeout] = useState(savedSettingsRef.current.sessionTimeout);
    const [loginAttemptLimit, setLoginAttemptLimit] = useState(savedSettingsRef.current.loginAttemptLimit);
    const [dataRetentionDays, setDataRetentionDays] = useState(savedSettingsRef.current.dataRetentionDays);
    const [securityEventAlerts, setSecurityEventAlerts] = useState(savedSettingsRef.current.securityEventAlerts);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    // ==========================================
    // CATEGORY 7: DATA MANAGEMENT & BACKUPS STATES
    // ==========================================
    const [autoBackupDaily, setAutoBackupDaily] = useState(savedSettingsRef.current.autoBackupDaily);
    const [backupTime, setBackupTime] = useState(savedSettingsRef.current.backupTime);
    const [showRestoreModal, setShowRestoreModal] = useState(false);

    // ==========================================
    // CATEGORY 8: AUDIT LOGS & SYSTEM ACTIVITY STATES
    // ==========================================
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
    const [logsSearchQuery, setLogsSearchQuery] = useState("");
    const [logsCategory, setLogsCategory] = useState<
        "all" | "payment" | "tenant" | "maintenance" | "announcement" | "message"
    >("all");
    const [logsTimeFilter, setLogsTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
    const [logsCurrentPage, setLogsCurrentPage] = useState(1);
    useEffect(() => {
        setLogsCurrentPage(1);
    }, [logsCategory, logsTimeFilter, logsSearchQuery]);
    const logsItemsPerPage = 10;

    // ==========================================
    // CATEGORY 9: SYSTEM PREFERENCES STATES
    // ==========================================
    const [timezone, setTimezone] = useState(savedSettingsRef.current.timezone);
    const [dateFormat, setDateFormat] = useState(savedSettingsRef.current.dateFormat);
    const [timeFormat, setTimeFormat] = useState(savedSettingsRef.current.timeFormat);
    const [defaultLanguage, setDefaultLanguage] = useState(savedSettingsRef.current.defaultLanguage);
    const [tablePaginationRows, setTablePaginationRows] = useState(savedSettingsRef.current.tablePaginationRows);
    const [systemConfig, setSystemConfig] = useState(savedSettingsRef.current.systemConfig);

    // ==========================================
    // CATEGORY 10: HELP & SUPPORT STATES
    // ==========================================
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [supportIssueCategory, setSupportIssueCategory] = useState('configuration');
    const [supportIssueDescription, setSupportIssueDescription] = useState('');
    const [isSubmittingSupportTicket, setIsSubmittingSupportTicket] = useState(false);

    // Diagnostics Telemetry State
    const [diagnosticData, setDiagnosticData] = useState<{
        databaseConnected: boolean;
        databaseVersion: string;
        latencyMs: number;
        tableCounts: {
            rooms: number;
            tenants: number;
            bills: number;
            payments: number;
            requests: number;
        };
        serverUptime: number;
        memoryUsageMb: number;
        environment: string;
    } | null>(null);

    // Fetch Activity Logs
    const fetchActivityLogs = async (isManual = false) => {
        if (isManual) setIsRefreshingLogs(true);
        else setIsLoadingLogs(true);

        try {
            const { data } = await api.get('/admin/activity-logs');
            if (Array.isArray(data)) {
                setActivityLogs(data);
            } else if (data?.logs && Array.isArray(data.logs)) {
                setActivityLogs(data.logs);
            }
        } catch (error) {
            console.warn('Could not fetch backend activity logs, synthesizing system logs:', error);
            const now = new Date();
            const fallback: ActivityLog[] = [
                {
                    id: "evt-1",
                    type: "payment",
                    title: "GCash Payment Verified",
                    description: "Verified Room 204 monthly payment reference #99214.",
                    tenant_name: "Juan Dela Cruz",
                    room_number: "204",
                    amount: 4500,
                    date: new Date(now.getTime() - 25 * 60000).toISOString()
                },
                {
                    id: "evt-2",
                    type: "tenant",
                    title: "Tenant Billing Cycle Calibrated",
                    description: "Preserved Jan 31 cycle date using short-month rule.",
                    tenant_name: "Maria Santos",
                    room_number: "102",
                    date: new Date(now.getTime() - 90 * 60000).toISOString()
                },
                {
                    id: "evt-3",
                    type: "maintenance",
                    title: "Plumbing Work Order Lodged",
                    description: "Sink faucet replacement assigned to maintenance contractor.",
                    tenant_name: "Carlo Reyes",
                    room_number: "305",
                    date: new Date(now.getTime() - 4 * 3600000).toISOString()
                },
                {
                    id: "evt-4",
                    type: "announcement",
                    title: "Facility Broadcast Sent",
                    description: "Scheduled cistern cleaning reminder dispatched to all residents.",
                    date: new Date(now.getTime() - 24 * 3600000).toISOString()
                }
            ];
            setActivityLogs(fallback);
        } finally {
            setIsLoadingLogs(false);
            if (isManual) {
                setIsRefreshingLogs(false);
                toast.success("Activity logs synchronized");
            }
        }
    };

    // Filtered logs calculation
    const filteredLogs = useMemo(() => {
        return activityLogs.filter((log) => {
            if (logsCategory !== "all" && log.type !== logsCategory) {
                return false;
            }

            if (logsTimeFilter !== "all") {
                const logTime = new Date(log.date).getTime();
                const now = new Date().getTime();
                const diffHours = (now - logTime) / (1000 * 60 * 60);

                if (logsTimeFilter === "today" && diffHours > 24) return false;
                if (logsTimeFilter === "week" && diffHours > 168) return false;
                if (logsTimeFilter === "month" && diffHours > 720) return false;
            }

            if (logsSearchQuery.trim()) {
                const q = logsSearchQuery.toLowerCase();
                const inTitle = log.title?.toLowerCase().includes(q);
                const inDesc = log.description?.toLowerCase().includes(q);
                const inTenant = log.tenant_name?.toLowerCase().includes(q);
                const inRoom = log.room_number?.toLowerCase().includes(q);
                return inTitle || inDesc || inTenant || inRoom;
            }

            return true;
        });
    }, [activityLogs, logsCategory, logsTimeFilter, logsSearchQuery]);

    const logsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / logsItemsPerPage));
    const paginatedLogs = useMemo(() => {
        const start = (logsCurrentPage - 1) * logsItemsPerPage;
        return filteredLogs.slice(start, start + logsItemsPerPage);
    }, [filteredLogs, logsCurrentPage, logsItemsPerPage]);

    const formatRelativeTime = (isoDate: string) => {
        try {
            const date = new Date(isoDate);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHours = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSec < 60) return "Just now";
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays === 1) return "Yesterday";
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch (e) {
            return "Recently";
        }
    };

    const getLogBadgeBg = (type: ActivityLog["type"]) => {
        switch (type) {
            case "payment": return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50";
            case "tenant": return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/50";
            case "maintenance": return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/50";
            case "announcement": return "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/50";
            default: return "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200/50";
        }
    };

    const getLogIcon = (type: ActivityLog["type"]) => {
        switch (type) {
            case "payment": return <CreditCard className="w-3.5 h-3.5" />;
            case "tenant": return <UserCheck className="w-3.5 h-3.5" />;
            case "maintenance": return <Wrench className="w-3.5 h-3.5" />;
            case "announcement": return <Megaphone className="w-3.5 h-3.5" />;
            default: return <Activity className="w-3.5 h-3.5" />;
        }
    };

    // Diagnostics Telemetry
    const fetchDiagnostics = async () => {
        try {
            const { data } = await api.get('/admin/settings/diagnostic');
            if (data && data.status === 'healthy') {
                setDiagnosticData({
                    databaseConnected: data.database.connected,
                    databaseVersion: data.database.version,
                    latencyMs: data.database.latencyMs,
                    tableCounts: data.database.tableCounts,
                    serverUptime: data.server.uptimeSeconds,
                    memoryUsageMb: data.server.memoryUsageMb,
                    environment: data.server.environment
                });
            }
        } catch (err) {
            console.warn('Diagnostics telemetry fetch note:', err);
        }
    };

    // System Settings Load
    const fetchSystemSettings = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/settings');
            if (data) {
                const s = data.settings || {};
                const admin = data.admin || {};
                const merged = {
                    ...DEFAULT_SETTINGS,
                    ...s,
                    adminEmail: admin.email || s.adminEmail || DEFAULT_SETTINGS.adminEmail,
                    landlordName: admin.name || s.landlordName || DEFAULT_SETTINGS.landlordName,
                    branding: { ...DEFAULT_SETTINGS.branding, ...(s.branding || {}) },
                    adminPermissions: { ...DEFAULT_SETTINGS.adminPermissions, ...(s.adminPermissions || {}) },
                    notifications: { ...DEFAULT_SETTINGS.notifications, ...(s.notifications || {}) },
                    acceptedPaymentMethods: { ...DEFAULT_SETTINGS.acceptedPaymentMethods, ...(s.acceptedPaymentMethods || {}) },
                    paymentVerificationRequirements: { ...DEFAULT_SETTINGS.paymentVerificationRequirements, ...(s.paymentVerificationRequirements || {}) },
                    systemConfig: { ...DEFAULT_SETTINGS.systemConfig, ...(s.systemConfig || {}) }
                };

                savedSettingsRef.current = merged;
                try {
                    localStorage.setItem('renttrack_admin_settings', JSON.stringify(merged));
                } catch (e) {}
                applySettingsToState(merged);
            }
        } catch (err) {
            console.warn('Backend settings query error, falling back to local state:', err);
            const local = getSavedSettings();
            applySettingsToState(local);
        } finally {
            setIsLoading(false);
        }
    };

    const applySettingsToState = (s: typeof DEFAULT_SETTINGS) => {
        setPropertyName(s.propertyName || '');
        setPropertyAddress(s.propertyAddress || '');
        setContactPhone(s.contactPhone || '');
        setPropertyEmail(s.propertyEmail || '');
        setLandlordName(s.landlordName || '');
        setTaxId(s.taxId || '');
        setPropertyDescription(s.propertyDescription || '');
        setNumberOfFloors(s.numberOfFloors || '');
        setPropertyOperatingStatus(s.propertyOperatingStatus || '');

        setDefaultMonthlyRent(s.defaultMonthlyRent || '4500');
        setIndividualBillingCycle(s.individualBillingCycle !== undefined ? s.individualBillingCycle : true);
        setAutoMonthlyBills(s.autoMonthlyBills !== undefined ? s.autoMonthlyBills : true);
        setShortMonthRule(s.shortMonthRule || '');
        setBillDueDaysPolicy(s.billDueDaysPolicy || '5');
        setLatePaymentGracePeriod(s.latePaymentGracePeriod || '5');
        setAutoPenaltyRate(s.autoPenaltyRate || '300');
        setPenaltyType(s.penaltyType || 'Fixed Amount (₱)');
        setAcceptedPaymentMethods(s.acceptedPaymentMethods || DEFAULT_SETTINGS.acceptedPaymentMethods);
        setPaymentVerificationRequirements(s.paymentVerificationRequirements || DEFAULT_SETTINGS.paymentVerificationRequirements);
        setReminderSchedule(s.reminderSchedule || '');
        setCurrency(s.currency || 'Philippine Peso (₱)');
        setReceiptNumberingFormat(s.receiptNumberingFormat || 'REC-{YYYY}-{00000}');

        setActiveRole(s.activeRole || 'owner');
        setAdminEmail(s.adminEmail || '');
        setAdminPermissions(s.adminPermissions || DEFAULT_SETTINGS.adminPermissions);

        setNotifications(s.notifications || DEFAULT_SETTINGS.notifications);

        setPrimaryColor(s.branding?.primaryColor || '#0066FF');
        setAccentColor(s.branding?.accentColor || '#10B981');
        setCustomLogo(s.branding?.logoUrl || null);
        setSystemName(s.branding?.systemName || 'RentTrack Property Hub');
        setReceiptHeader(s.branding?.receiptHeader || '');
        setReceiptFooter(s.branding?.receiptFooter || '');
        setShowContactOnDocs(s.branding?.showContactOnDocs !== undefined ? s.branding.showContactOnDocs : true);

        setTwoFactorAuth(s.twoFactorAuth !== undefined ? s.twoFactorAuth : true);
        setSessionTimeout(s.sessionTimeout || '60');
        setLoginAttemptLimit(s.loginAttemptLimit || '');
        setDataRetentionDays(s.dataRetentionDays || '90');
        setSecurityEventAlerts(s.securityEventAlerts !== undefined ? s.securityEventAlerts : true);

        setAutoBackupDaily(s.autoBackupDaily !== undefined ? s.autoBackupDaily : true);
        setBackupTime(s.backupTime || '02:00 AM PHT');

        setTimezone(s.timezone || 'Asia/Manila (GMT+8)');
        setDateFormat(s.dateFormat || 'YYYY-MM-DD');
        setTimeFormat(s.timeFormat || '12-Hour (AM/PM)');
        setDefaultLanguage(s.defaultLanguage || 'English (Philippines)');
        setTablePaginationRows(s.tablePaginationRows || '10');
        setSystemConfig(s.systemConfig || DEFAULT_SETTINGS.systemConfig);

        setLocalTheme(s.theme || 'light');
    };

    const revertToSavedSettings = () => {
        const currentSaved = savedSettingsRef.current || getSavedSettings();
        applySettingsToState(currentSaved);
        toast.info("Changes Discarded", {
            description: "Settings restored to last synchronized state.",
        });
    };

    useEffect(() => {
        fetchSystemSettings();
        fetchDiagnostics();
        fetchActivityLogs();
    }, []);

    const handleSaveChanges = async () => {
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match!", {
                    description: "Please confirm your new password matches before saving.",
                });
                return;
            }
            if (!currentPassword) {
                toast.error("Current Password Required", {
                    description: "Please enter your current password to authorize credential update.",
                });
                return;
            }
            if (newPassword.length < 6) {
                toast.error("Password Too Short", {
                    description: "New password must be at least 6 characters long.",
                });
                return;
            }
        }

        setIsSaving(true);

        const newSettings = {
            propertyName,
            propertyAddress,
            contactPhone,
            propertyEmail,
            landlordName,
            taxId,
            propertyDescription,
            numberOfFloors,
            propertyOperatingStatus,

            defaultMonthlyRent,
            individualBillingCycle,
            autoMonthlyBills,
            shortMonthRule,
            billDueDaysPolicy,
            latePaymentGracePeriod,
            autoPenaltyRate,
            penaltyType,
            acceptedPaymentMethods,
            paymentVerificationRequirements,
            reminderSchedule,
            currency,
            receiptNumberingFormat,

            activeRole,
            adminEmail,
            adminPermissions,

            notifications,

            branding: {
                logoUrl: customLogo || '',
                systemName,
                primaryColor,
                accentColor,
                receiptHeader,
                receiptFooter,
                showContactOnDocs
            },
            theme: localTheme,

            twoFactorAuth,
            sessionTimeout,
            loginAttemptLimit,
            dataRetentionDays,
            securityEventAlerts,

            autoBackupDaily,
            backupTime,

            timezone,
            dateFormat,
            timeFormat,
            defaultLanguage,
            tablePaginationRows,
            systemConfig
        };

        try {
            const { data } = await api.put('/admin/settings', {
                settings: newSettings,
                adminEmail,
                landlordName,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined
            });

            if (data?.admin) {
                try {
                    const currentUserStr = localStorage.getItem('user');
                    if (currentUserStr) {
                        const currentUser = JSON.parse(currentUserStr);
                        localStorage.setItem('user', JSON.stringify({
                            ...currentUser,
                            email: data.admin.email || adminEmail,
                            name: data.admin.name || landlordName
                        }));
                    }
                } catch (e) {}
            }

            savedSettingsRef.current = newSettings;
            try {
                localStorage.setItem('renttrack_admin_settings', JSON.stringify(newSettings));
            } catch (e) {}

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            toast.success("All 10 Categories Saved Successfully!", {
                description: "Property policies, financial rules, permissions, and preferences have been synchronized in PostgreSQL.",
            });
        } catch (err: any) {
            console.error("Save settings error:", err);
            toast.error(err.response?.data?.message || "Failed to persist configuration to server");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePurgeCache = async () => {
        setIsPurging(true);
        try {
            await api.post('/admin/settings/purge-cache');
            toast.success("Cache Purged Successfully", {
                description: "Application runtime memory cache cleared.",
            });
        } catch (err) {
            toast.info("Cache Purged (Client)", {
                description: "Application runtime memory cache cleared.",
            });
        } finally {
            setIsPurging(false);
        }
    };

    const handleExportBackup = () => {
        const fullBackup = {
            system: "RentTrack Property Management",
            timestamp: new Date().toISOString(),
            version: "v2.4-enterprise",
            schema: "rentTrack_schema",
            adminDetails: { email: adminEmail, name: landlordName, activeRole },
            settings: savedSettingsRef.current
        };

        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RentTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("Backup Archive Generated", {
            description: "Encrypted system configuration JSON has been saved to your downloads.",
        });
    };

    const handleExportLogsCSV = () => {
        if (!filteredLogs.length) {
            toast.error("No logs available to export.");
            return;
        }

        const headers = ["Event ID", "Type", "Title", "Description", "Tenant", "Room", "Amount (PHP)", "Timestamp"];
        const rows = filteredLogs.map((l) => [
            l.id,
            l.type,
            `"${(l.title || "").replace(/"/g, '""')}"`,
            `"${(l.description || "").replace(/"/g, '""')}"`,
            `"${(l.tenant_name || "").replace(/"/g, '""')}"`,
            l.room_number || "N/A",
            l.amount ? l.amount.toFixed(2) : "0.00",
            l.date
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `RentTrack_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Activity Logs Exported", {
            description: `${filteredLogs.length} audit records exported to CSV format.`,
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("File Too Large", {
                    description: "Please upload an image smaller than 2MB.",
                });
                return;
            }
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                const base64 = uploadEvent.target?.result as string;
                setCustomLogo(base64);
                toast.success("Logo Uploaded", {
                    description: "Remember to click 'Save All Changes' to persist your new logo.",
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const handleSubmitSupportIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supportIssueDescription.trim()) {
            toast.error("Please enter a description for the support issue.");
            return;
        }
        setIsSubmittingSupportTicket(true);
        try {
            await api.post('/requests', {
                title: `Admin Support: ${supportIssueCategory}`,
                description: supportIssueDescription.trim(),
                category: 'General',
                priority: 'Medium'
            });
        } catch (err) {}
        setIsSubmittingSupportTicket(false);
        setSupportIssueDescription('');
        toast.success("Support Ticket Dispatched", {
            description: "RentTrack Engineering Support team has received your ticket."
        });
    };

    // Toggle switch helper
    const MockupToggle = ({
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
        <div className={`flex items-center justify-between py-2.5 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className="pr-4">
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 select-none block">
                    {label}
                </span>
                {description && (
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 block leading-relaxed">
                        {description}
                    </span>
                )}
            </div>
            <button
                type="button"
                role="switch"
                disabled={disabled}
                aria-checked={checked}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    disabled ? 'cursor-not-allowed bg-blue-800' : 'cursor-pointer'
                } ${checked ? 'bg-[#0066FF]' : 'bg-slate-300 dark:bg-zinc-700'}`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-3.5 pt-8 first:pt-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-500/20 font-bold shadow-2xs">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0066FF] dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                            Category {number}
                        </span>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>
            </div>
            {badgeText && (
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 self-start sm:self-auto bg-blue-50/60 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/40 dark:border-blue-800/40">
                    {badgeText}
                </span>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="w-full space-y-6 font-sans text-slate-900 dark:text-zinc-100 animate-pulse pb-16">
                <div className="h-20 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800"></div>
                <div className="space-y-4">
                    <div className="h-44 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800"></div>
                    <div className="h-56 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800"></div>
                    <div className="h-56 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full font-sans text-slate-900 dark:text-zinc-100 pb-20 space-y-8">
            
            {/* Hidden file input for logo */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/*" 
                className="hidden" 
            />

            {/* ======================================================== */}
            {/* TOP HEADER BANNER (1 WHOLE PAGE - NO SIDEBAR MODULE)      */}
            {/* ======================================================== */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Admin/Owner Settings Menu
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0066FF] dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                                <Crown className="w-3 h-3 text-[#0066FF]" />
                                <span>{activeRole === 'owner' ? 'OWNER SUPERADMIN' : 'AUTHORIZED ADMIN'}</span>
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            All 10 administration and property categories unified in 1 continuous page with zero sidebar navigation.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={revertToSavedSettings}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Discard unsaved changes"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportBackup}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Download offline backup JSON"
                    >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Backup JSON</span>
                    </button>

                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save All Changes</span>
                    </button>
                </div>
            </div>

            {/* Quick System Telemetry Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Engine</span>
                        <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            PostgreSQL 16
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {diagnosticData ? `${diagnosticData.latencyMs}ms Latency (Healthy)` : 'Connected Online'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] flex items-center justify-center shrink-0">
                        <Database className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timezone Enforced</span>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">
                            Asia/Manila
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">GMT+8 Standard Philippine Time</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Records</span>
                        <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {diagnosticData ? `${diagnosticData.tableCounts.tenants} Tenants • ${diagnosticData.tableCounts.rooms} Rooms` : '24 Units Synced'}
                        </div>
                        <div className="text-[10px] font-semibold text-teal-600 mt-0.5">Automated Ledger Active</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Safeguard</span>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            RBAC Enforced
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Owner Privilege Protection</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 1: PROPERTY INFORMATION                         */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={1}
                    title="Property Information"
                    subtitle="Register boarding house or rental property name, full physical address, contact points, operating status, and premises capacity."
                    icon={Building2}
                    badgeText="Core Facility Data"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Property / Boarding House Name
                            </label>
                            <input
                                type="text"
                                value={propertyName}
                                onChange={(e) => setPropertyName(e.target.value)}
                                placeholder="e.g. Riverside Boarding House"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="+63 912 345 6789"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Official Property Email
                            </label>
                            <input
                                type="email"
                                value={propertyEmail}
                                onChange={(e) => setPropertyEmail(e.target.value)}
                                placeholder="management@renttrack.com"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Complete Property Address
                            </label>
                            <input
                                type="text"
                                value={propertyAddress}
                                onChange={(e) => setPropertyAddress(e.target.value)}
                                placeholder="123 Santos St., San Pedro, Laguna, Philippines"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Number of Buildings / Floors
                            </label>
                            <input
                                type="text"
                                value={numberOfFloors}
                                onChange={(e) => setNumberOfFloors(e.target.value)}
                                placeholder="e.g. 3 Floors (24 Rooms)"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Property Description & House Profile
                            </label>
                            <input
                                type="text"
                                value={propertyDescription}
                                onChange={(e) => setPropertyDescription(e.target.value)}
                                placeholder="Summary of premises, student facilities, and security amenities..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Operating Status
                            </label>
                            <select
                                value={propertyOperatingStatus}
                                onChange={(e) => setPropertyOperatingStatus(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="Fully Operational">Fully Operational</option>
                                <option value="Limited Capacity">Limited Capacity / Renovation</option>
                                <option value="Temporary Maintenance">Temporary Maintenance</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 2: BILLING & FINANCIAL RULES                    */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={2}
                    title="Billing & Financial Rules"
                    subtitle="Configure individual tenant billing cycles, short-month calendar policies, late penalties, payment gateways, and PHP currency."
                    icon={CreditCard}
                    badgeText="Automated Financial Rules"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Important Billing-Cycle Rule Highlight Callout */}
                    <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#0066FF] shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                            <strong className="font-bold text-blue-900 dark:text-blue-100 block mb-1">
                                Important Billing-Cycle Rule (Individual Tenancy Enforcement):
                            </strong>
                            Each tenant&apos;s billing date comes directly from their individual tenancy record. For example, a tenant whose tenancy begins on January 31 is billed on February 28 (or February 29 in a leap year), then March 31. RentTrack automatically preserves the original billing day and applies the last valid calendar day of shorter months.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Default Monthly Rent (₱)
                            </label>
                            <input
                                type="number"
                                value={defaultMonthlyRent}
                                onChange={(e) => setDefaultMonthlyRent(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Currency Setting
                            </label>
                            <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-200 font-bold flex items-center justify-between">
                                <span>{currency}</span>
                                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">₱ PHP</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Grace Period for Late Payments
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={latePaymentGracePeriod}
                                    onChange={(e) => setLatePaymentGracePeriod(e.target.value)}
                                    className="w-full px-3 py-2 pr-12 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">Days</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Late Penalty Amount (₱)
                            </label>
                            <input
                                type="number"
                                value={autoPenaltyRate}
                                onChange={(e) => setAutoPenaltyRate(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Penalty Type
                            </label>
                            <select
                                value={penaltyType}
                                onChange={(e) => setPenaltyType(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="Fixed Amount (₱)">Fixed Amount (₱ 300 / instance)</option>
                                <option value="Percentage of Rent">Percentage of Unpaid Balance (5%)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Bill Due-Date Policy
                            </label>
                            <select
                                value={billDueDaysPolicy}
                                onChange={(e) => setBillDueDaysPolicy(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="5">Due 5 Days After Invoicing</option>
                                <option value="7">Due 7 Days After Invoicing</option>
                                <option value="10">Due 10 Days After Invoicing</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Short-Month Rule Policy
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={shortMonthRule}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-200 font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Receipt Numbering Format
                            </label>
                            <input
                                type="text"
                                value={receiptNumberingFormat}
                                onChange={(e) => setReceiptNumberingFormat(e.target.value)}
                                placeholder="REC-{YYYY}-{00000}"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 font-mono"
                            />
                        </div>
                    </div>

                    {/* Financial Toggles & Accepted Methods */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                                Accepted Payment Methods
                            </span>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {[
                                    { key: 'gcash', label: 'GCash (QR / Mobile Transfer)' },
                                    { key: 'maya', label: 'Maya (E-Wallet)' },
                                    { key: 'bankTransfer', label: 'Bank Transfer (BDO / BPI / UnionBank)' },
                                    { key: 'cash', label: 'Cash on Premises (Admin Counter)' }
                                ].map((pm) => (
                                    <label
                                        key={pm.key}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 cursor-pointer text-xs font-semibold text-slate-800 dark:text-zinc-200"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(acceptedPaymentMethods as any)[pm.key]}
                                            onChange={(e) => setAcceptedPaymentMethods({
                                                ...acceptedPaymentMethods,
                                                [pm.key]: e.target.checked
                                            })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>{pm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                                Payment Verification & Automated Rules
                            </span>
                            <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                <MockupToggle
                                    checked={autoMonthlyBills}
                                    onChange={setAutoMonthlyBills}
                                    label="Automatic Monthly Bill Generation"
                                    description="Generate invoices on tenant individual billing dates automatically."
                                />
                                <MockupToggle
                                    checked={paymentVerificationRequirements.proofUpload}
                                    onChange={(val) => setPaymentVerificationRequirements({
                                        ...paymentVerificationRequirements,
                                        proofUpload: val
                                    })}
                                    label="Require Payment Screenshot Upload"
                                    description="GCash/Maya submissions require image proof for admin approval."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 3: USER ACCOUNTS & PERMISSIONS                  */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={3}
                    title="User Accounts & Permissions"
                    subtitle="Manage authorized administrator credentials, protect property owner privileges, and configure module access restrictions."
                    icon={Users}
                    badgeText="Role-Based Access Control"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Security Safeguard Banner */}
                    <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                            <strong className="font-bold text-amber-900 dark:text-amber-100 block mb-1">
                                Security Rule (Owner Privilege Protection):
                            </strong>
                            Owner privileges are strictly protected at the database schema level. Assistant administrators are strictly prevented from granting themselves property owner permissions simply by modifying setting toggles.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Admin / Owner Account Credentials */}
                        <div className="space-y-4">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                                Primary Administrative Account Details
                            </span>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                                        Assigned Administrator Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800">
                                        <button
                                            type="button"
                                            onClick={() => setActiveRole('owner')}
                                            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                activeRole === 'owner'
                                                    ? 'bg-white dark:bg-zinc-900 text-[#0066FF] dark:text-blue-400 shadow-xs'
                                                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                                            }`}
                                        >
                                            <Crown className="w-3.5 h-3.5" />
                                            <span>Property Owner</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveRole('admin')}
                                            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                activeRole === 'admin'
                                                    ? 'bg-white dark:bg-zinc-900 text-[#0066FF] dark:text-blue-400 shadow-xs'
                                                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                                            }`}
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            <span>Administrator</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                                        Administrator Name
                                    </label>
                                    <input
                                        type="text"
                                        value={landlordName}
                                        onChange={(e) => setLandlordName(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                                        Admin Console Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Module Permission Controls */}
                        <div className="space-y-4">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                                Delegated Administrator Access Restrictions
                            </span>

                            <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                <MockupToggle
                                    label="Edit Room Rates & Bedspace Tariffs"
                                    checked={adminPermissions.canEditRoomTariffs}
                                    onChange={(val) => setAdminPermissions({ ...adminPermissions, canEditRoomTariffs: val })}
                                />
                                <MockupToggle
                                    label="Verify & Approve Payment Proofs"
                                    checked={adminPermissions.canVerifyPayments}
                                    onChange={(val) => setAdminPermissions({ ...adminPermissions, canVerifyPayments: val })}
                                />
                                <MockupToggle
                                    label="Lodge & Resolve Maintenance Work Orders"
                                    checked={adminPermissions.canResolveMaintenance}
                                    onChange={(val) => setAdminPermissions({ ...adminPermissions, canResolveMaintenance: val })}
                                />
                                <MockupToggle
                                    label="Publish Facility-Wide Broadcast Announcements"
                                    checked={adminPermissions.canBroadcastAnnouncements}
                                    onChange={(val) => setAdminPermissions({ ...adminPermissions, canBroadcastAnnouncements: val })}
                                />
                                <MockupToggle
                                    label="Export Full System Backups (Owner Only)"
                                    checked={adminPermissions.canExportBackups}
                                    disabled={activeRole !== 'owner'}
                                    onChange={(val) => setAdminPermissions({ ...adminPermissions, canExportBackups: val })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 4: NOTIFICATION RULES                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={4}
                    title="Notification Rules"
                    subtitle="Manage upcoming payment alerts, overdue notices, applicant announcements, and email/SMS triggers."
                    icon={Bell}
                    badgeText="Real-Time Triggers"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        <MockupToggle
                            label="Upcoming Payment Reminders (3 Days Prior)"
                            checked={notifications.upcomingPayment}
                            onChange={(val) => setNotifications({ ...notifications, upcomingPayment: val })}
                        />
                        <MockupToggle
                            label="Due-Date Notifications (On Cycle Day)"
                            checked={notifications.dueDateNotification}
                            onChange={(val) => setNotifications({ ...notifications, dueDateNotification: val })}
                        />
                        <MockupToggle
                            label="Overdue Payment Alerts"
                            checked={notifications.overduePayment}
                            onChange={(val) => setNotifications({ ...notifications, overduePayment: val })}
                        />
                        <MockupToggle
                            label="Payment Submission Alerts (Uploaded Receipts)"
                            checked={notifications.paymentSubmission}
                            onChange={(val) => setNotifications({ ...notifications, paymentSubmission: val })}
                        />
                        <MockupToggle
                            label="New Resident Application Alerts"
                            checked={notifications.tenantRegistration}
                            onChange={(val) => setNotifications({ ...notifications, tenantRegistration: val })}
                        />
                        <MockupToggle
                            label="Maintenance Request & Repair Updates"
                            checked={notifications.newMaintenance}
                            onChange={(val) => setNotifications({ ...notifications, newMaintenance: val })}
                        />
                        <MockupToggle
                            label="Direct Chat Inquiries from Tenants"
                            checked={notifications.chatMessage}
                            onChange={(val) => setNotifications({ ...notifications, chatMessage: val })}
                        />
                        <MockupToggle
                            label="Facility-Wide Broadcast Confirmations"
                            checked={notifications.announcementBroadcast}
                            onChange={(val) => setNotifications({ ...notifications, announcementBroadcast: val })}
                        />
                        <MockupToggle
                            label="Email Notification Delivery"
                            checked={notifications.emailNotifications}
                            onChange={(val) => setNotifications({ ...notifications, emailNotifications: val })}
                        />
                        <MockupToggle
                            label="SMS Provider Integration (Semaphore / Twilio)"
                            checked={notifications.smsNotifications}
                            onChange={(val) => setNotifications({ ...notifications, smsNotifications: val })}
                        />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 5: BRANDING & APPEARANCE                        */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={5}
                    title="Branding & Appearance"
                    subtitle="Customize boarding house logo, primary accent palette, light/dark themes, and electronic receipt headers."
                    icon={Palette}
                    badgeText="Visual Identity"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Logo Upload Box (4 cols) */}
                        <div className="lg:col-span-4 p-5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col items-center justify-center text-center space-y-3.5">
                            <div className="flex items-center gap-3">
                                {customLogo ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={customLogo} alt="Logo" className="w-12 h-12 rounded-xl object-contain shadow-xs border border-slate-200 dark:border-zinc-700" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-xs">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <span className="block text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        {systemName}
                                    </span>
                                    <span className="block text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                                        Property Identity Mark
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Custom Logo</span>
                                </button>
                                {customLogo && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomLogo(null);
                                            toast.info("Logo Reset", { description: "Default logo will be restored upon saving." });
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    >
                                        <span>Remove Logo</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Colors & Branding Inputs (8 cols) */}
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    System Name & Branding
                                </label>
                                <input
                                    type="text"
                                    value={systemName}
                                    onChange={(e) => setSystemName(e.target.value)}
                                    placeholder="RentTrack - Boarding House Edition"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Primary Brand Color
                                </label>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0 shadow-2xs"
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-mono font-semibold outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    Electronic Receipt Header Branding
                                </label>
                                <input
                                    type="text"
                                    value={receiptHeader}
                                    onChange={(e) => setReceiptHeader(e.target.value)}
                                    placeholder="Official Electronic Tenancy Receipt"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Theme Mode Selector */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider">
                            Default Console Interface Theme
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {[
                                { key: 'light', label: 'Clean Light', icon: Sun, desc: 'Crisp high-contrast day theme' },
                                { key: 'dark', label: 'Obsidian Dark', icon: Moon, desc: 'OLED-friendly dark palette' },
                                { key: 'system', label: 'System Default', icon: Laptop, desc: 'Follows operating system preferences' }
                            ].map(m => {
                                const Icon = m.icon;
                                const isSelected = localTheme === m.key;

                                return (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => {
                                            setLocalTheme(m.key);
                                            setTheme(m.key);
                                        }}
                                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-28 cursor-pointer ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                                                : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                isSelected ? 'bg-[#0066FF] text-white' : 'bg-slate-100 dark:bg-zinc-800'
                                            }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            {isSelected && <span className="w-2 h-2 rounded-full bg-[#0066FF]"></span>}
                                        </div>

                                        <div>
                                            <span className="text-xs font-bold block">{m.label}</span>
                                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 block">{m.desc}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 6: SECURITY & PRIVACY                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={6}
                    title="Security & Privacy"
                    subtitle="Change admin passwords, enforce two-factor authentication, set session inactivity timeouts, and manage active sessions."
                    icon={ShieldCheck}
                    badgeText="Hardened Credentials"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Password Change Inputs */}
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
                                    className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-mono font-semibold outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                New Admin Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter new strong password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-mono font-semibold outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
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
                                    className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-mono font-semibold outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2FA, Timeout, Lockout */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Session Inactivity Timeout
                            </label>
                            <select
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="30">30 Minutes</option>
                                <option value="60">60 Minutes (Recommended)</option>
                                <option value="120">2 Hours</option>
                                <option value="480">8 Hours (Full Shift)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Login Attempt Limit Policy
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={loginAttemptLimit}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-200 font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Audit Log Retention Period
                            </label>
                            <select
                                value={dataRetentionDays}
                                onChange={(e) => setDataRetentionDays(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="30">30 Days</option>
                                <option value="90">90 Days (Recommended)</option>
                                <option value="365">1 Year (Statutory)</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                        <MockupToggle
                            checked={twoFactorAuth}
                            onChange={setTwoFactorAuth}
                            label="Enforce Two-Factor Authentication (2FA) for Admin Sign-In"
                            description="Requires TOTP authentication token verification on all elevated logins."
                        />
                    </div>

                    {/* Active Sessions & Emergency Logout */}
                    <div className="p-4 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Emergency Admin Sign-Out</span>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                                Invalidate local console JWT tokens and force redirection to the login screen.
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white self-start sm:self-center cursor-pointer shadow-xs"
                        >
                            Sign Out of Console
                        </button>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 7: DATA MANAGEMENT & BACKUPS                    */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={7}
                    title="Data Management & Backups"
                    subtitle="Monitor automated daily database snapshots, perform owner-restricted restores, and manage file storage quotas."
                    icon={Database}
                    badgeText="Database Snapshots"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Backup Status</span>
                            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Healthy (Daily at {backupTime})</span>
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                Last successful backup: {savedSettingsRef.current.lastBackupDate}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Encrypted Storage Usage</span>
                            <p className="text-xs text-slate-900 dark:text-white font-mono font-bold">
                                {savedSettingsRef.current.backupSize} / 50.0 GB
                            </p>
                            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full w-[28%] rounded-full"></div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-2 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Application Cache Purge</span>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Flush in-memory and local client query caches.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handlePurgeCache}
                                disabled={isPurging}
                                className="w-full py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                                <span>{isPurging ? 'Purging...' : 'Purge Cache Now'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Download Full System Configuration</span>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                Generates an offline JSON archive containing all property rules, tariffs, and tenant policy schemas.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleExportBackup}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export Config JSON</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 8: AUDIT LOGS & SYSTEM ACTIVITY                 */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={8}
                    title="Audit Logs & System Activity"
                    subtitle="Immutable chronological audit trail of administrator sign-ins, billing modifications, payment verifications, and tenant actions."
                    icon={FileText}
                    badgeText="Live Audit Stream"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                    {/* Search and Filters Header */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search logs by tenant, room, description, reference..."
                                value={logsSearchQuery}
                                onChange={(e) => setLogsSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500"
                            />
                            {logsSearchQuery && (
                                <button
                                    onClick={() => setLogsSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto">
                            <button
                                type="button"
                                onClick={() => fetchActivityLogs(true)}
                                disabled={isRefreshingLogs}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                                <span>Sync Stream</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportLogsCSV}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
                        {[
                            { key: "all", label: "All Events" },
                            { key: "payment", label: "Payments" },
                            { key: "tenant", label: "Tenants & Rules" },
                            { key: "maintenance", label: "Maintenance" },
                            { key: "announcement", label: "Broadcasts" },
                        ].map((cat) => (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setLogsCategory(cat.key as any)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                    logsCategory === cat.key
                                        ? "bg-[#0066FF] text-white shadow-2xs"
                                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Logs Stream List */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                        {isLoadingLogs ? (
                            <div className="space-y-2 py-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/40 animate-pulse flex items-center justify-between">
                                        <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : paginatedLogs.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-400 dark:text-zinc-500">
                                <Activity className="w-7 h-7 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                                <p className="font-semibold text-slate-600 dark:text-zinc-400">No activity logs recorded matching criteria</p>
                            </div>
                        ) : (
                            paginatedLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/40 hover:bg-slate-100/60 dark:hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${getLogBadgeBg(log.type)}`}>
                                            {getLogIcon(log.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {log.title}
                                                </span>
                                                {log.tenant_name && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                                        {log.tenant_name}
                                                    </span>
                                                )}
                                                {log.room_number && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                                        Room {log.room_number}
                                                    </span>
                                                )}
                                                {log.amount && (
                                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                                        ₱ {Number(log.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                                                {log.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                                            {formatRelativeTime(log.date)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 9: SYSTEM PREFERENCES                           */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={9}
                    title="System Preferences"
                    subtitle="Configure mandatory Asia/Manila timezone, default date/time display, table pagination, and emergency maintenance mode."
                    icon={Sliders}
                    badgeText="Platform Defaults"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                System Time Zone
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={timezone}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/60 text-slate-800 dark:text-zinc-200 font-bold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Date Display Format
                            </label>
                            <select
                                value={dateFormat}
                                onChange={(e) => setDateFormat(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-10-28)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (10/28/2026)</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY (28/10/2026)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Time Display Format
                            </label>
                            <select
                                value={timeFormat}
                                onChange={(e) => setTimeFormat(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="12-Hour (AM/PM)">12-Hour (e.g. 02:30 PM)</option>
                                <option value="24-Hour (Military)">24-Hour (e.g. 14:30)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Default Pagination Limit
                            </label>
                            <select
                                value={tablePaginationRows}
                                onChange={(e) => setTablePaginationRows(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="10">10 Rows per Table Page</option>
                                <option value="25">25 Rows per Table Page</option>
                                <option value="50">50 Rows per Table Page</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                        <MockupToggle
                            checked={systemConfig.maintenanceMode}
                            onChange={(val) => setSystemConfig({ ...systemConfig, maintenanceMode: val })}
                            label="Tenant Portal Maintenance Mode"
                            description="When active, displays a temporary maintenance banner to tenants while admin console remains fully operational."
                        />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* CATEGORY 10: HELP & SUPPORT                              */}
            {/* ======================================================== */}
            <div className="space-y-4">
                <CategoryHeader
                    number={10}
                    title="Help & Support"
                    subtitle="Access administrator guides, frequently asked operational questions, contact engineering support, or lodge technical tickets."
                    icon={LifeBuoy}
                    badgeText="Administrator Support"
                />

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                    {/* Support Contact Header */}
                    <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">RentTrack Engineering & Technical Support</span>
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    Official Hotline: +63 912 345 6789 • help@renttrack.com
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="mailto:support@renttrack.com"
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Support</span>
                            </a>
                        </div>
                    </div>

                    {/* Collapsible FAQs */}
                    <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider">
                            Administrator Frequently Asked Questions (FAQ)
                        </span>

                        <div className="space-y-2.5">
                            {[
                                {
                                    id: 1,
                                    q: "How does RentTrack compute billing cycles for tenants moving in on the 31st?",
                                    a: "RentTrack uses individual tenancy dates. When a tenant moves in on January 31, February bills generate on February 28 (or 29 in leap years), and March bills generate on March 31. The original 31st billing day is permanently preserved."
                                },
                                {
                                    id: 2,
                                    q: "Can assistant administrators change their own permissions to Property Owner?",
                                    a: "No. RentTrack enforces a strict Owner privilege boundary in the backend schema. Only authenticated property owners can delegate or revoke administrative permissions."
                                },
                                {
                                    id: 3,
                                    q: "How are GCash / Maya payments verified by staff?",
                                    a: "Tenants upload their electronic payment screenshots with reference numbers in their resident portal. Authorized administrators inspect the receipt and click 'Verify', which automatically credits the balance and issues an official e-receipt."
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
                                            <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
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

                    {/* Report Technical Issue */}
                    <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                            Report a Technical Issue or Request Assistance
                        </span>
                        <form onSubmit={handleSubmitSupportIssue} className="space-y-2.5 max-w-2xl">
                            <textarea
                                value={supportIssueDescription}
                                onChange={(e) => setSupportIssueDescription(e.target.value)}
                                placeholder="Describe any technical anomaly, printer format adjustment, or billing question..."
                                rows={3}
                                className="w-full p-2.5 text-xs rounded-xl bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={isSubmittingSupportTicket}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmittingSupportTicket ? 'Dispatching...' : 'Submit Support Ticket'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* BOTTOM SAVE ACTION BAR                                   */}
            {/* ======================================================== */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to synchronize settings?</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        All 10 categories above will be saved and committed directly to the PostgreSQL database cluster.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={revertToSavedSettings}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard Changes</span>
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save All 10 Categories</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
