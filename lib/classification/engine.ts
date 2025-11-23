import { SupabaseClient } from "@supabase/supabase-js";
import { RawTxInput, ClassificationRecord } from "./types";
import { applyRules } from "./rules";
import { inferFromHistory } from "./historical";
import { getMlSuggestion } from "./mlAssist";

// System user ID placeholder for automated classifications
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Convert raw_transactions row to RawTxInput
 */
function toRawTxInput(row: any): RawTxInput {
  return {
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
}

/**
 * Classify a single transaction using the decision tree:
 * 1. Skip if already manually classified
 * 2. Try rules
 * 3. Try historical inference
 * 4. Try ML suggestion
 * 5. Mark as unclassified
 */
export async function classifyTransaction(
  rawTx: RawTxInput,
  supabase: SupabaseClient
): Promise<ClassificationRecord | null> {
  // Check if this transaction already has a manual classification
  const { data: existing } = await supabase
    .from("classified_bank_transactions")
    .select("id, classification_source")
    .eq("transaction_id", rawTx.id)
    .single();

  if (existing && existing.classification_source === "manual") {
    // Don't overwrite manual classifications
    return null;
  }

  // Try rules-based classification
  let result = applyRules(rawTx);
  if (result) {
    return result;
  }

  // Try historical inference
  result = await inferFromHistory(rawTx, supabase);
  if (result) {
    return result;
  }

  // Try ML suggestion
  result = await getMlSuggestion(rawTx);
  if (result) {
    return result;
  }

  // Default: mark as unclassified
  return {
    transactionId: rawTx.id,
    categoryCode: "other_other",
    classification: "Unclassified",
    classificationSource: "rules",
    notes: "No classification rules or patterns matched",
  };
}

/**
 * Classify a batch of unclassified transactions
 * @param limit Maximum number of transactions to classify
 * @param supabase Supabase client
 * @returns Number of transactions classified
 */
export async function classifyBatch(
  limit: number,
  supabase: SupabaseClient
): Promise<number> {
  // First check total raw transactions
  const { data: allRaw, error: countError } = await supabase
    .from("raw_transactions")
    .select("id", { count: "exact" });
  console.log(`Total raw_transactions: ${allRaw?.length || 0}`);

  // Find raw transactions that don't have a classification record yet
  const { data: unclassified, error: queryError } = await supabase
    .from("raw_transactions")
    .select(
      `
      *,
      classified:classified_bank_transactions!transaction_id (id)
    `
    )
    .is("classified.id", null)
    .limit(limit);

  console.log(`Unclassified found: ${unclassified?.length || 0}`);
  console.log(`Query error:`, queryError);

  if (queryError) {
    console.error("Error querying unclassified transactions:", queryError);
    throw queryError;
  }

  if (!unclassified || unclassified.length === 0) {
    return 0;
  }

  let classifiedCount = 0;

  for (const row of unclassified) {
    const rawTx = toRawTxInput(row);

    try {
      const classification = await classifyTransaction(rawTx, supabase);

      if (classification) {
        // Insert classification record
        const { error: insertError } = await supabase
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

  return classifiedCount;
}

/**
 * Re-classify a specific transaction (even if already classified)
 * Useful for updating classifications when rules change
 */
export async function reclassifyTransaction(
  transactionId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // Get the raw transaction
  const { data: rawRow, error: fetchError } = await supabase
    .from("raw_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (fetchError || !rawRow) {
    console.error("Error fetching transaction:", fetchError);
    return false;
  }

  const rawTx = toRawTxInput(rawRow);

  // Classify using rules and history (skip manual check)
  let result = applyRules(rawTx);
  if (!result) {
    result = await inferFromHistory(rawTx, supabase);
  }
  if (!result) {
    result = await getMlSuggestion(rawTx);
  }
  if (!result) {
    result = {
      transactionId: rawTx.id,
      categoryCode: "other_other",
      classification: "Unclassified",
      classificationSource: "rules",
      notes: "No classification rules or patterns matched",
    };
  }

  // Update or insert classification
  const { data: existing } = await supabase
    .from("classified_bank_transactions")
    .select("id, classification_source")
    .eq("transaction_id", transactionId)
    .single();

  if (existing && existing.classification_source === "manual") {
    // Don't overwrite manual classifications
    return false;
  }

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from("classified_bank_transactions")
      .update({
        category_code: result.categoryCode,
        classification: result.classification,
        classification_source: result.classificationSource,
        rule_id: result.ruleId || null,
        notes: result.notes || null,
        classified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return !updateError;
  } else {
    // Insert new
    const { error: insertError } = await supabase
      .from("classified_bank_transactions")
      .insert({
        transaction_id: result.transactionId,
        category_code: result.categoryCode,
        classification: result.classification,
        classification_source: result.classificationSource,
        rule_id: result.ruleId || null,
        confidence_score: null,
        notes: result.notes || null,
        classified_at: new Date().toISOString(),
        classified_by: SYSTEM_USER_ID,
      });

    return !insertError;
  }
}
