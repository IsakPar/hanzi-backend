/**
 * Control Center Routes
 * 
 * Content staging system for testing content on specific devices
 * before pushing to all users.
 * 
 * Flow: draft -> staging -> live
 * 
 * Also handles Release Manager for shipping content to mobile app.
 */

import { Hono } from 'hono';
import { eq, or, inArray, and, desc, asc, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { lessons, stories, testDevices, releases, vocabulary, lessonBlocks, storyShowcaseSections } from '../schema';
import { nanoid } from 'nanoid';
import { adminRateLimit } from '../middleware/rate-limit';
import { logWithContext } from '../utils/logger';
import { VocabExtractor } from '../services/vocab-extractor';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', adminRateLimit);

// All routes require admin
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// ═══════════════════════════════════════════════════════════
// STAGED CONTENT
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/staged
 * List all content currently in staging
 */
app.get('/staged', async (c) => {
  const db = drizzle(c.env.DB);

  const [stagedLessons, stagedStories] = await Promise.all([
    db.select({
      id: lessons.id,
      title: lessons.title,
      hskLevel: lessons.hskLevel,
      lessonNumber: lessons.lessonNumber,
      contentStatus: lessons.contentStatus,
      updatedAt: lessons.updatedAt,
    })
    .from(lessons)
    .where(eq(lessons.contentStatus, 'staging')),

    db.select({
      id: stories.id,
      title: stories.title,
      hskLevel: stories.hskLevel,
      contentStatus: stories.contentStatus,
      updatedAt: stories.updatedAt,
    })
    .from(stories)
    .where(eq(stories.contentStatus, 'staging')),
  ]);

  return c.json({
    lessons: stagedLessons,
    stories: stagedStories,
    totalStaged: stagedLessons.length + stagedStories.length,
  });
});

/**
 * POST /v1/control-center/promote
 * Promote content from staging to live
 */
app.post('/promote', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsPromoted: 0,
    storiesPromoted: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'live',
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsPromoted = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'live',
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesPromoted = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

/**
 * POST /v1/control-center/stage
 * Move content from draft to staging
 */
app.post('/stage', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsStaged: 0,
    storiesStaged: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'staging',
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsStaged = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'staging',
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesStaged = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

/**
 * POST /v1/control-center/unpublish
 * Move content back to draft
 */
app.post('/unpublish', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsUnpublished: 0,
    storiesUnpublished: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'draft',
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsUnpublished = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'draft',
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesUnpublished = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

// ═══════════════════════════════════════════════════════════
// TEST DEVICES
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/test-devices
 * List all registered test devices
 */
app.get('/test-devices', async (c) => {
  const db = drizzle(c.env.DB);

  const devices = await db
    .select()
    .from(testDevices)
    .orderBy(testDevices.createdAt);

  return c.json({ devices });
});

/**
 * POST /v1/control-center/test-devices
 * Add a new test device
 */
app.post('/test-devices', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const { deviceId, name, platform } = await c.req.json<{
    deviceId: string;
    name: string;
    platform?: 'ios' | 'android';
  }>();

  if (!deviceId || !name) {
    return c.json({ error: 'deviceId and name are required' }, 400);
  }

  // Check if device already exists
  const existing = await db
    .select()
    .from(testDevices)
    .where(eq(testDevices.deviceId, deviceId))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Device already registered' }, 409);
  }

  const device = {
    id: nanoid(),
    deviceId,
    name,
    platform: platform || null,
    addedBy: user?.id || null,
    createdAt: new Date(),
  };

  await db.insert(testDevices).values(device);

  return c.json({ success: true, device });
});

/**
 * DELETE /v1/control-center/test-devices/:id
 * Remove a test device
 */
app.delete('/test-devices/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(testDevices).where(eq(testDevices.id, id));

  return c.json({ success: true });
});

/**
 * GET /v1/control-center/is-test-device/:deviceId
 * Check if a device is a test device (public endpoint for mobile app)
 */
app.get('/is-test-device/:deviceId', async (c) => {
  const db = drizzle(c.env.DB);
  const deviceId = c.req.param('deviceId');

  const device = await db
    .select()
    .from(testDevices)
    .where(eq(testDevices.deviceId, deviceId))
    .limit(1);

  return c.json({ isTestDevice: device.length > 0 });
});

// ═══════════════════════════════════════════════════════════
// CONTENT OVERVIEW
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/overview
 * Get overview of all content by status
 */
app.get('/overview', async (c) => {
  const db = drizzle(c.env.DB);

  // Get lesson counts by status
  const allLessons = await db
    .select({
      id: lessons.id,
      contentStatus: lessons.contentStatus,
    })
    .from(lessons);

  const allStories = await db
    .select({
      id: stories.id,
      contentStatus: stories.contentStatus,
    })
    .from(stories);

  const lessonCounts = {
    draft: allLessons.filter(l => l.contentStatus === 'draft' || !l.contentStatus).length,
    staging: allLessons.filter(l => l.contentStatus === 'staging').length,
    live: allLessons.filter(l => l.contentStatus === 'live').length,
  };

  const storyCounts = {
    draft: allStories.filter(s => s.contentStatus === 'draft' || !s.contentStatus).length,
    staging: allStories.filter(s => s.contentStatus === 'staging').length,
    live: allStories.filter(s => s.contentStatus === 'live').length,
  };

  return c.json({
    lessons: lessonCounts,
    stories: storyCounts,
    total: {
      draft: lessonCounts.draft + storyCounts.draft,
      staging: lessonCounts.staging + storyCounts.staging,
      live: lessonCounts.live + storyCounts.live,
    },
  });
});

// ═══════════════════════════════════════════════════════════
// RELEASE MANAGER
// ═══════════════════════════════════════════════════════════

/**
 * Helper: Generate content hash for change detection
 */
async function generateContentHash(content: unknown): Promise<string> {
  const json = JSON.stringify(content);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/**
 * GET /v1/control-center/preview-release/:hskLevel
 * Preview what would change if we shipped content for an HSK level
 * Compares draft/staging content against what's currently live
 */
app.get('/preview-release/:hskLevel', async (c) => {
  const db = drizzle(c.env.DB);
  const hskLevel = parseInt(c.req.param('hskLevel'));

  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
  }

  logWithContext('info', 'release.preview_start', {
    requestId: c.get('requestId'),
    meta: { hskLevel },
  });

  // Auto-sync vocabulary for all lessons in this HSK level
  // This ensures targetVocabulary is populated from lesson block content
  const vocabExtractor = new VocabExtractor(c.env.DB, c.get('requestId'));
  try {
    const syncResult = await vocabExtractor.syncAllLessons(hskLevel);
    logWithContext('info', 'release.vocab_sync_complete', {
      requestId: c.get('requestId'),
      meta: { 
        hskLevel, 
        lessonsSynced: syncResult.synced, 
        totalVocab: syncResult.totalVocab,
        errors: syncResult.errors.length,
      },
    });
  } catch (syncError) {
    logWithContext('warn', 'release.vocab_sync_failed', {
      requestId: c.get('requestId'),
      meta: { hskLevel, error: (syncError as Error).message },
    });
    // Continue even if sync fails - use existing targetVocabulary
  }

  // Get all lessons for this HSK level (after sync)
  const allLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      lessonNumber: lessons.lessonNumber,
      contentStatus: lessons.contentStatus,
      contentHash: lessons.contentHash,
      contentVersion: lessons.contentVersion,
      isPublished: lessons.isPublished,
      updatedAt: lessons.updatedAt,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .where(eq(lessons.hskLevel, hskLevel))
    .orderBy(asc(lessons.lessonNumber));

  // Get all stories for this HSK level
  const allStories = await db
    .select({
      id: stories.id,
      title: stories.title,
      subtitle: stories.subtitle,
      contentStatus: stories.contentStatus,
      isPublished: stories.isPublished,
      updatedAt: stories.updatedAt,
      difficulty: stories.difficulty,
      estimatedMinutes: stories.estimatedMinutes,
    })
    .from(stories)
    .where(eq(stories.hskLevel, hskLevel))
    .orderBy(asc(stories.title));

  // Categorize lessons
  const liveLessons = allLessons.filter(l => l.contentStatus === 'live' && l.isPublished);
  const draftLessons = allLessons.filter(l => l.contentStatus === 'draft' || !l.contentStatus);
  const stagingLessons = allLessons.filter(l => l.contentStatus === 'staging');

  // Categorize stories
  const publishedStories = allStories.filter(s => s.isPublished);
  const draftStories = allStories.filter(s => !s.isPublished);

  // Get ALL vocabulary for this HSK level with full details for selection
  const vocabList = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      english: vocabulary.english,
      category: vocabulary.category,
      wordAudioR2Key: vocabulary.wordAudioR2Key,
      exampleChinese: vocabulary.exampleChinese,
    })
    .from(vocabulary)
    .where(eq(vocabulary.hskLevel, hskLevel))
    .orderBy(asc(vocabulary.hanzi));

  // Collect all vocab IDs used in lessons (from targetVocabulary)
  const vocabUsedInLessons = new Set<string>();
  for (const lesson of allLessons) {
    const targetVocab = lesson.targetVocabulary as string[] || [];
    targetVocab.forEach(id => vocabUsedInLessons.add(id));
  }

  // Get the latest release for this HSK level
  const latestRelease = await db
    .select()
    .from(releases)
    .where(eq(releases.hskLevel, hskLevel))
    .orderBy(desc(releases.createdAt))
    .limit(1);

  const previousRelease = latestRelease[0] || null;
  const previousLessonIds = (previousRelease?.lessonIds as string[]) || [];

  // Calculate changes
  const pendingLessons = [...draftLessons, ...stagingLessons];
  
  // Determine what's new, updated, or would be removed
  const newLessons: typeof allLessons = [];
  const updatedLessons: typeof allLessons = [];
  const unchangedLessons: typeof allLessons = [];

  for (const lesson of pendingLessons) {
    const wasLive = previousLessonIds.includes(lesson.id);
    const currentLive = liveLessons.find(l => l.id === lesson.id);
    
    if (!wasLive && !currentLive) {
      newLessons.push(lesson);
    } else {
      // Check if content changed
      if (currentLive && lesson.contentHash !== currentLive.contentHash) {
        updatedLessons.push(lesson);
      } else if (currentLive) {
        unchangedLessons.push(lesson);
      } else {
        newLessons.push(lesson);
      }
    }
  }

  // Also check for live lessons that have been updated since the last release
  // This catches cases where someone edited a live lesson but contentStatus wasn't changed
  const releaseTime = previousRelease?.createdAt ? new Date(previousRelease.createdAt) : null;
  const liveLessonsWithChanges: typeof allLessons = [];
  
  if (releaseTime) {
    for (const lesson of liveLessons) {
      const lessonUpdatedAt = lesson.updatedAt ? new Date(lesson.updatedAt) : null;
      if (lessonUpdatedAt && lessonUpdatedAt > releaseTime) {
        // This live lesson was updated after the last release
        liveLessonsWithChanges.push(lesson);
      }
    }
  }

  // Lessons that were live but aren't in pending = would be removed if we ship ONLY pending
  // But typically we want to keep live lessons, so we show them as "staying"
  const stayingLessons = liveLessons.filter(l => 
    !pendingLessons.some(p => p.id === l.id)
  );

  // Calculate vocabulary stats
  const vocabWithAudio = vocabList.filter(v => v.wordAudioR2Key).length;
  const vocabInLessons = vocabList.filter(v => vocabUsedInLessons.has(v.id)).length;
  
  // Suggest next version (semver bump)
  const currentVersion = previousRelease?.version || '0.0.0';
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let suggestedVersion: string;
  
  if (newLessons.length > 0) {
    // New lessons = minor bump
    suggestedVersion = `${major}.${minor + 1}.0`;
  } else if (updatedLessons.length > 0 || liveLessonsWithChanges.length > 0) {
    // Updates or live lessons with changes = patch bump
    suggestedVersion = `${major}.${minor}.${patch + 1}`;
  } else {
    suggestedVersion = currentVersion;
  }

  // Generate preview content hash
  const allPendingIds = pendingLessons.map(l => l.id).sort();
  const previewHash = await generateContentHash({ lessons: allPendingIds, vocab: vocabList.length });

  return c.json({
    hskLevel,
    currentLive: {
      lessons: liveLessons.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
        contentHash: l.contentHash,
      })),
      lessonCount: liveLessons.length,
      version: previousRelease?.version || 'none',
      lastUpdated: previousRelease?.createdAt || null,
    },
    pendingChanges: {
      newLessons: newLessons.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
        status: l.contentStatus,
        vocabCount: (l.targetVocabulary as string[] || []).length,
      })),
      updatedLessons: updatedLessons.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
        status: l.contentStatus,
      })),
      unchangedLessons: unchangedLessons.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
      })),
      stayingLessons: stayingLessons.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
      })),
      // Live lessons that were modified since last release (need re-ship)
      liveLessonsWithChanges: liveLessonsWithChanges.map(l => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
        updatedAt: l.updatedAt,
      })),
    },
    vocabulary: {
      total: vocabList.length,
      withAudio: vocabWithAudio,
      missingAudio: vocabList.length - vocabWithAudio,
      inLessons: vocabInLessons,
      notInLessons: vocabList.length - vocabInLessons,
      // Quality gate: count vocab that would actually ship
      complete: vocabList.filter(v => v.wordAudioR2Key && v.exampleChinese && v.category).length,
      incomplete: vocabList.filter(v => !v.wordAudioR2Key || !v.exampleChinese || !v.category).length,
      // Full vocab list for selection UI
      items: vocabList.map(v => ({
        id: v.id,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        english: v.english,
        category: v.category,
        hasAudio: !!v.wordAudioR2Key,
        hasExample: !!v.exampleChinese,
        usedInLesson: vocabUsedInLessons.has(v.id),
        isComplete: !!(v.wordAudioR2Key && v.exampleChinese && v.category),
      })),
    },
    suggestedVersion,
    previewHash,
    // Allow shipping if there are lesson changes OR if there are live lessons that were modified
    hasChanges: newLessons.length > 0 || updatedLessons.length > 0 || liveLessonsWithChanges.length > 0,
    canForceShip: liveLessons.length > 0, // Allow re-shipping live lessons
    summary: {
      totalNew: newLessons.length,
      totalUpdated: updatedLessons.length,
      totalStaying: stayingLessons.length + unchangedLessons.length,
      totalLive: liveLessons.length,
      totalLiveWithChanges: liveLessonsWithChanges.length,
    },
    // Stories section for Phase 1 integration
    stories: {
      published: publishedStories.map(s => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        difficulty: s.difficulty,
        estimatedMinutes: s.estimatedMinutes,
        updatedAt: s.updatedAt,
      })),
      drafts: draftStories.map(s => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        difficulty: s.difficulty,
        estimatedMinutes: s.estimatedMinutes,
        updatedAt: s.updatedAt,
      })),
      totalPublished: publishedStories.length,
      totalDrafts: draftStories.length,
    },
  });
});

