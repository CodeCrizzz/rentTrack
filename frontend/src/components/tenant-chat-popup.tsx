"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  MessageCircle,
  X,
  Minus,
  Maximize2,
  Send,
  ThumbsUp,
  Phone,
  Video,
  Wrench,
  Smile,
  ImageIcon,
  ChevronDown,
  Check,
  CheckCheck,
  ChevronRight,
  User,
  Paperclip,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

interface ChatMessage {
  id?: number | string;
  message: string;
  sender_type: "tenant" | "admin";
  created_at: string;
  status?: "Sent" | "Delivered" | "Seen";
}

export default function TenantChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Maintenance Request Quick Modal inside Chat
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintTitle, setMaintTitle] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCategory, setMaintCategory] = useState("Plumbing");
  const [maintPriority, setMaintPriority] = useState("Medium");
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // Fetch messages from backend
  const fetchMessages = async (silent = false) => {
    if (!silent && messages.length === 0) setIsLoading(true);
    try {
      const { data } = await api.get("/tenant/chat");
      const formattedData = (Array.isArray(data) ? data : []).map(
        (msg: any, index: number) => {
          let mockStatus: "Sent" | "Delivered" | "Seen" = "Seen";
          if (msg.sender_type === "tenant" && index === data.length - 1) {
            mockStatus = "Delivered";
          }
          return {
            ...msg,
            status: msg.status || mockStatus,
          };
        }
      );
      setMessages(formattedData);
    } catch (err: any) {
      if (err?.response?.status !== 429) {
        console.error("Failed to fetch tenant chat:", err);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnread = async () => {
    try {
      const { data } = await api.get("/tenant/chat/unread");
      if (data && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    }
  };

  // Listen to external triggers to open chat (e.g. from Dashboard "Message Admin" or notifications)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
      fetchMessages(true);
    };

    window.addEventListener("open-tenant-chat", handleOpen);

    // Check URL params for ?openChat=true
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openChat") === "true") {
        handleOpen();
      }
    }

    return () => {
      window.removeEventListener("open-tenant-chat", handleOpen);
    };
  }, []);

  // Polling loop
  useEffect(() => {
    fetchMessages();
    fetchUnread();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchMessages(true);
      if (!isOpen || isMinimized) {
        fetchUnread();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, isMinimized]);

  // When popup opens, clear unread count & scroll down
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isOpen, isMinimized]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 80;
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || newMessage).trim();
    if (!text) return;

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      message: text,
      sender_type: "tenant",
      created_at: new Date().toISOString(),
      status: "Sent",
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    isAtBottom.current = true;
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 40);

    setIsSending(true);
    try {
      await api.post("/tenant/chat", { message: text });
      fetchMessages(true);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  };

  // Submit quick maintenance request
  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTitle.trim() || !maintDesc.trim()) {
      toast.warning("Please fill in the title and description.");
      return;
    }

    setIsSubmittingMaint(true);
    try {
      const formData = new FormData();
      formData.append("title", maintTitle.trim());
      formData.append("description", maintDesc.trim());
      formData.append("category", maintCategory);
      formData.append("priority", maintPriority);

      await api.post("/requests", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Maintenance Request Created", {
        description: "Ticket posted directly into chat.",
      });

      setShowMaintenanceModal(false);
      setMaintTitle("");
      setMaintDesc("");
      fetchMessages(true);
    } catch (err: any) {
      console.error("Failed to file maintenance request:", err);
      toast.error("Failed to file repair ticket.");
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON (Visible when chat card is closed) */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setUnreadCount(0);
          }}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#0084ff] hover:bg-[#0073e6] text-white shadow-2xl flex items-center justify-center cursor-pointer transition-shadow hover:shadow-[0_8px_30px_rgb(0,132,255,0.4)]"
          title="Chat with Admin"
          aria-label="Open Chat with Admin"
        >
          {/* Facebook Messenger Style Chat Glyph */}
          <svg
            className="w-7 h-7 fill-current"
            viewBox="0 0 28 28"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M14 2C7.373 2 2 7.025 2 13.225C2 16.74 3.738 19.866 6.46 21.848V25.5C6.46 25.86 6.8 26.11 7.15 25.96L10.98 24.32C11.95 24.59 12.96 24.74 14 24.74C20.627 24.74 26 19.715 26 13.515C26 7.025 20.627 2 14 2ZM15.22 17.15L12.02 13.73L5.78 17.15L12.64 9.87L15.93 13.29L22.08 9.87L15.22 17.15Z" />
          </svg>

          {/* Unread Message Counter Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold px-1.5 h-5 min-w-[20px] rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* 2. MINIMIZED DOCKED PILL (When user clicks '-' on the chat card) */}
      {isOpen && isMinimized && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="fixed bottom-4 right-4 z-50 h-12 px-3.5 bg-white dark:bg-[#242526] border border-slate-200 dark:border-[#393a3b] rounded-full shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#303031] transition-all select-none"
          onClick={() => setIsMinimized(false)}
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#0084ff] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              A
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#242526]" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              Admin
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none">
              Active now
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-full"
              title="Expand Chat"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-full"
              title="Close Chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. FACEBOOK MESSENGER WEB DESKTOP POPUP CARD */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[350px] md:w-[360px] h-[500px] max-h-[85vh] bg-[#242526] text-white rounded-2xl shadow-2xl border border-[#393a3b] overflow-hidden flex flex-col font-sans select-none"
            style={{
              boxShadow: "0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {/* Top Facebook-Style Chat Header */}
            <div className="h-14 px-3.5 bg-[#242526] border-b border-[#393a3b] flex items-center justify-between shrink-0 select-none">
              {/* Left Profile: Avatar + Name + Dropdown */}
              <div
                className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 py-1 px-1.5 rounded-xl transition-colors"
                onClick={() => {
                  toast.info("Property Administration", {
                    description: "Official boarding house management desk.",
                  });
                }}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-sm font-black text-white shadow-xs">
                    A
                  </div>
                  {/* Green Active Dot */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#242526]" />
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-extrabold text-[#e4e6eb] truncate max-w-[130px]">
                      Admin
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-[11px] text-[#22c55e] font-semibold leading-none">
                    Active now
                  </span>
                </div>
              </div>

              {/* Right Header Action Controls: Call, Video, Minus, Close */}
              <div className="flex items-center gap-0.5 text-[#b0b3b8]">
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Voice Call", {
                      description: "Calling Property Admin office...",
                    })
                  }
                  className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toast.info("Video Call", {
                      description: "Video calling office desk...",
                    })
                  }
                  className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Minimize Chat"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Close Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Message Feed (Facebook Messenger Dark Scheme) */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 space-y-2.5 bg-[#18191a]"
            >
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#b0b3b8]">
                  <div className="w-6 h-6 border-2 border-[#0084ff] border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs font-medium">Loading conversation...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#b0b3b8]">
                  <div className="w-12 h-12 rounded-full bg-[#242526] flex items-center justify-center text-[#0084ff] mb-2 shadow-xs">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#e4e6eb]">Message Admin</h4>
                  <p className="text-xs text-[#b0b3b8] mt-1 max-w-[200px]">
                    Have a question or request? Send a message to management.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isTenant = msg.sender_type === "tenant";
                  const isMaintenanceCard = msg.message?.startsWith("[MAINTENANCE_REQUEST");

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${
                        isTenant ? "items-end" : "items-start"
                      } space-y-0.5 group`}
                    >
                      <div
                        className={`flex items-end gap-1.5 max-w-[82%] ${
                          isTenant ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Other Party Small Round Avatar */}
                        {!isTenant && (
                          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mb-0.5">
                            A
                          </div>
                        )}

                        {/* Speech Bubble */}
                        <div
                          className={`px-3.5 py-2 text-[13px] leading-snug break-words rounded-[18px] ${
                            isTenant
                              ? "bg-[#0084ff] text-white rounded-br-sm shadow-xs"
                              : "bg-[#3a3b3c] text-[#e4e6eb] rounded-bl-sm shadow-xs"
                          }`}
                        >
                          {isMaintenanceCard ? (
                            <div className="space-y-1.5 py-0.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-85 border-b border-white/20 pb-1">
                                <Wrench className="w-3 h-3" />
                                <span>Maintenance Request</span>
                              </div>
                              <p className="font-semibold text-xs leading-relaxed">
                                {msg.message.replace(/^\[MAINTENANCE_REQUEST(#[0-9]+)?\]\s*/i, "")}
                              </p>
                              <Link
                                href="/tenant/rooms"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-200 hover:underline pt-0.5"
                              >
                                <span>Inspect in Rooms</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : (
                            <span>{msg.message}</span>
                          )}
                        </div>
                      </div>

                      {/* Message Timestamp / Status */}
                      <span className="text-[10px] text-[#b0b3b8]/70 px-2 font-medium">
                        {isTenant ? msg.status || "Sent" : ""} {formatTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action Chips (Above Composer) */}
            <div className="px-3 py-1.5 bg-[#242526] border-t border-[#393a3b] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] text-[11px] font-bold transition-colors cursor-pointer"
              >
                <Wrench className="w-3 h-3 text-[#0084ff]" />
                <span>Request Maintenance</span>
              </button>

              <span className="text-[10px] text-[#b0b3b8] font-mono">
                RentTrack Live Chat
              </span>
            </div>

            {/* Bottom Composer / Input Bar (Facebook Messenger Style) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 bg-[#242526] border-t border-[#393a3b] flex items-center gap-1.5 shrink-0"
            >
              {/* Media / Utility Icons */}
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(true)}
                className="p-2 text-[#0084ff] hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="File Maintenance Ticket"
              >
                <Wrench className="w-4 h-4" />
              </button>

              {/* Pill Input Container */}
              <div className="flex-1 relative flex items-center bg-[#3a3b3c] rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Aa"
                  className="w-full bg-transparent text-[13px] text-[#e4e6eb] placeholder-[#b0b3b8] outline-none font-normal"
                />
                <button
                  type="button"
                  onClick={() => setNewMessage((prev) => prev + " 😊")}
                  className="text-[#0084ff] hover:scale-110 transition-transform p-0.5 cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Action Button: Thumbs-up if empty, Send icon if text entered */}
              {newMessage.trim() ? (
                <button
                  type="submit"
                  disabled={isSending}
                  className="p-2 text-[#0084ff] hover:bg-white/10 rounded-full transition-colors cursor-pointer disabled:opacity-40"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage("👍")}
                  className="p-2 text-[#0084ff] hover:scale-110 transition-transform rounded-full cursor-pointer"
                  title="Send Thumbs Up"
                >
                  <ThumbsUp className="w-4 h-4 fill-current" />
                </button>
              )}
            </form>

            {/* Quick Maintenance Modal Popup within Chat */}
            {showMaintenanceModal && (
              <div className="absolute inset-0 z-50 bg-[#18191a]/95 backdrop-blur-xs flex flex-col p-4 text-white overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between pb-3 border-b border-[#393a3b]">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#0084ff]" />
                    <h3 className="text-sm font-bold text-[#e4e6eb]">
                      Quick Maintenance Report
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowMaintenanceModal(false)}
                    className="p-1 text-[#b0b3b8] hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleMaintenanceSubmit}
                  className="space-y-3 pt-3 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#b0b3b8] block mb-1">
                        Issue Title
                      </label>
                      <input
                        required
                        type="text"
                        value={maintTitle}
                        onChange={(e) => setMaintTitle(e.target.value)}
                        placeholder="e.g. Leaking faucet, broken light"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#3a3b3c] border border-[#4e4f50] text-[#e4e6eb] placeholder-[#b0b3b8] outline-none focus:border-[#0084ff]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-[#b0b3b8] block mb-1">
                          Category
                        </label>
                        <select
                          value={maintCategory}
                          onChange={(e) => setMaintCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[#3a3b3c] border border-[#4e4f50] text-[#e4e6eb] outline-none"
                        >
                          <option value="Plumbing">Plumbing</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Appliance">Appliance</option>
                          <option value="Carpentry">Carpentry</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#b0b3b8] block mb-1">
                          Priority
                        </label>
                        <select
                          value={maintPriority}
                          onChange={(e) => setMaintPriority(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[#3a3b3c] border border-[#4e4f50] text-[#e4e6eb] outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#b0b3b8] block mb-1">
                        Details
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={maintDesc}
                        onChange={(e) => setMaintDesc(e.target.value)}
                        placeholder="Describe the problem..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#3a3b3c] border border-[#4e4f50] text-[#e4e6eb] placeholder-[#b0b3b8] outline-none focus:border-[#0084ff]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMaintenanceModal(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingMaint}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#0084ff] hover:bg-[#0073e6] text-white cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingMaint ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

