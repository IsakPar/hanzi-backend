# HanziMaster Testing Roadmap

## Current State: ~500 Tests ✅

We have established a solid foundation of smoke tests covering endpoint availability, authentication, and basic CRUD operations.

### What We Have Now

| Category | Tests | Coverage |
|----------|-------|----------|
| **Critical (P0)** | | |
| Auth & Sessions | 17 | Session validation, role checks, edge cases |
| Billing & RevenueCat | 26 | Webhook processing, tier changes, expiration |
| Rate Limiting | 22 | Per-tier limits, parallel generations |
| Data Integrity | 21 | CRUD operations, concurrent updates |
| **High (P1)** | | |
| Lessons API | 11 | Basic CRUD, blocks, publishing |
| Vocabulary API | 17 | Search, filters, admin management |
| Units API | 19 | CRUD, HSK filtering, ordering |
| Stories API | 21 | CRUD, sentences, questions |
| AI Assistant | 19 | Chat, models, prompts, tutor |
| Users & Admin | 20 | User management, roles, tiers |
| Control Center | 14 | Content staging, announcements |
| Waitlist | 12 | Signup, admin listing |
| Lesson Alternatives | 14 | Slots, alternatives, connected words |
| **Medium (P2)** | | |
| Analytics | 28 | User, content, engagement stats |
| Content Management | 24 | Uploads, library, exports |
| Story Series | 18 | Series, categories, organization |
| Speech & Validator | 15 | TTS, vocabulary validation |
| **Existing Tests** | ~200 | Integration, prompts, content routes |
| **TOTAL** | **~500** | |

---

## Target State: 900 Tests 🎯

To reach production-ready test coverage, we need **~400 more tests** across these categories:

---

## Phase 1: Deep P0 Tests (+50 tests)

### Why Critical
These are your money-making features. A bug here means users can't pay, can't login, or access content they shouldn't.

### 1.1 Auth Deep Validation (+15)
```
□ Token refresh flows
□ Session expiration handling
□ Multi-device session management
□ Password reset flow
□ Email verification flow
□ Account lockout after failed attempts
□ Session invalidation on password change
□ Cross-subdomain cookie persistence
□ Remember me functionality
□ Logout from all devices
□ OAuth state validation
□ CSRF protection
□ Session hijacking prevention
□ Token rotation
□ Concurrent login limits
```

### 1.2 Billing Edge Cases (+20)
```
□ Webhook signature validation failures
□ Duplicate webhook handling (idempotency)
□ Partial refund processing
□ Upgrade mid-cycle proration
□ Downgrade grace period
□ Failed payment retry handling
□ Subscription pause/resume
□ Trial expiration
□ Annual vs monthly switching
□ Family plan handling
□ Gift subscriptions
□ Promotional code redemption
□ Currency conversion
□ Tax calculation
□ Invoice generation
□ Receipt emails
□ Chargeback handling
□ Refund window enforcement
□ Grandfather pricing
□ Enterprise tier handling
```

### 1.3 Rate Limiting Scenarios (+15)
```
□ Rate limit reset at midnight UTC
□ Burst handling (10 requests in 1 second)
□ Graceful degradation under load
□ Rate limit headers in response
□ Retry-After header accuracy
□ Per-endpoint rate limits
□ IP-based vs user-based limits
□ Rate limit bypass for admins
□ Quota rollover (or not)
□ Real-time limit updates
□ Limit exceeded logging
□ Limit warnings at 80%
□ Different limits by tier
□ API key rate limits
□ Concurrent request limits
```

---

## Phase 2: Comprehensive P1 Tests (+100 tests)

### Why High Priority
These are your core features. Users interact with these daily. Bugs here mean frustrated users and bad reviews.

### 2.1 Lessons Deep Testing (+25)
```
□ Lesson with 50+ blocks (performance)
□ Block reordering with gaps
□ Lesson duplication
□ Lesson versioning
□ Draft vs published transitions
□ Lesson prerequisites
□ Lesson completion tracking
□ Progress persistence
□ Offline lesson access
□ Lesson search by content
□ Lesson filtering combinations
□ Bulk lesson operations
□ Lesson import from JSON
□ Lesson export to JSON
□ Lesson analytics recording
□ Block type validation
□ Block content validation
□ Audio block with missing file
□ Image block with missing file
□ Lesson sharing between admins
□ Lesson locking during edit
□ Concurrent lesson edits
□ Lesson deletion with progress data
□ Lesson restoration
□ Lesson archive
```

