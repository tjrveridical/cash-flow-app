"use client";

import { useState, useEffect } from "react";
import { UnassignedTransaction, Vendor, PaymentRuleWithVendor } from "@/lib/types/payment-rules";
import { CreateVendorModal } from "./CreateVendorModal";
import { CreateRuleModal } from "./CreateRuleModal";

interface NoRuleVendorsTableProps {
  transactions: UnassignedTransaction[];
  onDataChange: () => void;
}

interface RowState {
  selectedVendorId: string | null;
  selectedRuleId: string | null;
  searchQuery: string;
  showResults: boolean;
  isNewVendor: boolean;
}

export function NoRuleVendorsTable({ transactions, onDataChange }: NoRuleVendorsTableProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rules, setRules] = useState<PaymentRuleWithVendor[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [prefilledAmount, setPrefilledAmount] = useState<number>(0);

  useEffect(() => {
    loadVendorsAndRules();
  }, []);

  async function loadVendorsAndRules() {
    try {
      const [vendorsRes, rulesRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/payment-rules"),
      ]);

      const vendorsData = await vendorsRes.json();
      const rulesData = await rulesRes.json();

      if (vendorsData.success) setVendors(vendorsData.vendors);
      if (rulesData.success) setRules(rulesData.rules);
    } catch (error) {
      console.error("Error loading vendors/rules:", error);
    }
  }

  function getRowState(txId: string): RowState {
    return (
      rowStates[txId] || {
        selectedVendorId: null,
        selectedRuleId: null,
        searchQuery: "",
        showResults: false,
        isNewVendor: false,
      }
    );
  }

  function updateRowState(txId: string, updates: Partial<RowState>) {
    setRowStates((prev) => ({
      ...prev,
      [txId]: { ...getRowState(txId), ...updates },
    }));
  }

  function getVendorRules(vendorId: string | null) {
    if (!vendorId) return [];
    return rules.filter((r) => r.vendor_id === vendorId);
  }

  async function handleAssign(transactionId: string) {
    const state = getRowState(transactionId);

    if (!state.selectedVendorId) {
      alert("Please select a vendor first");
      return;
    }

    try {
      const res = await fetch("/api/vendor-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          vendor_id: state.selectedVendorId,
          payment_rule_id: state.selectedRuleId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onDataChange();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error assigning vendor:", error);
      alert("Failed to assign vendor");
    }
  }

  function getTransactionDetails(tx: UnassignedTransaction) {
    // Preference: description (column F) > name (column E)
    const primary = tx.description || tx.name || "";
    const secondary = tx.description && tx.name ? tx.name : "";
    return { primary, secondary };
  }

  const formatAmount = (amount: number) => {
    const abs = Math.abs(amount);
    return `-$${abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredVendors = (txId: string) => {
    const query = getRowState(txId).searchQuery.toLowerCase();
    return vendors.filter((v) => v.name.toLowerCase().includes(query));
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-br from-[rgba(248,250,249,0.9)] to-[rgba(248,250,249,0.7)] border-b border-[#1e3a1e]/8">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider w-[32%]">
                Transaction Details
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider w-[10%]">
                Amount
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider w-[20%]">
                Assign to Vendor
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wider w-[20%]">
                Payment Rule
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-700 uppercase tracking-wider w-[18%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                  No unassigned transactions
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const { primary, secondary } = getTransactionDetails(tx);
                const state = getRowState(tx.id);
                const vendorRules = getVendorRules(state.selectedVendorId);
                const selectedVendor = vendors.find((v) => v.id === state.selectedVendorId);

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-[#1e3a1e]/4 hover:bg-[rgba(45,90,45,0.02)] transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5 max-w-md">
                        {primary && (
                          <div className="font-mono text-xs font-semibold text-slate-900 truncate">
                            {primary}
                          </div>
                        )}
                        {secondary && (
                          <div className="font-mono text-[11px] text-slate-500 truncate">
                            {secondary}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-mono font-semibold text-red-600">
                        {formatAmount(tx.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="relative">
                        <input
                          type="text"
                          value={state.selectedVendorId ? selectedVendor?.name || "" : state.searchQuery}
                          onChange={(e) =>
                            updateRowState(tx.id, {
                              searchQuery: e.target.value,
                              showResults: true,
                              selectedVendorId: null,
                            })
                          }
                          onFocus={() => updateRowState(tx.id, { showResults: true })}
                          placeholder="Start typing..."
                          readOnly={!!state.selectedVendorId}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#1e3a1e]/12 rounded-md bg-white/80 focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/10 transition-all"
                        />
                        {state.showResults && !state.selectedVendorId && state.searchQuery && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#1e3a1e]/12 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                            {filteredVendors(tx.id).map((vendor) => (
                              <div
                                key={vendor.id}
                                onClick={() => {
                                  updateRowState(tx.id, {
                                    selectedVendorId: vendor.id,
                                    showResults: false,
                                    isNewVendor: false,
                                  });
                                }}
                                className="px-2.5 py-2 text-xs text-slate-700 hover:bg-[rgba(45,90,45,0.05)] cursor-pointer"
                              >
                                {vendor.name}
                              </div>
                            ))}
                            <div
                              onClick={() => {
                                setNewVendorName(state.searchQuery);
                                setCurrentTransactionId(tx.id);
                                setShowCreateVendorModal(true);
                              }}
                              className="px-2.5 py-2 text-xs text-[#2d5a2d] font-semibold border-t border-[#1e3a1e]/8 hover:bg-[rgba(45,90,45,0.05)] cursor-pointer"
                            >
                              + Create &quot;{state.searchQuery}&quot;
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                          {state.selectedVendorId ? "✓ Vendor selected" : "Search or create vendor"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {!state.selectedVendorId ? (
                        <div className="text-[10px] text-slate-400 italic">Select vendor first</div>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {vendorRules.map((rule) => (
                            <button
                              key={rule.id}
                              onClick={() => updateRowState(tx.id, { selectedRuleId: rule.id })}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                                state.selectedRuleId === rule.id
                                  ? "bg-[rgba(45,90,45,0.08)] text-[#2d5a2d] border-[#2d5a2d]"
                                  : "bg-white/80 text-slate-600 border-[#1e3a1e]/12 hover:border-[#1e3a1e]/20"
                              }`}
                            >
                              {rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1)}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setCurrentTransactionId(tx.id);
                              setPrefilledAmount(Math.abs(tx.amount));
                              setShowCreateRuleModal(true);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                              state.isNewVendor
                                ? "bg-emerald-50 text-emerald-700 border-emerald-600"
                                : "bg-emerald-50/50 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            + New Rule
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAssign(tx.id)}
                          disabled={!state.selectedVendorId}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            state.selectedVendorId
                              ? state.isNewVendor || !state.selectedRuleId
                                ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-sm"
                                : "bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] text-white hover:from-[#1e3a1e] hover:to-[#2d5a2d] shadow-sm"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-40"
                          }`}
                        >
                          {state.isNewVendor || !state.selectedRuleId ? "Assign & Create" : "Assign"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateVendorModal && (
        <CreateVendorModal
          initialName={newVendorName}
          onClose={() => {
            setShowCreateVendorModal(false);
            setNewVendorName("");
            setCurrentTransactionId(null);
          }}
          onSuccess={(vendor) => {
            setVendors([...vendors, vendor]);
            if (currentTransactionId) {
              updateRowState(currentTransactionId, {
                selectedVendorId: vendor.id,
                showResults: false,
                isNewVendor: true,
              });
            }
            setShowCreateVendorModal(false);
            setNewVendorName("");
            setCurrentTransactionId(null);
          }}
        />
      )}

      {showCreateRuleModal && currentTransactionId && (
        <CreateRuleModal
          prefilledVendorId={getRowState(currentTransactionId).selectedVendorId || undefined}
          prefilledAmount={prefilledAmount}
          onClose={() => {
            setShowCreateRuleModal(false);
            setCurrentTransactionId(null);
            setPrefilledAmount(0);
          }}
          onSuccess={(rule) => {
            setRules([...rules, rule]);
            if (currentTransactionId) {
              updateRowState(currentTransactionId, { selectedRuleId: rule.id });
            }
            setShowCreateRuleModal(false);
            setCurrentTransactionId(null);
            setPrefilledAmount(0);
          }}
        />
      )}
    </>
  );
}
