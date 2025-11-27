# Cash Flow App – Critical Path

**Modular documentation for phased development roadmap.**

---

## 4-Step Roadmap

### ✅ Foundation (Complete)

Core infrastructure and workflows built and operational:

- **[Module 1: Database Schema](critical-path/01-database-schema.md)** - All tables, indexes, migrations
- **[Module 2: Data Ingestion](critical-path/02-data-ingestion.md)** - CSV parser, validator, import service
- **[Module 3: Classification Engine](critical-path/03-classification-engine.md)** - Rules, historical inference, ML stubs
- **[Module 4: Verification Inbox](critical-path/04-verification-inbox.md)** - CFO review workflow with searchable edit modal
- **[Module 5: Forecast Engine](critical-path/05-forecast-engine.md)** - Weekly aggregation with AR split logic
- **[Module 6: Forecast Dashboard](critical-path/06-forecast-dashboard.md)** - AG-Grid with 26-week scroll, drill-downs

### 🟡 Step 1: Solo MVP (Current Focus)

Building payment rules and AR forecasting for complete 26-week projection:

- **[Module 7: Payment Rules](critical-path/07-payment-rules.md)** 🟡 **IN PROGRESS** - Paydate rules (pure date templates)
- **[Module 8: AR Estimation](critical-path/08-ar-estimation.md)** ⬜ **PENDING** - Manual 4-week AR forecast with confidence weights

**Target:** Fully functional 26-week forecast for Travis (solo user) with future projections.

### ⬜ Step 2: Multi-User Foundation

Enabling 3-5 power users with authentication and audit trails:

- **[Module 9: Multi-User Foundation](critical-path/09-multi-user.md)** ⬜ **PENDING** - Supabase auth, RBAC, import safety, production deployment

**Target:** 3-5 power users testing in production (Travis, Controller, Sr Accountant).

### ⬜ Step 3: Leadership Access

View-only access for 5 executives:

- **[Module 10: Leadership Access](critical-path/10-leadership-access.md)** ⬜ **PENDING** - RBAC UI/API enforcement, leadership invites, scale features

**Target:** 8-10 total users (5 view-only leadership + 3-5 power users).

### ⬜ Step 4: Future Enhancements

Post-V1 features based on user feedback:

- **[Module 11: Future Enhancements](critical-path/11-future-enhancements.md)** ⬜ **FUTURE** - Scenario modeling, export capabilities, mobile responsive, integrations

**Target:** Prioritized based on feedback; scenario modeling is a separate epic.

---

## Current Status

**Active Module:** [07-payment-rules.md](critical-path/07-payment-rules.md)
**Last Updated:** November 27, 2024
**Completion:** 60% (6/10 core modules done)

### Recent Work

- ✅ Fixed Next.js 15+ params await issue in paydate-rules API routes
- ✅ Implemented edit modal pre-population with reverse-engineering logic
- ✅ Fixed conditional form fields visibility
- ✅ Created paydate-rules migration with 25 bootstrap rules
- ✅ Built complete CRUD API for payment rules management

### Next Steps

1. Finish payment date generation engine for forecast integration
2. Implement AR Estimation module (Section 8)
3. Polish Solo MVP (import redesign, toasts, loading spinners)
4. Begin multi-user foundation (Supabase auth setup)

---

## Module Index

| # | Module | Status | Description |
|---|--------|--------|-------------|
| 1 | [Database Schema](critical-path/01-database-schema.md) | ✅ | All tables, indexes, migrations, constraints |
| 2 | [Data Ingestion](critical-path/02-data-ingestion.md) | ✅ | CSV parser, validator, mapper, import service |
| 3 | [Classification Engine](critical-path/03-classification-engine.md) | ✅ | Rules, historical inference, ML stubs, decision tree |
| 4 | [Verification Inbox](critical-path/04-verification-inbox.md) | ✅ | CFO review workflow, searchable category edit |
| 5 | [Forecast Engine](critical-path/05-forecast-engine.md) | ✅ | Weekly aggregation, AR split logic, cash balances |
| 6 | [Forecast Dashboard](critical-path/06-forecast-dashboard.md) | ✅ | AG-Grid with 26-week scroll, drill-downs, totals |
| 7 | [Payment Rules](critical-path/07-payment-rules.md) | 🟡 | Paydate rules (pure date templates) **IN PROGRESS** |
| 8 | [AR Estimation](critical-path/08-ar-estimation.md) | ⬜ | Manual 4-week AR forecast, confidence weights |
| 9 | [Multi-User Foundation](critical-path/09-multi-user.md) | ⬜ | Auth, RBAC, import safety, production deploy |
| 10 | [Leadership Access](critical-path/10-leadership-access.md) | ⬜ | View-only RBAC, leadership invites, scale |
| 11 | [Future Enhancements](critical-path/11-future-enhancements.md) | ⬜ | Scenario modeling, exports, mobile, integrations |

---

## Quick Reference

### Current Sprint
**Focus:** Payment Rules + AR Estimation (Solo MVP)

**Blockers:** None

**Next Milestone:** Step 1 complete (26-week forecast with future projections working)

### Architecture Notes

- **Frontend:** Next.js 14 with React Server Components, Tailwind CSS
- **Database:** PostgreSQL (Supabase)
- **Grid:** AG-Grid Community Edition
- **Auth:** Supabase Auth (Step 2+)
- **Deployment:** Vercel (Step 2+)

### Design System

- **Color Palette:** Forest green (`#1e3a1e`, `#2d5a2d`, `#3d6b3d`)
- **Effects:** Glassmorphic (`backdrop-blur`, semi-transparent white)
- **Typography:** Geist-like font family, font-weight 550-650
- **Spacing:** Consistent `px-6`, `py-3`, `gap-3`

### Key Workflows

1. **Data Ingestion** → CSV upload → Validation → Import → Classification
2. **Verification** → Review → Edit/Verify → Verified transactions
3. **Forecasting** → Weekly aggregation → 26-week grid → Drill-down details
4. **Payment Rules** → Create rule → Generate dates → Forecast integration
5. **AR Estimation** → Enter forecasts → Confidence weights → Forecast integration

---

## Documentation Structure

Each module follows a consistent template:

- **Purpose & Scope** - What this component does, why it exists
- **Human Workflow 👤** - User journey with edge cases (UI modules only)
- **Database Schema** - Tables, columns, indexes, migrations
- **API Endpoints** - Routes, request/response examples
- **UI Components** - Files, component hierarchy
- **Implementation Details** - Technical specifics, algorithms, business logic
- **Completion Criteria** - Checkboxes for done/pending items
- **Related Modules** - Links to dependencies and affected modules

---

## Getting Started

### For Developers

1. Read [Module 1: Database Schema](critical-path/01-database-schema.md) for data model
2. Review active module [Module 7: Payment Rules](critical-path/07-payment-rules.md)
3. Check completion criteria for pending tasks
4. Follow related module links for dependencies

### For Product/Business

1. Review [4-Step Roadmap](#4-step-roadmap) for phased delivery
2. Check [Current Status](#current-status) for progress
3. Read Human Workflow sections in UI modules for user experience
4. Reference [Module 11: Future Enhancements](critical-path/11-future-enhancements.md) for post-V1 ideas

---

**Last Updated:** November 27, 2024
**Version:** 2.0 (Modular Structure)
**Maintainer:** Travis Reed