### 2.2 Vocabulary Deep Testing (+25)
```
□ Bulk vocabulary import (1000+ words)
□ Vocabulary with examples
□ Vocabulary with audio
□ Vocabulary with images
□ Vocabulary frequency tracking
□ Vocabulary mastery levels
□ Spaced repetition scheduling
□ Vocabulary search fuzzy matching
□ Pinyin tone number vs mark
□ Traditional vs simplified characters
□ Vocabulary synonyms
□ Vocabulary antonyms
□ Vocabulary compounds
□ Vocabulary radicals
□ Stroke order data
□ Vocabulary categories CRUD
□ Vocabulary tagging
□ Vocabulary statistics
□ User vocabulary progress
□ Vocabulary review scheduling
□ Vocabulary export formats
□ Vocabulary deduplication
□ Vocabulary merge
□ Vocabulary split
□ Vocabulary difficulty rating
```

### 2.3 Stories Deep Testing (+25)
```
□ Story with 100+ sentences (performance)
□ Story audio synchronization
□ Story vocabulary highlighting
□ Story comprehension questions
□ Story difficulty auto-calculation
□ Story reading time estimation
□ Story progress saving
□ Story bookmarking
□ Story notes per sentence
□ Story translation toggle
□ Story pinyin toggle
□ Story audio speed control
□ Story sentence audio
□ Story full audio
□ Story series ordering
□ Story category filtering
□ Story recommendations
□ Story completion certificate
□ Story sharing
□ Story favorites
□ Story read history
□ Story reading statistics
□ Story sentence tap tracking
□ Story vocabulary extraction
□ Story difficulty progression
```

### 2.4 AI System Deep Testing (+25)
```
□ AI response streaming
□ AI conversation context (10+ messages)
□ AI tool call chaining
□ AI error recovery
□ AI timeout handling
□ AI fallback models
□ AI cost tracking accuracy
□ AI usage quotas
□ AI prompt template variables
□ AI prompt A/B testing
□ AI response caching
□ AI content filtering
□ AI language detection
□ AI HSK level compliance
□ AI vocabulary constraints
□ AI grammar explanations
□ AI pronunciation feedback
□ AI tutor personality
□ AI conversation history
□ AI session continuity
□ AI model switching mid-conversation
□ AI response formatting
□ AI citation accuracy
□ AI hallucination prevention
□ AI feedback collection
```

---

## Phase 3: Complete P2 Tests (+115 tests)

### Why Medium Priority
These support the core features. Users may not notice if slightly broken, but they make the experience polished.

### 3.1 Analytics Deep Testing (+30)
```
□ Real-time dashboard updates
□ Analytics date range edge cases
□ Analytics timezone handling
□ Analytics data aggregation accuracy
□ Analytics export to CSV
□ Analytics export to PDF
□ Analytics comparison periods
□ Analytics trend calculations
□ Analytics anomaly detection
□ Analytics goal tracking
□ User cohort analysis
□ Retention funnel accuracy
□ Revenue attribution
□ Feature usage heatmaps
□ Error rate tracking
□ Performance metrics
□ A/B test analytics
□ Geographic distribution
□ Device breakdown
□ Session duration accuracy
□ Bounce rate calculation
□ Conversion funnel
□ LTV calculation
□ Churn prediction data
□ Engagement scoring
□ Content performance ranking
□ AI usage analytics
□ Cost per user analytics
□ Revenue per user analytics
□ Growth rate calculations
```

### 3.2 Content System Deep Testing (+30)
```
□ Large file upload (100MB+)
□ Concurrent uploads
□ Upload resume after failure
□ File type validation
□ File virus scanning mock
□ CDN cache invalidation
□ Image optimization
□ Audio transcoding
□ Video processing (if applicable)
□ Content versioning
□ Content rollback
□ Content scheduling
□ Content expiration
□ Content access logging
□ Content search indexing
□ Content recommendation engine
□ Content difficulty tagging
□ Content quality scoring
□ Content review workflow
□ Content approval chain
□ Content localization
□ Content A/B variants
□ Content performance metrics
□ Bulk content operations
□ Content import from external
□ Content export formats
□ Content backup/restore
□ Content migration tools
□ Content integrity checks
□ Content deduplication
```

