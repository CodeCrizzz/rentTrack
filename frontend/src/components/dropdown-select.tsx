"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize options to object format
  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Position calculation with viewport boundary detection
  const updateCoords = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const defaultMaxHeight = 240; // max-h-60 is 240px
    const openUpwards = spaceBelow < 200 && spaceAbove > spaceBelow;

    const availableHeight = openUpwards
      ? Math.min(defaultMaxHeight, Math.max(100, spaceAbove - 16))
      : Math.min(defaultMaxHeight, Math.max(100, spaceBelow - 16));

    setCoords({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpwards,
      maxHeight: availableHeight,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  // Click outside, scroll tracking, and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (event: Event) => {
      // Don't reposition if the scroll originated from inside the dropdown list itself
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      updateCoords();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateCoords]);

  // Combine external classes for the trigger button
  const triggerClassName = `relative flex items-center justify-between text-left ${className} ${
    disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
  }`;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) updateCoords();
          setIsOpen(!isOpen);
        }}
        className={triggerClassName}
      >
        <span className="flex items-center gap-2 truncate pr-6">
          {selectedOption?.dotColor && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`}
            />
          )}
          <span className="truncate">
            {selectedOption?.label ||
              value ||
              placeholder ||
              normalizedOptions[0]?.label ||
              ""}
          </span>
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={menuRef}
                initial={{
                  opacity: 0,
                  y: coords.openUpwards ? 4 : -4,
                }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: coords.openUpwards ? 4 : -4,
                }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: coords.openUpwards ? undefined : `${coords.top}px`,
                  bottom: coords.openUpwards
                    ? `${window.innerHeight - coords.top}px`
                    : undefined,
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
              >
                <ul
                  style={{
                    maxHeight: maxListHeight || `${coords.maxHeight}px`,
                  }}
                  className="overflow-y-auto py-1 custom-scrollbar text-xs sm:text-sm text-slate-700 dark:text-zinc-300"
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
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export { DropdownSelect as CustomSelect };
