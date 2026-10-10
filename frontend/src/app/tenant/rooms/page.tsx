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
        const { room, roommates } = assignedRoomData;
        return (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden">
                <motion.div variants={itemVariants} className="mb-6 shrink-0">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        My Room
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Details about your currently assigned room.</p>
                </motion.div>
                
                <motion.div variants={itemVariants} className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 flex flex-col gap-6">
                    {/* Room Details Card */}
                    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Room {room.room_number}</h2>
                                <p className="text-xs md:text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2 uppercase tracking-widest">{room.type} • Floor {room.floor}</p>
                                
                                <div className="mt-6 md:mt-8">
                                    <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-xl leading-relaxed">
                                        {room.description || 'A comfortable and modern living space tailored for your needs, equipped with essential amenities for a great stay.'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-4 min-w-[200px] shrink-0">
                                <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 md:p-5 border border-slate-100 dark:border-zinc-800">
                                    <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Monthly Rent</p>
                                    <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">₱{Number(room.price).toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 md:p-5 border border-slate-100 dark:border-zinc-800">
                                    <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Capacity</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{room.current_occupants} <span className="text-sm text-slate-500">/ {room.capacity} Occupants</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roommates Section */}
                    <div className="flex-shrink-0 mb-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Roommates</h3>
                        {roommates && roommates.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {roommates.map((mate: any) => (
                                    <div key={mate.id} className={`bg-card border ${mate.is_me ? 'border-emerald-500 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-zinc-800'} rounded-xl p-4 md:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 border-2 ${mate.is_me ? 'border-emerald-500' : 'border-slate-100 dark:border-zinc-700'}`}>
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mate.name)}&background=random`} alt={mate.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                                                    {mate.is_me ? 'Me' : mate.name}
                                                </p>
                                                {mate.is_me && (
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">You</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">Moved in: {mate.date_moved_in ? new Date(mate.date_moved_in).toLocaleDateString() : 'Unknown'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center shadow-sm">
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">You currently have no roommates.</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Enjoy the peace and quiet!</p>
                            </div>
                        )}
                    </div>
                </motion.div>
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
