# k6 Load Testing

Performance testing suite for HanziMaster API.

## ⚠️ Important Safety Rules

1. **NEVER target production** - All tests must use `STAGING_API_URL`
2. **NO AI endpoints in automated runs** - AI costs money per request
3. **Use test accounts only** - Never use real user credentials
4. **Check thresholds before merging** - Failed thresholds = failed CI

## Test Types

| Test | VUs | Duration | When | Purpose |
|------|-----|----------|------|---------|
| `smoke.js` | 5 | 30s | Every push to main | Quick sanity check |
| `load.js` | 50 | 5 min | Nightly | Normal load simulation |
| `soak.js` | 20 | 30 min | Weekly | Memory leaks, stability |
| `stress.js` | 100→500 | 10 min | Manual only | Find breaking point |

## Running Locally

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/

# Set environment
export API_URL="https://staging-api.polymasterlabs.com"
export TEST_USER_JWT="eyJ..."  # Get from staging

# Run smoke test
k6 run test/k6/smoke.js

# Run with more VUs
k6 run --vus 10 --duration 1m test/k6/smoke.js

# Run specific scenario
k6 run test/k6/scenarios/auth-flow.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | ✅ Yes | Staging API URL (fails if missing) |
| `TEST_USER_JWT` | For auth tests | Pre-signed JWT for test user |

## Thresholds

All tests enforce these thresholds:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
  http_req_failed: ['rate<0.01'],     // Less than 1% error rate
}
```

Tests **fail CI** if thresholds are breached.

## Scenarios

### `scenarios/auth-flow.js`
Login → Refresh token → Make authenticated requests → Logout

### `scenarios/curriculum-sync.js`
Download curriculum version → Full curriculum → Verify integrity

### `scenarios/mobile-events.js`
Batch event upload → Sync state → Verify processing

## Adding New Tests

1. Create test file in `test/k6/` or `test/k6/scenarios/`
2. Import shared config: `import { BASE_URL, defaultOptions } from './config.js'`
3. Define thresholds (don't skip this!)
4. Add to appropriate workflow trigger

## Cost Considerations

| Endpoint | Cost | Automated? |
|----------|------|------------|
| `/v1/curriculum/*` | Free | ✅ Yes |
| `/v1/auth/*` | Free | ✅ Yes |
| `/v1/users/*` | Free | ✅ Yes |
| `/v1/ai/*` | 💰 High | ❌ Manual only |
| `/v1/speech/*` | 💰 High | ❌ Manual only |
| `/v1/ai-tutor/*` | 💰 High | ❌ Manual only |

## Troubleshooting

### "API_URL is required"
Set the environment variable before running k6.

### Threshold failures
Check the summary output - it shows which thresholds failed and by how much.

### 401 errors
Your `TEST_USER_JWT` may be expired. Generate a new one from staging.

### Rate limiting
Tests hit the API fast. If you see 429s, you're testing rate limits (good!) but may need to adjust VUs.

