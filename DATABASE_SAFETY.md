# 🛡️ Database Safety Guidelines

## Golden Rules

1. **NEVER run `wrangler d1 create` with existing database name**
2. **ALWAYS backup before migrations**
3. **NEVER write DROP TABLE in migrations**
4. **ALWAYS verify row counts after migrations**

---

## Before Any Migration

### Use the Safe Migration Script
```bash
chmod +x scripts/safe-migrate.sh
./scripts/safe-migrate.sh
```

This script:
- ✅ Creates timestamped backup
- ✅ Records pre-migration row counts
- ✅ Asks for confirmation
- ✅ Verifies data integrity after migration

### Manual Backup (if needed)
```bash
# Export specific table
npx wrangler d1 execute hanzimaster-db --remote \
  --command "SELECT * FROM waitlist;" \
  --json > backup-waitlist.json

# Count rows before migration
npx wrangler d1 execute hanzimaster-db --remote \
  --command "SELECT 'waitlist' as tbl, COUNT(*) as cnt FROM waitlist 
             UNION ALL SELECT 'users', COUNT(*) FROM users;"
```

---

## Automated Protections

### 1. Daily R2 Backups (3 AM UTC)
Critical tables backed up daily to R2:
- `waitlist`
- `users`
- `system_events`

Location: `r2://hanzimaster-content/backups/YYYY-MM-DD/`

### 2. D1 Time Travel
Cloudflare automatically keeps point-in-time backups.

**Check available restore points:**
```bash
npx wrangler d1 time-travel info hanzimaster-db --timestamp "2025-11-23T12:00:00Z"
```

**Restore to a point in time:**
```bash
npx wrangler d1 time-travel restore hanzimaster-db --bookmark=<BOOKMARK_ID>
```

---

## Migration Writing Rules

### ✅ SAFE Patterns
```sql
-- Add columns (safe)
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Create new tables (safe)
CREATE TABLE IF NOT EXISTS new_table (...);

-- Add indexes (safe)
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

### ❌ DANGEROUS Patterns (NEVER USE)
```sql
-- NEVER drop tables
DROP TABLE users;

-- NEVER delete all rows
DELETE FROM waitlist;
TRUNCATE TABLE users;

-- NEVER recreate tables
DROP TABLE IF EXISTS users;
CREATE TABLE users (...);
```

### ⚠️ Careful Patterns
```sql
-- Renaming columns - may cause issues
ALTER TABLE users RENAME COLUMN old TO new;

-- Changing column types - may lose data
-- Instead: Add new column, migrate data, drop old
```

---

## Emergency Recovery

### If Data Was Lost

1. **Check D1 Time Travel:**
   ```bash
   npx wrangler d1 time-travel info hanzimaster-db --timestamp "YYYY-MM-DDTHH:MM:SSZ"
   ```

2. **Check R2 Backups:**
   ```bash
   npx wrangler r2 object list hanzimaster-content --prefix "backups/"
   ```

3. **Restore from R2:**
   ```bash
   npx wrangler r2 object get hanzimaster-content backups/2025-11-23/waitlist.json
   # Then manually re-insert the data
   ```

4. **Restore from D1 Time Travel:**
   ```bash
   npx wrangler d1 time-travel restore hanzimaster-db --bookmark=<ID>
   ```
   ⚠️ This restores ENTIRE database to that point

---

## Monitoring

### Check Data Counts (run weekly)
```bash
npx wrangler d1 execute hanzimaster-db --remote --command "
SELECT 'waitlist' as table_name, COUNT(*) as rows FROM waitlist
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL SELECT 'vocabulary', COUNT(*) FROM vocabulary
UNION ALL SELECT 'stories', COUNT(*) FROM stories;
"
```

### Alert Thresholds
Set up alerts if:
- waitlist count drops
- users count drops
- Any critical table becomes empty

---

## Access Control

### Who Can Run Migrations
- Only team leads
- Always in pairs (code review)
- Never during peak hours

### Wrangler Commands That Modify Data
| Command | Risk Level | Requires Approval |
|---------|-----------|-------------------|
| `d1 execute --command "SELECT..."` | 🟢 Safe | No |
| `d1 execute --command "INSERT..."` | 🟡 Medium | Yes |
| `d1 execute --command "DELETE..."` | 🔴 High | Team Lead |
| `d1 migrations apply` | 🔴 High | Team Lead |
| `d1 create` | 🔴 CRITICAL | Never on existing name |

---

## Checklist Before Production Changes

- [ ] Backup created?
- [ ] Row counts recorded?
- [ ] Migration reviewed by second person?
- [ ] No DROP/DELETE/TRUNCATE in migration?
- [ ] Tested on local D1 first?
- [ ] Know how to rollback?
- [ ] Off-peak hours?