/**
 * POST /v1/control-center/ship
 * Ship selected lessons and vocabulary to mobile (make them live)
 */
app.post('/ship', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  
  const { 
    hskLevel, 
    lessonIds, 
    storyIds,
    version, 
    releaseNotes,
    vocabMode,
    selectedVocabIds,
  } = await c.req.json<{
    hskLevel: number;
    lessonIds?: string[];
    storyIds?: string[];
    version: string;
    releaseNotes?: string;
    vocabMode?: 'all' | 'lessons_only' | 'selected';
    selectedVocabIds?: string[];
  }>();

  const hasLessons = lessonIds && lessonIds.length > 0;
  const hasStories = storyIds && storyIds.length > 0;

  if (!hskLevel || (!hasLessons && !hasStories) || !version) {
    return c.json({ error: 'hskLevel, version, and at least one of lessonIds/storyIds are required' }, 400);
  }

  logWithContext('info', 'release.ship_start', {
    requestId: c.get('requestId'),
    meta: { hskLevel, lessonCount: lessonIds?.length || 0, storyCount: storyIds?.length || 0, version, vocabMode },
  });

  // Get current live lessons to calculate changes
  const currentLive = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(
      eq(lessons.hskLevel, hskLevel),
      eq(lessons.isPublished, true)
    ));

  const currentLiveIds = currentLive.map(l => l.id);
  
  // Calculate what's being added vs updated (only if we have lessons)
  const effectiveLessonIds = lessonIds || [];
  const newIds = effectiveLessonIds.filter(id => !currentLiveIds.includes(id));
  const updatedIds = effectiveLessonIds.filter(id => currentLiveIds.includes(id));

  // Calculate vocab to ship based on mode
  let vocabCandidates: string[] = [];
  const mode = vocabMode || 'lessons_only';
  
  if (mode === 'all') {
    // Ship all HSK vocab
    const allVocab = await db
      .select({ id: vocabulary.id })
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, hskLevel));
    vocabCandidates = allVocab.map(v => v.id);
  } else if (mode === 'selected' && selectedVocabIds) {
    // Ship only selected vocab
    vocabCandidates = selectedVocabIds;
  } else {
    // Default: lessons_only - ship vocab used in shipped lessons
    const shippedLessons = await db
      .select({ targetVocabulary: lessons.targetVocabulary })
      .from(lessons)
      .where(inArray(lessons.id, lessonIds));
    
    const vocabSet = new Set<string>();
    for (const lesson of shippedLessons) {
      const targetVocab = lesson.targetVocabulary as string[] || [];
      targetVocab.forEach(id => vocabSet.add(id));
    }
    vocabCandidates = Array.from(vocabSet);
  }

  // ═══════════════════════════════════════════════════════════════════
  // QUALITY GATE: Only ship vocab that is COMPLETE
  // Must have: audio, example sentence, and category
  // ═══════════════════════════════════════════════════════════════════
  let vocabToShip: string[] = [];
  let skippedVocab: { id: string; hanzi: string; reason: string }[] = [];
  
  if (vocabCandidates.length > 0) {
    const vocabDetails = await db
      .select({
        id: vocabulary.id,
        hanzi: vocabulary.hanzi,
        wordAudioR2Key: vocabulary.wordAudioR2Key,
        exampleChinese: vocabulary.exampleChinese,
        category: vocabulary.category,
      })
      .from(vocabulary)
      .where(inArray(vocabulary.id, vocabCandidates));
    
    for (const v of vocabDetails) {
      const reasons: string[] = [];
      if (!v.wordAudioR2Key) reasons.push('no audio');
      if (!v.exampleChinese) reasons.push('no example');
      if (!v.category) reasons.push('no category');
      
      if (reasons.length === 0) {
        vocabToShip.push(v.id);
      } else {
        skippedVocab.push({ id: v.id, hanzi: v.hanzi, reason: reasons.join(', ') });
      }
    }
    
    logWithContext('info', 'release.vocab_quality_gate', {
      requestId: c.get('requestId'),
      meta: {
        candidates: vocabCandidates.length,
        passed: vocabToShip.length,
        skipped: skippedVocab.length,
        skippedSample: skippedVocab.slice(0, 10),
      },
    });
  }

  // Count stories to publish/unpublish
  let storiesPublished = 0;
  let storiesUnpublished = 0;

  try {
    // 1. Update all selected lessons to live (if any)
    if (hasLessons && lessonIds) {
      await db
        .update(lessons)
        .set({
          contentStatus: 'live',
          isPublished: true,
          updatedAt: new Date(),
        })
        .where(inArray(lessons.id, lessonIds));
    }

    // 1b. Update all selected stories to published (if any)
    if (hasStories && storyIds) {
      // Get current story states to count changes
      const storyStates = await db
        .select({ id: stories.id, isPublished: stories.isPublished })
        .from(stories)
        .where(inArray(stories.id, storyIds));
      
      storiesPublished = storyStates.filter(s => !s.isPublished).length;
      
      await db
        .update(stories)
        .set({
          contentStatus: 'live',
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(stories.id, storyIds));
    }

    // 2. Generate content hash (including vocab and stories)
    const contentHash = await generateContentHash({ 
      lessonIds: (lessonIds || []).sort(), 
      storyIds: (storyIds || []).sort(),
      vocabIds: vocabToShip.sort(),
      version 
    });

    // 3. Create release record
    const releaseId = nanoid();
    await db.insert(releases).values({
      id: releaseId,
      hskLevel,
      version,
      releasedBy: user?.id || null,
      releaseNotes: releaseNotes || null,
      lessonsAdded: newIds.length,
      lessonsUpdated: updatedIds.length,
      lessonsRemoved: 0, // We don't remove lessons in this flow
      vocabularyAdded: vocabToShip.length,
      lessonIds: lessonIds || [],
      contentHash,
    });

    logWithContext('info', 'release.ship_complete', {
      requestId: c.get('requestId'),
      meta: { 
        releaseId, 
        hskLevel, 
        version, 
        lessonsShipped: lessonIds?.length || 0,
        storiesShipped: storyIds?.length || 0,
        vocabShipped: vocabToShip.length,
        vocabMode: mode,
        new: newIds.length,
        updated: updatedIds.length,
      },
    });

    return c.json({
      success: true,
      release: {
        id: releaseId,
        version,
        hskLevel,
        lessonsShipped: lessonIds?.length || 0,
        lessonsAdded: newIds.length,
        lessonsUpdated: updatedIds.length,
        storiesShipped: storyIds?.length || 0,
        storiesPublished,
        vocabShipped: vocabToShip.length,
        vocabSkipped: skippedVocab.length,
        vocabMode: mode,
      },
      qualityGate: {
        passed: vocabToShip.length,
        skipped: skippedVocab.length,
        skippedItems: skippedVocab.slice(0, 20), // Show first 20 skipped
      },
    });
  } catch (err) {
    logWithContext('error', 'release.ship_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to ship release', details: (err as Error).message }, 500);
  }
});

