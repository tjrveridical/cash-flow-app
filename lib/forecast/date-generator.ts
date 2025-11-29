/**
 * Payment Date Generator
 *
 * Generates payment dates based on payment rule configurations.
 * Handles different frequencies (monthly, weekly, quarterly, etc.)
 * and applies business day adjustments.
 */

export type Frequency = 'Weekly' | 'SemiMonthly' | 'Monthly' | 'Quarterly' | 'SemiAnnual' | 'Annually';
export type BusinessDayAdjustment = 'next' | 'previous';

export interface PaymentRule {
  frequency: Frequency;
  anchor_day: string;  // "15", "Mon", "EOM", etc
  anchor_day2?: number | null;  // For SemiMonthly (2nd day)
  months?: string | null;  // Comma-separated like "3,6,9,12"
  business_day_adjustment: BusinessDayAdjustment;
}

export class DateGenerator {
  /**
   * Generate payment dates for a rule within date range
   * @param rule Payment rule configuration
   * @param startDate Start of forecast period
   * @param endDate End of forecast period
   * @returns Array of payment dates (Date objects)
   */
  generateDates(rule: PaymentRule, startDate: Date, endDate: Date): Date[] {
    switch (rule.frequency) {
      case 'Monthly':
        return this.generateMonthlyDates(rule, startDate, endDate);
      case 'SemiMonthly':
        return this.generateSemiMonthlyDates(rule, startDate, endDate);
      case 'Weekly':
        return this.generateWeeklyDates(rule, startDate, endDate);
      case 'Quarterly':
        return this.generateQuarterlyDates(rule, startDate, endDate);
      case 'SemiAnnual':
        return this.generateSemiAnnualDates(rule, startDate, endDate);
      case 'Annually':
        return this.generateAnnualDates(rule, startDate, endDate);
      default:
        console.warn(`Unknown frequency: ${rule.frequency}`);
        return [];
    }
  }

  /**
   * Generate monthly payment dates
   * anchor_day = "15" or "EOM" (end of month)
   */
  private generateMonthlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const isEndOfMonth = rule.anchor_day === 'EOM';
    const dayOfMonth = isEndOfMonth ? 31 : parseInt(rule.anchor_day);

    let current = new Date(start);
    current.setDate(1); // Start at beginning of month

    while (current <= end) {
      // Get last day of month
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const targetDay = isEndOfMonth ? lastDay : Math.min(dayOfMonth, lastDay);

      const paymentDate = new Date(current.getFullYear(), current.getMonth(), targetDay);

      if (paymentDate >= start && paymentDate <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.business_day_adjustment));
      }

      current.setMonth(current.getMonth() + 1);
    }

    return dates;
  }

  /**
   * Generate semi-monthly payment dates
   * anchor_day = first day (e.g., "1")
   * anchor_day2 = second day (e.g., 15)
   */
  private generateSemiMonthlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const day1 = parseInt(rule.anchor_day);
    const day2 = rule.anchor_day2 || 15;

    let current = new Date(start);
    current.setDate(1); // Start at beginning of month

    while (current <= end) {
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();

      // First payment
      const targetDay1 = Math.min(day1, lastDay);
      const paymentDate1 = new Date(current.getFullYear(), current.getMonth(), targetDay1);
      if (paymentDate1 >= start && paymentDate1 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate1, rule.business_day_adjustment));
      }

      // Second payment
      const targetDay2 = Math.min(day2, lastDay);
      const paymentDate2 = new Date(current.getFullYear(), current.getMonth(), targetDay2);
      if (paymentDate2 >= start && paymentDate2 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate2, rule.business_day_adjustment));
      }

      current.setMonth(current.getMonth() + 1);
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate weekly payment dates
   * anchor_day = "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
   */
  private generateWeeklyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const targetDay = dayMap[rule.anchor_day] ?? 1; // Default to Monday

    let current = new Date(start);

    // Find first occurrence of target day
    while (current.getDay() !== targetDay && current <= end) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end) {
      dates.push(this.applyBusinessDayAdjustment(new Date(current), rule.business_day_adjustment));
      current.setDate(current.getDate() + 7);
    }

    return dates;
  }

  /**
   * Generate quarterly payment dates
   * anchor_day = day of month (e.g., "15")
   * months = comma-separated months (e.g., "3,6,9,12")
   */
  private generateQuarterlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const day = parseInt(rule.anchor_day);

    // Parse months from comma-separated string
    const monthsStr = rule.months || '3,6,9,12'; // Default to standard quarters
    const months = monthsStr.split(',').map(m => parseInt(m.trim()));

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      for (const month of months) {
        const lastDay = new Date(year, month, 0).getDate();
        const targetDay = Math.min(day, lastDay);
        const paymentDate = new Date(year, month - 1, targetDay); // month-1 because JS months are 0-indexed

        if (paymentDate >= start && paymentDate <= end) {
          dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.business_day_adjustment));
        }
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate semi-annual payment dates
   * anchor_day = day of first payment (e.g., "1")
   * anchor_day2 = day of second payment (e.g., 1)
   * months = two months (e.g., "1,7" for Jan and Jul)
   */
  private generateSemiAnnualDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const day1 = parseInt(rule.anchor_day);
    const day2 = rule.anchor_day2 || day1;

    // Parse months from comma-separated string
    const monthsStr = rule.months || '1,7'; // Default to Jan and Jul
    const [month1, month2] = monthsStr.split(',').map(m => parseInt(m.trim()));

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      // First payment
      const lastDay1 = new Date(year, month1, 0).getDate();
      const targetDay1 = Math.min(day1, lastDay1);
      const paymentDate1 = new Date(year, month1 - 1, targetDay1);
      if (paymentDate1 >= start && paymentDate1 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate1, rule.business_day_adjustment));
      }

      // Second payment
      const lastDay2 = new Date(year, month2, 0).getDate();
      const targetDay2 = Math.min(day2, lastDay2);
      const paymentDate2 = new Date(year, month2 - 1, targetDay2);
      if (paymentDate2 >= start && paymentDate2 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate2, rule.business_day_adjustment));
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate annual payment dates
   * anchor_day = day of month (e.g., "31")
   * months = single month (e.g., "12" for December)
   */
  private generateAnnualDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const day = parseInt(rule.anchor_day);
    const month = rule.months ? parseInt(rule.months) : 12; // Default to December

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const lastDay = new Date(year, month, 0).getDate();
      const targetDay = Math.min(day, lastDay);
      const paymentDate = new Date(year, month - 1, targetDay);

      if (paymentDate >= start && paymentDate <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.business_day_adjustment));
      }
    }

    return dates;
  }

  /**
   * Apply business day adjustment (move to next/previous business day if weekend)
   * @param date Original payment date
   * @param adjustment 'next' = next business day, 'previous' = previous business day
   */
  private applyBusinessDayAdjustment(date: Date, adjustment: BusinessDayAdjustment): Date {
    const day = date.getDay();
    const adjusted = new Date(date);

    if (day === 0) { // Sunday
      if (adjustment === 'next') {
        adjusted.setDate(date.getDate() + 1); // Move to Monday
      } else {
        adjusted.setDate(date.getDate() - 2); // Move to Friday
      }
    } else if (day === 6) { // Saturday
      if (adjustment === 'next') {
        adjusted.setDate(date.getDate() + 2); // Move to Monday
      } else {
        adjusted.setDate(date.getDate() - 1); // Move to Friday
      }
    }

    return adjusted;
  }
}
