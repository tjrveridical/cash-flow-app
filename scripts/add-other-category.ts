import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addOtherCategory() {
  const { data, error } = await supabase
    .from("display_categories")
    .upsert({
      category_code: "other_other",
      display_group: "Other",
      display_label: "Unclassified",
      display_label2: null,
      cash_direction: "Cashout",
      scope: "forecast",
      sort_order: 9999,
    }, { onConflict: "category_code" });

  if (error) {
    console.error("Error adding category:", error);
    process.exit(1);
  }

  console.log("✅ Added 'other_other' category to display_categories");
}

addOtherCategory();
