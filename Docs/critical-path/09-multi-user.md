# 9. Multi-User Foundation (Step 2: Testing Phase)

## Purpose & Scope

Enable secure multi-user access for 3-5 power users (Travis, Controller, Sr Accountant) with proper authentication, audit trails, and import safety. This phase transitions from solo development to production multi-user testing.

## Human Workflow 👤

### User Login

1. **Navigate to App** (forecast.company.com or localhost:3000)
   - Redirect to `/login` if unauthenticated

2. **Enter Credentials**
   - Email address
   - Password
   - Forest green login form matching design system

3. **Login Success**
   - Redirect to `/forecast` (default landing page)
   - User email displayed in header
   - Logout button available

### Password Reset

1. **Click "Forgot Password" Link** on login page
   - Enter email address
   - Supabase sends password reset email

2. **Check Email**
   - Click reset link
   - Redirect to reset password page

3. **Enter New Password**
   - Confirm password
   - Save new credentials
   - Redirect to login

### Logout

1. **Click Logout Button** in header
   - Session terminated
   - Redirect to `/login`
   - All protected routes now require re-authentication

### Edge Cases

- **Session Expiration:** Redirect to login with message
- **Invalid Credentials:** Show error message
- **Concurrent Sessions:** Last login wins
- **Password Requirements:** Min 8 characters, 1 uppercase, 1 number

## Database Schema

### user_profiles Table Extension

```sql
ALTER TABLE user_profiles
ADD COLUMN role TEXT CHECK (role IN ('admin', 'power_user', 'view_only')) DEFAULT 'power_user';

-- Sync with Supabase auth.users
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'power_user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile();
```

### verified_by and created_by Column Updates

Update all audit columns to use UUID instead of TEXT:

```sql
-- classified_bank_transactions
ALTER TABLE classified_bank_transactions
ALTER COLUMN verified_by TYPE UUID USING verified_by::uuid;

ALTER TABLE classified_bank_transactions
ADD CONSTRAINT fk_verified_by
FOREIGN KEY (verified_by)
REFERENCES user_profiles(id);

-- ar_forecast_entries
ALTER TABLE ar_forecast_entries
ADD CONSTRAINT fk_created_by
FOREIGN KEY (created_by)
REFERENCES user_profiles(id);

-- import_history
ALTER TABLE import_history
ADD CONSTRAINT fk_imported_by
FOREIGN KEY (imported_by)
REFERENCES user_profiles(id);
```

### import_history Table Extensions

```sql
ALTER TABLE import_history ADD COLUMN file_hash TEXT;
ALTER TABLE import_history ADD COLUMN imported_by UUID REFERENCES user_profiles(id);
ALTER TABLE import_history ADD COLUMN rows_imported INT;
ALTER TABLE import_history ADD COLUMN rows_skipped INT;
ALTER TABLE import_history ADD COLUMN import_duration_ms INT;
CREATE INDEX idx_import_history_file_hash ON import_history(file_hash);
CREATE INDEX idx_import_history_user ON import_history(imported_by);
```

## API Endpoints

### Authentication Middleware

All API routes protected with Supabase auth check:

```typescript
// /lib/auth/middleware.ts
export async function requireAuth(req: Request) {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session || error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return session;
}
```

**Usage in API routes:**
```typescript
export async function POST(req: Request) {
  const session = await requireAuth(req);
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of endpoint logic
}
```

## UI Components

### /app/login/page.tsx

Login page with forest green design.

**Features:**
- Email and password inputs
- "Remember me" checkbox
- "Forgot password?" link
- Submit button with loading spinner
- Error message display
- Glassmorphic card design

### /app/signup/page.tsx

Sign-up page (initially disabled).

**V1:** Manual user creation only via Supabase dashboard
**V2:** Self-service signup with email verification

### Protected Route Wrapper

**File:** `/app/layout.tsx` or `/lib/auth/ProtectedRoute.tsx`

```typescript
export default function ProtectedRoute({ children }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
```

### Header with User Display

**Updates to existing header component:**
- Display user email: `session.user.email`
- Logout button with dropdown
- User avatar (optional, use initials)

```typescript
function Header() {
  const supabase = createClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header>
      <h1>Cash Flow Forecast</h1>
      <div className="user-menu">
        <span>{user?.email}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
```

## Implementation Details

### Supabase Authentication Setup

