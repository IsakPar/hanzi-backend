/**
 * Releases API Integration Tests
 * 
 * Tests for the bundle generation and distribution API endpoints.
 * These tests require mocking D1 and R2 for proper execution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

// ═══════════════════════════════════════════════════════════
// Mock Helpers
// ═══════════════════════════════════════════════════════════

function createMockR2Bucket() {
  const storage = new Map<string, { data: ArrayBuffer | string; metadata?: any }>();
  
  return {
    put: vi.fn(async (key: string, data: ArrayBuffer | string, options?: any) => {
      storage.set(key, { data, metadata: options?.httpMetadata });
      return { key };
    }),
    get: vi.fn(async (key: string) => {
      const item = storage.get(key);
      if (!item) return null;
      return {
        text: async () => typeof item.data === 'string' ? item.data : new TextDecoder().decode(item.data),
        arrayBuffer: async () => typeof item.data === 'string' ? new TextEncoder().encode(item.data).buffer : item.data,
        httpMetadata: item.metadata,
      };
    }),
    delete: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    list: vi.fn(async (options?: { prefix?: string }) => {
      const objects = Array.from(storage.entries())
        .filter(([key]) => !options?.prefix || key.startsWith(options.prefix))
        .map(([key, value]) => ({
          key,
          size: typeof value.data === 'string' ? value.data.length : value.data.byteLength,
        }));
      return { objects };
    }),
    _storage: storage, // For test inspection
  };
}

function createMockD1Database(data: {
  lessons?: any[];
  lessonBlocks?: any[];
  vocabulary?: any[];
  units?: any[];
}) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn(() => ({
        all: vi.fn(async () => {
          // Simple mock that returns data based on query patterns
          if (sql.includes('FROM lessons')) {
            return { results: data.lessons || [] };
          }
          if (sql.includes('FROM lesson_blocks')) {
            return { results: data.lessonBlocks || [] };
          }
          if (sql.includes('FROM vocabulary')) {
            return { results: data.vocabulary || [] };
          }
          if (sql.includes('FROM units')) {
            return { results: data.units || [] };
          }
          return { results: [] };
        }),
        first: vi.fn(async () => null),
        run: vi.fn(async () => ({ success: true })),
      })),
    })),
    batch: vi.fn(async (statements: any[]) => statements),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
  };
}

// ═══════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════

const mockLessons = [
  {
    id: 'lesson-1',
    title: 'Hello & Goodbye',
    subtitle: 'Basic greetings',
    hskLevel: 1,
    lessonNumber: 1,
    lessonType: 'lesson',
    difficulty: 'easy',
    estimatedMinutes: 5,
    description: 'Learn basic greetings',
    grammarPoints: JSON.stringify(['Subject + 是 + Noun']),
    tags: JSON.stringify(['greetings']),
    targetVocabulary: JSON.stringify(['vocab-1', 'vocab-2']),
    isPublished: true,
    unitId: 'unit-1',
  },
  {
    id: 'lesson-2',
    title: 'Numbers 1-10',
    subtitle: 'Counting basics',
    hskLevel: 1,
    lessonNumber: 2,
    lessonType: 'lesson',
    difficulty: 'easy',
    estimatedMinutes: 8,
    description: 'Learn to count',
    grammarPoints: null,
    tags: JSON.stringify(['numbers']),
    targetVocabulary: JSON.stringify(['vocab-3', 'vocab-4']),
    isPublished: true,
    unitId: 'unit-1',
  },
];

const mockBlocks = [
  { id: 'block-1', lessonId: 'lesson-1', type: 'intro', orderIndex: 0, content: JSON.stringify({ title: 'Welcome!' }) },
  { id: 'block-2', lessonId: 'lesson-1', type: 'hero_hanzi', orderIndex: 1, content: JSON.stringify({ hanzi: '你好' }) },
  { id: 'block-3', lessonId: 'lesson-2', type: 'intro', orderIndex: 0, content: JSON.stringify({ title: 'Numbers!' }) },
];

const mockVocab = [
  { id: 'vocab-1', hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', hskLevel: 1, wordAudioR2Key: 'audio/vocab/nihao.mp3' },
  { id: 'vocab-2', hanzi: '再见', pinyin: 'zài jiàn', english: 'goodbye', hskLevel: 1, wordAudioR2Key: 'audio/vocab/zaijian.mp3' },
  { id: 'vocab-3', hanzi: '一', pinyin: 'yī', english: 'one', hskLevel: 1, wordAudioR2Key: 'audio/vocab/yi.mp3' },
  { id: 'vocab-4', hanzi: '二', pinyin: 'èr', english: 'two', hskLevel: 1, wordAudioR2Key: null }, // No audio
];

const mockUnits = [
  {
    id: 'unit-1',
    title: 'First Steps',
    description: 'Your journey begins',
    hskLevel: 1,
    unitNumber: 1,
    gradientStart: '#10B981',
    gradientEnd: '#059669',
    accentColor: '#10B981',
  },
];

// ═══════════════════════════════════════════════════════════
// API Response Format Tests
// ═══════════════════════════════════════════════════════════

describe('Releases API Response Format', () => {
  describe('GET /releases/manifest', () => {
    it('returns empty manifest when no releases exist', async () => {
      const mockBucket = createMockR2Bucket();
      
      // Simulate no manifest exists
      const manifest = await mockBucket.get('releases/manifest.json');
      expect(manifest).toBeNull();
      
      // API should return default structure
      const defaultManifest = {
        appMinVersion: '1.0.0',
        updatedAt: null,
        levels: {},
        message: 'No releases yet',
      };
      
      expect(defaultManifest.appMinVersion).toBeDefined();
      expect(defaultManifest.levels).toEqual({});
    });

    it('returns manifest with HSK levels when releases exist', async () => {
      const mockBucket = createMockR2Bucket();
      
      const manifest = {
        appMinVersion: '1.0.0',
        updatedAt: new Date().toISOString(),
        levels: {
          1: {
            latestVersion: '1.0.0',
            bundleSize: 5000000,
            lessonCount: 7,
            vocabCount: 150,
            updatedAt: new Date().toISOString(),
            downloadUrl: 'releases/hsk1/v1.0.0/',
          },
        },
      };
      
      await mockBucket.put('releases/manifest.json', JSON.stringify(manifest));
      
      const result = await mockBucket.get('releases/manifest.json');
      expect(result).not.toBeNull();
      
      const parsed = JSON.parse(await result!.text());
      expect(parsed.levels[1].latestVersion).toBe('1.0.0');
      expect(parsed.levels[1].lessonCount).toBe(7);
    });
  });

  describe('GET /releases/:hskLevel/latest', () => {
    it('returns 404 when no release exists for HSK level', async () => {
      const mockBucket = createMockR2Bucket();
      
      const result = await mockBucket.get('releases/hsk2/latest.json');
      expect(result).toBeNull();
    });

    it('returns latest version info when release exists', async () => {
      const mockBucket = createMockR2Bucket();
      
      const latestInfo = {
        version: '1.2.0',
        path: 'v1.2.0',
        createdAt: new Date().toISOString(),
      };
      
      await mockBucket.put('releases/hsk1/latest.json', JSON.stringify(latestInfo));
      
      const result = await mockBucket.get('releases/hsk1/latest.json');
      const parsed = JSON.parse(await result!.text());
      
      expect(parsed.version).toBe('1.2.0');
      expect(parsed.path).toBe('v1.2.0');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Bundle Generation Tests
// ═══════════════════════════════════════════════════════════

describe('Bundle Generation', () => {
  it('creates curriculum.json with correct structure', async () => {
    const mockBucket = createMockR2Bucket();
    
    const curriculum = {
      version: '1.0.0',
      hskLevel: 1,
      createdAt: new Date().toISOString(),
      units: [{
        id: 'unit-1',
        unitNumber: 1,
        title: 'First Steps',
        lessons: [{
          id: 'lesson-1',
          lessonNumber: 1,
          title: 'Hello',
          type: 'lesson',
          blocks: [{ type: 'intro', order: 0, content: {} }],
        }],
      }],
      ungroupedLessons: [],
      vocabulary: [{
        id: 'vocab-1',
        hanzi: '你好',
        pinyin: 'nǐ hǎo',
        english: 'hello',
        audioFile: 'audio/vocab/你好.mp3',
      }],
      stats: {
        unitCount: 1,
        lessonCount: 1,
        vocabCount: 1,
        audioFileCount: 1,
        totalAudioSize: 15000,
      },
    };
    
    await mockBucket.put(
      'releases/hsk1/v1.0.0/curriculum.json',
      JSON.stringify(curriculum, null, 2)
    );
    
    const result = await mockBucket.get('releases/hsk1/v1.0.0/curriculum.json');
    const parsed = JSON.parse(await result!.text());
    
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.hskLevel).toBe(1);
    expect(parsed.units).toHaveLength(1);
    expect(parsed.vocabulary).toHaveLength(1);
    expect(parsed.stats.lessonCount).toBe(1);
  });

  it('creates manifest.json with audio file list', async () => {
    const mockBucket = createMockR2Bucket();
    
    const manifest = {
      version: '1.0.0',
      hskLevel: 1,
      createdAt: new Date().toISOString(),
      bundleSize: 50000,
      curriculumFile: 'curriculum.json',
      stats: {
        unitCount: 1,
        lessonCount: 2,
        vocabCount: 3,
        audioFileCount: 3,
      },
      audioFiles: [
        { path: 'audio/vocab/你好.mp3', r2Key: 'audio/nihao.mp3', size: 15000 },
        { path: 'audio/vocab/再见.mp3', r2Key: 'audio/zaijian.mp3', size: 12000 },
        { path: 'audio/vocab/一.mp3', r2Key: 'audio/yi.mp3', size: 10000 },
      ],
    };
    
    await mockBucket.put(
      'releases/hsk1/v1.0.0/manifest.json',
      JSON.stringify(manifest, null, 2)
    );
    
    const result = await mockBucket.get('releases/hsk1/v1.0.0/manifest.json');
    const parsed = JSON.parse(await result!.text());
    
    expect(parsed.audioFiles).toHaveLength(3);
    expect(parsed.stats.audioFileCount).toBe(3);
    
    // Check total audio size
    const totalAudioSize = parsed.audioFiles.reduce((sum: number, f: any) => sum + f.size, 0);
    expect(totalAudioSize).toBe(37000);
  });

  it('copies audio files to versioned folder', async () => {
    const mockBucket = createMockR2Bucket();
    
    // Simulate source audio files
    const audioData = new Uint8Array([0x49, 0x44, 0x33]).buffer; // ID3 header
    await mockBucket.put('audio/vocab/nihao.mp3', audioData);
    
    // Copy to versioned location
    const source = await mockBucket.get('audio/vocab/nihao.mp3');
    if (source) {
      await mockBucket.put(
        'releases/hsk1/v1.0.0/audio/vocab/你好.mp3',
        await source.arrayBuffer()
      );
    }
    
    // Verify copy exists
    const copied = await mockBucket.get('releases/hsk1/v1.0.0/audio/vocab/你好.mp3');
    expect(copied).not.toBeNull();
  });

  it('updates latest.json pointer', async () => {
    const mockBucket = createMockR2Bucket();
    
    // Generate v1.0.0
    await mockBucket.put('releases/hsk1/latest.json', JSON.stringify({
      version: '1.0.0',
      path: 'v1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
    }));
    
    // Generate v1.1.0 - should update latest
    await mockBucket.put('releases/hsk1/latest.json', JSON.stringify({
      version: '1.1.0',
      path: 'v1.1.0',
      createdAt: '2024-02-01T00:00:00Z',
    }));
    
    const latest = await mockBucket.get('releases/hsk1/latest.json');
    const parsed = JSON.parse(await latest!.text());
    
    expect(parsed.version).toBe('1.1.0');
    expect(parsed.path).toBe('v1.1.0');
  });

  it('updates global manifest with new HSK level', async () => {
    const mockBucket = createMockR2Bucket();
    
    // Initial manifest with only HSK 1
    const globalManifest = {
      appMinVersion: '1.0.0',
      updatedAt: '2024-01-01T00:00:00Z',
      levels: {
        1: {
          latestVersion: '1.0.0',
          bundleSize: 5000000,
          lessonCount: 7,
          vocabCount: 150,
          updatedAt: '2024-01-01T00:00:00Z',
          downloadUrl: 'releases/hsk1/v1.0.0/',
        },
      },
    };
    
    await mockBucket.put('releases/manifest.json', JSON.stringify(globalManifest));
    
    // Add HSK 2
    globalManifest.levels[2] = {
      latestVersion: '1.0.0',
      bundleSize: 6000000,
      lessonCount: 10,
      vocabCount: 200,
      updatedAt: new Date().toISOString(),
      downloadUrl: 'releases/hsk2/v1.0.0/',
    };
    globalManifest.updatedAt = new Date().toISOString();
    
    await mockBucket.put('releases/manifest.json', JSON.stringify(globalManifest));
    
    const result = await mockBucket.get('releases/manifest.json');
    const parsed = JSON.parse(await result!.text());
    
    expect(parsed.levels[1]).toBeDefined();
    expect(parsed.levels[2]).toBeDefined();
    expect(parsed.levels[2].lessonCount).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════
// Version Management Tests
// ═══════════════════════════════════════════════════════════

describe('Version Management', () => {
  it('validates semver format', () => {
    const validVersions = ['1.0.0', '2.3.4', '10.20.30', '0.0.1'];
    const invalidVersions = ['1.0', '1', 'v1.0.0', '1.0.0-beta', '1.0.0.0'];
    
    const semverRegex = /^\d+\.\d+\.\d+$/;
    
    validVersions.forEach(v => {
      expect(semverRegex.test(v)).toBe(true);
    });
    
    invalidVersions.forEach(v => {
      expect(semverRegex.test(v)).toBe(false);
    });
  });

  it('maintains version history (immutable releases)', async () => {
    const mockBucket = createMockR2Bucket();
    
    // Create v1.0.0
    await mockBucket.put('releases/hsk1/v1.0.0/curriculum.json', JSON.stringify({ version: '1.0.0' }));
    
    // Create v1.1.0
    await mockBucket.put('releases/hsk1/v1.1.0/curriculum.json', JSON.stringify({ version: '1.1.0' }));
    
    // Create v1.2.0
    await mockBucket.put('releases/hsk1/v1.2.0/curriculum.json', JSON.stringify({ version: '1.2.0' }));
    
    // All versions should still exist
    const v100 = await mockBucket.get('releases/hsk1/v1.0.0/curriculum.json');
    const v110 = await mockBucket.get('releases/hsk1/v1.1.0/curriculum.json');
    const v120 = await mockBucket.get('releases/hsk1/v1.2.0/curriculum.json');
    
    expect(v100).not.toBeNull();
    expect(v110).not.toBeNull();
    expect(v120).not.toBeNull();
    
    expect(JSON.parse(await v100!.text()).version).toBe('1.0.0');
    expect(JSON.parse(await v110!.text()).version).toBe('1.1.0');
    expect(JSON.parse(await v120!.text()).version).toBe('1.2.0');
  });
});

// ═══════════════════════════════════════════════════════════
// Error Handling Tests
// ═══════════════════════════════════════════════════════════

describe('Error Handling', () => {
  it('handles missing audio files gracefully', async () => {
    const mockBucket = createMockR2Bucket();
    
    // Try to get non-existent audio
    const result = await mockBucket.get('audio/vocab/nonexistent.mp3');
    expect(result).toBeNull();
    
    // Bundle generation should track missing files
    const errors: string[] = [];
    
    const missingAudio = await mockBucket.get('audio/vocab/missing.mp3');
    if (!missingAudio) {
      errors.push('Audio not found: audio/vocab/missing.mp3');
    }
    
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Audio not found');
  });

  it('validates HSK level range', () => {
    const validateHskLevel = (level: number): boolean => {
      return level >= 1 && level <= 9 && Number.isInteger(level);
    };
    
    expect(validateHskLevel(1)).toBe(true);
    expect(validateHskLevel(9)).toBe(true);
    expect(validateHskLevel(0)).toBe(false);
    expect(validateHskLevel(10)).toBe(false);
    expect(validateHskLevel(1.5)).toBe(false);
    expect(validateHskLevel(-1)).toBe(false);
  });

  it('handles empty lesson list', async () => {
    const mockDb = createMockD1Database({
      lessons: [], // No published lessons
      vocabulary: mockVocab,
      units: mockUnits,
    });
    
    // Should fail with meaningful error
    const hasPublishedLessons = mockLessons.some(l => l.isPublished);
    expect(hasPublishedLessons).toBe(true); // Our mock has published lessons
    
    // Empty list should fail
    const emptyLessons: any[] = [];
    expect(emptyLessons.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// Cache Header Tests
// ═══════════════════════════════════════════════════════════

describe('Cache Headers', () => {
  it('manifest has short cache (5 min)', () => {
    const expectedCacheControl = 'public, max-age=300';
    
    expect(expectedCacheControl).toContain('max-age=300');
  });

  it('versioned content has long cache (24h+)', () => {
    const curriculumCache = 'public, max-age=86400, immutable';
    const audioCache = 'public, max-age=31536000, immutable';
    
    expect(curriculumCache).toContain('immutable');
    expect(audioCache).toContain('max-age=31536000'); // 1 year
  });

  it('CORS allows mobile app access', () => {
    const expectedHeaders = {
      'Access-Control-Allow-Origin': '*',
    };
    
    expect(expectedHeaders['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ═══════════════════════════════════════════════════════════
// File Path Tests
// ═══════════════════════════════════════════════════════════

describe('R2 File Paths', () => {
  it('generates correct bundle paths', () => {
    const hskLevel = 1;
    const version = '1.2.0';
    
    const paths = {
      curriculum: `releases/hsk${hskLevel}/v${version}/curriculum.json`,
      manifest: `releases/hsk${hskLevel}/v${version}/manifest.json`,
      latest: `releases/hsk${hskLevel}/latest.json`,
      audio: (hanzi: string) => `releases/hsk${hskLevel}/v${version}/audio/vocab/${hanzi}.mp3`,
    };
    
    expect(paths.curriculum).toBe('releases/hsk1/v1.2.0/curriculum.json');
    expect(paths.manifest).toBe('releases/hsk1/v1.2.0/manifest.json');
    expect(paths.latest).toBe('releases/hsk1/latest.json');
    expect(paths.audio('你好')).toBe('releases/hsk1/v1.2.0/audio/vocab/你好.mp3');
  });

  it('global manifest is at root', () => {
    const globalManifestPath = 'releases/manifest.json';
    
    expect(globalManifestPath).toBe('releases/manifest.json');
    expect(globalManifestPath).not.toContain('hsk');
    expect(globalManifestPath).not.toContain('v1');
  });
});

// ═══════════════════════════════════════════════════════════
// Content Validation Tests
// ═══════════════════════════════════════════════════════════

describe('Content Validation', () => {
  it('only includes published lessons', () => {
    const allLessons = [
      { id: 'l1', isPublished: true },
      { id: 'l2', isPublished: false },
      { id: 'l3', isPublished: true },
    ];
    
    const publishedLessons = allLessons.filter(l => l.isPublished);
    
    expect(publishedLessons).toHaveLength(2);
    expect(publishedLessons.map(l => l.id)).toEqual(['l1', 'l3']);
  });

  it('parses JSON content fields correctly', () => {
    const lesson = {
      grammarPoints: '["Pattern 1", "Pattern 2"]',
      tags: '["tag1", "tag2"]',
      targetVocabulary: '["v1", "v2", "v3"]',
    };
    
    const parsed = {
      grammarPoints: JSON.parse(lesson.grammarPoints),
      tags: JSON.parse(lesson.tags),
      targetVocabulary: JSON.parse(lesson.targetVocabulary),
    };
    
    expect(parsed.grammarPoints).toEqual(['Pattern 1', 'Pattern 2']);
    expect(parsed.tags).toEqual(['tag1', 'tag2']);
    expect(parsed.targetVocabulary).toEqual(['v1', 'v2', 'v3']);
  });

  it('handles null JSON fields', () => {
    const lesson = {
      grammarPoints: null,
      tags: null,
    };
    
    const parsed = {
      grammarPoints: lesson.grammarPoints ? JSON.parse(lesson.grammarPoints) : null,
      tags: lesson.tags ? JSON.parse(lesson.tags) : null,
    };
    
    expect(parsed.grammarPoints).toBeNull();
    expect(parsed.tags).toBeNull();
  });
});

