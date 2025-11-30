"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  category_code: string;
  display_group: string;
  display_label: string;
  display_label2: string | null;
  cash_direction: "Cashin" | "Cashout";
  sort_order: number;
}

interface EditingRow {
  category_code: string | null; // null for new row
  display_group: string;
  display_label: string;
  display_label2: string;
  category_code_value: string;
  cash_direction: "Cashin" | "Cashout";
  sort_order: number;
}

const DISPLAY_GROUPS = ["Labor", "COGS", "Facilities", "NL Opex", "Insurance", "Taxes", "Other", "AR"];
const CASH_DIRECTIONS: ("Cashin" | "Cashout")[] = ["Cashin", "Cashout"];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/display-categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingRow({
      category_code: null, // New row
      display_group: "",
      display_label: "",
      display_label2: "",
      category_code_value: "",
      cash_direction: "Cashout",
      sort_order: 0,
    });
    setError(null);
  };

  const handleEdit = (category: Category) => {
    setEditingRow({
      category_code: category.category_code,
      display_group: category.display_group,
      display_label: category.display_label,
      display_label2: category.display_label2 || "",
      category_code_value: category.category_code,
      cash_direction: category.cash_direction,
      sort_order: category.sort_order,
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingRow(null);
    setError(null);
  };

  const generateCategoryCode = (displayGroup: string, displayLabel: string): string => {
    if (!displayGroup || !displayLabel) return "";
    const group = displayGroup.toLowerCase().replace(/\s+/g, "_");
    const label = displayLabel.toLowerCase().replace(/\s+/g, "_");
    return `${group}_${label}`;
  };

  const suggestSortOrder = (displayGroup: string): number => {
    if (!displayGroup) return 0;
    const groupCategories = categories.filter((c) => c.display_group === displayGroup);
    if (groupCategories.length === 0) return 1;
    return Math.max(...groupCategories.map((c) => c.sort_order)) + 1;
  };

  const handleSave = async () => {
    if (!editingRow) return;

    // Validation
    if (!editingRow.display_group.trim()) {
      setError("Display group is required");
      return;
    }
    if (!editingRow.display_label.trim()) {
      setError("Display label is required");
      return;
    }
    if (!editingRow.category_code_value.trim()) {
      setError("Category code is required");
      return;
    }
    if (!editingRow.cash_direction) {
      setError("Cash direction is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isNew = editingRow.category_code === null;
      const url = isNew
        ? "/api/display-categories"
        : `/api/display-categories/${editingRow.category_code}`;
      const method = isNew ? "POST" : "PUT";

      const body: any = {
        display_group: editingRow.display_group.trim(),
        display_label: editingRow.display_label.trim(),
        display_label2: editingRow.display_label2.trim() || null,
        category_code: editingRow.category_code_value.trim(),
        cash_direction: editingRow.cash_direction,
        sort_order: editingRow.sort_order,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCategories();
        setEditingRow(null);
        setSuccessFlash(editingRow.category_code_value);
        setTimeout(() => setSuccessFlash(null), 2000);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryCode: string) => {
    if (!confirm(`Are you sure you want to delete category "${categoryCode}"?`)) return;

    try {
      const res = await fetch(`/api/display-categories/${categoryCode}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        await fetchCategories();
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("An error occurred while deleting");
    }
  };

  // Determine hierarchy level for a category
  const getHierarchyLevel = (cat: Category): number => {
    if (cat.display_label2) return 3; // Has label2 = Level 3
    if (cat.display_label === cat.display_group) return 1; // Label matches group = Level 1
    return 2; // Otherwise Level 2
  };

  // Get parent label for level 3 categories
  const getParentLabel = (cat: Category): string | null => {
    if (cat.display_label2) return cat.display_label;
    return null;
  };

  // Check if two categories can swap (same group, same level, same parent if level 3)
  const canSwap = (cat1: Category, cat2: Category): boolean => {
    if (cat1.display_group !== cat2.display_group) return false;
    const level1 = getHierarchyLevel(cat1);
    const level2 = getHierarchyLevel(cat2);
    if (level1 !== level2) return false;
    if (level1 === 3) {
      return getParentLabel(cat1) === getParentLabel(cat2);
    }
    return true;
  };

  // Find previous valid swap candidate
  const findPreviousSwappable = (currentIndex: number): number => {
    const currentCat = categories[currentIndex];
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (canSwap(currentCat, categories[i])) {
        return i;
      }
    }
    return -1;
  };

  // Find next valid swap candidate
  const findNextSwappable = (currentIndex: number): number => {
    const currentCat = categories[currentIndex];
    for (let i = currentIndex + 1; i < categories.length; i++) {
      if (canSwap(currentCat, categories[i])) {
        return i;
      }
    }
    return -1;
  };

  // Handle moving category up
  const handleMoveUp = async (categoryCode: string) => {
    const currentIndex = categories.findIndex((c) => c.category_code === categoryCode);
    if (currentIndex === -1) return;

    const prevIndex = findPreviousSwappable(currentIndex);
    if (prevIndex === -1) return;

    await swapCategories(categories[currentIndex], categories[prevIndex]);
  };

  // Handle moving category down
  const handleMoveDown = async (categoryCode: string) => {
    const currentIndex = categories.findIndex((c) => c.category_code === categoryCode);
    if (currentIndex === -1) return;

    const nextIndex = findNextSwappable(currentIndex);
    if (nextIndex === -1) return;

    await swapCategories(categories[currentIndex], categories[nextIndex]);
  };

  // Swap sort_order between two categories
  const swapCategories = async (cat1: Category, cat2: Category) => {
    try {
      // Swap sort_order values
      const tempSortOrder = cat1.sort_order;
      const newSortOrder1 = cat2.sort_order;
      const newSortOrder2 = tempSortOrder;

      // Update both categories
      const [res1, res2] = await Promise.all([
        fetch(`/api/display-categories/${cat1.category_code}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: newSortOrder1 }),
        }),
        fetch(`/api/display-categories/${cat2.category_code}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: newSortOrder2 }),
        }),
      ]);

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      if (data1.success && data2.success) {
        await fetchCategories();
      } else {
        alert("Failed to reorder categories");
      }
    } catch (error) {
      console.error("Error swapping categories:", error);
      alert("An error occurred while reordering");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  // Group stats
  const groupStats = DISPLAY_GROUPS.map((group) => ({
    group,
    count: categories.filter((c) => c.display_group === group).length,
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <header className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[20px] border-b border-[#1e3a1e]/8 px-6 py-3.5 sticky top-0 z-10 shadow-sm shadow-[#1e3a1e]/4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-semibold bg-gradient-to-br from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
            Manage Categories
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/forecast")}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white/80 backdrop-blur-sm border border-[#1e3a1e]/10 rounded-lg hover:bg-white/95 hover:border-[#1e3a1e]/15 hover:shadow-sm transition-all"
            >
              Back to Forecast
            </button>
            <button
              onClick={handleAddNew}
              disabled={editingRow !== null}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-lg hover:shadow-lg hover:shadow-[#2d5a2d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add New
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 flex gap-6">
        {/* Main Table */}
        <div className="flex-1">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-xl shadow-lg shadow-[#1e3a1e]/4 border border-[#1e3a1e]/8 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-br from-[#f8faf9]/90 to-[#f8faf9]/70 backdrop-blur-sm">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 w-32">
                      Display Group
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8">
                      Display Label
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8">
                      Display Label2
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8">
                      Category Code
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 w-28">
                      Cash Direction
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 w-20">
                      Order
                    </th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wide border-b border-[#1e3a1e]/8 w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* New/Editing Row */}
                  {editingRow && (
                    <EditingRowComponent
                      editingRow={editingRow}
                      setEditingRow={setEditingRow}
                      handleSave={handleSave}
                      handleCancel={handleCancel}
                      handleKeyDown={handleKeyDown}
                      saving={saving}
                      generateCategoryCode={generateCategoryCode}
                      suggestSortOrder={suggestSortOrder}
                    />
                  )}

                  {/* Existing Rows */}
                  {categories.map((category) => {
                    const isEditing =
                      editingRow?.category_code === category.category_code;
                    const isSuccess = successFlash === category.category_code;

                    if (isEditing) return null;

                    return (
                      <tr
                        key={category.id}
                        onClick={() => !editingRow && handleEdit(category)}
                        className={`cursor-pointer hover:bg-[#f0f8f2]/30 transition-all ${
                          isSuccess ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="px-4 py-1.5 text-sm font-medium text-slate-900 border-b border-[#1e3a1e]/4">
                          {category.display_group}
                        </td>
                        <td className="px-4 py-1.5 text-sm text-slate-700 border-b border-[#1e3a1e]/4">
                          {category.display_label}
                        </td>
                        <td className="px-4 py-1.5 text-sm text-slate-500 border-b border-[#1e3a1e]/4">
                          {category.display_label2 || "-"}
                        </td>
                        <td className="px-4 py-1.5 text-sm text-slate-600 font-mono border-b border-[#1e3a1e]/4">
                          {category.category_code}
                        </td>
                        <td className="px-4 py-1.5 text-sm text-slate-700 border-b border-[#1e3a1e]/4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              category.cash_direction === "Cashin"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {category.cash_direction}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-center border-b border-[#1e3a1e]/4">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveUp(category.category_code);
                              }}
                              disabled={
                                findPreviousSwappable(
                                  categories.findIndex((c) => c.category_code === category.category_code)
                                ) === -1
                              }
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveDown(category.category_code);
                              }}
                              disabled={
                                findNextSwappable(
                                  categories.findIndex((c) => c.category_code === category.category_code)
                                ) === -1
                              }
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-1.5 text-center border-b border-[#1e3a1e]/4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(category.category_code);
                            }}
                            className="px-3 py-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {categories.length === 0 && !editingRow && (
                <div className="px-5 py-12 text-center">
                  <div className="text-sm text-slate-500">No categories yet</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Click "+ Add New" to create one
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="w-64">
          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-[24px] rounded-xl shadow-lg shadow-[#1e3a1e]/4 border border-[#1e3a1e]/8 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Categories by Group
            </h3>
            <div className="space-y-2">
              {groupStats.map((stat) => (
                <div key={stat.group} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{stat.group}</span>
                  <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {stat.count}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-200 my-2"></div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-700">Total</span>
                <span className="text-[#2d5a2d] bg-green-50 px-2 py-0.5 rounded">
                  {categories.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Editing Row Component
function EditingRowComponent({
  editingRow,
  setEditingRow,
  handleSave,
  handleCancel,
  handleKeyDown,
  saving,
  generateCategoryCode,
  suggestSortOrder,
}: {
  editingRow: EditingRow;
  setEditingRow: (row: EditingRow) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  saving: boolean;
  generateCategoryCode: (displayGroup: string, displayLabel: string) => string;
  suggestSortOrder: (displayGroup: string) => number;
}) {
  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // Auto-focus first field when editing row appears
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Auto-suggest category code when display_group or display_label changes
    if (editingRow.display_group && editingRow.display_label && !editingRow.category_code_value) {
      const suggested = generateCategoryCode(editingRow.display_group, editingRow.display_label);
      setEditingRow({ ...editingRow, category_code_value: suggested });
    }
  }, [editingRow.display_group, editingRow.display_label]);

  useEffect(() => {
    // Auto-suggest sort order when display_group changes
    if (editingRow.display_group && editingRow.sort_order === 0) {
      const suggested = suggestSortOrder(editingRow.display_group);
      setEditingRow({ ...editingRow, sort_order: suggested });
    }
  }, [editingRow.display_group]);

  return (
    <tr className="bg-blue-50/50 border-l-4 border-l-blue-500" onKeyDown={handleKeyDown}>
      <td className="px-2 py-1 border-b border-[#1e3a1e]/4">
        <select
          ref={firstInputRef}
          value={editingRow.display_group || ""}
          onChange={(e) => setEditingRow({ ...editingRow, display_group: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent bg-white"
        >
          <option value="">Select...</option>
          {DISPLAY_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1 border-b border-[#1e3a1e]/4">
        <input
          type="text"
          value={editingRow.display_label || ""}
          onChange={(e) => setEditingRow({ ...editingRow, display_label: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent"
          spellCheck="true"
        />
      </td>
      <td className="px-2 py-1 border-b border-[#1e3a1e]/4">
        <input
          type="text"
          value={editingRow.display_label2 || ""}
          onChange={(e) => setEditingRow({ ...editingRow, display_label2: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent"
          placeholder="Optional"
          spellCheck="true"
        />
      </td>
      <td className="px-2 py-1 border-b border-[#1e3a1e]/4">
        <input
          type="text"
          value={editingRow.category_code_value || ""}
          onChange={(e) => setEditingRow({ ...editingRow, category_code_value: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent font-mono"
          placeholder={generateCategoryCode(editingRow.display_group, editingRow.display_label)}
        />
      </td>
      <td className="px-2 py-1 border-b border-[#1e3a1e]/4">
        <select
          value={editingRow.cash_direction}
          onChange={(e) =>
            setEditingRow({ ...editingRow, cash_direction: e.target.value as "Cashin" | "Cashout" })
          }
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2d5a2d] focus:border-transparent bg-white"
        >
          {CASH_DIRECTIONS.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1 text-center border-b border-[#1e3a1e]/4">
        <span className="text-sm text-slate-500 font-medium">
          {editingRow.sort_order || suggestSortOrder(editingRow.display_group)}
        </span>
      </td>
      <td className="px-2 py-1 text-center border-b border-[#1e3a1e]/4">
        <div className="flex gap-1 justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-[11px] font-medium text-white bg-gradient-to-br from-[#2d5a2d] to-[#3d6b3d] rounded-md hover:shadow-md transition-all disabled:opacity-50"
          >
            {saving ? "..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
