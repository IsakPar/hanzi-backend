import type { AppBindings } from '../types/app';

/**
 * RevenueCat REST API Client
 * 
 * Provides methods to interact with RevenueCat's REST API for querying
 * and managing subscriber information server-side.
 * 
 * @see https://www.revenuecat.com/docs/api-v1
 */

interface RevenueCatSubscriber {
  request_date: string;
  request_date_ms: number;
  subscriber: {
    entitlements: Record<string, {
      expires_date: string | null;
      product_identifier: string;
      purchase_date: string;
    }>;
    first_seen: string;
    last_seen: string;
    management_url: string | null;
    non_subscriptions: Record<string, any[]>;
    original_app_user_id: string;
    original_application_version: string | null;
    original_purchase_date: string | null;
    other_purchases: Record<string, any>;
    subscriptions: Record<string, {
      billing_issues_detected_at: string | null;
      expires_date: string;
      grace_period_expires_date: string | null;
      is_sandbox: boolean;
      original_purchase_date: string;
      ownership_type: string;
      period_type: string;
      product_identifier: string;
      purchase_date: string;
      store: string;
      unsubscribe_detected_at: string | null;
    }>;
  };
}

interface RevenueCatError {
  message: string;
  code?: number;
}

export class RevenueCatClient {
  private baseUrl = 'https://api.revenuecat.com/v1';
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  /**
   * Get subscriber information by app_user_id
   * This returns the full subscriber object including entitlements and subscriptions
   */
  async getSubscriber(appUserId: string): Promise<RevenueCatSubscriber | null> {
    try {
      const response = await fetch(`${this.baseUrl}/subscribers/${appUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null; // Subscriber not found
      }

      if (!response.ok) {
        const error = await response.json() as RevenueCatError;
        throw new Error(`RevenueCat API error: ${error.message || response.statusText}`);
      }

      return await response.json() as RevenueCatSubscriber;
    } catch (err) {
      throw new Error(`Failed to fetch subscriber: ${(err as Error).message}`);
    }
  }

  /**
   * Check if a user has an active subscription
   * Returns tier based on their current entitlements
   */
  async getUserTier(appUserId: string): Promise<'free' | 'premium' | 'pro'> {
    const subscriber = await this.getSubscriber(appUserId);
    
    if (!subscriber) {
      return 'free';
    }

    // Check entitlements (these are configured in RevenueCat dashboard)
    const entitlements = subscriber.subscriber.entitlements;
    
    // Map entitlement identifiers to tiers
    // Pro = admin/internal use, Premium = $9.99/month (shown as "Master" in UI)
    if (entitlements['pro'] && this.isEntitlementActive(entitlements['pro'])) {
      return 'pro';
    }
    
    // Check for master or premium entitlement -> maps to 'premium' tier
    if ((entitlements['master'] && this.isEntitlementActive(entitlements['master'])) ||
        (entitlements['premium'] && this.isEntitlementActive(entitlements['premium']))) {
      return 'premium';
    }

    return 'free';
  }

  /**
   * Check if user has access to a specific entitlement
   */
  async hasEntitlement(appUserId: string, entitlementId: string): Promise<boolean> {
    const subscriber = await this.getSubscriber(appUserId);
    
    if (!subscriber) {
      return false;
    }

    const entitlement = subscriber.subscriber.entitlements[entitlementId];
    return entitlement ? this.isEntitlementActive(entitlement) : false;
  }

  /**
   * Get all active subscriptions for a user
   */
  async getActiveSubscriptions(appUserId: string): Promise<string[]> {
    const subscriber = await this.getSubscriber(appUserId);
    
    if (!subscriber) {
      return [];
    }

    const activeProducts: string[] = [];
    const subscriptions = subscriber.subscriber.subscriptions;

    for (const [productId, subscription] of Object.entries(subscriptions)) {
      if (this.isSubscriptionActive(subscription)) {
        activeProducts.push(productId);
      }
    }

    return activeProducts;
  }

  /**
   * Delete/anonymize a subscriber (GDPR compliance)
   */
  async deleteSubscriber(appUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/subscribers/${appUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      return response.ok;
    } catch (err) {
      throw new Error(`Failed to delete subscriber: ${(err as Error).message}`);
    }
  }

  /**
   * Grant a promotional entitlement to a user
   * Useful for giving free trials or comps
   */
  async grantPromotionalEntitlement(
    appUserId: string,
    entitlementId: string,
    durationDays: number
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscribers/${appUserId}/entitlements/${entitlementId}/promotional`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            duration: `P${durationDays}D`, // ISO 8601 duration format
          }),
        }
      );

      return response.ok;
    } catch (err) {
      throw new Error(`Failed to grant promotional entitlement: ${(err as Error).message}`);
    }
  }

  /**
   * Revoke a promotional entitlement
   */
  async revokePromotionalEntitlement(
    appUserId: string,
    entitlementId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscribers/${appUserId}/entitlements/${entitlementId}/promotional`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.ok;
    } catch (err) {
      throw new Error(`Failed to revoke promotional entitlement: ${(err as Error).message}`);
    }
  }

  // Helper methods

  private isEntitlementActive(entitlement: { expires_date: string | null }): boolean {
    if (!entitlement.expires_date) {
      return true; // Lifetime entitlement
    }

    const expiresAt = new Date(entitlement.expires_date);
    return expiresAt > new Date();
  }

  private isSubscriptionActive(subscription: {
    expires_date: string;
    billing_issues_detected_at: string | null;
    unsubscribe_detected_at: string | null;
  }): boolean {
    const expiresAt = new Date(subscription.expires_date);
    const now = new Date();

    // Check if expired
    if (expiresAt <= now) {
      return false;
    }

    // Check if there are billing issues
    if (subscription.billing_issues_detected_at) {
      return false;
    }

    return true;
  }
}

/**
 * Factory function to create RevenueCat client from bindings
 */
export function createRevenueCatClient(bindings: AppBindings): RevenueCatClient | null {
  const secretKey = bindings.REVENUECAT_SECRET_API_KEY;
  
  if (!secretKey) {
    return null;
  }

  return new RevenueCatClient(secretKey);
}

