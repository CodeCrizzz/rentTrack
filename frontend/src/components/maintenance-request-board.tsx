"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
  Wind,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Building2,
  Calendar,
  Check,
  RotateCcw,
  Sparkles,
  Play,
  Layers
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import DropdownSelect from "@/components/dropdown-select";

export interface MaintenanceTicket {
  id: number;
  request_number?: string | null;
  tenant_name: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  assigned_to?: string | null;
  room_number?: string | null;
  scheduled_date?: string | null;
  date_resolved?: string | null;
  created_at: string;
}

interface MaintenanceRequestBoardProps {
  initialTickets: MaintenanceTicket[];
  onTicketsUpdated?: (tickets: MaintenanceTicket[]) => void;
}

export default function MaintenanceRequestBoard({
  initialTickets,
  onTicketsUpdated
}: MaintenanceRequestBoardProps) {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(initialTickets || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // Synchronize when initialTickets prop updates
  React.useEffect(() => {
    setTickets(initialTickets || []);
  }, [initialTickets]);

  // Handle status transition
  const handleUpdateStatus = async (
    ticket: MaintenanceTicket,
    newStatus: "Pending" | "In Progress" | "Resolved"
  ) => {
    if (ticket.status === newStatus) return;

    setUpdatingId(ticket.id);
    const prevTickets = [...tickets];

    // Optimistic update
    const updated = tickets.map(t =>
      t.id === ticket.id
        ? {
            ...t,
            status: newStatus,
            date_resolved: newStatus === "Resolved" ? new Date().toISOString() : null
          }
        : t
    );
    setTickets(updated);
    if (onTicketsUpdated) onTicketsUpdated(updated);

    try {
      await api.put(`/admin/requests/${ticket.id}`, {
        status: newStatus,
        date_resolved: newStatus === "Resolved" ? new Date().toISOString() : null
      });

      const ticketNum = ticket.request_number || `REQ-${ticket.id}`;
      toast.success(`Work Order ${ticketNum} moved to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update ticket status:", error);
      toast.error("Failed to update status. Reverting changes.");
      setTickets(prevTickets);
      if (onTicketsUpdated) onTicketsUpdated(prevTickets);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper for Category Icons
  const getCategoryIcon = (category?: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("plumb") || cat.includes("water") || cat.includes("leak") || cat.includes("drain")) {
      return <Droplets className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (cat.includes("electr") || cat.includes("power") || cat.includes("light") || cat.includes("wiring")) {
      return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (cat.includes("aircon") || cat.includes("hvac") || cat.includes("vent") || cat.includes("cool")) {
      return <Wind className="w-3.5 h-3.5 text-cyan-500" />;
    }
    if (cat.includes("appliance") || cat.includes("fridge") || cat.includes("stove")) {
      return <Flame className="w-3.5 h-3.5 text-rose-500" />;
    }
    return <Wrench className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />;
  };

  // Helper for Priority Badge
  const getPriorityBadge = (priority?: string) => {
    const p = priority?.toLowerCase() || "normal";
    if (p === "urgent" || p === "emergency") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Urgent
        </span>
      );
    }
    if (p === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {priority || "Normal"}
      </span>
    );
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Priority filter
      if (priorityFilter !== "all" && ticket.priority?.toLowerCase() !== priorityFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== "all" && ticket.category?.toLowerCase() !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ticket.title?.toLowerCase().includes(q);
        const matchesTenant = ticket.tenant_name?.toLowerCase().includes(q);
        const matchesRoom = ticket.room_number?.toLowerCase().includes(q);
        const matchesReq = ticket.request_number?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTenant && !matchesRoom && !matchesReq) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, priorityFilter, categoryFilter, searchQuery]);

  // Group by Column Status
  const pendingTickets = useMemo(
    () => filteredTickets.filter(t => (t.status || "Pending") === "Pending"),
    [filteredTickets]
  );
  const inProgressTickets = useMemo(
    () => filteredTickets.filter(t => t.status === "In Progress"),
    [filteredTickets]
  );
  const resolvedTickets = useMemo(
    () => filteredTickets.filter(t => t.status === "Resolved"),
    [filteredTickets]
  );

  return (
    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden font-sans">
      {/* Header & Controls Bar */}
      <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Maintenance & Work Order Pipeline
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Live Kanban
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Track repair tickets across stages, reassign priority, and update statuses in 1-click
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ticket, room..."
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="w-36 shrink-0">
            <DropdownSelect
              value={priorityFilter}
              onChange={val => setPriorityFilter(val)}
              options={[
                { value: "all", label: "All Priorities" },
                { value: "urgent", label: "Urgent", dotColor: "bg-rose-500" },
                { value: "high", label: "High", dotColor: "bg-amber-500" },
                { value: "normal", label: "Normal", dotColor: "bg-blue-500" },
              ]}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>

          {/* Full Manager Link */}
          <Link
            href="/admin/requests"
            className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-xs font-semibold flex items-center gap-1 transition-colors ml-auto sm:ml-0"
          >
            <span>Request Manager</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Kanban 3-Column Board */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 bg-slate-100/40 dark:bg-zinc-950/40 min-h-[460px]">
        {/* COLUMN 1: PENDING / NEEDS REVIEW */}
        <div className="flex flex-col rounded-xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 overflow-hidden">
          {/* Lane Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Needs Review
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
              {pendingTickets.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] custom-scrollbar">
            {pendingTickets.map(ticket => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-xs hover:shadow-md transition-all space-y-2.5 group"
              >
                {/* Card Top: Number & Priority */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                    {ticket.request_number || `REQ-${ticket.id}`}
                  </span>
                  {getPriorityBadge(ticket.priority)}
                </div>

                {/* Title & Category */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {ticket.title}
                  </h4>
                  {ticket.description && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {ticket.description}
                    </p>
                  )}
                </div>

                {/* Tenant & Room Pill */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {getCategoryIcon(ticket.category)}
                    <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">
                      {ticket.tenant_name}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[10px] font-semibold text-slate-700 dark:text-zinc-300 shrink-0">
                    {ticket.room_number ? `Rm ${ticket.room_number}` : "Unit N/A"}
                  </span>
                </div>

                {/* Quick Action Button: Move to In Progress */}
                <button
                  type="button"
                  disabled={updatingId === ticket.id}
                  onClick={() => handleUpdateStatus(ticket, "In Progress")}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Work Order</span>
                </button>
              </motion.div>
            ))}

            {pendingTickets.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                No tickets pending review.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: WORK IN PROGRESS */}
        <div className="flex flex-col rounded-xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 overflow-hidden">
          {/* Lane Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Work In Progress
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50">
              {inProgressTickets.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] custom-scrollbar">
            {inProgressTickets.map(ticket => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-800/60 shadow-xs hover:shadow-md transition-all space-y-2.5 group"
              >
                {/* Card Top: Number & Priority */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                    {ticket.request_number || `REQ-${ticket.id}`}
                  </span>
                  {getPriorityBadge(ticket.priority)}
                </div>

                {/* Title & Category */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {ticket.title}
                  </h4>
                  {ticket.description && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {ticket.description}
                    </p>
                  )}
                </div>

                {/* Tenant & Room Pill */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {getCategoryIcon(ticket.category)}
                    <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">
                      {ticket.tenant_name}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[10px] font-semibold text-slate-700 dark:text-zinc-300 shrink-0">
                    {ticket.room_number ? `Rm ${ticket.room_number}` : "Unit N/A"}
                  </span>
                </div>

                {/* Actions: Mark Resolved & Revert to Pending */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={updatingId === ticket.id}
                    onClick={() => handleUpdateStatus(ticket, "Pending")}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === ticket.id}
                    onClick={() => handleUpdateStatus(ticket, "Resolved")}
                    className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    <span>Resolve</span>
                  </button>
                </div>
              </motion.div>
            ))}

            {inProgressTickets.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                No work orders currently active.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: COMPLETED / RESOLVED */}
        <div className="flex flex-col rounded-xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 overflow-hidden">
          {/* Lane Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Resolved & Closed
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
              {resolvedTickets.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] custom-scrollbar">
            {resolvedTickets.map(ticket => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 opacity-90 hover:opacity-100 shadow-xs hover:shadow-md transition-all space-y-2.5 group"
              >
                {/* Card Top: Number & Date */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                    {ticket.request_number || `REQ-${ticket.id}`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Resolved
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-2 leading-snug">
                    {ticket.title}
                  </h4>
                </div>

                {/* Tenant & Room */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {getCategoryIcon(ticket.category)}
                    <span className="font-medium text-slate-700 dark:text-zinc-300 truncate">
                      {ticket.tenant_name}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[10px] font-semibold text-slate-700 dark:text-zinc-300 shrink-0">
                    {ticket.room_number ? `Rm ${ticket.room_number}` : "Unit N/A"}
                  </span>
                </div>

                {/* Reopen Action */}
                <button
                  type="button"
                  disabled={updatingId === ticket.id}
                  onClick={() => handleUpdateStatus(ticket, "In Progress")}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reopen Ticket</span>
                </button>
              </motion.div>
            ))}

            {resolvedTickets.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                No tickets resolved yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
