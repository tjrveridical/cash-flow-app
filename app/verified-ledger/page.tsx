"use client";

import { useEffect, useState } from "react";
import { EditLedgerModal } from "./components/EditLedgerModal";

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

interface Stats {
  totalVerified: number;
  totalInflow: number;
  totalOutflow: number;
}

export default function VerifiedLedgerPage() {
  const [transactions, setTransactions] = useState<VerifiedTransaction[]>([]);
  const [stats, setStats] = useState<Stats>({ totalVerified: 0, totalInflow: 0, totalOutflow: 0 });
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<VerifiedTransaction | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchVerifiedTransactions();
  }, []);

  const fetchVerifiedTransactions = async () => {
    try {
      const response = await fetch("/api/verified-ledger");
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching verified transactions:", error);
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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case "date":
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
        break;
      case "vendor":
        aVal = a.vendor.toLowerCase();
        bVal = b.vendor.toLowerCase();
        break;
      case "amount":
        aVal = a.amount;
        bVal = b.amount;
        break;
      case "category":
        aVal = a.displayGroup.toLowerCase();
        bVal = b.displayGroup.toLowerCase();
        break;
      case "source":
        aVal = a.source.toLowerCase();
        bVal = b.source.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleEdit = (transaction: VerifiedTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEdit = async (edits: any, reason: string) => {
    if (!editingTransaction) return;

    try {
      const response = await fetch("/api/verified-ledger/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTransaction.id,
          transactionId: editingTransaction.transactionId,
          edits,
          reason,
          edited_by: "CFO", // In a real app, this would come from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("Successfully updated transaction");
        // Show success toast
        alert(`Successfully updated ${data.fieldsChanged} field(s)`);
        // Refresh the transactions list
        await fetchVerifiedTransactions();
      } else {
        console.error("Update failed:", data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  };

  const handleUnverify = async (id: string, vendor: string) => {
    if (!confirm(`Are you sure you want to unverify "${vendor}" and send it back to the inbox?`)) {
      return;
    }

    try {
      const response = await fetch("/api/verified-ledger/unverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("Successfully unverified transaction");
        alert("Transaction moved back to verification inbox");
        // Refresh the transactions list
        await fetchVerifiedTransactions();
      } else {
        console.error("Unverify failed:", data.error);
        alert(`Failed to unverify: ${data.error}`);
      }
    } catch (error) {
      console.error("Error unverifying transaction:", error);
      alert("An error occurred while unverifying");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f8faf9 0%, #f5f7f6 100%)' }}
      >
        <div style={{ color: '#64748b', fontSize: '13px' }}>Loading verified ledger...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f8faf9 0%, #f5f7f6 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif',
        fontSize: '13px',
        lineHeight: '1.2',
        letterSpacing: '-0.014em',
      }}
    >
      {/* Header */}
      <header
        className="px-6 py-3.5 sticky top-0 z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
          boxShadow: '0 1px 0 0 rgba(30, 58, 30, 0.04), 0 2px 24px -8px rgba(30, 58, 30, 0.08)',
        }}
      >
        <div className="flex justify-between items-center">
          <h1
            className="text-[22px]"
            style={{
              fontWeight: 650,
              background: 'linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 40%, #3d6b3d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}
          >
            Verified Ledger
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2.5 text-xs rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-px"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(30, 58, 30, 0.1)',
                color: '#374151',
                fontWeight: 550,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 58, 30, 0.08), 0 1px 0 rgba(255, 255, 255, 0.5) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Export to CSV
            </button>
            <div
              className="px-3 py-1.5 rounded-md text-[11px] uppercase"
              style={{
                background: 'linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%)',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: '0 2px 4px rgba(30, 58, 30, 0.2)',
              }}
            >
              CFO
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-[1fr_280px] gap-6 p-4 max-w-[1400px] mx-auto">
        {/* Left Panel - Transactions Table */}
        <div className="overflow-hidden">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(30, 58, 30, 0.08)',
              boxShadow: '0 4px 24px rgba(30, 58, 30, 0.04), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
            }}
          >
            {/* Table Header */}
            <div
              className="px-5 py-4 flex justify-between items-center"
              style={{
                background: 'linear-gradient(135deg, rgba(45, 90, 45, 0.03) 0%, rgba(45, 90, 45, 0.01) 100%)',
                borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
              }}
            >
              <div>
                <h2
                  className="text-lg"
                  style={{
                    fontWeight: 650,
                    color: '#1e3a1e',
                    letterSpacing: '-0.015em',
                  }}
                >
                  Verified Transactions
                </h2>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#64748b',
                    fontWeight: 500,
                  }}
                >
                  {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} in ledger
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr
                    style={{
                      background: 'linear-gradient(135deg, rgba(248, 250, 249, 0.9) 0%, rgba(248, 250, 249, 0.7) 100%)',
                    }}
                  >
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: sortColumn === "date" ? '#2d5a2d' : '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onClick={() => handleSort("date")}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sortColumn === "date" ? '#2d5a2d' : '#374151'; }}
                    >
                      Date {sortColumn === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: sortColumn === "vendor" ? '#2d5a2d' : '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onClick={() => handleSort("vendor")}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sortColumn === "vendor" ? '#2d5a2d' : '#374151'; }}
                    >
                      Vendor {sortColumn === "vendor" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: sortColumn === "amount" ? '#2d5a2d' : '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onClick={() => handleSort("amount")}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sortColumn === "amount" ? '#2d5a2d' : '#374151'; }}
                    >
                      Amount {sortColumn === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: sortColumn === "category" ? '#2d5a2d' : '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onClick={() => handleSort("category")}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sortColumn === "category" ? '#2d5a2d' : '#374151'; }}
                    >
                      Category {sortColumn === "category" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: sortColumn === "source" ? '#2d5a2d' : '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onClick={() => handleSort("source")}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sortColumn === "source" ? '#2d5a2d' : '#374151'; }}
                    >
                      Source {sortColumn === "source" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-[11px] uppercase"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-all"
                      style={{
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240, 248, 242, 0.3) 0%, rgba(240, 248, 242, 0.1) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td
                        className="px-3 py-2 text-sm"
                        style={{
                          fontWeight: 500,
                          color: '#374151',
                          borderBottom: '1px solid rgba(30, 58, 30, 0.04)',
                          height: '40px',
                        }}
                      >
                        {formatDate(tx.date)}
                      </td>
                      <td
                        className="px-3 py-2 text-sm cursor-help max-w-[220px] truncate transition-colors"
                        style={{
                          fontWeight: 580,
                          color: '#1e293b',
                          borderBottom: '1px solid rgba(30, 58, 30, 0.04)',
                          height: '40px',
                        }}
                        title={tx.description}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#1e293b'; }}
                      >
                        {tx.vendor}
                      </td>
                      <td
                        className="px-3 py-2 text-sm text-right"
                        style={{
                          fontWeight: 650,
                          color: tx.amount < 0 ? "#dc2626" : "#059669",
                          borderBottom: '1px solid rgba(30, 58, 30, 0.04)',
                          height: '40px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid rgba(30, 58, 30, 0.04)', height: '40px' }}>
                        <div className="flex gap-1.5 items-center">
                          <span
                            className="px-2.5 py-1 rounded-md text-[11px]"
                            style={{
                              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                              color: '#6d28d9',
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              border: '1px solid rgba(124, 58, 237, 0.15)',
                            }}
                          >
                            {tx.displayGroup}
                          </span>
                          <span
                            className="px-2.5 py-1 rounded-md text-[11px]"
                            style={{
                              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                              color: '#d97706',
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              border: '1px solid rgba(217, 119, 6, 0.15)',
                            }}
                          >
                            {tx.displayLabel}
                          </span>
                          {tx.displayLabel2 && (
                            <span
                              className="px-2.5 py-1 rounded-md text-[11px]"
                              style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                color: '#2563eb',
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                                border: '1px solid rgba(59, 130, 246, 0.15)',
                              }}
                            >
                              {tx.displayLabel2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid rgba(30, 58, 30, 0.04)', height: '40px' }}>
                        <span
                          className="px-3 py-1.5 rounded-md text-[11px] uppercase"
                          style={{
                            background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.08) 0%, rgba(71, 85, 105, 0.04) 100%)',
                            color: '#475569',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            border: '1px solid rgba(71, 85, 105, 0.1)',
                          }}
                        >
                          {tx.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ borderBottom: '1px solid rgba(30, 58, 30, 0.04)', height: '40px' }}>
                        <div className="flex flex-col gap-1 items-end">
                          <button
                            className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: 'white',
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              border: '1px solid transparent',
                            }}
                            onClick={() => handleEdit(tx)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            className="text-[10px] underline cursor-pointer transition-colors"
                            style={{
                              color: '#dc2626',
                              fontWeight: 600,
                            }}
                            onClick={() => handleUnverify(tx.id, tx.vendor)}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                          >
                            Unverify & Send to Inbox
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
                <div className="text-sm" style={{ color: '#cbd5e1' }}>No verified transactions</div>
                <div className="text-xs mt-1" style={{ color: '#e2e8f0' }}>Transactions will appear here after verification</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div className="flex flex-col gap-4">
          {/* Total Verified */}
          <div
            className="px-4 py-4 rounded-xl relative overflow-hidden transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(30, 58, 30, 0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(30, 58, 30, 0.08), 0 2px 8px rgba(30, 58, 30, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.06)';
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 rounded-t-xl"
              style={{
                height: '3px',
                background: 'linear-gradient(90deg, #2d5a2d 0%, #4a7c4a 50%, #5e8e5e 100%)',
              }}
            />
            <div
              className="text-2xl mb-1"
              style={{
                fontWeight: 700,
                color: '#1e3a1e',
                letterSpacing: '-0.02em',
              }}
            >
              {stats.totalVerified}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Total Verified
            </div>
          </div>

          {/* Total Inflow */}
          <div
            className="px-4 py-4 rounded-xl relative overflow-hidden transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(30, 58, 30, 0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(30, 58, 30, 0.08), 0 2px 8px rgba(30, 58, 30, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.06)';
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 rounded-t-xl"
              style={{
                height: '3px',
                background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
              }}
            />
            <div
              className="text-2xl mb-1"
              style={{
                fontWeight: 700,
                color: '#059669',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(stats.totalInflow)}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Total Inflow
            </div>
          </div>

          {/* Total Outflow */}
          <div
            className="px-4 py-4 rounded-xl relative overflow-hidden transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(30, 58, 30, 0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(30, 58, 30, 0.08), 0 2px 8px rgba(30, 58, 30, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.06)';
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 rounded-t-xl"
              style={{
                height: '3px',
                background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
              }}
            />
            <div
              className="text-2xl mb-1"
              style={{
                fontWeight: 700,
                color: '#dc2626',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(stats.totalOutflow)}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Total Outflow
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <EditLedgerModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
