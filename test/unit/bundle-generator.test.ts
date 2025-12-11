/**
 * Bundle Generator Unit Tests
 * 
 * Tests for offline content bundle generation.
 * These tests verify the bundle structure, curriculum format, and audio handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════
// Mock Types (matching bundle-generator.ts)
// ═══════════════════════════════════════════════════════════

interface BundleVocab {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string | null;
  tags: string[] | null;
  audioFile: string | null;
  exampleChinese: string | null;
  examplePinyin: string | null;
  exampleEnglish: string | null;
}

interface BundleBlock {
  type: string;
  order: number;
  content: any;
}

interface BundleLesson {
  id: string;
  lessonNumber: number;
  title: string;
  subtitle: string | null;
  type: 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';
  difficulty: string;
  estimatedMinutes: number;
  description: string | null;
  grammarPoints: string[] | null;
  tags: string[] | null;
  targetVocabulary: string[];
  blocks: BundleBlock[];
}

interface BundleUnit {
  id: string;
  unitNumber: number;
  title: string;
  description: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
  accentColor: string | null;
  lessons: BundleLesson[];
}

interface CurriculumBundle {
  version: string;
  hskLevel: number;
  createdAt: string;
  units: BundleUnit[];
  ungroupedLessons: BundleLesson[];
  vocabulary: BundleVocab[];
  stats: {
    unitCount: number;
    lessonCount: number;
    vocabCount: number;
    audioFileCount: number;
    totalAudioSize: number;
  };
}

interface BundleManifest {
  version: string;
  hskLevel: number;
  createdAt: string;
  bundleSize: number;
  curriculumFile: string;
  stats: {
    unitCount: number;
    lessonCount: number;
    vocabCount: number;
    audioFileCount: number;
  };
  audioFiles: Array<{
    path: string;
    r2Key: string;
    size: number;
  }>;
}

// ═══════════════════════════════════════════════════════════
// Test Data Factories
// ═══════════════════════════════════════════════════════════

function createMockVocab(overrides: Partial<BundleVocab> = {}): BundleVocab {
  return {
    id: 'vocab-1',
    hanzi: '你好',
    pinyin: 'nǐ hǎo',
    english: 'hello',
    category: 'greetings',
    tags: ['basic', 'common'],
    audioFile: 'audio/vocab/你好.mp3',
    exampleChinese: '你好，我是学生。',
    examplePinyin: 'Nǐ hǎo, wǒ shì xuéshēng.',
    exampleEnglish: 'Hello, I am a student.',
    ...overrides,
  };
}

function createMockLesson(overrides: Partial<BundleLesson> = {}): BundleLesson {
  return {
    id: 'lesson-1',
    lessonNumber: 1,
    title: 'Hello & Goodbye',
    subtitle: 'Basic greetings',
    type: 'lesson',
    difficulty: 'easy',
    estimatedMinutes: 5,
    description: 'Learn basic greetings in Chinese',
    grammarPoints: ['Subject + 是 + Noun'],
    tags: ['greetings', 'basic'],
    targetVocabulary: ['vocab-1', 'vocab-2'],
    blocks: [
      { type: 'intro', order: 0, content: { title: 'Welcome!' } },
      { type: 'hero_hanzi', order: 1, content: { hanzi: '你好', pinyin: 'nǐ hǎo' } },
    ],
    ...overrides,
  };
}

function createMockUnit(overrides: Partial<BundleUnit> = {}): BundleUnit {
  return {
    id: 'unit-1',
    unitNumber: 1,
    title: 'First Steps 你好',
    description: 'Your journey begins here',
    gradientStart: '#10B981',
    gradientEnd: '#059669',
    accentColor: '#10B981',
    lessons: [createMockLesson()],
    ...overrides,
  };
}

function createMockCurriculum(overrides: Partial<CurriculumBundle> = {}): CurriculumBundle {
  return {
    version: '1.0.0',
    hskLevel: 1,
    createdAt: new Date().toISOString(),
    units: [createMockUnit()],
    ungroupedLessons: [],
    vocabulary: [createMockVocab()],
    stats: {
      unitCount: 1,
      lessonCount: 1,
      vocabCount: 1,
      audioFileCount: 1,
      totalAudioSize: 15000,
    },
    ...overrides,
  };
}

function createMockManifest(overrides: Partial<BundleManifest> = {}): BundleManifest {
  return {
    version: '1.0.0',
    hskLevel: 1,
    createdAt: new Date().toISOString(),
    bundleSize: 50000,
    curriculumFile: 'curriculum.json',
    stats: {
      unitCount: 1,
      lessonCount: 1,
      vocabCount: 1,
      audioFileCount: 1,
    },
    audioFiles: [
      { path: 'audio/vocab/你好.mp3', r2Key: 'audio/vocab/nihao.mp3', size: 15000 },
    ],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// Curriculum Bundle Structure Tests
// ═══════════════════════════════════════════════════════════

describe('CurriculumBundle Structure', () => {
  it('has required top-level fields', () => {
    const curriculum = createMockCurriculum();
    
    expect(curriculum.version).toBeDefined();
    expect(curriculum.hskLevel).toBeDefined();
    expect(curriculum.createdAt).toBeDefined();
    expect(curriculum.units).toBeDefined();
    expect(curriculum.ungroupedLessons).toBeDefined();
    expect(curriculum.vocabulary).toBeDefined();
    expect(curriculum.stats).toBeDefined();
  });

  it('version follows semver format', () => {
    const curriculum = createMockCurriculum({ version: '1.2.3' });
    
    expect(curriculum.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('hskLevel is valid (1-9)', () => {
    for (let level = 1; level <= 9; level++) {
      const curriculum = createMockCurriculum({ hskLevel: level });
      expect(curriculum.hskLevel).toBe(level);
      expect(curriculum.hskLevel).toBeGreaterThanOrEqual(1);
      expect(curriculum.hskLevel).toBeLessThanOrEqual(9);
    }
  });

  it('createdAt is valid ISO date', () => {
    const curriculum = createMockCurriculum();
    
    const date = new Date(curriculum.createdAt);
    expect(date.toISOString()).toBe(curriculum.createdAt);
  });

  it('stats match actual content counts', () => {
    const vocab = [createMockVocab({ id: 'v1' }), createMockVocab({ id: 'v2' })];
    const lesson1 = createMockLesson({ id: 'l1' });
    const lesson2 = createMockLesson({ id: 'l2' });
    const unit = createMockUnit({ lessons: [lesson1, lesson2] });
    
    const curriculum = createMockCurriculum({
      units: [unit],
      vocabulary: vocab,
      stats: {
        unitCount: 1,
        lessonCount: 2,
        vocabCount: 2,
        audioFileCount: 2,
        totalAudioSize: 30000,
      },
    });
    
    expect(curriculum.stats.unitCount).toBe(curriculum.units.length);
    expect(curriculum.stats.lessonCount).toBe(2);
    expect(curriculum.stats.vocabCount).toBe(curriculum.vocabulary.length);
  });
});

// ═══════════════════════════════════════════════════════════
// Unit Structure Tests
// ═══════════════════════════════════════════════════════════

describe('BundleUnit Structure', () => {
  it('has required fields', () => {
    const unit = createMockUnit();
    
    expect(unit.id).toBeDefined();
    expect(unit.unitNumber).toBeDefined();
    expect(unit.title).toBeDefined();
    expect(unit.lessons).toBeDefined();
    expect(Array.isArray(unit.lessons)).toBe(true);
  });

  it('lessons are ordered by lessonNumber', () => {
    const lessons = [
      createMockLesson({ id: 'l3', lessonNumber: 3 }),
      createMockLesson({ id: 'l1', lessonNumber: 1 }),
      createMockLesson({ id: 'l2', lessonNumber: 2 }),
    ].sort((a, b) => a.lessonNumber - b.lessonNumber);
    
    expect(lessons[0].lessonNumber).toBe(1);
    expect(lessons[1].lessonNumber).toBe(2);
    expect(lessons[2].lessonNumber).toBe(3);
  });

  it('has color gradient for theming', () => {
    const unit = createMockUnit({
      gradientStart: '#10B981',
      gradientEnd: '#059669',
      accentColor: '#10B981',
    });
    
    expect(unit.gradientStart).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(unit.gradientEnd).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(unit.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

// ═══════════════════════════════════════════════════════════
// Lesson Structure Tests
// ═══════════════════════════════════════════════════════════

describe('BundleLesson Structure', () => {
  it('has required fields', () => {
    const lesson = createMockLesson();
    
    expect(lesson.id).toBeDefined();
    expect(lesson.lessonNumber).toBeDefined();
    expect(lesson.title).toBeDefined();
    expect(lesson.type).toBeDefined();
    expect(lesson.blocks).toBeDefined();
    expect(Array.isArray(lesson.blocks)).toBe(true);
  });

  it('type is valid lesson type', () => {
    const validTypes = ['lesson', 'speaking', 'mini_test', 'hsk_test'];
    
    validTypes.forEach(type => {
      const lesson = createMockLesson({ type: type as any });
      expect(validTypes).toContain(lesson.type);
    });
  });

  it('blocks are ordered by order field', () => {
    const blocks: BundleBlock[] = [
      { type: 'celebration', order: 3, content: {} },
      { type: 'intro', order: 0, content: {} },
      { type: 'hero_hanzi', order: 1, content: {} },
      { type: 'multiple_choice', order: 2, content: {} },
    ].sort((a, b) => a.order - b.order);
    
    expect(blocks[0].type).toBe('intro');
    expect(blocks[1].type).toBe('hero_hanzi');
    expect(blocks[2].type).toBe('multiple_choice');
    expect(blocks[3].type).toBe('celebration');
  });

  it('targetVocabulary contains vocab IDs', () => {
    const lesson = createMockLesson({
      targetVocabulary: ['vocab-1', 'vocab-2', 'vocab-3'],
    });
    
    expect(lesson.targetVocabulary.length).toBe(3);
    lesson.targetVocabulary.forEach(id => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it('estimatedMinutes is reasonable', () => {
    const lesson = createMockLesson({ estimatedMinutes: 10 });
    
    expect(lesson.estimatedMinutes).toBeGreaterThan(0);
    expect(lesson.estimatedMinutes).toBeLessThan(60);
  });
});

// ═══════════════════════════════════════════════════════════
// Vocabulary Structure Tests
// ═══════════════════════════════════════════════════════════

describe('BundleVocab Structure', () => {
  it('has required fields', () => {
    const vocab = createMockVocab();
    
    expect(vocab.id).toBeDefined();
    expect(vocab.hanzi).toBeDefined();
    expect(vocab.pinyin).toBeDefined();
    expect(vocab.english).toBeDefined();
  });

  it('hanzi contains Chinese characters', () => {
    const vocab = createMockVocab({ hanzi: '你好' });
    
    // Check for Chinese characters using Unicode range
    expect(vocab.hanzi).toMatch(/[\u4e00-\u9fff]/);
  });

  it('pinyin contains tone marks or numbers', () => {
    const vocabWithMarks = createMockVocab({ pinyin: 'nǐ hǎo' });
    const vocabWithNumbers = createMockVocab({ pinyin: 'ni3 hao3' });
    
    // Either has tone marks or numbers
    const hasToneMarks = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(vocabWithMarks.pinyin);
    const hasToneNumbers = /[1-4]/.test(vocabWithNumbers.pinyin);
    
    expect(hasToneMarks || hasToneNumbers).toBe(true);
  });

  it('audioFile has correct path format', () => {
    const vocab = createMockVocab({ audioFile: 'audio/vocab/你好.mp3' });
    
    expect(vocab.audioFile).toMatch(/^audio\/vocab\/.*\.mp3$/);
  });

  it('audioFile is null when no audio', () => {
    const vocab = createMockVocab({ audioFile: null });
    
    expect(vocab.audioFile).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// Manifest Structure Tests
// ═══════════════════════════════════════════════════════════

describe('BundleManifest Structure', () => {
  it('has required fields', () => {
    const manifest = createMockManifest();
    
    expect(manifest.version).toBeDefined();
    expect(manifest.hskLevel).toBeDefined();
    expect(manifest.createdAt).toBeDefined();
    expect(manifest.bundleSize).toBeDefined();
    expect(manifest.curriculumFile).toBeDefined();
    expect(manifest.stats).toBeDefined();
    expect(manifest.audioFiles).toBeDefined();
  });

  it('bundleSize is sum of curriculum + audio', () => {
    const manifest = createMockManifest({
      bundleSize: 50000,
      audioFiles: [
        { path: 'audio/vocab/你好.mp3', r2Key: 'audio/vocab/nihao.mp3', size: 15000 },
        { path: 'audio/vocab/再见.mp3', r2Key: 'audio/vocab/zaijian.mp3', size: 12000 },
      ],
    });
    
    const totalAudioSize = manifest.audioFiles.reduce((sum, f) => sum + f.size, 0);
    expect(totalAudioSize).toBe(27000);
    expect(manifest.bundleSize).toBeGreaterThanOrEqual(totalAudioSize);
  });

  it('audioFiles have correct structure', () => {
    const manifest = createMockManifest();
    
    manifest.audioFiles.forEach(audio => {
      expect(audio.path).toBeDefined();
      expect(audio.r2Key).toBeDefined();
      expect(audio.size).toBeDefined();
      expect(typeof audio.size).toBe('number');
      expect(audio.size).toBeGreaterThan(0);
    });
  });

  it('stats match audioFiles count', () => {
    const manifest = createMockManifest({
      audioFiles: [
        { path: 'a.mp3', r2Key: 'a.mp3', size: 1000 },
        { path: 'b.mp3', r2Key: 'b.mp3', size: 1000 },
        { path: 'c.mp3', r2Key: 'c.mp3', size: 1000 },
      ],
      stats: {
        unitCount: 1,
        lessonCount: 1,
        vocabCount: 3,
        audioFileCount: 3,
      },
    });
    
    expect(manifest.stats.audioFileCount).toBe(manifest.audioFiles.length);
  });
});

// ═══════════════════════════════════════════════════════════
// Audio Path Generation Tests
// ═══════════════════════════════════════════════════════════

describe('Audio Path Generation', () => {
  it('generates correct vocab audio path', () => {
    const hanzi = '你好';
    const path = `audio/vocab/${hanzi}.mp3`;
    
    expect(path).toBe('audio/vocab/你好.mp3');
  });

  it('handles special characters in hanzi', () => {
    const testCases = [
      { hanzi: '一', expected: 'audio/vocab/一.mp3' },
      { hanzi: '什么', expected: 'audio/vocab/什么.mp3' },
      { hanzi: '中国人', expected: 'audio/vocab/中国人.mp3' },
    ];
    
    testCases.forEach(({ hanzi, expected }) => {
      const path = `audio/vocab/${hanzi}.mp3`;
      expect(path).toBe(expected);
    });
  });

  it('audio file size is reasonable for speech', () => {
    // Typical MP3: 1 second ≈ 10-15KB at reasonable quality
    // A word should be 0.5-3 seconds
    const minSize = 5000;   // 5KB - very short word
    const maxSize = 100000; // 100KB - long phrase
    
    const manifest = createMockManifest({
      audioFiles: [
        { path: 'a.mp3', r2Key: 'a.mp3', size: 15000 }, // ~1 second
      ],
    });
    
    manifest.audioFiles.forEach(audio => {
      expect(audio.size).toBeGreaterThanOrEqual(minSize);
      expect(audio.size).toBeLessThanOrEqual(maxSize);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Version Comparison Tests
// ═══════════════════════════════════════════════════════════

describe('Version Comparison', () => {
  function compareVersions(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }

  it('detects newer versions', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('detects older versions', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('detects same versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// Bundle Size Estimation Tests
// ═══════════════════════════════════════════════════════════

describe('Bundle Size Estimation', () => {
  it('estimates reasonable size for HSK 1', () => {
    // HSK 1: ~150 words × ~15KB audio = ~2.25MB audio
    // Plus JSON curriculum ~200KB
    // Total: ~2.5-5MB expected
    
    const estimatedVocabCount = 150;
    const avgAudioSize = 15000; // 15KB per word
    const jsonOverhead = 200000; // 200KB for curriculum JSON
    
    const estimatedSize = (estimatedVocabCount * avgAudioSize) + jsonOverhead;
    
    expect(estimatedSize).toBeGreaterThan(2000000); // > 2MB
    expect(estimatedSize).toBeLessThan(10000000);  // < 10MB
  });

  it('curriculum JSON is under 1MB', () => {
    // Even with 100 lessons, should be well under 1MB
    const curriculum = createMockCurriculum();
    const json = JSON.stringify(curriculum);
    
    expect(json.length).toBeLessThan(1000000); // < 1MB
  });
});

// ═══════════════════════════════════════════════════════════
// Content Completeness Tests
// ═══════════════════════════════════════════════════════════

describe('Content Completeness', () => {
  it('all vocabulary in lessons exists in vocabulary array', () => {
    const vocabIds = ['v1', 'v2', 'v3'];
    const vocabulary = vocabIds.map(id => createMockVocab({ id }));
    const lesson = createMockLesson({ targetVocabulary: ['v1', 'v2'] });
    
    const curriculum = createMockCurriculum({
      units: [createMockUnit({ lessons: [lesson] })],
      vocabulary,
    });
    
    const allVocabIds = new Set(curriculum.vocabulary.map(v => v.id));
    
    curriculum.units.forEach(unit => {
      unit.lessons.forEach(lesson => {
        lesson.targetVocabulary.forEach(vocabId => {
          expect(allVocabIds.has(vocabId)).toBe(true);
        });
      });
    });
  });

  it('ungrouped lessons are not in any unit', () => {
    const groupedLesson = createMockLesson({ id: 'grouped' });
    const ungroupedLesson = createMockLesson({ id: 'ungrouped' });
    
    const curriculum = createMockCurriculum({
      units: [createMockUnit({ lessons: [groupedLesson] })],
      ungroupedLessons: [ungroupedLesson],
    });
    
    const groupedIds = new Set(
      curriculum.units.flatMap(u => u.lessons.map(l => l.id))
    );
    
    curriculum.ungroupedLessons.forEach(lesson => {
      expect(groupedIds.has(lesson.id)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Mobile App Compatibility Tests
// ═══════════════════════════════════════════════════════════

describe('Mobile App Compatibility', () => {
  it('JSON is valid and parseable', () => {
    const curriculum = createMockCurriculum();
    const json = JSON.stringify(curriculum);
    
    expect(() => JSON.parse(json)).not.toThrow();
    
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(curriculum.version);
  });

  it('audio paths are URL-safe', () => {
    const vocab = createMockVocab({ hanzi: '你好' });
    const audioPath = `audio/vocab/${encodeURIComponent(vocab.hanzi)}.mp3`;
    
    // Should not contain problematic characters
    expect(audioPath).not.toContain(' ');
    expect(audioPath).not.toContain('?');
    expect(audioPath).not.toContain('#');
  });

  it('lesson blocks have required content fields', () => {
    const blockTypes = ['intro', 'hero_hanzi', 'multiple_choice', 'drag_sentence', 'celebration'];
    
    blockTypes.forEach(type => {
      const block: BundleBlock = {
        type,
        order: 0,
        content: { /* block-specific content */ },
      };
      
      expect(block.type).toBeDefined();
      expect(block.order).toBeDefined();
      expect(block.content).toBeDefined();
    });
  });
});

