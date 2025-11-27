"use client";

import { useState, useEffect, useRef } from "react";

interface WeekData {
  weekEnding: string; // ISO date string (Sunday)
  weekNumber: number;
  amount: number;
  isActual: boolean; // true if from actual transactions
  forecastId?: string; // UUID if from ar_forecast table
}

export default function ARForecastPage() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Scroll to current week on initial load
  useEffect(() => {
    if (weeks.length > 0 && scrollContainerRef.current) {
      const currentWeekIndex = weeks.findIndex(
        (w) => new Date(w.weekEnding) >= new Date()
      );
      if (currentWeekIndex > 0) {
        // Scroll to current week minus a few weeks for context
        const scrollPosition = Math.max(0, (currentWeekIndex - 3) * 128); // 128px per column
        scrollContainerRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [weeks]);

  async function fetchData() {
    try {
      setLoading(true);

      // 1. Fetch actual AR Collections from forecast API
      const actualsRes = await fetch("/api/forecast/weeks?weeksCount=52");
      const actualsData = await actualsRes.json();

      // 2. Fetch forecasted amounts
      const forecastRes = await fetch("/api/ar-forecast");
      const forecastData = await forecastRes.json();

      // 3. Build week array from Jan 1 of current year to 14 weeks in future
      const now = new Date();
      const currentYear = now.getFullYear();
      const startDate = new Date(currentYear, 0, 1); // Jan 1

      // Find next Sunday from start date
      const daysUntilSunday = (7 - startDate.getDay()) % 7;
      const firstSunday = new Date(startDate);
      firstSunday.setDate(firstSunday.getDate() + daysUntilSunday);

      // Calculate end date (14 weeks from now)
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14 * 7);

      const weeksArray: WeekData[] = [];
      let currentDate = new Date(firstSunday);
      let weekNum = 1;

      while (currentDate <= endDate) {
        const weekEndingStr = currentDate.toISOString().split("T")[0];

        // Find actual AR Collections for this week
        const actualWeek = actualsData.weeks?.find(
          (w: any) => w.weekEnding === weekEndingStr
        );
        const actualAmount = actualWeek?.categories?.find(
          (c: any) => c.categoryCode === "ar_collections"
        )?.amount || 0;

        // Find forecast for this week
        const forecast = forecastData.forecasts?.find(
          (f: any) => f.week_ending === weekEndingStr
        );

        // Determine if this week has actuals
        const isActual = actualAmount !== 0;

        weeksArray.push({
          weekEnding: weekEndingStr,
          weekNumber: weekNum,
          amount: isActual ? actualAmount : forecast?.forecasted_amount || 0,
          isActual,
          forecastId: forecast?.id,
        });

        // Move to next Sunday
        currentDate.setDate(currentDate.getDate() + 7);
        weekNum++;
      }

      setWeeks(weeksArray);
    } catch (error) {
      console.error("Error fetching AR forecast data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveAmount(weekEnding: string, amount: number) {
    try {
      await fetch("/api/ar-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_ending: weekEnding,
          forecasted_amount: amount,
        }),
      });
      await fetchData(); // Refresh
    } catch (error) {
      console.error("Error saving AR forecast:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6] flex items-center justify-center">
        <div className="text-[#2d5a2d] font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#f5f7f6]">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-xl border-b border-[rgba(30,58,30,0.08)] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-[650] bg-gradient-to-r from-[#1e3a1e] via-[#2d5a2d] to-[#3d6b3d] bg-clip-text text-transparent">
              AR Forecast
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manual weekly AR collection projections
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-[rgba(30,58,30,0.1)] rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white/95 transition-all text-sm font-medium text-[#2d5a2d]"
            >
              Export
            </button>
            <div className="px-3 py-1.5 rounded-md bg-gradient-to-r from-[#1e3a1e] to-[#2d5a2d] text-white text-xs font-semibold uppercase tracking-wide">
              CFO
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-6 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Instructions:</strong> Actual weeks show historical AR
          collections (bold, read-only). Future weeks show forecasted amounts
          (blue, italic). Click any future week to enter or edit forecast
          amount.
        </div>
      </div>

      {/* Week Grid */}
      <div className="px-6 pb-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-[rgba(30,58,30,0.08)] shadow-lg overflow-hidden">
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scroll-smooth"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="inline-flex min-w-full">
              {/* Week columns */}
              {weeks.map((week) => (
                <div
                  key={week.weekEnding}
                  className="flex-shrink-0 w-32 border-r border-[rgba(30,58,30,0.06)] last:border-r-0"
                >
                  {/* Week header */}
                  <div className="bg-gradient-to-b from-[#1e3a1e] to-[#2d5a2d] text-white text-center py-3 px-2">
                    <div className="text-xs font-semibold uppercase tracking-wide">
                      Week {week.weekNumber}
                    </div>
                    <div className="text-[10px] opacity-80 mt-1">
                      {new Date(week.weekEnding).toLocaleDateString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Amount cell */}
                  <div className="p-3 min-h-[120px] flex flex-col justify-between">
                    {week.isActual ? (
                      // Read-only actual
                      <div className="text-center font-bold text-black text-lg">
                        ${Math.abs(week.amount).toLocaleString()}
                      </div>
                    ) : (
                      // Editable forecast
                      editingWeek === week.weekEnding ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            const amount = parseFloat(
                              editValue.replace(/[^0-9.-]/g, "")
                            );
                            if (!isNaN(amount) && amount >= 0) {
                              saveAmount(week.weekEnding, amount);
                            }
                            setEditingWeek(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingWeek(null);
                            }
                          }}
                          autoFocus
                          className="w-full text-center border-2 border-[#2d5a2d] rounded px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2d5a2d]"
                          placeholder="0"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            setEditingWeek(week.weekEnding);
                            setEditValue(
                              week.amount > 0 ? week.amount.toString() : ""
                            );
                          }}
                          className="text-center italic text-[#3b82f6] cursor-pointer hover:bg-[#f0f9ff] rounded px-2 py-1 transition-colors text-lg"
                        >
                          {week.amount > 0
                            ? `$${week.amount.toLocaleString()}`
                            : "$0"}
                        </div>
                      )
                    )}

                    {/* Indicator */}
                    <div className="text-center text-[9px] mt-2 uppercase tracking-wide">
                      {week.isActual ? (
                        <span className="text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded">
                          Actual
                        </span>
                      ) : (
                        <span className="text-[#3b82f6] bg-blue-50 px-2 py-1 rounded">
                          Forecast
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-[rgba(30,58,30,0.08)] shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Total Actual
            </div>
            <div className="text-2xl font-bold text-[#1e3a1e]">
              $
              {Math.abs(
                weeks
                  .filter((w) => w.isActual)
                  .reduce((sum, w) => sum + w.amount, 0)
              ).toLocaleString()}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-[rgba(30,58,30,0.08)] shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Total Forecast
            </div>
            <div className="text-2xl font-bold text-[#3b82f6]">
              $
              {weeks
                .filter((w) => !w.isActual)
                .reduce((sum, w) => sum + w.amount, 0)
                .toLocaleString()}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-[rgba(30,58,30,0.08)] shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Weeks Forecasted
            </div>
            <div className="text-2xl font-bold text-[#1e3a1e]">
              {weeks.filter((w) => !w.isActual && w.amount > 0).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
