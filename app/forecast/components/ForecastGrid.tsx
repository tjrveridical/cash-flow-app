"use client";

import { useEffect, useState } from "react";
import { DetailModal } from "./DetailModal";

interface WeeklyForecast {
  weekEnding: string;
  beginningCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  endingCash: number;
  categories: CategoryForecast[];
}

interface CategoryForecast {
  displayGroup: string;
  displayLabel: string;
  displayLabel2?: string | null;
  categoryCode: string;
  cashDirection: "Cashin" | "Cashout";
  amount: number;
  transactionCount: number;
  isActual: boolean;
  sortOrder: number;
}

export function ForecastGrid() {
  const [weeks, setWeeks] = useState<WeeklyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    category: "",
    weekEnding: "",
    amount: 0,
  });

  useEffect(() => {
    fetch("/api/forecast/weeks?weeksCount=26")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWeeks(data.weeks);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value < 0 ? `($${formatted})` : `$${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  };

  const formatWeekLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - startOfYear.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNum = Math.ceil(diff / oneWeek);
    return `Week ${weekNum}`;
  };

  const getCategoryAmount = (week: WeeklyForecast, categoryCode: string): number => {
    const cat = week.categories.find((c) => c.categoryCode === categoryCode);
    return cat?.amount || 0;
  };

  const isCategoryActual = (week: WeeklyForecast, categoryCode: string): boolean => {
    const cat = week.categories.find((c) => c.categoryCode === categoryCode);
    return cat?.isActual || false;
  };

  const getCategoriesByGroup = (group: string): CategoryForecast[] => {
    const allCats = new Map<string, CategoryForecast>();
    weeks.forEach((w) => w.categories.forEach((c) => allCats.set(c.categoryCode, c)));
    return Array.from(allCats.values())
      .filter((c) => c.displayGroup === group)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const handleAmountClick = (category: string, weekEnding: string, amount: number) => {
    setModalState({
      isOpen: true,
      title: `${category} - ${formatDate(weekEnding)}`,
      category,
      weekEnding,
      amount,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
        <div className="text-slate-600 text-sm">Loading forecast data...</div>
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
        <div className="text-slate-600 text-sm">No forecast data available</div>
      </div>
    );
  }

  // Determine current week (approximate)
  const today = new Date();
  const currentWeekIndex = weeks.findIndex((w) => new Date(w.weekEnding) >= today);

  return (
    <>
      <div className="forecast-table-wrapper">
        <table className="forecast-table">
          <thead>
            <tr className="week-header">
              <th className="category-header">Cash Flow Item</th>
              {weeks.map((w, i) => (
                <th key={w.weekEnding} className={i === currentWeekIndex ? "current-week" : ""}>
                  {formatWeekLabel(w.weekEnding)}
                </th>
              ))}
            </tr>
            <tr className="week-dates">
              <td></td>
              {weeks.map((w, i) => (
                <td key={w.weekEnding} className={i === currentWeekIndex ? "current-week" : ""}>
                  {formatDate(w.weekEnding)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Beginning Cash */}
            <tr className="section-header cash-balance">
              <td colSpan={weeks.length + 1}>CASH BALANCE</td>
            </tr>
            <tr className="data-row total-row">
              <td className="category-cell" title="Starting cash position for each period">
                Beginning Cash
              </td>
              {weeks.map((w) => (
                <td key={w.weekEnding} className={`amount-cell amount-positive amount-actual`}>
                  {formatCurrency(w.beginningCash)}
                </td>
              ))}
            </tr>

            {/* Cash Inflows */}
            <tr className="section-header cash-inflows">
              <td colSpan={weeks.length + 1}>CASH INFLOWS</td>
            </tr>
            {getCategoriesByGroup("AR").map((cat) => (
              <tr key={cat.categoryCode} className="data-row">
                <td className="category-cell" title={cat.displayLabel}>
                  {cat.displayLabel}
                </td>
                {weeks.map((w) => {
                  const amount = getCategoryAmount(w, cat.categoryCode);
                  const isActual = isCategoryActual(w, cat.categoryCode);
                  return (
                    <td
                      key={w.weekEnding}
                      className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                        isActual ? "amount-actual" : "amount-forecast"
                      } ${amount !== 0 ? "clickable-amount" : ""}`}
                      onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                    >
                      {amount !== 0 ? formatCurrency(amount) : "$0"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="data-row total-row">
              <td className="category-cell">Total Inflows</td>
              {weeks.map((w) => (
                <td key={w.weekEnding} className="amount-cell amount-positive amount-actual">
                  {formatCurrency(w.totalInflows)}
                </td>
              ))}
            </tr>

            {/* Labor */}
            {getCategoriesByGroup("Labor").length > 0 && (
              <>
                <tr className="section-header labor">
                  <td colSpan={weeks.length + 1}>LABOR</td>
                </tr>
                {getCategoriesByGroup("Labor").map((cat) => (
                  <tr key={cat.categoryCode} className="data-row">
                    <td className="category-cell" title={cat.displayLabel}>
                      {cat.displayLabel}
                    </td>
                    {weeks.map((w) => {
                      const amount = getCategoryAmount(w, cat.categoryCode);
                      const isActual = isCategoryActual(w, cat.categoryCode);
                      return (
                        <td
                          key={w.weekEnding}
                          className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                            isActual ? "amount-actual" : "amount-forecast"
                          } ${amount !== 0 ? "clickable-amount" : ""}`}
                          onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                        >
                          {amount !== 0 ? formatCurrency(amount) : "$0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* COGS */}
            {getCategoriesByGroup("COGS").length > 0 && (
              <>
                <tr className="section-header cogs">
                  <td colSpan={weeks.length + 1}>COGS</td>
                </tr>
                {getCategoriesByGroup("COGS").map((cat) => (
                  <tr key={cat.categoryCode} className="data-row">
                    <td className="category-cell" title={cat.displayLabel}>
                      {cat.displayLabel}
                    </td>
                    {weeks.map((w) => {
                      const amount = getCategoryAmount(w, cat.categoryCode);
                      const isActual = isCategoryActual(w, cat.categoryCode);
                      return (
                        <td
                          key={w.weekEnding}
                          className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                            isActual ? "amount-actual" : "amount-forecast"
                          } ${amount !== 0 ? "clickable-amount" : ""}`}
                          onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                        >
                          {amount !== 0 ? formatCurrency(amount) : "$0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Facilities */}
            {getCategoriesByGroup("Facilities").length > 0 && (
              <>
                <tr className="section-header facilities">
                  <td colSpan={weeks.length + 1}>FACILITIES</td>
                </tr>
                {getCategoriesByGroup("Facilities").map((cat) => (
                  <tr key={cat.categoryCode} className="data-row">
                    <td className="category-cell" title={cat.displayLabel}>
                      {cat.displayLabel}
                    </td>
                    {weeks.map((w) => {
                      const amount = getCategoryAmount(w, cat.categoryCode);
                      const isActual = isCategoryActual(w, cat.categoryCode);
                      return (
                        <td
                          key={w.weekEnding}
                          className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                            isActual ? "amount-actual" : "amount-forecast"
                          } ${amount !== 0 ? "clickable-amount" : ""}`}
                          onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                        >
                          {amount !== 0 ? formatCurrency(amount) : "$0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* NL Opex */}
            {getCategoriesByGroup("NL Opex").length > 0 && (
              <>
                <tr className="section-header opex">
                  <td colSpan={weeks.length + 1}>NL OPEX</td>
                </tr>
                {getCategoriesByGroup("NL Opex").map((cat) => (
                  <tr key={cat.categoryCode} className="data-row">
                    <td className="category-cell" title={cat.displayLabel}>
                      {cat.displayLabel}
                    </td>
                    {weeks.map((w) => {
                      const amount = getCategoryAmount(w, cat.categoryCode);
                      const isActual = isCategoryActual(w, cat.categoryCode);
                      return (
                        <td
                          key={w.weekEnding}
                          className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                            isActual ? "amount-actual" : "amount-forecast"
                          } ${amount !== 0 ? "clickable-amount" : ""}`}
                          onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                        >
                          {amount !== 0 ? formatCurrency(amount) : "$0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Other/Unclassified */}
            {getCategoriesByGroup("Other").length > 0 && (
              <>
                <tr className="section-header other">
                  <td colSpan={weeks.length + 1}>OTHER</td>
                </tr>
                {getCategoriesByGroup("Other").map((cat) => (
                  <tr key={cat.categoryCode} className="data-row">
                    <td className="category-cell" title={cat.displayLabel}>
                      {cat.displayLabel}
                    </td>
                    {weeks.map((w) => {
                      const amount = getCategoryAmount(w, cat.categoryCode);
                      const isActual = isCategoryActual(w, cat.categoryCode);
                      return (
                        <td
                          key={w.weekEnding}
                          className={`amount-cell ${amount >= 0 ? "amount-positive" : "amount-negative"} ${
                            isActual ? "amount-actual" : "amount-forecast"
                          } ${amount !== 0 ? "clickable-amount" : ""}`}
                          onClick={() => amount !== 0 && handleAmountClick(cat.displayLabel, w.weekEnding, amount)}
                        >
                          {amount !== 0 ? formatCurrency(amount) : "$0"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Totals */}
            <tr className="data-row total-row">
              <td className="category-cell">Total Outflows</td>
              {weeks.map((w) => (
                <td key={w.weekEnding} className="amount-cell amount-negative amount-actual">
                  {formatCurrency(-w.totalOutflows)}
                </td>
              ))}
            </tr>
            <tr className="data-row total-row">
              <td className="category-cell" title="Net change in cash position for each period">
                Net Cash Flow
              </td>
              {weeks.map((w) => (
                <td
                  key={w.weekEnding}
                  className={`amount-cell ${w.netCashFlow >= 0 ? "amount-positive" : "amount-negative"} amount-actual`}
                >
                  {formatCurrency(w.netCashFlow)}
                </td>
              ))}
            </tr>
            <tr className="data-row total-row">
              <td className="category-cell" title="Projected cash balance at end of each period">
                Ending Cash
              </td>
              {weeks.map((w) => (
                <td
                  key={w.weekEnding}
                  className={`amount-cell ${w.endingCash >= 0 ? "amount-positive" : "amount-negative"} amount-actual`}
                >
                  {formatCurrency(w.endingCash)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <DetailModal {...modalState} onClose={() => setModalState((s) => ({ ...s, isOpen: false }))} />

      <style jsx>{`
        .forecast-table-wrapper {
          width: 100%;
          overflow-x: auto;
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }

        .forecast-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
        }

        /* Headers */
        .week-header {
          background: linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .week-header th {
          padding: 12px 8px;
          text-align: center;
          border-right: 1px solid rgba(255, 255, 255, 0.15);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.025em;
          text-transform: uppercase;
          height: 44px;
          white-space: nowrap;
        }

        .week-header th:last-child {
          border-right: none;
        }

        .week-header .category-header {
          text-align: left;
          width: 220px;
          position: sticky;
          left: 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a1e 100%);
          z-index: 21;
        }

        .week-dates {
          background: linear-gradient(135deg, rgba(248, 250, 249, 0.9) 0%, rgba(248, 250, 249, 0.7) 100%);
          border-bottom: 1px solid rgba(30, 58, 30, 0.08);
          position: sticky;
          top: 44px;
          z-index: 20;
        }

        .week-dates td {
          padding: 8px;
          text-align: center;
          border-right: 1px solid rgba(30, 58, 30, 0.06);
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
          height: 32px;
        }

        .week-dates td:first-child {
          position: sticky;
          left: 0;
          background: linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(241, 245, 249, 0.7) 100%);
          z-index: 21;
        }

        .week-dates td:last-child {
          border-right: none;
        }

        /* Current week highlight */
        .current-week {
          background: linear-gradient(135deg, #475569 0%, #64748b 100%) !important;
          color: white !important;
          position: relative;
        }

        .current-week::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
        }

        /* Section headers */
        .section-header td {
          padding: 12px 8px;
          font-weight: 700;
          color: #1e3a1e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 11px;
          background: linear-gradient(135deg, rgba(45, 90, 45, 0.08) 0%, rgba(45, 90, 45, 0.04) 100%);
          border-left: 3px solid;
          height: 40px;
        }

        .section-header.cash-balance td {
          border-left-color: #1e3a1e;
        }

        .section-header.cash-inflows td {
          border-left-color: #2d5a2d;
        }

        .section-header.labor td {
          border-left-color: #3d6b3d;
        }

        .section-header.cogs td {
          border-left-color: #4a7c4a;
        }

        .section-header.facilities td {
          border-left-color: #4a7c4a;
        }

        .section-header.opex td {
          border-left-color: #5e8e5e;
        }

        .section-header.other td {
          border-left-color: #6b7280;
        }

        /* Data rows */
        .data-row {
          border-bottom: 1px solid rgba(30, 58, 30, 0.04);
          transition: all 0.15s ease;
        }

        .data-row:hover {
          background: linear-gradient(135deg, rgba(240, 248, 242, 0.4) 0%, rgba(240, 248, 242, 0.2) 100%);
        }

        .data-row td {
          padding: 8px;
          border-right: 1px solid rgba(30, 58, 30, 0.04);
          text-align: right;
          white-space: nowrap;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.8);
          height: 36px;
          vertical-align: middle;
        }

        .data-row td:last-child {
          border-right: none;
        }

        .category-cell {
          text-align: left !important;
          font-weight: 600;
          color: #374151;
          border-right: 1px solid rgba(30, 58, 30, 0.08) !important;
          background: linear-gradient(135deg, rgba(250, 250, 250, 0.9) 0%, rgba(250, 250, 250, 0.7) 100%) !important;
          cursor: help;
          position: sticky;
          left: 0;
          z-index: 10;
          width: 220px;
          min-width: 220px;
          max-width: 220px;
        }

        .category-cell:hover {
          color: #2d5a2d;
        }

        /* Total rows */
        .total-row {
          background: linear-gradient(135deg, rgba(248, 250, 249, 0.9) 0%, rgba(248, 250, 249, 0.7) 100%);
          font-weight: 700;
          border-top: 2px solid rgba(45, 90, 45, 0.2);
          border-bottom: 2px solid rgba(45, 90, 45, 0.2);
        }

        .total-row td {
          padding: 10px 8px;
          font-weight: 700;
          height: 40px;
        }

        /* Amount styling */
        .amount-cell {
          font-variant-numeric: tabular-nums;
        }

        .amount-positive {
          color: #059669;
          font-weight: 600;
        }

        .amount-negative {
          color: #dc2626;
          font-weight: 600;
        }

        .amount-actual {
          font-weight: 700;
          color: #0f172a;
        }

        .amount-forecast {
          opacity: 0.85;
          font-weight: 500;
        }

        .clickable-amount {
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: rgba(59, 130, 246, 0.4);
          transition: all 0.2s ease;
        }

        .clickable-amount:hover {
          text-decoration-color: #3b82f6;
          background: linear-gradient(135deg, rgba(240, 249, 255, 0.8) 0%, rgba(240, 249, 255, 0.4) 100%);
          border-radius: 4px;
        }

        /* Scrollbar styling */
        .forecast-table-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .forecast-table-wrapper::-webkit-scrollbar-track {
          background: rgba(30, 58, 30, 0.05);
          border-radius: 4px;
        }

        .forecast-table-wrapper::-webkit-scrollbar-thumb {
          background: rgba(30, 58, 30, 0.2);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .forecast-table-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(30, 58, 30, 0.3);
        }
      `}</style>
    </>
  );
}
