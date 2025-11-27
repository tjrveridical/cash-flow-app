"use client";

import { useState, useEffect } from "react";

// Types
type PaydateRule = {
  id: string;
  rule_name: string;
  frequency: "Weekly" | "SemiMonthly" | "Monthly" | "Quarterly" | "SemiAnnual" | "Annually";
  anchor_day: string;
  anchor_day2: number | null;
  months: string | null;
  business_day_adjustment: "next" | "previous";
  created_at: string;
  updated_at: string;
};

type RuleFormData = {
  frequency: string;
  anchor_day: string;
  anchor_day2?: number | null;
  months?: string | null;
  business_day_adjustment: string;
  // Weekly specific
  dayOfWeek?: string;
  // Monthly specific
  dayOfMonth?: string;
  isEOM?: boolean;
  // SemiMonthly specific
  semiAnchor1?: string;
  semiAnchor2?: string;
  // Quarterly specific
  quarterlyDay?: string;
  quarterlyMonth?: string;
  // SemiAnnual specific
  semiAnnualDay1?: string;
  semiAnnualMonth1?: string;
  semiAnnualDay2?: string;
  semiAnnualMonth2?: string;
  // Annually specific
  annualDay?: string;
  annualMonth?: string;
};

const monthMap: Record<string, string> = {
  Jan: "1",
  Feb: "2",
  Mar: "3",
  Apr: "4",
  May: "5",
  Jun: "6",
  Jul: "7",
  Aug: "8",
  Sep: "9",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export default function PaydateRulesPage() {
  const [rules, setRules] = useState<PaydateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PaydateRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    frequency: "",
    anchor_day: "",
    business_day_adjustment: "next",
  });
  const [generatedRuleName, setGeneratedRuleName] = useState("—");
  const [duplicateError, setDuplicateError] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch rules on mount
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/paydate-rules");
      const data = await response.json();

      if (data.success) {
        setRules(data.rules);
      } else {
        console.error("Failed to fetch rules:", data.error);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: rules.length,
    weekly: rules.filter(r => r.frequency === "Weekly").length,
    monthly: rules.filter(r => r.frequency === "Monthly").length,
    quarterly: rules.filter(r => r.frequency === "Quarterly").length,
    annual: rules.filter(r => r.frequency === "Annually").length,
    semiMonthly: rules.filter(r => r.frequency === "SemiMonthly").length,
    semiAnnual: rules.filter(r => r.frequency === "SemiAnnual").length,
  };

  // Open modal for create
  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      frequency: "",
      anchor_day: "",
      business_day_adjustment: "next",
    });
    setGeneratedRuleName("—");
    setDuplicateError(false);
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (rule: PaydateRule) => {
    setEditingRule(rule);
    setGeneratedRuleName(rule.rule_name);
    setDuplicateError(false);

    // Reverse monthMap for lookup
    const reverseMonthMap: Record<string, string> = {};
    Object.entries(monthMap).forEach(([key, value]) => {
      reverseMonthMap[value] = key;
    });

    // Build form data by reverse-engineering the stored values
    const newFormData: RuleFormData = {
      frequency: rule.frequency,
      anchor_day: rule.anchor_day,
      anchor_day2: rule.anchor_day2,
      months: rule.months,
      business_day_adjustment: rule.business_day_adjustment,
    };

    // Populate frequency-specific fields
    if (rule.frequency === "Weekly") {
      newFormData.dayOfWeek = rule.anchor_day; // Mon, Tue, etc.
    } else if (rule.frequency === "Monthly") {
      if (rule.anchor_day === "EOM") {
        newFormData.isEOM = true;
        newFormData.dayOfMonth = "";
      } else {
        newFormData.isEOM = false;
        newFormData.dayOfMonth = rule.anchor_day;
      }
    } else if (rule.frequency === "SemiMonthly") {
      newFormData.semiAnchor1 = rule.anchor_day;
      newFormData.semiAnchor2 = rule.anchor_day2?.toString() || "";
    } else if (rule.frequency === "Quarterly") {
      newFormData.quarterlyDay = rule.anchor_day;
      // Extract first month from months string (e.g., "1,4,7,10" -> "1" -> "Jan")
      if (rule.months) {
        const firstMonth = rule.months.split(",")[0];
        newFormData.quarterlyMonth = reverseMonthMap[firstMonth] || "";
      }
    } else if (rule.frequency === "SemiAnnual") {
      newFormData.semiAnnualDay1 = rule.anchor_day;
      newFormData.semiAnnualDay2 = rule.anchor_day2?.toString() || "";
      // Extract two months from months string (e.g., "4,10" -> ["4", "10"] -> ["Apr", "Oct"])
      if (rule.months) {
        const [month1, month2] = rule.months.split(",");
        newFormData.semiAnnualMonth1 = reverseMonthMap[month1] || "";
        newFormData.semiAnnualMonth2 = reverseMonthMap[month2] || "";
      }
    } else if (rule.frequency === "Annually") {
      newFormData.annualDay = rule.anchor_day;
      // Extract month from months string (e.g., "6" -> "Jun")
      if (rule.months) {
        newFormData.annualMonth = reverseMonthMap[rule.months] || "";
      }
    }

    setFormData(newFormData);
    setModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setEditingRule(null);
    setFormData({
      frequency: "",
      anchor_day: "",
      business_day_adjustment: "next",
    });
    setGeneratedRuleName("—");
    setDuplicateError(false);
  };

  // Update form fields when frequency changes
  const updateFormFields = (frequency: string) => {
    setFormData(prev => ({
      ...prev,
      frequency,
      // Reset fields
      dayOfWeek: undefined,
      dayOfMonth: undefined,
      isEOM: false,
      semiAnchor1: undefined,
      semiAnchor2: undefined,
      quarterlyDay: undefined,
      quarterlyMonth: undefined,
      semiAnnualDay1: undefined,
      semiAnnualMonth1: undefined,
      semiAnnualDay2: undefined,
      semiAnnualMonth2: undefined,
      annualDay: undefined,
      annualMonth: undefined,
    }));
    generateRuleName(frequency, {});
  };

  // Generate rule name based on form data
  const generateRuleName = (frequency: string, data: Partial<RuleFormData>) => {
    let ruleName = "";

    if (frequency === "Weekly") {
      ruleName = data.dayOfWeek ? `Weekly_${data.dayOfWeek}` : "Weekly_";
    } else if (frequency === "Monthly") {
      if (data.isEOM) {
        ruleName = "Monthly_EOM";
      } else if (data.dayOfMonth) {
        const padded = data.dayOfMonth.padStart(2, "0");
        ruleName = `Monthly_${padded}`;
      } else {
        ruleName = "Monthly_";
      }
    } else if (frequency === "SemiMonthly") {
      if (data.semiAnchor1 && data.semiAnchor2) {
        ruleName = `SemiMonthly_${data.semiAnchor1}_${data.semiAnchor2}`;
      } else {
        ruleName = "SemiMonthly_";
      }
    } else if (frequency === "Quarterly") {
      if (data.quarterlyDay && data.quarterlyMonth) {
        const padded = data.quarterlyDay.padStart(2, "0");
        ruleName = `Quarterly_${padded}_${data.quarterlyMonth}`;
      } else {
        ruleName = "Quarterly_";
      }
    } else if (frequency === "SemiAnnual") {
      if (data.semiAnnualDay1 && data.semiAnnualMonth1 && data.semiAnnualDay2 && data.semiAnnualMonth2) {
        ruleName = `SemiAnnual_${data.semiAnnualDay1}${data.semiAnnualMonth1}_${data.semiAnnualDay2}${data.semiAnnualMonth2}`;
      } else {
        ruleName = "SemiAnnual_";
      }
    } else if (frequency === "Annually") {
      if (data.annualDay && data.annualMonth) {
        const padded = data.annualDay.padStart(2, "0");
        ruleName = `Annually_${padded}_${data.annualMonth}`;
      } else {
        ruleName = "Annually_";
      }
    }

    setGeneratedRuleName(ruleName || "—");
    return ruleName;
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    generateRuleName(formData.frequency, newFormData);
    setDuplicateError(false);
  };

  // Toggle EOM checkbox
  const toggleEOM = (checked: boolean) => {
    const newFormData = {
      ...formData,
      isEOM: checked,
      dayOfMonth: checked ? "" : formData.dayOfMonth,
      business_day_adjustment: checked ? "previous" : formData.business_day_adjustment,
    };
    setFormData(newFormData);
    generateRuleName(formData.frequency, newFormData);
  };

  // Check for duplicate rule name
  const checkDuplicate = (ruleName: string): boolean => {
    return rules.some(r => r.rule_name === ruleName && r.id !== editingRule?.id);
  };

  // Save rule (create or update)
  const saveRule = async () => {
    if (generatedRuleName === "—" || generatedRuleName.endsWith("_")) {
      showToast("Please fill in all required fields");
      return;
    }

    if (checkDuplicate(generatedRuleName)) {
      setDuplicateError(true);
      return;
    }

    setSubmitting(true);

    try {
      // Build payload based on frequency
      let payload: any = {
        rule_name: generatedRuleName,
        frequency: formData.frequency,
        business_day_adjustment: formData.business_day_adjustment,
      };

      // Set anchor_day, anchor_day2, and months based on frequency
      if (formData.frequency === "Weekly") {
        payload.anchor_day = formData.dayOfWeek;
        payload.anchor_day2 = null;
        payload.months = null;
      } else if (formData.frequency === "Monthly") {
        payload.anchor_day = formData.isEOM ? "EOM" : formData.dayOfMonth;
        payload.anchor_day2 = null;
        payload.months = null;
      } else if (formData.frequency === "SemiMonthly") {
        payload.anchor_day = formData.semiAnchor1;
        payload.anchor_day2 = parseInt(formData.semiAnchor2 || "0");
        payload.months = null;
      } else if (formData.frequency === "Quarterly") {
        payload.anchor_day = formData.quarterlyDay;
        payload.anchor_day2 = null;
        // Generate quarter pattern based on starting month
        const startMonth = monthMap[formData.quarterlyMonth || ""];
        const months = [parseInt(startMonth)];
        for (let i = 1; i < 4; i++) {
          months.push((months[0] + i * 3 - 1) % 12 + 1);
        }
        payload.months = months.sort((a, b) => a - b).join(",");
      } else if (formData.frequency === "SemiAnnual") {
        payload.anchor_day = formData.semiAnnualDay1;
        payload.anchor_day2 = parseInt(formData.semiAnnualDay2 || "0");
        const month1 = monthMap[formData.semiAnnualMonth1 || ""];
        const month2 = monthMap[formData.semiAnnualMonth2 || ""];
        payload.months = [month1, month2].sort((a, b) => parseInt(a) - parseInt(b)).join(",");
      } else if (formData.frequency === "Annually") {
        payload.anchor_day = formData.annualDay;
        payload.anchor_day2 = null;
        payload.months = monthMap[formData.annualMonth || ""];
      }

      const url = editingRule
        ? `/api/paydate-rules/${editingRule.id}`
        : "/api/paydate-rules";
      const method = editingRule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast(editingRule ? "Rule updated successfully!" : "Rule created successfully!");
        closeModal();
        fetchRules();
      } else {
        showToast(data.error || "Failed to save rule");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      showToast("An error occurred while saving the rule");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete rule
  const deleteRule = async (rule: PaydateRule) => {
    // Check dependencies first
    try {
      const depResponse = await fetch(`/api/paydate-rules/${rule.id}/dependencies`);
      const depData = await depResponse.json();

      if (depData.count > 0) {
        if (!confirm(`Delete ${rule.rule_name}? This will affect ${depData.count} forecast item(s).`)) {
          return;
        }
      } else {
        if (!confirm(`Delete ${rule.rule_name}?`)) {
          return;
        }
      }

      const response = await fetch(`/api/paydate-rules/${rule.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showToast(`${rule.rule_name} deleted successfully`);
        fetchRules();
      } else {
        showToast(data.error || "Failed to delete rule");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      showToast("An error occurred while deleting the rule");
    }
  };

  // Show toast notification
  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Get frequency badge class
  const getFrequencyBadgeClass = (frequency: string) => {
    const baseClass = "inline-block px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide";
    switch (frequency) {
      case "Weekly":
        return `${baseClass} bg-blue-50 text-blue-700`;
      case "SemiMonthly":
        return `${baseClass} bg-teal-50 text-teal-700`;
      case "Monthly":
        return `${baseClass} bg-green-50 text-green-700`;
      case "Quarterly":
        return `${baseClass} bg-orange-50 text-orange-700`;
      case "SemiAnnual":
        return `${baseClass} bg-purple-50 text-purple-700`;
      case "Annually":
        return `${baseClass} bg-red-50 text-red-700`;
      default:
        return baseClass;
    }
  };

  // Get adjustment badge class
  const getAdjBadgeClass = (adj: string) => {
    const baseClass = "inline-block px-2 py-0.5 rounded text-[9px] font-semibold";
    if (adj === "next") {
      return `${baseClass} bg-green-50 text-green-700`;
    }
    return `${baseClass} bg-orange-50 text-orange-700`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] px-8 py-6 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Paydate Rules</h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/15 border border-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/25 transition">
              Import Templates
            </button>
            <button className="px-4 py-2 bg-white/15 border border-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/25 transition">
              Export Rules
            </button>
            <button
              onClick={openCreateModal}
              className="px-5 py-2 bg-white/95 text-[#1e3a1e] rounded-lg text-sm font-bold hover:bg-white transition shadow-sm"
            >
              Create Rule
            </button>
            <div className="px-3 py-1.5 bg-white/20 border border-white/30 text-white rounded-full text-xs font-semibold uppercase tracking-wider">
              CFO
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-[1fr_280px] gap-6">
          {/* Table */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-left text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Rule Name
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-left text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Frequency
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-center text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Anchor Day
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-center text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Anchor Day 2
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-center text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Months
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-center text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Adj
                    </th>
                    <th className="px-3 py-3 bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-right text-[11px] font-semibold uppercase tracking-wide border-b-2 border-white/10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-transparent transition"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900" style={{ height: "36px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {rule.rule_name}
                      </td>
                      <td className="px-3 py-2" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        <span className={getFrequencyBadgeClass(rule.frequency)}>
                          {rule.frequency}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        {rule.anchor_day}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        {rule.anchor_day2 || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 text-[11px]" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        {rule.months || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        <span className={getAdjBadgeClass(rule.business_day_adjustment)}>
                          {rule.business_day_adjustment === "next" ? "Next" : "Prev"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ height: "36px", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => openEditModal(rule)}
                          className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[11px] font-medium hover:bg-orange-100 transition mr-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRule(rule)}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded text-[11px] font-medium hover:bg-red-100 transition"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="flex flex-col gap-3">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Rules</div>
              <div className="text-xl font-bold text-[#1e3a1e]">{stats.total}</div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Weekly Rules</div>
              <div className="text-xl font-bold text-[#1e3a1e]">{stats.weekly}</div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Monthly Rules</div>
              <div className="text-xl font-bold text-[#1e3a1e]">{stats.monthly}</div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Quarterly Rules</div>
              <div className="text-xl font-bold text-[#1e3a1e]">{stats.quarterly}</div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Annual Rules</div>
              <div className="text-xl font-bold text-[#1e3a1e]">{stats.annual}</div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-sm p-4 relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d5a2d] via-[#4a7c4a] to-[#5e8e5e]"></div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Updated</div>
              <div className="text-sm font-bold text-[#1e3a1e]">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          onClick={closeModal}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1e3a1e]">
                {editingRule ? "Edit Paydate Rule" : "Create Paydate Rule"}
              </h2>
              <button
                onClick={closeModal}
                className="text-3xl text-slate-400 hover:text-red-600 transition leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6">
              {/* Rule Name Preview */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50/50 to-transparent border border-green-100 rounded-lg text-center">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Rule Name Preview
                </div>
                <div className="text-lg font-bold text-[#1e3a1e]" style={{ fontFeatureSettings: '"tnum" 1' }}>
                  {generatedRuleName}
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-2 gap-5">
                {/* Frequency */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => updateFormFields(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                  >
                    <option value="">Select frequency...</option>
                    <option value="Weekly">Weekly</option>
                    <option value="SemiMonthly">SemiMonthly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="SemiAnnual">SemiAnnual</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>

                {/* Weekly Fields */}
                {formData.frequency === "Weekly" && (
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Day of Week
                    </label>
                    <select
                      value={formData.dayOfWeek || ""}
                      onChange={(e) => handleFieldChange("dayOfWeek", e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                    >
                      <option value="">Select day...</option>
                      <option value="Sun">Sunday</option>
                      <option value="Mon">Monday</option>
                      <option value="Tue">Tuesday</option>
                      <option value="Wed">Wednesday</option>
                      <option value="Thu">Thursday</option>
                      <option value="Fri">Friday</option>
                      <option value="Sat">Saturday</option>
                    </select>
                  </div>
                )}

                {/* Monthly Fields */}
                {formData.frequency === "Monthly" && (
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Day of Month
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth || ""}
                      onChange={(e) => handleFieldChange("dayOfMonth", e.target.value)}
                      disabled={formData.isEOM}
                      placeholder="1-31"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={formData.isEOM || false}
                        onChange={(e) => toggleEOM(e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label className="text-xs text-slate-600">End of Month</label>
                    </div>
                  </div>
                )}

                {/* SemiMonthly Fields */}
                {formData.frequency === "SemiMonthly" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        1st Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.semiAnchor1 || ""}
                        onChange={(e) => handleFieldChange("semiAnchor1", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        2nd Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.semiAnchor2 || ""}
                        onChange={(e) => handleFieldChange("semiAnchor2", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                  </>
                )}

                {/* Quarterly Fields */}
                {formData.frequency === "Quarterly" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Anchor Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.quarterlyDay || ""}
                        onChange={(e) => handleFieldChange("quarterlyDay", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Starting Month
                      </label>
                      <select
                        value={formData.quarterlyMonth || ""}
                        onChange={(e) => handleFieldChange("quarterlyMonth", e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      >
                        <option value="">Select month...</option>
                        {Object.keys(monthMap).map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* SemiAnnual Fields */}
                {formData.frequency === "SemiAnnual" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        1st Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.semiAnnualDay1 || ""}
                        onChange={(e) => handleFieldChange("semiAnnualDay1", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        1st Month
                      </label>
                      <select
                        value={formData.semiAnnualMonth1 || ""}
                        onChange={(e) => handleFieldChange("semiAnnualMonth1", e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      >
                        <option value="">Select month...</option>
                        {Object.keys(monthMap).map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        2nd Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.semiAnnualDay2 || ""}
                        onChange={(e) => handleFieldChange("semiAnnualDay2", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        2nd Month
                      </label>
                      <select
                        value={formData.semiAnnualMonth2 || ""}
                        onChange={(e) => handleFieldChange("semiAnnualMonth2", e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      >
                        <option value="">Select month...</option>
                        {Object.keys(monthMap).map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Annually Fields */}
                {formData.frequency === "Annually" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Anchor Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.annualDay || ""}
                        onChange={(e) => handleFieldChange("annualDay", e.target.value)}
                        placeholder="1-31"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Month
                      </label>
                      <select
                        value={formData.annualMonth || ""}
                        onChange={(e) => handleFieldChange("annualMonth", e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20"
                      >
                        <option value="">Select month...</option>
                        {Object.keys(monthMap).map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Business Day Adjustment */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Business Day Adjustment
                  </label>
                  <select
                    value={formData.business_day_adjustment}
                    onChange={(e) => handleFieldChange("business_day_adjustment", e.target.value)}
                    disabled={formData.isEOM}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#2d5a2d] focus:ring-2 focus:ring-[#2d5a2d]/20 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="next">Next Business Day</option>
                    <option value="previous">Previous Business Day</option>
                  </select>
                </div>

                {/* Duplicate Error */}
                {duplicateError && (
                  <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    A rule with this name already exists. Please use different values.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-200 flex justify-between">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#2d5a2d] to-[#3d6b3d] text-white rounded-lg text-sm font-bold hover:from-[#1e3a1e] hover:to-[#2d5a2d] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-8 right-8 px-6 py-4 bg-gradient-to-r from-[#2d5a2d] to-[#3d6b3d] text-white rounded-xl shadow-2xl text-sm font-medium z-50 animate-slideIn">
          {toast.message}
        </div>
      )}
    </div>
  );
}
