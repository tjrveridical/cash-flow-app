import { SupabaseClient } from "@supabase/supabase-js";
import { WeeklyForecast, CategoryForecast, ForecastParams, ForecastResult } from "./types";

/**
 * Get the Sunday (week ending) for a given date
 */
function getWeekEnding(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // Days until Sunday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get beginning cash balance
 * V1: Returns latest manual entry from cash_balances table
 */
async function getBeginningCash(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("cash_balances")
    .select("balance")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .single();

  return data?.balance || 0;
}

export class ForecastService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Generate weekly forecast
   * V1: Historical actuals only (no future projections)
   */
  async generateWeeklyForecast(params: ForecastParams = {}): Promise<ForecastResult> {
    try {
      // Get the latest transaction date to determine forecast range
      const { data: latestTx } = await this.supabase
        .from("raw_transactions")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!latestTx) {
        return {
          success: true,
          weeks: [],
          params,
          message: "No transactions found",
        };
      }

      const latestDate = new Date(latestTx.date);
      const latestWeekEnding = getWeekEnding(latestDate);

      // Determine date range
      const weeksCount = params.weeksCount || 14;
      const endDate = params.endDate ? new Date(params.endDate) : latestWeekEnding;
      const startDate = params.startDate
        ? new Date(params.startDate)
        : new Date(endDate.getTime() - weeksCount * 7 * 24 * 60 * 60 * 1000);

      // Query transactions with classifications and display categories
      const { data: transactions, error } = await this.supabase
        .from("raw_transactions")
        .select(
          `
          id,
          date,
          amount,
          qb_account_name,
          classified_bank_transactions!inner (
            category_code,
            classification
          )
        `
        )
        .gte("date", formatDate(startDate))
        .lte("date", formatDate(endDate))
        .order("date", { ascending: true });

      if (error) {
        throw error;
      }

      // Get display categories for mapping
      const { data: categories } = await this.supabase
        .from("display_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      const categoryMap = new Map(categories?.map((c) => [c.category_code, c]) || []);

      // Group transactions by week and category
      const weekMap = new Map<string, Map<string, CategoryForecast>>();

      for (const tx of transactions || []) {
        const txDate = new Date(tx.date);
        const weekEnding = formatDate(getWeekEnding(txDate));

        // Get classification
        const classified = Array.isArray(tx.classified_bank_transactions)
          ? tx.classified_bank_transactions[0]
          : tx.classified_bank_transactions;

        if (!classified || !classified.category_code) continue;

        const categoryCode = classified.category_code;
        const category = categoryMap.get(categoryCode);

        if (!category) continue;

        // Special handling for AR
        let effectiveCategoryCode = categoryCode;
        let effectiveLabel = category.display_label;

        if (category.display_group === "AR") {
          // Split AR into "AR Collections" vs "Other Revenue"
          if (tx.qb_account_name?.includes("1200 Accounts Receivable")) {
            effectiveCategoryCode = "ar_collections";
            effectiveLabel = "AR Collections";
          } else {
            effectiveCategoryCode = "ar_other_revenue";
            effectiveLabel = "Other Revenue";
          }
        }

        // Get or create week bucket
        if (!weekMap.has(weekEnding)) {
          weekMap.set(weekEnding, new Map());
        }
        const categoryBucket = weekMap.get(weekEnding)!;

        // Get or create category bucket
        if (!categoryBucket.has(effectiveCategoryCode)) {
          categoryBucket.set(effectiveCategoryCode, {
            displayGroup: category.display_group,
            displayLabel: effectiveLabel,
            displayLabel2: category.display_label2,
            categoryCode: effectiveCategoryCode,
            cashDirection: category.cash_direction as "Cashin" | "Cashout",
            amount: 0,
            transactionCount: 0,
            isActual: true,
            sortOrder: category.sort_order || 0,
          });
        }

        const cat = categoryBucket.get(effectiveCategoryCode)!;
        cat.amount += tx.amount;
        cat.transactionCount += 1;
      }

      // Convert to WeeklyForecast array
      const weeks: WeeklyForecast[] = [];
      const beginningCash = await getBeginningCash(this.supabase);
      let runningCash = beginningCash;

      // Sort weeks chronologically
      const sortedWeeks = Array.from(weekMap.keys()).sort();

      for (const weekEnding of sortedWeeks) {
        const categories = Array.from(weekMap.get(weekEnding)!.values()).sort(
          (a, b) => a.sortOrder - b.sortOrder
        );

        const totalInflows = categories
          .filter((c) => c.cashDirection === "Cashin")
          .reduce((sum, c) => sum + c.amount, 0);

        const totalOutflows = categories
          .filter((c) => c.cashDirection === "Cashout")
          .reduce((sum, c) => sum + Math.abs(c.amount), 0);

        const netCashFlow = totalInflows - totalOutflows;
        const endingCash = runningCash + netCashFlow;

        weeks.push({
          weekEnding,
          beginningCash: runningCash,
          totalInflows,
          totalOutflows,
          netCashFlow,
          endingCash,
          categories,
        });

        runningCash = endingCash;
      }

      return {
        success: true,
        weeks,
        params: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          weeksCount,
        },
      };
    } catch (error) {
      console.error("Error generating forecast:", error);
      return {
        success: false,
        weeks: [],
        params,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
