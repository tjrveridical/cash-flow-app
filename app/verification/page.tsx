"use client";

import { useEffect, useState } from "react";

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

interface Stats {
  pendingCount: number;
  totalAmount: number;
  needsClassification: number;
}

export default function VerificationPage() {
  const [transactions, setTransactions] = useState<UnverifiedTransaction[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, totalAmount: 0, needsClassification: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnverifiedTransactions();
  }, []);

  const fetchUnverifiedTransactions = async () => {
    try {
      const response = await fetch("/api/verification/unverified");
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching unverified transactions:", error);
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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleVerify = async (id: string | string[]) => {
    try {
      // Convert single id to array if needed
      const ids = Array.isArray(id) ? id : [id];

      const response = await fetch("/api/verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Successfully verified ${data.count} transaction(s)`);
        // Clear selections after successful verification
        setSelectedIds(new Set());
        // Refresh the unverified transactions list
        await fetchUnverifiedTransactions();
      } else {
        console.error("Verification failed:", data.error);
        alert(`Failed to verify transactions: ${data.error}`);
      }
    } catch (error) {
      console.error("Error verifying transactions:", error);
      alert("An error occurred while verifying transactions");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f8faf9 0%, #f5f7f6 100%)' }}
      >
        <div style={{ color: '#64748b', fontSize: '13px' }}>Loading verification inbox...</div>
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
            Verification Inbox
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
              Export
            </button>
            <button
              className="px-4 py-2.5 text-xs rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-px"
              style={{
                background: 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)',
                border: '1px solid #2d5a2d',
                color: 'white',
                fontWeight: 550,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1) inset',
              }}
              onClick={() => handleVerify(transactions.map(t => t.id))}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 90, 45, 0.2), 0 1px 0 rgba(255, 255, 255, 0.15) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)';
                e.currentTarget.style.boxShadow = '0 1px 0 rgba(255, 255, 255, 0.1) inset';
              }}
            >
              Verify All
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
                  Pending Transactions
                </h2>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#64748b',
                    fontWeight: 500,
                  }}
                >
                  {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} awaiting verification
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
                    <th className="px-3 py-2.5 text-left" style={{ width: '48px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === transactions.length && transactions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{
                          border: '2px solid rgba(30, 58, 30, 0.3)',
                          background: 'white',
                        }}
                      />
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; }}
                    >
                      Date
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; }}
                    >
                      Vendor
                    </th>
                    <th
                      className="px-3 py-2.5 text-right text-[11px] uppercase cursor-pointer transition-colors"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2d5a2d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; }}
                    >
                      Amount
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                    >
                      Classification
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-[11px] uppercase"
                      style={{
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.02em',
                        borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
                      }}
                    >
                      Source
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
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`transition-all ${
                        selectedIds.has(tx.id) ? "border-l-[3px]" : ""
                      }`}
                      style={{
                        background: selectedIds.has(tx.id)
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0.03) 100%)'
                          : 'transparent',
                        borderLeftColor: selectedIds.has(tx.id) ? '#3b82f6' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.has(tx.id)) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240, 248, 242, 0.3) 0%, rgba(240, 248, 242, 0.1) 100%)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIds.has(tx.id)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <td className="px-3 py-2 text-center" style={{ borderBottom: '1px solid rgba(30, 58, 30, 0.04)', height: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{
                            border: '2px solid rgba(30, 58, 30, 0.3)',
                            background: 'white',
                          }}
                        />
                      </td>
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
                          {tx.classificationSource}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ borderBottom: '1px solid rgba(30, 58, 30, 0.04)', height: '40px' }}>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: 'white',
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              border: '1px solid transparent',
                            }}
                            onClick={() => handleVerify(tx.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #047857 0%, #065f46 100%)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            Verify
                          </button>
                          <button
                            className="px-3 py-1.5 text-[11px] rounded-md cursor-pointer transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              fontWeight: 600,
                              letterSpacing: '0.01em',
                              border: '1px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            Edit
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
                <div className="text-sm" style={{ color: '#cbd5e1' }}>No pending transactions to verify</div>
                <div className="text-xs mt-1" style={{ color: '#e2e8f0' }}>All transactions have been verified</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div className="flex flex-col gap-4">
          {/* Stats Cards */}
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
              {stats.pendingCount}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Pending Review
            </div>
          </div>

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
                color: '#2d5a2d',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(stats.totalAmount)}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Total Amount
            </div>
          </div>

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
                color: '#dc2626',
                letterSpacing: '-0.02em',
              }}
            >
              {stats.needsClassification}
            </div>
            <div
              className="text-sm"
              style={{
                color: '#64748b',
                fontWeight: 520,
                letterSpacing: '-0.01em',
              }}
            >
              Needs Classification
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div
              className="px-4 py-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(30, 58, 30, 0.08)',
                boxShadow: '0 4px 16px rgba(30, 58, 30, 0.08)',
              }}
            >
              <div
                className="text-sm mb-3"
                style={{
                  color: '#64748b',
                  fontWeight: 550,
                }}
              >
                {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    fontWeight: 600,
                    border: '1px solid transparent',
                  }}
                  onClick={() => handleVerify(Array.from(selectedIds))}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #047857 0%, #065f46 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Verify Selected
                </button>
                <button
                  className="w-full px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(30, 58, 30, 0.1)',
                    color: '#374151',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                    e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 58, 30, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Bulk Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
