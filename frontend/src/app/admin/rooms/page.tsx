"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Search, Plus, Building2, Users, Info, Wrench, Edit, Trash2, ChevronDown, X, CheckCircle } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Tenant {
    id: number;
    name: string;
    phone: string;
    date_moved_in: string;
    bed_space: string | null;
    balance: number;
}

interface Room {
    id: number;
    room_number: string;
    type: string;
    rental_type: string;
    price: string;
    floor: string | null;
    description: string | null;
    amenities: string | null;
    capacity: number;
    current_occupants: number;
    available_slots: number;
    status: string;
    occupants: Tenant[];
}

export default function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Target items
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [floorFilter, setFloorFilter] = useState('All Floors');
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        room_number: '',
        type: 'Single',
        rental_type: 'Whole Room',
        capacity: 1,
        price: '',
        floor: '',
        description: '',
        amenities: '',
        status: 'Available'
    });

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/rooms');
            setRooms(data);
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
                rental_type: room.rental_type || 'Whole Room',
                capacity: room.capacity,
                price: room.price,
                floor: room.floor || '',
                description: room.description || '',
                amenities: room.amenities || '',
                status: room.status || 'Available'
            });
        } else {
            setEditingRoom(null);
            setFormData({
                room_number: '',
                type: 'Single',
                rental_type: 'Whole Room',
                capacity: 1,
                price: '',
                floor: '',
                description: '',
                amenities: '',
                status: 'Available' 
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            if (editingRoom) {
                await api.put(`/admin/rooms/${editingRoom.id}`, formData);
                toast.success('Room updated successfully');
            } else {
                await api.post('/admin/rooms', formData);
                toast.success('Room created successfully');
            }
            setIsModalOpen(false);
            fetchRooms();
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Operation failed.";
            setError(errMsg);
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
            toast.success('Room moved to trash');
            fetchRooms();
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Failed to delete room. Please check active residents.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleResolveMaintenance = async (room: Room) => {
        try {
            await api.put(`/admin/rooms/${room.id}`, { ...room, status: 'Available' });
            toast.success('Room marked as available');
            fetchRooms();
        } catch (err: any) {
            toast.error('Failed to update room status');
        }
    };

    // Derived Metrics
    const totalRooms = rooms.length;
    const totalBeds = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const fullyOccupied = rooms.filter(r => r.current_occupants >= r.capacity && r.capacity > 0 && r.status !== 'Maintenance').length;
    const totalOccupants = rooms.reduce((acc, r) => acc + r.current_occupants, 0);
    const capacityPercent = totalBeds > 0 ? Math.round((totalOccupants / totalBeds) * 100) : 0;
    const vacantRooms = rooms.filter(r => r.current_occupants === 0 && r.status !== 'Maintenance').length;
    const availableBeds = rooms.reduce((acc, r) => acc + (r.capacity - r.current_occupants), 0);
    const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance').length;

    // Filter Logic
    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            const matchesSearch = r.room_number.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFloor = floorFilter === 'All Floors' || r.floor === floorFilter;
            const matchesType = typeFilter === 'All Types' || r.type === typeFilter;
            return matchesSearch && matchesFloor && matchesType;
        });
    }, [rooms, searchQuery, floorFilter, typeFilter]);

    // Unique Floors for Filter
    const uniqueFloors = useMemo(() => {
        const floors = Array.from(new Set(rooms.map(r => r.floor).filter((f): f is string => Boolean(f))));
        return floors.sort();
    }, [rooms]);

    const getStatusBadge = (room: Room) => {
        if (room.status === 'Maintenance') {
            return <span className="px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-md">Maintenance</span>;
        }
        if (room.current_occupants === 0) {
            return <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-xs rounded-md">Vacant Room</span>;
        }
        if (room.current_occupants < room.capacity) {
            return <span className="px-3 py-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold text-xs rounded-md">Available Beds</span>;
        }
        return <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-md">Occupied</span>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-7rem)] flex flex-col gap-6 font-sans text-slate-900 dark:text-white">
            
            {/* Header Content */}
            <div className="shrink-0">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Rooms Management</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Track occupant density, status, and room specifications.</p>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
                {/* Total Rooms */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Total Rooms</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {totalRooms} <span className="text-xl">Rooms</span>
                        </div>
                        <p className="text-emerald-600 font-semibold text-xs mt-2">{totalBeds} Total Beds</p>
                    </div>
                </div>

                {/* Fully Occupied */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Fully Occupied</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {fullyOccupied} <span className="text-xl">Rooms</span>
                        </div>
                        <p className="text-emerald-600 font-semibold text-xs mt-2">{capacityPercent}% capacity</p>
                    </div>
                </div>

                {/* Vacant Rooms */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Vacant Rooms</span>
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center"><Info className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {vacantRooms} <span className="text-xl">Rooms</span>
                        </div>
                        <p className="text-emerald-600 font-semibold text-xs mt-2">{availableBeds} Beds Available</p>
                    </div>
                </div>

                {/* Under Maintenance */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Under Maintenance</span>
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center"><Wrench className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {maintenanceRooms} <span className="text-xl">Rooms</span>
                        </div>
                        <p className="text-red-500 font-semibold text-xs mt-2">Offline for repairs</p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-64 flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search Room #..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    {/* Floor Filter */}
                    <div className="relative w-full sm:w-40 flex items-center">
                        <CustomSelect 
                            value={floorFilter}
                            onChange={(val) => setFloorFilter(val)}
                            options={["All Floors", ...uniqueFloors]}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    <div className="relative w-full sm:w-48 flex items-center">
                        <CustomSelect 
                            value={typeFilter}
                            onChange={(val) => setTypeFilter(val)}
                            options={[
                                { value: "All Types", label: "Solo & Shared" },
                                { value: "Single", label: "Solo Suite (Single)" },
                                { value: "Double", label: "Twin Shared (Double)" },
                                { value: "Bedspace", label: "Bedspace" },
                                { value: "Solo Standard", label: "Solo Standard" },
                                { value: "Aircon Deluxe", label: "Aircon Deluxe" }
                            ]}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>
                </div>

                {/* Add Button */}
                <button 
                    onClick={() => handleOpenModal()} 
                    className="w-full md:w-auto px-5 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Add New Room
                </button>
            </div>

            {/* Table */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-700 dark:text-zinc-300 relative">
                        <thead className="bg-secondary border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Room No.</th>
                                <th className="px-6 py-4 font-semibold">Room Type</th>
                                <th className="px-6 py-4 font-semibold">Rental Type</th>
                                <th className="px-6 py-4 font-semibold text-center">Occupancy / Capacity</th>
                                <th className="px-6 py-4 font-semibold">Monthly Rent</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="py-4 pl-6 pr-[3.5rem] font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                            {filteredRooms.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No rooms found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRooms.map(room => (
                                    <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {room.room_number}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-zinc-300">
                                            {room.type}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                                            {room.rental_type || 'Whole Room'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-500 dark:text-zinc-400">
                                            {room.current_occupants} / {room.capacity} Occupant{room.capacity > 1 ? 's' : ''}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#0d9488] dark:text-[#2dd4bf]">
                                            ₱{Number(room.price).toLocaleString()}{room.rental_type === 'Per Bed / Bedspace' ? '/bed' : '/mo'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(room)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {room.status === 'Maintenance' && (
                                                    <button 
                                                        onClick={() => handleResolveMaintenance(room)}
                                                        className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5"
                                                        title="Mark as Available"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={3} />
                                                        Mark as availabe
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setViewingRoom(room)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900 rounded-md"
                                                    title="View Details"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenModal(room)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 rounded-md"
                                                    title="Edit Room"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(room.id)}
                                                    disabled={isDeleting === room.id || room.current_occupants > 0}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-400 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 rounded-md"
                                                    title={room.current_occupants > 0 ? "Cannot delete occupied room" : "Delete Room"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Add/Edit */}
            <AnimatePresence>
            {isModalOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{editingRoom ? 'Edit Property' : 'New Property'}</h2>
                                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Configure Room Details</p>
                            </div>
                            <button type="button" onClick={() => { setIsModalOpen(false); setError(''); }} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
                                <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {error && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl text-center">
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Room Number <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all" placeholder="e.g. 101" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Room Type <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <CustomSelect 
                                            value={formData.type} 
                                            onChange={val => setFormData({...formData, type: val})}
                                            options={["Single", "Double", "Triple", "Quadruple", "Dormitory"]}
                                            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Rental Type <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <CustomSelect 
                                            value={formData.rental_type} 
                                            onChange={val => setFormData({...formData, rental_type: val})}
                                            options={["Whole Room", "Per Bed / Bedspace"]}
                                            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Max Capacity <span className="text-rose-500">*</span></label>
                                    <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 1})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Monthly Price (₱) <span className="text-rose-500">*</span></label>
                                    <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Floor Location (Optional)</label>
                                    <input type="text" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all" placeholder="e.g. 1st Floor" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Status Override</label>
                                    <div className="relative">
                                        <CustomSelect 
                                            value={formData.status} 
                                            onChange={val => setFormData({...formData, status: val})}
                                            options={["Available", "Occupied", "Partially Occupied", "Maintenance", "Unavailable"]}
                                            className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Amenities</label>
                                <input type="text" value={formData.amenities} onChange={e => setFormData({...formData, amenities: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none transition-all" placeholder="e.g. Aircon, Free WiFi, Private Bath" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 pl-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0d9488] outline-none resize-none h-24 transition-all" placeholder="Room details..."></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800">
                                <button type="button" onClick={() => { setIsModalOpen(false); setError(''); }} className="px-5 py-2.5 font-bold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-all text-sm">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 font-bold bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (editingRoom ? 'Save Changes' : 'Create Room')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Modal for View Details */}
            <AnimatePresence>
            {viewingRoom && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Room {viewingRoom.room_number} Details</h2>
                                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{viewingRoom.type} • {viewingRoom.rental_type || 'Whole Room'}</p>
                            </div>
                            <button type="button" onClick={() => setViewingRoom(null)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
                                <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-secondary/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-800">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Status</p>
                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingRoom.status}</p>
                                </div>
                                <div className="bg-secondary/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-800">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Capacity</p>
                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingRoom.current_occupants} / {viewingRoom.capacity}</p>
                                </div>
                                <div className="bg-secondary/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-800">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Monthly Rent</p>
                                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">₱{Number(viewingRoom.price).toLocaleString()}</p>
                                </div>
                                <div className="bg-secondary/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-800">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Floor</p>
                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingRoom.floor || 'N/A'}</p>
                                </div>
                            </div>

                            {viewingRoom.amenities && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-500" />
                                        Amenities
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingRoom.amenities.split(',').map((amenity, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-medium rounded-md border border-slate-200 dark:border-zinc-700">
                                                {amenity.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-500" />
                                    Current Occupants
                                </h3>
                                
                                {viewingRoom.occupants && viewingRoom.occupants.length > 0 ? (
                                    <div className="space-y-3">
                                        {viewingRoom.occupants.map(tenant => (
                                            <div key={tenant.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{tenant.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{tenant.phone || 'No phone provided'}</p>
                                                </div>
                                                <div className="text-right">
                                                    {viewingRoom.rental_type === 'Per Bed / Bedspace' && tenant.bed_space && (
                                                        <span className="inline-block px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-md mb-1">
                                                            {tenant.bed_space}
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Move-in: {new Date(tenant.date_moved_in).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-secondary/50 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                                        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No tenants assigned to this room yet.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}