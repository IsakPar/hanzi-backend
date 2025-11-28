/**
 * Story Categories Routes
 * CRUD operations for managing home screen story categories
 * Used by mobile app to render dynamic story sections
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, asc, desc, inArray, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../types/app';
import { storyCategories, storyCategoryItems, stories, storySeries } from '../schema';

const app = new Hono<AppEnv>();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createCategorySchema = z.object({
  title: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  displayType: z.enum(['horizontal', 'grid', 'featured', 'series']).optional().default('horizontal'),
  filterType: z.enum(['recent', 'popular', 'manual', 'hsk', 'series']).optional().default('manual'),
  filterValue: z.record(z.unknown()).optional(),
  isPublished: z.boolean().optional().default(true),
  seeAllEnabled: z.boolean().optional().default(true),
  maxItems: z.number().int().min(1).max(50).optional().default(10),
});

const updateCategorySchema = createCategorySchema.partial().omit({ slug: true });

const setCategoryStoriesSchema = z.object({
  storyIds: z.array(z.string()),
});

// ============================================
// PUBLIC ROUTES (for mobile app)
// ============================================

/**
 * GET /story-categories/home - Get home screen layout for mobile app
 * Returns all published categories with their stories
 */
app.get('/home', async (c) => {
  const db = drizzle(c.env.DB);
  const hskLevel = c.req.query('hskLevel') ? parseInt(c.req.query('hskLevel')!) : undefined;
  
  // Get all published categories
  const categories = await db
    .select()
    .from(storyCategories)
    .where(eq(storyCategories.isPublished, true))
    .orderBy(asc(storyCategories.orderIndex))
    .all();

  // Get all published series for the "series" display type
  const allSeries = await db
    .select()
    .from(storySeries)
    .where(eq(storySeries.isPublished, true))
    .orderBy(asc(storySeries.orderIndex))
    .all();

  // Get story counts for series
  const seriesWithCounts = await Promise.all(
    allSeries.map(async (series) => {
      const count = await db
        .select()
        .from(stories)
        .where(and(
          eq(stories.seriesId, series.id),
          eq(stories.isPublished, true)
        ))
        .all();
      return { ...series, storyCount: count.length };
    })
  );

  // Build response with stories for each category
  const result = await Promise.all(
    categories.map(async (cat) => {
      let categoryStories: typeof stories.$inferSelect[] = [];

      switch (cat.filterType) {
        case 'series':
          // For series display type, we return series, not stories
          return {
            ...cat,
            type: 'series',
            series: seriesWithCounts,
          };

        case 'recent':
          categoryStories = await db
            .select()
            .from(stories)
            .where(eq(stories.isPublished, true))
            .orderBy(desc(stories.createdAt))
            .limit(cat.maxItems || 10)
            .all();
          break;

        case 'popular':
          // For now, just get recent - can enhance with actual popularity metrics later
          categoryStories = await db
            .select()
            .from(stories)
            .where(eq(stories.isPublished, true))
            .orderBy(desc(stories.createdAt))
            .limit(cat.maxItems || 10)
            .all();
          break;

        case 'hsk':
          const filterValue = cat.filterValue as { hskLevel?: number } | null;
          const targetLevel = hskLevel || filterValue?.hskLevel || 1;
          categoryStories = await db
            .select()
            .from(stories)
            .where(and(
              eq(stories.isPublished, true),
              eq(stories.hskLevel, targetLevel)
            ))
            .orderBy(desc(stories.createdAt))
            .limit(cat.maxItems || 10)
            .all();
          break;

        case 'manual':
        default:
          // Get manually assigned stories
          const items = await db
            .select({ storyId: storyCategoryItems.storyId })
            .from(storyCategoryItems)
            .where(eq(storyCategoryItems.categoryId, cat.id))
            .orderBy(asc(storyCategoryItems.orderIndex))
            .all();

          if (items.length > 0) {
            const storyIds = items.map(i => i.storyId);
            categoryStories = await db
              .select()
              .from(stories)
              .where(and(
                eq(stories.isPublished, true),
                inArray(stories.id, storyIds)
              ))
              .all();
            
            // Sort by manual order
            categoryStories.sort((a, b) => 
              storyIds.indexOf(a.id) - storyIds.indexOf(b.id)
            );
          }
          break;
      }

      return {
        ...cat,
        type: 'stories',
        stories: categoryStories.slice(0, cat.maxItems || 10),
      };
    })
  );

  return c.json({ categories: result });
});

// ============================================
// ADMIN ROUTES (for portal)
// ============================================

/**
 * GET /story-categories - List all categories (admin)
 */
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  
  const categories = await db
    .select()
    .from(storyCategories)
    .orderBy(asc(storyCategories.orderIndex))
    .all();

  // Get story counts for manual categories
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      if (cat.filterType === 'manual') {
        const items = await db
          .select()
          .from(storyCategoryItems)
          .where(eq(storyCategoryItems.categoryId, cat.id))
          .all();
        return { ...cat, storyCount: items.length };
      }
      return { ...cat, storyCount: null }; // null = dynamic count
    })
  );

  return c.json({ categories: categoriesWithCounts });
});

