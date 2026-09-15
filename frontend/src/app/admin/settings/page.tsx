"use client";
import { useState, useEffect } from 'react';
import { Shield, Bell, CreditCard, Wrench, Moon, Info, LogOut, Save, Smartphone, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function AdminSettingsPage() {
    const router = useRouter();
    // Form states
    const [adminEmail, setAdminEmail] = useState('admin@renttrack.com');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Notification states
    const [notifications, setNotifications] = useState({
        tenantRegistration: true,
        paymentSubmission: true,
        paymentVerification: true,
        overduePayment: true,
        newMaintenance: true,
        maintenanceUpdate: false,
        chatMessage: true,
        systemNotifications: true,
    });

    // Billing states
    const [billing, setBilling] = useState({
        defaultDueDate: '5',
        autoMonthlyBilling: true,
        latePaymentFee: '500',
        defaultWater: '150',
        defaultElectricity: '0',
        defaultOther: '0',
        currency: 'PHP (₱)'
    });

    const { theme, setTheme } = useTheme();
    const [localTheme, setLocalTheme] = useState('system');

    useEffect(() => {
        if (theme) {
            setLocalTheme(theme);
        }
    }, [theme]);

    const handleSaveChanges = () => {
        setTheme(localTheme);
        // Additional save logic can go here
        alert("Settings saved successfully!");
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

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">Manage platform preferences, security, and defaults.</p>
                </div>
                <button onClick={handleSaveChanges} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                    <Save className="w-4 h-4" />
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Account & Security */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Account & Security</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Admin Email</label>
                                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/50">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Change Password</h3>
                                <div className="space-y-3">
                                    <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                                    
                                    <div>
                                        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                                        <div className="flex items-center gap-1 mt-2 px-1">
                                            <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                            <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                            <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                        </div>
                                    </div>
                                    <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Notification Settings</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Enable All</span>
                                <div className="w-9 h-5 rounded-full bg-emerald-500 relative cursor-pointer">
                                    <div className="absolute top-0.5 left-[18px] w-4 h-4 bg-white rounded-full transition-all"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {[
                                { key: 'tenantRegistration', label: 'New tenant registration notifications' },
                                { key: 'paymentSubmission', label: 'Payment submission notifications' },
                                { key: 'paymentVerification', label: 'Payment verification notifications' },
                                { key: 'overduePayment', label: 'Overdue payment notifications' },
                                { key: 'newMaintenance', label: 'New maintenance request notifications' },
                                { key: 'maintenanceUpdate', label: 'Maintenance update notifications' },
                                { key: 'chatMessage', label: 'New chat message notifications' },
                                { key: 'systemNotifications', label: 'System notifications' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-zinc-800/50 last:border-0">
                                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{item.label}</span>
                                    <div 
                                        onClick={() => setNotifications({...notifications, [item.key]: !(notifications as any)[item.key]})}
                                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                        (notifications as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-700'
                                    }`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                                            (notifications as any)[item.key] ? 'left-[18px]' : 'left-0.5'
                                        }`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Billing Settings */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Billing Defaults</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Currency</label>
                                <select value={billing.currency} onChange={(e) => setBilling({...billing, currency: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white">
                                    <option>Philippine Peso (₱)</option>
                                    <option>US Dollar ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Default Due Date</label>
                                <select value={billing.defaultDueDate} onChange={(e) => setBilling({...billing, defaultDueDate: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white">
                                    <option value="1">1st of the month</option>
                                    <option value="5">5th of the month</option>
                                    <option value="15">15th of the month</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 pt-2 pb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Automatic monthly billing generation</span>
                                    <div 
                                        onClick={() => setBilling({...billing, autoMonthlyBilling: !billing.autoMonthlyBilling})}
                                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                        billing.autoMonthlyBilling ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-700'
                                    }`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                                            billing.autoMonthlyBilling ? 'left-[18px]' : 'left-0.5'
                                        }`}></div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Late Payment Fee</label>
                                <input type="number" value={billing.latePaymentFee} onChange={(e) => setBilling({...billing, latePaymentFee: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Default Water Charge</label>
                                <input type="number" value={billing.defaultWater} onChange={(e) => setBilling({...billing, defaultWater: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Default Electricity Charge</label>
                                <input type="number" value={billing.defaultElectricity} onChange={(e) => setBilling({...billing, defaultElectricity: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Default Other Fees</label>
                                <input type="number" value={billing.defaultOther} onChange={(e) => setBilling({...billing, defaultOther: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Columns */}
                <div className="space-y-6">
                    {/* Appearance */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <Moon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Theme</h2>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {['light', 'dark', 'system'].map((t) => (
                                <button 
                                    key={t}
                                    onClick={() => setLocalTheme(t)}
                                    className={`py-2 px-1 text-xs font-bold capitalize rounded-lg border transition-all ${
                                        localTheme === t 
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-white dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Maintenance Settings */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <Wrench className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Maintenance</h2>
                        </div>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-slate-700 dark:text-zinc-300">
                                Categories <ChevronRight className="w-4 h-4 opacity-50" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-slate-700 dark:text-zinc-300">
                                Priority Levels <ChevronRight className="w-4 h-4 opacity-50" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-semibold text-slate-700 dark:text-zinc-300">
                                Status Options <ChevronRight className="w-4 h-4 opacity-50" />
                            </button>
                        </div>
                    </div>

                    {/* System Information */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">System Info</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs font-bold text-slate-500 dark:text-zinc-500 mb-1">System Name</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">StayTrack</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-slate-500 dark:text-zinc-500 mb-1">Version</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">v2.4.1 (Stable)</span>
                            </div>
                            <div className="pt-3 flex flex-col gap-2">
                                <a href="/terms" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Terms and Conditions</a>
                                <a href="/privacy" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</a>
                                <a href="#" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Help / Support</a>
                                <a href="#" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">About StayTrack</a>
                            </div>
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Account Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-white text-sm font-bold transition-colors">
                                <Smartphone className="w-4 h-4 opacity-50" />
                                Logout from all devices
                            </button>
                            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold transition-colors">
                                <LogOut className="w-4 h-4 opacity-70" />
                                Logout
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
