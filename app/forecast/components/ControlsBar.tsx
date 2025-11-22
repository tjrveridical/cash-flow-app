"use client";

import { useState } from "react";

interface ControlsBarProps {
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

export function ControlsBar({ onDateRangeChange }: ControlsBarProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] border-b border-[#1e3a1e]/8 px-6 py-3 flex justify-between items-center">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all ${
            activeFilter === "all"
              ? "bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white shadow-md shadow-[#2d5a2d]/30"
              : "bg-white/70 text-slate-600 border border-[#1e3a1e]/8 hover:bg-white/90"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter("actuals")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all ${
            activeFilter === "actuals"
              ? "bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white shadow-md shadow-[#2d5a2d]/30"
              : "bg-white/70 text-slate-600 border border-[#1e3a1e]/8 hover:bg-white/90"
          }`}
        >
          Actuals
        </button>
        <button
          onClick={() => setActiveFilter("forecast")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wide transition-all ${
            activeFilter === "forecast"
              ? "bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white shadow-md shadow-[#2d5a2d]/30"
              : "bg-white/70 text-slate-600 border border-[#1e3a1e]/8 hover:bg-white/90"
          }`}
        >
          Forecast
        </button>
      </div>
      <div className="text-xs text-slate-500 font-medium">
        Showing 26 weeks • Last updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
