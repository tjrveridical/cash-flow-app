"use client";

import { useState, useEffect } from "react";

interface WeekOption {
  date: string;
  label: string;
  weekNumber: number;
}

interface SetBeginningCashModalProps {
  onClose: () => void;
  onSave: (data: { as_of_date: string; balance: number; notes?: string }) => Promise<void>;
  currentBeginningCash?: number;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function generateWeekOptions(): WeekOption[] {
  const weeks: WeekOption[] = [];
  const today = new Date();

  // Find next Monday
  const nextMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  // Generate ±12 weeks from next Monday
  for (let i = -12; i <= 12; i++) {
    const weekDate = new Date(nextMonday);
    weekDate.setDate(nextMonday.getDate() + (i * 7));

    const weekNum = getWeekNumber(weekDate);

    weeks.push({
      date: weekDate.toISOString().split('T')[0],
      label: `Week ${weekNum} - ${weekDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`,
      weekNumber: weekNum
    });
  }

  return weeks;
}

export function SetBeginningCashModal({ onClose, onSave, currentBeginningCash }: SetBeginningCashModalProps) {
  const [weeks] = useState<WeekOption[]>(generateWeekOptions());
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Default to next Monday (middle of the list)
    if (weeks.length > 0) {
      setSelectedWeek(weeks[12].date); // Index 12 is next Monday (0-indexed, -12 to +12)
    }

    // Pre-populate balance if provided
    if (currentBeginningCash) {
      setBalance(currentBeginningCash.toString());
    }
  }, [weeks, currentBeginningCash]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const formatCurrency = (value: string): string => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");

    if (!numericValue) return "";

    // Convert to number and format with commas
    const number = parseInt(numericValue, 10);
    return number.toLocaleString("en-US");
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");
    setBalance(numericValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!selectedWeek) {
      setError("Please select a week");
      return;
    }

    if (!balance || parseFloat(balance) <= 0) {
      setError("Please enter a valid beginning cash amount");
      return;
    }

    setLoading(true);

    try {
      await onSave({
        as_of_date: selectedWeek,
        balance: parseFloat(balance),
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError("Failed to save beginning cash. Please try again.");
      console.error("Error saving:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-2xl w-full p-7 my-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(30, 58, 30, 0.08)',
          boxShadow: '0 20px 60px rgba(30, 58, 30, 0.15), 0 4px 12px rgba(30, 58, 30, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center mb-6 pb-4"
          style={{
            borderBottom: '1px solid rgba(30, 58, 30, 0.08)',
          }}
        >
          <h2
            className="text-xl"
            style={{
              fontWeight: 650,
              color: '#1e3a1e',
              letterSpacing: '-0.015em',
            }}
          >
            Set Beginning Cash
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Week Starting */}
          <div className="mb-5">
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Week Starting (Monday)
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {weeks.map((week) => (
                <option key={week.date} value={week.date}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>

          {/* Beginning Cash Amount */}
          <div className="mb-5">
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Beginning Cash Amount
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                style={{
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                $
              </span>
              <input
                type="text"
                value={formatCurrency(balance)}
                onChange={handleBalanceChange}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 text-sm rounded-lg transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(30, 58, 30, 0.15)',
                  color: '#1e293b',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2d5a2d';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-[11px] uppercase mb-2" style={{ fontWeight: 600, color: '#475569', letterSpacing: '0.02em' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bank reconciliation, wire transfer, etc."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 text-sm rounded-lg transition-all resize-none"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(30, 58, 30, 0.15)',
                color: '#1e293b',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2d5a2d';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 90, 45, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(30, 58, 30, 0.1)',
                color: '#475569',
                fontWeight: 550,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(30, 58, 30, 0.1)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm rounded-lg transition-all"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)',
                border: '1px solid transparent',
                color: 'white',
                fontWeight: 550,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1) inset',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 90, 45, 0.2), 0 1px 0 rgba(255, 255, 255, 0.15) inset';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2d5a2d 0%, #3d6b3d 100%)';
                  e.currentTarget.style.boxShadow = '0 1px 0 rgba(255, 255, 255, 0.1) inset';
                }
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
