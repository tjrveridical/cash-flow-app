import { SupabaseClient } from "@supabase/supabase-js";
import { WeeklyForecast, CategoryForecast, ForecastParams, ForecastResult } from "./types";
import { DateGenerator, PaymentRule } from "./date-generator";

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
        .eq("classified_bank_transactions.is_verified", true)
        .order("date", { ascending: true });

      if (error) {
        throw error;
      }

      // Generate ALL week endings in the range
      const allWeekEndings: string[] = [];
      let currentWeek = getWeekEnding(new Date(startDate));
      const finalWeek = getWeekEnding(new Date(endDate));

      while (currentWeek <= finalWeek) {
        allWeekEndings.push(formatDate(currentWeek));
        currentWeek = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Get display categories for mapping
      const { data: categories } = await this.supabase
        .from("display_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      const categoryMap = new Map(categories?.map((c) => [c.category_code, c]) || []);

      // Initialize weekMap with ALL weeks (empty)
      const weekMap = new Map<string, Map<string, CategoryForecast>>();
      for (const weekEnding of allWeekEndings) {
        weekMap.set(weekEnding, new Map());
      }

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

      // Fetch AR forecasts for future weeks
      const { data: arForecasts } = await this.supabase
        .from("ar_forecast")
        .select("*")
        .gte("week_ending", formatDate(latestWeekEnding));

      // Add AR forecasts to future weeks
      if (arForecasts && arForecasts.length > 0) {
        for (const forecast of arForecasts) {
          const weekEnding = forecast.week_ending;

          // Skip if we already have AR collections actuals for this week
          const categoryBucket = weekMap.get(weekEnding);
          if (!categoryBucket || categoryBucket.has("ar_collections")) continue;

          // Add AR forecast to the week
          if (forecast.forecasted_amount > 0) {
            categoryBucket.set("ar_collections", {
              displayGroup: "AR",
              displayLabel: "AR Collections",
              displayLabel2: null,
              categoryCode: "ar_collections",
              cashDirection: "Cashin",
              amount: forecast.forecasted_amount,
              transactionCount: 0,
              isActual: false, // This is a forecast
              sortOrder: 1, // AR Collections should be first
            });
          }
        }
      }

      // Fetch active forecast items with payment rules for expense projections
      const { data: forecastItems } = await this.supabase
        .from("forecast_items")
        .select(
          `
          id,
          vendor_name,
          category_code,
          estimated_amount,
          payment_rule:payment_rules!rule_id (
            id,
            frequency,
            anchor_days,
            exception_rule
          )
        `
        )
        .eq("is_active", true);

      // Generate expense forecasts from forecast_items
      if (forecastItems && forecastItems.length > 0) {
        const dateGenerator = new DateGenerator();

        for (const item of forecastItems) {
          if (!item.payment_rule || !item.estimated_amount) continue;

          const rule = Array.isArray(item.payment_rule)
            ? item.payment_rule[0]
            : item.payment_rule;

          if (!rule) continue;

          // Convert DB rule to PaymentRule interface
          const paymentRule: PaymentRule = {
            frequency: rule.frequency,
            anchor_days: rule.anchor_days,
            exception_rule: rule.exception_rule,
          };

          // Generate payment dates for this item
          const paymentDates = dateGenerator.generateDates(
            paymentRule,
            startDate,
            endDate
          );

          // For each payment date, add to appropriate week
          for (const paymentDate of paymentDates) {
            const weekEnding = formatDate(getWeekEnding(paymentDate));

            // Only add to future weeks (after latest actual transaction)
            if (new Date(weekEnding) <= latestWeekEnding) continue;

            // Get or create week bucket
            if (!weekMap.has(weekEnding)) {
              weekMap.set(weekEnding, new Map());
            }
            const categoryBucket = weekMap.get(weekEnding)!;

            // Get category display info
            const category = categoryMap.get(item.category_code);
            if (!category) continue;

            // Get or create category bucket
            if (!categoryBucket.has(item.category_code)) {
              categoryBucket.set(item.category_code, {
                displayGroup: category.display_group,
                displayLabel: category.display_label,
                displayLabel2: category.display_label2,
                categoryCode: item.category_code,
                cashDirection: category.cash_direction as "Cashin" | "Cashout",
                amount: 0,
                transactionCount: 0,
                isActual: false, // This is a forecast
                sortOrder: category.sort_order || 0,
              });
            }

            const cat = categoryBucket.get(item.category_code)!;
            cat.amount += item.estimated_amount;
            cat.transactionCount += 1;
          }
        }
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
