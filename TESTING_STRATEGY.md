# HanziMaster Testing Strategy

> Complete testing roadmap from current state to production-ready

---

## 📊 Current State

| Metric | Value |
|--------|-------|
| **Total Tests** | 629 |
| **Passing** | 627 |
| **Failing** | 2 (being fixed) |
| **Test Files** | 40 |

### Test Distribution by Priority

```
P0 (Critical)     ████████████████░░░░  ~150 tests
P1 (High)         ██████████████████░░  ~280 tests  
P2 (Medium)       ████████████░░░░░░░░  ~180 tests
P3 (Low)          ░░░░░░░░░░░░░░░░░░░░  ~20 tests
                  ─────────────────────
                  Total: ~630 tests
```

---

## 🎯 Target State: 900+ Tests

To be "happy" with testing, we need **270+ more tests** strategically placed.

---

## 🗺️ Test Priority Map

### P0: Critical Path (Must Never Break)
**Goal: 95% coverage | Current: ~85%**

These features, if broken, mean users can't use the app or revenue stops.

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Auth & Sessions** | 17 | 35 | +18 |
| **Billing/RevenueCat** | 26 | 50 | +24 |
| **Rate Limiting** | 22 | 30 | +8 |
| **Data Integrity** | 21 | 30 | +9 |
| **TOTAL P0** | 86 | 145 | **+59** |

#### P0 Tests Needed

```
AUTH (+18)
├── Email verification flow
├── Password reset complete flow
├── Session refresh/extend
├── Multi-device logout
├── Account deletion cascade
├── OAuth state validation
├── CSRF token validation
├── Rate limit on login attempts
├── Session fixation prevention
├── Cookie security attributes
├── Cross-origin session handling
├── Remember me token handling
├── Session hijack prevention
├── Token rotation on privilege change
├── Account lockout after failures
├── Unlock account flow
├── Session persistence across deploys
└── Concurrent session limits

BILLING (+24)
├── Webhook signature HMAC validation
├── Webhook retry handling
├── Subscription pause/resume
├── Trial period expiration
├── Trial to paid conversion
├── Annual ↔ monthly switch
├── Proration calculations
├── Failed payment retry sequence
├── Grace period countdown
├── Dunning email triggers
├── Refund processing
├── Partial refund handling
├── Chargeback response
├── Invoice generation
├── Receipt email sending
├── Currency handling
├── Tax calculation
├── Promotional code stacking
├── Gift subscription flow
├── Family plan management
├── Enterprise tier handling
├── Grandfather pricing preservation
├── Subscription analytics accuracy
└── Revenue tracking accuracy

RATE LIMITING (+8)
├── Per-endpoint limits
├── Burst handling (50 req/sec)
├── Rate limit headers accuracy
├── Retry-After header
├── Limit reset timing (midnight UTC)
├── Concurrent request limits
├── API key vs session limits
└── Admin bypass verification

DATA INTEGRITY (+9)
├── Foreign key enforcement
├── Unique constraint enforcement
├── Cascade delete behavior
├── Transaction rollback
├── Optimistic locking
├── Dead letter handling
├── Orphan cleanup
├── Data migration safety
└── Backup/restore verification
```

---

### P1: Core Features (Daily User Experience)
**Goal: 85% coverage | Current: ~70%**

Features users interact with every day. Bugs here = bad reviews.

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Lessons API** | 35 | 60 | +25 |
| **Vocabulary API** | 25 | 45 | +20 |
| **Stories API** | 30 | 50 | +20 |
| **AI Assistant** | 25 | 50 | +25 |
| **Units API** | 19 | 30 | +11 |
| **User Management** | 20 | 35 | +15 |
| **TOTAL P1** | 154 | 270 | **+116** |

#### P1 Tests Needed

