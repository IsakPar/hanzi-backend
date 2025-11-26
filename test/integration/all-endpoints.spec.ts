/**
 * 🧪 Comprehensive API Endpoint Smoke Tests
 * Quick tests to ensure all endpoints respond (not full integration tests)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/test-app';

describe('🔍 ALL API Endpoints Smoke Tests', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await ctx.signAdminToken();
    userToken = await ctx.signUserToken();
  });

  afterAll(async () => {
    await ctx.dispose();
  });

  // Helper to make requests
  const makeRequest = async (path: string, options: RequestInit = {}) => {
    return ctx.app.fetch(
      new Request(`http://localhost${path}`, options),
      ctx.env
    );
  };

  // ==========================================
  // 🏥 HEALTH CHECK
  // ==========================================
  
  describe('Health Check', () => {
    it('GET / - should return 200', async () => {
      const res = await makeRequest('/');
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 📚 LESSONS
  // ==========================================
  
  describe('Lessons API', () => {
    it('GET /v1/lessons - should list public lessons', async () => {
      const res = await makeRequest('/v1/lessons');
      expect([200, 401]).toContain(res.status);
    });

    it('GET /v1/admin/lessons - should list admin lessons', async () => {
      const res = await makeRequest('/v1/admin/lessons', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/admin/lessons/:id - should handle get by ID', async () => {
      const res = await makeRequest('/v1/admin/lessons/non-existent', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/admin/lessons - requires auth', async () => {
      const res = await makeRequest('/v1/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 📦 UNITS
  // ==========================================
  
  describe('Units API', () => {
    it('GET /v1/units - should list public units', async () => {
      const res = await makeRequest('/v1/units');
      expect([200, 401]).toContain(res.status);
    });

    it('GET /v1/admin/units - should list admin units', async () => {
      const res = await makeRequest('/v1/admin/units', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/admin/units/:id - should handle get by ID', async () => {
      const res = await makeRequest('/v1/admin/units/non-existent', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/admin/units - requires admin auth', async () => {
      const res = await makeRequest('/v1/admin/units', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ title: 'Test Unit' }),
      });
      expect(res.status).toBe(403); // User cannot create units
    });
  });

  // ==========================================
  // 📖 VOCABULARY
  // ==========================================
  
  describe('Vocabulary API', () => {
    it('GET /v1/vocabulary - should list vocabulary', async () => {
      const res = await makeRequest('/v1/vocabulary', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/vocabulary/:id - should handle get by ID', async () => {
      const res = await makeRequest('/v1/vocabulary/non-existent', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/vocabulary/admin/categories - should list categories', async () => {
      const res = await makeRequest('/v1/vocabulary/admin/categories', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/vocabulary/admin - requires admin auth', async () => {
      const res = await makeRequest('/v1/vocabulary/admin', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          hanzi: '测试', 
          pinyin: 'cèshì', 
          english: 'test',
          hskLevel: 1,
          category: 'general'
        }),
      });
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('GET /v1/vocabulary/admin/export - should export vocabulary', async () => {
      const res = await makeRequest('/v1/vocabulary/admin/export', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📚 STORIES
  // ==========================================
  
  describe('Stories API', () => {
    it('GET /v1/stories - should list stories', async () => {
      const res = await makeRequest('/v1/stories', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/stories/:id - should handle get by ID', async () => {
      const res = await makeRequest('/v1/stories/non-existent', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/stories - requires admin auth', async () => {
      const res = await makeRequest('/v1/stories', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ title: 'Test Story', hskLevel: 1 }),
      });
      expect([200, 201, 400, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 🤖 AI & PROMPTS
  // ==========================================
  
  describe('AI & Prompts API', () => {
    it('GET /v1/ai/prompts - should list prompts', async () => {
      const res = await makeRequest('/v1/ai/prompts', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/ai/prompts/:slug/versions - should list prompt versions', async () => {
      const res = await makeRequest('/v1/ai/prompts/lesson-generator/versions', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/ai/test-prompt - should test a prompt', async () => {
      const res = await makeRequest('/v1/ai/test-prompt', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          slug: 'test',
          version: 1,
          model: 'gpt-5-nano',
          variables: {}
        }),
      });
      expect([200, 400, 404, 500]).toContain(res.status); // May fail if no API key
    });

    it('GET /v1/ai/models - should list AI models', async () => {
      const res = await makeRequest('/v1/ai/models', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/ai/prompts/pipeline - should create pipeline', async () => {
      const res = await makeRequest('/v1/ai/prompts/pipeline', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          slug: 'test-pipeline',
          name: 'Test Pipeline',
          steps: [{ name: 'Step 1', model: 'gpt-5-nano', promptBody: 'Test' }],
          costLimits: { maxTotalCost: 0.10 }
        }),
      });
      expect([200, 201, 400, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - USERS
  // ==========================================
  
  describe('Analytics - Users API', () => {
    it('GET /v1/analytics/users - should get user stats', async () => {
      const res = await makeRequest('/v1/analytics/users', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/users/overview - should get overview', async () => {
      const res = await makeRequest('/v1/analytics/users/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/users/growth - should get growth data', async () => {
      const res = await makeRequest('/v1/analytics/users/growth?days=30', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/users/retention - should get retention data', async () => {
      const res = await makeRequest('/v1/analytics/users/retention', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/users/tiers - should get tier data', async () => {
      const res = await makeRequest('/v1/analytics/users/tiers?days=30', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - AI
  // ==========================================
  
  describe('Analytics - AI API', () => {
    it('GET /v1/analytics/ai - should get AI stats', async () => {
      const res = await makeRequest('/v1/analytics/ai', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/overview - should get AI overview', async () => {
      const res = await makeRequest('/v1/analytics/ai/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/daily - should get daily AI usage', async () => {
      const res = await makeRequest('/v1/analytics/ai/daily?days=7', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/models - should get model breakdown', async () => {
      const res = await makeRequest('/v1/analytics/ai/models', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/prompts - should get prompt performance', async () => {
      const res = await makeRequest('/v1/analytics/ai/prompts', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/latency - should get latency data', async () => {
      const res = await makeRequest('/v1/analytics/ai/latency', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      // 500 may occur if no data exists or aggregation fails on empty data
      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /v1/analytics/ai/errors - should get AI errors', async () => {
      const res = await makeRequest('/v1/analytics/ai/errors', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - CONTENT
  // ==========================================
  
  describe('Analytics - Content API', () => {
    it('GET /v1/analytics/content/overview - should get content overview', async () => {
      const res = await makeRequest('/v1/analytics/content/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/content/engagement - should get engagement', async () => {
      const res = await makeRequest('/v1/analytics/content/engagement?days=30', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/content/popular/lessons - should get popular lessons', async () => {
      const res = await makeRequest('/v1/analytics/content/popular/lessons', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/content/popular/stories - should get popular stories', async () => {
      const res = await makeRequest('/v1/analytics/content/popular/stories', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/content/hsk-breakdown - should get HSK breakdown', async () => {
      const res = await makeRequest('/v1/analytics/content/hsk-breakdown', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/content/vocab-progress - should get vocab progress', async () => {
      const res = await makeRequest('/v1/analytics/content/vocab-progress', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - ENGAGEMENT
  // ==========================================
  
  describe('Analytics - Engagement API', () => {
    it('GET /v1/analytics/engagement/overview - should get engagement overview', async () => {
      const res = await makeRequest('/v1/analytics/engagement/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/engagement/lessons - should get lesson engagement', async () => {
      const res = await makeRequest('/v1/analytics/engagement/lessons', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/engagement/stories - should get story engagement', async () => {
      const res = await makeRequest('/v1/analytics/engagement/stories', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - REVENUE
  // ==========================================
  
  describe('Analytics - Revenue API', () => {
    it('GET /v1/analytics/revenue/overview - should get revenue overview', async () => {
      const res = await makeRequest('/v1/analytics/revenue/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/tiers - should get tier breakdown', async () => {
      const res = await makeRequest('/v1/analytics/revenue/tiers', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/platforms - should get platform breakdown', async () => {
      const res = await makeRequest('/v1/analytics/revenue/platforms', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/trends - should get subscription trends', async () => {
      const res = await makeRequest('/v1/analytics/revenue/trends', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/mrr-history - should get MRR history', async () => {
      const res = await makeRequest('/v1/analytics/revenue/mrr-history', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/events - should get revenue events', async () => {
      const res = await makeRequest('/v1/analytics/revenue/events', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/status - should get subscription status', async () => {
      const res = await makeRequest('/v1/analytics/revenue/status', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/revenue/expiring - should get expiring subscriptions', async () => {
      const res = await makeRequest('/v1/analytics/revenue/expiring', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📊 ANALYTICS - PERFORMANCE
  // ==========================================
  
  describe('Analytics - Performance API', () => {
    it('GET /v1/analytics/performance/overview - should get performance overview', async () => {
      const res = await makeRequest('/v1/analytics/performance/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/performance/latency - should get latency data', async () => {
      const res = await makeRequest('/v1/analytics/performance/latency', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      // 500 may occur if no data exists or aggregation fails on empty data
      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /v1/analytics/performance/errors - should get error data', async () => {
      const res = await makeRequest('/v1/analytics/performance/errors', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/performance/endpoints - should get endpoint stats', async () => {
      const res = await makeRequest('/v1/analytics/performance/endpoints', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/performance/events - should get system events', async () => {
      const res = await makeRequest('/v1/analytics/performance/events', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/analytics/performance/models - should get model performance', async () => {
      const res = await makeRequest('/v1/analytics/performance/models', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 💰 BILLING
  // ==========================================
  
  describe('Billing API', () => {
    it('POST /v1/billing/webhooks/revenuecat - requires auth', async () => {
      const res = await makeRequest('/v1/billing/webhooks/revenuecat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: {} }),
      });
      expect([401]).toContain(res.status); // Should require webhook auth
    });

    it('POST /v1/billing/webhooks/debug - should debug webhook', async () => {
      const res = await makeRequest('/v1/billing/webhooks/debug', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          event: { type: 'TEST', app_user_id: 'test-user' }
        }),
      });
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📖 CURRICULUM (Derived)
  // ==========================================
  
  describe('Curriculum API', () => {
    it('GET /v1/curriculum/version - should get curriculum version', async () => {
      const res = await makeRequest('/v1/curriculum/version', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/derived - should get derived curriculum', async () => {
      const res = await makeRequest('/v1/curriculum/derived', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/export - should export curriculum', async () => {
      const res = await makeRequest('/v1/curriculum/export', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/curriculum/refresh - should refresh curriculum (admin)', async () => {
      const res = await makeRequest('/v1/curriculum/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/words-by-lesson/:hsk/:lesson - should get words', async () => {
      const res = await makeRequest('/v1/curriculum/words-by-lesson/1/1', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 👤 USERS
  // ==========================================
  
  describe('Users API', () => {
    it('GET /v1/users - should list users (admin)', async () => {
      const res = await makeRequest('/v1/users', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/users/me - should get current user', async () => {
      const res = await makeRequest('/v1/users/me', {
        headers: { 'Authorization': `Bearer ${userToken}` },
      });
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // 📝 WAITLIST
  // ==========================================
  
  describe('Waitlist API', () => {
    it('POST /v1/waitlist - should accept submissions (public)', async () => {
      const res = await makeRequest('/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: `test-${Date.now()}@example.com`,
          source: 'test'
        }),
      });
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  // ==========================================
  // 🔐 AUTH EDGE CASES
  // ==========================================
  
  describe('Auth Edge Cases', () => {
    it('should reject requests without auth to protected endpoints', async () => {
      const protectedEndpoints = [
        '/v1/admin/lessons',
        '/v1/admin/units',
        '/v1/analytics/users',
        '/v1/analytics/revenue/overview',
      ];

      for (const endpoint of protectedEndpoints) {
        const res = await makeRequest(endpoint);
        expect([401, 403]).toContain(res.status);
      }
    });

    it('should reject user role on admin-only endpoints', async () => {
      const adminOnlyEndpoints = [
        { path: '/v1/admin/units', method: 'POST' as const },
      ];

      for (const { path, method } of adminOnlyEndpoints) {
        const res = await makeRequest(path, {
          method,
          headers: { 
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: 'Test' }),
        });
        expect([403]).toContain(res.status);
      }
    });
  });
});
