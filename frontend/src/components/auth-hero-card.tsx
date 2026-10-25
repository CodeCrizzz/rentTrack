"use client";

import React from "react";
import { Home, CreditCard, Wrench, MessageSquare } from "lucide-react";

export default function AuthHeroCard({ className = "" }: { className?: string }) {
  const features = [
    {
      icon: Home,
      title: "Room Management",
      description: "Track occupancy and room status",
    },
    {
      icon: CreditCard,
      title: "Easy Payments",
      description: "Simplify billing and collections",
    },
    {
      icon: Wrench,
      title: "Maintenance Tracking",
      description: "Resolve issues faster",
    },
    {
      icon: MessageSquare,
      title: "Better Communication",
      description: "Stay connected with your tenants",
    },
  ];

  return (
    <div className={`relative w-full md:w-[420px] lg:w-[450px] shrink-0 bg-[#061834] p-7 sm:p-9 text-white flex flex-col justify-between overflow-hidden ${className}`}>
      {/* Decorative Wave Accent in bottom right corner */}
      <svg
        className="absolute bottom-0 right-0 w-[80%] h-auto pointer-events-none select-none z-0"
        viewBox="0 0 340 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 180C55 140 115 165 175 125C235 85 285 105 340 45V180H0Z"
          fill="url(#auth-wave-grad)"
        />
        <defs>
          <linearGradient
            id="auth-wave-grad"
            x1="0"
            y1="180"
            x2="340"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#0052cc" stopOpacity="0.85" />
            <stop offset="1" stopColor="#0099ff" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Section */}
      <div className="relative z-10 flex flex-col">
        {/* Brand Header */}
        <div className="flex items-center gap-3 select-none">
          <img
            src="/images/logo/rentTrack_icon.png"
            alt="RentTrack"
            className="w-11 h-11 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
              RentTrack
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-blue-200/70 leading-tight">
              Boarding House Management System
            </span>
          </div>
        </div>

        {/* Hero Title & Pitch */}
        <div className="mt-8 sm:mt-10 mb-2">
          <h1 className="text-2xl sm:text-[28px] font-black tracking-tight leading-[1.25] text-white">
            Smarter Management,
            <br />
            <span className="text-[#00a8ff]">Better Living.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-3 max-w-sm">
            Easily manage your boarding house, track payments, and keep your
            residents happy — all in one place.
          </p>
        </div>

        {/* Feature List */}
        <div className="mt-7 sm:mt-8 space-y-4 sm:space-y-4.5">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-full bg-[#0d2a58] border border-blue-400/25 flex items-center justify-center text-[#38bdf8] shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <feat.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {feat.title}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-300/80 font-normal leading-tight mt-0.5">
                  {feat.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="relative z-10 pt-8 sm:pt-10">
        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide">
          Your Property. Our Priority.
        </p>
      </div>
    </div>
  );
}
