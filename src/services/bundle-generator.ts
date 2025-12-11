/**
 * Bundle Generator Service
 * 
 * Generates downloadable content bundles for offline use in the mobile app.
 * Each bundle contains:
 * - curriculum.json (lessons, blocks, vocabulary)
 * - audio/ folder with all MP3 files
 * - manifest with file list and sizes
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and } from 'drizzle-orm';
import { 
  lessons, 
  lessonBlocks, 
  vocabulary, 
  units,
  releases 
} from '../schema';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface BundleVocab {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string | null;
  tags: string[] | null;
  audioFile: string | null; // relative path in bundle
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

interface AudioFileInfo {
  path: string;
  r2Key: string;
  size: number;
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
  audioFiles: AudioFileInfo[];
}

interface GlobalManifest {
  appMinVersion: string;
  updatedAt: string;
  levels: Record<number, {
    latestVersion: string;
    bundleSize: number;
    lessonCount: number;
    vocabCount: number;
    updatedAt: string;
    downloadUrl: string;
  } | null>;
}

// ═══════════════════════════════════════════════════════════════════
// BUNDLE GENERATOR
// ═══════════════════════════════════════════════════════════════════

export class BundleGenerator {
  private db: ReturnType<typeof drizzle>;
  private bucket: R2Bucket;
  private requestId: string;

  constructor(
    d1: D1Database,
    bucket: R2Bucket,
    requestId: string = 'bundle-gen'
  ) {
    this.db = drizzle(d1);
    this.bucket = bucket;
    this.requestId = requestId;
  }

  /**
   * Generate a complete bundle for an HSK level
   */
  async generateBundle(
    hskLevel: number,
    version: string
  ): Promise<{ success: boolean; manifest: BundleManifest; errors: string[] }> {
    const errors: string[] = [];
    const startTime = Date.now();

    logWithContext('info', 'bundle.generate_start', {
      requestId: this.requestId,
      meta: { hskLevel, version },
    });

    try {
      // 1. Fetch all units for this HSK level
      const levelUnits = await this.db
        .select()
        .from(units)
        .where(eq(units.hskLevel, hskLevel))
        .orderBy(asc(units.unitNumber));

      // 2. Fetch all published lessons for this HSK level
      const levelLessons = await this.db
        .select()
        .from(lessons)
        .where(and(
          eq(lessons.hskLevel, hskLevel),
          eq(lessons.isPublished, true)
        ))
        .orderBy(asc(lessons.lessonNumber));

      if (levelLessons.length === 0) {
        throw new Error(`No published lessons found for HSK ${hskLevel}`);
      }

      // 3. Fetch blocks for all lessons
      const lessonIds = levelLessons.map(l => l.id);
      const allBlocks = await this.db
        .select()
        .from(lessonBlocks)
        .orderBy(asc(lessonBlocks.orderIndex));

      // Group blocks by lesson
      const blocksByLesson = new Map<string, typeof allBlocks>();
      for (const block of allBlocks) {
        if (!lessonIds.includes(block.lessonId)) continue;
        const existing = blocksByLesson.get(block.lessonId) || [];
        existing.push(block);
        blocksByLesson.set(block.lessonId, existing);
      }

      // 4. Fetch vocabulary for this HSK level
      const levelVocab = await this.db
        .select()
        .from(vocabulary)
        .where(eq(vocabulary.hskLevel, hskLevel))
        .orderBy(asc(vocabulary.hanzi));

      // 5. Build audio file list
      const audioFiles: AudioFileInfo[] = [];
      for (const vocab of levelVocab) {
        if (vocab.wordAudioR2Key) {
          // Extract extension from R2 key (could be .mp3 or .wav)
          const ext = vocab.wordAudioR2Key.split('.').pop() || 'mp3';
          audioFiles.push({
            path: `audio/vocab/${vocab.hanzi}.${ext}`,
            r2Key: vocab.wordAudioR2Key,
            size: 0, // Will be filled when copying
          });
        }
      }

      // 6. Build bundle lessons
      const bundleLessons: BundleLesson[] = levelLessons.map(lesson => {
        const lessonBlocks = blocksByLesson.get(lesson.id) || [];
        return {
          id: lesson.id,
          lessonNumber: lesson.lessonNumber,
          title: lesson.title,
          subtitle: lesson.subtitle,
          type: lesson.lessonType as BundleLesson['type'],
          difficulty: lesson.difficulty || 'medium',
          estimatedMinutes: lesson.estimatedMinutes || 10,
          description: lesson.description,
          grammarPoints: lesson.grammarPoints as string[] | null,
          tags: lesson.tags as string[] | null,
          targetVocabulary: (lesson.targetVocabulary as string[]) || [],
          blocks: lessonBlocks.map(b => ({
            type: b.type,
            order: b.orderIndex,
            content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content,
          })),
        };
      });

      // 7. Build bundle units with their lessons
      const bundleUnits: BundleUnit[] = levelUnits.map(unit => {
        const unitLessons = bundleLessons.filter(l => {
          const lesson = levelLessons.find(ll => ll.id === l.id);
          return lesson?.unitId === unit.id;
        });
        return {
          id: unit.id,
          unitNumber: unit.unitNumber,
          title: unit.title,
          description: unit.description,
          gradientStart: unit.gradientStart,
          gradientEnd: unit.gradientEnd,
          accentColor: unit.accentColor,
          lessons: unitLessons.sort((a, b) => a.lessonNumber - b.lessonNumber),
        };
      });

      // Find ungrouped lessons
      const groupedLessonIds = new Set(bundleUnits.flatMap(u => u.lessons.map(l => l.id)));
      const ungroupedLessons = bundleLessons.filter(l => !groupedLessonIds.has(l.id));

      // 8. Build bundle vocabulary
      const bundleVocab: BundleVocab[] = levelVocab.map(v => {
        // Extract extension from R2 key (could be .mp3 or .wav)
        const ext = v.wordAudioR2Key?.split('.').pop() || 'mp3';
        return {
          id: v.id,
          hanzi: v.hanzi,
          pinyin: v.pinyin,
          english: v.english,
          category: v.category,
          tags: v.tags as string[] | null,
          audioFile: v.wordAudioR2Key ? `audio/vocab/${v.hanzi}.${ext}` : null,
          exampleChinese: v.exampleChinese,
          examplePinyin: v.examplePinyin,
          exampleEnglish: v.exampleEnglish,
        };
      });

      // 9. Create curriculum bundle
      const curriculum: CurriculumBundle = {
        version,
        hskLevel,
        createdAt: new Date().toISOString(),
        units: bundleUnits,
        ungroupedLessons,
        vocabulary: bundleVocab,
        stats: {
          unitCount: bundleUnits.length,
          lessonCount: bundleLessons.length,
          vocabCount: bundleVocab.length,
          audioFileCount: audioFiles.length,
          totalAudioSize: 0, // Will be calculated
        },
      };

      // 10. Upload curriculum.json to R2
      const curriculumPath = `releases/hsk${hskLevel}/v${version}/curriculum.json`;
      const curriculumJson = JSON.stringify(curriculum, null, 2);
      await this.bucket.put(curriculumPath, curriculumJson, {
        httpMetadata: { contentType: 'application/json' },
      });

      // 11. Copy audio files to versioned folder
      let totalAudioSize = 0;
      for (const audio of audioFiles) {
        try {
          const sourceObject = await this.bucket.get(audio.r2Key);
          if (sourceObject) {
            const destPath = `releases/hsk${hskLevel}/v${version}/${audio.path}`;
            const audioData = await sourceObject.arrayBuffer();
            audio.size = audioData.byteLength;
            totalAudioSize += audio.size;
            
            await this.bucket.put(destPath, audioData, {
              httpMetadata: { contentType: 'audio/mpeg' },
            });
          } else {
            errors.push(`Audio not found: ${audio.r2Key}`);
          }
        } catch (err) {
          errors.push(`Failed to copy audio ${audio.r2Key}: ${(err as Error).message}`);
        }
      }

      // Update stats
      curriculum.stats.totalAudioSize = totalAudioSize;

      // 12. Create bundle manifest
      const manifest: BundleManifest = {
        version,
        hskLevel,
        createdAt: curriculum.createdAt,
        bundleSize: curriculumJson.length + totalAudioSize,
        curriculumFile: `curriculum.json`,
        stats: {
          unitCount: curriculum.stats.unitCount,
          lessonCount: curriculum.stats.lessonCount,
          vocabCount: curriculum.stats.vocabCount,
          audioFileCount: audioFiles.filter(a => a.size > 0).length,
        },
        audioFiles: audioFiles.filter(a => a.size > 0),
      };

      // 13. Upload manifest
      const manifestPath = `releases/hsk${hskLevel}/v${version}/manifest.json`;
      await this.bucket.put(manifestPath, JSON.stringify(manifest, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });

      // 14. Update latest pointer
      const latestPath = `releases/hsk${hskLevel}/latest.json`;
      await this.bucket.put(latestPath, JSON.stringify({
        version,
        path: `v${version}`,
        createdAt: curriculum.createdAt,
      }), {
        httpMetadata: { contentType: 'application/json' },
      });

      // 15. Update global manifest
      await this.updateGlobalManifest(hskLevel, version, manifest);

      const duration = Date.now() - startTime;
      logWithContext('info', 'bundle.generate_complete', {
        requestId: this.requestId,
        meta: {
          hskLevel,
          version,
          durationMs: duration,
          lessonCount: bundleLessons.length,
          vocabCount: bundleVocab.length,
          audioCount: audioFiles.filter(a => a.size > 0).length,
          bundleSize: manifest.bundleSize,
          errors: errors.length,
        },
      });

      return { success: true, manifest, errors };

    } catch (error) {
      logWithContext('error', 'bundle.generate_failed', {
        requestId: this.requestId,
        meta: { hskLevel, version, error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Update the global manifest with all HSK levels
   */
  private async updateGlobalManifest(
    hskLevel: number,
    version: string,
    manifest: BundleManifest
  ): Promise<void> {
    const globalManifestPath = 'releases/manifest.json';
    
    // Try to get existing manifest
    let globalManifest: GlobalManifest;
    try {
      const existing = await this.bucket.get(globalManifestPath);
      if (existing) {
        globalManifest = JSON.parse(await existing.text());
      } else {
        globalManifest = {
          appMinVersion: '1.0.0',
          updatedAt: new Date().toISOString(),
          levels: {},
        };
      }
    } catch {
      globalManifest = {
        appMinVersion: '1.0.0',
        updatedAt: new Date().toISOString(),
        levels: {},
      };
    }

    // Update this level
    globalManifest.levels[hskLevel] = {
      latestVersion: version,
      bundleSize: manifest.bundleSize,
      lessonCount: manifest.stats.lessonCount,
      vocabCount: manifest.stats.vocabCount,
      updatedAt: manifest.createdAt,
      downloadUrl: `releases/hsk${hskLevel}/v${version}/`,
    };
    globalManifest.updatedAt = new Date().toISOString();

    // Save
    await this.bucket.put(globalManifestPath, JSON.stringify(globalManifest, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  /**
   * Get the global manifest
   */
  async getGlobalManifest(): Promise<GlobalManifest | null> {
    try {
      const obj = await this.bucket.get('releases/manifest.json');
      if (obj) {
        return JSON.parse(await obj.text());
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get manifest for a specific HSK level
   */
  async getLevelManifest(hskLevel: number, version?: string): Promise<BundleManifest | null> {
    try {
      const versionPath = version ? `v${version}` : 'latest';
      
      if (!version) {
        // Get latest pointer first
        const latestObj = await this.bucket.get(`releases/hsk${hskLevel}/latest.json`);
        if (!latestObj) return null;
        const latest = JSON.parse(await latestObj.text());
        version = latest.version;
      }

      const manifestObj = await this.bucket.get(`releases/hsk${hskLevel}/v${version}/manifest.json`);
      if (manifestObj) {
        return JSON.parse(await manifestObj.text());
      }
      return null;
    } catch {
      return null;
    }
  }
}

export type { 
  CurriculumBundle, 
  BundleManifest, 
  GlobalManifest,
  BundleLesson,
  BundleVocab,
  BundleUnit,
};

