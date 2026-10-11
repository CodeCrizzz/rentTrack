"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export default function TenantRooms() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [assignedRoomData, setAssignedRoomData] = useState<any>(null);
    const [isAssigned, setIsAssigned] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const fetchRooms = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/tenant/rooms');
            if (data.isAssigned) {
                setIsAssigned(true);
                setAssignedRoomData(data);
            } else {
                setIsAssigned(false);
                setRooms(data.rooms);
            }
        } catch (error) {
            console.error("Error fetching rooms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleChooseRoom = async () => {
        if (!selectedRoom) return;
        setIsSubmitting(true);
        setErrorMsg("");
        
        try {
            const { data } = await api.post('/tenant/rooms/choose', { room_id: selectedRoom.id });
            setSuccessMsg(data.message);
            // Re-fetch to transition to assigned view
            await fetchRooms();
            
            setTimeout(() => {
                setSelectedRoom(null);
                setSuccessMsg("");
            }, 2500);

        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Failed to select room");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRooms = rooms.filter(r => 
        r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.5rem)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">Loading room information...</p>
                </div>
            </div>
        );
    }

    if (isAssigned && assignedRoomData) {
        const { room, roommates, maintenance_history = [] } = assignedRoomData;
        
        // Include all occupants, highlighting the current user
        const actualRoommates = roommates || [];
        
        // Correct status logic for assigned room
        const roomStatus = isAssigned ? 'Occupied' : (room.status === 'Available' ? 'Available' : room.status);

        return (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden">
                
                {/* Page Header */}
                <motion.div variants={itemVariants} className="shrink-0 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Room {room.room_number}</h1>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                    roomStatus === 'Occupied' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                                    roomStatus === 'Available' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                    {roomStatus}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">View your room details, rental information, and roommates.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Main scrollable content */}
                <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden pb-4 space-y-6">
                    
                    {/* Summary Cards */}
                    <motion.div variants={itemVariants} className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Monthly Rent */}
                        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Monthly Rent</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">₱{Number(room.price).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Occupancy */}
                        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Occupancy</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {room.current_occupants} <span className="text-base font-medium text-slate-400 dark:text-zinc-500">of {room.capacity}</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Main Content Area: Room Info + Maintenance (Col Span 2) */}
                        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                            
                            {/* Room Information */}
                            <motion.div variants={itemVariants} className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/60">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Room Information</h2>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed">
                                        {room.description || 'Not specified'}
                                    </p>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Room Type</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{room.type || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Floor Level</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{room.floor || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Maximum Capacity</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{room.capacity ? `${room.capacity} Occupants` : 'Not specified'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Maintenance */}
                            <motion.div variants={itemVariants} className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Maintenance log</h2>
                                </div>
                                <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                                    {maintenance_history && maintenance_history.length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                            {maintenance_history.map((req: any) => (
                                                <div key={req.id} className="p-4 sm:px-6 flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{req.title}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                                                            Submitted on {new Date(req.created_at).toLocaleDateString()}
                                                        </p>
                                                        <button 
                                                            onClick={() => setSelectedMaintenance(req)}
                                                            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                        >
                                                            View Details
                                                        </button>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        req.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        req.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-6 h-6 text-slate-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No maintenance requests yet</h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 max-w-[250px]">Need something fixed? Submit a maintenance request through the chat.</p>
                                            <a href="/tenant/chat" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors">
                                                Go to Chat
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Supporting Column: Roommates */}
                        <div className="lg:col-span-1 min-h-0">
                            <motion.div variants={itemVariants} className="h-full bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/60 shrink-0">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Roommates</h2>
                                </div>
                                <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                                    {actualRoommates.length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                            {actualRoommates.map((mate: any) => (
                                                <div key={mate.id} className={`p-4 sm:px-6 flex items-center gap-4 ${mate.is_me ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : ''}`}>
                                                    <div className={`w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 ${mate.is_me ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-950' : ''}`}>
                                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mate.name)}&background=random&size=40`} alt={mate.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{mate.name}</h4>
                                                            {mate.is_me && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 uppercase tracking-widest">You</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                                            Moved in: {mate.date_moved_in ? new Date(mate.date_moved_in).toLocaleDateString() : 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-6 h-6 text-slate-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No roommates</h3>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-[200px]">You currently have the room to yourself.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                    </div>
                </div>

                {/* Maintenance Modal */}
                <AnimatePresence>
                    {selectedMaintenance && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
                                onClick={() => setSelectedMaintenance(null)}
                            />
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0, scale: 0.95 }} 
                                    className="w-full max-w-lg bg-card rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
                                >
                                    <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            Maintenance Details
                                        </h2>
                                        <button onClick={() => setSelectedMaintenance(null)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedMaintenance.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                                                    Submitted on {new Date(selectedMaintenance.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider shrink-0 ${
                                                selectedMaintenance.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                selectedMaintenance.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                                'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                            }`}>
                                                {selectedMaintenance.status}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Category</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedMaintenance.category || 'Not specified'}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Priority</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedMaintenance.priority || 'Not specified'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-2">Description</p>
                                            <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                    {selectedMaintenance.description || 'No description provided.'}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedMaintenance.attachment_url && (
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-2">Attached Image</p>
                                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                                                    <img 
                                                        src={selectedMaintenance.attachment_url.startsWith('http') ? selectedMaintenance.attachment_url : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${selectedMaintenance.attachment_url}`} 
                                                        alt="Maintenance Attachment" 
                                                        className="w-full h-auto object-cover max-h-64"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end">
                                        <button 
                                            onClick={() => setSelectedMaintenance(null)}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6 shrink-0">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Available Rooms
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Browse and select an available room to move in.</p>
            </motion.div>

            {/* Toolbar */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
                <div className="relative flex-1 max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input 
                        type="text" 
                        placeholder="Search by room number or type..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full h-11 bg-card border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-4 text-sm outline-none focus:border-indigo-500 shadow-sm"
                    />
                </div>
            </motion.div>

            {/* Room Grid */}
            <motion.div variants={itemVariants} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {isLoading ? (
                        <div className="col-span-full py-12 text-center text-sm font-medium text-slate-500 dark:text-zinc-400">Loading rooms...</div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-sm font-medium text-slate-500 dark:text-zinc-400">No rooms found.</div>
                    ) : (
                        filteredRooms.map(room => {
                            const isFull = room.available_slots <= 0 || room.status === 'Maintenance';
                            return (
                                <div key={room.id} className={`flex flex-col relative rounded-xl bg-card border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300 ${isFull ? 'opacity-70' : 'hover:shadow-md'}`}>
                                    {room.status === 'Maintenance' && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 z-10"></div>
                                    )}
                                    <div className="p-5 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Room {room.room_number}</h3>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1.5 uppercase tracking-wider">{room.type}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                                                room.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                isFull ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' : 
                                                'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            }`}>
                                                {room.status === 'Maintenance' ? 'Maintenance' : isFull ? 'Full' : `${room.available_slots} Left`}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-5 border-t border-slate-100 dark:border-zinc-800/50 pt-4">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-1">Rent / Month</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">₱{Number(room.price).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-1">Capacity</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{room.current_occupants} / {room.capacity}</p>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <button 
                                                disabled={isFull}
                                                onClick={() => setSelectedRoom(room)}
                                                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors ${
                                                    isFull 
                                                    ? 'bg-secondary text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-zinc-800' 
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                }`}
                                            >
                                                {isFull ? 'Unavailable' : 'Choose Room'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {selectedRoom && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" 
                            onClick={() => !isSubmitting && setSelectedRoom(null)} 
                        />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                className="w-full max-w-md bg-card rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col"
                            >
                                <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Room Selection</h2>
                                    <button onClick={() => !isSubmitting && setSelectedRoom(null)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                <div className="p-6 flex flex-col gap-4">
                                    {errorMsg && <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-500/20">{errorMsg}</div>}
                                    {successMsg ? (
                                        <div className="p-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-center">
                                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <p className="text-sm font-bold">{successMsg}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-600 dark:text-zinc-400">
                                                You are about to select <span className="font-bold text-slate-900 dark:text-white">Room {selectedRoom.room_number}</span>. 
                                                You will be assigned to this room and your account status will become Active.
                                            </p>
                                            <div className="bg-secondary/30 rounded-lg p-4 border border-slate-200 dark:border-zinc-800 mt-2 space-y-2">
                                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Type</span><span className="font-bold text-slate-900 dark:text-white">{selectedRoom.type}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Rent</span><span className="font-bold text-slate-900 dark:text-white">₱{Number(selectedRoom.price).toLocaleString()} / mo</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Capacity</span><span className="font-bold text-slate-900 dark:text-white">{selectedRoom.capacity} People</span></div>
                                            </div>
                                            <button 
                                                onClick={handleChooseRoom}
                                                disabled={isSubmitting} 
                                                className="w-full py-2.5 text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white mt-2 transition-colors disabled:opacity-70"
                                            >
                                                {isSubmitting ? 'Confirming...' : 'Yes, Choose this Room'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
