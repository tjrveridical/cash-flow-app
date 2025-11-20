# Payment Rules Specification

Payment rules determine when cash outflows occur on the forecast calendar.

---

# Core Principles

1. **Vendor Rule > Category Default Rule**  
2. **Exactly one rule per vendor**  
3. **All categories have a default rule**  
4. **Rules apply prospectively only**  
5. **Forecast regenerates after any rule change**  
6. **Business-day adjustments are standardized**

---

# Frequencies

- weekly  
- semimonthly  
- monthly  
- quarterly  
- annual  
- custom (reserved for future)

---

# Anchor Day Types

**Weekly:**  
- day_of_week (Mon/Tue/etc.)

**Semi-monthly:**  
- 1st and 15th (two fixed anchor points)

**Monthly:**  
- day_of_month (1–31)
- last_business_day

**Quarterly:**  
- quarterly_month_day (e.g., Jan 15, Apr 15)

**Annual:**  
- specific_month_day (e.g., Feb 27)

---

# Business Day Adjustments

- **next** (default)  
- **previous**  
- **none**  

Applied only when the anchor date falls on:
- weekend  
- holiday (via cash_calendar_overrides)

---

# Inheritance Behavior

### 1. New vendor appears
- System assigns **default category rule** automatically.
- User may override in drawer.

### 2. Vendor override exists
- Override rule is used for all future forecasts.
- Category default rule is ignored for that vendor.

### 3. Category rule changed
- All vendors using that category default inherit the change.

---

# How Rules Are Used by the Forecast Engine

For each rule:
1. Determine next due date using frequency + anchor_day  
2. Adjust date using business_day_adjustment + holiday table  
3. Estimate amount using:
   - median of past payments, or  
   - static category mapping, or  
   - direct pull from ledger (Payroll, Rent, etc.)

4. Place obligation on forecast calendar  
5. Replace with actual when a ledger entry appears

---

# UI Interaction Summary
- Rules managed via right-side drawer
- Vendor rules pre-filled from category rules
- Rule creation auto-triggers forecast regeneration
- All rule changes recorded in audit_log