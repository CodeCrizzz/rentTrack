import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[] | string[];
    className?: string;
    disabled?: boolean;
}

export default function CustomSelect({ value, onChange, options, className = '', disabled = false }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Normalize options to object format
    const normalizedOptions: Option[] = options.map(opt => 
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === value) || normalizedOptions[0];

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Combine external classes. We keep them on the button so it mimics the exact dimensions of the old select.
    const triggerClassName = `relative flex items-center justify-between text-left ${className} ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={triggerClassName}
            >
                <span className="block truncate pr-6">{selectedOption?.label || value}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[100] w-full mt-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden"
                    >
                        <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar text-sm text-slate-700 dark:text-zinc-300">
                            {normalizedOptions.map((option, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                                        value === option.value 
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold' 
                                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                                    }`}
                                >
                                    <span className="block truncate">{option.label}</span>
                                    {value === option.value && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
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
