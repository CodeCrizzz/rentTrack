"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  dotColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (Option | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxListHeight?: string;
}

export default function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  disabled = false,
  maxListHeight,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Combine external classes. keeping it on the button for the exact dimensions of the old select.
  const triggerClassName = `relative flex items-center justify-between text-left ${className} ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className="flex items-center gap-2 truncate pr-6">
          {selectedOption?.dotColor && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`}
            />
          )}
          <span className="truncate">
            {selectedOption?.label || value || placeholder || (normalizedOptions[0]?.label || "")}
          </span>
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] w-full min-w-36 mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden"
          >
            <ul
              style={maxListHeight ? { maxHeight: maxListHeight } : undefined}
              className={`${maxListHeight ? "" : "max-h-60"} overflow-y-auto py-1 custom-scrollbar text-xs sm:text-sm text-slate-700 dark:text-zinc-300`}
            >
              {normalizedOptions.map((option, idx) => (
                <li
                  key={idx}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                    value === option.value
                      ? "bg-slate-100 text-slate-950 dark:bg-zinc-800 dark:text-white font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.dotColor && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${option.dotColor}`}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {value === option.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0"></div>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { DropdownSelect as CustomSelect };
