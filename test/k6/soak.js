// ══════════════════════════════════════════════════════════════════════════════
// Soak Test - Extended duration stability test
// ══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Find memory leaks, connection issues, gradual degradation
// Duration: 30 minutes
// VUs: 20 (sustained)
//
// Run: k6 run test/k6/soak.js
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { 
  BASE_URL, 
  defaultThresholds, 
  getHeaders,
  getAuthHeaders,
  endpoints,
  TEST_USER_JWT,
} from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '25m', target: 20 },  // Sustain
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...defaultThresholds,
    // Soak-specific: ensure no degradation over time
    'http_req_duration{group:::Early}': ['p(95)<500'],
    'http_req_duration{group:::Late}': ['p(95)<500'],  // Should be same as early!
  },
  tags: {
    test_type: 'soak',
  },
};

// Custom metrics for tracking degradation
const earlyLatency = new Trend('early_latency');
const lateLatency = new Trend('late_latency');
const iterationCounter = new Counter('iterations');
const memoryLeakIndicator = new Rate('memory_leak_indicator');

// Track test phase
let testStartTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  const elapsed = (Date.now() - testStartTime) / 1000;
  const isEarlyPhase = elapsed < 300; // First 5 minutes
  const isLatePhase = elapsed > 1200; // After 20 minutes
  
  iterationCounter.add(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Core API calls - same in early and late phases for comparison
  // ───────────────────────────────────────────────────────────────────────────
  
  const groupName = isEarlyPhase ? 'Early' : (isLatePhase ? 'Late' : 'Middle');
  
  group(groupName, () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}${endpoints.health}`, {
      headers: getHeaders(),
    });
    
    check(healthRes, {
      'health: ok': (r) => r.status === 200,
    });

    // Track latency by phase
    if (isEarlyPhase) {
      earlyLatency.add(healthRes.timings.duration);
    } else if (isLatePhase) {
      lateLatency.add(healthRes.timings.duration);
    }

    sleep(0.5);

    // Vocabulary endpoint
    const vocabRes = http.get(`${BASE_URL}${endpoints.vocabulary}?limit=20`, {
      headers: getHeaders(),
    });
    
    const vocabOk = check(vocabRes, {
      'vocabulary: ok': (r) => r.status === 200,
    });

    if (isEarlyPhase) {
      earlyLatency.add(vocabRes.timings.duration);
    } else if (isLatePhase) {
      lateLatency.add(vocabRes.timings.duration);
      
      // Compare with early phase - detect degradation
      // (In real analysis, you'd compare earlyLatency.avg vs lateLatency.avg)
    }

    sleep(0.5);

    // Curriculum version
    const versionRes = http.get(`${BASE_URL}${endpoints.curriculumVersion}`, {
      headers: getHeaders(),
    });
    
    check(versionRes, {
      'version: ok': (r) => r.status === 200,
    });

    if (isEarlyPhase) {
      earlyLatency.add(versionRes.timings.duration);
    } else if (isLatePhase) {
      lateLatency.add(versionRes.timings.duration);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Authenticated requests (if available)
  // ───────────────────────────────────────────────────────────────────────────
  
  if (TEST_USER_JWT && Math.random() < 0.3) {
    group('Auth Soak', () => {
      const meRes = http.get(`${BASE_URL}${endpoints.tokenMe}`, {
        headers: getAuthHeaders(),
      });
      
      check(meRes, {
        'me: ok': (r) => r.status === 200,
      });
      
      // Auth failures in late phase could indicate token/session issues
      if (isLatePhase && meRes.status !== 200) {
        memoryLeakIndicator.add(1);
      }
    });
  }

  // Think time
  sleep(2 + Math.random() * 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  testStartTime = Date.now();
  
  console.log(`🔄 Soak Test Starting`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`👥 Sustained VUs: 20`);
  console.log(`⏱️  Duration: 30 minutes`);
  console.log(`📊 Tracking: Early vs Late phase latency comparison`);
  
  // Verify API is reachable
  const res = http.get(`${BASE_URL}${endpoints.health}`);
  if (res.status !== 200) {
    throw new Error(`API not reachable! Status: ${res.status}`);
  }
  
  return { startTime: testStartTime };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Soak Test Complete (${duration} min)`);
  console.log(`════════════════════════════════════════`);
  console.log(`\n📊 Check custom metrics in results:`);
  console.log(`   - early_latency vs late_latency`);
  console.log(`   - If late >> early, investigate memory/connection leaks`);
  console.log(`   - memory_leak_indicator shows auth failures in late phase`);
}

