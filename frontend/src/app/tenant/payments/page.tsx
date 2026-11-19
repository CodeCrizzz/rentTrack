"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { buildDynamicQrPhPayload } from "@/lib/qrph";
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  Wallet,
  Download,
  Search,
  QrCode,
  Banknote,
  ArrowLeft,
  Check,
  ChevronRight,
  ShieldCheck,
  Upload,
  ScanLine,
  RefreshCw,
  Copy,
  X,
} from "lucide-react";
import { toast } from "sonner";

type CheckoutStep = "overview" | "details" | "qrph";

interface PendingQrPhSettlement {
  billId: number;
  amount: number;
  method: string;
  confirmed: boolean;
  transactionNumber?: string;
  referenceNumber?: string;
  startedAt: number;
  confirmedAt?: number;
  settleAt?: number;
  paidAt?: string;
  merchant?: string;
  invoice?: string;
}

const PENDING_QRPH_KEY = "renttrack_pending_qrph_bill";

const resolveReceiptUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const base = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
    : typeof window !== "undefined"
      ? `http://${window.location.hostname}:5000`
      : "http://localhost:5000";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatDate = (
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(
    undefined,
    options || { month: "short", day: "numeric", year: "numeric" },
  );
};

const formatPhp = (value: number) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizePaymentMethodLabel = (rawMethod?: string | null): string => {
  const raw = (rawMethod || "").trim();
  if (!raw) return "E-Wallet";
  const lower = raw.toLowerCase();
  if (lower === "cash") return "Cash";
  if (
    lower.includes("e-wallet") ||
    lower.includes("ewallet") ||
    lower.includes("gcash") ||
    lower.includes("qrph") ||
    lower.includes("qr ph") ||
    lower === "online"
  ) {
    return "E-Wallet";
  }
  return raw;
};

const defaultBill = {
  month: "No bill yet",
  dueDate: null,
  totalAmount: 0,
  amountPaid: 0,
  remainingBalance: 0,
  status: "No bill yet",
  tenantName: "Resident",
  roomNumber: null,
  breakdown: { rent: 0, water: 0, electricity: 0, other: 0, penalty: 0 },
  creationDay: 1,
  hasBill: false,
};

const clearPendingStorage = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_QRPH_KEY);
    localStorage.removeItem(PENDING_QRPH_KEY);
  } catch (e) {}
};

const readPendingStorage = (): PendingQrPhSettlement | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(PENDING_QRPH_KEY) ||
      localStorage.getItem(PENDING_QRPH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingQrPhSettlement;
  } catch (e) {
    return null;
  }
};

