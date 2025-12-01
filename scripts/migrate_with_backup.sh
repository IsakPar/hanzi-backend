#!/bin/bash
#
# Pre-Migration Backup Script
#
# Creates a backup before running database migrations.
# Usage: ./scripts/migrate_with_backup.sh <migration_name>
#
# Example:
#   ./scripts/migrate_with_backup.sh 0042_add_grammar_table
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Migration name is required${NC}"
    echo ""
    echo "Usage: $0 <migration_name>"
    echo "Example: $0 0042_add_grammar_table"
    exit 1
fi

MIGRATION_VERSION="$1"

echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW} Pre-Migration Backup for: ${MIGRATION_VERSION}${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Create backup
echo -e "${GREEN}Step 1: Creating pre-migration backup...${NC}"
export MIGRATION_VERSION
export TRIGGERED_BY="migrate-script"

if ! npx ts-node backup/backup.ts pre-migration "$MIGRATION_VERSION"; then
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED} BACKUP FAILED - ABORTING MIGRATION${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Do NOT proceed with migration until backup succeeds."
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Running migrations...${NC}"

# Step 2: Run migrations
if ! npm run db:migrate; then
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED} MIGRATION FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Backup was created before migration."
    echo "You can restore from the pre-migration backup if needed."
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✅ MIGRATION COMPLETE${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Migration ${MIGRATION_VERSION} applied successfully."
echo "Pre-migration backup is available for rollback if needed."

