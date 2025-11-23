"use client";

import { useState, useEffect } from "react";
import { VendorRulesTable } from "./components/VendorRulesTable";
import { NoRuleVendorsTable } from "./components/NoRuleVendorsTable";
import { CreateRuleModal } from "./components/CreateRuleModal";
import { PaymentRuleWithVendor, UnassignedTransaction } from "@/lib/types/payment-rules";

export default function PaymentRulesPage() {
  const [activeTab, setActiveTab] = useState<"vendor-rules" | "no-rule-vendors">("vendor-rules");
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [rules, setRules] = useState<PaymentRuleWithVendor[]>([]);
  const [unassignedTransactions, setUnassignedTransactions] = useState<UnassignedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load payment rules
      const rulesRes = await fetch("/api/payment-rules");
      const rulesData = await rulesRes.json();
      if (rulesData.success) {
        setRules(rulesData.rules);
      }

      // Load unassigned transactions
      const unassignedRes = await fetch("/api/vendor-assignments/unassigned");
      const unassignedData = await unassignedRes.json();
      if (unassignedData.success) {
        setUnassignedTransactions(unassignedData.transactions);
      }
    } catch (error) {
      console.error("Error loading data:", error);
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
            Payment Rules Management
          </h1>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowCreateRuleModal(true)}
              className="px-4 py-2 bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white rounded-lg text-sm font-medium hover:from-[#1e3a1e] hover:to-[#2d5a2d] transition-all shadow-sm"
            >
              Create Rule
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
          {/* Tabs */}
          <div className="flex border-b border-[#1e3a1e]/8 bg-gradient-to-br from-[rgba(45,90,45,0.03)] to-[rgba(45,90,45,0.01)]">
            <button
              onClick={() => setActiveTab("vendor-rules")}
              className={`px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === "vendor-rules"
                  ? "text-[#2d5a2d] font-semibold"
                  : "text-slate-500 hover:bg-[rgba(45,90,45,0.05)]"
              }`}
            >
              Vendor Rules ({rules.length})
              {activeTab === "vendor-rules" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2d5a2d] to-[#3d6b3d]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("no-rule-vendors")}
              className={`px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === "no-rule-vendors"
                  ? "text-[#2d5a2d] font-semibold"
                  : "text-slate-500 hover:bg-[rgba(45,90,45,0.05)]"
              }`}
            >
              No Rule Vendors ({unassignedTransactions.length})
              {activeTab === "no-rule-vendors" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2d5a2d] to-[#3d6b3d]"></div>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-600 text-sm">Loading...</div>
              </div>
            ) : activeTab === "vendor-rules" ? (
              <VendorRulesTable rules={rules} onDataChange={loadData} />
            ) : (
              <NoRuleVendorsTable transactions={unassignedTransactions} onDataChange={loadData} />
            )}
          </div>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateRuleModal && (
        <CreateRuleModal onClose={() => setShowCreateRuleModal(false)} onSuccess={loadData} />
      )}
    </div>
  );
}
