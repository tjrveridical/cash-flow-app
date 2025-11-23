"use client";

import { useState } from "react";
import { PaymentRuleWithVendor } from "@/lib/types/payment-rules";
import { formatPaymentSchedule } from "@/lib/types/payment-rules";
import { EditRuleModal } from "./EditRuleModal";

interface VendorRulesTableProps {
  rules: PaymentRuleWithVendor[];
  onDataChange: () => void;
}

export function VendorRulesTable({ rules, onDataChange }: VendorRulesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRule, setEditingRule] = useState<PaymentRuleWithVendor | null>(null);

  const filteredRules = rules.filter((rule) =>
    rule.vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleDelete(ruleId: string) {
    if (!confirm("Are you sure you want to delete this payment rule?")) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-rules/${ruleId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        onDataChange();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert("Failed to delete rule");
    }
  }

  const formatAmount = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatExceptionRule = (rule: string) => {
    return rule === "move_earlier" ? "Move Earlier" : "Move Later";
  };

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vendors..."
          className="max-w-md px-3 py-2 border border-[#1e3a1e]/12 rounded-lg text-sm bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-3 focus:ring-[#2d5a2d]/10 transition-all"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-br from-[rgba(248,250,249,0.9)] to-[rgba(248,250,249,0.7)] border-b border-[#1e3a1e]/8">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Exception Rule
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                  {searchQuery ? "No vendors match your search" : "No payment rules created yet"}
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-[#1e3a1e]/4 hover:bg-[rgba(45,90,45,0.02)] transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm font-semibold text-slate-900">
                    {rule.vendor.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-mono text-[#2d5a2d] font-medium">
                      {formatPaymentSchedule(rule)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-mono font-semibold text-emerald-600">
                      {formatAmount(rule.estimated_amount)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[rgba(45,90,45,0.08)] text-[#2d5a2d] text-[10px] font-semibold uppercase tracking-wide">
                      {formatExceptionRule(rule.exception_rule)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-[#1e3a1e]/12 bg-white/80 hover:bg-white hover:border-[#1e3a1e]/20 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => {
            setEditingRule(null);
            onDataChange();
          }}
        />
      )}
    </>
  );
}
