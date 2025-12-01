// ══════════════════════════════════════════════════════════════════════════════
// Curriculum Sync Scenario - Mobile app curriculum download
// ══════════════════════════════════════════════════════════════════════════════
//
// Simulates: Check version → Download if needed → Verify integrity
//
// This is what the mobile app does on startup.
//
// Run: k6 run test/k6/scenarios/curriculum-sync.js
//
// ══════════════════════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, getHeaders, endpoints, defaultThresholds } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    ...defaultThresholds,
    'version_check_duration': ['p(95)<200'],
    'full_download_duration': ['p(95)<5000'], // Large payload
  },
  tags: {
    test_type: 'scenario',
    scenario: 'curriculum-sync',
  },
};

// Custom metrics
const versionCheckDuration = new Trend('version_check_duration');
const fullDownloadDuration = new Trend('full_download_duration');
const downloadSize = new Trend('download_size_bytes');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// Simulated local version (randomize to test both paths)
let simulatedLocalVersion = null;

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  let serverVersion = null;
  let needsDownload = false;

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Check curriculum version
  // ───────────────────────────────────────────────────────────────────────────
  group('Version Check', () => {
    const versionRes = http.get(`${BASE_URL}${endpoints.curriculumVersion}`, {
      headers: getHeaders(),
    });

    versionCheckDuration.add(versionRes.timings.duration);

    const versionOk = check(versionRes, {
      'version: status 200': (r) => r.status === 200,
      'version: has version field': (r) => {
        try {
          const body = JSON.parse(r.body);
          serverVersion = body.version;
          return serverVersion !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!versionOk) {
      console.error(`Version check failed: ${versionRes.status}`);
      return;
    }

    // Decide if we need to download
    // Simulate: 30% of clients have outdated version
    if (simulatedLocalVersion === null || Math.random() < 0.3) {
      needsDownload = true;
      cacheMisses.add(1);
    } else {
      cacheHits.add(1);
    }
  });

  sleep(0.5);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Download full curriculum (if needed)
  // ───────────────────────────────────────────────────────────────────────────
  if (needsDownload) {
    group('Full Download', () => {
      const derivedRes = http.get(`${BASE_URL}${endpoints.curriculumDerived}`, {
        headers: getHeaders(),
        timeout: '30s', // Large payload
      });

      fullDownloadDuration.add(derivedRes.timings.duration);

      const downloadOk = check(derivedRes, {
        'download: status 200': (r) => r.status === 200,
        'download: has data': (r) => r.body && r.body.length > 0,
      });

      if (downloadOk) {
        downloadSize.add(derivedRes.body.length);
        simulatedLocalVersion = serverVersion; // Update local version
        
        // Verify JSON is valid
        try {
          const data = JSON.parse(derivedRes.body);
          check(derivedRes, {
            'download: valid JSON': () => true,
            'download: has vocabulary': () => data.vocabulary !== undefined || data.words !== undefined,
          });
        } catch (e) {
          check(derivedRes, {
            'download: valid JSON': () => false,
          });
        }
      }
    });
  } else {
    // Cache hit - just verify we can still reach API
    group('Cache Hit', () => {
      const healthRes = http.get(`${BASE_URL}${endpoints.health}`, {
        headers: getHeaders(),
      });

      check(healthRes, {
        'health: ok during cache hit': (r) => r.status === 200,
      });
    });
  }

  sleep(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Fetch specific HSK level (common operation)
  // ───────────────────────────────────────────────────────────────────────────
  group('HSK Level Fetch', () => {
    const hskLevel = Math.floor(Math.random() * 6) + 1; // HSK 1-6
    
    const hskRes = http.get(
      `${BASE_URL}/v1/curriculum/hsk/${hskLevel}/download`,
      { headers: getHeaders() }
    );

    check(hskRes, {
      'hsk download: status ok': (r) => r.status === 200 || r.status === 404,
    });

    if (hskRes.status === 200) {
      downloadSize.add(hskRes.body.length);
    }
  });

  // Think time - mobile app might do other things
  sleep(2 + Math.random() * 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`📚 Curriculum Sync Scenario`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`📱 Simulating: Mobile app startup curriculum sync`);
  
  // Verify endpoint exists
  const res = http.get(`${BASE_URL}${endpoints.curriculumVersion}`);
  if (res.status !== 200) {
    console.error(`⚠️  Curriculum version endpoint not available: ${res.status}`);
  }
  
  return {};
}

export function teardown() {
  console.log(`\n📊 Results:`);
  console.log(`   - cache_hits: Check metric for cache efficiency`);
  console.log(`   - cache_misses: Times full download was needed`);
  console.log(`   - download_size_bytes: Track payload sizes`);
}

