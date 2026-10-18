"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { 
    Search, Plus, Building2, Users, Info, Wrench, Edit, Trash2, 
    X, CheckCircle, BedDouble, Layers, ArrowUpRight, Check,
    AlertTriangle, RefreshCw, LayoutGrid, List, Sparkles, Phone,
    Calendar, DollarSign, ShieldAlert, DoorOpen, Home
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const AMENITY_PRESETS = [
    'Air Conditioning',
    'Free High-Speed Wi-Fi',
    'Private Bathroom',
    'Hot Shower',
    'Study Desk & Chair',
    'Built-in Wardrobe',
    'Balcony / Window View',
    'Refrigerator',
    'Individual Submeter'
];

export default function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // View mode: Table or Visual Unit Grid
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'partially' | 'occupied' | 'maintenance'>('all');
    const [floorFilter, setFloorFilter] = useState('All Floors');
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [rentalTypeFilter, setRentalTypeFilter] = useState('All Rental Types');
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

    const fetchRooms = async (silent = false) => {
        if (!silent) setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get('/admin/rooms');
            setRooms(data || []);
        } catch (err: any) {
            console.error("Failed to fetch rooms:", err);
            setError("Failed to load rooms.");
            toast.error("Could not load rooms inventory");
        } finally {
            if (!silent) setIsLoading(false);
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
                capacity: room.capacity || 1,
                price: room.price || '',
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

    const handleToggleAmenity = (amenity: string) => {
        const current = formData.amenities ? formData.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
        let updated: string[];
        if (current.includes(amenity)) {
            updated = current.filter(a => a !== amenity);
        } else {
            updated = [...current, amenity];
        }
        setFormData({ ...formData, amenities: updated.join(', ') });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            if (editingRoom) {
                await api.put(`/admin/rooms/${editingRoom.id}`, formData);
                toast.success(`Room ${formData.room_number} updated successfully`);
            } else {
                await api.post('/admin/rooms', formData);
                toast.success(`Room ${formData.room_number} created successfully`);
            }
            setIsModalOpen(false);
            fetchRooms(true);
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Operation failed.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (room: Room) => {
        if (room.current_occupants > 0) {
            toast.error(`Cannot delete Room ${room.room_number}: active tenants are currently residing here.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently delete Room ${room.room_number}?`)) return;
        
        setIsDeleting(room.id);
        try {
            await api.delete(`/admin/rooms/${room.id}`);
            toast.success(`Room ${room.room_number} removed from inventory`);
            fetchRooms(true);
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Failed to delete room.";
            toast.error(errMsg);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleToggleMaintenance = async (room: Room) => {
        const nextStatus = room.status === 'Maintenance' ? 'Available' : 'Maintenance';
        try {
            await api.put(`/admin/rooms/${room.id}`, { ...room, status: nextStatus });
            toast.success(nextStatus === 'Available' ? `Room ${room.room_number} marked as Available` : `Room ${room.room_number} set to Maintenance`);
            fetchRooms(true);
            if (viewingRoom && viewingRoom.id === room.id) {
                setViewingRoom({ ...viewingRoom, status: nextStatus });
            }
        } catch (err: any) {
            toast.error('Failed to update room status');
        }
    };

    // Derived Executive Metrics
    const metrics = useMemo(() => {
        const total = rooms.length;
        const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
        const totalOccupants = rooms.reduce((acc, r) => acc + (r.current_occupants || 0), 0);
        const occupiedRooms = rooms.filter(r => r.current_occupants > 0 && r.status !== 'Maintenance').length;
        const fullyOccupiedRooms = rooms.filter(r => r.current_occupants >= r.capacity && r.capacity > 0 && r.status !== 'Maintenance').length;
        const partiallyOccupiedRooms = rooms.filter(r => r.current_occupants > 0 && r.current_occupants < r.capacity && r.status !== 'Maintenance').length;
        const vacantRooms = rooms.filter(r => r.current_occupants === 0 && r.status !== 'Maintenance' && r.status !== 'Unavailable').length;
        const availableBeds = rooms.reduce((acc, r) => {
            if (r.status === 'Maintenance' || r.status === 'Unavailable') return acc;
            return acc + Math.max(0, (r.capacity || 0) - (r.current_occupants || 0));
        }, 0);
        const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance').length;
        const occupancyRate = totalBeds > 0 ? Math.round((totalOccupants / totalBeds) * 100) : 0;

        // Total Potential Revenue vs Realized Monthly Revenue
        const totalPotentialRent = rooms.reduce((acc, r) => {
            const price = Number(r.price) || 0;
            if (r.rental_type === 'Per Bed / Bedspace') {
                return acc + (price * (r.capacity || 1));
            }
            return acc + price;
        }, 0);

        const currentActiveRent = rooms.reduce((acc, r) => {
            const price = Number(r.price) || 0;
            if (r.rental_type === 'Per Bed / Bedspace') {
                return acc + (price * (r.current_occupants || 0));
            }
            return acc + (r.current_occupants > 0 ? price : 0);
        }, 0);

        return {
            total,
            totalBeds,
            totalOccupants,
            occupiedRooms,
            fullyOccupiedRooms,
            partiallyOccupiedRooms,
            vacantRooms,
            availableBeds,
            maintenanceRooms,
            occupancyRate,
            totalPotentialRent,
            currentActiveRent
        };
    }, [rooms]);

    // Unique filter options
    const uniqueFloors = useMemo(() => {
        const floors = Array.from(new Set(rooms.map(r => r.floor).filter((f): f is string => Boolean(f))));
        return floors.sort();
    }, [rooms]);

    const uniqueTypes = useMemo(() => {
        const types = Array.from(new Set(rooms.map(r => r.type).filter((t): t is string => Boolean(t))));
        return types.sort();
    }, [rooms]);

    // Filter Logic
    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (
                r.room_number.toLowerCase().includes(q) ||
                `room ${r.room_number}`.toLowerCase().includes(q) ||
                (r.floor ? r.floor.toLowerCase().includes(q) : false)
            );

            let matchesStatus = true;
            if (statusFilter === 'available') {
                matchesStatus = r.current_occupants === 0 && r.status !== 'Maintenance' && r.status !== 'Unavailable';
            } else if (statusFilter === 'partially') {
                matchesStatus = r.current_occupants > 0 && r.current_occupants < r.capacity && r.status !== 'Maintenance';
            } else if (statusFilter === 'occupied') {
                matchesStatus = r.current_occupants >= r.capacity && r.status !== 'Maintenance';
            } else if (statusFilter === 'maintenance') {
                matchesStatus = r.status === 'Maintenance';
            }

            const matchesFloor = floorFilter === 'All Floors' || r.floor === floorFilter;
            const matchesType = typeFilter === 'All Types' || r.type === typeFilter;
            const matchesRentalType = rentalTypeFilter === 'All Rental Types' || r.rental_type === rentalTypeFilter;

            return matchesSearch && matchesStatus && matchesFloor && matchesType && matchesRentalType;
        });
    }, [rooms, searchQuery, statusFilter, floorFilter, typeFilter, rentalTypeFilter]);

    const getStatusPill = (room: Room) => {
        if (room.status === 'Maintenance') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400/80">
                    <Wrench className="w-3.5 h-3.5" /> Maintenance
                </span>
            );
        }
        if (room.current_occupants === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400/80">
                    <DoorOpen className="w-3.5 h-3.5" /> Vacant Unit
                </span>
            );
        }
        if (room.current_occupants < room.capacity) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400/80">
                    <BedDouble className="w-3.5 h-3.5" /> Beds Available ({room.capacity - room.current_occupants})
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400/80">
                <Check className="w-3.5 h-3.5" /> Fully Occupied
            </span>
        );
    };

    const categoryLabel = useMemo(() => {
        switch (statusFilter) {
            case 'available': return 'Vacant';
            case 'partially': return 'Available Beds';
            case 'occupied': return 'Fully Occupied';
            case 'maintenance': return 'Under Maintenance';
            default: return 'All Units';
        }
    }, [statusFilter]);

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 animate-pulse">
                {/* Header & Executive Controls */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 border-b border-slate-200/80 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="h-7 w-52 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="h-8 w-40 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Executive Metric Ribbon (4 Tiles) */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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

                {/* Category Filtering Strip */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-7 w-24 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                            ))}
                        </div>
                        {/* Search & Dropdowns */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-7 w-48 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-32 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                {/*  Main Units Ledger */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-10">
                                    <th className="py-2.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4 text-center"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(7)].map((_, i) => (
                                    <tr key={i} className="h-12">
                                        <td className="py-2 px-4"><div className="h-4 w-28 bg-slate-100 dark:bg-zinc-800/80 rounded"></div></td>
                                        <td className="py-2 px-4"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800/80 rounded-full"></div></td>
                                        <td className="py-2 px-4"><div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800/80 rounded"></div></td>
                                        <td className="py-2 px-4"><div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800/80 rounded"></div></td>
                                        <td className="py-2 px-4"><div className="h-4 w-36 bg-slate-100 dark:bg-zinc-800/80 rounded"></div></td>
                                        <td className="py-2 px-4"><div className="h-5 w-24 bg-slate-100 dark:bg-zinc-800/80 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-4"><div className="h-6 w-20 bg-slate-100 dark:bg-zinc-800/80 rounded-lg ml-auto"></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5">
            
            {/* Header & Executive Controls */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1 border-b border-slate-200/80 dark:border-zinc-800/80 pb-2">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Rooms Management
                        </h1>
                        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {metrics.total} Units
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mt-0.5">
                        Manage rooms, bed capacities, amenities, and resident room assignments.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher: Table vs Grid */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-lg text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                            title="Table list view"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>List View</span>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                            title="Visual room cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Unit Cards</span>
                        </button>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>Add Room</span>
                    </button>
                </div>
            </div>

            {/* Executive Metric Ribbon (4 Compact KPI Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                {/* Total Units & Physical Capacity */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Total Units</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.total} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Rooms</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.totalBeds}</span> total bedspaces
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700">
                        <Building2 className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Occupancy Density */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Occupancy Density</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.occupancyRate}% <span className="text-sm sm:text-base font-sans font-extrabold text-emerald-700 dark:text-emerald-400">Filled</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-extrabold text-slate-950 dark:text-white">{metrics.totalOccupants}</span> of <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.totalBeds}</span> beds occupied
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300/60 dark:border-emerald-500/30">
                        <Users className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Available to Occupy */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Available to Occupy</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-zinc-100 mt-0.5 flex items-baseline gap-2">
                            {metrics.vacantRooms} <span className="text-sm sm:text-base font-sans font-extrabold text-blue-700 dark:text-blue-400">Vacant</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-extrabold text-slate-950 dark:text-white">{metrics.availableBeds}</span> open bed slots out of <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.totalBeds}</span>
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-300/60 dark:border-blue-500/30">
                        <DoorOpen className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Maintenance */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Maintenance</span>
                        <div className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2 ${metrics.maintenanceRooms > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>
                            {metrics.maintenanceRooms} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Rooms</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                            {metrics.maintenanceRooms > 0 ? `${metrics.maintenanceRooms} offline under repair` : 'Zero offline units'}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-300/60 dark:border-rose-500/30">
                        <Wrench className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* Status Filter Bar & Search Controls */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 sm:p-2.5 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Status Pill Filters (The Categories) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 text-xs font-semibold custom-scrollbar">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>All Units</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'all' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {rooms.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('available')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'available' ? 'bg-slate-700 dark:bg-zinc-700 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Vacant</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'available' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.vacantRooms}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('partially')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'partially' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Available Beds</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'partially' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.partiallyOccupiedRooms}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('occupied')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'occupied' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Fully Occupied</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'occupied' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.fullyOccupiedRooms}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('maintenance')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'maintenance' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Maintenance</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'maintenance' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.maintenanceRooms}
                            </span>
                        </button>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">
                        {filteredRooms.length} of {rooms.length} units listed
                    </span>
                </div>

                {/* Secondary Search & Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                    {/* Search */}
                    <div className="relative w-64 sm:w-72 shrink-0">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search room # or floor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Shortened Dropdown Filters Beside Search */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Floor Dropdown */}
                        <div className="w-32 sm:w-36 shrink-0">
                            <CustomSelect
                                value={floorFilter}
                                onChange={(val) => setFloorFilter(val)}
                                options={["All Floors", ...uniqueFloors]}
                                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30"
                            />
                        </div>

                        {/* Room Type Dropdown */}
                        <div className="w-32 sm:w-36 shrink-0">
                            <CustomSelect
                                value={typeFilter}
                                onChange={(val) => setTypeFilter(val)}
                                options={["All Types", ...uniqueTypes]}
                                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30"
                            />
                        </div>

                        {/* Rental Mode Dropdown */}
                        <div className="w-40 sm:w-44 shrink-0">
                            <CustomSelect
                                value={rentalTypeFilter}
                                onChange={(val) => setRentalTypeFilter(val)}
                                options={["All Rental Types", "Whole Room", "Per Bed / Bedspace"]}
                                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30"
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* Main Inventory Data: Table or Visual Unit Grid */}
            {viewMode === 'table' ? (
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col overflow-hidden relative">
                    {/* Top-Right scrollbar header filler to eliminate the gap */}
                    <div className="absolute top-0 right-0 w-8 h-[44px] bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 z-30 pointer-events-none rounded-tr-xl" />

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-[44px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[13px] font-bold">
                                    <th className="py-2.5 px-6 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Room & Location</th>
                                    <th className="py-2.5 px-4 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Type & Rental Mode</th>
                                    <th className="py-2.5 px-4 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Occupancy Density</th>
                                    <th className="py-2.5 px-4 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Monthly Rate</th>
                                    <th className="py-2.5 px-4 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Status</th>
                                    <th className="py-2.5 px-6 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                {filteredRooms.map((room) => {
                                    const occupancyPercent = room.capacity > 0 ? Math.round((room.current_occupants / room.capacity) * 100) : 0;

                                    return (
                                        <tr key={room.id} className="h-[60px] hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                            {/* Room Number & Floor */}
                                            <td className="py-2.5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-mono font-bold text-base flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-zinc-700">
                                                        {room.room_number}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-base text-slate-900 dark:text-white block leading-tight">
                                                            Room {room.room_number}
                                                        </span>
                                                        <p className="text-sm text-slate-500 dark:text-zinc-400 block leading-tight mt-0.5">
                                                            {room.floor || 'Unassigned Floor'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type & Rental Type */}
                                            <td className="py-2.5 px-4 text-center">
                                                <span className="font-semibold text-base text-slate-800 dark:text-zinc-200 block leading-tight">
                                                    {room.type}
                                                </span>
                                                <p className="text-sm text-slate-500 dark:text-zinc-400 block leading-tight mt-0.5">
                                                    {room.rental_type || 'Whole Room'}
                                                </p>
                                            </td>

                                            {/* Occupancy Density */}
                                            <td className="py-2.5 px-4 whitespace-nowrap text-center">
                                                <span className="font-semibold text-base text-slate-800 dark:text-zinc-200">
                                                    {room.current_occupants} / {room.capacity} Beds
                                                </span>
                                            </td>

                                            {/* Monthly Rate */}
                                            <td className="py-2.5 px-4 text-center">
                                                <div className="font-mono font-bold text-base text-slate-900 dark:text-zinc-100 leading-tight">
                                                    ₱{Number(room.price).toLocaleString()}
                                                </div>
                                                <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium block leading-tight mt-0.5">
                                                    {room.rental_type === 'Per Bed / Bedspace' ? 'per bedspace / mo' : 'whole room / mo'}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-2.5 px-4 text-center">
                                                <div className="flex justify-center">
                                                    {getStatusPill(room)}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Maintenance Toggle */}
                                                    <button
                                                        onClick={() => handleToggleMaintenance(room)}
                                                        className={`p-2 rounded-lg border transition-colors ${room.status === 'Maintenance' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100' : 'text-slate-400 hover:text-rose-600 border-transparent hover:border-rose-200 dark:hover:border-rose-900/60'}`}
                                                        title={room.status === 'Maintenance' ? 'Mark Available' : 'Set to Maintenance'}
                                                    >
                                                        {room.status === 'Maintenance' ? <CheckCircle className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                                                    </button>

                                                    {/* View Details */}
                                                    <button
                                                        onClick={() => setViewingRoom(room)}
                                                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 rounded-lg transition-colors"
                                                        title="View Occupant Roster & Specs"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </button>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleOpenModal(room)}
                                                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 rounded-lg transition-colors"
                                                        title="Edit Room Configuration"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(room)}
                                                        disabled={isDeleting === room.id || room.current_occupants > 0}
                                                        className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 rounded-lg transition-colors"
                                                        title={room.current_occupants > 0 ? "Cannot delete occupied room" : "Delete Room"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredRooms.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-14 text-center text-slate-500 dark:text-zinc-400">
                                            <DoorOpen className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                                            <p className="font-bold text-base text-slate-700 dark:text-zinc-300">No rooms found</p>
                                            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Try adjusting your filters or search keywords.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Visual Unit Cards View */
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-2">
                            {filteredRooms.map((room) => {
                                const occupancyPercent = room.capacity > 0 ? Math.round((room.current_occupants / room.capacity) * 100) : 0;
                                return (
                                    <div key={room.id} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between space-y-3">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono font-bold text-base flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-zinc-700">
                                                        {room.room_number}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                                            Room {room.room_number}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                                                            {room.floor || 'Floor N/A'} • {room.type}
                                                        </p>
                                                    </div>
                                                </div>
                                                {getStatusPill(room)}
                                            </div>

                                            {/* Financial rate */}
                                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                                                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                                                    {room.rental_type || 'Whole Room'}
                                                </span>
                                                <div className="font-mono font-bold text-base text-slate-900 dark:text-zinc-100">
                                                    ₱{Number(room.price).toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Occupancy Count */}
                                            <div className="mt-2.5 flex items-center justify-between text-sm">
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                                    Occupancy
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                                    {room.current_occupants} / {room.capacity} Beds
                                                </span>
                                            </div>

                                            {/* Occupants Preview Chips */}
                                            {room.occupants && room.occupants.length > 0 && (
                                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 space-y-1">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Active Residents</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {room.occupants.slice(0, 3).map(tenant => (
                                                            <span key={tenant.id} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                                                {tenant.name.split(' ')[0]}
                                                            </span>
                                                        ))}
                                                        {room.occupants.length > 3 && (
                                                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                                                +{room.occupants.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Actions */}
                                        <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                                            <button
                                                onClick={() => setViewingRoom(room)}
                                                className="text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:underline flex items-center gap-1"
                                            >
                                                <Info className="w-3.5 h-3.5" /> Details
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleMaintenance(room)}
                                                    className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors"
                                                    title="Toggle Maintenance"
                                                >
                                                    <Wrench className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(room)}
                                                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-colors"
                                                    title="Edit Room"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(room)}
                                                    disabled={room.current_occupants > 0}
                                                    className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded transition-colors"
                                                    title="Delete Room"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredRooms.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-500 dark:text-zinc-400 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl">
                                    <DoorOpen className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                                    <p className="font-bold text-sm text-slate-700 dark:text-zinc-300">No rooms match criteria</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Room */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.96, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.96, opacity: 0 }} 
                            className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room Unit'}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                        Configure specifications, floor location, capacity, and pricing.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setIsModalOpen(false); setError(''); }} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                                {error && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Room Number & Floor */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Room Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={formData.room_number} 
                                            onChange={e => setFormData({...formData, room_number: e.target.value})} 
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none" 
                                            placeholder="e.g. 101, 202-A" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Floor Location
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.floor} 
                                            onChange={e => setFormData({...formData, floor: e.target.value})} 
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none" 
                                            placeholder="e.g. 1st Floor, 2nd Floor" 
                                        />
                                    </div>
                                </div>

                                {/* Room Type & Rental Mode */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Room Type <span className="text-rose-500">*</span>
                                        </label>
                                        <CustomSelect 
                                            value={formData.type} 
                                            onChange={val => setFormData({...formData, type: val})}
                                            options={["Single", "Double", "Triple", "Quadruple", "Dormitory", "Solo Standard", "Aircon Deluxe"]}
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Rental Type <span className="text-rose-500">*</span>
                                        </label>
                                        <CustomSelect 
                                            value={formData.rental_type} 
                                            onChange={val => setFormData({...formData, rental_type: val})}
                                            options={["Whole Room", "Per Bed / Bedspace"]}
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Capacity & Pricing */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Max Capacity (Beds) <span className="text-rose-500">*</span>
                                        </label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            value={formData.capacity} 
                                            onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 1})} 
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Monthly Price (₱) <span className="text-rose-500">*</span>
                                        </label>
                                        <input 
                                            required 
                                            type="number" 
                                            value={formData.price} 
                                            onChange={e => setFormData({...formData, price: e.target.value})} 
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none" 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Status
                                        </label>
                                        <CustomSelect 
                                            value={formData.status} 
                                            onChange={val => setFormData({...formData, status: val})}
                                            options={["Available", "Occupied", "Partially Occupied", "Maintenance", "Unavailable"]}
                                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* One-Click Amenity Presets */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                        Included Amenities
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {AMENITY_PRESETS.map((preset) => {
                                            const isSelected = formData.amenities?.includes(preset);
                                            return (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => handleToggleAmenity(preset)}
                                                    className={`px-2.5 py-1 text-[11px] rounded-md font-medium border transition-colors ${isSelected ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-zinc-900 font-bold' : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                                    {preset}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={formData.amenities} 
                                        onChange={e => setFormData({...formData, amenities: e.target.value})} 
                                        className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none mt-1" 
                                        placeholder="Or type custom amenities separated by comma..." 
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                        Description & Notes
                                    </label>
                                    <textarea 
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                        rows={3} 
                                        className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none resize-none" 
                                        placeholder="Add unit notes, bed arrangements, or leasing terms..."
                                    />
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                                    <button 
                                        type="button" 
                                        onClick={() => { setIsModalOpen(false); setError(''); }} 
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting} 
                                        className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {isSubmitting ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            editingRoom ? 'Save Changes' : 'Create Room'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Detailed Room & Occupant Dossier */}
            <AnimatePresence>
                {viewingRoom && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.96, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.96, opacity: 0 }} 
                            className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-mono font-bold text-base flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                                        {viewingRoom.room_number}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                                Room {viewingRoom.room_number} Dossier
                                            </h2>
                                            {getStatusPill(viewingRoom)}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            {viewingRoom.type} • {viewingRoom.rental_type || 'Whole Room'} • {viewingRoom.floor || 'No Floor Set'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setViewingRoom(null)} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                
                                {/* Spec Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-slate-50/60 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Monthly Rent</p>
                                        <p className="font-mono font-bold text-base text-slate-900 dark:text-zinc-100 mt-1">
                                            ₱{Number(viewingRoom.price).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50/60 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Density / Beds</p>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                                            {viewingRoom.current_occupants} / {viewingRoom.capacity} Occupied
                                        </p>
                                    </div>
                                    <div className="bg-slate-50/60 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Rental Structure</p>
                                        <p className="font-semibold text-xs text-slate-800 dark:text-zinc-200 mt-1 truncate">
                                            {viewingRoom.rental_type || 'Whole Room'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50/60 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Floor Location</p>
                                        <p className="font-semibold text-xs text-slate-800 dark:text-zinc-200 mt-1">
                                            {viewingRoom.floor || 'Unassigned'}
                                        </p>
                                    </div>
                                </div>

                                {/* Amenities Tags */}
                                {viewingRoom.amenities && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                                            Amenities & Unit Features
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {viewingRoom.amenities.split(',').map((amenity, idx) => (
                                                <span key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium rounded-md border border-slate-200/80 dark:border-zinc-700">
                                                    {amenity.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Occupant Roster */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                            Assigned Residents ({viewingRoom.occupants?.length || 0})
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {viewingRoom.capacity - viewingRoom.current_occupants} Open Bedspaces
                                        </span>
                                    </div>

                                    {viewingRoom.occupants && viewingRoom.occupants.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {viewingRoom.occupants.map(tenant => (
                                                <div key={tenant.id} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/30 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                {tenant.name}
                                                            </p>
                                                            {tenant.bed_space && (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                                                                    {tenant.bed_space}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                                                            {tenant.phone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="w-3 h-3 text-slate-400" /> {tenant.phone}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-slate-400" /> Since {new Date(tenant.date_moved_in).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Balance</span>
                                                        <span className={`font-mono text-xs ${tenant.balance > 0 ? 'text-rose-600 dark:text-rose-400/80 font-bold' : 'text-slate-900 dark:text-zinc-100 font-semibold'}`}>
                                                            ₱{Number(tenant.balance || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-center">
                                            <DoorOpen className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Unit Currently Vacant</p>
                                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">No residents assigned to this room.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                {viewingRoom.description && (
                                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">Internal Notes</p>
                                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                            {viewingRoom.description}
                                        </p>
                                    </div>
                                )}

                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/20">
                                <button
                                    onClick={() => handleToggleMaintenance(viewingRoom)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${viewingRoom.status === 'Maintenance' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
                                >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>{viewingRoom.status === 'Maintenance' ? 'Mark as Available' : 'Set to Maintenance'}</span>
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const r = viewingRoom;
                                            setViewingRoom(null);
                                            handleOpenModal(r);
                                        }}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors flex items-center gap-1.5"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit Room</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