```
LESSONS (+25)
├── Lesson with 50+ blocks (performance)
├── Block reordering edge cases
├── Lesson duplication
├── Draft → Published → Archived flow
├── Lesson prerequisites validation
├── Progress persistence across sessions
├── Offline lesson sync
├── Lesson content search
├── Combined filter queries
├── Bulk operations (publish 100)
├── JSON import/export
├── Block type validation
├── Block content sanitization
├── Missing audio/image handling
├── Lesson locking during edit
├── Concurrent edit conflict resolution
├── Lesson deletion with progress
├── Lesson restoration from archive
├── Cross-unit lesson references
├── Lesson completion tracking
├── Lesson analytics recording
├── Block alternative suggestions
├── Connected words generation
├── Focus word extraction
└── Lesson difficulty calculation

VOCABULARY (+20)
├── Bulk import (1000+ words)
├── Duplicate detection
├── Fuzzy search (pinyin variants)
├── Tone number ↔ mark conversion
├── Traditional ↔ simplified
├── Synonym/antonym linking
├── Compound word detection
├── Radical extraction
├── Stroke order data
├── Category management
├── Tag management
├── Mastery level tracking
├── Spaced repetition scheduling
├── Review queue generation
├── Export formats (Anki, CSV)
├── Audio pronunciation
├── Example sentence generation
├── Frequency tracking
├── Difficulty rating
└── Vector embedding generation

STORIES (+20)
├── Story with 100+ sentences
├── Audio sync timing
├── Vocabulary highlighting
├── Comprehension questions
├── Difficulty calculation
├── Reading time estimation
├── Progress saving
├── Bookmark management
├── Sentence notes
├── Translation toggle
├── Pinyin toggle
├── Audio speed control
├── Series ordering
├── Category filtering
├── Recommendation engine
├── Completion certificates
├── Read history
├── Tap tracking analytics
├── Vocabulary extraction
└── Difficulty progression

AI ASSISTANT (+25)
├── Response streaming
├── Context window (10+ messages)
├── Tool call chaining
├── Error recovery
├── Timeout handling
├── Fallback model switching
├── Cost tracking accuracy
├── Usage quota enforcement
├── Template variable injection
├── A/B testing prompts
├── Response caching
├── Content filtering
├── Language detection
├── HSK level compliance
├── Vocabulary constraints
├── Grammar explanations
├── Pronunciation feedback
├── Tutor personality
├── Session continuity
├── Model switching mid-conversation
├── Response formatting
├── Citation accuracy
├── Hallucination detection
├── Feedback collection
└── Tutor lesson generation
```

---

### P2: Supporting Features (Polish & Analytics)
**Goal: 70% coverage | Current: ~50%**

Features that make the experience polished but aren't critical.

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Analytics** | 28 | 50 | +22 |
| **Content Management** | 24 | 40 | +16 |
| **Control Center** | 14 | 25 | +11 |
| **Announcements** | 8 | 20 | +12 |
| **Exports** | 10 | 20 | +10 |
| **TOTAL P2** | 84 | 155 | **+71** |

#### P2 Tests Needed

```
ANALYTICS (+22)
├── Real-time dashboard updates
├── Date range edge cases
├── Timezone handling
├── Aggregation accuracy
├── CSV export
├── PDF export
├── Period comparison
├── Trend calculations
├── Anomaly detection
├── Goal tracking
├── Cohort analysis
├── Retention funnel
├── Revenue attribution
├── Feature usage heatmaps
├── Error rate tracking
├── Performance metrics
├── A/B test results
├── Geographic distribution
├── Device breakdown
├── Session duration accuracy
├── Conversion funnel
└── LTV calculation

CONTENT MANAGEMENT (+16)
├── Large file upload (100MB+)
├── Concurrent uploads
├── Upload resume
├── File type validation
├── CDN cache invalidation
├── Image optimization
├── Audio transcoding
├── Content versioning
├── Content rollback
├── Scheduling
├── Expiration
├── Access logging
├── Search indexing
├── Quality scoring
├── Review workflow
└── Approval chain

CONTROL CENTER (+11)
├── Content staging workflow
├── Test device management
├── Push to staging
├── Promote to production
├── Rollback deployment
├── A/B test assignment
├── Feature flags
├── Content scheduling
├── Deployment history
├── Health dashboard
└── Error tracking

ANNOUNCEMENTS (+12)
├── Template rendering
├── Targeting rules
├── Scheduling
├── A/B variants
├── Dismissal tracking
├── Deep links
├── Image/icon handling
├── Preview mode
├── Analytics
├── Rate limiting
├── Personalization
└── Localization

EXPORTS (+10)
├── JSON export
├── CSV export
├── PDF export
├── Anki export
├── Bulk export
├── Scheduled exports
├── Export history
├── Large export handling
├── Format validation
└── Compression
```

---

### P3: Edge Cases & Security (Defense in Depth)
**Goal: 50% coverage | Current: ~20%**

Prevents security breaches and handles weird edge cases.

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Input Validation** | 5 | 20 | +15 |
| **Concurrency** | 3 | 15 | +12 |
| **Error Handling** | 8 | 20 | +12 |
| **Security** | 4 | 20 | +16 |
| **TOTAL P3** | 20 | 75 | **+55** |

#### P3 Tests Needed

