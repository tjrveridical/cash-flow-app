import { RawTxInput, ClassificationRecord } from "./types";

/**
 * ML-based classification suggestion (stub for v1)
 *
 * Future implementation could:
 * - Call an ML model API
 * - Use embeddings for semantic similarity
 * - Apply neural network classification
 *
 * For now, always returns null to indicate no ML suggestion available
 */
export async function getMlSuggestion(
  rawTx: RawTxInput
): Promise<ClassificationRecord | null> {
  // TODO: Implement ML-based classification in v2
  return null;
}
