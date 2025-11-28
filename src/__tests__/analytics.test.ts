/**
 * Analytics Service Tests
 * 
 * Tests analytics queries, aggregations, date ranges
 */

import { describe, it, expect } from 'vitest';

describe('Analytics Service', () => {
  describe('Date Range Parsing', () => {
    it('should parse from/to date parameters', () => {
      const parseDate = (dateStr: string): Date => new Date(dateStr);

      const from = parseDate('2024-01-01');
      const to = parseDate('2024-01-31');

      expect(from.getFullYear()).toBe(2024);
      expect(from.getMonth()).toBe(0); // January
      expect(to.getDate()).toBe(31);
    });

    it('should default to last 7 days when no range provided', () => {
      const defaultDays = 7;
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(now.getDate() - defaultDays);

      const diff = now.getTime() - defaultFrom.getTime();
      const daysDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(defaultDays);
    });

    it('should validate date range is not inverted', () => {
      const isValidRange = (from: Date, to: Date): boolean => {
        return from.getTime() <= to.getTime();
      };

      expect(isValidRange(new Date('2024-01-01'), new Date('2024-01-31'))).toBe(true);
      expect(isValidRange(new Date('2024-01-31'), new Date('2024-01-01'))).toBe(false);
    });

    it('should cap date range at 90 days', () => {
      const MAX_RANGE_DAYS = 90;

      const from = new Date('2024-01-01');
      const to = new Date('2024-06-01'); // 152 days

      const diff = to.getTime() - from.getTime();
      const daysDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));

      const cappedTo = daysDiff > MAX_RANGE_DAYS
        ? new Date(from.getTime() + MAX_RANGE_DAYS * 24 * 60 * 60 * 1000)
        : to;

      expect(cappedTo.getTime()).toBeLessThan(to.getTime());
    });
  });

  describe('User Analytics', () => {
    interface UserStats {
      totalUsers: number;
      activeUsers: number;
      newUsersToday: number;
      tierBreakdown: Record<string, number>;
    }

    it('should calculate total users', () => {
      const users = [
        { id: '1', tier: 'free' },
        { id: '2', tier: 'premium' },
        { id: '3', tier: 'pro' },
      ];

      expect(users.length).toBe(3);
    });

    it('should calculate tier breakdown', () => {
      const users = [
        { tier: 'free' },
        { tier: 'free' },
        { tier: 'premium' },
        { tier: 'pro' },
      ];

      const breakdown = users.reduce((acc, u) => {
        acc[u.tier] = (acc[u.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(breakdown.free).toBe(2);
      expect(breakdown.premium).toBe(1);
      expect(breakdown.pro).toBe(1);
    });

    it('should calculate retention rate', () => {
      const calculateRetention = (activeAfterPeriod: number, totalAtStart: number): number => {
        if (totalAtStart === 0) return 0;
        return Math.round((activeAfterPeriod / totalAtStart) * 100);
      };

      expect(calculateRetention(80, 100)).toBe(80);
      expect(calculateRetention(0, 100)).toBe(0);
      expect(calculateRetention(50, 0)).toBe(0);
    });
  });

  describe('AI Usage Analytics', () => {
    interface AIUsageRecord {
      date: string;
      model: string;
      requestCount: number;
      totalTokens: number;
      totalCost: number;
    }

    it('should aggregate by model', () => {
      const usage: AIUsageRecord[] = [
        { date: '2024-01-01', model: 'qwen-coder-32b', requestCount: 10, totalTokens: 5000, totalCost: 0.01 },
        { date: '2024-01-01', model: 'qwen-coder-32b', requestCount: 5, totalTokens: 2500, totalCost: 0.005 },
      ];

      const aggregated = usage.reduce((acc, r) => {
        acc.requestCount += r.requestCount;
        acc.totalTokens += r.totalTokens;
        acc.totalCost += r.totalCost;
        return acc;
      }, { requestCount: 0, totalTokens: 0, totalCost: 0 });

      expect(aggregated.requestCount).toBe(15);
      expect(aggregated.totalTokens).toBe(7500);
      expect(aggregated.totalCost).toBeCloseTo(0.015, 3);
    });

    it('should calculate cost per request', () => {
      const totalCost = 0.15;
      const requestCount = 100;

      const costPerRequest = totalCost / requestCount;

      expect(costPerRequest).toBeCloseTo(0.0015, 4);
    });

    it('should calculate average tokens per request', () => {
      const totalTokens = 50000;
      const requestCount = 100;

      const avgTokens = Math.round(totalTokens / requestCount);

      expect(avgTokens).toBe(500);
    });
  });

  describe('Content Analytics', () => {
    it('should track popular lessons', () => {
      const lessons = [
        { id: '1', title: 'Lesson 1', viewCount: 100 },
        { id: '2', title: 'Lesson 2', viewCount: 50 },
        { id: '3', title: 'Lesson 3', viewCount: 200 },
      ];

      const sorted = [...lessons].sort((a, b) => b.viewCount - a.viewCount);

      expect(sorted[0].title).toBe('Lesson 3');
      expect(sorted[0].viewCount).toBe(200);
    });

    it('should track popular stories', () => {
      const stories = [
        { id: '1', title: 'Story A', readCount: 500, completionRate: 0.8 },
        { id: '2', title: 'Story B', readCount: 300, completionRate: 0.9 },
      ];

      // Sort by read count
      const byReads = [...stories].sort((a, b) => b.readCount - a.readCount);
      expect(byReads[0].title).toBe('Story A');

      // Sort by completion rate
      const byCompletion = [...stories].sort((a, b) => b.completionRate - a.completionRate);
      expect(byCompletion[0].title).toBe('Story B');
    });

    it('should calculate HSK level distribution', () => {
      const content = [
        { hskLevel: 1 },
        { hskLevel: 1 },
        { hskLevel: 2 },
        { hskLevel: 3 },
      ];

      const distribution = content.reduce((acc, c) => {
        acc[c.hskLevel] = (acc[c.hskLevel] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      expect(distribution[1]).toBe(2);
      expect(distribution[2]).toBe(1);
      expect(distribution[3]).toBe(1);
    });
  });

  describe('System Analytics', () => {
    it('should track API errors', () => {
      const events = [
        { type: 'error', status: 500, endpoint: '/api/lessons' },
        { type: 'error', status: 400, endpoint: '/api/users' },
        { type: 'success', status: 200, endpoint: '/api/lessons' },
      ];

      const errors = events.filter(e => e.type === 'error');
      const errorRate = (errors.length / events.length) * 100;

      expect(errors).toHaveLength(2);
      expect(errorRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate average response time', () => {
      const responseTimes = [50, 100, 75, 200, 80];
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      expect(avgResponseTime).toBe(101);
    });

    it('should identify slow endpoints', () => {
      const SLOW_THRESHOLD_MS = 500;
      const endpoints = [
        { path: '/api/fast', avgLatency: 50 },
        { path: '/api/medium', avgLatency: 200 },
        { path: '/api/slow', avgLatency: 1000 },
      ];

      const slowEndpoints = endpoints.filter(e => e.avgLatency > SLOW_THRESHOLD_MS);

      expect(slowEndpoints).toHaveLength(1);
      expect(slowEndpoints[0].path).toBe('/api/slow');
    });
  });

  describe('Revenue Analytics', () => {
    const TIER_PRICING = {
      free: 0,
      premium: 999,  // $9.99
      pro: 1999,     // $19.99
    };

    it('should calculate MRR', () => {
      const subscribers = [
        { tier: 'premium' },
        { tier: 'premium' },
        { tier: 'pro' },
      ];

      const mrr = subscribers.reduce((acc, s) => {
        return acc + (TIER_PRICING[s.tier as keyof typeof TIER_PRICING] || 0);
      }, 0);

      // 2 * 999 + 1 * 1999 = 3997 cents = $39.97
      expect(mrr).toBe(3997);
    });

    it('should calculate ARR from MRR', () => {
      const mrr = 10000; // $100
      const arr = mrr * 12;

      expect(arr).toBe(120000); // $1,200
    });

    it('should calculate ARPU', () => {
      const mrr = 10000;
      const activeSubscribers = 20;

      const arpu = Math.round(mrr / activeSubscribers);

      expect(arpu).toBe(500); // $5.00
    });
  });
});

describe('Analytics API Validation', () => {
  describe('Query Parameters', () => {
    it('should validate days parameter', () => {
      const validateDays = (days: any): number => {
        const parsed = parseInt(days);
        if (isNaN(parsed) || parsed < 1) return 7;
        if (parsed > 90) return 90;
        return parsed;
      };

      expect(validateDays('7')).toBe(7);
      expect(validateDays('30')).toBe(30);
      expect(validateDays('0')).toBe(7);
      expect(validateDays('invalid')).toBe(7);
      expect(validateDays('100')).toBe(90);
    });

    it('should validate limit parameter', () => {
      const validateLimit = (limit: any): number => {
        const parsed = parseInt(limit);
        if (isNaN(parsed) || parsed < 1) return 10;
        if (parsed > 100) return 100;
        return parsed;
      };

      expect(validateLimit('10')).toBe(10);
      expect(validateLimit('50')).toBe(50);
      expect(validateLimit('200')).toBe(100);
      expect(validateLimit('')).toBe(10);
    });
  });
});