/**
 * GET /v1/control-center/releases/:hskLevel
 * Get release history for an HSK level
 */
app.get('/releases/:hskLevel', async (c) => {
  const db = drizzle(c.env.DB);
  const hskLevel = parseInt(c.req.param('hskLevel'));

  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
  }

  const releaseHistory = await db
    .select()
    .from(releases)
    .where(eq(releases.hskLevel, hskLevel))
    .orderBy(desc(releases.createdAt))
    .limit(20);

  return c.json({
    hskLevel,
    releases: releaseHistory.map(r => ({
      id: r.id,
      version: r.version,
      releaseNotes: r.releaseNotes,
      lessonsAdded: r.lessonsAdded,
      lessonsUpdated: r.lessonsUpdated,
      lessonsRemoved: r.lessonsRemoved,
      lessonIds: r.lessonIds,
      releasedAt: r.createdAt,
    })),
    totalReleases: releaseHistory.length,
  });
});

/**
 * GET /v1/control-center/all-hsk-status
 * Get shipping status for all HSK levels at once
 */
app.get('/all-hsk-status', async (c) => {
  const db = drizzle(c.env.DB);

  // Get all lessons grouped by HSK level
  const allLessons = await db
    .select({
      hskLevel: lessons.hskLevel,
      contentStatus: lessons.contentStatus,
      isPublished: lessons.isPublished,
    })
    .from(lessons);

  // Get all stories grouped by HSK level
  const allStories = await db
    .select({
      hskLevel: stories.hskLevel,
      isPublished: stories.isPublished,
    })
    .from(stories);

  // Get latest release per HSK level
  const allReleases = await db
    .select()
    .from(releases)
    .orderBy(desc(releases.createdAt));

  // Group by HSK level
  const hskStatus: Record<number, {
    draft: number;
    staging: number;
    live: number;
    latestVersion: string | null;
    lastRelease: string | null;
    hasUnshippedChanges: boolean;
    // Story counts
    storiesDraft: number;
    storiesPublished: number;
  }> = {};

  for (let level = 1; level <= 9; level++) {
    const levelLessons = allLessons.filter(l => l.hskLevel === level);
    const levelStories = allStories.filter(s => s.hskLevel === level);
    const latestRelease = allReleases.find(r => r.hskLevel === level);
    
    const draft = levelLessons.filter(l => l.contentStatus === 'draft' || !l.contentStatus).length;
    const staging = levelLessons.filter(l => l.contentStatus === 'staging').length;
    const live = levelLessons.filter(l => l.contentStatus === 'live' && l.isPublished).length;

    const storiesDraft = levelStories.filter(s => !s.isPublished).length;
    const storiesPublished = levelStories.filter(s => s.isPublished).length;

    hskStatus[level] = {
      draft,
      staging,
      live,
      latestVersion: latestRelease?.version || null,
      lastRelease: latestRelease?.createdAt || null,
      hasUnshippedChanges: draft > 0 || staging > 0 || storiesDraft > 0,
      storiesDraft,
      storiesPublished,
    };
  }

  return c.json({ hskStatus });
});

