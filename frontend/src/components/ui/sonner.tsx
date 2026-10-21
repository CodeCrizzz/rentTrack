"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      closeButton
      duration={3500}
      visibleToasts={3}
      icons={{
        success: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30">
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        error: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/30">
            <X className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        warning: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30">
            <AlertTriangle className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        info: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/30">
            <Info className="size-3.5 stroke-[2.5]" />
          </span>
        ),
        loading: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/30">
            <Loader2 className="size-3.5 animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans text-xs flex items-center gap-3 p-3.5 pr-9 rounded-xl border border-slate-200/90 bg-white/95 text-slate-900 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#141518]/95 dark:text-zinc-100 dark:shadow-[0_14px_35px_-5px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] transition-all duration-300",
          title: "text-[13px] font-bold text-slate-950 dark:text-white leading-tight tracking-tight",
          description: "text-xs font-medium text-slate-500 dark:text-zinc-400 leading-tight mt-0.5",
          actionButton:
            "!bg-slate-900 !text-white hover:!bg-slate-800 dark:!bg-white dark:!text-zinc-950 dark:hover:!bg-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs",
          cancelButton:
            "!bg-slate-100 !text-slate-600 hover:!bg-slate-200 dark:!bg-zinc-800 dark:!text-zinc-300 dark:hover:!bg-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
          closeButton:
            "!border-none !bg-transparent hover:!bg-slate-100 dark:hover:!bg-zinc-800 !text-slate-400 hover:!text-slate-800 dark:!text-zinc-400 dark:hover:!text-zinc-100 !rounded-md !size-6 !top-3 !right-2.5 transition-colors",
          success: "!border-l-4 !border-l-emerald-600 dark:!border-l-emerald-400",
          error: "!border-l-4 !border-l-rose-600 dark:!border-l-rose-400",
          warning: "!border-l-4 !border-l-amber-500 dark:!border-l-amber-400",
          info: "!border-l-4 !border-l-sky-600 dark:!border-l-sky-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
