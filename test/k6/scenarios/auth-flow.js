// ══════════════════════════════════════════════════════════════════════════════
// Auth Flow Scenario - Complete authentication lifecycle
// ══════════════════════════════════════════════════════════════════════════════
//
// Simulates: Login → Use token → Refresh → Continue → Logout
//
// Run: k6 run test/k6/scenarios/auth-flow.js
//
// Required env:
//   - API_URL
//   - TEST_USER_EMAIL
//   - TEST_USER_PASSWORD
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, getHeaders, endpoints, defaultThresholds } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD;

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    ...defaultThresholds,
    'login_duration': ['p(95)<1000'],
    'refresh_duration': ['p(95)<500'],
  },
  tags: {
    test_type: 'scenario',
    scenario: 'auth-flow',
  },
};

// Custom metrics
const loginDuration = new Trend('login_duration');
const refreshDuration = new Trend('refresh_duration');
const authErrors = new Rate('auth_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  let accessToken = null;
  let refreshToken = null;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Login
  // ───────────────────────────────────────────────────────────────────────────
  group('Login', () => {
    const loginRes = http.post(
      `${BASE_URL}${endpoints.tokenLogin}`,
      JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      }),
      { headers: getHeaders() }
    );

    loginDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
      'login: status 200': (r) => r.status === 200,
      'login: has accessToken': (r) => {
        try {
          const body = JSON.parse(r.body);
          accessToken = body.accessToken;
          refreshToken = body.refreshToken;
          return !!accessToken;
        } catch {
          return false;
        }
      },
    });

    if (!loginOk) {
      authErrors.add(1);
      console.error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
      return; // Skip rest of scenario
    }
  });

  if (!accessToken) return;

  sleep(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Make authenticated requests
  // ───────────────────────────────────────────────────────────────────────────
  group('Authenticated Requests', () => {
    // Get current user
    const meRes = http.get(`${BASE_URL}${endpoints.tokenMe}`, {
      headers: {
        ...getHeaders(),
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    check(meRes, {
      'me: status 200': (r) => r.status === 200,
      'me: has user': (r) => {
        try {
          return JSON.parse(r.body).user !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Get profile
    const profileRes = http.get(`${BASE_URL}${endpoints.userProfile}`, {
      headers: {
        ...getHeaders(),
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    check(profileRes, {
      'profile: status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(2);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Refresh token
  // ───────────────────────────────────────────────────────────────────────────
  if (refreshToken) {
    group('Token Refresh', () => {
      const refreshRes = http.post(
        `${BASE_URL}${endpoints.tokenRefresh}`,
        JSON.stringify({ refreshToken }),
        { headers: getHeaders() }
      );

      refreshDuration.add(refreshRes.timings.duration);

      const refreshOk = check(refreshRes, {
        'refresh: status 200': (r) => r.status === 200,
        'refresh: has new accessToken': (r) => {
          try {
            const body = JSON.parse(r.body);
            if (body.accessToken) {
              accessToken = body.accessToken;
              if (body.refreshToken) {
                refreshToken = body.refreshToken; // Rotation
              }
              return true;
            }
            return false;
          } catch {
            return false;
          }
        },
      });

      if (!refreshOk) {
        authErrors.add(1);
      }
    });
  }

  sleep(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: More requests with new token
  // ───────────────────────────────────────────────────────────────────────────
  group('Post-Refresh Requests', () => {
    const meRes = http.get(`${BASE_URL}${endpoints.tokenMe}`, {
      headers: {
        ...getHeaders(),
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    check(meRes, {
      'post-refresh me: status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Logout
  // ───────────────────────────────────────────────────────────────────────────
  if (refreshToken) {
    group('Logout', () => {
      const logoutRes = http.post(
        `${BASE_URL}${endpoints.tokenLogout}`,
        JSON.stringify({ refreshToken }),
        {
          headers: {
            ...getHeaders(),
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      check(logoutRes, {
        'logout: status 200': (r) => r.status === 200,
      });
    });
  }

  sleep(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    console.warn('⚠️  TEST_USER_EMAIL and TEST_USER_PASSWORD not set');
    console.warn('   Auth flow will fail. Set these env vars to test login.');
  }
  
  console.log(`🔐 Auth Flow Test`);
  console.log(`📍 Target: ${BASE_URL}`);
  
  return {};
}

