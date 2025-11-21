import { SupabaseClient } from "@supabase/supabase-js";
import { RawTxInput, ClassificationRecord } from "./types";

/**
 * Normalize description for comparison
 */
function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "");
}

/**
 * Calculate similarity between two strings (simple word overlap)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeDescription(str1).split(" "));
  const words2 = new Set(normalizeDescription(str2).split(" "));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Infer classification from historical transactions
 * Looks for similar past transactions by GL account or description
 */
export async function inferFromHistory(
  rawTx: RawTxInput,
  supabase: SupabaseClient
): Promise<ClassificationRecord | null> {
  // Query 1: Find past classifications with the same GL account number
  if (rawTx.qb_account_number) {
    const { data: byGLAccount } = await supabase
      .from("classified_bank_transactions")
      .select(
        `
        classification,
        classification_source,
        transaction:raw_transactions!transaction_id (
          qb_account_number,
          description
        )
      `
      )
      .eq("transaction.qb_account_number", rawTx.qb_account_number)
      .not("classification_source", "eq", "imported")
      .limit(10);

    if (byGLAccount && byGLAccount.length > 0) {
      // Count classifications
      const classificationCounts: Record<string, number> = {};
      for (const record of byGLAccount) {
        const classification = record.classification;
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
      }

      // Find most common classification
      let maxCount = 0;
      let mostCommon = "";
      for (const [classification, count] of Object.entries(classificationCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = classification;
        }
      }

      // If >70% of past transactions have the same classification, use it
      if (maxCount / byGLAccount.length >= 0.7) {
        return {
          transactionId: rawTx.id,
          classification: mostCommon,
          classificationSource: "history",
          notes: `Inferred from ${maxCount} past transactions with same GL account`,
        };
      }
    }
  }

  // Query 2: Find past classifications with similar descriptions
  const { data: allClassified } = await supabase
    .from("classified_bank_transactions")
    .select(
      `
      classification,
      classification_source,
      transaction:raw_transactions!transaction_id (
        description
      )
    `
    )
    .not("classification_source", "eq", "imported")
    .limit(100);

  if (allClassified && allClassified.length > 0) {
    // Find similar descriptions
    const similarMatches: Array<{ classification: string; similarity: number }> = [];

    for (const record of allClassified) {
      if (!record.transaction || typeof record.transaction !== "object") continue;
      const txData = record.transaction as { description?: string };
      if (!txData.description) continue;

      const similarity = calculateSimilarity(rawTx.description, txData.description);
      if (similarity >= 0.6) {
        similarMatches.push({
          classification: record.classification,
          similarity,
        });
      }
    }

    if (similarMatches.length > 0) {
      // Count classifications weighted by similarity
      const weightedCounts: Record<string, number> = {};
      for (const match of similarMatches) {
        weightedCounts[match.classification] =
          (weightedCounts[match.classification] || 0) + match.similarity;
      }

      // Find highest weighted classification
      let maxWeight = 0;
      let bestMatch = "";
      for (const [classification, weight] of Object.entries(weightedCounts)) {
        if (weight > maxWeight) {
          maxWeight = weight;
          bestMatch = classification;
        }
      }

      if (bestMatch) {
        return {
          transactionId: rawTx.id,
          classification: bestMatch,
          classificationSource: "history",
          notes: `Inferred from ${similarMatches.length} similar past transactions`,
        };
      }
    }
  }

  return null;
}
