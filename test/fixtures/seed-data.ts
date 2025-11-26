/**
 * Test Fixtures - Reusable seed data for tests
 * 
 * Provides consistent test data across all test suites.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

// ========================================
// USER FIXTURES
// ========================================

export type TestUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: 'free' | 'premium' | 'pro';
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled' | 'expired';
};

export async function createTestUser(
  db: D1Database,
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const user: TestUser = {
    id: overrides.id ?? nanoid(),
    clerkId: overrides.clerkId ?? `user_${nanoid(10)}`,
    email: overrides.email ?? `test-${nanoid(6)}@example.com`,
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'user',
    tier: overrides.tier ?? 'free',
    subscriptionStatus: overrides.subscriptionStatus ?? 'none',
  };

  await db.prepare(`
    INSERT INTO users (id, clerk_id, email, name, role, tier, subscription_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `)
    .bind(user.id, user.clerkId, user.email, user.name, user.role, user.tier, user.subscriptionStatus)
    .run();

  return user;
}

export async function createAdminUser(db: D1Database): Promise<TestUser> {
  return createTestUser(db, {
    role: 'admin',
    name: 'Admin User',
    email: `admin-${nanoid(6)}@example.com`,
  });
}

export async function createPremiumUser(db: D1Database): Promise<TestUser> {
  return createTestUser(db, {
    tier: 'premium',
    subscriptionStatus: 'active',
    name: 'Premium User',
  });
}

// ========================================
// VOCABULARY FIXTURES
// ========================================

export type TestVocab = {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
};

export async function createTestVocab(
  db: D1Database,
  overrides: Partial<TestVocab> = {}
): Promise<TestVocab> {
  const vocab: TestVocab = {
    id: overrides.id ?? nanoid(),
    hanzi: overrides.hanzi ?? '你好',
    pinyin: overrides.pinyin ?? 'nǐ hǎo',
    english: overrides.english ?? 'hello',
    category: overrides.category ?? 'greetings',
    hskLevel: overrides.hskLevel ?? 1,
  };

  await db.prepare(`
    INSERT INTO vocabulary (id, hanzi, pinyin, english, category, hsk_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(vocab.id, vocab.hanzi, vocab.pinyin, vocab.english, vocab.category, vocab.hskLevel)
    .run();

  return vocab;
}

export async function createVocabBatch(
  db: D1Database,
  count: number,
  hskLevel: number = 1
): Promise<TestVocab[]> {
  const vocabs: TestVocab[] = [];
  const characters = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  
  for (let i = 0; i < count; i++) {
    vocabs.push(await createTestVocab(db, {
      hanzi: characters[i % characters.length] + (i > 9 ? i : ''),
      pinyin: `test${i}`,
      english: `test word ${i}`,
      hskLevel,
    }));
  }
  
  return vocabs;
}

// ========================================
// UNIT FIXTURES
// ========================================

export type TestUnit = {
  id: string;
  hskLevel: number;
  unitNumber: number;
  title: string;
  description: string;
  isPublished: boolean;
};

// Counter to ensure unique unit numbers across tests
let unitNumberCounter = 1000;

export async function createTestUnit(
  db: D1Database,
  overrides: Partial<TestUnit> = {}
): Promise<TestUnit> {
  // Auto-generate unique unit number if not provided
  const unitNumber = overrides.unitNumber ?? ++unitNumberCounter;
  
  const unit: TestUnit = {
    id: overrides.id ?? nanoid(),
    hskLevel: overrides.hskLevel ?? 1,
    unitNumber,
    title: overrides.title ?? 'Test Unit',
    description: overrides.description ?? 'A test unit for testing',
    isPublished: overrides.isPublished ?? false,
  };

  await db.prepare(`
    INSERT INTO units (id, hsk_level, unit_number, title, description, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `)
    .bind(unit.id, unit.hskLevel, unit.unitNumber, unit.title, unit.description, unit.isPublished ? 1 : 0)
    .run();

  return unit;
}

// ========================================
// LESSON FIXTURES
// ========================================

export type TestLesson = {
  id: string;
  unitId: string | null;
  title: string;
  subtitle: string;
  lessonNumber: number;
  lessonType: 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublished: boolean;
};

export async function createTestLesson(
  db: D1Database,
  overrides: Partial<TestLesson> = {}
): Promise<TestLesson> {
  const lesson: TestLesson = {
    id: overrides.id ?? nanoid(),
    unitId: overrides.unitId ?? null,
    title: overrides.title ?? 'Test Lesson',
    subtitle: overrides.subtitle ?? 'A test lesson',
    lessonNumber: overrides.lessonNumber ?? 1,
    lessonType: overrides.lessonType ?? 'lesson',
    hskLevel: overrides.hskLevel ?? 1,
    difficulty: overrides.difficulty ?? 'medium',
    isPublished: overrides.isPublished ?? false,
  };

  await db.prepare(`
    INSERT INTO lessons (id, unit_id, title, subtitle, lesson_number, lesson_type, hsk_level, difficulty, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `)
    .bind(
      lesson.id,
      lesson.unitId,
      lesson.title,
      lesson.subtitle,
      lesson.lessonNumber,
      lesson.lessonType,
      lesson.hskLevel,
      lesson.difficulty,
      lesson.isPublished ? 1 : 0
    )
    .run();

  return lesson;
}

// ========================================
// LESSON BLOCK FIXTURES
// ========================================

export type TestLessonBlock = {
  id: string;
  lessonId: string;
  type: string;
  orderIndex: number;
  content: Record<string, unknown>;
};

export async function createTestLessonBlock(
  db: D1Database,
  lessonId: string,
  overrides: Partial<Omit<TestLessonBlock, 'lessonId'>> = {}
): Promise<TestLessonBlock> {
  const block: TestLessonBlock = {
    id: overrides.id ?? nanoid(),
    lessonId,
    type: overrides.type ?? 'intro',
    orderIndex: overrides.orderIndex ?? 0,
    content: overrides.content ?? { title: 'Test Block', description: 'Test description' },
  };

  await db.prepare(`
    INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content)
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(block.id, block.lessonId, block.type, block.orderIndex, JSON.stringify(block.content))
    .run();

  return block;
}

// ========================================
// STORY FIXTURES
// ========================================

export type TestStory = {
  id: string;
  title: string;
  subtitle: string;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublished: boolean;
};

export async function createTestStory(
  db: D1Database,
  overrides: Partial<TestStory> = {}
): Promise<TestStory> {
  const story: TestStory = {
    id: overrides.id ?? nanoid(),
    title: overrides.title ?? 'Test Story',
    subtitle: overrides.subtitle ?? 'A test story',
    hskLevel: overrides.hskLevel ?? 1,
    difficulty: overrides.difficulty ?? 'easy',
    isPublished: overrides.isPublished ?? false,
  };

  await db.prepare(`
    INSERT INTO stories (id, title, subtitle, hsk_level, difficulty, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `)
    .bind(story.id, story.title, story.subtitle, story.hskLevel, story.difficulty, story.isPublished ? 1 : 0)
    .run();

  return story;
}

// ========================================
// PROGRESS FIXTURES
// ========================================

export async function createUserProgress(
  db: D1Database,
  userId: string,
  lessonId: string,
  status: 'started' | 'completed' = 'started',
  score: number = 0
): Promise<void> {
  await db.prepare(`
    INSERT INTO user_progress (id, user_id, lesson_id, status, score, updated_at)
    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
  `)
    .bind(nanoid(), userId, lessonId, status, score)
    .run();
}

// ========================================
// CLEANUP HELPERS
// ========================================

export async function cleanupTestData(db: D1Database): Promise<void> {
  // Delete in order respecting foreign keys
  const tables = [
    'user_progress',
    'user_knowledge_snapshot',
    'user_library',
    'lesson_blocks',
    'lessons',
    'units',
    'story_vocabulary',
    'story_sentences',
    'story_questions',
    'stories',
    'vocabulary',
    'content_tags',
    'content_library',
    'tags',
    'api_usage',
    'daily_usage',
    'system_events',
  ];

  for (const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // Table might not exist in test schema
    }
  }
}

