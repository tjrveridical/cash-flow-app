# 10. Leadership View Access (Step 3: Executive Rollout)

## Purpose & Scope

Grant view-only access to 5 leadership users (CEO, CFO, COO, etc.) with RBAC enforcement at UI and API levels. This phase extends the multi-user foundation to support read-only access for executives who need to monitor cash flow but not perform data entry.

## Human Workflow 👤

### Leadership User Experience

1. **Login with Credentials**
   - Navigate to forecast.company.com
   - Enter email and password
   - Redirect to `/forecast` (only accessible page)

2. **View Forecast Dashboard**
   - Full access to 26-week forecast grid
   - Can scroll, filter, and drill into cells
   - **Cannot:**
     - Import CSV
     - Verify/edit transactions
     - Add/edit payment rules
     - Add/edit AR forecasts
     - Set beginning cash

3. **Navigation Restrictions**
   - `/forecast` - ✅ Accessible
   - `/verification` - ❌ Redirect to `/forecast`
   - `/import` - ❌ Redirect to `/forecast`
   - `/paydate-rules` - ❌ Redirect to `/forecast`
   - `/ar-forecast` - ❌ Redirect to `/forecast`

4. **UI Visual Cues**
   - "View Only" badge in header
   - All edit/import buttons hidden
   - Read-only message on restricted pages

### Edge Cases

- **Attempt to Access Restricted Page:** Redirect with toast message
- **API Call to Restricted Endpoint:** 403 Forbidden error
- **Shared Link to Edit Modal:** Modal opens read-only or shows error
- **Role Change:** Requires logout/login to reflect new permissions

## Database Schema

### User Roles Column