1. **Enable Auth in Supabase Project**
   - Navigate to Authentication settings
   - Enable email/password provider
   - Configure email templates (optional)
   - Set site URL (e.g., https://forecast.company.com)

2. **Configure RLS Policies**

```sql
-- Enable RLS on all tables
ALTER TABLE raw_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classified_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_forecast_entries ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read
CREATE POLICY "authenticated_read" ON raw_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only power_user and admin can insert
CREATE POLICY "power_user_insert" ON raw_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('power_user', 'admin')
    )
  );

-- Repeat for all tables with appropriate policies
```

3. **Update Environment Variables**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Hardcoded Power Users

**Manual User Creation via Supabase Dashboard:**

1. Navigate to Authentication → Users
2. Click "Add user"
3. Enter email and temporary password
4. User added to `auth.users` table
5. Trigger automatically creates `user_profiles` entry
6. Manually set role in `user_profiles` table:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'travis@company.com';

UPDATE user_profiles
SET role = 'power_user'
WHERE email IN ('controller@company.com', 'accountant@company.com');
```

**Initial Users:**
- **Travis Reed** (travis@company.com) - Admin role
- **Controller** (controller@company.com) - Power user role
- **Sr Accountant** (accountant@company.com) - Power user role

### Real verified_by from Auth Session

Update verification workflow to use actual user ID:

**Before (V1):**
```typescript
.update({
  is_verified: true,
  verified_at: NOW(),
  verified_by: 'CFO'  // Hardcoded
})
```

**After (V2):**
```typescript
const session = await supabase.auth.getSession();

.update({
  is_verified: true,
  verified_at: NOW(),
  verified_by: session.data.session.user.id  // Real user UUID
})
```

**Same for:**
- `created_by` in `ar_forecast_entries`
- `classified_by` in `classified_bank_transactions`
- `imported_by` in `import_history`

### CSV Import Safety

**File Hash Duplicate Detection:**

```typescript
import crypto from 'crypto';

async function importCSV(file: File) {
  // 1. Calculate SHA-256 hash of file
  const fileBuffer = await file.arrayBuffer();
  const hashArray = await crypto.subtle.digest('SHA-256', fileBuffer);
  const fileHash = Array.from(new Uint8Array(hashArray))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 2. Check if file_hash exists in import_history
  const { data: existing } = await supabase
    .from('import_history')
    .select('id, file_name, imported_by, created_at')
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `This file was already imported on ${existing.created_at} by ${existing.imported_by}`,
      duplicate: true
    };
  }

  // 3. Proceed with import in transaction
  const result = await importTransactions(file);

  // 4. Record in import_history with file_hash
  await supabase.from('import_history').insert({
    file_name: file.name,
    file_hash: fileHash,
    imported_by: session.user.id,
    rows_imported: result.imported,
    rows_skipped: result.duplicates,
    import_duration_ms: result.duration
  });

  return result;
}
```

**Warning UI:**
- Show alert if duplicate file detected
- Display original import details
- Option to "Import Anyway" (for testing)

### Import History Tracking

**Display in `/app/import/history` page:**
- Table of all imports with user, timestamp, file name, counts
- Filter by date range and user
- "View Details" → modal with error log and skipped rows

**Columns:**
- Import Date/Time
- User Email
- File Name
- Rows Imported
- Rows Skipped
- Duration
- Status (Success/Error)
- Actions (View Details)

### Production Deployment (Vercel)

1. **Connect GitHub Repo to Vercel**
   - Import project
   - Configure build settings (Next.js detected automatically)

2. **Add Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Configure Custom Domain** (optional)
   - Add DNS record: forecast.company.com
   - Enable HTTPS (automatic with Vercel)

4. **Deploy**
   - Push to main branch
   - Vercel auto-deploys
   - Monitor build logs

### Feedback Collection Process

**Real-World Usage Testing (2-4 weeks):**

1. **Weekly Check-Ins**
   - Travis meets with Controller + Sr Accountant
   - Review pain points and feature requests
   - Prioritize top 3 issues for next sprint

2. **Bug Tracking**
   - Use Notion or Linear for issue reporting
   - Template: Description, Steps to Reproduce, Expected vs Actual
   - Labels: Bug, Enhancement, Question

3. **Feature Requests**
   - Vote on most important features
   - Limit scope to v1.1 (avoid scope creep)

4. **Data Validation**
   - Compare forecast accuracy to actual results
   - Identify classification errors
   - Refine rules and categories

5. **Performance Monitoring**
   - Check page load times
   - Query performance (use `EXPLAIN ANALYZE`)
   - Optimize slow queries

## Completion Criteria

❌ Supabase authentication enabled
❌ Email/password provider configured
❌ RLS policies on all tables
❌ Auth middleware in API routes
❌ Login/logout pages with forest green design
❌ Protected route wrapper
❌ User profiles synced with auth.users
❌ Real verified_by/created_by from session
❌ File hash duplicate detection
❌ Import history tracking page
❌ Vercel deployment with custom domain
❌ 3-5 power users onboarded
❌ Feedback collection process established

## Related Modules

- [01-database-schema.md](01-database-schema.md) - user_profiles and audit columns
- [02-data-ingestion.md](02-data-ingestion.md) - Import safety and history
- [04-verification-inbox.md](04-verification-inbox.md) - Real verified_by tracking
- [08-ar-estimation.md](08-ar-estimation.md) - Real created_by tracking
- [10-leadership-access.md](10-leadership-access.md) - RBAC built on this foundation
