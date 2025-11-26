import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { HTTPException } from 'hono/http-exception';
import type { D1Database } from '@cloudflare/workers-types';
import type { AppEnv } from '../types/app';
import { waitlist } from '../schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional().default('website'),
});

const app = new Hono<AppEnv>();

// Simple IP-based rate limiter for waitlist signups
// Allows 3 signups per IP per day (prevents spam)
async function checkRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count 
       FROM waitlist 
       WHERE source = ? 
       AND date(created_at, 'unixepoch') = ?`
    )
    .bind(`ip:${ip}`, today)
    .first<{ count: number }>();
  
  return (result?.count ?? 0) < 3;
}

app.post('/', zValidator('json', waitlistSchema), async (c) => {
  const { email, source } = c.req.valid('json');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
  
  // Rate limit check
  const allowed = await checkRateLimit(c.env.DB, ip);
  if (!allowed) {
    throw new HTTPException(429, { 
      message: 'Too many signups from this IP. Please try again tomorrow.' 
    });
  }
  
  const db = drizzle(c.env.DB);
  
  try {
    // Check if email already exists
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .get();
    
    if (existing) {
      // Return success even if duplicate (don't reveal that email exists)
      return c.json({ 
        success: true, 
        message: 'You\'re on the list! We\'ll notify you when we launch.' 
      });
    }
    
    // Insert new waitlist entry
    await db.insert(waitlist).values({
      id: nanoid(),
      email,
      source: `${source}:${ip}`,
    });
    
    return c.json({ 
      success: true, 
      message: 'You\'re on the list! We\'ll notify you when we launch.' 
    }, 201);
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      // Race condition: duplicate inserted between check and insert
      return c.json({ 
        success: true, 
        message: 'You\'re on the list! We\'ll notify you when we launch.' 
      });
    }
    throw error;
  }
});

export default app;

