"use client";

import { useEffect } from "react";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: string;
  weekEnding: string;
  amount: number;
  transactions?: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
}

export function DetailModal({
  isOpen,
  onClose,
  title,
  category,
  weekEnding,
  amount,
  transactions = [],
}: DetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-white via-white to-slate-50 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden border border-[#1e3a1e]/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1e3a1e] to-[#2d5a2d] px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/80 mt-0.5">
              Week Ending {new Date(weekEnding).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-medium text-slate-600">Category:</span>
              <span className="text-base font-semibold text-slate-900">{category}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-slate-600">Total Amount:</span>
              <span className={`text-2xl font-bold ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {amount >= 0 ? "" : "("}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{amount < 0 ? ")" : ""}
              </span>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Transactions ({transactions.length})
              </h4>
              <div className="space-y-2">
                {transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-3 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {tx.amount >= 0 ? "" : "("}${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{tx.amount < 0 ? ")" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No transactions available for this period.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/60 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg transition-all">
            Edit Rule
          </button>
        </div>
      </div>
    </div>
  );
}