/**
 * GET /story-categories/:id - Get category with stories
 */
app.get('/:id', async (c) => {
  const categoryId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  const category = await db
    .select()
    .from(storyCategories)
    .where(eq(storyCategories.id, categoryId))
    .get();

  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  // Get manually assigned stories
  const items = await db
    .select()
    .from(storyCategoryItems)
    .where(eq(storyCategoryItems.categoryId, categoryId))
    .orderBy(asc(storyCategoryItems.orderIndex))
    .all();

  const storyIds = items.map(i => i.storyId);
  let categoryStories: { id: string; title: string; hskLevel: number; isPublished: boolean | null }[] = [];
  
  if (storyIds.length > 0) {
    categoryStories = await db
      .select({
        id: stories.id,
        title: stories.title,
        hskLevel: stories.hskLevel,
        isPublished: stories.isPublished,
      })
      .from(stories)
      .where(inArray(stories.id, storyIds))
      .all();
    
    // Sort by manual order
    categoryStories.sort((a, b) => 
      storyIds.indexOf(a.id) - storyIds.indexOf(b.id)
    );
  }

  return c.json({ ...category, stories: categoryStories });
});

/**
 * POST /story-categories - Create new category
 */
app.post('/', zValidator('json', createCategorySchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Check slug uniqueness
  const existing = await db
    .select()
    .from(storyCategories)
    .where(eq(storyCategories.slug, data.slug))
    .get();

  if (existing) {
    return c.json({ error: 'Slug already exists' }, 400);
  }

  // Get max order index
  const maxOrder = await db
    .select({ max: storyCategories.orderIndex })
    .from(storyCategories)
    .orderBy(desc(storyCategories.orderIndex))
    .limit(1)
    .get();

  const newCategory = {
    id: nanoid(),
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    displayType: data.displayType,
    filterType: data.filterType,
    filterValue: data.filterValue ? JSON.stringify(data.filterValue) : null,
    orderIndex: (maxOrder?.max || 0) + 1,
    isPublished: data.isPublished,
    seeAllEnabled: data.seeAllEnabled,
    maxItems: data.maxItems,
  };

  await db.insert(storyCategories).values(newCategory);

  return c.json({ success: true, category: newCategory }, 201);
});

/**
 * PUT /story-categories/:id - Update category
 */
app.put('/:id', zValidator('json', updateCategorySchema), async (c) => {
  const categoryId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const existing = await db
    .select()
    .from(storyCategories)
    .where(eq(storyCategories.id, categoryId))
    .get();

  if (!existing) {
    return c.json({ error: 'Category not found' }, 404);
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.displayType !== undefined) updates.displayType = data.displayType;
  if (data.filterType !== undefined) updates.filterType = data.filterType;
  if (data.filterValue !== undefined) updates.filterValue = JSON.stringify(data.filterValue);
  if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
  if (data.seeAllEnabled !== undefined) updates.seeAllEnabled = data.seeAllEnabled;
  if (data.maxItems !== undefined) updates.maxItems = data.maxItems;

  await db
    .update(storyCategories)
    .set(updates)
    .where(eq(storyCategories.id, categoryId));

  return c.json({ success: true });
});

/**
 * DELETE /story-categories/:id - Delete category
 */
app.delete('/:id', async (c) => {
  const categoryId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  // Delete category items first (cascade should handle this)
  await db
    .delete(storyCategoryItems)
    .where(eq(storyCategoryItems.categoryId, categoryId));

  // Delete the category
  await db
    .delete(storyCategories)
    .where(eq(storyCategories.id, categoryId));

  return c.json({ success: true });
});

/**
 * PUT /story-categories/reorder - Reorder categories
 */
app.put('/reorder', zValidator('json', z.object({ categoryIds: z.array(z.string()) })), async (c) => {
  const { categoryIds } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  await Promise.all(
    categoryIds.map((id, index) =>
      db
        .update(storyCategories)
        .set({ orderIndex: index })
        .where(eq(storyCategories.id, id))
    )
  );

  return c.json({ success: true });
});

/**
 * PUT /story-categories/:id/stories - Set stories for manual category
 */
app.put('/:id/stories', zValidator('json', setCategoryStoriesSchema), async (c) => {
  const categoryId = c.req.param('id');
  const { storyIds } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Verify category exists and is manual type
  const category = await db
    .select()
    .from(storyCategories)
    .where(eq(storyCategories.id, categoryId))
    .get();

  if (!category) {
    return c.json({ error: 'Category not found' }, 404);
  }

  // Clear existing items
  await db
    .delete(storyCategoryItems)
    .where(eq(storyCategoryItems.categoryId, categoryId));

  // Insert new items
  if (storyIds.length > 0) {
    await db.insert(storyCategoryItems).values(
      storyIds.map((storyId, index) => ({
        categoryId,
        storyId,
        orderIndex: index,
      }))
    );
  }

  return c.json({ success: true });
});

export default app;

