import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { lessons, lessonBlocks } from '../schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types/app';

const app = new Hono<AppEnv>();

// 1. GET /lessons - List all published lessons
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allLessons = await db.select().from(lessons).where(eq(lessons.isPublished, true));
  return c.json(allLessons);
});

// 2. GET /lessons/:id - Get full lesson with blocks
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Fetch lesson metadata
  const lessonResult = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  const lesson = lessonResult[0];

  if (!lesson) {
    return c.json({ error: 'Lesson not found' }, 404);
  }

  // Fetch blocks
  const blocks = await db.select()
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, id))
    .orderBy(asc(lessonBlocks.orderIndex));

  // Combine into the JSON structure the frontend expects
  return c.json({
    ...lesson,
    blocks: blocks.map(b => ({
      id: b.id,
      type: b.type,
      ...b.content as object // Spread the JSON content
    }))
  });
});

export default app;


