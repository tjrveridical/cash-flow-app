"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";

interface PaymentRule {
  id: string;
  rule_name: string;
  frequency: string;
  anchor_day: string;
  anchor_day2: number | null;
  months: string | null;
  business_day_adjustment: "next" | "previous" | "none";
}

interface ForecastItem {
  id: string;
  vendor_name: string;
  category_code: string | null;
  estimated_amount: number;
  rule_id: string;
  is_active: boolean;
  notes: string | null;
  rule: PaymentRule;
}

interface DisplayCategory {
  category_code: string;
  display_label: string;
  display_label2: string | null;
  display_group: string;
  cash_direction: string;
  sort_order: number;
}

interface HistoricalTransaction {
  id: string;
  date: string;
  amount: number;
  name: string;
  categoryLabel: string;
  isVerified: boolean;
}

interface HistoricalStats {
  totalCount: number;
  verifiedCount: number;
  verificationRate: number;
  averageAll: number;
  averageVerified: number;
  suggestedForecast: number;
}

export default function ForecastItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [categories, setCategories] = useState<DisplayCategory[]>([]);
  const [paymentRules, setPaymentRules] = useState<PaymentRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>("vendor_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalState, setEditModalState] = useState<{ open: boolean; item: ForecastItem | null }>({
    open: false,
    item: null,
  });
  const [historicalModalState, setHistoricalModalState] = useState<{
    open: boolean;
    vendorName: string;
  }>({ open: false, vendorName: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch forecast items
      const itemsRes = await fetch("/api/forecast-items");
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setItems(itemsData.items || []);
      }

      // Fetch categories (cashout only for expenses)
      const categoriesRes = await fetch("/api/display-categories");
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        const expenseCategories = (categoriesData.categories || [])
          .filter((cat: DisplayCategory) =>
            cat.cash_direction === "Cashout" &&
            cat.category_code != null &&
            cat.category_code.trim().length > 0
          )
          .sort((a: DisplayCategory, b: DisplayCategory) => a.sort_order - b.sort_order);
        setCategories(expenseCategories);
      }

      // Fetch payment rules
      const rulesRes = await fetch("/api/paydate-rules");
      const rulesData = await rulesRes.json();
      if (rulesData.success) {
        setPaymentRules(rulesData.rules || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this forecast item?")) return;

    try {
      const res = await fetch(`/api/forecast-items/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        fetchData(); // Refresh list
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("An error occurred while deleting");
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortedItems = () => {
    const sorted = [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case "vendor_name":
          aVal = a.vendor_name.toLowerCase();
          bVal = b.vendor_name.toLowerCase();
          break;
        case "payment_rule":
          aVal = (a.rule?.rule_name || "").toLowerCase();
          bVal = (b.rule?.rule_name || "").toLowerCase();
          break;
        case "anchor_dates":
          aVal = a.rule?.anchor_day || "";
          bVal = b.rule?.anchor_day || "";
          break;
        case "date_adjustment":
          aVal = a.rule?.business_day_adjustment || "";
          bVal = b.rule?.business_day_adjustment || "";
          break;
        case "amount":
          aVal = a.estimated_amount;
          bVal = b.estimated_amount;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[20px] border-b border-[#1e3a1e]/8 px-6 py-3.5 sticky top-0 z-10 shadow-sm shadow-[#1e3a1e]/4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-semibold bg-gradient-to-br from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
            Manage Expenses
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/forecast")}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white/80 backdrop-blur-sm border border-[#1e3a1e]/10 rounded-lg hover:bg-white/95 hover:border-[#1e3a1e]/15 hover:shadow-sm transition-all"
            >
              Back to Cash Flow
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all"
            >
              Add Item
            </button>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-xl shadow-lg shadow-[#1e3a1e]/4 border border-[#1e3a1e]/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr className="bg-gradient-to-br from-[#f8faf9]/90 to-[#f8faf9]/70">
                  <th
                    className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 cursor-pointer hover:bg-[#f0f8f2]/50 transition-colors"
                    onClick={() => handleSort("vendor_name")}
                  >
                    <div className="flex items-center gap-1">
                      Vendor Name
                      {sortColumn === "vendor_name" && (
                        <span className="text-[#2d5a2d]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 cursor-pointer hover:bg-[#f0f8f2]/50 transition-colors"
                    onClick={() => handleSort("payment_rule")}
                  >
                    <div className="flex items-center gap-1">
                      Payment Rule
                      {sortColumn === "payment_rule" && (
                        <span className="text-[#2d5a2d]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 cursor-pointer hover:bg-[#f0f8f2]/50 transition-colors"
                    onClick={() => handleSort("anchor_dates")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Anchor Dates
                      {sortColumn === "anchor_dates" && (
                        <span className="text-[#2d5a2d]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 cursor-pointer hover:bg-[#f0f8f2]/50 transition-colors"
                    onClick={() => handleSort("date_adjustment")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Date Adjustment
                      {sortColumn === "date_adjustment" && (
                        <span className="text-[#2d5a2d]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 cursor-pointer hover:bg-[#f0f8f2]/50 transition-colors"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Forecast Amount
                      {sortColumn === "amount" && (
                        <span className="text-[#2d5a2d]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedItems().map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setHistoricalModalState({ open: true, vendorName: item.vendor_name })}
                    className="cursor-pointer hover:bg-[#f0f8f2]/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 border-b border-[#1e3a1e]/4">
                      {item.vendor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-b border-[#1e3a1e]/4">
                      {item.rule?.rule_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600 border-b border-[#1e3a1e]/4">
                      {item.rule ? (
                        <>
                          {item.rule.anchor_day}
                          {item.rule.anchor_day2 && `, ${item.rule.anchor_day2}`}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center border-b border-[#1e3a1e]/4">
                      {item.rule ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold ${
                          item.rule.business_day_adjustment === "next"
                            ? "bg-green-50 text-green-700"
                            : item.rule.business_day_adjustment === "previous"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-slate-50 text-slate-600"
                        }`}>
                          {item.rule.business_day_adjustment === "next"
                            ? "Next"
                            : item.rule.business_day_adjustment === "previous"
                            ? "Prev"
                            : "None"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900 border-b border-[#1e3a1e]/4">
                      {formatCurrency(item.estimated_amount)}
                    </td>
                    <td className="px-4 py-3 text-center border-b border-[#1e3a1e]/4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModalState({ open: true, item });
                          }}
                          className="px-3 py-1.5 text-[11px] font-medium text-slate-700 bg-white/80 border border-[#1e3a1e]/10 rounded-md hover:bg-white hover:border-[#1e3a1e]/15 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="px-3 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="px-5 py-12 text-center">
                <div className="text-sm text-slate-500">No forecast items yet</div>
                <div className="text-xs text-slate-400 mt-1">Click "Add Item" to create one</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <CreateEditModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            fetchData();
          }}
          categories={categories}
          paymentRules={paymentRules}
        />
      )}

      {/* Edit Modal */}
      {editModalState.open && editModalState.item && (
        <CreateEditModal
          item={editModalState.item}
          onClose={() => setEditModalState({ open: false, item: null })}
          onSuccess={() => {
            setEditModalState({ open: false, item: null });
            fetchData();
          }}
          categories={categories}
          paymentRules={paymentRules}
        />
      )}

      {/* Historical Modal */}
      {historicalModalState.open && (
        <HistoricalModal
          vendorName={historicalModalState.vendorName}
          onClose={() => setHistoricalModalState({ open: false, vendorName: "" })}
        />
      )}
    </div>
  );
}

