"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FileSpreadsheet, X } from "lucide-react";
import AdminReportsPage from "@/app/admin/reports/page";

interface AdminReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Portal modal wrapper rendering the main AdminReportsPage for quick access from other admin pages.
 */
export default function AdminReportModal({
  isOpen,
  onClose,
}: AdminReportModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md font-sans text-slate-900 dark:text-zinc-100 report-modal-overlay">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 no-print"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-6xl h-[94vh] max-h-[920px] rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-10 report-modal-container"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Official Reports Preview
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-zinc-950">
          <AdminReportsPage />
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
