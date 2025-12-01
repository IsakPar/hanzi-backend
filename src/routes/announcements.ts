/**
 * Announcements Routes
 * 
 * SDUI announcements for mobile app launch messages.
 * Includes templates, image upload, and public endpoints.
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, gte, lte, desc, asc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { announcements, announcementDismissals, announcementTemplates } from '../schema';
import { publicRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting (public endpoints)
app.use('/*', publicRateLimit);

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AnnouncementSchema {
  type: 'modal' | 'banner' | 'fullscreen' | 'bottom_sheet';
  style: {
    backgroundColor?: string;
    backgroundGradient?: string;
    backgroundImageUrl?: string;
    textColor?: string;
    borderRadius?: number;
  };
  content: {
    imageUrl?: string;
    iconEmoji?: string;
    title: string;
    subtitle?: string;
    body?: string;
  };
  primaryCta?: {
    text: string;
    action: 'dismiss' | 'open_url' | 'open_store' | 'navigate';
    url?: string;
    route?: string;
  };
  secondaryCta?: {
    text: string;
    action: 'dismiss';
  };
  dismissible: boolean;
  showOnce: boolean;
}

// Templates are now stored in the database (announcement_templates table)
// Use GET /admin/templates to fetch them

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (for mobile app)
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/announcements/active
 * Get active announcements for a user/device
 */
