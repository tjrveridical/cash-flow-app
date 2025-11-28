/**
 * Payment Date Generator
 *
 * Generates payment dates based on payment rule configurations.
 * Handles different frequencies (monthly, weekly, quarterly, etc.)
 * and applies business day adjustments.
 */

export type Frequency = 'weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
export type ExceptionRule = 'move_earlier' | 'move_later';

export interface PaymentRule {
  frequency: Frequency;
  anchor_days: number[];  // JSONB array from DB
  exception_rule: ExceptionRule;
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
      case 'monthly':
        return this.generateMonthlyDates(rule, startDate, endDate);
      case 'semi-monthly':
        return this.generateSemiMonthlyDates(rule, startDate, endDate);
      case 'weekly':
        return this.generateWeeklyDates(rule, startDate, endDate);
      case 'quarterly':
        return this.generateQuarterlyDates(rule, startDate, endDate);
      case 'semi-annual':
        return this.generateSemiAnnualDates(rule, startDate, endDate);
      case 'annual':
        return this.generateAnnualDates(rule, startDate, endDate);
      default:
        console.warn(`Unknown frequency: ${rule.frequency}`);
        return [];
    }
  }

  /**
   * Generate monthly payment dates
   * anchor_days = [day_of_month] (e.g., [15] for 15th of each month)
   */
  private generateMonthlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const dayOfMonth = rule.anchor_days[0];

    let current = new Date(start);
    current.setDate(1); // Start at beginning of month

    while (current <= end) {
      // Get last day of month to handle "31" = last day
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(dayOfMonth, lastDay);

      const paymentDate = new Date(current.getFullYear(), current.getMonth(), targetDay);

      if (paymentDate >= start && paymentDate <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.exception_rule));
      }

      current.setMonth(current.getMonth() + 1);
    }

    return dates;
  }

  /**
   * Generate semi-monthly payment dates
   * anchor_days = [day1, day2] (e.g., [1, 15] for 1st and 15th)
   */
  private generateSemiMonthlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const [day1, day2] = rule.anchor_days;

    let current = new Date(start);
    current.setDate(1); // Start at beginning of month

    while (current <= end) {
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();

      // First payment
      const targetDay1 = Math.min(day1, lastDay);
      const paymentDate1 = new Date(current.getFullYear(), current.getMonth(), targetDay1);
      if (paymentDate1 >= start && paymentDate1 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate1, rule.exception_rule));
      }

      // Second payment
      const targetDay2 = Math.min(day2, lastDay);
      const paymentDate2 = new Date(current.getFullYear(), current.getMonth(), targetDay2);
      if (paymentDate2 >= start && paymentDate2 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate2, rule.exception_rule));
      }

      current.setMonth(current.getMonth() + 1);
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate weekly payment dates
   * anchor_days = [day_of_week] where 0=Sunday, 6=Saturday
   */
  private generateWeeklyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const targetDay = rule.anchor_days[0]; // 0=Sunday, 1=Monday, etc.

    let current = new Date(start);

    // Find first occurrence of target day
    while (current.getDay() !== targetDay && current <= end) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end) {
      dates.push(this.applyBusinessDayAdjustment(new Date(current), rule.exception_rule));
      current.setDate(current.getDate() + 7);
    }

    return dates;
  }

  /**
   * Generate quarterly payment dates
   * anchor_days = [day, starting_month] (e.g., [15, 2] = Feb 15, May 15, Aug 15, Nov 15)
   */
  private generateQuarterlyDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const [day, startingMonth] = rule.anchor_days;

    // Calculate all quarters: startingMonth, startingMonth+3, startingMonth+6, startingMonth+9
    const months = [
      startingMonth,
      startingMonth + 3,
      startingMonth + 6,
      startingMonth + 9
    ].map(m => ((m - 1) % 12) + 1); // Wrap to 1-12

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      for (const month of months) {
        const lastDay = new Date(year, month, 0).getDate();
        const targetDay = Math.min(day, lastDay);
        const paymentDate = new Date(year, month - 1, targetDay); // month-1 because JS months are 0-indexed

        if (paymentDate >= start && paymentDate <= end) {
          dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.exception_rule));
        }
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate semi-annual payment dates
   * anchor_days = [month1, day1, month2, day2] (e.g., [1, 1, 7, 1] = Jan 1 and Jul 1)
   */
  private generateSemiAnnualDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const [month1, day1, month2, day2] = rule.anchor_days;

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      // First payment
      const lastDay1 = new Date(year, month1, 0).getDate();
      const targetDay1 = Math.min(day1, lastDay1);
      const paymentDate1 = new Date(year, month1 - 1, targetDay1);
      if (paymentDate1 >= start && paymentDate1 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate1, rule.exception_rule));
      }

      // Second payment
      const lastDay2 = new Date(year, month2, 0).getDate();
      const targetDay2 = Math.min(day2, lastDay2);
      const paymentDate2 = new Date(year, month2 - 1, targetDay2);
      if (paymentDate2 >= start && paymentDate2 <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate2, rule.exception_rule));
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Generate annual payment dates
   * anchor_days = [month, day] (e.g., [12, 31] = Dec 31)
   */
  private generateAnnualDates(rule: PaymentRule, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const [month, day] = rule.anchor_days;

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const lastDay = new Date(year, month, 0).getDate();
      const targetDay = Math.min(day, lastDay);
      const paymentDate = new Date(year, month - 1, targetDay);

      if (paymentDate >= start && paymentDate <= end) {
        dates.push(this.applyBusinessDayAdjustment(paymentDate, rule.exception_rule));
      }
    }

    return dates;
  }

  /**
   * Apply business day adjustment (move to next/previous business day if weekend)
   * @param date Original payment date
   * @param adjustment 'move_later' = next business day, 'move_earlier' = previous business day
   */
  private applyBusinessDayAdjustment(date: Date, adjustment: ExceptionRule): Date {
    const day = date.getDay();
    const adjusted = new Date(date);

    if (day === 0) { // Sunday
      if (adjustment === 'move_later') {
        adjusted.setDate(date.getDate() + 1); // Move to Monday
      } else {
        adjusted.setDate(date.getDate() - 2); // Move to Friday
      }
    } else if (day === 6) { // Saturday
      if (adjustment === 'move_later') {
        adjusted.setDate(date.getDate() + 2); // Move to Monday
      } else {
        adjusted.setDate(date.getDate() - 1); // Move to Friday
      }
    }

    return adjusted;
  }
}
