"use client";

import { useState, useEffect, Fragment } from "react";
import { Combobox, Transition } from "@headlessui/react";

interface VerifiedTransaction {
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
  verifiedAt: string;
  verifiedBy: string;
}

interface Category {
  category_code: string;
  display_group: string;
  display_label: string;
  display_label2: string | null;
}

interface EditLedgerModalProps {
  transaction: VerifiedTransaction | null;
  onClose: () => void;
  onSave: (edits: any, reason: string) => Promise<void>;
}

export function EditLedgerModal({ transaction, onClose, onSave }: EditLedgerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    vendor: "",
    amount: 0,
    date: "",
    categoryCode: "",
  });
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setFormData({
        vendor: transaction.vendor,
        amount: transaction.amount,
        date: transaction.date,
        categoryCode: transaction.categoryCode,
      });
      fetchCategories();
    }
  }, [transaction]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/verification/categories");
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      } else {
        console.error("Failed to fetch categories:", data.error);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError("Reason for edit is required");
      return;
    }

    // Check if anything changed
    const changes: any = {};
    if (formData.vendor !== transaction?.vendor) changes.vendor = formData.vendor;
    if (formData.amount !== transaction?.amount) changes.amount = formData.amount;
    if (formData.date !== transaction?.date) changes.date = formData.date;
    if (formData.categoryCode !== transaction?.categoryCode) changes.category_code = formData.categoryCode;

    if (Object.keys(changes).length === 0) {
      setError("No changes detected");
      return;
    }

    setLoading(true);

    try {
      await onSave(changes, reason);
      onClose();
    } catch (err) {
      setError("Failed to update transaction");
      console.error("Error saving:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatCategoryLabel = (cat: Category) => {
    if (cat.display_label2) {
      return `${cat.display_group} > ${cat.display_label} > ${cat.display_label2}`;
    }
    return `${cat.display_group} > ${cat.display_label}`;
  };

  // Get changes for preview
  const getChanges = () => {
    const changes = [];
    if (formData.vendor !== transaction?.vendor) {
      changes.push({ field: "Vendor", old: transaction?.vendor, new: formData.vendor });
    }
    if (formData.amount !== transaction?.amount) {
      changes.push({
        field: "Amount",
        old: formatCurrency(transaction?.amount || 0),
        new: formatCurrency(formData.amount),
      });
    }
    if (formData.date !== transaction?.date) {
      changes.push({
        field: "Date",
        old: formatDate(transaction?.date || ""),
        new: formatDate(formData.date),
      });
    }
    if (formData.categoryCode !== transaction?.categoryCode) {
      const oldCat = categories.find((c) => c.category_code === transaction?.categoryCode);
      const newCat = categories.find((c) => c.category_code === formData.categoryCode);
      changes.push({
        field: "Category",
        old: oldCat ? formatCategoryLabel(oldCat) : transaction?.categoryCode || "",
        new: newCat ? formatCategoryLabel(newCat) : formData.categoryCode,
      });
    }
    return changes;
  };

  // Filter categories based on search query
  const filteredCategories =
    query === ""
      ? categories
      : categories.filter((cat) => {
          const label = formatCategoryLabel(cat).toLowerCase();
          return label.includes(query.toLowerCase());
        });

  if (!transaction) return null;

  const changes = getChanges();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-3xl w-full p-7 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(30, 58, 30, 0.08)',
          boxShadow: '0 20px 60px rgba(30, 58, 30, 0.15), 0 4px 12px rgba(30, 58, 30, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center mb-6 pb-4"
          style={{
            borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
          }}
        >
          <h2
            className="text-xl"
            style={{
              fontWeight: 650,
              color: '#1e3a1e',
              letterSpacing: '-0.015em',
            }}
          >
            Edit Ledger Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            ×
          </button>
        </div>

        {/* Transaction Context */}
        <div
          className="mb-6 p-4 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(248, 250, 249, 0.9) 0%, rgba(248, 250, 249, 0.7) 100%)',
            border: '1px solid rgba(30, 58, 30, 0.08)',
          }}
        >
          <div className="text-[11px] uppercase mb-3" style={{ fontWeight: 600, color: '#64748b', letterSpacing: '0.02em' }}>
            Original Transaction Details
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Verified By
              </div>
              <div className="text-sm" style={{ fontWeight: 580, color: '#1e293b' }}>
                {transaction.verifiedBy}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Verified At
              </div>
              <div className="text-sm" style={{ fontWeight: 500, color: '#475569' }}>
                {formatDate(transaction.verifiedAt)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Source
              </div>
              <div className="text-sm uppercase" style={{ fontWeight: 580, color: '#475569' }}>
                {transaction.source}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vendor */}
          <div>
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Vendor
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Category
            </label>
            <Combobox value={formData.categoryCode} onChange={(val) => setFormData({ ...formData, categoryCode: val || "" })}>
              <div className="relative">
                <Combobox.Input
                  className="w-full px-4 py-3 text-sm rounded-lg transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(30, 58, 30, 0.15)',
                    color: '#1e293b',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                  displayValue={(categoryCode: string) => {
                    if (!categoryCode) return "";
                    const cat = categories.find((c) => c.category_code === categoryCode);
                    return cat ? formatCategoryLabel(cat) : "";
                  }}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search categories..."
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2d5a2d';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setQuery("")}
                >
                  <Combobox.Options
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg py-1 text-sm shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(30, 58, 30, 0.08)',
                      boxShadow: '0 10px 30px rgba(30, 58, 30, 0.15)',
                    }}
                  >
                    {filteredCategories.length === 0 && query !== "" ? (
                      <div className="relative cursor-default select-none px-4 py-2" style={{ color: '#64748b' }}>
                        No categories found.
                      </div>
                    ) : (
                      filteredCategories
                        .filter((cat) => cat.category_code)
                        .map((cat, index) => (
                        <Combobox.Option
                          key={cat.category_code || `fallback-${index}`}
                          value={cat.category_code}
                        >
                          {({ active, selected }) => (
                            <div
                              className="relative cursor-pointer select-none py-2.5 px-4 transition-all"
                              style={{
                                background: selected
                                  ? 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)'
                                  : active
                                  ? 'rgba(240, 248, 242, 0.5)'
                                  : 'transparent',
                                color: selected ? 'white' : '#1e293b',
                                fontWeight: selected ? 600 : 500,
                                letterSpacing: '-0.01em',
                              }}
                            >
                              <span className="block truncate">
                                {formatCategoryLabel(cat)}
                              </span>
                            </div>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>

          {/* Change Preview */}
          {changes.length > 0 && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
              }}
            >
              <div className="text-[11px] uppercase mb-3" style={{ fontWeight: 600, color: '#2563eb', letterSpacing: '0.02em' }}>
                Changes Preview
              </div>
              <div className="space-y-2">
                {changes.map((change, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span style={{ fontWeight: 600, color: '#475569', minWidth: '80px' }}>{change.field}:</span>
                    <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.old}</span>
                    <span style={{ color: '#64748b' }}>→</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{change.new}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Reason for Edit <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all resize-none"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              placeholder="Explain why this change is necessary..."
              required
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(30, 58, 30, 0.1)',
                color: '#475569',
                fontWeight: 550,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.1)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || changes.length === 0}
              className="px-5 py-2.5 text-sm rounded-lg transition-all"
              style={{
                background: loading || changes.length === 0
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: '1px solid transparent',
                color: 'white',
                fontWeight: 550,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1) inset',
                cursor: loading || changes.length === 0 ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading && changes.length > 0) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.2), 0 1px 0 rgba(255, 255, 255, 0.15) inset';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && changes.length > 0) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.currentTarget.style.boxShadow = '0 1px 0 rgba(255, 255, 255, 0.1) inset';
                }
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
