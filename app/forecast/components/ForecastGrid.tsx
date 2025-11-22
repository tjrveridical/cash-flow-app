"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
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
  [key: string]: any; // For week columns
}

export function ForecastGrid() {
  const [weeks, setWeeks] = useState<WeeklyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    category: string;
    weekEnding: string;
    amount: number;
  }>({
    isOpen: false,
    title: "",
    category: "",
    weekEnding: "",
    amount: 0,
  });

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    try {
      const response = await fetch("/api/forecast/weeks?weeksCount=26");
      const data = await response.json();
      if (data.success) {
        setWeeks(data.weeks);
      }
    } catch (error) {
      console.error("Error fetching forecast data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for AG-Grid
  const rowData = useMemo(() => {
    if (!weeks.length) return [];

    const rows: GridRow[] = [];
    const groupedCategories = new Map<string, CategoryForecast[]>();

    // Group categories by display_group
    weeks[0]?.categories.forEach((cat) => {
      if (!groupedCategories.has(cat.displayGroup)) {
        groupedCategories.set(cat.displayGroup, []);
      }
    });

    // Collect all unique categories across all weeks
    weeks.forEach((week) => {
      week.categories.forEach((cat) => {
        const group = groupedCategories.get(cat.displayGroup);
        if (group && !group.find((c) => c.categoryCode === cat.categoryCode)) {
          group.push(cat);
        }
      });
    });

    // Add Beginning Cash row
    const beginningCashRow: GridRow = {
      category: "Beginning Cash",
      displayGroup: "CASH BALANCE",
      categoryCode: "beginning_cash",
      isSection: false,
      isTotal: true,
      isCashBalance: true,
    };
    weeks.forEach((week) => {
      beginningCashRow[`week_${week.weekEnding}`] = week.beginningCash;
    });
    rows.push(beginningCashRow);

    // Add CASH INFLOWS section
    rows.push({
      category: "CASH INFLOWS",
      displayGroup: "CASH INFLOWS",
      categoryCode: "section_inflows",
      isSection: true,
      isTotal: false,
      isCashBalance: false,
    });

    // Add AR categories
    const arCategories = groupedCategories.get("AR") || [];
    arCategories.sort((a, b) => a.sortOrder - b.sortOrder);
    arCategories.forEach((cat) => {
      const row: GridRow = {
        category: cat.displayLabel,
        displayGroup: cat.displayGroup,
        categoryCode: cat.categoryCode,
        isSection: false,
        isTotal: false,
        isCashBalance: false,
      };
      weeks.forEach((week) => {
        const weekCat = week.categories.find((c) => c.categoryCode === cat.categoryCode);
        row[`week_${week.weekEnding}`] = weekCat?.amount || 0;
        row[`week_${week.weekEnding}_isActual`] = weekCat?.isActual || false;
      });
      rows.push(row);
    });

    // Add Total Inflows row
    const totalInflowsRow: GridRow = {
      category: "Total Inflows",
      displayGroup: "CASH INFLOWS",
      categoryCode: "total_inflows",
      isSection: false,
      isTotal: true,
      isCashBalance: false,
    };
    weeks.forEach((week) => {
      totalInflowsRow[`week_${week.weekEnding}`] = week.totalInflows;
    });
    rows.push(totalInflowsRow);

    // Add CASH OUTFLOWS sections (Labor, COGS, Facilities, NL Opex, etc.)
    const outflowGroups = ["Labor", "COGS", "Facilities", "NL Opex"];
    outflowGroups.forEach((groupName) => {
      const groupCategories = groupedCategories.get(groupName);
      if (groupCategories && groupCategories.length > 0) {
        // Add section header
        rows.push({
          category: groupName.toUpperCase(),
          displayGroup: groupName,
          categoryCode: `section_${groupName.toLowerCase().replace(/\s+/g, "_")}`,
          isSection: true,
          isTotal: false,
          isCashBalance: false,
        });

        // Add categories
        groupCategories.sort((a, b) => a.sortOrder - b.sortOrder);
        groupCategories.forEach((cat) => {
          const row: GridRow = {
            category: cat.displayLabel + (cat.displayLabel2 ? ` - ${cat.displayLabel2}` : ""),
            displayGroup: cat.displayGroup,
            categoryCode: cat.categoryCode,
            isSection: false,
            isTotal: false,
            isCashBalance: false,
          };
          weeks.forEach((week) => {
            const weekCat = week.categories.find((c) => c.categoryCode === cat.categoryCode);
            row[`week_${week.weekEnding}`] = weekCat?.amount || 0;
            row[`week_${week.weekEnding}_isActual`] = weekCat?.isActual || false;
          });
          rows.push(row);
        });
      }
    });

    // Add Total Outflows row
    const totalOutflowsRow: GridRow = {
      category: "Total Outflows",
      displayGroup: "CASH OUTFLOWS",
      categoryCode: "total_outflows",
      isSection: false,
      isTotal: true,
      isCashBalance: false,
    };
    weeks.forEach((week) => {
      totalOutflowsRow[`week_${week.weekEnding}`] = -week.totalOutflows;
    });
    rows.push(totalOutflowsRow);

    // Add Net Cash Flow row
    const netCashFlowRow: GridRow = {
      category: "Net Cash Flow",
      displayGroup: "SUMMARY",
      categoryCode: "net_cash_flow",
      isSection: false,
      isTotal: true,
      isCashBalance: false,
    };
    weeks.forEach((week) => {
      netCashFlowRow[`week_${week.weekEnding}`] = week.netCashFlow;
    });
    rows.push(netCashFlowRow);

    // Add Ending Cash row
    const endingCashRow: GridRow = {
      category: "Ending Cash",
      displayGroup: "CASH BALANCE",
      categoryCode: "ending_cash",
      isSection: false,
      isTotal: true,
      isCashBalance: true,
    };
    weeks.forEach((week) => {
      endingCashRow[`week_${week.weekEnding}`] = week.endingCash;
    });
    rows.push(endingCashRow);

    return rows;
  }, [weeks]);

  // Currency formatter
  const currencyFormatter = useCallback((params: ValueFormatterParams) => {
    if (params.value === null || params.value === undefined) return "$0";
    const value = typeof params.value === "number" ? params.value : 0;
    const absValue = Math.abs(value);
    const formatted = `$${absValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return value < 0 ? `(${formatted})` : formatted;
  }, []);

  // Cell style
  const cellStyle = useCallback((params: any) => {
    const value = params.value;
    if (value === null || value === undefined) return {};

    const isTotal = params.data?.isTotal;
    const isSection = params.data?.isSection;

    if (isSection) {
      return {
        fontWeight: "600",
        backgroundColor: "rgba(248, 250, 249, 0.9)",
      };
    }

    if (isTotal) {
      return {
        fontWeight: "600",
        backgroundColor: "rgba(248, 250, 249, 0.7)",
        borderTop: "1px solid rgba(30, 58, 30, 0.1)",
        color: value >= 0 ? "#059669" : "#dc2626",
      };
    }

    return {
      color: value >= 0 ? "#059669" : "#dc2626",
    };
  }, []);

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [
      {
        field: "category",
        headerName: "Category",
        pinned: "left",
        width: 220,
        cellClass: "font-medium",
        cellStyle: (params) => {
          if (params.data?.isSection) {
            return {
              fontWeight: "700",
              fontSize: "11px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#1e3a1e",
              backgroundColor: "rgba(248, 250, 249, 0.95)",
            };
          }
          if (params.data?.isTotal) {
            return {
              fontWeight: "600",
              backgroundColor: "rgba(248, 250, 249, 0.8)",
            };
          }
          return {};
        },
      },
    ];

    // Add week columns
    weeks.forEach((week) => {
      const weekDate = new Date(week.weekEnding);
      const headerName = `Week Ending ${weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      cols.push({
        field: `week_${week.weekEnding}`,
        headerName,
        width: 140,
        type: "numericColumn",
        valueFormatter: currencyFormatter,
        cellStyle,
        cellClass: (params) => {
          const isActual = params.data?.[`week_${week.weekEnding}_isActual`];
          return isActual ? "amount-actual" : "amount-forecast";
        },
        onCellDoubleClicked: (params) => {
          if (!params.data?.isSection && !params.data?.isCashBalance) {
            setModalState({
              isOpen: true,
              title: params.data.category,
              category: params.data.displayGroup,
              weekEnding: week.weekEnding,
              amount: params.value || 0,
            });
          }
        },
      });
    });

    return cols;
  }, [weeks, currencyFormatter, cellStyle]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-slate-600">Loading forecast data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="ag-theme-quartz w-full" style={{ height: "calc(100vh - 180px)" }}>
        <AgGridReact
          theme="quartz"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          suppressMovableColumns={true}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
          domLayout="normal"
          headerHeight={44}
          rowHeight={36}
        />
      </div>

      <DetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        category={modalState.category}
        weekEnding={modalState.weekEnding}
        amount={modalState.amount}
      />

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

        .ag-pinned-left-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a1e 100%);
        }

        .ag-cell {
          display: flex;
          align-items: center;
          border-right: 1px solid rgba(30, 58, 30, 0.06);
        }

        .ag-row {
          border-bottom: 1px solid rgba(30, 58, 30, 0.05);
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