// Custom styles for react-select to match forest green theme
const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '38px',
    borderColor: state.isFocused ? '#2d5a2d' : '#cbd5e1',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(45, 90, 45, 0.1)' : 'none',
    '&:hover': {
      borderColor: '#2d5a2d',
    },
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isFocused
      ? '#f0f8f2'
      : state.isSelected
      ? '#2d5a2d'
      : 'white',
    color: state.isSelected ? 'white' : '#334155',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#2d5a2d',
    },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    maxHeight: '300px',
  }),
  menuList: (base: any) => ({
    ...base,
    maxHeight: '300px',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.875rem',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#0f172a',
    fontSize: '0.875rem',
  }),
};

// Create/Edit Modal Component
function CreateEditModal({
  item,
  onClose,
  onSuccess,
  categories,
  paymentRules,
}: {
  item?: ForecastItem;
  onClose: () => void;
  onSuccess: () => void;
  categories: DisplayCategory[];
  paymentRules: PaymentRule[];
}) {
  const [formData, setFormData] = useState({
    vendor_name: item?.vendor_name || "",
    category_code: item?.category_code || "",
    rule_id: item?.rule_id || "",
    estimated_amount: item?.estimated_amount || 0,
    notes: item?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  // Transform categories for react-select
  const categoryOptions = categories.map((cat) => ({
    value: cat.category_code,
    label: `${cat.display_group} > ${cat.display_label}${cat.display_label2 ? ` > ${cat.display_label2}` : ''}`,
  }));

  // Transform payment rules for react-select
  const paymentRuleOptions = paymentRules.map((rule) => ({
    value: rule.id,
    label: rule.rule_name,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_name.trim()) {
      alert("Vendor name is required");
      return;
    }

    if (!formData.category_code) {
      alert("Category is required");
      return;
    }

    if (!formData.rule_id) {
      alert("Payment rule is required");
      return;
    }

    if (formData.estimated_amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setSaving(true);

    try {
      const url = item ? `/api/forecast-items/${item.id}` : "/api/forecast-items";
      const method = item ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving item:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          {item ? "Edit Forecast Item" : "Add Forecast Item"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
            <input
              type="text"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent"
              placeholder="e.g., ADP Payroll"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <Select
              value={categoryOptions.find((opt) => opt.value === formData.category_code) || null}
              onChange={(selected) =>
                setFormData({ ...formData, category_code: selected?.value || "" })
              }
              options={categoryOptions}
              styles={customSelectStyles}
              placeholder="Select category..."
              isClearable
              isSearchable
              menuPlacement="auto"
            />
          </div>

          {/* Payment Rule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Rule</label>
            <Select
              value={paymentRuleOptions.find((opt) => opt.value === formData.rule_id) || null}
              onChange={(selected) =>
                setFormData({ ...formData, rule_id: selected?.value || "" })
              }
              options={paymentRuleOptions}
              styles={customSelectStyles}
              placeholder="Select payment rule..."
              isClearable
              isSearchable
              menuPlacement="auto"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              value={formData.estimated_amount}
              onChange={(e) =>
                setFormData({ ...formData, estimated_amount: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Historical Modal Component
function HistoricalModal({ vendorName, onClose }: { vendorName: string; onClose: () => void }) {
  const [transactions, setTransactions] = useState<HistoricalTransaction[]>([]);
  const [stats, setStats] = useState<HistoricalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorical();
  }, []);

  const fetchHistorical = async () => {
    try {
      const res = await fetch(`/api/forecast-items/historical?vendor=${encodeURIComponent(vendorName)}`);
      const data = await res.json();

      if (data.success) {
        setTransactions(data.transactions || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {vendorName} - Historical Actuals (Last 12 Months)
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {loading ? (
            <div className="text-center py-8 text-sm text-slate-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-slate-500">No historical transactions found</div>
              <div className="text-xs text-slate-400 mt-1">
                No transactions matching "{vendorName}" in the last 12 months
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                        Date
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                        Category
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{formatDate(tx.date)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{tx.categoryLabel}</td>
                        <td className="px-3 py-2 text-center">
                          {tx.isVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              ⚠ Unverified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats */}
              {stats && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total transactions:</span>
                    <span className="font-semibold text-slate-900">{stats.totalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Verified:</span>
                    <span className="font-semibold text-slate-900">
                      {stats.verifiedCount} ({stats.verificationRate}%)
                    </span>
                  </div>
                  <div className="border-t border-slate-200 my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Average (all):</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(stats.averageAll)}
                    </span>
                  </div>
                  {stats.verifiedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Average (verified only):</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(stats.averageVerified)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">Suggested Forecast:</span>
                    <span className="font-bold text-[#2d5a2d] text-lg">
                      {formatCurrency(stats.suggestedForecast)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
