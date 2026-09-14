"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search, Plus, ChevronDown, ChevronLeft, Edit2, Trash2, Banknote, Users, Sparkles, Ghost, Info, X, Building } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface Tenant {
    id: number;
    name: string;
    phone: string;
    date_moved_in: string;
    balance: number;
}

interface Room {
    id: number;
    room_number: string;
    type: string;
    price: string;
    floor: string | null;
    description: string | null;
    capacity: number;
    current_occupants: number;
    available_slots: number;
    status: string;
    occupants: Tenant[];
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Target items
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [floorFilter] = useState('All');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        room_number: '',
        type: 'Single',
        capacity: 1,
        price: '',
        floor: '',
        description: '',
        status: 'Available'
    });

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/rooms');
            setRooms(data);
            
            if (selectedRoom) {
                const updatedRoom = data.find((r: Room) => r.id === selectedRoom.id);
                if (updatedRoom) {
                    setSelectedRoom(updatedRoom);
                } else {
                    setSelectedRoom(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
            setError("Failed to load rooms.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleOpenModal = (room?: Room) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                room_number: room.room_number,
                type: room.type || 'Single',
                capacity: room.capacity,
                price: room.price,
                floor: room.floor || '',
                description: room.description || '',
                status: room.status || 'Available'
            });
        } else {
            setEditingRoom(null);
            setFormData({
                room_number: '',
                type: 'Single',
                capacity: 1,
                price: '',
                floor: '',
                description: '',
                status: 'Available' 
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            if (editingRoom) {
                await api.put(`/admin/rooms/${editingRoom.id}`, formData);
            } else {
                await api.post('/admin/rooms', formData);
            }
            setIsModalOpen(false);
            fetchRooms();
        } catch (err: any) {
            console.error("Operation failed:", err);
            setError(err.response?.data?.message || "Operation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this room? Action cannot be undone.")) return;
        setIsDeleting(id);
        setError('');
        try {
            await api.delete(`/admin/rooms/${id}`);
            if (selectedRoom?.id === id) {
                setSelectedRoom(null);
            }
            fetchRooms();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete room. Please check active residents.");
        } finally {
            setIsDeleting(null);
        }
    };



    const filteredRooms = rooms.filter(r => 
        (statusFilter === 'All' || r.status.toLowerCase() === statusFilter.toLowerCase()) &&
        (typeFilter === 'All' || r.type === typeFilter) &&
        (floorFilter === 'All' || r.floor === floorFilter) &&
        (r.room_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getRoomStatusStyles = (status: string) => {
        switch (status) {
            case 'Available': return {
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/20',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            };
            case 'Partial': return {
                bg: 'bg-indigo-50 dark:bg-indigo-500/10',
                text: 'text-indigo-700 dark:text-indigo-400',
                border: 'border-indigo-200 dark:border-indigo-500/20',
                glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]',
                dot: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
            };
            case 'Occupied': return {
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/20',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
            };
            case 'Maintenance': return {
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/20',
                glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            };
            default: return {
                bg: 'bg-slate-50 dark:bg-zinc-500/10',
                text: 'text-slate-600 dark:text-zinc-400',
                border: 'border-slate-200 dark:border-zinc-500/20',
                glow: '',
                dot: 'bg-slate-500'
            };
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-6 relative flex flex-col h-[calc(100vh-100px)] min-h-[700px]">
            {/* Ambient Background */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/5 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen dark:mix-blend-lighten"></div>

            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10 mb-6 shrink-0">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Properties</h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-[0.2em] mt-2">Manage & Monitor Availability</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()} 
                    className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(79,70,229,0.4)] text-xs flex items-center justify-center gap-3 group w-full sm:w-auto"
                >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                        <Plus className="w-4 h-4" strokeWidth={3} />
                    </div>
                    Add Property
                </button>
            </motion.div>

            {error && (
                <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="mb-6 shrink-0 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-sm flex items-center gap-3 relative z-10 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                    {error}
                </motion.div>
            )}

            {/* Split View Container */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden relative z-10">
                
                {/* Left Panel: Master List */}
                <motion.div 
                    initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.1}} 
                    className={`w-full ${selectedRoom ? 'hidden lg:flex' : 'flex'} lg:w-[380px] xl:w-[420px] shrink-0 flex-col gap-6 h-full`}
                >
                    {/* Filters Compact */}
                    <div className="flex flex-col gap-3 bg-white dark:bg-black backdrop-blur-2xl p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl shrink-0">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Search room..." 
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-zinc-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer">
                                <option value="All">All Statuses</option>
                                <option value="Available">Available</option>
                                <option value="Partial">Partial</option>
                                <option value="Occupied">Occupied</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer">
                                <option value="All">All Types</option>
                                <option value="Single">Single</option>
                                <option value="Double">Double</option>
                                <option value="Bedspace">Bedspace</option>
                            </select>
                        </div>
                    </div>

                    {/* Property List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar rounded-3xl pr-2 pb-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 dark:border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="text-center py-12 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-slate-200 dark:border-zinc-800">
                                <p className="text-sm font-bold text-slate-500 dark:text-zinc-500">No properties found.</p>
                            </div>
                        ) : (
                            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-3">
                                {filteredRooms.map((room) => {
                                    const style = getRoomStatusStyles(room.status);
                                    const isSelected = selectedRoom?.id === room.id;
                                    
                                    return (
                                        <motion.div 
                                            key={room.id} 
                                            variants={itemVariants}
                                            onClick={() => setSelectedRoom(room)}
                                            className={`relative group rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_10px_30px_rgba(79,70,229,0.3)] border-transparent scale-[1.02]' : 'bg-white dark:bg-[#0a0a0a] backdrop-blur-xl border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-indigo-500/50 hover:shadow-xl dark:hover:shadow-indigo-500/10'}`}
                                        >
                                            {/* Dynamic Highlight Glow for selected */}
                                            {isSelected && <motion.div layoutId="activeRoom" className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl -z-10 blur-md opacity-50" transition={{ duration: 0.3 }}></motion.div>}

                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border transition-colors ${isSelected ? 'bg-white/20 text-white border-white/20' : `${style.bg} ${style.text} ${style.border}`}`}>
                                                        {room.room_number}
                                                    </div>
                                                    <div>
                                                        <p className={`font-black text-base transition-colors ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{room.type}</p>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 transition-colors ${isSelected ? 'text-white/70' : 'text-emerald-500 dark:text-emerald-400'}`}>₱{Number(room.price).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${isSelected ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : style.dot}`}></div>
                                            </div>

                                            <div className="mt-4 flex justify-between items-center">
                                                <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-zinc-500'}`}>{room.current_occupants} / {room.capacity} Occupied</p>
                                                
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {room.occupants.slice(0, 3).map((tenant, idx) => (
                                                        <div key={idx} className={`inline-block h-6 w-6 rounded-full ring-2 flex items-center justify-center text-[8px] font-black shadow-sm transition-colors ${isSelected ? 'ring-blue-600 bg-white text-blue-600' : 'ring-white dark:ring-[#0a0a0a] bg-gradient-to-br from-indigo-400 to-purple-500 text-white'}`}>
                                                            {tenant.name.charAt(0)}
                                                        </div>
                                                    ))}
                                                    {room.occupants.length > 3 && (
                                                        <div className={`inline-block h-6 w-6 rounded-full ring-2 flex items-center justify-center text-[8px] font-black shadow-sm transition-colors ${isSelected ? 'ring-blue-600 bg-white/20 text-white' : 'ring-white dark:ring-[#0a0a0a] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-600'}`}>
                                                            +{room.occupants.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Right Panel: Detail Inspector */}
                <motion.div 
                    initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay: 0.2}} 
                    className={`w-full ${selectedRoom ? 'flex absolute inset-0 z-20 lg:static lg:z-auto' : 'hidden lg:flex'} flex-1 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl overflow-hidden flex-col`}
                >
                    <AnimatePresence mode="wait">
                        {selectedRoom ? (
                            <motion.div 
                                key={selectedRoom.id}
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Header Actions */}
                                <div className="p-6 md:p-8 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSelectedRoom(null)} className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 dark:border-zinc-700 shadow-sm">
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const style = getRoomStatusStyles(selectedRoom.status);
                                                return (
                                                    <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border} ${style.text}`}>
                                                        <div className={`w-2 h-2 rounded-full animate-pulse ${style.dot}`}></div>
                                                        {selectedRoom.status}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(selectedRoom)} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-500/20">
                                            <Edit2 className="w-4 h-4 hidden sm:block" strokeWidth={2} />
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(selectedRoom.id)} disabled={selectedRoom.current_occupants > 0 || isDeleting === selectedRoom.id} className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center gap-2 border border-rose-200 dark:border-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Trash2 className="w-4 h-4 hidden sm:block" strokeWidth={2} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Detail Content Scrollable */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 w-full">
                                    <div className="flex items-center gap-6 mb-10">
                                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-4xl flex items-center justify-center shadow-xl shadow-blue-500/20 shrink-0">
                                            {selectedRoom.room_number}
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{selectedRoom.type}</h2>
                                            <p className="text-sm font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Floor {selectedRoom.floor || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:gap-6 mb-10">
                                        <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 text-xl shadow-sm border border-emerald-200 dark:border-emerald-500/20"><Banknote className="w-5 h-5" /></div>
                                            <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Monthly Rent</p>
                                            <p className="text-2xl xl:text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">₱{Number(selectedRoom.price).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 text-xl shadow-sm border border-blue-200 dark:border-blue-500/20"><Users className="w-5 h-5" /></div>
                                            <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Capacity</p>
                                            <p className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedRoom.capacity} <span className="text-sm text-slate-500 dark:text-zinc-500">Max</span></p>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden group">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-4 text-xl"><Sparkles className="w-5 h-5" /></div>
                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Available Slots</p>
                                            <p className="text-2xl xl:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{selectedRoom.available_slots}</p>
                                        </div>
                                    </div>

                                    {/* Occupancy Progress Bar */}
                                    <div className="mb-10 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-inner">
                                        <div className="flex justify-between items-end mb-3">
                                            <span className="text-xs font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Occupancy Progress</span>
                                            <span className="font-black text-slate-900 dark:text-white">{selectedRoom.current_occupants} / {selectedRoom.capacity}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(selectedRoom.current_occupants / Math.max(selectedRoom.capacity, 1)) * 100}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${selectedRoom.current_occupants === selectedRoom.capacity ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'}`}
                                            ></motion.div>
                                        </div>
                                    </div>
                                    
                                    {selectedRoom.description && (
                                        <div className="mb-10">
                                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center"><Info className="w-3.5 h-3.5" strokeWidth={2.5} /></span>
                                                Description
                                            </h3>
                                            <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner">
                                                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">{selectedRoom.description}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Users className="w-3.5 h-3.5" strokeWidth={2.5} /></span>
                                                Current Residents
                                            </h3>
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-zinc-700">{selectedRoom.current_occupants} Total</span>
                                        </div>
                                        
                                        {selectedRoom.occupants.length === 0 ? (
                                            <div className="text-center py-12 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-inner">
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 flex items-center justify-center text-2xl mx-auto mb-4 grayscale opacity-50"><Ghost className="w-8 h-8" /></div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Room is Empty</p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">No active residents</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedRoom.occupants.map(tenant => (
                                                    <div key={tenant.id} className="flex items-center justify-between p-5 border border-slate-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-black shadow-md hover:shadow-lg transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-110 transition-transform">
                                                                {tenant.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 dark:text-white text-sm">{tenant.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-widest">{tenant.phone}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-block px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border shadow-sm ${
                                                                tenant.balance > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                            }`}>
                                                                {tenant.balance > 0 ? `Owes ₱${tenant.balance}` : 'Clear'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="empty-state"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col items-center justify-center p-10 text-center"
                            >
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-50 dark:bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border border-slate-200 dark:border-zinc-800">
                                    <Building className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-zinc-700" strokeWidth={2} />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">Select a Property</h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium max-w-sm">Choose a property from the list to view its complete details, occupancy status, and residents.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Modals with Framer Motion */}
            <AnimatePresence>
            {isModalOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-[#0a0a0a]/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{editingRoom ? 'Edit Property' : 'New Property'}</h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Configure Room Details</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X className="w-6 h-6" strokeWidth={2.5} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Room Number <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="e.g. 101" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Type <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all shadow-inner cursor-pointer">
                                            <option value="Single">Single Room</option>
                                            <option value="Double">Double Room</option>
                                            <option value="Bedspace">Bedspace</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-slate-500">
                                            <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Max Capacity <span className="text-rose-500">*</span></label>
                                    <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 1})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Monthly Price (₱) <span className="text-rose-500">*</span></label>
                                    <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Floor (Optional)</label>
                                    <input type="text" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="e.g. 1st Floor" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Status Override</label>
                                    <div className="relative">
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all shadow-inner cursor-pointer">
                                            <option value="Available">Available</option>
                                            <option value="Partial">Partial</option>
                                            <option value="Occupied">Occupied</option>
                                            <option value="Maintenance">Maintenance</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-slate-500">
                                            <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Description (Optional)</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32 custom-scrollbar transition-all shadow-inner" placeholder="Room details, amenities, etc."></textarea>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800/80">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-4 font-black text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl transition-all uppercase tracking-widest text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-70">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (editingRoom ? 'Save Changes' : 'Create Room')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}