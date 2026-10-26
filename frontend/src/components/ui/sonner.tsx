"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps, toast as sonnerToast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

// Automatically dismiss any active/recent toasts so only the current one is shown
if (typeof window !== "undefined" && !(sonnerToast as any).__single_toast_hooked) {
  (sonnerToast as any).__single_toast_hooked = true;

  const originalSuccess = sonnerToast.success.bind(sonnerToast);
  const originalError = sonnerToast.error.bind(sonnerToast);
  const originalInfo = sonnerToast.info.bind(sonnerToast);
  const originalWarning = sonnerToast.warning.bind(sonnerToast);
  const originalMessage = sonnerToast.message?.bind(sonnerToast);

  sonnerToast.success = (...args: any[]) => {
    sonnerToast.dismiss();
    return (originalSuccess as any)(...args);
  };
  sonnerToast.error = (...args: any[]) => {
    sonnerToast.dismiss();
    return (originalError as any)(...args);
  };
  sonnerToast.info = (...args: any[]) => {
    sonnerToast.dismiss();
    return (originalInfo as any)(...args);
  };
  sonnerToast.warning = (...args: any[]) => {
    sonnerToast.dismiss();
    return (originalWarning as any)(...args);
  };
  if (originalMessage) {
    sonnerToast.message = (...args: any[]) => {
      sonnerToast.dismiss();
      return (originalMessage as any)(...args);
    };
  }
}

/**
 * RentTrack Snackbar Helper
 * Exactly matches the official UI mockup:
 * - Success: #eaf7ec bg, #c4eccb border, #1ea750 solid disc w/ white check, #0e532b title, #198754 desc & close
 * - Info: #e8f1fd bg, #c6ddfc border, #1d70e2 solid disc w/ white 'i', #0f3567 title, #3b69a6 desc & close
 * - Warning: #fef5e4 bg, #fbe0a8 border, #e68a00 solid disc w/ white '!', #783c00 title, #995c00 desc & close
 * - Error: #fde8e8 bg, #fac8c8 border, #e02424 solid disc w/ white 'x', #771d1d title, #a32a2a desc & close
 */
export const snackbar = {
  success: (title: string, description?: string) => {
    sonnerToast.dismiss();
    return sonnerToast.success(title, description ? { description } : undefined);
  },
  error: (title: string, description?: string) => {
    sonnerToast.dismiss();
    return sonnerToast.error(title, description ? { description } : undefined);
  },
  info: (title: string, description?: string) => {
    sonnerToast.dismiss();
    return sonnerToast.info(title, description ? { description } : undefined);
  },
  warning: (title: string, description?: string) => {
    sonnerToast.dismiss();
    return sonnerToast.warning(title, description ? { description } : undefined);
  },
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors={false}
      closeButton
      duration={4500}
      visibleToasts={1}
      expand={false}
      icons={{
        success: (
          <div className="w-8 h-8 rounded-full bg-[#1ea750] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Check className="w-4 h-4 text-white stroke-[3.2]" />
          </div>
        ),
        info: (
          <div className="w-8 h-8 rounded-full bg-[#1d70e2] flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
              <circle cx="12" cy="6.75" r="1.75" />
              <rect x="10.25" y="10.5" width="3.5" height="8.5" rx="1.5" />
            </svg>
          </div>
        ),
        warning: (
          <div className="w-8 h-8 rounded-full bg-[#e68a00] flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
              <rect x="10.25" y="5" width="3.5" height="9.5" rx="1.5" />
              <circle cx="12" cy="18.25" r="1.75" />
            </svg>
          </div>
        ),
        error: (
          <div className="w-8 h-8 rounded-full bg-[#e02424] flex items-center justify-center text-white shrink-0 shadow-xs">
            <X className="w-4 h-4 text-white stroke-[3.2]" />
          </div>
        ),
        loading: (
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-white stroke-[2.5]" />
          </div>
        ),
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "renttrack-snackbar group font-sans rounded-xl border p-3 sm:py-3.5 sm:px-4 shadow-sm select-none transition-all flex items-center gap-3.5",
          title: "!text-[13.5px] !font-bold !leading-tight !m-0",
          description: "!text-[12px] !font-normal !leading-normal !mt-0.5",
          closeButton:
            "!bg-transparent !border-none !shadow-none !top-1/2 !-translate-y-1/2 !right-3.5 !p-1 !h-auto !w-auto cursor-pointer transition-opacity",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
