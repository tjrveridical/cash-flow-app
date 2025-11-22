/**
 * Forecast Types
 * Data structures for weekly cash flow forecasting
 */

export interface WeeklyForecast {
  weekEnding: string; // ISO date string (Sunday)
  beginningCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  endingCash: number;
  categories: CategoryForecast[];
}

export interface CategoryForecast {
  displayGroup: string; // e.g., "AR", "Labor", "COGS", "Facilities"
  displayLabel: string; // e.g., "Payroll", "Rent", "Hardware"
  displayLabel2?: string | null; // e.g., "Nurse Call", "PXP"
  categoryCode: string; // e.g., "labor_payroll"
  cashDirection: "Cashin" | "Cashout";
  amount: number; // Positive for inflows, negative for outflows
  transactionCount: number;
  isActual: boolean; // true if based on real transactions, false if forecasted
  sortOrder: number;
}

export interface ForecastParams {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  weeksCount?: number; // Alternative to endDate
}

export interface ForecastResult {
  success: boolean;
  weeks: WeeklyForecast[];
  params: ForecastParams;
  message?: string;
}

export interface CashBalance {
  id: string;
  bankAccount: string;
  asOfDate: string;
  balance: number;
  notes?: string;
}
