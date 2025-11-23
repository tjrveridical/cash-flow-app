"use client";

import { useState } from "react";
import { Vendor } from "@/lib/types/payment-rules";

interface CreateVendorModalProps {
  initialName?: string;
  onClose: () => void;
  onSuccess: (vendor: Vendor) => void;
}

export function CreateVendorModal({ initialName = "", onClose, onSuccess }: CreateVendorModalProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.vendor);
      } else {
        setError(data.error || "Failed to create vendor");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#1e3a1e]/8 max-w-md w-full p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#1e3a1e]/8">
          <h2 className="text-xl font-semibold text-[#1e3a1e]">Create Vendor</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-600 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Vendor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter vendor name"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-[#1e3a1e]/15 rounded-lg bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
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
              {loading ? "Creating..." : "Create Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
