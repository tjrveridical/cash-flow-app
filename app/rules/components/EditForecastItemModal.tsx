"use client";

import { useState, useEffect } from "react";
import { ForecastItemWithRule, PaymentRule } from "@/lib/types/forecast";

interface EditForecastItemModalProps {
  item: ForecastItemWithRule;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditForecastItemModal({ item, onClose, onSuccess }: EditForecastItemModalProps) {
  const [paymentRules, setPaymentRules] = useState<PaymentRule[]>([]);
  const [vendorName, setVendorName] = useState(item.vendor_name);
  const [estimatedAmount, setEstimatedAmount] = useState(item.estimated_amount.toString());
  const [ruleId, setRuleId] = useState(item.rule_id);
  const [notes, setNotes] = useState(item.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPaymentRules();
  }, []);

  async function loadPaymentRules() {
    try {
      const res = await fetch("/api/payment-rules");
      const data = await res.json();
      if (data.success) {
        setPaymentRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error loading payment rules:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!vendorName.trim()) {
      setError("Please enter a vendor name");
      return;
    }

    const amount = parseFloat(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!ruleId) {
      setError("Please select a payment rule");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/forecast-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: vendorName.trim(),
          estimated_amount: amount,
          rule_id: ruleId,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Failed to update forecast item");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#1e3a1e]/8 max-w-2xl w-full p-7 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#1e3a1e]/8">
          <h2 className="text-xl font-semibold text-[#1e3a1e]">Edit Forecast Item</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-600 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g., Amazon Web Services"
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Estimated Amount
              </label>
              <input
                type="number"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Payment Rule
            </label>
            <select
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
            >
              <option value="">Select payment rule...</option>
              {paymentRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.rule_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this forecast item..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all resize-vertical"
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-[#1e3a1e]/12 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:from-[#1e3a1e] hover:to-[#2d5a2d] shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Forecast Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
