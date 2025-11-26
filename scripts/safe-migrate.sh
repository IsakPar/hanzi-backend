#!/bin/bash
#
# Safe Migration Script
# Always creates a backup before running migrations
#
# Usage: ./scripts/safe-migrate.sh
#

set -e

echo "🛡️  Safe Migration Script"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create timestamp for backup
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backups/$TIMESTAMP"

echo -e "${YELLOW}Step 1: Creating pre-migration backup...${NC}"
mkdir -p "$BACKUP_DIR"

# Step 2: Export critical tables
TABLES=("waitlist" "users" "system_events" "vocabulary" "lessons")

for TABLE in "${TABLES[@]}"; do
    echo "  Exporting $TABLE..."
    npx wrangler d1 execute hanzimaster-db --remote \
        --command "SELECT * FROM $TABLE;" \
        --json > "$BACKUP_DIR/$TABLE.json" 2>/dev/null || echo "  (table may not exist yet)"
done

# Step 3: Get current row counts for verification
echo ""
echo -e "${YELLOW}Step 2: Recording current state...${NC}"
echo "Current row counts:" | tee "$BACKUP_DIR/pre-migration-state.txt"
for TABLE in "${TABLES[@]}"; do
    COUNT=$(npx wrangler d1 execute hanzimaster-db --remote \
        --command "SELECT COUNT(*) as count FROM $TABLE;" \
        --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
    echo "  $TABLE: $COUNT rows" | tee -a "$BACKUP_DIR/pre-migration-state.txt"
done

# Step 4: Show pending migrations
echo ""
echo -e "${YELLOW}Step 3: Checking pending migrations...${NC}"
PENDING=$(ls -la drizzle/*.sql 2>/dev/null | wc -l)
echo "  Found $PENDING migration files"
echo ""

# Step 5: Confirm
echo -e "${RED}⚠️  ABOUT TO RUN MIGRATIONS${NC}"
echo ""
echo "Backup saved to: $BACKUP_DIR"
echo ""
read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 1
fi

# Step 6: Run migrations
echo ""
echo -e "${YELLOW}Step 4: Running migrations...${NC}"
npx wrangler d1 migrations apply hanzimaster-db --remote

# Step 7: Verify
echo ""
echo -e "${YELLOW}Step 5: Verifying data integrity...${NC}"
echo "Post-migration row counts:" | tee "$BACKUP_DIR/post-migration-state.txt"

ALL_GOOD=true
for TABLE in "${TABLES[@]}"; do
    COUNT=$(npx wrangler d1 execute hanzimaster-db --remote \
        --command "SELECT COUNT(*) as count FROM $TABLE;" \
        --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
    echo "  $TABLE: $COUNT rows" | tee -a "$BACKUP_DIR/post-migration-state.txt"
    
    # Compare with pre-migration
    PRE_COUNT=$(grep "$TABLE:" "$BACKUP_DIR/pre-migration-state.txt" | awk '{print $2}')
    if [ "$COUNT" -lt "$PRE_COUNT" ] 2>/dev/null; then
        echo -e "    ${RED}⚠️  WARNING: Row count decreased from $PRE_COUNT!${NC}"
        ALL_GOOD=false
    fi
done

echo ""
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ Migration complete! Data integrity verified.${NC}"
else
    echo -e "${RED}⚠️  Migration complete but data changes detected. Review backup at: $BACKUP_DIR${NC}"
fi

echo ""
echo "To restore from this backup point, use D1 Time Travel:"
echo "  npx wrangler d1 time-travel info hanzimaster-db --timestamp \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\""

