# Roles & Permissions

The system has **three roles**, each with specific authority aligned to real-world financial governance.

---

# 1. CFO (Full Authority)

## Can:
- View **all dashboards**
- Verify & unverify transactions  
- Edit **all** classifications (top-level + subcategory + subtype)  
- Create & modify **payment rules** (category, vendor)
- Define **obligatory vs discretionary**
- Enter & modify **manual AR forecasts**
- Approve category changes  
- Export full ledger  
- Access all raw data drawers  
- Regenerate forecast calendar  
- Manage user roles  

## Cannot:
- (Nothing restricted; this is the apex role.)

---

# 2. Accounting (Operational Accuracy)

## Can:
- View dashboards  
- Process verification inbox  
- Modify classification (subcategory/subtype only; cannot move major buckets unless allowed by CFO)
- Add **vendor overrides if CFO has enabled this**  
- Import raw data (CSV/QBO/bank feeds)
- View audit logs  
- View obligations  
- Make suggested rule changes (but not finalize)

## Cannot:
- Change top-level category (e.g., Opex → COGS) unless CFO grants exception  
- Modify payment rules  
- Unverify CFO-verified rows  
- Change AR forecast  
- Set discretionary/obligatory flags  
- Export full ledger (only filtered subsets)

---

# 3. Read-Only (CEO / COO / Board / Auditors)

## Can:
- View all dashboards  
- View calendar  
- View obligations  
- View master ledger (verified only)  
- View audit logs  
- Drill into raw drawers  
- Sort/filter/search everywhere  

## Cannot:
- Verify or unverify  
- Change classifications  
- Modify rules  
- Modify AR forecast  
- Modify obligations  
- Import data  
- Export full ledger  
- Make any state-changing action

---

# Role Enforcement
Role enforcement occurs at:
- **API level** (Supabase row-level + endpoint checks)  
- **UI level** (show/hide actions)  
- **Ledger integrity rules** (CFO lock prevents reversal by Accounting)

---

# Permission Philosophy
- **CFO → strategic control**
- **Accounting → operational clarity**
- **Read-only → transparency without risk**

Every permission decision supports:
- Governance  
- Accuracy  
- Auditability  
- Leadership readiness  