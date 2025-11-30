"use client";

import { useState, useEffect } from "react";
import { ForecastItemsTable } from "./components/ForecastItemsTable";
import { CreateForecastItemModal } from "./components/CreateForecastItemModal";
import { ForecastItemWithRule } from "@/lib/types/forecast";

export default function PaymentRulesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [forecastItems, setForecastItems] = useState<ForecastItemWithRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/forecast-items");
      const data = await res.json();
      if (data.success) {
        setForecastItems(data.items);
      }
    } catch (error) {
      console.error("Error loading forecast items:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[20px] border-b border-[#1e3a1e]/8 px-6 py-3.5 sticky top-0 z-10 shadow-sm shadow-[#1e3a1e]/4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-semibold bg-gradient-to-br from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
            Cash Flow Items
          </h1>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white rounded-lg text-sm font-medium hover:from-[#1e3a1e] hover:to-[#2d5a2d] transition-all shadow-sm"
            >
              Create Forecast Item
            </button>
            <div className="px-3 py-1.5 bg-gradient-to-br from-[#1e3a1e] to-[#2d5a2d] text-white/90 rounded-md text-[11px] font-semibold uppercase tracking-wider shadow-sm">
              CFO
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-5 max-w-[1600px] mx-auto">
        <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-xl border border-[#1e3a1e]/8 shadow-lg overflow-hidden">
          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-600 text-sm">Loading...</div>
              </div>
            ) : (
              <ForecastItemsTable items={forecastItems} onDataChange={loadData} />
            )}
          </div>
        </div>
      </div>

      {/* Create Forecast Item Modal */}
      {showCreateModal && (
        <CreateForecastItemModal onClose={() => setShowCreateModal(false)} onSuccess={loadData} />
      )}
    </div>
  );
}
