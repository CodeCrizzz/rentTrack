"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import AdminLoader from '@/components/AdminLoader';
import Image from 'next/image';

interface Request {
    id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    assigned_to: string | null;
    admin_notes: string | null;
    tenant_name: string;
    room_number: string | null;
    scheduled_date: string | null;
    date_resolved: string | null;
}

export default function AdminRequests() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState<Request | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/requests');
            setRequests(data);
            if (data.length > 0) {
                // If we don't have a selected request or the selected one isn't in the new list, pick the first
                setSelectedReq(prev => prev ? (data.find((r: Request) => r.id === prev.id) || data[0]) : data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
            const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter;
            return matchesStatus && matchesPriority;
        });
    }, [requests, statusFilter, priorityFilter]);

    const handleMarkResolved = async () => {
        if (!selectedReq) return;
        
        try {
            await api.put(`/requests/${selectedReq.id}`, {
                ...selectedReq,
                status: 'Resolved',
                date_resolved: new Date().toISOString()
            });
            toast.success('Request marked as resolved');
            await fetchRequests();
        } catch (error: any) {
            console.error("Failed to update request:", error);
            toast.error(error.response?.data?.message || "Failed to update request");
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical':
            case 'urgent': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
            case 'high': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
            case 'medium': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
            case 'low': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
            default: return 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400';
        }
    };

    if (isLoading) {
        return <AdminLoader message="Loading Maintenance Section" />;
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-10 flex flex-col md:flex-row gap-6">
            
            {/* Left Column: List */}
            <div className="flex-1 flex flex-col gap-4">
                
                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="w-32">
                        <select 
                            value={priorityFilter} 
                            onChange={(e) => setPriorityFilter(e.target.value)} 
                            className="w-full text-sm py-2 pl-3 pr-8 rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="All">Priority: All</option>
                            <option value="Critical">Critical</option>
                            <option value="Urgent">Urgent</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="w-44">
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)} 
                            className="w-full text-sm py-2 pl-3 pr-8 rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="All">Status: All</option>
                            <option value="Unassigned">Status: Unassigned</option>
                            <option value="Pending">Status: Pending</option>
                            <option value="In Progress">Status: In Progress</option>
                            <option value="Resolved">Status: Resolved</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-card rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                            <tr>
                                <th className="py-4 px-6 font-semibold text-slate-500 dark:text-zinc-400 w-24">Room</th>
                                <th className="py-4 px-6 font-semibold text-slate-500 dark:text-zinc-400">Request Details</th>
                                <th className="py-4 px-6 font-semibold text-slate-500 dark:text-zinc-400 w-24">Priority</th>
                                <th className="py-4 px-6 font-semibold text-slate-500 dark:text-zinc-400 w-32">Date Raised</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr 
                                        key={req.id} 
                                        onClick={() => setSelectedReq(req)}
                                        className={`border-b border-slate-50 dark:border-zinc-800/50 cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-slate-50 dark:bg-zinc-800/50' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                                    >
                                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{req.room_number || '-'}</td>
                                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{req.title}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${getPriorityStyle(req.priority)}`}>
                                                {req.priority}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-zinc-400 font-medium">
                                            {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-zinc-500">No requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column: Details Pane */}
            {selectedReq ? (
                <div className="w-full md:w-[420px] shrink-0 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Selected Job Details</h2>
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${getPriorityStyle(selectedReq.priority)}`}>
                            {selectedReq.priority}
                        </span>
                    </div>

                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {/* Room & Tenant */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Room & Tenant</h3>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                                Room {selectedReq.room_number || '-'} — {selectedReq.tenant_name}
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Description</h3>
                            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                                {selectedReq.description}
                            </p>
                        </div>

                        {/* Attachment */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Attachment</h3>
                            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-zinc-500">
                                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span className="text-xs font-medium">No image uploaded</span>
                            </div>
                        </div>

                        {/* Assigned Staff */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Assigned Staff</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center">
                                    <img src="https://ui-avatars.com/api/?name=Mang+Roger&background=random" alt="Staff" width={32} height={32} />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                                    {selectedReq.assigned_to || 'Mang Roger (Internal Handyman)'}
                                </span>
                            </div>
                        </div>

                        {/* Repair Schedule */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Repair Schedule</h3>
                            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                {selectedReq.scheduled_date 
                                    ? new Date(selectedReq.scheduled_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                    : 'Today, Oct 24 @ 2:00 PM'}
                            </p>
                        </div>

                        {/* Admin Notes */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Admin Notes</h3>
                            <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-4">
                                <p className="text-sm text-slate-600 dark:text-zinc-300">
                                    {selectedReq.admin_notes || 'Approved repair budget P450 for the replacement PVC pipe. Handyman has been notified to pick up parts.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4">
                        <button 
                            onClick={handleMarkResolved}
                            className="w-full bg-[#0F9D83] hover:bg-[#0d856f] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >
                            Mark as Resolved
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