```
INPUT VALIDATION (+15)
├── SQL injection (all endpoints)
├── XSS injection (all text fields)
├── Path traversal
├── JSON parsing edge cases
├── Extremely long strings (10KB+)
├── Negative numbers
├── Float precision
├── Date parsing edge cases
├── Empty arrays/objects
├── Deeply nested objects (100 levels)
├── Circular references
├── Binary data in text
├── Null byte injection
├── Unicode normalization
└── Control characters

CONCURRENCY (+12)
├── Double-submit prevention
├── Optimistic locking
├── Deadlock handling
├── Transaction rollback
├── Eventual consistency
├── Read-your-writes
├── Concurrent user creation
├── Concurrent lesson edit
├── Concurrent purchase
├── Session race conditions
├── Counter accuracy under load
└── Queue ordering

ERROR HANDLING (+12)
├── Database connection failure
├── External API timeout
├── External API error codes
├── Disk exhaustion (mock)
├── Memory exhaustion (mock)
├── Invalid configuration
├── Missing env vars
├── Corrupted data handling
├── Partial write recovery
├── Orphan cleanup
├── Circuit breaker
└── Graceful degradation

SECURITY (+16)
├── Authorization bypass attempts
├── Privilege escalation
├── IDOR vulnerabilities
├── Mass assignment
├── Sensitive data exposure
├── Security headers
├── CORS validation
├── CSRF protection
├── Rate limit bypass
├── Brute force protection
├── Timing attacks
├── Side channel leaks
├── Cryptographic operations
├── Secret management
├── Audit logging
└── Compliance checks
```

---

## 📈 Path to Happy Testing

### Week 1: Stabilize P0 (59 tests)
```
Day 1-2: Auth deep tests (+18)
Day 3-4: Billing edge cases (+24)  
Day 5:   Rate limiting & data integrity (+17)
```

### Week 2: Core P1 Part 1 (50 tests)
```
Day 1-2: Lessons deep (+25)
Day 3-4: Vocabulary deep (+20)
Day 5:   Buffer / fixes
```

### Week 3: Core P1 Part 2 (66 tests)
```
Day 1-2: Stories deep (+20)
Day 3-4: AI Assistant deep (+25)
Day 5:   Units & User management (+21)
```

### Week 4: P2 Supporting (71 tests)
```
Day 1-2: Analytics (+22)
Day 3:   Content Management (+16)
Day 4:   Control Center & Announcements (+23)
Day 5:   Exports (+10)
```

### Week 5: P3 Security & Edge Cases (55 tests)
```
Day 1-2: Input validation (+15)
Day 3:   Concurrency (+12)
Day 4:   Error handling (+12)
Day 5:   Security (+16)
```

---

## ✅ Definition of "Happy"

We are happy with testing when:

1. **Coverage Goals Met**
   - [ ] P0: 95% (145+ tests, all passing)
   - [ ] P1: 85% (270+ tests, all passing)
   - [ ] P2: 70% (155+ tests, all passing)
   - [ ] P3: 50% (75+ tests, all passing)

2. **Quality Gates**
   - [ ] Zero flaky tests
   - [ ] All tests run in < 5 minutes
   - [ ] No mocked production code
   - [ ] Tests are documentation

3. **CI/CD Integration**
   - [ ] Tests run on every PR
   - [ ] Blocking on test failure
   - [ ] Coverage reports generated
   - [ ] Performance regression alerts

4. **Production Confidence**
   - [ ] Can deploy on Friday afternoon
   - [ ] Refactoring without fear
   - [ ] New developer onboarding via tests
   - [ ] Bug reproduction via test case

---

## 🧮 Final Numbers

| Priority | Current | Target | Gap |
|----------|---------|--------|-----|
| P0 Critical | 86 | 145 | +59 |
| P1 High | 154 | 270 | +116 |
| P2 Medium | 84 | 155 | +71 |
| P3 Low | 20 | 75 | +55 |
| **TOTAL** | **629** | **~900** | **+271** |

---

## 📁 Test File Structure

```
test/
├── critical/              # P0 - Must never break
│   ├── auth.critical.spec.ts
│   ├── billing.critical.spec.ts
│   └── data-integrity.critical.spec.ts
├── high/                  # P1 - Core user experience  
│   ├── lessons-api.high.spec.ts
│   ├── vocabulary-api.high.spec.ts
│   ├── stories-api.high.spec.ts
│   ├── ai-assistant.high.spec.ts
│   └── control-center.high.spec.ts
├── medium/                # P2 - Supporting features
│   ├── analytics.medium.spec.ts
│   ├── content-management.medium.spec.ts
│   └── story-series.medium.spec.ts
├── deep/                  # Additional depth tests
│   ├── auth-deep.spec.ts
│   ├── billing-deep.spec.ts
│   └── rate-limits-deep.spec.ts
├── integration/           # Cross-feature integration
│   ├── all-endpoints.spec.ts
│   └── user-journey.spec.ts
├── fixtures/              # Test helpers
│   ├── better-auth-helpers.ts
│   └── seed-data.ts
├── helpers/               # Test utilities
│   ├── test-app.ts
│   └── r2.ts
└── e2e/                   # End-to-end flows
    └── user-journey.e2e.spec.ts
```

---

*Strategy created: 2025-11-29*
*Target: 900 tests before launch*
*Current: 629 tests (70% of goal)*

