"use client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoader({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="max-w-[1600px] mx-auto w-full h-full min-h-[70vh] flex flex-col pt-4 space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-[200px] md:w-[300px] bg-slate-200 dark:bg-zinc-800" />
                        <Skeleton className="h-4 w-[150px] md:w-[200px] bg-slate-200 dark:bg-zinc-800" />
                    </div>
                    <Skeleton className="h-10 w-[100px] md:w-[120px] rounded-full bg-slate-200 dark:bg-zinc-800" />
                </div>
            </div>

            {/* Stats/Cards Skeleton Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[120px] md:h-[140px] w-full rounded-2xl bg-slate-200 dark:bg-zinc-800" />
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="flex-1 w-full rounded-[2.5rem] bg-slate-200/50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800/60 p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-8 w-[150px] bg-slate-200 dark:bg-zinc-800" />
                    <Skeleton className="h-8 w-[200px] rounded-full bg-slate-200 dark:bg-zinc-800" />
                </div>
                
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-200 dark:bg-zinc-800" />
                    ))}
                </div>
            </div>
            
            {/* Accessibility text */}
            <span className="sr-only">{message}</span>
        </div>
    );
}


