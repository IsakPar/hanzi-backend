// ══════════════════════════════════════════════════════════════════════════════
// Smoke Test - Quick sanity check
// ══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Verify basic API functionality after every push to main
// Duration: ~30 seconds
// VUs: 5
//
// Run: k6 run test/k6/smoke.js
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { 
  BASE_URL, 
  smokeThresholds, 
  getHeaders, 
  getAuthHeaders,
  endpoints,
  checkOk,
  TEST_USER_JWT,
} from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: smokeThresholds,
  
  // Tags for filtering in results
  tags: {
    test_type: 'smoke',
  },
};

// Custom metrics
const healthCheckDuration = new Trend('health_check_duration');
const errorRate = new Rate('errors');

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  // ───────────────────────────────────────────────────────────────────────────
  // Group 1: Health & Public Endpoints
  // ───────────────────────────────────────────────────────────────────────────
  group('Health & Public', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}${endpoints.health}`, {
      headers: getHeaders(),
    });
    
    const healthOk = check(healthRes, {
      'health: status 200': (r) => r.status === 200,
    });
    
    healthCheckDuration.add(healthRes.timings.duration);
    if (!healthOk) errorRate.add(1);

    // Curriculum version (public endpoint)
    const versionRes = http.get(`${BASE_URL}${endpoints.curriculumVersion}`, {
      headers: getHeaders(),
    });
    
    const versionOk = check(versionRes, {
      'curriculum version: status 200': (r) => r.status === 200,
      'curriculum version: has version': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.version !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (!versionOk) errorRate.add(1);
  });

  sleep(0.5);

  // ───────────────────────────────────────────────────────────────────────────
  // Group 2: Authenticated Endpoints (if JWT available)
  // ───────────────────────────────────────────────────────────────────────────
  if (TEST_USER_JWT) {
    group('Authenticated', () => {
      // Get current user
      const meRes = http.get(`${BASE_URL}${endpoints.tokenMe}`, {
        headers: getAuthHeaders(),
      });
      
      const meOk = check(meRes, {
        'me: status 200': (r) => r.status === 200,
        'me: has user id': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.user && body.user.id;
          } catch {
            return false;
          }
        },
      });
      
      if (!meOk) errorRate.add(1);

      // Get user profile
      const profileRes = http.get(`${BASE_URL}${endpoints.userProfile}`, {
        headers: getAuthHeaders(),
      });
      
      check(profileRes, {
        'profile: status 2xx': (r) => r.status >= 200 && r.status < 300,
      });
    });
  }

  sleep(0.5);

  // ───────────────────────────────────────────────────────────────────────────
  // Group 3: Content Endpoints
  // ───────────────────────────────────────────────────────────────────────────
  group('Content', () => {
    // Vocabulary list
    const vocabRes = http.get(`${BASE_URL}${endpoints.vocabulary}?limit=10`, {
      headers: getHeaders(),
    });
    
    check(vocabRes, {
      'vocabulary: status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    // Lessons list  
    const lessonsRes = http.get(`${BASE_URL}${endpoints.lessons}?limit=5`, {
      headers: getHeaders(),
    });
    
    check(lessonsRes, {
      'lessons: status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`🔥 Smoke Test Starting`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`🔐 Auth: ${TEST_USER_JWT ? 'Yes' : 'No (skipping auth tests)'}`);
  
  // Verify API is reachable
  const res = http.get(`${BASE_URL}${endpoints.health}`);
  if (res.status !== 200) {
    throw new Error(`API not reachable! Status: ${res.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(1);
  console.log(`✅ Smoke Test Complete (${duration}s)`);
}

