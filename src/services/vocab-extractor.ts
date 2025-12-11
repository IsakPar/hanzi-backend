/**
 * Vocabulary Extractor Service
 * 
 * Extracts vocabulary (hanzi) from lesson block content and matches
 * them with vocabulary IDs from the database.
 * 
 * This is used to auto-populate the targetVocabulary field on lessons.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray, asc } from 'drizzle-orm';
import * as schema from '../schema';
import { vocabulary, lessons, lessonBlocks } from '../schema';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ExtractedVocab {
  hanzi: string;
  source: string; // e.g., "hero_hanzi", "multiple_choice", etc.
}

interface VocabExtractionResult {
  lessonId: string;
  extractedHanzi: string[];
  matchedVocabIds: string[];
  unmatchedHanzi: string[];
}

// ═══════════════════════════════════════════════════════════════════
// EXTRACTION HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract all hanzi/vocabulary from a block's content
 */
function extractHanziFromBlock(blockType: string, content: any): ExtractedVocab[] {
  const results: ExtractedVocab[] = [];
  
  if (!content || typeof content !== 'object') {
    return results;
  }

  const addHanzi = (hanzi: string | undefined, source: string) => {
    if (hanzi && typeof hanzi === 'string' && hanzi.trim()) {
      // Only add if it contains Chinese characters
      if (/[\u4e00-\u9fff]/.test(hanzi)) {
        results.push({ hanzi: hanzi.trim(), source });
      }
    }
  };

  switch (blockType) {
    case 'hero_hanzi':
      addHanzi(content.hanzi, 'hero_hanzi');
      break;

    case 'multiple_choice':
    case 'exercise_multiple_choice':
      addHanzi(content.question, 'multiple_choice.question');
      addHanzi(content.correctAnswer, 'multiple_choice.correctAnswer');
      if (Array.isArray(content.options)) {
        content.options.forEach((opt: any) => {
          if (typeof opt === 'string') {
            addHanzi(opt, 'multiple_choice.option');
          } else if (opt?.text) {
            addHanzi(opt.text, 'multiple_choice.option');
          }
        });
      }
      if (Array.isArray(content.distractors)) {
        content.distractors.forEach((d: string) => addHanzi(d, 'multiple_choice.distractor'));
      }
      break;

    case 'drag_sentence':
    case 'exercise_drag_sentence':
      addHanzi(content.sentence, 'drag_sentence.sentence');
      addHanzi(content.fullSentence, 'drag_sentence.fullSentence');
      addHanzi(content.instruction, 'drag_sentence.instruction');
      if (Array.isArray(content.correctOrder)) {
        content.correctOrder.forEach((w: string) => addHanzi(w, 'drag_sentence.correctOrder'));
      }
      if (Array.isArray(content.wordPool)) {
        content.wordPool.forEach((w: string) => addHanzi(w, 'drag_sentence.wordPool'));
      }
      if (Array.isArray(content.words)) {
        content.words.forEach((w: any) => {
          if (typeof w === 'string') {
            addHanzi(w, 'drag_sentence.word');
          } else if (w?.hanzi) {
            addHanzi(w.hanzi, 'drag_sentence.word');
          }
        });
      }
      if (Array.isArray(content.distractors)) {
        content.distractors.forEach((d: any) => {
          if (typeof d === 'string') {
            addHanzi(d, 'drag_sentence.distractor');
          } else if (d?.hanzi) {
            addHanzi(d.hanzi, 'drag_sentence.distractor');
          }
        });
      }
      break;

    case 'exercise_spot_error':
      addHanzi(content.question, 'spot_error.question');
      if (Array.isArray(content.words)) {
        content.words.forEach((w: string) => addHanzi(w, 'spot_error.word'));
      }
      break;

    case 'exercise_build_sentence':
      addHanzi(content.instruction, 'build_sentence.instruction');
      if (Array.isArray(content.correctSentence)) {
        content.correctSentence.forEach((w: string) => addHanzi(w, 'build_sentence.correct'));
      }
      if (Array.isArray(content.phrasePool)) {
        content.phrasePool.forEach((w: string) => addHanzi(w, 'build_sentence.phrasePool'));
      }
      if (Array.isArray(content.slots)) {
        content.slots.forEach((slot: any) => {
          if (slot?.content) addHanzi(slot.content, 'build_sentence.slot');
        });
      }
      break;

    case 'speaking_practice':
      addHanzi(content.prompt, 'speaking_practice.prompt');
      addHanzi(content.targetPhrase, 'speaking_practice.targetPhrase');
      addHanzi(content.sentence, 'speaking_practice.sentence');
      addHanzi(content.target_text, 'speaking_practice.target_text');
      break;

    case 'speech_practice_v2':
      addHanzi(content.text, 'speech_practice_v2.text');
      if (Array.isArray(content.segments)) {
        content.segments.forEach((seg: any) => addHanzi(seg.word, 'speech_practice_v2.segment'));
      }
      break;

    case 'intro':
      addHanzi(content.heroHanzi, 'intro.heroHanzi');
      addHanzi(content.focusWord, 'intro.focusWord');
      if (content.exampleSentence?.hanzi) {
        addHanzi(content.exampleSentence.hanzi, 'intro.exampleSentence');
      }
      if (Array.isArray(content.focusWords)) {
        content.focusWords.forEach((w: string) => addHanzi(w, 'intro.focusWord'));
      }
      break;

    case 'explain':
      addHanzi(content.title, 'explain.title');
      // Markdown may contain Chinese - extract it
      if (content.markdown) {
        const chineseMatches = content.markdown.match(/[\u4e00-\u9fff]+/g);
        if (chineseMatches) {
          chineseMatches.forEach((m: string) => addHanzi(m, 'explain.markdown'));
        }
      }
      break;

    case 'tip':
    case 'pattern':
      addHanzi(content.example, 'tip.example');
      addHanzi(content.pattern, 'pattern.pattern');
      addHanzi(content.template, 'pattern.template');
      if (Array.isArray(content.examples)) {
        content.examples.forEach((e: any) => {
          if (typeof e === 'string') {
            addHanzi(e, 'pattern.example');
          } else if (e?.chinese || e?.hanzi) {
            addHanzi(e.chinese || e.hanzi, 'pattern.example');
          }
        });
      }
      // Markdown may contain Chinese
      if (content.markdown) {
        const chineseMatches = content.markdown.match(/[\u4e00-\u9fff]+/g);
        if (chineseMatches) {
          chineseMatches.forEach((m: string) => addHanzi(m, 'tip.markdown'));
        }
      }
      break;

    case 'dialogue':
      if (Array.isArray(content.exchanges)) {
        content.exchanges.forEach((ex: any) => {
          addHanzi(ex.text, 'dialogue.exchange');
        });
      }
      break;

    case 'reading_passage':
      if (Array.isArray(content.paragraphs)) {
        content.paragraphs.forEach((p: any) => {
          addHanzi(p.hanzi, 'reading_passage.paragraph');
        });
      }
      break;

    case 'reading_comprehension':
      if (Array.isArray(content.questions)) {
        content.questions.forEach((q: any) => {
          addHanzi(q.question, 'reading_comprehension.question');
          if (Array.isArray(q.choices)) {
            q.choices.forEach((c: any) => {
              addHanzi(c.text, 'reading_comprehension.choice');
            });
          }
        });
      }
      break;

    case 'fill_blank':
      addHanzi(content.sentence, 'fill_blank.sentence');
      addHanzi(content.answer, 'fill_blank.answer');
      if (Array.isArray(content.options)) {
        content.options.forEach((opt: string) => addHanzi(opt, 'fill_blank.option'));
      }
      break;

    case 'matching':
      if (Array.isArray(content.pairs)) {
        content.pairs.forEach((pair: any) => {
          addHanzi(pair.chinese, 'matching.chinese');
          addHanzi(pair.hanzi, 'matching.hanzi');
        });
      }
      break;

    case 'listening':
      addHanzi(content.transcript, 'listening.transcript');
      addHanzi(content.correctAnswer, 'listening.correctAnswer');
      if (Array.isArray(content.options)) {
        content.options.forEach((opt: string) => addHanzi(opt, 'listening.option'));
      }
      break;

    case 'celebration':
      // No vocab to extract from celebration blocks
      break;

    default:
      // Generic extraction for unknown block types
      // Recursively look for any Chinese text in the content
      const extractRecursive = (obj: any, path: string) => {
        if (!obj) return;
        if (typeof obj === 'string') {
          const matches = obj.match(/[\u4e00-\u9fff]+/g);
          if (matches) {
            matches.forEach(m => addHanzi(m, path));
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => extractRecursive(item, `${path}[${i}]`));
        } else if (typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            // Skip audio/image URLs
            if (!['audioUrl', 'imageUrl', 'audioR2Key', 'id'].includes(key)) {
              extractRecursive(value, `${path}.${key}`);
            }
          }
        }
      };
      extractRecursive(content, blockType);
  }

  return results;
}

