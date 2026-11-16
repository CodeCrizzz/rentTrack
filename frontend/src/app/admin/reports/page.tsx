"use client";

import React, { useState } from "react";
import AdminReportModal from "@/components/admin-report-modal";
import { FileSpreadsheet, Download, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminReportsPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/admin/dashboard" 
              className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Operational & Financial Reports Hub
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Generate, filter, print, and export official executive property statements and audits.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Open Report Generator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-card hover:border-teal-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
            Financial & Cash Flow Ledger
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Complete billing breakdown, payment collection rates, and reconciliation statements.
          </p>
        </div>

        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-card hover:border-teal-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
            Rent Roll & Occupancy Audit
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Current room-by-room census, tenant rosters, vacant capacity, and monthly rates.
          </p>
        </div>

        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-card hover:border-teal-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
            Maintenance & Service History
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Work order resolution times, open contractor tickets, and property repair logs.
          </p>
        </div>
      </div>

      <AdminReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
