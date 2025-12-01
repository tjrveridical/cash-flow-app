import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface EditRequest {
  id: string; // classified_bank_transactions.id
  transactionId: string; // raw_transactions.id
  edits: {
    vendor?: string;
    amount?: number;
    date?: string;
    category_code?: string;
  };
  reason: string;
  edited_by: string;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: EditRequest = await request.json();
    const { id, transactionId, edits, reason, edited_by } = body;

    // Validation
    if (!id || !transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Reason for edit is required" },
        { status: 400 }
      );
    }

    if (Object.keys(edits).length === 0) {
      return NextResponse.json(
        { success: false, error: "No changes specified" },
        { status: 400 }
      );
    }

    // Fetch current values for audit trail
    const { data: currentClassified, error: fetchClassifiedError } = await supabase
      .from("classified_bank_transactions")
      .select("category_code")
      .eq("id", id)
      .single();

    if (fetchClassifiedError) {
      throw fetchClassifiedError;
    }

    const { data: currentRaw, error: fetchRawError } = await supabase
      .from("raw_transactions")
      .select("name, amount, date")
      .eq("id", transactionId)
      .single();

    if (fetchRawError) {
      throw fetchRawError;
    }

    // Create audit log entries for each changed field
    const auditEntries = [];
    const editedAt = new Date().toISOString();

    if (edits.vendor !== undefined && edits.vendor !== currentRaw.name) {
      auditEntries.push({
        classified_transaction_id: id,
        field_name: "vendor",
        old_value: currentRaw.name,
        new_value: edits.vendor,
        reason,
        edited_by,
        edited_at: editedAt,
      });
    }

    if (edits.amount !== undefined && edits.amount !== currentRaw.amount) {
      auditEntries.push({
        classified_transaction_id: id,
        field_name: "amount",
        old_value: currentRaw.amount.toString(),
        new_value: edits.amount.toString(),
        reason,
        edited_by,
        edited_at: editedAt,
      });
    }

    if (edits.date !== undefined && edits.date !== currentRaw.date) {
      auditEntries.push({
        classified_transaction_id: id,
        field_name: "date",
        old_value: currentRaw.date,
        new_value: edits.date,
        reason,
        edited_by,
        edited_at: editedAt,
      });
    }

    if (edits.category_code !== undefined && edits.category_code !== currentClassified.category_code) {
      auditEntries.push({
        classified_transaction_id: id,
        field_name: "category_code",
        old_value: currentClassified.category_code || "",
        new_value: edits.category_code,
        reason,
        edited_by,
        edited_at: editedAt,
      });
    }

    // Update raw_transactions if vendor, amount, or date changed
    const rawUpdates: any = {};
    if (edits.vendor !== undefined) rawUpdates.name = edits.vendor;
    if (edits.amount !== undefined) rawUpdates.amount = edits.amount;
    if (edits.date !== undefined) rawUpdates.date = edits.date;

    if (Object.keys(rawUpdates).length > 0) {
      const { error: rawUpdateError } = await supabase
        .from("raw_transactions")
        .update(rawUpdates)
        .eq("id", transactionId);

      if (rawUpdateError) {
        throw rawUpdateError;
      }
    }

    // Update classified_bank_transactions if category changed
    if (edits.category_code !== undefined) {
      const { error: classifiedUpdateError } = await supabase
        .from("classified_bank_transactions")
        .update({ category_code: edits.category_code })
        .eq("id", id);

      if (classifiedUpdateError) {
        throw classifiedUpdateError;
      }
    }

    // Insert audit trail entries
    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from("ledger_edits")
        .insert(auditEntries);

      if (auditError) {
        console.error("Failed to create audit trail:", auditError);
        // Don't fail the request if audit fails, but log it
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${auditEntries.length} field(s)`,
      fieldsChanged: auditEntries.length,
    });
  } catch (error) {
    console.error("Error editing ledger transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
