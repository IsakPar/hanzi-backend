# Backup System Environment Setup

## Required Environment Variables

### General

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Target environment | `production`, `staging`, `development` |
| `TRIGGERED_BY` | Who triggered the backup | `github-actions`, `cli`, `admin@example.com` |
| `USE_WRANGLER_CLI` | Use wrangler CLI for D1 | `true` or `false` |

### Cloudflare (D1 + R2)

| Variable | Description | Example |
|----------|-------------|---------|
| `CF_ACCOUNT_ID` | Cloudflare Account ID | `abc123def456...` |
| `CLOUDFLARE_API_TOKEN` | API Token with D1 + R2 permissions | `xxx...` |
| `D1_DATABASE_NAME` | D1 database name | `hanzimaster-db` |
| `D1_DATABASE_ID` | D1 database ID | `abc123...` |
| `D1_STAGING_DATABASE_NAME` | Staging D1 database name | `hanzimaster-db-staging` |
| `D1_STAGING_DATABASE_ID` | Staging D1 database ID | `def456...` |
| `R2_BUCKET` | R2 bucket for backups | `hanzimaster-backups` |
| `R2_ACCESS_KEY_ID` | R2 access key | `xxx...` |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `xxx...` |
| `R2_ENDPOINT` | R2 S3-compatible endpoint | `https://<account-id>.r2.cloudflarestorage.com` |

### AWS (S3 + Glacier)

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCOUNT_ID` | AWS Account ID | `123456789012` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `xxx...` |
| `S3_BUCKET` | S3 bucket for backups | `hm-prod-backups` |
| `S3_REGION` | S3 region | `us-east-1` |

### Encryption

| Variable | Description | Example |
|----------|-------------|---------|
| `ENCRYPTION_KEY_ID` | Key identifier | `kms:key-id` or `local:dev` |
| `ENCRYPTION_LOCAL_KEY` | Local encryption key (dev only) | 32+ character string |

---

## GitHub Actions Secrets

Set these secrets in your repository settings (Settings → Secrets and variables → Actions):

```
CF_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
D1_DATABASE_NAME
D1_DATABASE_ID
D1_STAGING_DATABASE_NAME
D1_STAGING_DATABASE_ID
R2_BACKUP_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
AWS_ACCOUNT_ID
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BACKUP_BUCKET
S3_REGION
BACKUP_ENCRYPTION_KEY_ID
BACKUP_ENCRYPTION_KEY
SLACK_BACKUP_WEBHOOK (optional)
JWT_SECRET (for smoke tests)
```

---

## Cloudflare API Token Permissions

Create a token at: https://dash.cloudflare.com/profile/api-tokens

Required permissions:
- **Account** → **D1** → **Edit**
- **Account** → **Workers R2 Storage** → **Edit**

---

## AWS IAM Policy

Create an IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::hm-prod-backups",
        "arn:aws:s3:::hm-prod-backups/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/*"
    }
  ]
}
```

---

## S3 Bucket Configuration

### Lifecycle Rules

```json
{
  "Rules": [
    {
      "ID": "TransitionToGlacier",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "env=production/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Versioning

Enable versioning on the bucket:

```bash
aws s3api put-bucket-versioning \
  --bucket hm-prod-backups \
  --versioning-configuration Status=Enabled
```

---

## Cross-Account Replication (Break-Glass)

For the second AWS account:

1. Create bucket `hm-prod-breakglass` in Account B
2. Enable versioning on both buckets
3. Create replication rule in Account A:

```json
{
  "Rules": [
    {
      "ID": "ReplicateToBreakGlass",
      "Status": "Enabled",
      "Priority": 1,
      "DeleteMarkerReplication": { "Status": "Disabled" },
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::hm-prod-breakglass",
        "Account": "ACCOUNT_B_ID",
        "AccessControlTranslation": {
          "Owner": "Destination"
        }
      }
    }
  ]
}
```

---

## Quick Start

### Local Development

```bash
# Set up environment
export ENVIRONMENT=development
export D1_DATABASE_NAME=hanzimaster-db
export ENCRYPTION_LOCAL_KEY="your-32-char-encryption-key-here"

# Run backup
npx ts-node backup/backup.ts manual "Test backup"
```

### GitHub Actions

1. Add all secrets to repository
2. Trigger manually: Actions → Nightly Backup → Run workflow
3. Or wait for scheduled run at 03:00 UTC

