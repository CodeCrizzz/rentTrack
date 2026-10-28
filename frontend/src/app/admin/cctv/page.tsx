"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Camera,
  HardDrive,
  X,
  Radio,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CameraItem {
  id: string;
  camNumber: string;
  name: string;
  fullName: string;
  location: string;
  status: "online" | "offline";
  resolution: string;
  fps: number;
}

const CAMERAS: CameraItem[] = [
  {
    id: "cam-01",
    camNumber: "CAM 01",
    name: "Main Entrance",
    fullName: "CAM 01 - Main Entrance",
    location: "Front Gate",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-02",
    camNumber: "CAM 02",
    name: "Hallway (1st Floor)",
    fullName: "CAM 02 - Hallway (1st Floor)",
    location: "1st Floor Hallway",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-03",
    camNumber: "CAM 03",
    name: "Stairs",
    fullName: "CAM 03 - Stairs",
    location: "Stairwell",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-04",
    camNumber: "CAM 04",
    name: "Parking Area",
    fullName: "CAM 04 - Parking Area",
    location: "Parking Lot",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-05",
    camNumber: "CAM 05",
    name: "Common Area",
    fullName: "CAM 05 - Common Area",
    location: "Lobby / Common Area",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-06",
    camNumber: "CAM 06",
    name: "Kitchen",
    fullName: "CAM 06 - Kitchen",
    location: "Kitchen",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-07",
    camNumber: "CAM 07",
    name: "Laundry Room",
    fullName: "CAM 07 - Laundry Room",
    location: "Laundry Area",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
  {
    id: "cam-08",
    camNumber: "CAM 08",
    name: "Back Area",
    fullName: "CAM 08 - Back Area",
    location: "Backyard",
    status: "offline",
    resolution: "1080p",
    fps: 0,
  },
];

export default function CCTVPage() {
  const [recordingState, setRecordingState] = useState<Record<string, number>>({});
  const [focusedModalCam, setFocusedModalCam] = useState<CameraItem | null>(null);

  const isAnyRecording = Object.keys(recordingState).length > 0;

  // Interval timer for all actively recording cameras
  useEffect(() => {
    if (!isAnyRecording) return;
    const interval = setInterval(() => {
      setRecordingState((prev) => {
        const next: Record<string, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          next[id] = secs + 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnyRecording]);

  const formatTimer = (secs: number = 0) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  const handleToggleCamRecord = (cam: CameraItem) => {
    if (recordingState[cam.id] !== undefined) {
      const duration = formatTimer(recordingState[cam.id]);
      setRecordingState((prev) => {
        const next = { ...prev };
        delete next[cam.id];
        return next;
      });
      toast.info("Recording Saved", {
        description: `Video recording saved for ${cam.fullName} (${duration}).`,
      });
    } else {
      setRecordingState((prev) => ({ ...prev, [cam.id]: 0 }));
      toast.success("Recording Started", {
        description: `Capturing live surveillance stream buffer for ${cam.fullName}.`,
      });
    }
  };

  return (
    <div className="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 space-y-4 pb-6">
      {/* ========================================================= */}
      {/* 1. TOP METRIC / STATUS RIBBON (4 KPI CARDS)               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Cameras */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Total Cameras
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight block">
              8
            </span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3 stroke-[2.5]" />
              All cameras offline
            </span>
          </div>
        </div>

        {/* Card 2: Online */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 rounded-full bg-slate-400 dark:bg-zinc-600" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Online
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight block">
              0
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
              <Radio className="w-3 h-3" />
              0% operational
            </span>
          </div>
        </div>

        {/* Card 3: Offline */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <VideoOff className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Offline
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight block">
              8
            </span>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3 stroke-[2]" />
              8 cameras offline
            </span>
          </div>
        </div>

        {/* Card 4: Storage Usage */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
              Storage Usage
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight block">
              42%
            </span>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: "42%" }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 block mt-1">
              168 GB / 400 GB
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN SECTION: LIVE VIEW SURVEILLANCE PANEL             */}
      {/* ========================================================= */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          {/* Left: Title & Live indicator & Active Recordings */}
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Live View
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              No Signal (All Offline)
            </span>
            {isAnyRecording && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 ml-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                REC ({Object.keys(recordingState).length} Active)
              </span>
            )}
          </div>
        </div>

        {/* Video Feed Area (3x3 Grid) */}
        <div className="mt-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {CAMERAS.map((cam) => {
              const isCamRecording = recordingState[cam.id] !== undefined;
              const camTimer = recordingState[cam.id] || 0;

              return (
                <div
                  key={cam.id}
                  onClick={() => setFocusedModalCam(cam)}
                  className="group relative aspect-[16/11] sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 dark:bg-zinc-950 border border-slate-800 dark:border-zinc-850 shadow-xs hover:border-slate-700 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between p-3.5 select-none"
                >
                  {/* Top Bar: Camera Channel & Offline / REC Badge */}
                  <div className="flex items-center justify-between z-10 w-full">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-semibold text-white/90">
                      <span className="text-blue-400 font-mono">{cam.camNumber}</span>
                      <span className="text-white/40">·</span>
                      <span className="truncate max-w-[120px] sm:max-w-[150px]">{cam.name}</span>
                    </div>

                    {isCamRecording ? (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-[10px] font-semibold text-white flex items-center gap-1 shadow-xs animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        REC {formatTimer(camTimer)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        No Signal
                      </span>
                    )}
                  </div>

                  {/* Center: VideoOff Icon + Camera Offline + No Signal */}
                  <div className="flex flex-col items-center justify-center my-auto py-2 text-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center text-zinc-500 group-hover:text-rose-400 group-hover:border-rose-500/30 transition-colors shadow-inner">
                      <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-200 dark:text-zinc-200 mt-2 block tracking-tight">
                      Camera Offline
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-rose-400/90 dark:text-rose-400 mt-0.5 block tracking-wider uppercase">
                      No Signal
                    </span>
                  </div>

                  {/* Bottom Bar: Location & Record Video Button inside Card */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-855/80 z-10 gap-2">
                    <div className="min-w-0 flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                      <span className="truncate">{cam.location}</span>
                      <span className="text-zinc-600 hidden sm:inline">·</span>
                      <span className="text-zinc-500 hidden sm:inline">{cam.resolution}</span>
                    </div>

                    {/* Record Video Button inside CCTV card */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCamRecord(cam);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
                        isCamRecording
                          ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 hover:text-white"
                      }`}
                      title={isCamRecording ? "Stop Recording" : "Record Video"}
                    >
                      <Video
                        className={`w-3 h-3 shrink-0 ${
                          isCamRecording ? "text-white" : "text-rose-400"
                        }`}
                      />
                      <span>{isCamRecording ? `Stop (${formatTimer(camTimer)})` : "Record Video"}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 9th Slot: Camera Offline */}
            <div className="group relative aspect-[16/11] sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 dark:bg-zinc-950 border border-dashed border-slate-800 dark:border-zinc-850 p-3.5 flex flex-col justify-between select-none">
              <div className="flex items-center justify-between z-10 w-full">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-semibold text-white/90">
                  <span className="text-zinc-400 font-mono">CAM 09</span>
                  <span className="text-white/40">·</span>
                  <span className="text-zinc-400">Unassigned</span>
                </div>

                <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  No Signal
                </span>
              </div>

              <div className="flex flex-col items-center justify-center my-auto py-2 text-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center text-zinc-500 shadow-inner">
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-zinc-300 mt-2 block tracking-tight">
                  Camera Offline
                </span>
                <span className="text-[11px] font-mono font-semibold text-rose-400/90 dark:text-rose-400 mt-0.5 block tracking-wider uppercase">
                  No Signal
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-850 z-10">
                <span>Slot 09 · Spare Port</span>
                <span>Disconnected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL: FOCUSED CAMERA INSPECTION MODAL                 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {focusedModalCam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <VideoOff className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {focusedModalCam.fullName}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800/40">
                        No Signal
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Location: {focusedModalCam.location} · Channel {focusedModalCam.camNumber} · Offline
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFocusedModalCam(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Large Stream (Offline) */}
              <div className="relative aspect-[16/9] w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
                  <VideoOff className="w-8 h-8 stroke-[1.75] text-rose-500/80" />
                </div>
                <span className="text-lg font-bold text-zinc-200">Camera Offline</span>
                <span className="text-xs text-rose-400 font-mono mt-1 font-semibold tracking-wider uppercase">
                  No Signal
                </span>
                <span className="text-xs text-zinc-500 mt-2 max-w-sm">
                  RTSP stream unreachable on channel {focusedModalCam.camNumber}. Video carrier signal lost.
                </span>

                <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded text-xs font-mono text-zinc-300 flex items-center gap-2 border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  RTSP // {focusedModalCam.id.toUpperCase()} // OFFLINE
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCamRecord(focusedModalCam)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                      recordingState[focusedModalCam.id] !== undefined
                        ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                        : "bg-zinc-800/90 hover:bg-zinc-700 text-white border border-zinc-700"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {recordingState[focusedModalCam.id] !== undefined
                        ? `Stop REC (${formatTimer(recordingState[focusedModalCam.id])})`
                        : "Record Video"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      toast.info(`Camera is offline (${focusedModalCam.fullName})`);
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Snapshot
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
