"use client";

import { useState, useEffect } from "react";

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

interface Category {
  category_code: string;
  display_group: string;
  display_label: string;
  display_label2: string | null;
}

interface EditTransactionModalProps {
  transaction: UnverifiedTransaction | null;
  onClose: () => void;
  onSave: (categoryCode: string) => Promise<void>;
}

export function EditTransactionModal({ transaction, onClose, onSave }: EditTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setSelectedCategoryCode(transaction.categoryCode);
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

    if (!selectedCategoryCode) {
      setError("Please select a category");
      return;
    }

    setLoading(true);

    try {
      await onSave(selectedCategoryCode);
      onClose();
    } catch (err) {
      setError("Failed to update classification");
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

  // Group categories by display_group
  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.display_group]) {
      acc[cat.display_group] = [];
    }
    acc[cat.display_group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  const formatCategoryLabel = (cat: Category) => {
    if (cat.display_label2) {
      return `${cat.display_group} > ${cat.display_label} > ${cat.display_label2}`;
    }
    return `${cat.display_group} > ${cat.display_label}`;
  };

  if (!transaction) return null;

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
        className="rounded-2xl max-w-2xl w-full p-7 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
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
            Edit Classification
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
            Transaction Details
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Vendor
              </div>
              <div className="text-sm" style={{ fontWeight: 580, color: '#1e293b' }}>
                {transaction.vendor}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Amount
              </div>
              <div
                className="text-sm"
                style={{
                  fontWeight: 650,
                  color: transaction.amount < 0 ? '#dc2626' : '#059669',
                }}
              >
                {formatCurrency(transaction.amount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Date
              </div>
              <div className="text-sm" style={{ fontWeight: 500, color: '#475569' }}>
                {formatDate(transaction.date)}
              </div>
            </div>
          </div>
          {transaction.description && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(30, 58, 30, 0.06)' }}>
              <div className="text-[10px] uppercase mb-1" style={{ fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Description
              </div>
              <div className="text-xs" style={{ color: '#64748b' }}>
                {transaction.description}
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Category
            </label>
            <select
              value={selectedCategoryCode}
              onChange={(e) => setSelectedCategoryCode(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="">Select a category...</option>
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map((cat) => (
                    <option key={cat.category_code} value={cat.category_code}>
                      {formatCategoryLabel(cat)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
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
              disabled={loading}
              className="px-5 py-2.5 text-sm rounded-lg transition-all"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)',
                border: '1px solid transparent',
                color: 'white',
                fontWeight: 550,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1) inset',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 90, 45, 0.2), 0 1px 0 rgba(255, 255, 255, 0.15) inset';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)';
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