export default function TenantPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [currentBill, setCurrentBill] = useState<any>(defaultBill);
  const [summary, setSummary] = useState({
    monthTotal: 0,
    yearTotal: 0,
    txCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [residentName, setResidentName] = useState("Resident");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy] = useState("date_desc");

  // Multi-step QRPh checkout states
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("overview");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState("");
  const [qrDownloadCount, setQrDownloadCount] = useState(0);
  const [adminQrCode, setAdminQrCode] = useState<string | null>(null);

  // Success modal shown upon confirmed QRPh payment settlement
  const [viewingPayment, setViewingPayment] = useState<any | null>(null);

  const [successModalData, setSuccessModalData] = useState<{
    amount: number;
    transactionNumber: string;
    referenceNumber: string;
    invoiceNumber: string;
    paidAt: string;
    merchant: string;
  } | null>(null);

  // Delayed auto-settlement after returning to RentTrack
  const [pendingSettlement, setPendingSettlement] =
    useState<PendingQrPhSettlement | null>(null);
  const [secondsUntilSettled, setSecondsUntilSettled] = useState<number>(0);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const isProcessingRef = useRef(false);

  const hasActiveBill = Boolean(
    currentBill &&
    (currentBill.id || currentBill.invoice_number) &&
    currentBill.status !== "Clear" &&
    currentBill.status?.toLowerCase() !== "no bill yet" &&
    currentBill.hasBill !== false,
  );

  const statementPeriodMonth = hasActiveBill
    ? currentBill.month || "No bill yet"
    : "No bill yet";
  const statementPeriodStatus = hasActiveBill
    ? currentBill.status
    : "No bill yet";
  const invoiceDisplay =
    currentBill?.invoice_number ||
    (currentBill?.id
      ? `INV-${String(currentBill.id).padStart(6, "0")}`
      : "INV-PENDING");
  const totalToPay = Number(currentBill?.remainingBalance || 0);
  const formattedTotalToPay = formatPhp(totalToPay);
  const simulatedWalletBalance = formatPhp(Math.max(25000, totalToPay + 5000));

  const fetchPaymentData = useCallback(async () => {
    try {
      const [billResponse, paymentsResponse, qrResponse] = await Promise.all([
        api.get("/tenant/bill/current").catch(() => ({ data: null })),
        api.get("/tenant/payments").catch(() => ({ data: [] })),
        api.get("/tenant/gcash-qr").catch(() => ({ data: null })),
      ]);

      if (billResponse.data) {
        setCurrentBill(billResponse.data);
        if (billResponse.data.tenantName) {
          setResidentName(billResponse.data.tenantName);
        }
      }

      if (qrResponse?.data) {
        const qr =
          qrResponse.data.qrphQrCode || qrResponse.data.gcashQrCode || null;
        setAdminQrCode(qr);
      }

      const fetchedPayments = paymentsResponse.data || [];
      setPayments(fetchedPayments);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let mTotal = 0;
      let yTotal = 0;

      fetchedPayments.forEach((p: any) => {
        if (
          p.status === "Paid" ||
          p.status === "Approved" ||
          p.status === "Verified"
        ) {
          const pDate = new Date(p.date || p.created_at);
          if (pDate.getFullYear() === currentYear) {
            yTotal += Number(p.amount || 0);
            if (pDate.getMonth() === currentMonth)
              mTotal += Number(p.amount || 0);
          }
        }
      });

      setSummary({
        monthTotal: mTotal,
        yearTotal: yTotal,
        txCount: fetchedPayments.length,
      });
    } catch (error) {
      console.error("Critical error fetching payment data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const autoSettlePayment = useCallback(
    async (
      targetBillId: number,
      targetAmount: number,
      referenceNumber?: string,
    ) => {
      if (isProcessingRef.current || !targetBillId) return;

      try {
        isProcessingRef.current = true;
        setIsCompletingPayment(true);

        await api.post("/tenant/pay/qrph", {
          bill_id: targetBillId,
          amount: targetAmount,
          payment_method: "E-Wallet",
          transaction_number: referenceNumber,
          reference_number: referenceNumber,
        });

        clearPendingStorage();
        setPendingSettlement(null);
        setSecondsUntilSettled(0);
        await fetchPaymentData();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("renttrack-refresh-counts"));
          window.dispatchEvent(new Event("renttrack-refresh-data"));
          window.dispatchEvent(new Event("renttrack_refresh_all"));
        }

        toast.success("E-Wallet Payment Settled!", {
          description:
            "Your balance is now ₱0, status is Paid, and payment method is recorded as E-Wallet.",
        });
      } catch (error: any) {
        console.error("Auto-settle payment error:", error);
        if (
          error?.response?.data?.message?.includes(
            "already been completely settled",
          )
        ) {
          clearPendingStorage();
          setPendingSettlement(null);
          setSecondsUntilSettled(0);
          await fetchPaymentData();
        } else {
          toast.error(
            "Could not finalize settlement yet. Click Refresh Now to retry.",
          );
        }
      } finally {
        setIsCompletingPayment(false);
        isProcessingRef.current = false;
      }
    },
    [fetchPaymentData],
  );

  // Initial load: hydrate user name, fetch billing data, and resume any confirmed settlement
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const parsed = JSON.parse(userStr);
          if (parsed?.name) setResidentName(parsed.name);
        }
      } catch (e) {}
    }

    fetchPaymentData();

    const handleRefresh = () => {
      fetchPaymentData();
    };
    window.addEventListener("renttrack-refresh-data", handleRefresh);
    window.addEventListener("renttrack_refresh_all", handleRefresh);
    return () => {
      window.removeEventListener("renttrack-refresh-data", handleRefresh);
      window.removeEventListener("renttrack_refresh_all", handleRefresh);
    };
  }, [fetchPaymentData]);

  // Sync pending confirmed settlement from storage upon return or reload
  useEffect(() => {
    const syncConfirmedPending = () => {
      if (isProcessingRef.current) return;
      const pending = readPendingStorage();
      if (!pending || !pending.billId) return;

      // Expire stale items older than 30 mins
      if (Date.now() - pending.startedAt > 30 * 60 * 1000) {
        clearPendingStorage();
        return;
      }

      if (pending.confirmed) {
        setPendingSettlement(pending);
        setCheckoutStep("overview");

        // Display celebratory Successful Message modal upon returning to payment section
        const txVal =
          pending.transactionNumber ||
          pending.referenceNumber ||
          "TXN-CONFIRMED";
        setSuccessModalData({
          amount: pending.amount,
          transactionNumber: txVal,
          referenceNumber: txVal,
          invoiceNumber: pending.invoice || invoiceDisplay || "INV-ONLINE",
          paidAt:
            pending.paidAt ||
            new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          merchant: pending.merchant || "RentTrack",
        });

        // Trigger immediate settlement update
        autoSettlePayment(
          pending.billId,
          pending.amount,
          pending.referenceNumber,
        );
      }
    };

    syncConfirmedPending();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncConfirmedPending();
      }
    };

    window.addEventListener("focus", syncConfirmedPending);
    window.addEventListener("storage", syncConfirmedPending);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", syncConfirmedPending);
      window.removeEventListener("storage", syncConfirmedPending);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Delayed settlement ticker while on overview
  useEffect(() => {
    if (checkoutStep !== "overview" || !pendingSettlement?.confirmed) return;

    const settleTarget =
      pendingSettlement.settleAt ||
      (pendingSettlement.confirmedAt || pendingSettlement.startedAt) + 8000;

    const tick = () => {
      const rem = Math.max(0, Math.ceil((settleTarget - Date.now()) / 1000));
      setSecondsUntilSettled(rem);
      if (rem <= 0 && !isProcessingRef.current) {
        autoSettlePayment(
          pendingSettlement.billId,
          pendingSettlement.amount,
          pendingSettlement.referenceNumber,
        );
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkoutStep, pendingSettlement, autoSettlePayment]);

  const saveConfirmedPendingSettlement = (refNo: string) => {
    if (!currentBill?.id) return null;
    const now = Date.now();
    const paidAtStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const payload: PendingQrPhSettlement = {
      billId: currentBill.id,
      amount: totalToPay,
      method: "E-Wallet",
      confirmed: true,
      transactionNumber: refNo,
      referenceNumber: refNo,
      startedAt: now,
      confirmedAt: now,
      settleAt: now + 8000,
      paidAt: paidAtStr,
      merchant: "RentTrack",
      invoice: invoiceDisplay,
    };
    if (typeof window !== "undefined") {
      try {
        const serialized = JSON.stringify(payload);
        sessionStorage.setItem(PENDING_QRPH_KEY, serialized);
        localStorage.setItem(PENDING_QRPH_KEY, serialized);
      } catch (e) {}
    }
    setPendingSettlement(payload);
    setSuccessModalData({
      amount: totalToPay,
      transactionNumber: refNo,
      referenceNumber: refNo,
      invoiceNumber: invoiceDisplay || "INV-ONLINE",
      paidAt: paidAtStr,
      merchant: "RentTrack",
    });
    setSecondsUntilSettled(8);
    autoSettlePayment(currentBill.id, totalToPay, refNo);
    return payload;
  };

  const handleStartPayNow = () => {
    if (!hasActiveBill || totalToPay <= 0) return;
    setHasAcceptedTerms(false);
    setCheckoutStep("details");
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProceedToQrPh = async () => {
    if (!hasAcceptedTerms || !currentBill?.id) return;

    const trimmedAdminQr = adminQrCode?.trim() || "";
    const isAdminEmvString = trimmedAdminQr.startsWith("000201");

    // Generate EMVCo-compliant Philippine QR Ph dynamic payload
    const qrPayloadUrl = buildDynamicQrPhPayload({
      amount: totalToPay,
      invoiceNumber: invoiceDisplay,
      billingPeriod: statementPeriodMonth,
      baseEmvString: isAdminEmvString ? trimmedAdminQr : undefined,
    });

    try {
      const dataUrl = await QRCode.toDataURL(qrPayloadUrl, {
        width: 340,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
      setGeneratedQrDataUrl(dataUrl);
      setQrDownloadCount(0);
      setCheckoutStep("qrph");
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (trimmedAdminQr && !isAdminEmvString) {
        setGeneratedQrDataUrl(
          resolveReceiptUrl(trimmedAdminQr) || trimmedAdminQr,
        );
        setQrDownloadCount(0);
        setCheckoutStep("qrph");
        if (typeof window !== "undefined")
          window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      console.error("Failed to generate QRPh code:", err);
      toast.error("Failed to generate QRPh QR code. Please try again.");
    }
  };

  const handleDownloadQrPhScreenshot = () => {
    if (!generatedQrDataUrl) return;

    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 760;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean white standee background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle outer border
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Top tri-color QR Ph accent bar
    ctx.fillStyle = "#E11D48";
    ctx.fillRect(12, 12, (canvas.width - 24) / 3, 10);
    ctx.fillStyle = "#0057E7";
    ctx.fillRect(12 + (canvas.width - 24) / 3, 12, (canvas.width - 24) / 3, 10);
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(
      12 + ((canvas.width - 24) * 2) / 3,
      12,
      (canvas.width - 24) / 3,
      10,
    );

    // QR Ph title
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR Ph", canvas.width / 2, 74);

    ctx.fillStyle = "#64748B";
    ctx.font = "600 15px system-ui, -apple-system, sans-serif";
    ctx.fillText("Philippine National QR Code Standard", canvas.width / 2, 100);

    const qrImg = new Image();
    qrImg.onload = () => {
      const qrSize = 360;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 128;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Small QR Ph badge in center
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(canvas.width / 2 - 40, qrY + qrSize / 2 - 18, 80, 36);
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 38, qrY + qrSize / 2 - 16, 76, 32);
      ctx.fillStyle = "#0057E7";
      ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
      ctx.fillText("QRPh", canvas.width / 2, qrY + qrSize / 2 + 6);

      // Divider line
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 520);
      ctx.lineTo(canvas.width - 60, 520);
      ctx.stroke();

      // Total Amount directly below QR code
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
      ctx.fillText("TOTAL AMOUNT", canvas.width / 2, 560);

      ctx.fillStyle = "#0F172A";
      ctx.font = "900 38px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(`PHP ${formattedTotalToPay}`, canvas.width / 2, 608);

      // Company name below Total Amount
      ctx.fillStyle = "#0057E7";
      ctx.font = "800 30px system-ui, -apple-system, sans-serif";
      ctx.fillText("RentTrack", canvas.width / 2, 668);

      ctx.fillStyle = "#64748B";
      ctx.font = "600 15px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `${invoiceDisplay} · ${statementPeriodMonth}`,
        canvas.width / 2,
        700,
      );

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `RentTrack-QRPh-${invoiceDisplay}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setQrDownloadCount((c) => c + 1);
      toast.success("QRPh QR Code screenshot saved!", {
        description:
          "Open GCash, tap the QR button, and scan or upload this QRPh screenshot.",
      });
    };
    qrImg.src = generatedQrDataUrl;
  };

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const isApproved =
          p.status === "Paid" ||
          p.status === "Approved" ||
          p.status === "Verified" ||
          !p.status;
        const isPendingOrRejected =
          p.status === "Pending" ||
          p.status === "Pending Verification" ||
          p.status === "Rejected";
        if (!isApproved || isPendingOrRejected) return false;

        const txNum = (
          p.transaction_number ||
          p.transactionNumber ||
          p.reference_number ||
          p.referenceNumber ||
          (p.notes ? p.notes.replace(/^(Ref|Txn)[:#]?\s*/i, "") : "") ||
          `TXN-${p.id}`
        ).toString();

        const matchesSearch =
          !searchQuery.trim() ||
          txNum.toLowerCase().includes(searchQuery.trim().toLowerCase());

        return matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || a.created_at).getTime();
        const dateB = new Date(b.date || b.created_at).getTime();
        if (sortBy === "date_desc") return dateB - dateA;
        if (sortBy === "date_asc") return dateA - dateB;
        if (sortBy === "amount_desc")
          return Number(b.amount || 0) - Number(a.amount || 0);
        if (sortBy === "amount_asc")
          return Number(a.amount || 0) - Number(b.amount || 0);
        return 0;
      });
  }, [payments, searchQuery, sortBy]);

  const lastPaymentText = useMemo(() => {
    if (!payments || payments.length === 0) return "No payments made yet";
    const sorted = [...payments].sort((a, b) => {
      const timeA = new Date(
        a.date || a.payment_date || a.created_at || 0,
      ).getTime();
      const timeB = new Date(
        b.date || b.payment_date || b.created_at || 0,
      ).getTime();
      return timeB - timeA;
    });
    const latest = sorted[0];
    const rawDate = latest?.date || latest?.payment_date || latest?.created_at;
    const formatted = formatDate(rawDate);
    if (!formatted || formatted === "N/A") return "No payments made yet";
    return `Last Payment Made on ${formatted}`;
  }, [payments]);

  // Skeleton Loader
  if (isLoading) {
    return (
      <div className="w-full space-y-4 font-sans text-slate-900 dark:text-white animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#1E2638]">
          <div>
            <div className="h-7 w-64 bg-slate-100 dark:bg-[#182032] rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-100 dark:bg-[#182032] rounded-md mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl p-3.5 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 w-24 bg-slate-100 dark:bg-[#182032] rounded"></div>
                <div className="h-6 w-32 bg-slate-100 dark:bg-[#182032] rounded-md"></div>
                <div className="h-2.5 w-20 bg-slate-100 dark:bg-[#182032] rounded"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl p-5 shadow-xs space-y-3.5 h-[518px]"></div>
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs h-[518px]"></div>
        </div>
      </div>
    );
  }

  // PAYMENT DETAILS & TERMS CONFIRMATION PAGE
  if (checkoutStep === "details") {
    return (
      <div className="w-full max-w-3xl mx-auto py-2 space-y-5 font-sans text-slate-100">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setCheckoutStep("overview")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Bills</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Payment Details
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                E-Wallet Online Payment
              </p>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-0.5">
                Payment Details
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-slate-400 block">
                Total Amount Due
              </span>
              <span className="text-2xl font-black font-mono text-teal-400">
                PHP {formattedTotalToPay}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Transaction Account Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Biller / Company
                </span>
                <p className="font-extrabold text-slate-100 mt-0.5">
                  RentTrack
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Invoice Number
                </span>
                <p className="font-mono font-bold text-slate-100 mt-0.5">
                  {invoiceDisplay}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tenant Account
                </span>
                <p className="font-bold text-slate-100 mt-0.5">
                  {residentName}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Unit / Period
                </span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {currentBill.roomNumber
                    ? `Room ${currentBill.roomNumber}`
                    : "Assigned Room"}{" "}
                  · {statementPeriodMonth}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Due Date
                </span>
                <p className="font-medium text-slate-200 mt-0.5">
                  {formatDate(currentBill.dueDate)}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Settlement Method
                </span>
                <p className="font-bold text-indigo-300 mt-0.5">
                  E-Wallet (QRPh)
                </p>
              </div>
            </div>

            {/* Itemized Transaction Breakdown */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                Transaction Summary
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Room Rent</span>
                  <span className="font-mono font-bold text-slate-100">
                    PHP {formatPhp(currentBill.breakdown?.rent || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Water Bill</span>
                  <span className="font-mono font-bold text-slate-100">
                    PHP {formatPhp(currentBill.breakdown?.water || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Electricity Bill</span>
                  <span className="font-mono font-bold text-slate-100">
                    PHP {formatPhp(currentBill.breakdown?.electricity || 0)}
                  </span>
                </div>
                {((currentBill.breakdown?.other || 0) > 0 ||
                  (currentBill.breakdown?.penalty || 0) > 0 ||
                  currentBill.status === "Overdue" ||
                  currentBill.status?.toLowerCase().includes("overdue")) && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Other Charges</span>
                    <span className="font-mono font-bold text-slate-100">
                      PHP{" "}
                      {formatPhp(
                        (currentBill.breakdown?.other || 0) +
                          (currentBill.breakdown?.penalty || 0),
                      )}
                    </span>
                  </div>
                )}
                {Number(currentBill.amountPaid || 0) > 0 && (
                  <div className="flex justify-between items-center text-teal-400 font-semibold">
                    <span>Less: Previous Payments</span>
                    <span className="font-mono font-bold">
                      -PHP {formatPhp(currentBill.amountPaid)}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-100">
                  Total Amount
                </span>
                <span className="text-2xl font-black font-mono text-slate-100">
                  PHP {formattedTotalToPay}
                </span>
              </div>
            </div>

            {/* Checkbox and proceed button */}
            <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-5">
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={hasAcceptedTerms}
                  onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <span className="text-sm text-slate-200 leading-relaxed group-hover:text-white transition-colors">
                  I have reviewed the payment transaction above and accepted the{" "}
                  <strong className="text-indigo-400 font-semibold">
                    Terms and Conditions
                  </strong>{" "}
                  and{" "}
                  <strong className="text-indigo-400 font-semibold">
                    Privacy Policy
                  </strong>{" "}
                  for processing my E-Wallet payment to RentTrack.
                </span>
              </label>

              <button
                type="button"
                disabled={!hasAcceptedTerms}
                onClick={handleProceedToQrPh}
                className={`w-full py-3.5 px-5 rounded-xl font-extrabold text-base transition-all flex items-center justify-center gap-3 ${
                  hasAcceptedTerms
                    ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg cursor-pointer"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                }`}
              >
                <span>Proceed to Payment</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // GENERATED QRPH QR CODE PAGE
  if (checkoutStep === "qrph") {
    return (
      <div className="w-full max-w-xl mx-auto py-2 space-y-5 font-sans text-slate-100">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setCheckoutStep("overview")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Bills</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            QRPh Code
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 flex flex-col items-center"
        >
          {/* Official QRPh Merchant Display Card */}
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden select-none cursor-default">
            <div className="px-6 py-6 flex flex-col items-center text-center">
              {/* QR Ph Header */}
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-rose-600">QR</span>{" "}
                  <span className="text-[#0057E7]">Ph</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  National QR
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Scan or screenshot to pay using GCash, Maya & PH E-Wallets
              </p>

              {/* Generated or Uploaded QRPh QR Code */}
              <div className="mt-5 p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-xs relative inline-flex items-center justify-center">
                {generatedQrDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedQrDataUrl}
                      alt="Official QRPh Payment QR Code"
                      className="w-60 h-60 sm:w-64 sm:h-64 object-contain select-none rounded-lg"
                    />
                    {/* Centered Official QRPh Logo Badge (only shown on generated QR, not on fallback screenshot) */}
                    {(!adminQrCode ||
                      adminQrCode.trim().startsWith("000201") ||
                      generatedQrDataUrl !==
                        (resolveReceiptUrl(adminQrCode) || adminQrCode)) && (
                      <div className="absolute bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-xs flex items-center justify-center pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/images/logo/qrph-logo.svg"
                          alt="QRPh Logo"
                          className="h-4 sm:h-5 w-auto max-w-[64px] object-contain select-none"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-60 h-60 flex items-center justify-center text-slate-400">
                    <QrCode className="w-16 h-16 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-full border-t border-slate-200 my-5" />

              {/* Below QR Code: Total Amount */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Total Amount
                </span>
                <p className="text-3xl font-black font-mono text-slate-900 tracking-tight mt-0.5">
                  PHP {formattedTotalToPay}
                </p>
              </div>

              {/* Below Total Amount: Company Name (RentTrack) */}
              <div className="mt-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                  Merchant / Company
                </span>
                <p className="text-xl font-black text-[#0057E7] tracking-tight">
                  RentTrack
                </p>
                <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                  {invoiceDisplay} · {statementPeriodMonth}
                </p>
              </div>
            </div>
          </div>

          {/* Return to Overview Action */}
          <button
            type="button"
            onClick={() => setCheckoutStep("overview")}
            className="w-full max-w-md py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors cursor-pointer text-center"
          >
            Return to Overview
          </button>
        </motion.div>
      </div>
    );
  }

  // MY BILLS AND PAYMENTS OVERVIEW
  return (
    <div className="w-full flex-1 flex flex-col space-y-4 sm:space-y-5 font-sans text-slate-100 min-h-[calc(100vh-6.2rem)] justify-between pb-1">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              <span>My Bills and Payments</span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review active billing statement breakdown, pay online via E-Wallet
            (QRPh), and track ledger history. For cash payments, please visit
            the admin office.
          </p>
        </div>
      </div>

      {/* Step 5: Background E-Wallet Settlement Status Strip */}
      <AnimatePresence>
        {pendingSettlement?.confirmed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-100">
                  Syncing E-Wallet (QRPh) Payment · PHP{" "}
                  {formatPhp(pendingSettlement.amount)}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isCompletingPayment
                    ? "Finalizing settlement: setting balance to ₱0, status to Paid, and payment method to E-Wallet..."
                    : `Your E-Wallet payment is clearing. Total balance will update to ₱0 and status to Paid in ${secondsUntilSettled}s.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isCompletingPayment}
              onClick={() =>
                autoSettlePayment(
                  pendingSettlement.billId,
                  pendingSettlement.amount,
                  pendingSettlement.referenceNumber,
                )
              }
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
            >
              {isCompletingPayment ? "Settling..." : "Refresh Status Now"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Telemetry Ribbon (4 Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
        {/* Remaining Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Balance
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono leading-tight ${
                  hasActiveBill && currentBill.remainingBalance > 0
                    ? "text-rose-400"
                    : "text-teal-400"
                }`}
              >
                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                  pendingSettlement?.confirmed
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : hasActiveBill && currentBill.remainingBalance > 0
                      ? currentBill.status === "Overdue"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    pendingSettlement?.confirmed
                      ? "bg-amber-400"
                      : hasActiveBill && currentBill.remainingBalance > 0
                        ? currentBill.status === "Overdue"
                          ? "bg-rose-400"
                          : "bg-amber-400"
                        : "bg-teal-400"
                  }`}
                />
                {pendingSettlement?.confirmed
                  ? "Processing"
                  : hasActiveBill
                    ? currentBill.status || "Active"
                    : "No bill"}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1 truncate">
              {lastPaymentText}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Paid This Month */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Paid This Month
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-teal-400 mt-0.5 leading-tight">
              ₱{summary.monthTotal.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1">
              Approved and recorded
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/60 text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Settled */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Payments
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100 mt-0.5 leading-tight">
              ₱{summary.yearTotal.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1">
              {summary.txCount} total transaction
              {summary.txCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Due Date */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment Due Date
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-100 mt-0.5 leading-tight">
              {hasActiveBill && currentBill.dueDate
                ? formatDate(currentBill.dueDate, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No bill yet"}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1">
              {hasActiveBill ? "Due on 5th of each month" : "No active bill"}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Statement Breakdown (Left) & Transaction Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 items-stretch">
        {/* Active Statement Breakdown Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-3.5 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Statement Period
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-0.5">
                  {statementPeriodMonth}
                </h2>
                {hasActiveBill && (
                  <p className="text-xs font-mono font-bold text-indigo-400 mt-0.5">
                    {invoiceDisplay}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-bold uppercase ${
                  !hasActiveBill
                    ? "text-slate-400"
                    : currentBill.status === "Paid"
                      ? "text-teal-400"
                      : currentBill.status === "Pending Verification"
                        ? "text-amber-400"
                        : "text-rose-400"
                }`}
              >
                {statementPeriodStatus}
              </span>
            </div>

            <div className="my-4 py-2 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Room rent</span>
                <span className="font-mono font-bold text-slate-100 text-sm sm:text-base">
                  ₱{(currentBill.breakdown?.rent || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Water bill</span>
                <span className="font-mono font-bold text-slate-100 text-sm sm:text-base">
                  ₱{(currentBill.breakdown?.water || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">
                  Electricity bill
                </span>
                <span className="font-mono font-bold text-slate-100 text-sm sm:text-base">
                  ₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}
                </span>
              </div>
              {/* Other charges: only for tenants with charges for damaging things or paying overdue */}
              {((currentBill.breakdown?.other || 0) > 0 ||
                (currentBill.breakdown?.penalty || 0) > 0 ||
                currentBill.status === "Overdue" ||
                currentBill.status?.toLowerCase().includes("overdue")) && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">
                    Other charges
                  </span>
                  <span className="font-mono font-bold text-slate-100 text-sm sm:text-base">
                    ₱
                    {(
                      (currentBill.breakdown?.other || 0) +
                      (currentBill.breakdown?.penalty || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center font-bold">
                <span className="text-sm sm:text-base text-slate-100">
                  Total Amount
                </span>
                <span className="font-mono font-black text-slate-100 text-base sm:text-lg">
                  ₱{Number(currentBill.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-teal-400 font-semibold">
                <span>Amount Paid</span>
                <span className="font-mono font-bold">
                  ₱{Number(currentBill.amountPaid || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            {/* Remaining Balance */}
            <div className="flex justify-between items-baseline mb-3.5">
              <span className="text-sm font-bold text-slate-400">
                Remaining Balance
              </span>
              <span
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  Number(currentBill.remainingBalance || 0) <= 0
                    ? "text-teal-400"
                    : "text-slate-100"
                }`}
              >
                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
              </span>
            </div>

            {/* In-Person Cash Payment Advisory */}
            <div className="mb-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-slate-200">
                  Paying in Cash?
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cash payments are accepted in person at the{" "}
                  <strong className="text-slate-300">Admin Office</strong>. Hand
                  your cash directly to the administrator, who will issue your
                  official receipt and record it into your ledger.
                </p>
              </div>
            </div>

            {/* Primary Pay Now Button */}
            <button
              type="button"
              onClick={handleStartPayNow}
              disabled={
                !hasActiveBill ||
                currentBill.remainingBalance <= 0 ||
                Boolean(pendingSettlement?.confirmed)
              }
              className={`w-full py-3 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                !hasActiveBill ||
                currentBill.remainingBalance <= 0 ||
                pendingSettlement?.confirmed
                  ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-md cursor-pointer"
              }`}
            >
              {currentBill.remainingBalance <= 0 && hasActiveBill ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-teal-400" />
              ) : (
                <CreditCard className="w-4.5 h-4.5" />
              )}
              <span>
                {!hasActiveBill
                  ? "No bill yet"
                  : pendingSettlement?.confirmed
                    ? "Processing E-Wallet Payment..."
                    : currentBill.remainingBalance <= 0
                      ? "You dont have an outstanding balanc as of the moment "
                      : "Pay online using QR Ph"}
              </span>
            </button>
          </div>
        </div>

        {/* Payment History table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Payment History</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  View your settled payments
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search transaction #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="my-2 overflow-y-auto custom-scrollbar h-[518px] max-h-[518px]">
              {filteredPayments.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="h-[40px] border-b border-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-900 z-10">
                      <th className="py-2 px-3.5 bg-slate-900 text-slate-400">
                        Date
                      </th>
                      <th className="py-2 px-3.5 text-center bg-slate-900 text-slate-400">
                        Transaction #
                      </th>
                      <th className="py-2 px-3.5 text-center bg-slate-900 text-slate-400">
                        Method
                      </th>
                      <th className="py-2 px-3.5 text-center bg-slate-900 text-slate-400">
                        Amount
                      </th>
                      <th className="py-2 px-3.5 text-center bg-slate-900 text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {filteredPayments.map((p: any, i: number) => {
                      const rawMethod =
                        p.payment_method || p.method || "E-Wallet";
                      const displayMethod =
                        normalizePaymentMethodLabel(rawMethod);
                      const refNumber =
                        p.transaction_number ||
                        p.transactionNumber ||
                        p.reference_number ||
                        p.referenceNumber ||
                        (p.notes
                          ? p.notes.replace(/^(Ref|Txn)[:#]?\s*/i, "")
                          : `TXN-${p.id}`);
                      return (
                        <tr
                          key={i}
                          className="h-[53px] hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-1.5 px-3.5 whitespace-nowrap font-medium text-slate-100 text-xs sm:text-sm">
                            {formatDate(p.date || p.created_at)}
                          </td>
                          <td className="py-1.5 px-3.5 text-center whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {refNumber}
                            </span>
                          </td>
                          <td className="py-1.5 px-3.5 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-200 text-xs sm:text-sm">
                              {displayMethod}
                            </span>
                          </td>
                          <td className="py-1.5 px-3.5 text-center font-mono font-black text-slate-100 text-base sm:text-lg whitespace-nowrap">
                            ₱{Number(p.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingPayment(p)}
                              className="text-white hover:text-slate-300 hover:underline bg-transparent border-0 outline-none text-xs sm:text-sm font-bold cursor-pointer transition-colors p-0"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="h-[518px] flex flex-col items-center justify-center text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">
                    No payment records found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW PAYMENT STATEMENT          */}
      <AnimatePresence>
        {viewingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer z-10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Payment Details
                </h2>
              </div>

              {/* Transaction Metadata Card */}
              <div className="mx-6 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Transaction Number</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-300">
                      {viewingPayment.transaction_number ||
                        viewingPayment.transactionNumber ||
                        viewingPayment.reference_number ||
                        viewingPayment.referenceNumber ||
                        `TXN-${viewingPayment.id}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const val =
                          viewingPayment.transaction_number ||
                          viewingPayment.transactionNumber ||
                          viewingPayment.reference_number ||
                          viewingPayment.referenceNumber ||
                          `TXN-${viewingPayment.id}`;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(val);
                          toast.success("Transaction number copied!");
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Transaction Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-200">
                    {viewingPayment.invoice_number ||
                      viewingPayment.bill_invoice_number ||
                      (viewingPayment.bill_id
                        ? `INV-${String(viewingPayment.bill_id).padStart(6, "0")}`
                        : `INV-${String(viewingPayment.id).padStart(6, "0")}`)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date Paid</span>
                  <span className="font-medium text-slate-200">
                    {formatDate(
                      viewingPayment.date || viewingPayment.created_at,
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment Method</span>
                  <span className="font-bold text-slate-200">
                    {normalizePaymentMethodLabel(
                      viewingPayment.payment_method || viewingPayment.method,
                    )}
                  </span>
                </div>
              </div>

              {/* Statement Period & Itemized Breakdown */}
              <div className="mx-6 mt-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-sm space-y-3">
                <div className="flex justify-between items-start pb-2.5 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Statement Period
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
                      {viewingPayment.billing_month ||
                        viewingPayment.statement_month ||
                        formatDate(
                          viewingPayment.date || viewingPayment.created_at,
                          { month: "long", year: "numeric" },
                        )}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase ${
                      viewingPayment.bill_status === "Overdue"
                        ? "text-rose-400"
                        : "text-teal-400"
                    }`}
                  >
                    {viewingPayment.bill_status ||
                      viewingPayment.status ||
                      "Paid"}
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">
                      Room rent
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₱
                      {Number(
                        viewingPayment.rent_amount !== undefined &&
                          viewingPayment.rent_amount !== null
                          ? viewingPayment.rent_amount
                          : viewingPayment.amount || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">
                      Water bill
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₱
                      {Number(
                        viewingPayment.water_charges || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">
                      Electricity bill
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₱
                      {Number(
                        viewingPayment.electricity_charges || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  {((Number(viewingPayment.other_fees) || 0) > 0 ||
                    viewingPayment.bill_status === "Overdue") && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">
                        Other charges
                      </span>
                      <span className="font-mono font-bold text-slate-100">
                        ₱
                        {Number(
                          viewingPayment.other_fees || 0,
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center font-bold">
                    <span className="text-slate-100">Total Amount</span>
                    <span className="font-mono font-black text-slate-100 text-sm sm:text-base">
                      ₱
                      {Number(
                        viewingPayment.bill_total !== undefined &&
                          viewingPayment.bill_total !== null
                          ? viewingPayment.bill_total
                          : Number(viewingPayment.amount || 0),
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-teal-400 font-semibold">
                    <span>Amount Paid</span>
                    <span className="font-mono font-bold">
                      ₱
                      {Number(
                        viewingPayment.bill_amount_paid !== undefined &&
                          viewingPayment.bill_amount_paid !== null
                          ? viewingPayment.bill_amount_paid
                          : viewingPayment.amount || 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {viewingPayment.notes && (
                <div className="mx-6 mt-2.5 px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Notes</span>
                  <span
                    className="text-slate-300 font-medium text-right max-w-[220px] truncate"
                    title={viewingPayment.notes}
                  >
                    {viewingPayment.notes}
                  </span>
                </div>
              )}

              {/* Bottom Done Button */}
              <div className="p-6 pt-4">
                <button
                  type="button"
                  onClick={() => setViewingPayment(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYMENT SUCCESSFUL MESSAGE MODAL                          */}
      <AnimatePresence>
        {successModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer z-10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Celebratory Header */}
              <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
                <div className="relative mb-3 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center ring-8 ring-teal-500/10">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                </div>

                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  Payment Verified
                </span>

                <h2 className="text-2xl font-black tracking-tight text-white mt-2">
                  Payment Successful!
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Your payment has been confirmed. Your account balance is now
                  updated.
                </p>
              </div>

              {/* Amount Highlight Box */}
              <div className="mx-6 px-4 py-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Amount Paid
                </span>
                <p className="text-3xl font-black font-mono text-white tracking-tight mt-0.5">
                  PHP{" "}
                  {Number(successModalData.amount || 0).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  Status: Paid · ₱0.00 Balance
                </div>
              </div>

              {/* Receipt Details Card */}
              <div className="mx-6 mt-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Merchant / Payee</span>
                  <span className="font-bold text-slate-200">
                    {successModalData.merchant || "RentTrack"}
                  </span>
                </div>
                {successModalData.invoiceNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Invoice / Account</span>
                    <span className="font-mono font-bold text-slate-200">
                      {successModalData.invoiceNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Transaction Number</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-300">
                      {successModalData.transactionNumber ||
                        successModalData.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(
                            successModalData.referenceNumber,
                          );
                          toast.success("Transaction number copied!");
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Transaction Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment Method</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                    <span>E-Wallet (QRPh)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-medium text-slate-300">
                    {successModalData.paidAt}
                  </span>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-6 pt-5">
                <button
                  type="button"
                  onClick={() => setSuccessModalData(null)}
                  className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 transition-all cursor-pointer text-center"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
