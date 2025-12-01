/**
 * Data Integrity Critical Path Tests
 * 
 * Tests CRUD operations and data consistency for core entities:
 * - Units (full CRUD)
 * - Lessons (read-only via API, direct DB for setup)
 * - Vocabulary (admin CRUD)
 * 
 * Uses Better Auth for authentication.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUnit,
  createTestLesson,
  createTestLessonBlock,
  createTestVocab,
  createVocabBatch,
} from '../fixtures/seed-data';
import {
  createAuthenticatedAdmin,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Data Integrity Critical Path', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminToken = admin.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // UNITS CRUD
  // ========================================

  describe('Units CRUD', () => {
    it('creates a unit with all required fields', async () => {
      const unitData = {
        hskLevel: 1,
        unitNumber: 1,
        title: 'Greetings & Basics',
        description: 'Learn basic greetings in Chinese',
      };

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(unitData),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    it('auto-increments unit number when not provided', async () => {
      // Create first unit
      await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            hskLevel: 2,
            title: 'First Unit',
          }),
        }),
        ctx.env,
        executionContext
      );

      // Create second unit without unit number
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            hskLevel: 2,
            title: 'Second Unit',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.unitNumber).toBe(2);
    });

    it('retrieves unit by id', async () => {
      const unit = await createTestUnit(ctx.db, { title: 'Test Unit' });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'GET',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.unit.id).toBe(unit.id);
      expect(body.unit.title).toBe(unit.title);
    });

    it('updates unit preserving unchanged fields', async () => {
      const unit = await createTestUnit(ctx.db, {
        title: 'Original Title',
        description: 'Original Description',
        hskLevel: 1,
        unitNumber: 99,
      });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ title: 'Updated Title' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify update
      const getRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'GET',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      const body = await getRes.json();
      expect(body.unit.title).toBe('Updated Title');
      expect(body.unit.description).toBe('Original Description');
    });

    it('deletes unit successfully', async () => {
      const unit = await createTestUnit(ctx.db, {
        hskLevel: 3,
        unitNumber: 88,
      });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify deletion
      const getRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'GET',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent unit', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/non-existent-id', {
          method: 'GET',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });

    it('validates required fields on create', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            // Missing required: hskLevel, title
            description: 'Just a description',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });

    it('filters units by HSK level', async () => {
      await createTestUnit(ctx.db, { hskLevel: 4, unitNumber: 1, title: 'HSK4 Unit 1' });
      await createTestUnit(ctx.db, { hskLevel: 4, unitNumber: 2, title: 'HSK4 Unit 2' });
      await createTestUnit(ctx.db, { hskLevel: 5, unitNumber: 1, title: 'HSK5 Unit' });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=4', {
          method: 'GET',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.units.length).toBe(2);
      body.units.forEach((unit: { hskLevel: number }) => {
        expect(unit.hskLevel).toBe(4);
      });
    });
  });

  // ========================================
  // LESSONS (Read-only API + Direct DB)
  // ========================================

  describe('Lessons', () => {
    it('retrieves lesson with blocks', async () => {
      const unit = await createTestUnit(ctx.db, { hskLevel: 6, unitNumber: 1, isPublished: true });
      const lesson = await createTestLesson(ctx.db, { unitId: unit.id, isPublished: true });
      await createTestLessonBlock(ctx.db, lesson.id, {
        type: 'intro',
        orderIndex: 0,
        content: { title: 'Welcome', text: 'Welcome to the lesson' },
      });
      await createTestLessonBlock(ctx.db, lesson.id, {
        type: 'vocabulary',
        orderIndex: 1,
        content: { words: ['你好'] },
      });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}`, {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(lesson.id);
      expect(body.blocks).toHaveLength(2);
      expect(body.blocks[0].type).toBe('intro');
      expect(body.blocks[1].type).toBe('vocabulary');
    });

    it('returns 404 for non-existent lesson', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons/non-existent-id', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });

    it('lists only published lessons', async () => {
      const unit = await createTestUnit(ctx.db, { hskLevel: 7, unitNumber: 1 });
      await createTestLesson(ctx.db, { unitId: unit.id, title: 'Published', isPublished: true });
      await createTestLesson(ctx.db, { unitId: unit.id, title: 'Draft', isPublished: false });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Should only include published lessons
      const lessonTitles = body.map((l: { title: string }) => l.title);
      expect(lessonTitles).toContain('Published');
      expect(lessonTitles).not.toContain('Draft');
    });
  });

  // ========================================
  // VOCABULARY CRUD
  // ========================================

  describe('Vocabulary CRUD', () => {
    it('creates vocabulary entry via admin endpoint', async () => {
      const vocabData = {
        hanzi: '学习',
        pinyin: 'xuéxí',
        english: 'to study',
        category: 'verbs',
        hskLevel: 2,
      };

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(vocabData),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    it('searches vocabulary by query', async () => {
      await createTestVocab(ctx.db, { hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello' });
      await createTestVocab(ctx.db, { hanzi: '再见', pinyin: 'zàijiàn', english: 'goodbye' });
      await createTestVocab(ctx.db, { hanzi: '谢谢', pinyin: 'xièxiè', english: 'thank you' });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=hello', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.length).toBe(1);
      expect(body.results[0].english).toBe('hello');
    });

    it('handles pagination correctly', async () => {
      await createVocabBatch(ctx.db, 25, 1);

      // Get first page
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=10&offset=0', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.results.length).toBe(10);
      expect(body1.total).toBe(25);

      // Get second page
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=10&offset=10', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      const body2 = await res2.json();
      expect(body2.results.length).toBe(10);

      // Verify no overlap
      const ids1 = new Set(body1.results.map((v: { id: string }) => v.id));
      const ids2 = new Set(body2.results.map((v: { id: string }) => v.id));
      const intersection = [...ids1].filter((id) => ids2.has(id));
      expect(intersection.length).toBe(0);
    });

    it('escapes SQL special characters in search', async () => {
      await createTestVocab(ctx.db, { hanzi: '100%', english: 'hundred percent', category: 'numbers' });
      await createTestVocab(ctx.db, { hanzi: '普通', english: 'normal', category: 'adjectives' });

      // Search for % - should not match all entries
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=%25', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      // Should only match entries containing literal %
      expect(body.results.length).toBeLessThanOrEqual(1);
    });

    it('filters vocabulary by HSK level', async () => {
      await createTestVocab(ctx.db, { hanzi: '一', hskLevel: 1 });
      await createTestVocab(ctx.db, { hanzi: '虽然', hskLevel: 3 });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=1', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      body.results.forEach((v: { hskLevel: number }) => {
        expect(v.hskLevel).toBe(1);
      });
    });

    it('updates vocabulary entry', async () => {
      const vocab = await createTestVocab(ctx.db, { english: 'original meaning' });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/admin/${vocab.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ english: 'updated meaning' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify update
      const getRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/${vocab.id}`, {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      const body = await getRes.json();
      expect(body.english).toBe('updated meaning');
    });

    it('deletes vocabulary entry', async () => {
      const vocab = await createTestVocab(ctx.db);

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/admin/${vocab.id}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify deletion
      const getRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/${vocab.id}`, {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(getRes.status).toBe(404);
    });
  });

  // ========================================
  // DATA CONSISTENCY
  // ========================================

  describe('Data Consistency', () => {
    it('deletes unit without associated lessons', async () => {
      const unit = await createTestUnit(ctx.db, { hskLevel: 8 });

      // Delete unit via API
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Unit should be deleted
      const unitResult = await ctx.db
        .prepare('SELECT id FROM units WHERE id = ?')
        .bind(unit.id)
        .first();

      expect(unitResult).toBeNull();
    });

    it('handles concurrent updates gracefully', async () => {
      const unit = await createTestUnit(ctx.db, {
        title: 'Original',
        hskLevel: 9,
        unitNumber: 1,
      });

      // Send multiple concurrent updates
      const updates = Array(5).fill(null).map((_, i) =>
        ctx.app.fetch(
          new Request(`http://localhost/v1/units/${unit.id}`, {
            method: 'PUT',
            headers: jsonAuthBearerHeaders(adminToken),
            body: JSON.stringify({ title: `Update ${i}` }),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(updates);

      // All should succeed (last write wins)
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // Verify final state is consistent
      const result = await ctx.db
        .prepare('SELECT title FROM units WHERE id = ?')
        .bind(unit.id)
        .first<{ title: string }>();

      // Should be one of the updates
      expect(result?.title).toMatch(/^Update \d$/);
    });
  });

  // ========================================
  // PUBLISHING WORKFLOW
  // ========================================

  describe('Publishing Workflow', () => {
    it('publishes unit successfully', async () => {
      const unit = await createTestUnit(ctx.db, {
        isPublished: false,
        hskLevel: 1,
        unitNumber: 50,
      });

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ isPublished: true }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      const result = await ctx.db
        .prepare('SELECT is_published FROM units WHERE id = ?')
        .bind(unit.id)
        .first<{ is_published: number }>();

      expect(result?.is_published).toBe(1);
    });
  });
});