/**
 * GET /v1/control-center/debug-vocab/:hskLevel
 * Debug endpoint to see what vocabulary is being extracted from lessons
 */
app.get('/debug-vocab/:hskLevel', async (c) => {
  const db = drizzle(c.env.DB);
  const hskLevel = parseInt(c.req.param('hskLevel'));

  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  // Get all lessons for this HSK level
  const lessonList = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      lessonNumber: lessons.lessonNumber,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .where(eq(lessons.hskLevel, hskLevel))
    .orderBy(asc(lessons.lessonNumber));

  // Get blocks for each lesson
  const debugData = [];
  for (const lesson of lessonList) {
    const blocks = await db
      .select({
        id: lessonBlocks.id,
        type: lessonBlocks.type,
        content: lessonBlocks.content,
      })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lesson.id));

    // Extract hanzi from each block
    const extractedHanzi: string[] = [];
    for (const block of blocks) {
      const content = typeof block.content === 'string' 
        ? JSON.parse(block.content) 
        : block.content;
      
      // Simple extraction - look for common fields
      const fields = ['hanzi', 'chinese', 'sentence', 'question', 'correctAnswer', 'heroHanzi', 'focusWord'];
      for (const field of fields) {
        if (content?.[field] && typeof content[field] === 'string') {
          const match = content[field].match(/[\u4e00-\u9fff]+/g);
          if (match) extractedHanzi.push(...match);
        }
      }
      
      // Check arrays
      ['options', 'distractors', 'words', 'focusWords'].forEach(arrField => {
        if (Array.isArray(content?.[arrField])) {
          content[arrField].forEach((item: any) => {
            const text = typeof item === 'string' ? item : item?.hanzi || item?.chinese;
            if (text) {
              const match = text.match(/[\u4e00-\u9fff]+/g);
              if (match) extractedHanzi.push(...match);
            }
          });
        }
      });
    }

    debugData.push({
      lessonId: lesson.id,
      title: lesson.title,
      lessonNumber: lesson.lessonNumber,
      blockCount: blocks.length,
      blockTypes: blocks.map(b => b.type),
      extractedHanzi: [...new Set(extractedHanzi)],
      currentTargetVocab: lesson.targetVocabulary,
    });
  }

  // Get vocabulary for comparison
  const vocabList = await db
    .select({ id: vocabulary.id, hanzi: vocabulary.hanzi })
    .from(vocabulary)
    .where(eq(vocabulary.hskLevel, hskLevel))
    .limit(50);

  // Collect all extracted hanzi from lessons
  const allExtractedHanzi = new Set<string>();
  for (const lesson of debugData) {
    lesson.extractedHanzi.forEach(h => allExtractedHanzi.add(h));
  }

  // Search for these specific hanzi in the ENTIRE vocabulary table (any HSK level)
  const searchResults: Array<{ hanzi: string; hskLevel: number; id: string }> = [];
  if (allExtractedHanzi.size > 0) {
    const allVocab = await db
      .select({ id: vocabulary.id, hanzi: vocabulary.hanzi, hskLevel: vocabulary.hskLevel })
      .from(vocabulary);
    
    for (const v of allVocab) {
      if (allExtractedHanzi.has(v.hanzi)) {
        searchResults.push({ hanzi: v.hanzi, hskLevel: v.hskLevel, id: v.id });
      }
    }
  }

  // Summary: which hanzi were found vs not found
  const foundHanzi = new Set(searchResults.map(r => r.hanzi));
  const notFoundHanzi = [...allExtractedHanzi].filter(h => !foundHanzi.has(h));

  return c.json({
    hskLevel,
    lessonCount: lessonList.length,
    vocabInHskLevel: vocabList.length,
    vocabSample: vocabList.slice(0, 20).map(v => v.hanzi),
    allExtractedHanzi: [...allExtractedHanzi],
    foundInVocab: searchResults.map(r => `${r.hanzi} (HSK ${r.hskLevel})`),
    notFoundInVocab: notFoundHanzi,
    matchingSummary: {
      totalExtracted: allExtractedHanzi.size,
      foundCount: searchResults.length,
      notFoundCount: notFoundHanzi.length,
      wrongHskLevel: searchResults.filter(r => r.hskLevel !== hskLevel).map(r => `${r.hanzi} is HSK ${r.hskLevel}, not ${hskLevel}`),
    },
    lessons: debugData,
  });
});

