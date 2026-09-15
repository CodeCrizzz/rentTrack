"use client";
import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Edit3, Save, Camera } from 'lucide-react';

export default function AdminProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState({
        name: 'Admin',
        email: 'admin@renttrack.com',
        phone: '+63 912 345 6789',
        address: '123 RentTrack HQ, Manila, Philippines',
        avatar: ''
    });
    
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setProfile(prev => ({
                ...prev,
                name: user.name || prev.name,
                email: user.email || prev.email,
                phone: user.phone || prev.phone,
                address: user.address || prev.address
            }));
        }
    }, []);

    const [editForm, setEditForm] = useState(profile);

    const handleSave = () => {
        setProfile(editForm);
        setIsEditing(false);
        // Normally this would be an API call to save to backend
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            localStorage.setItem('user', JSON.stringify({ ...user, ...editForm }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">My Profile</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">Manage your personal information and contact details.</p>
                </div>
                {!isEditing ? (
                    <button onClick={() => {setEditForm(profile); setIsEditing(true);}} className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 dark:bg-[#0a0a0a] dark:text-white dark:border dark:border-zinc-800 dark:hover:bg-zinc-900 text-sm font-bold rounded-xl shadow-sm transition-all border border-slate-200">
                        <Edit3 className="w-4 h-4" />
                        Edit Profile
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 text-sm font-bold rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 dark:from-emerald-500/10 dark:to-cyan-500/10 z-0"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 mt-12 mb-8">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-[#0a0a0a] bg-slate-100 dark:bg-zinc-800 shadow-md flex-shrink-0 relative overflow-hidden group">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}&backgroundColor=059669`} alt="Admin Avatar" className="w-full h-full object-cover" />
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{profile.name}</h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-1 uppercase tracking-widest">Master Admin</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                                <User className="w-4 h-4" /> Full Name
                            </label>
                            {isEditing ? (
                                <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            ) : (
                                <p className="text-sm font-bold text-slate-800 dark:text-white px-1">{profile.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                                <Mail className="w-4 h-4" /> Email Address
                            </label>
                            {isEditing ? (
                                <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            ) : (
                                <p className="text-sm font-bold text-slate-800 dark:text-white px-1">{profile.email}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                                <Phone className="w-4 h-4" /> Contact Number
                            </label>
                            {isEditing ? (
                                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full h-11 px-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white" />
                            ) : (
                                <p className="text-sm font-bold text-slate-800 dark:text-white px-1">{profile.phone}</p>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                                <MapPin className="w-4 h-4" /> Address
                            </label>
                            {isEditing ? (
                                <textarea value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full h-24 p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white resize-none" />
                            ) : (
                                <p className="text-sm font-bold text-slate-800 dark:text-white px-1 whitespace-pre-wrap">{profile.address}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
