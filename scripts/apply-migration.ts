import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/20251123_payment_rules_system.sql"
  );

  const migrationSQL = fs.readFileSync(migrationPath, "utf8");

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Applying migration with ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
    console.log(statement.substring(0, 100) + "...");

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });
      if (error) {
        console.error(`Error on statement ${i + 1}:`, error);
        // Try direct query approach
        const { error: directError } = await supabase.from("_sql").select(statement);
        if (directError) {
          console.error("Direct query also failed:", directError);
        }
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`Exception on statement ${i + 1}:`, err);
    }
  }

  console.log("\n✅ Migration application completed");
}

applyMigration();
