"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, Maximize2, Camera, ShieldAlert, 
    WifiOff, VolumeX
} from 'lucide-react';

const mockCameras = [
    { id: 'cam-1', name: 'Main Gate Entrance', status: 'online', resolution: '1080p', fps: 30 },
    { id: 'cam-2', name: 'Lobby & Reception', status: 'online', resolution: '1080p', fps: 30 },
    { id: 'cam-3', name: 'Parking Lot A', status: 'online', resolution: '4K', fps: 24 },
    { id: 'cam-4', name: 'Hallway 1st Floor', status: 'online', resolution: '720p', fps: 15 },
    { id: 'cam-5', name: 'Back Exit', status: 'offline', resolution: '1080p', fps: 0 },
    { id: 'cam-6', name: 'Rooftop', status: 'online', resolution: '1080p', fps: 30 },
    { id: 'cam-7', name: 'Basement Storage', status: 'online', resolution: '1080p', fps: 30 },
    { id: 'cam-8', name: 'Elevator 1', status: 'online', resolution: '720p', fps: 24 },
    { id: 'cam-9', name: 'Elevator 2', status: 'online', resolution: '720p', fps: 24 },
    { id: 'cam-10', name: 'Cafeteria', status: 'online', resolution: '1080p', fps: 30 },
    { id: 'cam-11', name: 'Emergency Exit A', status: 'offline', resolution: '1080p', fps: 0 },
    { id: 'cam-12', name: 'Loading Dock', status: 'online', resolution: '4K', fps: 24 },
];

export default function CCTVPage() {
    const [cameras] = useState(mockCameras)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isMounted, setIsMounted] = useState(false)
    const [fullscreenCam, setFullscreenCam] = useState<string | null>(null)
    const [gridCols, setGridCols] = useState<number>(2)
    const gridRef = useRef<HTMLDivElement>(null)

    // Scroll to top when grid layout changes
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [gridCols, fullscreenCam]);

    // update live timecode
    useEffect(() => {
        setIsMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleFullscreen = (id: string) => {
        setFullscreenCam(fullscreenCam === id ? null : id);
    };

    const activeCameras = fullscreenCam ? cameras.filter(c => c.id === fullscreenCam) : cameras;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col h-[calc(100vh-7.5rem)] text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-200 dark:border-white/5 pb-6 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Video className="w-8 h-8 text-rose-500" />
                        CCTV Live View
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Monitor your tenants and property for security purposes.</p>
                </div>
                
                {!fullscreenCam && (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700">
                        <button onClick={() => setGridCols(1)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${gridCols === 1 ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>1x1</button>
                        <button onClick={() => setGridCols(2)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${gridCols === 2 ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>2x2</button>
                        <button onClick={() => setGridCols(3)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${gridCols === 3 ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>3x2</button>
                    </div>
                )}
                
                {fullscreenCam && (
                    <button 
                        onClick={() => setFullscreenCam(null)}
                        className="bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-white px-5 py-2 rounded-xl font-semibold transition-colors"
                    >
                        Back to Grid
                    </button>
                )}
            </div>

            {/* Video Grid */}
            <div ref={gridRef} className={`flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 grid gap-2 ${
                fullscreenCam ? 'grid-cols-1' : 
                gridCols === 1 ? 'grid-cols-1' : 
                gridCols === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
                <AnimatePresence>
                    {activeCameras.map((cam) => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ layout: { type: 'spring', bounce: 0, duration: 0.6 }, opacity: { duration: 0.3 } }}
                            key={cam.id} 
                            className={`bg-black rounded-2xl border ${cam.status === 'offline' ? 'border-rose-900/50' : 'border-slate-800'} relative overflow-hidden group shadow-xl flex flex-col ${fullscreenCam || gridCols === 1 ? 'min-h-[60vh] lg:min-h-[calc(100vh-17rem)]' : 'min-h-[350px] xl:min-h-[368px]'}`}
                        >
                            {/* Overlay UI */}
                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
                                <div>
                                    <h3 className="text-white font-bold tracking-wide drop-shadow-md flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-slate-300" />
                                        {cam.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {cam.status === 'online' ? (
                                            <>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-md animate-pulse">
                                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span> REC
                                                </span>
                                                <span className="text-[10px] text-slate-300 font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">{cam.resolution}</span>
                                                <span className="text-[10px] text-slate-300 font-bold bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">{cam.fps} FPS</span>
                                            </>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-rose-900/80 text-rose-200 border border-rose-700/50 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                                                <WifiOff className="w-3 h-3" /> SIGNAL LOST
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-mono text-xs font-bold drop-shadow-md bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                                        {isMounted ? currentTime.toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--/--/----, --:--:--'}
                                    </div>
                                </div>
                            </div>

                            {/* Camera Feed Placeholder */}
                            <div className="flex-1 w-full h-full relative bg-zinc-950 flex items-center justify-center">
                                {cam.status === 'online' ? (
                                    <>
                                        {/* Simulated Video Noise/Movement */}
                                        <div className="absolute inset-0 opacity-[0.03] mix-blend-screen pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                                        
                                        {/* Fake Feed Content */}
                                        <div className="flex flex-col items-center justify-center text-slate-700">
                                            <Video className="w-16 h-16 opacity-20 mb-2" />
                                            <p className="text-sm font-semibold opacity-30 tracking-widest uppercase">{cam.name} Feed</p>
                                        </div>

                                        {/* Scanning line animation */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 blur-sm animate-[scan_4s_ease-in-out_infinite]"></div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-rose-500/50">
                                        <ShieldAlert className="w-16 h-16 mb-2" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No Signal</p>
                                        <p className="text-xs mt-1 text-slate-500">Attempting to reconnect...</p>
                                    </div> 
                                )}
                            </div>

                            {/* Bottom Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent z-10 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex items-center gap-3">
                                    <button className="text-white/70 hover:text-white transition-colors" title="Mute/Unmute">
                                        <VolumeX className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                {!fullscreenCam && (
                                    <button 
                                        onClick={() => toggleFullscreen(cam.id)}
                                        className="text-white/70 hover:text-white bg-black/50 p-1.5 rounded-lg hover:bg-white/20 transition-all backdrop-blur-md"
                                        title="Fullscreen"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(600px); }
                }
            `}</style>
        </motion.div>
    );
}
