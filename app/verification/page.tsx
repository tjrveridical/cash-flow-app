"use client";

import { useEffect, useState } from "react";

interface UnverifiedTransaction {
  id: string;
  transactionId: string;
  date: string;
  vendor: string;
  amount: number;
  description: string;
  source: string;
  transactionType: string;
  qbAccountName: string;
  categoryCode: string;
  displayGroup: string;
  displayLabel: string;
  displayLabel2: string | null;
  cashDirection: string;
  classification: string;
  classificationSource: string;
  confidenceScore: number | null;
  notes: string | null;
  classifiedAt: string;
}

interface Stats {
  pendingCount: number;
  totalAmount: number;
  needsClassification: number;
}

export default function VerificationPage() {
  const [transactions, setTransactions] = useState<UnverifiedTransaction[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, totalAmount: 0, needsClassification: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnverifiedTransactions();
  }, []);

  const fetchUnverifiedTransactions = async () => {
    try {
      const response = await fetch("/api/verification/unverified");
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching unverified transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return amount < 0 ? `($${formatted})` : `$${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6] flex items-center justify-center">
        <div className="text-slate-600 text-sm">Loading verification inbox...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[20px] border-b border-[#1e3a1e]/8 px-6 py-3.5 sticky top-0 z-10 shadow-sm shadow-[#1e3a1e]/4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-semibold bg-gradient-to-br from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
            Verification Inbox
          </h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-xs font-medium text-slate-700 bg-white/80 backdrop-blur-sm border border-[#1e3a1e]/10 rounded-lg hover:bg-white/95 hover:border-[#1e3a1e]/15 hover:shadow-sm transition-all">
              Export
            </button>
            <button className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all">
              Verify All
            </button>
            <div className="bg-gradient-to-br from-[#1e3a1e] to-[#2d5a2d] text-white/90 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide shadow-sm">
              CFO
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-[1fr_280px] gap-6 p-4 max-w-[1400px] mx-auto">
        {/* Left Panel - Transactions Table */}
        <div className="overflow-hidden">
          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-2xl border border-[#1e3a1e]/8 shadow-lg shadow-[#1e3a1e]/4 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-br from-[#2d5a2d]/3 to-[#2d5a2d]/1 px-5 py-4 border-b border-[#1e3a1e]/8 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a1e]">Pending Transactions</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} awaiting verification
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-br from-[#f8faf9]/90 to-[#f8faf9]/70">
                    <th className="px-3 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === transactions.length && transactions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-2 border-[#1e3a1e]/30 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:text-[#2d5a2d]">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:text-[#2d5a2d]">
                      Vendor
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:text-[#2d5a2d]">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      Classification
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      Source
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b border-[#1e3a1e]/4 hover:bg-gradient-to-br hover:from-[#f0f8f2]/30 hover:to-[#f0f8f2]/10 transition-all ${
                        selectedIds.has(tx.id) ? "bg-gradient-to-br from-blue-50/60 to-blue-50/30 border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          className="w-4 h-4 rounded border-2 border-[#1e3a1e]/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-700">{formatDate(tx.date)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-800 hover:text-[#2d5a2d] cursor-help max-w-[220px] truncate" title={tx.description}>
                        {tx.vendor}
                      </td>
                      <td className={`px-3 py-2 text-sm font-semibold text-right ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5 items-center">
                          <span className="bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-purple-200/50">
                            {tx.displayGroup}
                          </span>
                          <span className="bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-amber-200/50">
                            {tx.displayLabel}
                          </span>
                          {tx.displayLabel2 && (
                            <span className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-blue-200/50">
                              {tx.displayLabel2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide border border-slate-200/50">
                          {tx.classificationSource}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button className="px-3 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-br from-green-600 to-green-700 rounded-md hover:from-green-700 hover:to-green-800 hover:shadow-lg hover:shadow-green-600/25 transition-all">
                            Verify
                          </button>
                          <button className="px-3 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-br from-amber-500 to-amber-600 rounded-md hover:from-amber-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {transactions.length === 0 && (
              <div className="px-5 py-12 text-center">
                <div className="text-slate-400 text-sm">No pending transactions to verify</div>
                <div className="text-slate-300 text-xs mt-1">All transactions have been verified</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div className="flex flex-col gap-4">
          {/* Stats Cards */}
          <div className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-[20px] px-4 py-4 rounded-xl border border-[#1e3a1e]/6 relative overflow-hidden hover:shadow-xl hover:shadow-[#1e3a1e]/8 hover:border-[#1e3a1e]/12 hover:-translate-y-1 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e] rounded-t-xl" />
            <div className="text-2xl font-bold text-[#1e3a1e] mb-1">{stats.pendingCount}</div>
            <div className="text-sm text-slate-500 font-medium">Pending Review</div>
          </div>

          <div className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-[20px] px-4 py-4 rounded-xl border border-[#1e3a1e]/6 relative overflow-hidden hover:shadow-xl hover:shadow-[#1e3a1e]/8 hover:border-[#1e3a1e]/12 hover:-translate-y-1 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e] rounded-t-xl" />
            <div className="text-2xl font-bold text-[#2d5a2d] mb-1">{formatCurrency(stats.totalAmount)}</div>
            <div className="text-sm text-slate-500 font-medium">Total Amount</div>
          </div>

          <div className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-[20px] px-4 py-4 rounded-xl border border-[#1e3a1e]/6 relative overflow-hidden hover:shadow-xl hover:shadow-[#1e3a1e]/8 hover:border-[#1e3a1e]/12 hover:-translate-y-1 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e] rounded-t-xl" />
            <div className="text-2xl font-bold text-red-600 mb-1">{stats.needsClassification}</div>
            <div className="text-sm text-slate-500 font-medium">Needs Classification</div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] px-4 py-4 rounded-xl border border-[#1e3a1e]/8 shadow-lg shadow-[#1e3a1e]/8">
              <div className="text-sm font-semibold text-[#1e3a1e] mb-3">
                {selectedIds.size} selected
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 hover:shadow-lg hover:shadow-green-600/25 transition-all">
                  Verify Selected
                </button>
                <button className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 border border-[#1e3a1e]/10 rounded-lg hover:bg-white/95 hover:border-[#1e3a1e]/15 hover:shadow-sm transition-all">
                  Bulk Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
