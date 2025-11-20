# Cash Flow Application — Overview

## Purpose
A precision CFO tool for:
- Real-time cash clarity  
- 14–30 day visibility  
- Ground-truth reconciliation  
- Obligatory vs discretionary obligations  
- Vendor-level understanding  
- Zero-surprise forecasting  
- Perfect auditability  
- Rapid leadership preparation (Monday–Wednesday)

## Core Problems Solved
1. “How much cash do we have right now?”
2. “What do we owe this week and next week?”
3. “What’s obligatory vs discretionary?”
4. “What’s coming in from AR?”
5. “Can we afford X on date Y?”
6. “Explain this number.”
7. “Show me the components behind the summary.”
8. “Create a treasury plan.”

## System Principles (Canonical)
- **Human-in-the-loop verification**  
- **No confidence scores** (every transaction is explicitly confirmed)
- **One-click explainability** (every number traceable to raw data)
- **Daily internal engine, weekly display**
- **Category hierarchy: max depth 3 (COGS only)**
- **Vendor override > Category default**
- **Immutable raw imports**
- **Audit log for every meaningful action**
- **World-class UX**: dense, modern, no wrapping, chip-based classifications
- **Extensible**: hazard model integration in v2

## Key Features
1. **Verification Inbox** (unverified → verified ledger)
2. **Master Ledger** (CFO-grade truth)
3. **14-Day Forecast** (daily + weekly)
4. **Calendar View** (forecast + actual + variance overlays)
5. **Vendor Obligations** (obligatory vs discretionary)
6. **Manual AR Forecast** (4-week rolling)
7. **Payment Rule Engine** (weekly, monthly, semi-monthly, quarterly, annual)
8. **Audit Trails & Change Logs**
9. **Raw Data Ingestion Pipeline**
10. **Role-Based Access Control**

## High-Level Architecture
- **raw_transactions** → immutable ground truth  
- **normalized_transactions** → system interpretation  
- **verification** → human validation  
- **ledger_transactions** → final authoritative truth  
- **payment_rules** → deterministic future cash timing  
- **forecast calendar** (materialized or compute-on-demand)

## Not in v1
- Automated hazard model ingestion  
- AI-based classification  
- Notifications/alerts  
- Multi-entity consolidation  
- Machine learning predictions

This spec focuses on precision, clarity, and control.