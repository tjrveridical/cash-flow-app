"use client";

import { useState, useEffect } from "react";
import { Vendor, PaymentFrequency, PaymentRuleWithVendor } from "@/lib/types/payment-rules";

interface CreateRuleModalProps {
  prefilledVendorId?: string;
  prefilledAmount?: number;
  onClose: () => void;
  onSuccess: (rule: PaymentRuleWithVendor) => void;
}

export function CreateRuleModal({
  prefilledVendorId,
  prefilledAmount,
  onClose,
  onSuccess,
}: CreateRuleModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState(prefilledVendorId || "");
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [anchorDays, setAnchorDays] = useState("1");
  const [exceptionRule, setExceptionRule] = useState<"move_earlier" | "move_later">("move_later");
  const [estimatedAmount, setEstimatedAmount] = useState(prefilledAmount?.toString() || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
    }
  }

  function getAnchorDaysPlaceholder() {
    switch (frequency) {
      case "weekly":
        return "0-6 (0=Sunday, 6=Saturday)";
      case "semi-monthly":
        return "1,15 (two dates)";
      case "monthly":
      case "quarterly":
        return "1-31";
      case "semi-annual":
        return "1,15 (month,day)";
      case "annual":
        return "12,1 (month,day)";
      default:
        return "Enter anchor days";
    }
  }

  function parseAnchorDays(input: string): number[] {
    return input
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!vendorId) {
      setError("Please select a vendor");
      return;
    }

    const parsedAnchorDays = parseAnchorDays(anchorDays);
    if (parsedAnchorDays.length === 0) {
      setError("Please enter valid anchor days");
      return;
    }

    const amount = parseFloat(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/payment-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vendorId,
          frequency,
          anchor_days: parsedAnchorDays,
          exception_rule: exceptionRule,
          estimated_amount: amount,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.rule);
      } else {
        setError(data.error || "Failed to create payment rule");
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
          <h2 className="text-xl font-semibold text-[#1e3a1e]">Create Payment Rule</h2>
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
                Vendor
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              >
                <option value="weekly">Weekly</option>
                <option value="semi-monthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Anchor Day(s)
              </label>
              <input
                type="text"
                value={anchorDays}
                onChange={(e) => setAnchorDays(e.target.value)}
                placeholder={getAnchorDaysPlaceholder()}
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Exception Rule
              </label>
              <select
                value={exceptionRule}
                onChange={(e) => setExceptionRule(e.target.value as "move_earlier" | "move_later")}
                className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
              >
                <option value="move_later">Move Later</option>
                <option value="move_earlier">Move Earlier</option>
              </select>
              <div className="text-[10px] text-slate-400 italic mt-1">
                If anchor day is on weekend/holiday
              </div>
            </div>
          </div>

          <div className="mb-5">
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

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this payment rule..."
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
              {loading ? "Creating..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