### 3.3 Notification & Communication (+20)
```
□ Push notification delivery
□ Email template rendering
□ Email delivery tracking
□ In-app notification storage
□ Notification preferences
□ Notification scheduling
□ Notification targeting (segments)
□ Notification A/B testing
□ Notification analytics
□ Notification rate limiting
□ Announcement display logic
□ Announcement dismissal
□ Announcement targeting
□ Announcement scheduling
□ Announcement templates
□ Deep link handling
□ Universal link handling
□ Notification sound settings
□ Badge count accuracy
□ Notification grouping
```

### 3.4 Search & Discovery (+20)
```
□ Full-text search accuracy
□ Search result ranking
□ Search filters combination
□ Search autocomplete
□ Search suggestions
□ Search history
□ Search analytics
□ Semantic search (Vectorize)
□ Related content discovery
□ Trending content
□ Personalized recommendations
□ Recently viewed
□ Continue learning
□ Daily goals
□ Streak tracking
□ Achievement system
□ Leaderboards
□ Social features (if any)
□ Share functionality
□ Referral tracking
```

### 3.5 System Health & Operations (+15)
```
□ Health check endpoints
□ Readiness probes
□ Liveness probes
□ Database connection pooling
□ Cache hit/miss rates
□ Error rate monitoring
□ Slow query detection
□ Memory usage tracking
□ CPU usage tracking
□ Request queue depth
□ Worker health
□ Scheduled job execution
□ Backup verification
□ Disaster recovery test
□ Graceful shutdown
```

---

## Phase 4: Edge Cases & Security (+35 tests)

### Why Essential
These prevent security breaches and handle the weird cases that cause production incidents at 3 AM.

### 4.1 Input Validation (+15)
```
□ SQL injection attempts
□ XSS injection attempts
□ Unicode edge cases (emojis, RTL)
□ Null byte injection
□ Path traversal attempts
□ JSON parsing edge cases
□ Extremely long strings (10KB+)
□ Negative numbers where positive expected
□ Float precision issues
□ Date parsing edge cases
□ Timezone edge cases
□ Empty arrays/objects
□ Deeply nested objects
□ Circular references
□ Binary data in text fields
```

### 4.2 Concurrency & Race Conditions (+10)
```
□ Double-submit prevention
□ Optimistic locking
□ Database deadlock handling
□ Transaction rollback
□ Eventual consistency
□ Read-your-writes consistency
□ Concurrent user creation
□ Concurrent lesson edit
□ Concurrent purchase
□ Session race conditions
```

### 4.3 Error Handling (+10)
```
□ Database connection failure
□ External API timeout
□ External API error response
□ Disk space exhaustion (mock)
□ Memory exhaustion (mock)
□ Invalid configuration
□ Missing environment variables
□ Corrupted data handling
□ Partial write recovery
□ Orphaned data cleanup
```

---

## Implementation Priority

```
Week 1: Phase 1 (P0 Deep) - 50 tests
        → Auth, Billing, Rate Limiting edge cases
        
Week 2: Phase 2a (P1 Core) - 50 tests  
        → Lessons, Vocabulary deep testing
        
Week 3: Phase 2b (P1 Extended) - 50 tests
        → Stories, AI system deep testing
        
Week 4: Phase 3a (P2 Analytics) - 60 tests
        → Analytics, Content management
        
Week 5: Phase 3b (P2 Features) - 55 tests
        → Notifications, Search, System health
        
Week 6: Phase 4 (Security) - 35 tests
        → Input validation, Concurrency, Error handling
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total Tests | ~500 | 900 |
| P0 Coverage | 70% | 95% |
| P1 Coverage | 50% | 85% |
| P2 Coverage | 30% | 70% |
| Edge Cases | 10% | 50% |
| Security Tests | 5% | 30% |

---

## Why 900 Tests Matters

### 1. **Production Confidence**
With 900 tests, you can deploy on Friday afternoon without fear. Each test is a guarantee that specific functionality works.

### 2. **Refactoring Freedom**
When you want to optimize that slow query or restructure that messy module, tests tell you if you broke anything.

### 3. **Onboarding Speed**
New developers understand expected behavior by reading tests. Tests are executable documentation.

### 4. **Bug Prevention ROI**
Finding a bug in tests: 5 minutes to fix.
Finding a bug in production: Hours of debugging + user complaints + reputation damage.

### 5. **Compliance & Audits**
If you ever need SOC2, GDPR audits, or enterprise customers, comprehensive tests are evidence of quality.

---

## Next Steps

1. Run current suite, fix any failures
2. Start Phase 1 (P0 Deep Tests)
3. Commit after each phase passes
4. Deploy with confidence

---

*Document created: 2025-11-29*
*Target completion: Before launch*

