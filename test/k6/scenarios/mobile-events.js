// ══════════════════════════════════════════════════════════════════════════════
// Mobile Events Scenario - Event batch sync from mobile app
// ══════════════════════════════════════════════════════════════════════════════
//
// Simulates: Batch upload events → Sync state → Verify processing
//
// This is critical for mobile learning data persistence.
//
// Run: k6 run test/k6/scenarios/mobile-events.js
//
// Required env:
//   - API_URL
//   - TEST_USER_JWT
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, getHeaders, getAuthHeaders, endpoints, defaultThresholds, TEST_USER_JWT } from '../config.js';
import { randomString, uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  vus: 15,
  duration: '3m',
  thresholds: {
    ...defaultThresholds,
    'event_upload_duration': ['p(95)<1000'],
    'sync_state_duration': ['p(95)<500'],
    'events_processed': ['count>100'],
  },
  tags: {
    test_type: 'scenario',
    scenario: 'mobile-events',
  },
};

// Custom metrics
const eventUploadDuration = new Trend('event_upload_duration');
const syncStateDuration = new Trend('sync_state_duration');
const eventsProcessed = new Counter('events_processed');
const eventErrors = new Rate('event_errors');
const batchSize = new Trend('batch_size');

// ─────────────────────────────────────────────────────────────────────────────
// Event Generators
// ─────────────────────────────────────────────────────────────────────────────

function generateLearningEvent() {
  const eventTypes = [
    'word_learned',
    'word_reviewed',
    'exercise_completed',
    'lesson_started',
    'lesson_completed',
  ];
  
  return {
    id: uuidv4(),
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    timestamp: new Date().toISOString(),
    data: {
      word_id: `word_${Math.floor(Math.random() * 1000)}`,
      score: Math.random(),
      duration_ms: Math.floor(Math.random() * 5000) + 500,
    },
    client_seq: Date.now() + Math.floor(Math.random() * 1000),
  };
}

function generateEventBatch(size = 10) {
  return Array.from({ length: size }, generateLearningEvent);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  if (!TEST_USER_JWT) {
    console.warn('⚠️  TEST_USER_JWT not set - skipping authenticated requests');
    sleep(1);
    return;
  }

  const authHeaders = getAuthHeaders();

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Get current sync state
  // ───────────────────────────────────────────────────────────────────────────
  let lastSeq = 0;
  
  group('Get Sync State', () => {
    const stateRes = http.get(`${BASE_URL}${endpoints.syncState}`, {
      headers: authHeaders,
    });

    syncStateDuration.add(stateRes.timings.duration);

    check(stateRes, {
      'sync state: status ok': (r) => r.status >= 200 && r.status < 300,
    });

    if (stateRes.status === 200) {
      try {
        const state = JSON.parse(stateRes.body);
        lastSeq = state.last_seq || state.lastSeq || 0;
      } catch {
        // Ignore parse errors
      }
    }
  });

  sleep(0.5);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Upload event batch
  // ───────────────────────────────────────────────────────────────────────────
  group('Upload Events', () => {
    // Variable batch sizes (1-20 events)
    const numEvents = Math.floor(Math.random() * 20) + 1;
    const events = generateEventBatch(numEvents);
    
    batchSize.add(numEvents);

    const uploadRes = http.post(
      `${BASE_URL}${endpoints.syncEvents}`,
      JSON.stringify({ 
        events,
        client_seq: lastSeq + 1,
      }),
      { headers: authHeaders }
    );

    eventUploadDuration.add(uploadRes.timings.duration);

    const uploadOk = check(uploadRes, {
      'upload: status ok': (r) => r.status >= 200 && r.status < 300,
      'upload: events accepted': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.accepted !== undefined || body.processed !== undefined;
        } catch {
          return r.status === 200 || r.status === 201;
        }
      },
    });

    if (uploadOk) {
      eventsProcessed.add(numEvents);
    } else {
      eventErrors.add(1);
      console.error(`Event upload failed: ${uploadRes.status} - ${uploadRes.body?.substring(0, 100)}`);
    }
  });

  sleep(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Verify sync state updated
  // ───────────────────────────────────────────────────────────────────────────
  group('Verify Sync', () => {
    const verifyRes = http.get(`${BASE_URL}${endpoints.syncState}`, {
      headers: authHeaders,
    });

    check(verifyRes, {
      'verify: status ok': (r) => r.status >= 200 && r.status < 300,
    });
  });

  // Simulate mobile app doing other things between syncs
  sleep(2 + Math.random() * 3);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: Occasionally do a large batch (simulates extended offline period)
  // ───────────────────────────────────────────────────────────────────────────
  if (Math.random() < 0.1) { // 10% of iterations
    group('Large Batch Sync', () => {
      const events = generateEventBatch(50); // Big batch
      
      batchSize.add(50);

      const uploadRes = http.post(
        `${BASE_URL}${endpoints.syncEvents}`,
        JSON.stringify({ 
          events,
          client_seq: Date.now(),
        }),
        { 
          headers: authHeaders,
          timeout: '30s',
        }
      );

      const uploadOk = check(uploadRes, {
        'large batch: status ok': (r) => r.status >= 200 && r.status < 300,
      });

      if (uploadOk) {
        eventsProcessed.add(50);
      } else {
        eventErrors.add(1);
      }
    });
  }

  sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`📱 Mobile Events Scenario`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`🔐 Auth: ${TEST_USER_JWT ? 'Configured' : '⚠️  NOT SET'}`);
  
  if (!TEST_USER_JWT) {
    console.warn('⚠️  Set TEST_USER_JWT to run authenticated event sync tests');
  }
  
  return {};
}

export function teardown() {
  console.log(`\n📊 Event Sync Results:`);
  console.log(`   - events_processed: Total events uploaded`);
  console.log(`   - event_errors: Failed upload attempts`);
  console.log(`   - batch_size: Distribution of batch sizes`);
}

