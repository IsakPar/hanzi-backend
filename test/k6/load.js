// ══════════════════════════════════════════════════════════════════════════════
// Load Test - Normal traffic simulation
// ══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Simulate normal production load to verify performance
// Duration: 5 minutes
// VUs: 50 (ramping)
//
// Run: k6 run test/k6/load.js
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
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
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp to target
    { duration: '2m30s', target: 50 }, // Sustain load
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    ...defaultThresholds,
    // Additional load-specific thresholds
    'http_req_duration{group:::Health}': ['p(95)<200'],
    'http_req_duration{group:::Content}': ['p(95)<400'],
  },
  tags: {
    test_type: 'load',
  },
};

// Custom metrics
const requestsPerEndpoint = new Counter('requests_per_endpoint');
const errorsByEndpoint = new Rate('errors_by_endpoint');

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario - Simulates realistic user behavior
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  const scenario = Math.random();

  // 40% - Browse content (unauthenticated)
  if (scenario < 0.4) {
    browseContent();
  }
  // 40% - Authenticated user activity
  else if (scenario < 0.8 && TEST_USER_JWT) {
    authenticatedActivity();
  }
  // 20% - Curriculum sync (mobile-like)
  else {
    curriculumSync();
  }

  // Think time between actions (1-3 seconds)
  sleep(1 + Math.random() * 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

function browseContent() {
  group('Content', () => {
    // Get vocabulary
    const vocabRes = http.get(`${BASE_URL}${endpoints.vocabulary}?limit=20&offset=${Math.floor(Math.random() * 100)}`, {
      headers: getHeaders(),
      tags: { endpoint: 'vocabulary' },
    });
    
    check(vocabRes, {
      'vocabulary: status ok': (r) => r.status === 200,
    });
    requestsPerEndpoint.add(1, { endpoint: 'vocabulary' });

    sleep(0.5);

    // Get lessons
    const lessonsRes = http.get(`${BASE_URL}${endpoints.lessons}?limit=10`, {
      headers: getHeaders(),
      tags: { endpoint: 'lessons' },
    });
    
    check(lessonsRes, {
      'lessons: status ok': (r) => r.status === 200,
    });
    requestsPerEndpoint.add(1, { endpoint: 'lessons' });

    // Occasionally fetch stories
    if (Math.random() < 0.3) {
      const storiesRes = http.get(`${BASE_URL}${endpoints.stories}?limit=5`, {
        headers: getHeaders(),
        tags: { endpoint: 'stories' },
      });
      
      check(storiesRes, {
        'stories: status ok': (r) => r.status >= 200 && r.status < 300,
      });
      requestsPerEndpoint.add(1, { endpoint: 'stories' });
    }
  });
}

function authenticatedActivity() {
  group('Authenticated', () => {
    // Check session
    const meRes = http.get(`${BASE_URL}${endpoints.tokenMe}`, {
      headers: getAuthHeaders(),
      tags: { endpoint: 'me' },
    });
    
    const meOk = check(meRes, {
      'me: status ok': (r) => r.status === 200,
    });
    
    if (!meOk) {
      errorsByEndpoint.add(1, { endpoint: 'me' });
      return; // Skip rest if auth failed
    }
    requestsPerEndpoint.add(1, { endpoint: 'me' });

    sleep(0.3);

    // Get profile
    const profileRes = http.get(`${BASE_URL}${endpoints.userProfile}`, {
      headers: getAuthHeaders(),
      tags: { endpoint: 'profile' },
    });
    
    check(profileRes, {
      'profile: status ok': (r) => r.status >= 200 && r.status < 300,
    });
    requestsPerEndpoint.add(1, { endpoint: 'profile' });

    // Get progress
    const progressRes = http.get(`${BASE_URL}${endpoints.userProgress}`, {
      headers: getAuthHeaders(),
      tags: { endpoint: 'progress' },
    });
    
    check(progressRes, {
      'progress: status ok': (r) => r.status >= 200 && r.status < 300,
    });
    requestsPerEndpoint.add(1, { endpoint: 'progress' });
  });
}

function curriculumSync() {
  group('Health', () => {
    // Health check first
    const healthRes = http.get(`${BASE_URL}${endpoints.health}`, {
      headers: getHeaders(),
      tags: { endpoint: 'health' },
    });
    
    check(healthRes, {
      'health: status ok': (r) => r.status === 200,
    });
    requestsPerEndpoint.add(1, { endpoint: 'health' });
  });

  group('Curriculum', () => {
    // Check version
    const versionRes = http.get(`${BASE_URL}${endpoints.curriculumVersion}`, {
      headers: getHeaders(),
      tags: { endpoint: 'curriculum_version' },
    });
    
    check(versionRes, {
      'version: status ok': (r) => r.status === 200,
    });
    requestsPerEndpoint.add(1, { endpoint: 'curriculum_version' });

    sleep(0.2);

    // Occasionally fetch full derived curriculum
    if (Math.random() < 0.2) {
      const derivedRes = http.get(`${BASE_URL}${endpoints.curriculumDerived}`, {
        headers: getHeaders(),
        tags: { endpoint: 'curriculum_derived' },
      });
      
      check(derivedRes, {
        'derived: status ok': (r) => r.status === 200,
      });
      requestsPerEndpoint.add(1, { endpoint: 'curriculum_derived' });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`📊 Load Test Starting`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`👥 Max VUs: 50`);
  console.log(`⏱️  Duration: 5 minutes`);
  
  // Verify API is reachable
  const res = http.get(`${BASE_URL}${endpoints.health}`);
  if (res.status !== 200) {
    throw new Error(`API not reachable! Status: ${res.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  console.log(`✅ Load Test Complete (${duration} min)`);
}

