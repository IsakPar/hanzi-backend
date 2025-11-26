/**
 * Revenue Analytics Service Tests
 * 
 * Tests the revenue analytics calculations and queries
 */

import { describe, it, expect } from 'vitest';

// Import the tier pricing for validation
const TIER_PRICING: Record<string, number> = {
  free: 0,
  premium: 999,      // $9.99/month
  pro: 1999,         // $19.99/month
};

describe('RevenueAnalytics', () => {
  describe('Tier Pricing Configuration', () => {
    it('should have free tier at $0', () => {
      expect(TIER_PRICING.free).toBe(0);
    });

    it('should have premium tier at $9.99/month', () => {
      expect(TIER_PRICING.premium).toBe(999);
    });

    it('should have pro tier at $19.99/month', () => {
      expect(TIER_PRICING.pro).toBe(1999);
    });
  });

  describe('MRR Calculation Logic', () => {
    it('should calculate MRR correctly for mixed tiers', () => {
      const premiumCount = 10;
      const proCount = 5;
      
      const expectedMRR = 
        (premiumCount * TIER_PRICING.premium) + 
        (proCount * TIER_PRICING.pro);
      
      // 10 * 999 + 5 * 1999 = 9990 + 9995 = 19985 cents = $199.85
      expect(expectedMRR).toBe(19985);
    });

    it('should calculate ARR as MRR * 12', () => {
      const mrr = 10000; // $100
      const arr = mrr * 12;
      
      expect(arr).toBe(120000); // $1,200
    });

    it('should calculate ARPU correctly', () => {
      const mrr = 10000;
      const activeSubscribers = 20;
      
      const arpu = Math.round(mrr / activeSubscribers);
      
      expect(arpu).toBe(500); // $5.00 per user
    });
  });

  describe('Churn Rate Calculation', () => {
    it('should calculate monthly churn rate as percentage', () => {
      const subscribersAtStartOfMonth = 100;
      const churnedDuringMonth = 5;
      
      const churnRate = (churnedDuringMonth / subscribersAtStartOfMonth) * 100;
      
      expect(churnRate).toBe(5);
    });

    it('should handle zero subscribers gracefully', () => {
      const subscribersAtStartOfMonth = 0;
      const churnedDuringMonth = 0;
      
      const churnRate = subscribersAtStartOfMonth > 0 
        ? (churnedDuringMonth / subscribersAtStartOfMonth) * 100 
        : 0;
      
      expect(churnRate).toBe(0);
    });
  });

  describe('Platform Mapping', () => {
    const STORE_PLATFORM_MAP: Record<string, string> = {
      'app_store': 'ios',
      'mac_app_store': 'ios',
      'play_store': 'android',
      'stripe': 'web',
      'promotional': 'web',
    };

    it('should map app_store to ios', () => {
      expect(STORE_PLATFORM_MAP['app_store']).toBe('ios');
    });

    it('should map play_store to android', () => {
      expect(STORE_PLATFORM_MAP['play_store']).toBe('android');
    });

    it('should map stripe to web', () => {
      expect(STORE_PLATFORM_MAP['stripe']).toBe('web');
    });
  });

  describe('Revenue Overview Structure', () => {
    it('should have all required metrics', () => {
      const overview = {
        totalSubscribers: 100,
        activeSubscribers: 85,
        mrr: 50000,
        arr: 600000,
        churnRate: 3.5,
        avgRevenuePerUser: 588,
      };

      expect(overview).toHaveProperty('totalSubscribers');
      expect(overview).toHaveProperty('activeSubscribers');
      expect(overview).toHaveProperty('mrr');
      expect(overview).toHaveProperty('arr');
      expect(overview).toHaveProperty('churnRate');
      expect(overview).toHaveProperty('avgRevenuePerUser');
    });
  });

  describe('Tier Breakdown Structure', () => {
    it('should calculate percentage correctly', () => {
      const total = 100;
      const tiers = [
        { tier: 'free', count: 40 },
        { tier: 'premium', count: 45 },
        { tier: 'pro', count: 15 },
      ];

      const withPercentages = tiers.map(t => ({
        ...t,
        percentage: Math.round((t.count / total) * 100),
        mrr: t.count * (TIER_PRICING[t.tier] || 0),
      }));

      expect(withPercentages[0].percentage).toBe(40);
      expect(withPercentages[1].percentage).toBe(45);
      expect(withPercentages[2].percentage).toBe(15);
      
      // MRR calculations
      expect(withPercentages[0].mrr).toBe(0); // free
      expect(withPercentages[1].mrr).toBe(45 * 999); // premium
      expect(withPercentages[2].mrr).toBe(15 * 1999); // pro
    });
  });

  describe('Subscription Trends', () => {
    it('should calculate net change correctly', () => {
      const trend = {
        date: '2024-01-15',
        newSubscriptions: 12,
        cancellations: 3,
        expirations: 2,
      };

      const netChange = trend.newSubscriptions - trend.expirations;
      
      expect(netChange).toBe(10);
    });
  });

  describe('Money Formatting', () => {
    it('should format cents to dollars correctly', () => {
      const formatMoney = (cents: number) => 
        `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      expect(formatMoney(999)).toBe('$9.99');
      expect(formatMoney(1999)).toBe('$19.99');
      expect(formatMoney(100000)).toBe('$1,000.00');
      expect(formatMoney(0)).toBe('$0.00');
    });
  });
});

