// ══════════════════════════════════════════════════════════════════════════════
// Stress Test - Find breaking point
// ══════════════════════════════════════════════════════════════════════════════
//
// ⚠️  MANUAL ONLY - Never run this automatically!
//
// Purpose: Determine system limits, observe failure modes
// Duration: 10 minutes
// VUs: 100 → 500 (aggressive ramp)
//
// Run: k6 run test/k6/stress.js
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { 
  BASE_URL, 
  stressThresholds, 
  getHeaders,
  endpoints,
} from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Baseline
    { duration: '2m', target: 200 },   // Push harder
    { duration: '2m', target: 300 },   // Heavy load
    { duration: '2m', target: 500 },   // Near breaking
    { duration: '1m', target: 500 },   // Sustain peak
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: stressThresholds,
  tags: {
    test_type: 'stress',
  },
  
  // Abort if error rate spikes
  abortOnFail: true,
};

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const serverErrors = new Counter('server_errors');
const timeoutErrors = new Counter('timeout_errors');
const breakingPointVUs = new Trend('breaking_point_vus');

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario - Aggressive API hammering
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  // ───────────────────────────────────────────────────────────────────────────
  // Health endpoint (most resilient, should survive longest)
  // ───────────────────────────────────────────────────────────────────────────
  group('Health', () => {
    const res = http.get(`${BASE_URL}${endpoints.health}`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    const status = res.status;
    
    check(res, {
      'health: ok': (r) => r.status === 200,
    });
    
    // Track failure types
    if (status === 429) {
      rateLimitHits.add(1);
    } else if (status >= 500) {
      serverErrors.add(1);
      breakingPointVUs.add(__VU);
    } else if (status === 0) {
      timeoutErrors.add(1);
      breakingPointVUs.add(__VU);
    }
  });

  // Minimal sleep to maximize pressure
  sleep(0.1);

  // ───────────────────────────────────────────────────────────────────────────
  // Curriculum endpoint (moderately heavy)
  // ───────────────────────────────────────────────────────────────────────────
  group('Curriculum', () => {
    const res = http.get(`${BASE_URL}${endpoints.curriculumVersion}`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    const status = res.status;
    
    check(res, {
      'version: ok': (r) => r.status === 200,
    });
    
    if (status === 429) {
      rateLimitHits.add(1);
    } else if (status >= 500) {
      serverErrors.add(1);
    } else if (status === 0) {
      timeoutErrors.add(1);
    }
  });

  sleep(0.1);

  // ───────────────────────────────────────────────────────────────────────────
  // Vocabulary endpoint (database-heavy)
  // ───────────────────────────────────────────────────────────────────────────
  group('Vocabulary', () => {
    // Random pagination to stress different DB paths
    const offset = Math.floor(Math.random() * 500);
    const res = http.get(`${BASE_URL}${endpoints.vocabulary}?limit=50&offset=${offset}`, {
      headers: getHeaders(),
      timeout: '15s',
    });
    
    const status = res.status;
    
    check(res, {
      'vocabulary: ok': (r) => r.status === 200,
    });
    
    if (status === 429) {
      rateLimitHits.add(1);
    } else if (status >= 500) {
      serverErrors.add(1);
    } else if (status === 0) {
      timeoutErrors.add(1);
    }
  });

  // Tiny sleep to prevent complete DoS
  sleep(0.05 + Math.random() * 0.1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n⚠️  ═══════════════════════════════════════════════════════════`);
  console.log(`⚠️  STRESS TEST - This will push the API to its limits!`);
  console.log(`⚠️  ═══════════════════════════════════════════════════════════\n`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`👥 Peak VUs: 500`);
  console.log(`⏱️  Duration: 10 minutes`);
  console.log(`\n🎯 Goal: Find breaking point and observe failure modes\n`);
  
  // Verify API is reachable before starting
  const res = http.get(`${BASE_URL}${endpoints.health}`);
  if (res.status !== 200) {
    throw new Error(`API not reachable! Status: ${res.status}`);
  }
  
  console.log(`✅ API responding. Starting stress test...\n`);
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  
  console.log(`\n════════════════════════════════════════`);
  console.log(`🏁 Stress Test Complete (${duration} min)`);
  console.log(`════════════════════════════════════════`);
  console.log(`\n📊 Key Metrics to Review:`);
  console.log(`   - rate_limit_hits: How often rate limiting kicked in`);
  console.log(`   - server_errors: 5xx responses (system stress)`);
  console.log(`   - timeout_errors: Requests that timed out`);
  console.log(`   - breaking_point_vus: VU count when failures started`);
  console.log(`\n💡 Look for patterns in when errors started occurring.`);
  console.log(`   The VU count at first errors is your practical capacity limit.`);
}

