"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      duration={4000}
      visibleToasts={4}
      icons={{
        success: (
          <CircleCheckIcon className="size-4.5 text-emerald-400 shrink-0" />
        ),
        info: (
          <InfoIcon className="size-4.5 text-cyan-400 shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4.5 text-amber-400 shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-4.5 text-rose-400 shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-4.5 animate-spin text-teal-400 shrink-0" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans font-semibold text-xs shadow-2xl rounded-xl border backdrop-blur-md",
          success: "!bg-emerald-950/95 !text-emerald-300 !border-emerald-800/80 shadow-emerald-950/50",
          error: "!bg-rose-950/95 !text-rose-300 !border-rose-800/80 shadow-rose-950/50",
          warning: "!bg-amber-950/95 !text-amber-300 !border-amber-800/80 shadow-amber-950/50",
          info: "!bg-cyan-950/95 !text-cyan-300 !border-cyan-800/80 shadow-cyan-950/50",
          closeButton: "!bg-emerald-950 !border-emerald-700/80 !text-emerald-400 hover:!bg-emerald-900",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
