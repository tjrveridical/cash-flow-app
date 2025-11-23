import { createClient } from "@supabase/supabase-js";
import { classifyTransaction } from "@/lib/classification/engine";
import { RawTxInput } from "@/lib/classification/types";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export class ClassificationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async classifyAll() {
    try {
      // Calculate date 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateFilter = oneYearAgo.toISOString().split("T")[0];

      // Fetch unclassified raw_transactions from last year
      const { data: unclassified, error: queryError } = await this.supabase
        .from("raw_transactions")
        .select(
          `
          *,
          classified:classified_bank_transactions!transaction_id (id)
        `
        )
        .is("classified.id", null)
        .gte("date", dateFilter);

      if (queryError) {
        console.error("Error querying unclassified transactions:", queryError);
        return {
          success: false,
          message: queryError.message,
          classifiedCount: 0,
        };
      }

      if (!unclassified || unclassified.length === 0) {
        return {
          success: true,
          message: "No unclassified transactions found",
          classifiedCount: 0,
        };
      }

      let classifiedCount = 0;

      for (const row of unclassified) {
        const rawTx: RawTxInput = {
          id: row.id,
          date: row.date,
          amount: row.amount,
          description: row.description || "",
          source_system: row.source_system,
          source_id: row.source_id,
          metadata: row.metadata || {},
          transaction_type: row.transaction_type,
          qb_account_number: row.qb_account_number,
          qb_account_name: row.qb_account_name,
        };

        try {
          const classification = await classifyTransaction(rawTx, this.supabase);

          if (classification) {
            // Insert classification record
            const { error: insertError } = await this.supabase
              .from("classified_bank_transactions")
              .insert({
                transaction_id: classification.transactionId,
                category_code: classification.categoryCode,
                classification: classification.classification,
                classification_source: classification.classificationSource,
                rule_id: classification.ruleId || null,
                confidence_score: null,
                notes: classification.notes || null,
                classified_at: new Date().toISOString(),
                classified_by: SYSTEM_USER_ID,
              });

            if (insertError) {
              console.error(
                `Error inserting classification for transaction ${rawTx.id}:`,
                insertError
              );
              continue;
            }

            classifiedCount++;
          }
        } catch (err) {
          console.error(`Error classifying transaction ${rawTx.id}:`, err);
          continue;
        }
      }

      return {
        success: true,
        classifiedCount,
      };
    } catch (error) {
      console.error("Classification service error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        classifiedCount: 0,
      };
    }
  }
}
