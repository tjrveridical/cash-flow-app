"use client";

import { useEffect, useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ValueFormatterParams, CellClassParams, CellDoubleClickedEvent, CellStyle } from "ag-grid-community";
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

interface GridRow {
  category: string;
  displayGroup: string;
  categoryCode: string;
  isSection: boolean;
  isTotal: boolean;
  isCashBalance: boolean;
  [key: string]: any;
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
      .then(r => r.json())
      .then(data => {
        console.log("API response:", data);
        if (data.success) setWeeks(data.weeks);
      })
      .finally(() => setLoading(false));
  }, []);

  const rowData = useMemo(() => {
    console.log("rowData useMemo - weeks:", weeks);
    if (!weeks.length) return [];

    const rows: GridRow[] = [];
    const allCats = new Map<string, CategoryForecast>();
    weeks.forEach(w => w.categories.forEach(c => allCats.set(c.categoryCode, c)));
    console.log("allCats size:", allCats.size);

    const addRow = (cat: CategoryForecast) => {
      const row: GridRow = {
        category: cat.displayLabel + (cat.displayLabel2 ? ` - ${cat.displayLabel2}` : ""),
        displayGroup: cat.displayGroup,
        categoryCode: cat.categoryCode,
        isSection: false,
        isTotal: false,
        isCashBalance: false,
      };
      weeks.forEach(w => {
        const wc = w.categories.find(c => c.categoryCode === cat.categoryCode);
        row[`week_${w.weekEnding}`] = wc?.amount ?? 0;
        row[`week_${w.weekEnding}_isActual`] = wc?.isActual ?? false;
      });
      rows.push(row);
    };

    // Beginning Cash + Inflows (only once)
    if (weeks.length > 0) {
      rows.push({ category: "Beginning Cash", displayGroup: "CASH BALANCE", categoryCode: "beginning", isSection: false, isTotal: true, isCashBalance: true, ...weeks.reduce((a, ww) => ({ ...a, [`week_${ww.weekEnding}`]: ww.beginningCash }), {}) });
      rows.push({ category: "CASH INFLOWS", displayGroup: "CASH INFLOWS", categoryCode: "section_in", isSection: true, isTotal: false, isCashBalance: false });
      Array.from(allCats.values()).filter(c => c.displayGroup === "AR").sort((a,b) => a.sortOrder - b.sortOrder).forEach(addRow);
      rows.push({ category: "Total Inflows", displayGroup: "CASH INFLOWS", categoryCode: "total_in", isSection: false, isTotal: true, isCashBalance: false, ...weeks.reduce((a, ww) => ({ ...a, [`week_${ww.weekEnding}`]: ww.totalInflows }), {}) });
    }

    // Outflow sections
    ["Labor", "COGS", "Facilities", "NL Opex"].forEach(group => {
      const cats = Array.from(allCats.values()).filter(c => c.displayGroup === group).sort((a,b) => a.sortOrder - b.sortOrder);
      if (cats.length === 0) return;
      rows.push({ category: group.toUpperCase(), displayGroup: group, categoryCode: `section_${group}`, isSection: true, isTotal: false, isCashBalance: false });
      cats.forEach(addRow);
    });

    rows.push({ category: "Total Outflows", displayGroup: "CASH OUTFLOWS", categoryCode: "total_out", isSection: false, isTotal: true, isCashBalance: false, ...weeks.reduce((a, ww) => ({ ...a, [`week_${ww.weekEnding}`]: -ww.totalOutflows }), {}) });
    rows.push({ category: "Net Cash Flow", displayGroup: "SUMMARY", categoryCode: "net", isSection: false, isTotal: true, isCashBalance: false, ...weeks.reduce((a, ww) => ({ ...a, [`week_${ww.weekEnding}`]: ww.netCashFlow }), {}) });
    rows.push({ category: "Ending Cash", displayGroup: "CASH BALANCE", categoryCode: "ending", isSection: false, isTotal: true, isCashBalance: true, ...weeks.reduce((a, ww) => ({ ...a, [`week_${ww.weekEnding}`]: ww.endingCash }), {}) });

    console.log("Generated rows:", rows.length, rows);
    return rows;
  }, [weeks]);

  const currencyFormatter = (p: ValueFormatterParams) => {
    const v = p.value ?? 0;
    return v < 0 ? `($${Math.abs(v).toLocaleString()})` : `$${v.toLocaleString()}`;
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "category",
      headerName: "Category",
      pinned: "left",
      width: 220,
      cellStyle: (p): CellStyle => {
        if (p.data?.isSection) {
          return { fontWeight: "700", fontSize: "11px", textTransform: "uppercase", color: "#1e3a1e", backgroundColor: "rgba(248,250,249,0.95)" };
        }
        if (p.data?.isTotal) {
          return { fontWeight: "600", backgroundColor: "rgba(248,250,249,0.8)" };
        }
        return {};
      }
    },
    ...weeks.map(w => ({
      field: `week_${w.weekEnding}`,
      headerName: `Week Ending ${new Date(w.weekEnding).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      width: 140,
      valueFormatter: currencyFormatter,
      cellStyle: (p: any): CellStyle => ({ color: (p.value ?? 0) >= 0 ? "#059669" : "#dc2626" }),
      cellClass: (p: CellClassParams) => p.data?.[`week_${w.weekEnding}_isActual`] ? "amount-actual" : "amount-forecast",
      onCellDoubleClicked: (p: CellDoubleClickedEvent) => {
        if (!p.data?.isSection && !p.data?.isCashBalance) {
          setModalState({
            isOpen: true,
            title: p.data.category,
            category: p.data.displayGroup,
            weekEnding: w.weekEnding,
            amount: p.value || 0
          });
        }
      },
    }))
  ], [weeks]);

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-600">Loading...</div>;

  return (
    <>
      <div className="ag-theme-quartz w-full" style={{ height: "calc(100vh - 180px)" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: false }}
          suppressMovableColumns
          domLayout="normal"
          headerHeight={44}
          rowHeight={36}
        />
      </div>
      <DetailModal {...modalState} onClose={() => setModalState(s => ({ ...s, isOpen: false }))} />
      <style jsx global>{`
        .ag-theme-quartz {
          --ag-font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif;
          --ag-font-size: 12px;
          --ag-header-height: 44px;
          --ag-header-foreground-color: white;
          --ag-header-background-color: linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%);
          --ag-odd-row-background-color: rgba(255, 255, 255, 0.4);
          --ag-row-hover-color: rgba(255, 255, 255, 0.8);
          --ag-border-color: rgba(30, 58, 30, 0.08);
          --ag-row-border-color: rgba(30, 58, 30, 0.05);
        }
        .ag-header {
          background: linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        .ag-header-cell {
          border-right: 1px solid rgba(255, 255, 255, 0.15);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.025em;
          text-transform: uppercase;
        }
        .ag-cell {
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(30, 58, 30, 0.06);
        }
        .amount-actual {
          font-weight: 500;
        }
        .amount-forecast {
          font-weight: 400;
          opacity: 0.85;
        }
      `}</style>
    </>
  );
}