/**
 * Extract individual Chinese words from a sentence/phrase
 * Uses simple character-based splitting for now
 */
function splitIntoWords(text: string): string[] {
  // Remove punctuation and spaces
  const cleaned = text.replace(/[，。？！、：；""''（）\s]/g, '');
  
  // For now, return as single characters if it's long
  // Later this could use jieba or similar for proper segmentation
  if (cleaned.length <= 4) {
    return [cleaned]; // Short phrases, keep as-is
  }
  
  // For longer text, just return the whole thing
  // The matching will happen at the hanzi level
  return [cleaned];
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXTRACTOR CLASS
// ═══════════════════════════════════════════════════════════════════

export class VocabExtractor {
  private db: ReturnType<typeof drizzle<typeof schema>>;
  private requestId: string;

  constructor(d1: D1Database, requestId: string = 'vocab-extract') {
    this.db = drizzle(d1, { schema });
    this.requestId = requestId;
  }

  /**
   * Extract vocabulary from a single lesson's blocks
   */
  async extractFromLesson(lessonId: string): Promise<VocabExtractionResult> {
    // Get lesson to find HSK level
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
    });

    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    // Get all blocks for this lesson
    const blocks = await this.db
      .select()
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lessonId))
      .orderBy(asc(lessonBlocks.orderIndex));

    logWithContext('debug', 'vocab_extractor.lesson_blocks', {
      requestId: this.requestId,
      meta: {
        lessonId,
        lessonTitle: lesson.title,
        hskLevel: lesson.hskLevel,
        blockCount: blocks.length,
        blockTypes: blocks.map(b => b.type),
      },
    });

    // Extract all hanzi from blocks
    const allExtracted: ExtractedVocab[] = [];
    for (const block of blocks) {
      let content: any;
      try {
        content = typeof block.content === 'string' 
          ? JSON.parse(block.content) 
          : block.content;
      } catch (e) {
        logWithContext('warn', 'vocab_extractor.parse_error', {
          requestId: this.requestId,
          meta: { lessonId, blockId: block.id, error: (e as Error).message },
        });
        continue;
      }
      
      const extracted = extractHanziFromBlock(block.type, content);
      allExtracted.push(...extracted);
    }

    // Deduplicate hanzi
    const uniqueHanzi = [...new Set(allExtracted.map(e => e.hanzi))];

    logWithContext('debug', 'vocab_extractor.extracted_hanzi', {
      requestId: this.requestId,
      meta: {
        lessonId,
        extractedCount: allExtracted.length,
        uniqueCount: uniqueHanzi.length,
        hanziSample: uniqueHanzi.slice(0, 10),
      },
    });

    // Get all vocabulary for this HSK level
    const vocabList = await this.db
      .select({ id: vocabulary.id, hanzi: vocabulary.hanzi })
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, lesson.hskLevel));

    logWithContext('debug', 'vocab_extractor.vocab_db', {
      requestId: this.requestId,
      meta: {
        lessonId,
        hskLevel: lesson.hskLevel,
        vocabCount: vocabList.length,
        vocabSample: vocabList.slice(0, 10).map(v => v.hanzi),
      },
    });

    // Build hanzi -> vocab ID map
    const hanziToId = new Map<string, string>();
    for (const v of vocabList) {
      hanziToId.set(v.hanzi, v.id);
    }

    // Match extracted hanzi to vocab IDs
    const matchedIds: string[] = [];
    const unmatchedHanzi: string[] = [];

    for (const hanzi of uniqueHanzi) {
      const vocabId = hanziToId.get(hanzi);
      if (vocabId) {
        matchedIds.push(vocabId);
      } else {
        unmatchedHanzi.push(hanzi);
      }
    }

    logWithContext('debug', 'vocab_extractor.matching_result', {
      requestId: this.requestId,
      meta: {
        lessonId,
        matchedCount: matchedIds.length,
        unmatchedCount: unmatchedHanzi.length,
        unmatchedHanzi: unmatchedHanzi.slice(0, 10),
      },
    });

    return {
      lessonId,
      extractedHanzi: uniqueHanzi,
      matchedVocabIds: [...new Set(matchedIds)], // Dedupe
      unmatchedHanzi,
    };
  }

  /**
   * Extract and update targetVocabulary for a lesson
   */
  async syncLessonVocabulary(lessonId: string): Promise<VocabExtractionResult> {
    const result = await this.extractFromLesson(lessonId);

    // Update the lesson's targetVocabulary
    try {
      const vocabIdsArray = result.matchedVocabIds;
      
      logWithContext('info', 'vocab_extractor.updating_lesson', {
        requestId: this.requestId,
        meta: {
          lessonId,
          vocabIdsCount: vocabIdsArray.length,
          vocabIds: vocabIdsArray.slice(0, 5),
        },
      });

      // Use raw SQL to ensure the update works
      const updateResult = await this.db
        .update(lessons)
        .set({
          targetVocabulary: vocabIdsArray,
          updatedAt: new Date(), // Must be Date object for timestamp mode
        })
        .where(eq(lessons.id, lessonId))
        .returning({ id: lessons.id, targetVocabulary: lessons.targetVocabulary });

      logWithContext('info', 'vocab_extractor.update_result', {
        requestId: this.requestId,
        meta: {
          lessonId,
          updateResult: updateResult?.[0] ? 'success' : 'no rows returned',
          returnedVocab: updateResult?.[0]?.targetVocabulary,
        },
      });
    } catch (updateError) {
      logWithContext('error', 'vocab_extractor.update_failed', {
        requestId: this.requestId,
        meta: {
          lessonId,
          error: (updateError as Error).message,
          stack: (updateError as Error).stack?.slice(0, 200),
        },
      });
      throw updateError;
    }

    logWithContext('info', 'vocab_extractor.sync_complete', {
      requestId: this.requestId,
      meta: {
        lessonId,
        extractedCount: result.extractedHanzi.length,
        matchedCount: result.matchedVocabIds.length,
        unmatchedCount: result.unmatchedHanzi.length,
      },
    });

    return result;
  }

  /**
   * Sync all lessons for an HSK level
   */
  async syncAllLessons(hskLevel: number): Promise<{
    synced: number;
    totalVocab: number;
    errors: string[];
  }> {
    const lessonList = await this.db
      .select({ id: lessons.id, title: lessons.title })
      .from(lessons)
      .where(eq(lessons.hskLevel, hskLevel));

    const errors: string[] = [];
    let totalVocab = 0;

    for (const lesson of lessonList) {
      try {
        const result = await this.syncLessonVocabulary(lesson.id);
        totalVocab += result.matchedVocabIds.length;
      } catch (error) {
        errors.push(`${lesson.title}: ${(error as Error).message}`);
      }
    }

    logWithContext('info', 'vocab_extractor.sync_all_complete', {
      requestId: this.requestId,
      meta: {
        hskLevel,
        lessonsProcessed: lessonList.length,
        totalVocabMatched: totalVocab,
        errors: errors.length,
      },
    });

    return {
      synced: lessonList.length - errors.length,
      totalVocab,
      errors,
    };
  }
}

export { extractHanziFromBlock, splitIntoWords };

