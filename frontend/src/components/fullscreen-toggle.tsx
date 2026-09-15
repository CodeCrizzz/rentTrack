"use client";

import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export function FullscreenToggle() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <button 
            onClick={toggleFullscreen}
            className="group relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            aria-label="Toggle Fullscreen"
        >
            {isFullscreen ? (
                <Minimize className="w-5 h-5 group-hover:scale-110 group-active:scale-90 transition-transform duration-200" />
            ) : (
                <Maximize className="w-5 h-5 group-hover:scale-110 group-active:scale-90 transition-transform duration-200" />
            )}
        </button>
    );
}
