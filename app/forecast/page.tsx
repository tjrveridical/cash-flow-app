"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ControlsBar } from "./components/ControlsBar";
import { ForecastGrid } from "./components/ForecastGrid";
import { SetBeginningCashModal } from "./components/SetBeginningCashModal";

export default function ForecastPage() {
  const router = useRouter();
  const [showBeginningCashModal, setShowBeginningCashModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaveBeginningCash = async (data: { as_of_date: string; balance: number; notes?: string }) => {
    try {
      const response = await fetch("/api/cash-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save beginning cash");
      }

      // Close modal
      setShowBeginningCashModal(false);

      // Refresh the grid by incrementing key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error saving beginning cash:", error);
      throw error; // Re-throw to let modal handle error display
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[20px] border-b border-[#1e3a1e]/8 px-6 py-3.5 sticky top-0 z-10 shadow-sm shadow-[#1e3a1e]/4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-semibold bg-gradient-to-br from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
            Cash Flow
          </h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-xs font-medium text-slate-700 bg-white/80 backdrop-blur-sm border border-[#1e3a1e]/10 rounded-lg hover:bg-white/95 hover:border-[#1e3a1e]/15 hover:shadow-sm transition-all">
              Export
            </button>
            <button
              onClick={() => setShowBeginningCashModal(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all"
            >
              Set Beginning Cash
            </button>
            <button
              onClick={() => router.push("/forecast-items")}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all"
            >
              Manage Expenses
            </button>
            <div className="bg-gradient-to-br from-[#1e3a1e] to-[#2d5a2d] text-white/90 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide shadow-sm">
              CFO
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <ControlsBar />

      {/* Forecast Grid */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-xl shadow-lg shadow-[#1e3a1e]/4 border border-[#1e3a1e]/8 overflow-hidden">
          <ForecastGrid key={refreshKey} />
        </div>
      </div>

      {/* Set Beginning Cash Modal */}
      {showBeginningCashModal && (
        <SetBeginningCashModal
          onClose={() => setShowBeginningCashModal(false)}
          onSave={handleSaveBeginningCash}
        />
      )}
    </div>
  );
}