app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.req.query('user_id');
  const deviceId = c.req.query('device_id');
  const appVersion = c.req.query('app_version');
  const userTier = c.req.query('tier') || 'free';
  const isTestDevice = c.req.query('is_test_device') === 'true';

  const now = Math.floor(Date.now() / 1000);

  try {
    // Get all active announcements
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.priority));

    // Filter by targeting and schedule
    const eligible = allAnnouncements.filter((ann) => {
      // Check schedule
      if (ann.startsAt && new Date(ann.startsAt).getTime() / 1000 > now) return false;
      if (ann.endsAt && new Date(ann.endsAt).getTime() / 1000 < now) return false;

      // Check app version
      if (ann.minAppVersion && appVersion && appVersion < ann.minAppVersion) return false;
      if (ann.maxAppVersion && appVersion && appVersion > ann.maxAppVersion) return false;

      // Check audience
      const audience = ann.targetAudience || 'all';
      if (audience === 'test_devices' && !isTestDevice) return false;
      if (audience === 'free' && userTier !== 'free') return false;
      if (audience === 'premium' && userTier === 'free') return false;

      return true;
    });

    // Get dismissals for this user/device
    const dismissedIds = new Set<string>();
    if (userId || deviceId) {
      const dismissals = await db
        .select({ announcementId: announcementDismissals.announcementId })
        .from(announcementDismissals)
        .where(
          or(
            userId ? eq(announcementDismissals.userId, userId) : undefined,
            deviceId ? eq(announcementDismissals.deviceId, deviceId) : undefined
          )
        );
      dismissals.forEach((d) => dismissedIds.add(d.announcementId));
    }

    // Filter out dismissed show-once announcements
    const final = eligible.filter((ann) => {
      if (ann.showOnce && dismissedIds.has(ann.id)) return false;
      return true;
    });

    return c.json({
      announcements: final.map((ann) => ({
        id: ann.id,
        title: ann.title,
        uiSchema: ann.uiSchema,
        priority: ann.priority,
        isDismissible: ann.isDismissible,
        showOnce: ann.showOnce,
      })),
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /v1/announcements/:id/dismiss
 * Mark an announcement as dismissed
 */
app.post('/:id/dismiss', async (c) => {
  const db = drizzle(c.env.DB);
  const announcementId = c.req.param('id');
  const { userId, deviceId } = await c.req.json();

  if (!userId && !deviceId) {
    return c.json({ error: 'userId or deviceId required' }, 400);
  }

  try {
    await db.insert(announcementDismissals).values({
      id: nanoid(),
      announcementId,
      userId: userId || null,
      deviceId: deviceId || null,
    });

    return c.json({ success: true });
  } catch (err) {
    // Ignore duplicate dismissals
    return c.json({ success: true });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════

// All admin routes require authentication
app.use('/admin/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

/**
 * GET /v1/announcements/admin/templates
 * Get available announcement templates from database
 */
app.get('/admin/templates', async (c) => {
  const db = drizzle(c.env.DB);
  
  try {
    const templates = await db
      .select()
      .from(announcementTemplates)
      .orderBy(asc(announcementTemplates.orderIndex));
    
    return c.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        description: t.description,
        fields: t.fields,
        defaultSchema: t.defaultSchema,
        isBuiltin: t.isBuiltin,
      })),
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /v1/announcements/admin/templates
 * Create a new template
 */
app.post('/admin/templates', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  
  const id = nanoid();
  
  try {
    await db.insert(announcementTemplates).values({
      id,
      name: body.name,
      icon: body.icon || '📢',
      description: body.description,
      fields: body.fields || [],
      defaultSchema: body.defaultSchema,
      orderIndex: body.orderIndex || 50,
      isBuiltin: false,
    });
    
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * PUT /v1/announcements/admin/templates/:id
 * Update a template
 */
app.put('/admin/templates/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  
  try {
    await db
      .update(announcementTemplates)
      .set({
        name: body.name,
        icon: body.icon,
        description: body.description,
        fields: body.fields,
        defaultSchema: body.defaultSchema,
        orderIndex: body.orderIndex,
        updatedAt: new Date(),
      })
      .where(eq(announcementTemplates.id, id));
    
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * DELETE /v1/announcements/admin/templates/:id
 * Delete a template (only non-builtin)
 */
app.delete('/admin/templates/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  
  try {
    // Check if builtin
    const [template] = await db
      .select()
      .from(announcementTemplates)
      .where(eq(announcementTemplates.id, id))
      .limit(1);
    
    if (template?.isBuiltin) {
      return c.json({ error: 'Cannot delete built-in templates' }, 400);
    }
    
    await db.delete(announcementTemplates).where(eq(announcementTemplates.id, id));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * GET /v1/announcements/admin/list
 * List all announcements (admin)
 */
app.get('/admin/list', async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const result = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));

    return c.json({ announcements: result });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /v1/announcements/admin/create
 * Create a new announcement
 */
app.post('/admin/create', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const body = await c.req.json();

  const id = nanoid();

  try {
    await db.insert(announcements).values({
      id,
      title: body.title,
      uiSchema: body.uiSchema,
      targetAudience: body.targetAudience || 'all',
      minAppVersion: body.minAppVersion || null,
      maxAppVersion: body.maxAppVersion || null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      showOnce: body.showOnce ?? true,
      isDismissible: body.isDismissible ?? true,
      priority: body.priority || 0,
      isActive: body.isActive ?? false, // Draft by default
      createdBy: user?.id,
    });

    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * PUT /v1/announcements/admin/:id
 * Update an announcement
 */
app.put('/admin/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    await db
      .update(announcements)
      .set({
        title: body.title,
        uiSchema: body.uiSchema,
        targetAudience: body.targetAudience,
        minAppVersion: body.minAppVersion || null,
        maxAppVersion: body.maxAppVersion || null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        showOnce: body.showOnce,
        isDismissible: body.isDismissible,
        priority: body.priority,
        isActive: body.isActive,
      })
      .where(eq(announcements.id, id));

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * DELETE /v1/announcements/admin/:id
 * Delete an announcement
 */
app.delete('/admin/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  try {
    // Also delete any images from R2
    const ann = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    if (ann[0]?.uiSchema) {
      const schema = ann[0].uiSchema as AnnouncementSchema;
      // Delete images if they exist in our R2
      if (schema.content?.imageUrl?.includes('hanzimaster-content')) {
        try {
          const key = new URL(schema.content.imageUrl).pathname.slice(1);
          await c.env.CONTENT_BUCKET.delete(key);
        } catch {}
      }
      if (schema.style?.backgroundImageUrl?.includes('hanzimaster-content')) {
        try {
          const key = new URL(schema.style.backgroundImageUrl).pathname.slice(1);
          await c.env.CONTENT_BUCKET.delete(key);
        } catch {}
      }
    }

    await db.delete(announcements).where(eq(announcements.id, id));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /v1/announcements/admin/upload-image
 * Upload an image for an announcement
 */
app.post('/admin/upload-image', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const announcementId = formData.get('announcementId') as string;
  const imageType = formData.get('imageType') as string || 'hero'; // 'hero' | 'background' | 'icon'

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: PNG, JPEG, WebP, GIF' }, 400);
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'File too large. Max 5MB.' }, 400);
  }

  const ext = file.name.split('.').pop() || 'png';
  const key = `announcements/${announcementId || nanoid()}/${imageType}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    await c.env.CONTENT_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Construct public URL (assumes R2 public access or custom domain)
    const publicUrl = `https://content.polymasterlabs.com/${key}`;

    return c.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /v1/announcements/admin/duplicate/:id
 * Duplicate an announcement
 */
app.post('/admin/duplicate/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');

  try {
    const [original] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    
    if (!original) {
      return c.json({ error: 'Announcement not found' }, 404);
    }

    const newId = nanoid();
    await db.insert(announcements).values({
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      isActive: false,
      createdAt: new Date(),
      createdBy: user?.id,
    });

    return c.json({ success: true, id: newId });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;

