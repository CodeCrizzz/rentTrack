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
    status: 'online' | 'offline';
    resolution: string;
    fps: number;
    channel: string;
}

const CAMERAS: CameraFeed[] = [
    { id: 'cam-1', name: 'Main Gate & Turnstile', zone: 'Perimeter', status: 'online', resolution: '4K', fps: 30, channel: 'CH-01' },
    { id: 'cam-2', name: 'Lobby & Reception Desk', zone: 'Common', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-02' },
    { id: 'cam-3', name: 'Resident Parking Lot A', zone: 'Perimeter', status: 'online', resolution: '4K', fps: 24, channel: 'CH-03' },
    { id: 'cam-4', name: '1st Floor South Hallway', zone: 'Hallways', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-04' },
    { id: 'cam-5', name: '2nd Floor North Corridor', zone: 'Hallways', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-05' },
    { id: 'cam-6', name: '3rd Floor Hallway & Study', zone: 'Hallways', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-06' },
    { id: 'cam-7', name: 'Communal Kitchen & Dining', zone: 'Common', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-07' },
    { id: 'cam-8', name: 'Laundry & Drying Area', zone: 'Common', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-08' },
    { id: 'cam-9', name: 'Rear Fire Exit & Stairwell', zone: 'Perimeter', status: 'offline', resolution: '1080p', fps: 0, channel: 'CH-09' },
    { id: 'cam-10', name: '4th Floor Hallway West', zone: 'Hallways', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-10' },
    { id: 'cam-11', name: 'Rooftop Water Tanks & HVAC', zone: 'Perimeter', status: 'online', resolution: '1080p', fps: 24, channel: 'CH-11' },
    { id: 'cam-12', name: 'Basement Storage & Metering', zone: 'Common', status: 'online', resolution: '1080p', fps: 30, channel: 'CH-12' },
];

export default function CCTVPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedZone, setSelectedZone] = useState<'All' | 'Perimeter' | 'Hallways' | 'Common'>('All');
    const [focusedCam, setFocusedCam] = useState<CameraFeed | null>(null);
    const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
    const [nightVisionMap, setNightVisionMap] = useState<Record<string, boolean>>({});
    const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});

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

    const toggleNightVision = (camId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNightVisionMap(prev => {
            const next = !prev[camId];
            toast.info(`IR Night Vision ${next ? 'Engaged' : 'Disengaged'} on ${camId.toUpperCase()}`);
            return { ...prev, [camId]: next };
        });
    };

    const toggleAudio = (camId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setMutedMap(prev => ({ ...prev, [camId]: !prev[camId] }));
    };

    const takeSnapshot = (camName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast.success(`Surveillance snapshot captured for ${camName}`);
    };

    const filteredCameras = useMemo(() => {
        return CAMERAS.filter(c => selectedZone === 'All' || c.zone === selectedZone);
    }, [selectedZone]);

    const onlineCount = CAMERAS.filter(c => c.status === 'online').length;

    // Number of visible rows per viewport for the layout
    const rowsPerView = useMemo(() => {
        if (gridCols === 4) return 3; // 4x3: all 3 rows fit cleanly
        return 2; // 2x2 and 3x2: 2 rows fit cleanly per snap-viewport
    }, [gridCols]);

    // Exact card height to ensure a clean integer number of rows fit the visible viewport
    const cardHeight = useMemo(() => {
        if (!containerHeight) return undefined;
        const gap = 10; // gap-2.5 is 10px
        const totalGaps = (rowsPerView - 1) * gap;
        const minHeight = gridCols === 4 ? 115 : 135;
        const computed = Math.floor((containerHeight - totalGaps) / rowsPerView);
        return Math.max(minHeight, computed);
    }, [containerHeight, rowsPerView, gridCols]);

    // Total rows and total pages of rows
    const totalRows = Math.ceil(filteredCameras.length / gridCols);
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
                        <div className="h-7 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
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

                {/* 4. Surveillance Grid */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col p-2.5">
                    <div className={`overflow-hidden flex-1 grid gap-2.5 ${
                        gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                        gridCols === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                        {[...Array(gridCols === 2 ? 4 : gridCols === 3 ? 6 : 8)].map((_, i) => (
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
                            <Video className="w-5 h-5 text-rose-500" />
                            <span>Security Surveillance & CCTV Hub</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span>LIVE NVR</span>
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

                    {/* Grid Selector */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold">
                        <button
                            onClick={() => { setGridCols(2); setActiveRowIndex(0); }}
                            className={`px-2.5 py-1 rounded-md transition-all ${gridCols === 2 ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            2x2
                        </button>
                        <button
                            onClick={() => { setGridCols(3); setActiveRowIndex(0); }}
                            className={`px-2.5 py-1 rounded-md transition-all ${gridCols === 3 ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            3x2
                        </button>
                        <button
                            onClick={() => { setGridCols(4); setActiveRowIndex(0); }}
                            className={`px-2.5 py-1 rounded-md transition-all ${gridCols === 4 ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            4x3
                        </button>
                    </div>

                </div>
            </div>

            {/* 2. Compact Telemetry Ribbon (Saves vertical room for camera feeds) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
                
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera Matrix</span>
                        <div className="text-lg font-extrabold font-mono text-emerald-600 mt-0.5 leading-tight">
                            {onlineCount} / {CAMERAS.length} <span className="text-xs font-semibold text-slate-500">Online</span>
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">92% perimeter coverage</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RAID Storage Ring</span>
                        <div className="text-lg font-extrabold font-mono text-teal-600 mt-0.5 leading-tight">
                            88% <span className="text-xs font-semibold text-slate-500">Capacity</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">30-day rolling loop buffer</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perimeter Status</span>
                        <div className="text-lg font-extrabold font-mono text-indigo-600 mt-0.5 leading-tight">
                            Armed
                        </div>
                        <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">Optical motion detection on</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stream Latency</span>
                        <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            16ms <span className="text-xs font-semibold text-slate-500">UDP</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Zero dropped frames</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4" />
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
                                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                selectedZone === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                    Click any feed to expand into High-Definition PTZ mode
                </div>
            </div>

            {/* 4. Surveillance Grid (Snap-aligned, auto-sized card heights so zero cards are cut off) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col p-2.5">
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className={`overflow-y-auto flex-1 custom-scrollbar grid gap-2.5 snap-y snap-mandatory scroll-smooth ${
                        gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                        gridCols === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}
                >
                    {filteredCameras.map(cam => {
                        const isNightVision = !!nightVisionMap[cam.id];
                        const isMuted = mutedMap[cam.id] ?? true;

                        return (
                            <div
                                key={cam.id}
                                onClick={() => setFocusedCam(cam)}
                                style={{ height: cardHeight ? `${cardHeight}px` : undefined }}
                                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col justify-between snap-start snap-always ${
                                    cam.status === 'offline'
                                        ? 'bg-zinc-950 border-rose-900/60'
                                        : isNightVision
                                            ? 'bg-emerald-950/60 border-emerald-600'
                                            : 'bg-black border-zinc-800 hover:border-teal-500'
                                }`}
                            >
                                {/* Surveillance CRT Scanline Overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10"></div>

                                {/* Top Feed HUD */}
                                <div className="relative z-20 px-2.5 py-1.5 flex items-start justify-between text-[11px] font-mono text-white/90 drop-shadow-md">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                        <span className="font-bold tracking-wider">{cam.channel}</span>
                                        <span className="text-white/60">·</span>
                                        <span className="truncate max-w-[130px] font-sans font-semibold">{cam.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                        <span className="px-1.5 py-0.2 bg-black/60 rounded border border-white/10 font-bold">{cam.resolution}</span>
                                        <span className="px-1.5 py-0.2 bg-black/60 rounded border border-white/10">{cam.fps} FPS</span>
                                    </div>
                                </div>

                                {/* Center State / Simulated Noise */}
                                <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
                                    {cam.status === 'offline' ? (
                                        <div className="text-center text-rose-500/80 p-2">
                                            <WifiOff className="w-6 h-6 mx-auto mb-1 opacity-60" />
                                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest">SIGNAL LOST · TIMEOUT</p>
                                        </div>
                                    ) : (
                                        <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mx-auto shadow-lg">
                                                <Maximize2 className="w-4 h-4" />
                                            </div>
                                            <span className="text-[9px] text-white/80 font-mono mt-0.5 block">FOCUS STREAM</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Feed HUD & Actions */}
                                <div className="relative z-20 px-2.5 py-1.5 bg-linear-to-t from-black/80 to-transparent flex items-center justify-between text-[10px] font-mono text-white/80">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-1 bg-rose-500/80 text-white rounded font-bold">REC</span>
                                        <span className="text-white/50 text-[10px]">{currentTime.toLocaleTimeString()}</span>
                                    </div>

                                    {cam.status === 'online' && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => toggleNightVision(cam.id, e)}
                                                className={`p-1 rounded bg-black/70 hover:bg-black text-white ${isNightVision ? 'text-emerald-400' : ''}`}
                                                title="Night Vision"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => toggleAudio(cam.id, e)}
                                                className="p-1 rounded bg-black/70 hover:bg-black text-white"
                                                title="Audio Stream"
                                            >
                                                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
                                            </button>
                                            <button
                                                onClick={(e) => takeSnapshot(cam.name, e)}
                                                className="p-1 rounded bg-black/70 hover:bg-black text-white"
                                                title="Snapshot"
                                            >
                                                <Camera className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
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
                        <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            {/* Modal Header */}
                            <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-white font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="font-bold text-sm text-teal-400">{focusedCam.channel}</span>
                                    <span>·</span>
                                    <span className="font-sans font-bold text-sm text-white">{focusedCam.name}</span>
                                    <span className="text-zinc-500">({focusedCam.zone} Zone)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-bold">{focusedCam.resolution} 60FPS</span>
                                    <button onClick={() => setFocusedCam(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Main Video Stage */}
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10"></div>
                                <div className="text-center text-zinc-600 font-mono text-sm z-20">
                                    <Radio className="w-12 h-12 mx-auto mb-2 text-teal-500 animate-pulse" />
                                    <p className="font-bold text-white tracking-wider">LIVE HIGH-DEFINITION FEED ACTIVE</p>
                                    <p className="text-xs text-zinc-400 mt-1">Bitrate: 6,450 kbps · Codec: H.265/HEVC · Encryption: AES-256</p>
                                </div>

                                {/* Crosshairs & Telemetry HUD */}
                                <div className="absolute top-4 left-4 z-20 font-mono text-xs text-white/80 space-y-0.5 drop-shadow">
                                    <div>LAT: 11.2444° N · LON: 125.0039° E</div>
                                    <div>TIME: {currentTime.toISOString()}</div>
                                </div>

                                <div className="absolute bottom-4 left-4 z-20 font-mono text-xs text-emerald-400 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                    <span>OPTICAL TARGET TRACKING ARMED</span>
                                </div>
                            </div>

                            {/* Modal Control Footer */}
                            <div className="p-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toast.success("PTZ Camera Reset to Center")} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold">
                                        PTZ Center
                                    </button>
                                    <button onClick={(e) => toggleNightVision(focusedCam.id, e)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Night Vision</span>
                                    </button>
                                    <button onClick={(e) => takeSnapshot(focusedCam.name, e)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex items-center gap-1.5">
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>Capture Frame</span>
                                    </button>
                                </div>

                                <button onClick={() => setFocusedCam(null)} className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold">
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