See [09-multi-user.md](09-multi-user.md#user_profiles-table-extension) for role column addition.

**Role Definitions:**
- **admin:** Full access (Travis only)
- **power_user:** Edit/import/verify permissions (Controller, Sr Accountant)
- **view_only:** Read-only access to forecast dashboard (Leadership)

**Set Leadership Roles:**
```sql
UPDATE user_profiles
SET role = 'view_only'
WHERE email IN (
  'ceo@company.com',
  'cfo@company.com',
  'coo@company.com',
  'vp_finance@company.com',
  'board_member@company.com'
);
```

## API Endpoints

### RBAC API Enforcement

Server-side permission checks in API routes.

**Middleware Helper:**
```typescript
// /lib/auth/rbac.ts
export async function requireRole(
  session: Session,
  allowedRoles: string[]
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return false;
  }

  return true;
}
```

**Usage in API Routes:**
```typescript
// /app/api/verification/verify/route.ts
export async function POST(req: Request) {
  const session = await requireAuth(req);

  // Check if user has power_user or admin role
  const hasPermission = await requireRole(session, ['power_user', 'admin']);

  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  // ... rest of endpoint logic
}
```

**Apply RBAC to:**
- ✅ POST `/api/verification/verify` (power_user, admin)
- ✅ POST `/api/verification/edit` (power_user, admin)
- ✅ POST `/api/import` (power_user, admin)
- ✅ POST `/api/paydate-rules` (power_user, admin)
- ✅ PUT `/api/paydate-rules/[id]` (power_user, admin)
- ✅ DELETE `/api/paydate-rules/[id]` (power_user, admin)
- ✅ POST `/api/ar-forecast` (power_user, admin)
- ✅ PUT `/api/ar-forecast/[id]` (power_user, admin)
- ✅ DELETE `/api/ar-forecast/[id]` (power_user, admin)

**Read-Only Endpoints (All Roles):**
- ✅ GET `/api/forecast/weeks`
- ✅ GET `/api/verification/unverified` (view_only can read but not edit)
- ✅ GET `/api/paydate-rules`
- ✅ GET `/api/ar-forecast`

## UI Components

### RBAC UI Implementation

Conditional rendering based on user role.

**Fetch User Role:**
```typescript
// /lib/auth/useRole.ts
export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setRole(profile?.role || null);
      }
    });
  }, []);

  return role;
}
```

**Conditional Button Rendering:**
```typescript
function VerificationPage() {
  const role = useRole();

  return (
    <div>
      <h1>Verification Inbox</h1>

      {/* Hide buttons if view_only */}
      {role !== 'view_only' && (
        <>
          <button onClick={handleVerify}>Verify Selected</button>
          <button onClick={handleEdit}>Edit</button>
        </>
      )}

      {/* Show read-only message */}
      {role === 'view_only' && (
        <div className="text-amber-600 bg-amber-50 p-3 rounded">
          You have view-only access. Contact your administrator to request edit permissions.
        </div>
      )}

      {/* Table always visible */}
      <Table data={transactions} />
    </div>
  );
}
```

**Hide Navigation Links:**
```typescript
function Navigation() {
  const role = useRole();

  return (
    <nav>
      <Link href="/forecast">Forecast</Link>

      {role !== 'view_only' && (
        <>
          <Link href="/verification">Verification</Link>
          <Link href="/import">Import</Link>
          <Link href="/paydate-rules">Payment Rules</Link>
          <Link href="/ar-forecast">AR Forecast</Link>
        </>
      )}
    </nav>
  );
}
```

**View-Only Badge in Header:**
```typescript
function Header() {
  const role = useRole();

  return (
    <header>
      <h1>Cash Flow Forecast</h1>
      {role === 'view_only' && (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
          View Only
        </span>
      )}
    </header>
  );
}
```

### Protected Route Redirect

**Update ProtectedRoute wrapper:**
```typescript
export default function ProtectedRoute({
  children,
  requiredRole = null
}: {
  children: React.ReactNode;
  requiredRole?: string[] | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }

      if (requiredRole) {
        const allowed = await requireRole(session, requiredRole);
        if (!allowed) {
          router.push('/forecast');  // Redirect to forecast
          toast.error('You do not have permission to access this page');
          return;
        }
      }

      setHasAccess(true);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!hasAccess) return null;

  return <>{children}</>;
}
```

**Usage:**
```typescript
// /app/verification/page.tsx
export default function VerificationPage() {
  return (
    <ProtectedRoute requiredRole={['power_user', 'admin']}>
      <VerificationInbox />
    </ProtectedRoute>
  );
}

// /app/forecast/page.tsx (all roles allowed)
export default function ForecastPage() {
  return (
    <ProtectedRoute>
      <ForecastDashboard />
    </ProtectedRoute>
  );
}
```

## Implementation Details

### Leadership Invites

**Manual Provisioning for 5 Leadership Users:**

1. **Create Accounts in Supabase Dashboard**
   - Navigate to Authentication → Users
   - Click "Add user"
   - Enter leadership email and temporary password
   - User added to `auth.users`

2. **Set Role to view_only**
   ```sql
   UPDATE user_profiles
   SET role = 'view_only'
   WHERE email = 'ceo@company.com';
   ```

3. **Send Login Credentials**
   - Secure channel (e.g., 1Password, encrypted email)
   - Include temporary password
   - Instructions for first login and password reset

4. **Provide Onboarding**
   - 5-minute Loom video walkthrough
   - Key features: Forecast grid navigation, filtering, drill-downs
   - Limitations: View-only, cannot edit data

**Leadership Users:**
- CEO
- CFO
- COO
- VP Finance
- Board Member (optional)

### Scale Features (As Needed)

Monitor performance after adding 5 view-only users. If needed:

#### Pagination
```typescript
// /app/verification/page.tsx
const ITEMS_PER_PAGE = 100;

function VerificationInbox() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['unverified', page],
    queryFn: () => fetchUnverified(page, ITEMS_PER_PAGE)
  });

  return (
    <>
      <Table data={data} />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(data.total / ITEMS_PER_PAGE)}
        onPageChange={setPage}
      />
    </>
  );
}
```

#### Search/Filter
```typescript
// Add vendor search bar
function VerificationInbox() {
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(tx =>
    tx.transaction.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <input
        type="text"
        placeholder="Search vendors..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <Table data={filtered} />
    </>
  );
}
```

#### Audit Trail
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,  -- 'verify', 'edit', 'import', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

**Log Function:**
```typescript
async function logAudit(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  oldValues: any,
  newValues: any
) {
  await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues
  });
}
```

#### Database Indexes
```sql
-- Ensure all queries use indexes
CREATE INDEX IF NOT EXISTS idx_raw_transactions_date ON raw_transactions(date);
CREATE INDEX IF NOT EXISTS idx_classified_verified ON classified_bank_transactions(is_verified) WHERE is_verified = false;
CREATE INDEX IF NOT EXISTS idx_classified_category ON classified_bank_transactions(category_code);

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM classified_bank_transactions
WHERE is_verified = false
ORDER BY created_at DESC
LIMIT 100;
```

#### Caching (Redis)

**If needed:**
```typescript
// /lib/cache/redis.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

export async function getCachedForecast(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function setCachedForecast(key: string, data: any, ttl = 300) {
  await redis.set(key, JSON.stringify(data), { ex: ttl });
}
```

**Usage:**
```typescript
export async function GET(req: Request) {
  const cacheKey = `forecast:${startDate}:${endDate}`;

  // Check cache
  const cached = await getCachedForecast(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Generate forecast
  const forecast = await generateWeeklyForecast(startDate, endDate);

  // Cache for 5 minutes
  await setCachedForecast(cacheKey, forecast, 300);

  return NextResponse.json(forecast);
}
```

## Completion Criteria

❌ User roles column in user_profiles
❌ RBAC middleware helper
❌ Server-side permission checks in all mutating API routes
❌ UI conditional rendering based on role
❌ View-only badge in header
❌ Protected route redirect for unauthorized access
❌ 5 leadership users provisioned with view_only role
❌ Onboarding video created and shared
❌ Performance monitoring in place
❌ Pagination, search, audit trail (if needed)

## Related Modules

- [09-multi-user.md](09-multi-user.md) - Auth foundation
- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Primary view for leadership
- [01-database-schema.md](01-database-schema.md) - user_profiles role column
