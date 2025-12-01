// ══════════════════════════════════════════════════════════════════════════════
// k6 Shared Configuration
// ══════════════════════════════════════════════════════════════════════════════
//
// All k6 tests should import from this file for consistency.
//
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Environment Validation
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = __ENV.API_URL;

if (!API_URL) {
  throw new Error(
    'API_URL environment variable is required!\n' +
    'Set it before running: export API_URL="https://staging-api.example.com"\n' +
    'This prevents accidentally targeting production.'
  );
}

// Warn if it looks like production
if (API_URL.includes('api.studio.polymasterlabs.com') && !API_URL.includes('staging')) {
  console.warn('⚠️  WARNING: API_URL looks like production! Are you sure?');
}

export const BASE_URL = API_URL;
export const TEST_USER_JWT = __ENV.TEST_USER_JWT || '';

// ─────────────────────────────────────────────────────────────────────────────
// Default Thresholds
// ─────────────────────────────────────────────────────────────────────────────

export const defaultThresholds = {
  // Response time
  http_req_duration: [
    'p(95)<500',   // 95% of requests under 500ms
    'p(99)<1000',  // 99% of requests under 1s
  ],
  // Error rate
  http_req_failed: ['rate<0.01'], // Less than 1% errors
  // Waiting time (TTFB)
  http_req_waiting: ['p(95)<400'],
};

// Stricter thresholds for smoke tests
export const smokeThresholds = {
  http_req_duration: ['p(95)<300', 'p(99)<500'],
  http_req_failed: ['rate<0.001'], // Less than 0.1% errors
  http_req_waiting: ['p(95)<250'],
};

// Relaxed thresholds for stress tests
export const stressThresholds = {
  http_req_duration: ['p(95)<2000', 'p(99)<5000'],
  http_req_failed: ['rate<0.05'], // Up to 5% errors under extreme load
  http_req_waiting: ['p(95)<1500'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Request Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getHeaders(authenticated = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (authenticated && TEST_USER_JWT) {
    headers['Authorization'] = `Bearer ${TEST_USER_JWT}`;
  }

  return headers;
}

export function getAuthHeaders() {
  if (!TEST_USER_JWT) {
    throw new Error('TEST_USER_JWT is required for authenticated requests');
  }
  return getHeaders(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Common Checks
// ─────────────────────────────────────────────────────────────────────────────

export function checkStatus(response, expectedStatus = 200) {
  return {
    [`status is ${expectedStatus}`]: response.status === expectedStatus,
  };
}

export function checkOk(response) {
  return {
    'status is 2xx': response.status >= 200 && response.status < 300,
  };
}

export function checkJson(response) {
  return {
    'response is JSON': response.headers['Content-Type']?.includes('application/json'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints (for reference)
// ─────────────────────────────────────────────────────────────────────────────

export const endpoints = {
  // Health & Public
  health: '/health',
  curriculumVersion: '/v1/curriculum/version',
  curriculumDerived: '/v1/curriculum/derived',
  
  // Auth
  tokenLogin: '/v1/auth/token/login',
  tokenRefresh: '/v1/auth/token/refresh',
  tokenLogout: '/v1/auth/token/logout',
  tokenMe: '/v1/auth/token/me',
  
  // User
  userProfile: '/v1/users/profile',
  userProgress: '/v1/users/progress',
  
  // Content
  vocabulary: '/v1/vocabulary',
  lessons: '/v1/lessons',
  stories: '/v1/stories',
  
  // Sync (mobile)
  syncEvents: '/v1/users/sync/events',
  syncState: '/v1/users/sync/state',
};

