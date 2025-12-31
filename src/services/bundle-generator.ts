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
// BLOCK ENRICHMENT TYPES
// ═══════════════════════════════════════════════════════════════════

interface VocabLookup {
  hanzi: string;
  pinyin: string;
  audioUrl: string | null;
}

interface BlockEnrichmentResult {
  enrichedContent: any;
  errors: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract Chinese words/characters from a string
 */
function extractChineseWords(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/[\u4e00-\u9fff]+/g);
  return matches || [];
}

/**
 * Build a lookup map from vocabulary array
 */
function buildVocabLookup(vocabList: any[]): Map<string, VocabLookup> {
  const lookup = new Map<string, VocabLookup>();
  for (const v of vocabList) {
    // Use bundle-relative path format (same as vocabulary in bundle)
    const ext = v.wordAudioR2Key?.split('.').pop() || 'mp3';
    lookup.set(v.hanzi, {
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      audioUrl: v.wordAudioR2Key ? `audio/vocab/${v.hanzi}.${ext}` : null,
    });
  }
  return lookup;
}

/**
 * Enrich a single block with vocabulary data
 */
function enrichBlock(
  block: { type: string; content: any },
  vocabLookup: Map<string, VocabLookup>,
  lessonTitle: string
): BlockEnrichmentResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = JSON.parse(JSON.stringify(block.content)); // Deep clone

  const blockType = block.type;

  // ─────────────────────────────────────────────────────────────────
  // EXERCISE_MULTIPLE_CHOICE
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'exercise_multiple_choice') {
    const question = content.question || '';
    const chineseWords = extractChineseWords(question);
    
    if (chineseWords.length > 0) {
      // Try to find vocab for the Chinese word in the question
      const mainWord = chineseWords[0]; // Usually the first Chinese word is the target
      const vocab = vocabLookup.get(mainWord);
      
      if (vocab) {
        content.questionPinyin = vocab.pinyin;
        if (vocab.audioUrl) {
          content.questionAudioUrl = vocab.audioUrl;
        } else {
          warnings.push(`[${lessonTitle}] MCQ: No audio for "${mainWord}" in question "${question}"`);
        }
      } else {
        errors.push(`[${lessonTitle}] MCQ: Word "${mainWord}" not found in vocabulary. Question: "${question}"`);
      }
    }

    // Enrich options that are Chinese words
    if (content.options && Array.isArray(content.options)) {
      for (const opt of content.options) {
        const optText = typeof opt === 'string' ? opt : opt.text;
        if (optText && extractChineseWords(optText).length > 0) {
          const vocab = vocabLookup.get(optText);
          if (vocab) {
            if (typeof opt === 'object') {
              opt.pinyin = vocab.pinyin;
              if (vocab.audioUrl) {
                opt.audioUrl = vocab.audioUrl;
              }
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PATTERN BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'pattern' && content.examples) {
    for (const example of content.examples) {
      if (example.hanzi && !example.audioUrl) {
        // Try to find audio for example sentences
        const vocab = vocabLookup.get(example.hanzi);
        if (vocab?.audioUrl) {
          example.audioUrl = vocab.audioUrl;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DIALOGUE BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'dialogue' && content.exchanges) {
    for (const exchange of content.exchanges) {
      if (exchange.text && !exchange.audioUrl) {
        // Dialogues typically need sentence-level audio, not word-level
        // Just flag if missing
        warnings.push(`[${lessonTitle}] Dialogue: No audio for "${exchange.text.substring(0, 30)}..."`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // READING_PASSAGE BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'reading_passage' && content.paragraphs) {
    for (const para of content.paragraphs) {
      if (para.hanzi && !para.audioUrl) {
        warnings.push(`[${lessonTitle}] Reading: No audio for paragraph "${para.hanzi.substring(0, 30)}..."`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // READING_COMPREHENSION BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'reading_comprehension' && content.questions) {
    for (const q of content.questions) {
      if (q.choices) {
        for (const choice of q.choices) {
          const choiceText = choice.text;
          if (choiceText && extractChineseWords(choiceText).length > 0) {
            // Extract just the Chinese part if it's like "老师 (teacher)"
            const chineseMatch = choiceText.match(/^([\u4e00-\u9fff]+)/);
            if (chineseMatch) {
              const chineseWord = chineseMatch[1];
              const vocab = vocabLookup.get(chineseWord);
              if (vocab) {
                choice.pinyin = vocab.pinyin;
                if (vocab.audioUrl) {
                  choice.audioUrl = vocab.audioUrl;
                }
              }
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // HERO_HANZI BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'hero_hanzi') {
    const hanzi = content.hanzi;
    if (hanzi && !content.audioUrl) {
      const vocab = vocabLookup.get(hanzi);
      if (vocab?.audioUrl) {
        content.audioUrl = vocab.audioUrl;
      } else {
        warnings.push(`[${lessonTitle}] Hero: No audio for "${hanzi}"`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // SPEECH_PRACTICE_V2 BLOCK
  // ─────────────────────────────────────────────────────────────────
  if (blockType === 'speech_practice_v2') {
    const text = content.text;
    if (text && !content.audioUrl) {
      const vocab = vocabLookup.get(text);
      if (vocab?.audioUrl) {
        content.audioUrl = vocab.audioUrl;
      } else {
        warnings.push(`[${lessonTitle}] Speech Practice: No audio for "${text}"`);
      }
    }
  }

  return { enrichedContent: content, errors, warnings };
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

      // 4. Collect vocab IDs from lessons' targetVocabulary
      const vocabIdsInLessons = new Set<string>();
      for (const lesson of levelLessons) {
        const targetVocab = (lesson.targetVocabulary as string[]) || [];
        targetVocab.forEach(id => vocabIdsInLessons.add(id));
      }

      logWithContext('info', 'bundle.vocab_from_lessons', {
        requestId: this.requestId,
        meta: { hskLevel, vocabIdsCount: vocabIdsInLessons.size },
      });

      // 5. Fetch only vocab used in lessons AND that passes quality gate
      let levelVocab: typeof vocabulary.$inferSelect[] = [];
      if (vocabIdsInLessons.size > 0) {
        const allLessonVocab = await this.db
          .select()
          .from(vocabulary)
          .where(eq(vocabulary.hskLevel, hskLevel))
          .orderBy(asc(vocabulary.hanzi));
        
        // Filter to only vocab used in lessons AND complete (has audio, example, category)
        levelVocab = allLessonVocab.filter(v => {
          const inLesson = vocabIdsInLessons.has(v.id);
          const hasAudio = !!v.wordAudioR2Key;
          const hasExample = !!v.exampleChinese;
          const hasCategory = !!v.category;
          const isComplete = hasAudio && hasExample && hasCategory;
          
          if (inLesson && !isComplete) {
            errors.push(`Skipping incomplete vocab: ${v.hanzi} (${!hasAudio ? 'no audio' : ''} ${!hasExample ? 'no example' : ''} ${!hasCategory ? 'no category' : ''})`);
          }
          
          return inLesson && isComplete;
        });

        logWithContext('info', 'bundle.vocab_filtered', {
          requestId: this.requestId,
          meta: { 
            hskLevel, 
            inLessons: vocabIdsInLessons.size,
            afterQualityGate: levelVocab.length,
            skipped: vocabIdsInLessons.size - levelVocab.length,
          },
        });
      }

      // 6. Build audio file list (only from filtered vocab)
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

      // 6. Build vocabulary lookup for enrichment
      const vocabLookup = buildVocabLookup(levelVocab);
      
      logWithContext('info', 'bundle.vocab_lookup_built', {
        requestId: this.requestId,
        meta: { hskLevel, vocabCount: vocabLookup.size },
      });

      // 7. Build bundle lessons with block enrichment
      const enrichmentErrors: string[] = [];
      const enrichmentWarnings: string[] = [];
      
      const bundleLessons: BundleLesson[] = levelLessons.map(lesson => {
        const lessonBlocks = blocksByLesson.get(lesson.id) || [];
        
        // Enrich each block with vocab data
        const enrichedBlocks = lessonBlocks.map(b => {
          const rawContent = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
          
          const enrichResult = enrichBlock(
            { type: b.type, content: rawContent },
            vocabLookup,
            lesson.title
          );
          
          // Collect errors and warnings
          enrichmentErrors.push(...enrichResult.errors);
          enrichmentWarnings.push(...enrichResult.warnings);
          
          return {
            type: b.type,
            order: b.orderIndex,
            content: enrichResult.enrichedContent,
          };
        });
        
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
          blocks: enrichedBlocks,
        };
      });

      // Log enrichment results
      if (enrichmentErrors.length > 0) {
        logWithContext('warn', 'bundle.enrichment_errors', {
          requestId: this.requestId,
          meta: { 
            hskLevel, 
            errorCount: enrichmentErrors.length,
            errors: enrichmentErrors.slice(0, 10), // Log first 10
          },
        });
        errors.push(...enrichmentErrors);
      }
      
      if (enrichmentWarnings.length > 0) {
        logWithContext('info', 'bundle.enrichment_warnings', {
          requestId: this.requestId,
          meta: { 
            hskLevel, 
            warningCount: enrichmentWarnings.length,
            warnings: enrichmentWarnings.slice(0, 10), // Log first 10
          },
        });
      }

      // 8. Check for critical enrichment errors (MCQ blocks without vocab)
      const criticalErrors = enrichmentErrors.filter(e => e.includes('MCQ:') && e.includes('not found'));
      if (criticalErrors.length > 0) {
        logWithContext('error', 'bundle.critical_enrichment_errors', {
          requestId: this.requestId,
          meta: { 
            hskLevel, 
            criticalCount: criticalErrors.length,
            errors: criticalErrors,
          },
        });
        throw new Error(`Bundle blocked: ${criticalErrors.length} MCQ block(s) have missing vocabulary. Fix these before shipping:\n${criticalErrors.join('\n')}`);
      }

      // 9. Build bundle units with their lessons
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