/**
 * POST /v1/control-center/sync-vocab/:hskLevel
 * Manually sync vocabulary for all lessons in an HSK level
 * Extracts vocabulary from lesson blocks and populates targetVocabulary
 */
app.post('/sync-vocab/:hskLevel', async (c) => {
  const db = drizzle(c.env.DB);
  const hskLevel = parseInt(c.req.param('hskLevel'));

  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
  }

  const vocabExtractor = new VocabExtractor(c.env.DB, c.get('requestId'));

  try {
    const result = await vocabExtractor.syncAllLessons(hskLevel);

    // Verify: Check if lessons actually have targetVocabulary now
    const lessonsAfterSync = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        targetVocabulary: lessons.targetVocabulary,
      })
      .from(lessons)
      .where(eq(lessons.hskLevel, hskLevel));

    const verification = lessonsAfterSync.map(l => ({
      id: l.id,
      title: l.title,
      vocabCount: Array.isArray(l.targetVocabulary) ? l.targetVocabulary.length : 0,
      sample: Array.isArray(l.targetVocabulary) ? l.targetVocabulary.slice(0, 3) : l.targetVocabulary,
    }));

    return c.json({
      success: true,
      hskLevel,
      lessonsSynced: result.synced,
      totalVocabMatched: result.totalVocab,
      errors: result.errors,
      verification, // Show actual state after sync
    });
  } catch (error) {
    logWithContext('error', 'release.sync_vocab_failed', {
      requestId: c.get('requestId'),
      meta: { hskLevel, error: (error as Error).message },
    });
    return c.json({
      error: 'Failed to sync vocabulary',
      details: (error as Error).message,
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// SHOWCASE SECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/showcase-sections
 * Get all showcase sections for management
 */
app.get('/showcase-sections', async (c) => {
  const db = drizzle(c.env.DB);

  const sections = await db
    .select()
    .from(storyShowcaseSections)
    .orderBy(asc(storyShowcaseSections.orderIndex));

  return c.json({
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      icon: s.icon,
      sectionType: s.sectionType,
      config: s.config,
      curatedStoryIds: s.curatedStoryIds,
      orderIndex: s.orderIndex,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    total: sections.length,
  });
});

/**
 * POST /v1/control-center/showcase-sections
 * Create a new showcase section
 */
app.post('/showcase-sections', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{
    title: string;
    subtitle?: string;
    icon?: string;
    sectionType: string;
    config?: Record<string, unknown>;
    curatedStoryIds?: string[];
    orderIndex?: number;
    isActive?: boolean;
  }>();

  if (!body.title || !body.sectionType) {
    return c.json({ error: 'title and sectionType are required' }, 400);
  }

  // Get max order index
  const maxOrder = await db
    .select({ max: sql<number>`max(order_index)` })
    .from(storyShowcaseSections);

  const sectionId = nanoid();
  await db.insert(storyShowcaseSections).values({
    id: sectionId,
    title: body.title,
    subtitle: body.subtitle || null,
    icon: body.icon || null,
    sectionType: body.sectionType,
    config: body.config || null,
    curatedStoryIds: body.curatedStoryIds || null,
    orderIndex: body.orderIndex ?? (maxOrder[0]?.max ?? 0) + 1,
    isActive: body.isActive ?? true,
  });

  logWithContext('info', 'showcase.section_created', {
    requestId: c.get('requestId'),
    meta: { sectionId, title: body.title, type: body.sectionType },
  });

  return c.json({ success: true, id: sectionId });
});

/**
 * PUT /v1/control-center/showcase-sections/:id
 * Update a showcase section
 */
app.put('/showcase-sections/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json<{
    title?: string;
    subtitle?: string;
    icon?: string;
    sectionType?: string;
    config?: Record<string, unknown>;
    curatedStoryIds?: string[];
    orderIndex?: number;
    isActive?: boolean;
  }>();

  // Check section exists
  const existing = await db
    .select()
    .from(storyShowcaseSections)
    .where(eq(storyShowcaseSections.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Section not found' }, 404);
  }

  await db
    .update(storyShowcaseSections)
    .set({
      title: body.title ?? existing[0].title,
      subtitle: body.subtitle !== undefined ? body.subtitle : existing[0].subtitle,
      icon: body.icon !== undefined ? body.icon : existing[0].icon,
      sectionType: body.sectionType ?? existing[0].sectionType,
      config: body.config !== undefined ? body.config : existing[0].config,
      curatedStoryIds: body.curatedStoryIds !== undefined ? body.curatedStoryIds : existing[0].curatedStoryIds,
      orderIndex: body.orderIndex ?? existing[0].orderIndex,
      isActive: body.isActive ?? existing[0].isActive,
      updatedAt: new Date(),
    })
    .where(eq(storyShowcaseSections.id, id));

  logWithContext('info', 'showcase.section_updated', {
    requestId: c.get('requestId'),
    meta: { sectionId: id },
  });

  return c.json({ success: true });
});

/**
 * DELETE /v1/control-center/showcase-sections/:id
 * Delete a showcase section
 */
app.delete('/showcase-sections/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db
    .delete(storyShowcaseSections)
    .where(eq(storyShowcaseSections.id, id));

  logWithContext('info', 'showcase.section_deleted', {
    requestId: c.get('requestId'),
    meta: { sectionId: id },
  });

  return c.json({ success: true });
});

/**
 * POST /v1/control-center/showcase-sections/reorder
 * Reorder showcase sections
 */
app.post('/showcase-sections/reorder', async (c) => {
  const db = drizzle(c.env.DB);
  const { order } = await c.req.json<{
    order: Array<{ id: string; orderIndex: number }>;
  }>();

  if (!order || !Array.isArray(order)) {
    return c.json({ error: 'order array is required' }, 400);
  }

  // Update each section's order
  for (const item of order) {
    await db
      .update(storyShowcaseSections)
      .set({ orderIndex: item.orderIndex, updatedAt: new Date() })
      .where(eq(storyShowcaseSections.id, item.id));
  }

  logWithContext('info', 'showcase.sections_reordered', {
    requestId: c.get('requestId'),
    meta: { count: order.length },
  });

  return c.json({ success: true });
});

export default app;

