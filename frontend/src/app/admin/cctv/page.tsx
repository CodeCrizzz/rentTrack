"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, Maximize2, Camera, ShieldAlert, 
    WifiOff, Volume2, VolumeX, Eye, ShieldCheck, 
    HardDrive, Radio, ZoomIn, ZoomOut,
    Sliders, AlertTriangle, Play, Pause, X, Layers,
    ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface CameraFeed {
    id: string;
    name: string;
    zone: 'Perimeter' | 'Hallways' | 'Common';
    status: 'offline';
    resolution: string;
    fps: number;
    channel: string;
}

const CAMERAS: CameraFeed[] = [
    { id: 'cam-1', name: 'Main Gate & Turnstile', zone: 'Perimeter', status: 'offline', resolution: '4K', fps: 0, channel: 'CH-01' },
    { id: 'cam-2', name: 'Lobby & Reception Desk', zone: 'Common', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-02' },
    { id: 'cam-3', name: 'Resident Parking Lot A', zone: 'Perimeter', status: 'offline', resolution: '4K', fps: 0, channel: 'CH-03' },
    { id: 'cam-4', name: '1st Floor South Hallway', zone: 'Hallways', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-04' },
    { id: 'cam-5', name: '2nd Floor North Corridor', zone: 'Hallways', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-05' },
    { id: 'cam-6', name: '3rd Floor Hallway & Study', zone: 'Hallways', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-06' },
    { id: 'cam-7', name: 'Communal Kitchen & Dining', zone: 'Common', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-07' },
    { id: 'cam-8', name: 'Laundry & Drying Area', zone: 'Common', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-08' },
    { id: 'cam-9', name: 'Rear Fire Exit & Stairwell', zone: 'Perimeter', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-09' },
    { id: 'cam-10', name: '4th Floor Hallway West', zone: 'Hallways', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-10' },
    { id: 'cam-11', name: 'Rooftop Water Tanks & HVAC', zone: 'Perimeter', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-11' },
    { id: 'cam-12', name: 'Basement Storage & Metering', zone: 'Common', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-12' },
];

export default function CCTVPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedZone, setSelectedZone] = useState<'All' | 'Perimeter' | 'Hallways' | 'Common'>('All');
    const [focusedCam, setFocusedCam] = useState<CameraFeed | null>(null);

    // Initial mount loading timer for smooth skeleton transition
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 250);
        return () => clearTimeout(timer);
    }, []);

    // Dynamic viewport container height calculation
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(0);
    const [activeRowIndex, setActiveRowIndex] = useState(0);

    // Live clock ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Observer to compute pixel-perfect row height so no camera card is cut in half
    useEffect(() => {
        const updateHeight = () => {
            if (scrollContainerRef.current) {
                setContainerHeight(scrollContainerRef.current.clientHeight);
            }
        };

        updateHeight();
        const el = scrollContainerRef.current;
        if (!el) return;

        const observer = new ResizeObserver(updateHeight);
        observer.observe(el);
        window.addEventListener('resize', updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const filteredCameras = useMemo(() => {
        return CAMERAS.filter(c => selectedZone === 'All' || c.zone === selectedZone);
    }, [selectedZone]);

    // 4 columns fixed grid with 3 rows per viewport
    const rowsPerView = 3;

    // Exact card height to ensure a clean integer number of rows fit the visible viewport
    const cardHeight = useMemo(() => {
        if (!containerHeight) return undefined;
        const gap = 10; // gap-2.5 is 10px
        const totalGaps = (rowsPerView - 1) * gap;
        const minHeight = 115;
        const computed = Math.floor((containerHeight - totalGaps) / rowsPerView);
        return Math.max(minHeight, computed);
    }, [containerHeight]);

    // Total rows and total pages of rows
    const totalRows = Math.ceil(filteredCameras.length / 4);
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerView));

    const handleScroll = () => {
        if (!scrollContainerRef.current || !cardHeight) return;
        const scrollTop = scrollContainerRef.current.scrollTop;
        const pageStep = cardHeight * rowsPerView + 10;
        if (pageStep <= 0) return;
        const page = Math.round(scrollTop / pageStep);
        setActiveRowIndex(Math.min(totalPages - 1, Math.max(0, page)));
    };

    const scrollToPage = (pageIdx: number) => {
        if (!scrollContainerRef.current || !cardHeight) return;
        const targetTop = pageIdx * (cardHeight * rowsPerView + 10);
        scrollContainerRef.current.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
        setActiveRowIndex(pageIdx);
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2 animate-pulse">
                {/* 1. Header Toolbar */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-72 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-7 w-24 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-7 w-32 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Compact Telemetry Ribbon (4 Tiles) */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Zone Filters Strip */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                        ))}
                    </div>
                    <div className="h-3 w-64 bg-slate-100 dark:bg-zinc-800 rounded hidden sm:block"></div>
                </div>

                {/* 4. Surveillance Grid (4 Columns) */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col p-2.5">
                    <div className="overflow-hidden flex-1 grid gap-2.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-900/60 flex flex-col justify-between p-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700"></div>
                                        <div className="h-3 w-12 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                    <div className="h-3.5 w-10 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                </div>

                                <div className="flex flex-col items-center justify-center my-auto py-2">
                                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-2">
                                    <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    <div className="flex gap-1">
                                        <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-zinc-800"></div>
                                        <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-zinc-800"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2">
            
            {/* 1. Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Video className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
                            <span>Security Surveillance & CCTV Hub</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                            <span>NO SIGNAL</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                        System Time: {currentTime.toISOString().replace('T', ' ').slice(0, 19)} PHT · RTSP Relay Stream
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Viewport Paging Controls (when multiple rows exist) */}
                    {totalPages > 1 && (
                        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold">
                            <button
                                onClick={() => scrollToPage(Math.max(0, activeRowIndex - 1))}
                                disabled={activeRowIndex === 0}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Scroll Up to Previous Rows"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                View {activeRowIndex + 1}/{totalPages}
                            </span>
                            <button
                                onClick={() => scrollToPage(Math.min(totalPages - 1, activeRowIndex + 1))}
                                disabled={activeRowIndex >= totalPages - 1}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Scroll Down to Next Rows"
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Compact Telemetry Ribbon */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
                
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera Matrix</span>
                        <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-zinc-300 mt-0.5 leading-tight">
                            0 / {CAMERAS.length} <span className="text-xs font-semibold text-slate-500">Online</span>
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">All feeds offline · No signal</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                        <WifiOff className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RAID Storage Ring</span>
                        <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-zinc-300 mt-0.5 leading-tight">
                            Standby <span className="text-xs font-semibold text-slate-500">Mode</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">No incoming video streams</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perimeter Status</span>
                        <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-zinc-300 mt-0.5 leading-tight">
                            Signal Lost
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">Sensors awaiting signal</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stream Latency</span>
                        <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-zinc-300 mt-0.5 leading-tight">
                            -- ms <span className="text-xs font-semibold text-slate-500">UDP</span>
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">Stream disconnected</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4" />
                    </div>
                </div>

            </div>

            {/* 3. Zone Filters Strip */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {[
                        { key: 'All', label: 'All Cameras', count: CAMERAS.length },
                        { key: 'Perimeter', label: 'Perimeter & Gates', count: CAMERAS.filter(c => c.zone === 'Perimeter').length },
                        { key: 'Hallways', label: 'Corridors & Floors', count: CAMERAS.filter(c => c.zone === 'Hallways').length },
                        { key: 'Common', label: 'Common Amenities', count: CAMERAS.filter(c => c.zone === 'Common').length }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setSelectedZone(tab.key as any); setActiveRowIndex(0); }}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                selectedZone === tab.key
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-bold shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                selectedZone === tab.key ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-950' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                    Surveillance Matrix: 4-Column Fixed Grid
                </div>
            </div>

            {/* 4. Surveillance Grid (Fixed 4 Columns) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col p-2.5">
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto flex-1 custom-scrollbar grid gap-2.5 snap-y snap-mandatory scroll-smooth grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                >
                    {filteredCameras.map(cam => {
                        return (
                            <div
                                key={cam.id}
                                onClick={() => setFocusedCam(cam)}
                                style={{ height: cardHeight ? `${cardHeight}px` : undefined }}
                                className="group relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 cursor-pointer transition-all flex flex-col justify-between snap-start snap-always hover:border-zinc-700"
                            >
                                {/* Surveillance CRT Scanline Overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10"></div>

                                {/* Top Feed HUD */}
                                <div className="relative z-20 px-2.5 py-1.5 flex items-start justify-between text-[11px] font-mono text-white/90 drop-shadow-md">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                                        <span className="font-bold tracking-wider text-zinc-400">{cam.channel}</span>
                                        <span className="text-zinc-600">·</span>
                                        <span className="truncate max-w-[130px] font-sans font-semibold text-zinc-300">{cam.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                        <span className="px-1.5 py-0.5 bg-zinc-900/90 rounded border border-zinc-700/60 font-bold text-[10px] text-zinc-400">NO SIGNAL</span>
                                    </div>
                                </div>

                                {/* Center State: No signal */}
                                <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center text-center p-2">
                                    <WifiOff className="w-6 h-6 text-zinc-600 mb-1 opacity-70" />
                                    <p className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">No signal</p>
                                </div>

                                {/* Bottom Feed HUD */}
                                <div className="relative z-20 px-2.5 py-1.5 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded font-bold border border-zinc-700/60">OFFLINE</span>
                                        <span className="text-zinc-500 text-[10px]">{currentTime.toLocaleTimeString()}</span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px]">CH DISCONNECTED</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============================================================== */}
            {/* 5. FULLSCREEN FOCUS MODAL */}
            {/* ============================================================== */}
            <AnimatePresence>
                {focusedCam && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            {/* Modal Header */}
                            <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-white font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                                    <span className="font-bold text-sm text-zinc-400">{focusedCam.channel}</span>
                                    <span className="text-zinc-600">·</span>
                                    <span className="font-sans font-bold text-sm text-white">{focusedCam.name}</span>
                                    <span className="text-zinc-500">({focusedCam.zone} Zone)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-bold text-zinc-400 text-xs">NO SIGNAL</span>
                                    <button onClick={() => setFocusedCam(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Main Video Stage */}
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10"></div>
                                <div className="text-center text-zinc-500 font-mono text-sm z-20">
                                    <WifiOff className="w-12 h-12 mx-auto mb-2 text-zinc-600 opacity-60" />
                                    <p className="font-bold text-zinc-300 tracking-wider text-base uppercase">No signal</p>
                                    <p className="text-xs text-zinc-500 mt-1">RTSP Stream Offline · Channel Connection Timed Out</p>
                                </div>

                                {/* Crosshairs & Telemetry HUD */}
                                <div className="absolute top-4 left-4 z-20 font-mono text-xs text-zinc-500 space-y-0.5 drop-shadow">
                                    <div>CHANNEL: {focusedCam.channel}</div>
                                    <div>TIME: {currentTime.toISOString()}</div>
                                </div>

                                <div className="absolute bottom-4 left-4 z-20 font-mono text-xs text-zinc-500 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                                    <span>STREAM INACTIVE · CARRIER DETECT FAILED</span>
                                </div>
                            </div>

                            {/* Modal Control Footer */}
                            <div className="p-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
                                <span className="font-mono text-zinc-500">Camera channel offline</span>
                                <button onClick={() => setFocusedCam(null)} className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer">
                                    Close Feed
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
